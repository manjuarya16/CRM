import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '@/config/db';
import { env } from '@/config/env';
import { ApiError } from '@/middleware/errorHandler';
import { ITenant, ISuperAdmin } from '@/interfaces';
import { logger } from '@/utils/logger';

export interface CreateTenantInput {
  name: string;
  slug: string;
  plan?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;

  // Company Details
  registration_no?: string;
  email?: string;
  phone?: string;
  website?: string;
  established_date?: string;
  currency?: string;
  timezone?: string;
  logo_url?: string;

  // Address & Location
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  plan?: string;
  status?: 'active' | 'suspended';
  logo_url?: string | null;

  // Company Details
  registration_no?: string;
  email?: string;
  phone?: string;
  website?: string;
  established_date?: string;
  currency?: string;
  timezone?: string;

  // Address
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };

  // Administrator
  admin_name?: string;
  admin_email?: string;
  admin_password?: string;
}

export class SuperAdminService {
  /**
   * Signs a JWT token specifically for Super Admin
   */
  public static signToken(adminId: number | string): string {
    return jwt.sign(
      { sub: String(adminId), is_super_admin: true, role: 'super_admin' },
      env.JWT_SECRET,
      { expiresIn: '7d' } as jwt.SignOptions
    );
  }

  /**
   * Super Admin Login
   */
  public static async login(email: string, password: string): Promise<{ admin: ISuperAdmin; token: string }> {
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash, status FROM public.saas_super_admins WHERE email = $1 LIMIT 1',
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

    const token = this.signToken(admin.id);
    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
      },
      token,
    };
  }

  /**
   * Get all tenants with statistics
   */
  public static async getTenants(): Promise<any[]> {
    const { rows } = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.slug,
        t.domain,
        t.status,
        t.plan,
        t.logo_url,
        t.settings,
        t.created_at,
        t.updated_at,
        COALESCE(u.user_count, 0) as user_count,
        COALESCE(l.lead_count, 0) as lead_count
      FROM public.saas_tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int as user_count 
        FROM public.users 
        GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int as lead_count 
        FROM public.leads 
        GROUP BY tenant_id
      ) l ON l.tenant_id = t.id
      ORDER BY t.id DESC;
    `);

    return rows;
  }

  /**
   * Create a new Tenant Organization and automatically seed initial data
   */
  public static async createTenant(input: CreateTenantInput): Promise<{ tenant: ITenant; adminUser: any }> {
    const slug = input.slug.toLowerCase().trim();

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new ApiError(400, 'Subdomain slug must contain only lowercase letters, numbers, and hyphens (e.g. acme-corp)');
    }

    if (['admin', 'api', 'www', 'mail', 'app', 'public', 'superadmin', 'root'].includes(slug)) {
      throw new ApiError(400, `The subdomain '${slug}' is a reserved system name.`);
    }

    // Check if slug already exists
    const existing = await pool.query('SELECT id FROM public.saas_tenants WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) {
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
      };

      // 1. Insert Tenant Record
      const tenantRes = await client.query<ITenant>(
        `INSERT INTO public.saas_tenants (name, slug, plan, status, logo_url, settings)
         VALUES ($1, $2, $3, 'active', $4, $5::jsonb)
         RETURNING *;`,
        [input.name.trim(), slug, input.plan || 'pro', logoUrl, JSON.stringify(settings)]
      );
      const tenant = tenantRes.rows[0];
      const tenantId = tenant.id;

      // Set RLS session context so subsequent inserts for this tenant pass row-level security
      await client.query(
        `SELECT set_config('app.current_tenant_id', $1, true), set_config('app.is_super_admin', 'true', true)`,
        [String(tenantId)]
      );

      // 2. Seed Default Administrator Role for this tenant
      const roleRes = await client.query(
        `INSERT INTO public.roles (name, description, permission_type, tenant_id)
         VALUES ('Administrator', 'Full system access', 'all', $1)
         RETURNING id;`,
        [tenantId]
      );
      const adminRoleId = roleRes.rows[0].id;

      // 3. Create initial Tenant Admin User
      const passwordHash = await bcrypt.hash(input.admin_password, 10);
      const userRes = await client.query(
        `INSERT INTO public.users (name, email, password, status, role_id, tenant_id)
         VALUES ($1, $2, $3, true, $4, $5)
         RETURNING id, name, email, role_id, tenant_id;`,
        [input.admin_name.trim(), input.admin_email.toLowerCase().trim(), passwordHash, adminRoleId, tenantId]
      );
      const adminUser = userRes.rows[0];

      // 4. Seed Default Lead Pipeline & Stages
      const pipelineRes = await client.query(
        `INSERT INTO public.lead_pipelines (name, is_default, rotten_days, tenant_id)
         VALUES ('Default Pipeline', true, 30, $1)
         RETURNING id;`,
        [tenantId]
      );
      const pipelineId = pipelineRes.rows[0].id;

      const stages = [
        { code: 'new', name: 'New Lead', prob: 10, sort: 1 },
        { code: 'contacted', name: 'Contacted', prob: 30, sort: 2 },
        { code: 'proposal', name: 'Proposal Sent', prob: 60, sort: 3 },
        { code: 'negotiation', name: 'Negotiation', prob: 80, sort: 4 },
        { code: 'won', name: 'Won', prob: 100, sort: 5 },
        { code: 'lost', name: 'Lost', prob: 0, sort: 6 },
      ];

      for (const st of stages) {
        await client.query(
          `INSERT INTO public.lead_pipeline_stages (lead_pipeline_id, code, name, probability, sort_order, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [pipelineId, st.code, st.name, st.prob, st.sort, tenantId]
        );
      }

      // 5. Seed Default Lead Sources
      const defaultSources = ['Website Form', 'Direct Call', 'Email Campaign', 'Referral', 'Social Media'];
      for (const s of defaultSources) {
        await client.query(
          `INSERT INTO public.lead_sources (name, tenant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [s, tenantId]
        );
      }

      // 6. Seed Default Lead Types
      const defaultTypes = ['New Business', 'Existing Customer Upgrade', 'Partnership'];
      for (const t of defaultTypes) {
        await client.query(
          `INSERT INTO public.lead_types (name, tenant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [t, tenantId]
        );
      }

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
  public static async updateTenant(id: number, input: UpdateTenantInput): Promise<ITenant> {
    const existing = await pool.query('SELECT * FROM public.saas_tenants WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new ApiError(404, 'Organization not found');
    }
    const current = existing.rows[0];

    // If slug is changed, validate format and uniqueness
    let slug = current.slug;
    if (input.slug && input.slug.trim()) {
      const candidateSlug = input.slug.toLowerCase().trim();
      if (!/^[a-z0-9-]+$/.test(candidateSlug)) {
        throw new ApiError(400, 'Subdomain slug must contain only lowercase letters, numbers, and hyphens');
      }
      if (['admin', 'api', 'www', 'mail', 'app', 'public', 'superadmin', 'root'].includes(candidateSlug)) {
        throw new ApiError(400, `The subdomain '${candidateSlug}' is a reserved system name.`);
      }
      if (candidateSlug !== current.slug) {
        const conflict = await pool.query('SELECT id FROM public.saas_tenants WHERE slug = $1 AND id != $2', [candidateSlug, id]);
        if (conflict.rows.length > 0) {
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
      address: updatedAddress,
    };

    const finalName = input.name && input.name.trim() ? input.name.trim() : current.name;
    const finalPlan = input.plan ? input.plan : current.plan;
    const finalStatus = input.status ? input.status : current.status;
    const finalLogo = input.logo_url !== undefined ? (input.logo_url ? input.logo_url.trim() : null) : current.logo_url;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `SELECT set_config('app.current_tenant_id', $1, true), set_config('app.is_super_admin', 'true', true)`,
        [String(id)]
      );

      const tenantRes = await client.query<ITenant>(
        `UPDATE public.saas_tenants
         SET name = $1,
             slug = $2,
             plan = $3,
             status = $4,
             logo_url = $5,
             settings = $6::jsonb,
             updated_at = NOW()
         WHERE id = $7
         RETURNING *;`,
        [finalName, slug, finalPlan, finalStatus, finalLogo, JSON.stringify(updatedSettings), id]
      );

      // If admin user updates provided, update the primary admin
      if (input.admin_name || input.admin_email || input.admin_password) {
        const adminRes = await client.query(
          `SELECT id FROM public.users WHERE tenant_id = $1 ORDER BY id ASC LIMIT 1`,
          [id]
        );
        if (adminRes.rows.length > 0) {
          const adminUserId = adminRes.rows[0].id;
          const updateParts: string[] = [];
          const updateValues: any[] = [];
          let pIdx = 1;

          if (input.admin_name && input.admin_name.trim()) {
            updateParts.push(`name = $${pIdx++}`);
            updateValues.push(input.admin_name.trim());
          }
          if (input.admin_email && input.admin_email.trim()) {
            updateParts.push(`email = $${pIdx++}`);
            updateValues.push(input.admin_email.toLowerCase().trim());
          }
          if (input.admin_password && input.admin_password.trim()) {
            const pwdHash = await bcrypt.hash(input.admin_password, 10);
            updateParts.push(`password = $${pIdx++}`);
            updateValues.push(pwdHash);
          }

          if (updateParts.length > 0) {
            updateValues.push(adminUserId);
            await client.query(
              `UPDATE public.users SET ${updateParts.join(', ')} WHERE id = $${pIdx}`,
              updateValues
            );
          }
        }
      }

      await client.query('COMMIT');
      logger.info({ tenantId: id, slug }, 'SuperAdminService.updateTenant updated successfully');
      return tenantRes.rows[0];
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
  public static async updateTenantStatus(id: number, status: 'active' | 'suspended'): Promise<ITenant> {
    const { rows } = await pool.query<ITenant>(
      `UPDATE public.saas_tenants 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *;`,
      [status, id]
    );

    if (rows.length === 0) {
      throw new ApiError(404, 'Organization not found');
    }

    return rows[0];
  }

  /**
   * Global metrics for Super Admin dashboard
   */
  public static async getMetrics(): Promise<any> {
    const tenantsCount = await pool.query('SELECT count(*)::int as total FROM public.saas_tenants');
    const activeTenantsCount = await pool.query("SELECT count(*)::int as total FROM public.saas_tenants WHERE status = 'active'");
    const totalUsersCount = await pool.query('SELECT count(*)::int as total FROM public.users');
    const totalLeadsCount = await pool.query('SELECT count(*)::int as total FROM public.leads');

    return {
      totalTenants: tenantsCount.rows[0].total,
      activeTenants: activeTenantsCount.rows[0].total,
      totalUsers: totalUsersCount.rows[0].total,
      totalLeads: totalLeadsCount.rows[0].total,
    };
  }
}
