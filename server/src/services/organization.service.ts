import { pool } from '@/config/db';
import { IOrganization } from '@/interfaces/crm.interface';
import { CreateOrganizationInput, UpdateOrganizationInput } from '@/schemas/organization.schema';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { WorkflowService } from './workflow.service';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const formatJsonParam = (val: any): string | null => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return trimmed;
      } catch {
        // Fallback to stringifying plain text string into JSON string format
      }
    }
    return JSON.stringify(val);
  }
  return JSON.stringify(val);
};

export class OrganizationService {
  public static async getAll(params?: { page?: number; perPage?: number; search?: string }): Promise<{ rows: IOrganization[]; total: number }> {
    try {
      const page = Math.max(1, Number(params?.page) || 1);
      const perPage = Math.max(1, Number(params?.perPage) || 10);
      const search = params?.search ? String(params.search).trim() : '';
      const offset = (page - 1) * perPage;

      const { rows } = await pool.query('SELECT public.get_all_organizations($1::text, $2::int, $3::int) as result', [
        search || null,
        perPage,
        offset,
      ]);

      const resData = rows[0]?.result || { rows: [], total: 0 };
      return {
        rows: resData.rows || [],
        total: Number(resData.total) || 0,
      };
    } catch (error: any) {
      logger.error({ error, params }, 'OrganizationService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IOrganization | null> {
    try {
      const orgId = toNumberParam(id);
      if (!orgId) return null;

      const { rows } = await pool.query('SELECT public.get_organization($1::int) as result', [orgId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'OrganizationService.getById failed');
      throw error;
    }
  }

    private static async validateUnique(data: any, orgId?: number | null): Promise<void> {
    if (data.name && typeof data.name === 'string' && data.name.trim()) {
      const q = orgId 
        ? 'SELECT id FROM organizations WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND id != $2 LIMIT 1'
        : 'SELECT id FROM organizations WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1';
      const params = orgId ? [data.name.trim(), orgId] : [data.name.trim()];
      const { rows } = await pool.query(q, params);
      if (rows.length > 0) {
        throw new ApiError(400, 'An organization with this name already exists. Please choose a different name.');
      }
    }

    if (data.address && typeof data.address === 'object') {
      const addr = data.address;
      if (addr.email && typeof addr.email === 'string' && addr.email.trim()) {
        const email = addr.email.trim().toLowerCase();
        const q = orgId
          ? "SELECT id FROM organizations WHERE (LOWER(address->>'email') = $1 OR LOWER(address->>'work_email') = $1) AND id != $2 LIMIT 1"
          : "SELECT id FROM organizations WHERE (LOWER(address->>'email') = $1 OR LOWER(address->>'work_email') = $1) LIMIT 1";
        const params = orgId ? [email, orgId] : [email];
        const { rows } = await pool.query(q, params);
        if (rows.length > 0) {
          throw new ApiError(400, `An organization with email "${addr.email.trim()}" already exists. Duplicate email is not allowed.`);
        }
      }
      if (addr.phone && typeof addr.phone === 'string' && addr.phone.trim()) {
        const phone = addr.phone.trim();
        const q = orgId
          ? "SELECT id FROM organizations WHERE (address->>'phone' = $1 OR address->>'mobile' = $1) AND id != $2 LIMIT 1"
          : "SELECT id FROM organizations WHERE (address->>'phone' = $1 OR address->>'mobile' = $1) LIMIT 1";
        const params = orgId ? [phone, orgId] : [phone];
        const { rows } = await pool.query(q, params);
        if (rows.length > 0) {
          throw new ApiError(400, `An organization with mobile/contact number "${phone}" already exists. Duplicate mobile number is not allowed.`);
        }
      }
    }
  }

  public static async create(data: CreateOrganizationInput & { custom_attributes?: any }): Promise<IOrganization> {
    try {
      const addressJson = formatJsonParam(data.address);
      const customAttrsJson = formatJsonParam(data.custom_attributes) || '{}';
      const userId = toNumberParam(data.user_id);

      const { rows } = await pool.query(
        'SELECT save_organization($1, $2::jsonb, $3, $4::jsonb) as result',
        [data.name.trim(), addressJson, userId, customAttrsJson]
      );
      const createdOrg = rows[0]?.result;
      if (createdOrg) {
        WorkflowService.triggerWorkflows('organizations', 'create', createdOrg).catch((e) => logger.error(e));
      }
      return createdOrg;
    } catch (error: any) {
      logger.error({ error, data }, 'OrganizationService.create failed');
      if (error?.code === '23505' || (error?.message && error.message.includes('organizations_name_key'))) {
        throw new ApiError(400, 'An organization with this name already exists. Please choose a different name.');
      }
      throw error;
    }
  }

  public static async update(id: number | string, data: UpdateOrganizationInput & { custom_attributes?: any }): Promise<IOrganization> {
    try {
      const orgId = toNumberParam(id);
      if (!orgId) throw new ApiError(404, 'Organization not found');

      const existing = await this.getById(orgId);
      if (!existing) {
        throw new ApiError(404, 'Organization not found');
      }

      const name = data.name !== undefined ? data.name.trim() : existing.name;
      let addressJson: string | null = null;
      if (data.address !== undefined) {
        addressJson = formatJsonParam(data.address);
      } else if (existing.address) {
        addressJson = formatJsonParam(existing.address);
      }
      const userId = data.user_id !== undefined ? toNumberParam(data.user_id) : existing.user_id;
      const customAttrsJson = data.custom_attributes !== undefined
        ? (formatJsonParam(data.custom_attributes) || '{}')
        : formatJsonParam(existing.custom_attributes || {});

      const { rows } = await pool.query(
        'SELECT save_organization($1, $2::jsonb, $3, $4::jsonb, $5) as result',
        [name, addressJson, userId, customAttrsJson, orgId]
      );
      const updatedOrg = rows[0]?.result;
      if (updatedOrg) {
        WorkflowService.triggerWorkflows('organizations', 'update', updatedOrg).catch((e) => logger.error(e));
      }
      return updatedOrg;
    } catch (error: any) {
      logger.error({ error, id, data }, 'OrganizationService.update failed');
      if (error?.code === '23505' || (error?.message && error.message.includes('organizations_name_key'))) {
        throw new ApiError(400, 'An organization with this name already exists. Please choose a different name.');
      }
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const orgId = toNumberParam(id);
      if (!orgId) return false;

      const { rows } = await pool.query('SELECT delete_organization($1) as result', [orgId]);
      const isDeleted = Boolean(rows[0]?.result);
      if (isDeleted) {
        WorkflowService.triggerWorkflows('organizations', 'delete', { id: orgId }).catch((e) => logger.error(e));
      }
      return isDeleted;
    } catch (error: any) {
      logger.error({ error, id }, 'OrganizationService.delete failed');
      throw error;
    }
  }

  public static async getPublicBranding(): Promise<{ name: string; logo: string | null }> {
    try {
      const configRes = await pool.query(
        "SELECT value FROM core_config WHERE code = 'general.general.admin_logo.logo_image' LIMIT 1"
      );
      const adminLogo = configRes.rows[0]?.value || null;

      const { rows } = await pool.query(
        'SELECT public.get_all_organizations(null, 1, 0) as result'
      );
      const firstOrg = rows[0]?.result?.rows?.[0];
      const addr = firstOrg?.address || {};

      return {
        name: firstOrg?.name || 'CRM System',
        logo: adminLogo || addr.logo || null,
      };
    } catch (error: any) {
      logger.error({ error }, 'OrganizationService.getPublicBranding failed');
      return {
        name: 'CRM System',
        logo: null,
      };
    }
  }

  public static async getCompanyProfile(reqUser?: any): Promise<any> {
    try {
      const targetOrgId = reqUser?.organization_id || null;

      let org: any = null;
      if (targetOrgId) {
        const { rows } = await pool.query('SELECT * FROM organizations WHERE id = $1 LIMIT 1', [targetOrgId]);
        org = rows[0];
      }

      if (!org) {
        const { rows } = await pool.query('SELECT * FROM organizations ORDER BY id ASC LIMIT 1');
        org = rows[0];
      }

      const configRes = await pool.query(
        "SELECT value FROM core_config WHERE code = 'general.general.admin_logo.logo_image' LIMIT 1"
      );
      const adminLogo = configRes.rows[0]?.value || null;

      if (!org) {
        return {
          id: 1,
          name: 'My Organization',
          logo: adminLogo || null,
          email: '',
          phone: '',
          website: '',
          address: '',
          city: '',
          state: '',
          country: 'India',
          postcode: '',
          tax_number: '',
          pan_number: '',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
        };
      }

      const addr = (typeof org.address === 'object' && org.address !== null) ? org.address : {};

      return {
        id: org.id,
        name: org.name,
        logo: addr.logo || adminLogo || null,
        email: addr.email || '',
        phone: addr.phone || '',
        website: addr.website || '',
        address: addr.address || (typeof org.address === 'string' ? org.address : ''),
        city: addr.city || '',
        state: addr.state || '',
        country: addr.country || 'India',
        postcode: addr.postcode || '',
        tax_number: addr.tax_number || addr.gstin || '',
        pan_number: addr.pan_number || '',
        currency: addr.currency || 'INR',
        timezone: addr.timezone || 'Asia/Kolkata',
        settings: addr.settings || {},
        created_at: org.created_at,
        updated_at: org.updated_at,
      };
    } catch (error: any) {
      logger.error({ error }, 'OrganizationService.getCompanyProfile failed');
      throw error;
    }
  }

  public static async updateCompanyProfile(data: any, reqUser?: any): Promise<any> {
    try {
      let targetOrgId = reqUser?.organization_id || data.id || null;

      let existingOrg: any = null;
      if (targetOrgId) {
        const { rows } = await pool.query('SELECT * FROM organizations WHERE id = $1 LIMIT 1', [targetOrgId]);
        existingOrg = rows[0];
      }
      if (!existingOrg) {
        const { rows } = await pool.query('SELECT * FROM organizations ORDER BY id ASC LIMIT 1');
        existingOrg = rows[0];
      }

      const currentAddr = (existingOrg && typeof existingOrg.address === 'object' && existingOrg.address !== null)
        ? existingOrg.address
        : {};

      const updatedAddr = {
        ...currentAddr,
        address: data.address !== undefined ? data.address : (currentAddr.address || ''),
        city: data.city !== undefined ? data.city : (currentAddr.city || ''),
        state: data.state !== undefined ? data.state : (currentAddr.state || ''),
        country: data.country !== undefined ? data.country : (currentAddr.country || 'India'),
        postcode: data.postcode !== undefined ? data.postcode : (currentAddr.postcode || ''),
        phone: data.phone !== undefined ? data.phone : (currentAddr.phone || ''),
        email: data.email !== undefined ? data.email : (currentAddr.email || ''),
        website: data.website !== undefined ? data.website : (currentAddr.website || ''),
        tax_number: data.tax_number !== undefined ? data.tax_number : (currentAddr.tax_number || ''),
        pan_number: data.pan_number !== undefined ? data.pan_number : (currentAddr.pan_number || ''),
        logo: data.logo !== undefined ? data.logo : (currentAddr.logo || null),
        currency: data.currency !== undefined ? data.currency : (currentAddr.currency || 'INR'),
        timezone: data.timezone !== undefined ? data.timezone : (currentAddr.timezone || 'Asia/Kolkata'),
        settings: data.settings !== undefined ? data.settings : (currentAddr.settings || {}),
      };

      const orgName = data.name?.trim() || existingOrg?.name || 'My Organization';

      let savedOrg: any = null;
      if (existingOrg) {
        const { rows } = await pool.query(
          'UPDATE organizations SET name = $1, address = $2::jsonb, updated_at = NOW() WHERE id = $3 RETURNING *',
          [orgName, JSON.stringify(updatedAddr), existingOrg.id]
        );
        savedOrg = rows[0];
      } else {
        const { rows } = await pool.query(
          'INSERT INTO organizations (name, address, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW()) RETURNING *',
          [orgName, JSON.stringify(updatedAddr)]
        );
        savedOrg = rows[0];
      }

      if (updatedAddr.logo) {
        await pool.query(
          "INSERT INTO core_config (code, value, created_at, updated_at) VALUES ('general.general.admin_logo.logo_image', $1, NOW(), NOW()) ON CONFLICT (code) DO UPDATE SET value = $1, updated_at = NOW()",
          [updatedAddr.logo]
        ).catch(() => {});
      }

      return {
        id: savedOrg.id,
        name: savedOrg.name,
        ...updatedAddr,
        updated_at: savedOrg.updated_at,
      };
    } catch (error: any) {
      logger.error({ error, data }, 'OrganizationService.updateCompanyProfile failed');
      throw error;
    }
  }
}