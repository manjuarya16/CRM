import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '@/config/db';
import { env } from '@/config/env';
import { ApiError } from '@/middleware/errorHandler';
import {
  CreateTenantInput,
  IProvisionedTenantAdmin,
  ISuperAdmin,
  ISuperAdminLoginRecord,
  ISuperAdminMetrics,
  ITenant,
  ITenantWithStats,
  UpdateTenantInput,
} from '@/interfaces';
import { logger } from '@/utils/logger';
import { loadSuperAdminAccess } from '@/services/platformRoleAccess.service';

export class SuperAdminService {
  /**
   * Signs a JWT token specifically for Super Admin
   */
  public signToken(adminId: number | string): string {
    return jwt.sign(
      { sub: String(adminId), is_super_admin: true, role: 'super_admin' },
      env.JWT_SECRET,
      { expiresIn: '7d' } as jwt.SignOptions
    );
  }

  /**
   * Super Admin Login
   */
  public async login(email: string, password: string): Promise<{ admin: ISuperAdmin; token: string }> {
    const { rows } = await pool.query<ISuperAdminLoginRecord>(
      'SELECT * FROM public.find_super_admin_for_login($1::text)',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      throw new ApiError(401, 'Invalid Super Admin email or password');
    }

    const admin = rows[0];

    if (admin.status !== 'active') {
      throw new ApiError(403, 'Super Admin account is deactivated');
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      throw new ApiError(401, 'Invalid Super Admin email or password');
    }

    const access = await loadSuperAdminAccess(admin.id);
    const token = this.signToken(admin.id);
    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
        platform_role_id: access?.platform_role_id ?? null,
        role_name: access?.role_name ?? null,
        permissions: access?.permissions ?? [],
      },
      token,
    };
  }

  /**
   * Get all tenants with statistics
   */
  public async getTenants(): Promise<ITenantWithStats[]> {
    const { rows } = await pool.query<ITenantWithStats>(
      'SELECT * FROM public.list_saas_tenants_with_stats()'
    );

    return rows;
  }

  /**
   * Create a new Tenant Organization and automatically seed initial data
   */
  public async createTenant(input: CreateTenantInput): Promise<{ tenant: ITenant; adminUser: IProvisionedTenantAdmin }> {
    if (
      typeof input.name !== 'string' || !input.name.trim() ||
      typeof input.slug !== 'string' || !input.slug.trim() ||
      typeof input.admin_name !== 'string' || !input.admin_name.trim() ||
      typeof input.admin_email !== 'string' || !input.admin_email.trim() ||
      typeof input.admin_password !== 'string'
    ) {
      throw new ApiError(400, 'Organization name, subdomain, administrator name, email, and password are required');
    }

    if (input.admin_password.length < 6 || input.admin_password.length > 50) {
      throw new ApiError(400, 'Administrator password must be between 6 and 50 characters');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(input.admin_email.trim())) {
      throw new ApiError(400, 'Administrator email must be valid');
    }
    if (input.email?.trim() && !emailPattern.test(input.email.trim())) {
      throw new ApiError(400, 'Organization email must be valid');
    }

    const slug = input.slug.toLowerCase().trim();

    // Validate slug format
    if (slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ApiError(400, 'Subdomain slug must contain only lowercase letters, numbers, and hyphens (e.g. acme-corp)');
    }

    if (['admin', 'api', 'www', 'mail', 'app', 'public', 'superadmin', 'root'].includes(slug)) {
      throw new ApiError(400, `The subdomain '${slug}' is a reserved system name.`);
    }

    // Check if slug already exists
    const existing = await pool.query<{ exists: boolean }>(
      'SELECT public.saas_tenant_slug_exists($1::text) AS exists',
      [slug]
    );
    if (existing.rows[0]?.exists) {
      throw new ApiError(409, `An organization with subdomain '${slug}' already exists.`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Prepare settings and address
      const address = {
        street: input.street?.trim() || input.address?.street?.trim() || '',
        city: input.city?.trim() || input.address?.city?.trim() || '',
        state: input.state?.trim() || input.address?.state?.trim() || '',
        country: input.country?.trim() || input.address?.country?.trim() || '',
        pincode: input.pincode?.trim() || input.address?.pincode?.trim() || '',
      };

      const logoUrl = input.logo_url?.trim() || null;

      const settings = {
        email: input.email?.trim() || input.admin_email.toLowerCase().trim(),
        phone: input.phone?.trim() || '',
        website: input.website?.trim() || '',
        registration_no: input.registration_no?.trim() || '',
        established_date: input.established_date?.trim() || '',
        currency: input.currency || 'INR',
        timezone: input.timezone || 'Asia/Kolkata',
        address,
        logo_url: logoUrl || '',
        description: input.description?.trim() || '',
        registered_under_act: input.registered_under_act?.trim() || '',
        social_media_links: input.social_media_links?.trim() || '',
        ceo_name: input.ceo_name?.trim() || '',
        ceo_contact: input.ceo_contact?.trim() || '',
        chairperson_name: input.chairperson_name?.trim() || '',
        chairperson_contact: input.chairperson_contact?.trim() || '',
      };

      const passwordHash = await bcrypt.hash(input.admin_password, 10);
      const { rows } = await client.query<{
        provisioned: { tenant: ITenant; adminUser: IProvisionedTenantAdmin };
      }>(
        'SELECT public.provision_saas_tenant($1::jsonb, $2::jsonb, $3::jsonb) AS provisioned',
        [
          JSON.stringify({ name: input.name.trim(), slug, plan: input.plan || 'pro', logo_url: logoUrl, settings }),
          JSON.stringify({
            name: input.admin_name.trim(),
            email: input.admin_email.toLowerCase().trim(),
            password_hash: passwordHash,
          }),
          input.trial_subscription ? JSON.stringify(input.trial_subscription) : null,
        ]
      );
      const provisioned = rows[0]?.provisioned;
      if (!provisioned?.tenant || !provisioned.adminUser) {
        throw new Error('Tenant provisioning database function returned an invalid result.');
      }
      const { tenant, adminUser } = provisioned;
      const tenantId = tenant.id;

      await client.query('COMMIT');
      logger.info({ tenantId, slug }, 'SuperAdminService.createTenant provisioned successfully');

      return { tenant, adminUser };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err, slug }, 'SuperAdminService.createTenant failed, transaction rolled back');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update Tenant Organization details, settings, plan, and admin credentials
   */
  public async updateTenant(id: number, input: UpdateTenantInput): Promise<ITenant> {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (input.admin_email !== undefined && !emailPattern.test(input.admin_email.trim())) {
      throw new ApiError(400, 'Administrator email must be valid');
    }
    if (input.admin_password !== undefined && (input.admin_password.length < 6 || input.admin_password.length > 50)) {
      throw new ApiError(400, 'Administrator password must be between 6 and 50 characters');
    }

    const existing = await pool.query<{ tenant: ITenant | null }>(
      'SELECT public.get_saas_tenant($1::bigint) AS tenant',
      [id]
    );
    const current = existing.rows[0]?.tenant;
    if (!current) {
      throw new ApiError(404, 'Organization not found');
    }

    // If slug is changed, validate format and uniqueness
    let slug = current.slug;
    if (input.slug && input.slug.trim()) {
      const candidateSlug = input.slug.toLowerCase().trim();
      if (candidateSlug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidateSlug)) {
        throw new ApiError(400, 'Subdomain slug must contain only lowercase letters, numbers, and hyphens');
      }
      if (['admin', 'api', 'www', 'mail', 'app', 'public', 'superadmin', 'root'].includes(candidateSlug)) {
        throw new ApiError(400, `The subdomain '${candidateSlug}' is a reserved system name.`);
      }
      if (candidateSlug !== current.slug) {
        const conflict = await pool.query<{ exists: boolean }>(
          'SELECT public.saas_tenant_slug_conflicts($1::text, $2::bigint) AS exists',
          [candidateSlug, id]
        );
        if (conflict.rows[0]?.exists) {
          throw new ApiError(409, `An organization with subdomain '${candidateSlug}' already exists.`);
        }
        slug = candidateSlug;
      }
    }

    const currentSettings = current.settings || {};
    const existingAddress = currentSettings.address || {};
    const updatedAddress = {
      street: input.street !== undefined ? input.street.trim() : (input.address?.street !== undefined ? input.address.street.trim() : existingAddress.street || ''),
      city: input.city !== undefined ? input.city.trim() : (input.address?.city !== undefined ? input.address.city.trim() : existingAddress.city || ''),
      state: input.state !== undefined ? input.state.trim() : (input.address?.state !== undefined ? input.address.state.trim() : existingAddress.state || ''),
      country: input.country !== undefined ? input.country.trim() : (input.address?.country !== undefined ? input.address.country.trim() : existingAddress.country || ''),
      pincode: input.pincode !== undefined ? input.pincode.trim() : (input.address?.pincode !== undefined ? input.address.pincode.trim() : existingAddress.pincode || ''),
    };

    const updatedSettings = {
      ...currentSettings,
      ...(input.email !== undefined ? { email: input.email.trim() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
      ...(input.website !== undefined ? { website: input.website.trim() } : {}),
      ...(input.registration_no !== undefined ? { registration_no: input.registration_no.trim() } : {}),
      ...(input.established_date !== undefined ? { established_date: input.established_date } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.logo_url !== undefined ? { logo_url: input.logo_url ? input.logo_url.trim() : null } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.registered_under_act !== undefined ? { registered_under_act: input.registered_under_act.trim() } : {}),
      ...(input.social_media_links !== undefined ? { social_media_links: input.social_media_links.trim() } : {}),
      ...(input.ceo_name !== undefined ? { ceo_name: input.ceo_name.trim() } : {}),
      ...(input.ceo_contact !== undefined ? { ceo_contact: input.ceo_contact.trim() } : {}),
      ...(input.chairperson_name !== undefined ? { chairperson_name: input.chairperson_name.trim() } : {}),
      ...(input.chairperson_contact !== undefined ? { chairperson_contact: input.chairperson_contact.trim() } : {}),
      address: updatedAddress,
    };

    const finalName = input.name && input.name.trim() ? input.name.trim() : current.name;
    const finalPlan = input.plan ? input.plan : current.plan;
    const finalStatus = input.status ? input.status : current.status;
    const finalLogo = input.logo_url !== undefined ? (input.logo_url ? input.logo_url.trim() : null) : current.logo_url;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const adminUpdates: Record<string, string> = {};
      if (input.admin_name?.trim()) adminUpdates.name = input.admin_name.trim();
      if (input.admin_email?.trim()) adminUpdates.email = input.admin_email.toLowerCase().trim();
      if (input.admin_password?.trim()) {
        adminUpdates.password_hash = await bcrypt.hash(input.admin_password, 10);
      }

      const tenantResult = await client.query<{ tenant: ITenant | null }>(
        'SELECT public.update_saas_tenant($1::bigint, $2::jsonb, $3::jsonb) AS tenant',
        [
          id,
          JSON.stringify({
            name: finalName,
            slug,
            plan: finalPlan,
            status: finalStatus,
            logo_url: finalLogo,
            settings: updatedSettings,
          }),
          Object.keys(adminUpdates).length ? JSON.stringify(adminUpdates) : null,
        ]
      );
      const updatedTenant = tenantResult.rows[0]?.tenant;
      if (!updatedTenant) throw new ApiError(404, 'Organization not found');

      await client.query('COMMIT');
      logger.info({ tenantId: id, slug }, 'SuperAdminService.updateTenant updated successfully');
      return updatedTenant;
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err, tenantId: id }, 'SuperAdminService.updateTenant failed');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update Tenant Status (active, suspended)
   */
  public async updateTenantStatus(id: number, status: 'active' | 'suspended'): Promise<ITenant> {
    const { rows } = await pool.query<{ tenant: ITenant | null }>(
      'SELECT public.update_saas_tenant_status($1::bigint, $2::text) AS tenant',
      [id, status]
    );

    if (!rows[0]?.tenant) {
      throw new ApiError(404, 'Organization not found');
    }

    return rows[0].tenant;
  }

  /**
   * Global metrics for Super Admin dashboard
   */
  public async getMetrics(): Promise<ISuperAdminMetrics> {
    const { rows } = await pool.query<{
      total_tenants: number;
      active_tenants: number;
      total_users: number;
      total_leads: number;
    }>('SELECT * FROM public.get_super_admin_metrics()');

    return {
      totalTenants: rows[0].total_tenants,
      activeTenants: rows[0].active_tenants,
      totalUsers: rows[0].total_users,
      totalLeads: rows[0].total_leads,
    };
  }
}

export const superAdminService = new SuperAdminService();
