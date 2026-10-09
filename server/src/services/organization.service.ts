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
      const { rows } = await pool.query(
        'SELECT public.get_all_organizations(null, 1, 0) as result'
      );
      const firstOrg = rows[0]?.result?.rows?.[0];
      if (firstOrg) {
        const addr = firstOrg.address || {};
        return {
          name: firstOrg.name,
          logo: addr.logo || null,
        };
      }
      return {
        name: 'CRM System',
        logo: null,
      };
    } catch (error: any) {
      logger.error({ error }, 'OrganizationService.getPublicBranding failed');
      return {
        name: 'CRM System',
        logo: null,
      };
    }
  }
}
