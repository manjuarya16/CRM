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

export class OrganizationService {
  public static async getAll(params?: { page?: number; perPage?: number; search?: string }): Promise<{ rows: IOrganization[]; total: number }> {
    try {
      const page = Math.max(1, Number(params?.page) || 1);
      const perPage = Math.max(1, Number(params?.perPage) || 10);
      const search = params?.search ? String(params.search).trim() : '';
      const offset = (page - 1) * perPage;

      try {
        const { rows } = await pool.query('SELECT get_all_organizations($1, $2, $3) as result', [
          search || null,
          perPage,
          offset,
        ]);

        const resData = rows[0]?.result || { rows: [], total: 0 };
        return {
          rows: resData.rows || [],
          total: Number(resData.total) || 0,
        };
      } catch (spError) {
        let query = 'SELECT * FROM organizations';
        const queryParams: any[] = [];
        if (search) {
          query += ' WHERE name ILIKE $1';
          queryParams.push(`%${search}%`);
        }
        query += ` ORDER BY id DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(perPage, offset);

        const { rows } = await pool.query(query, queryParams);
        const countRes = await pool.query('SELECT COUNT(*) FROM organizations');
        const total = Number(countRes.rows[0]?.count || rows.length);
        return { rows, total };
      }
    } catch (error: any) {
      logger.error({ error, params }, 'OrganizationService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IOrganization | null> {
    try {
      const orgId = toNumberParam(id);
      if (!orgId) return null;

      try {
        const { rows } = await pool.query('SELECT get_organization($1) as result', [orgId]);
        if (rows[0]?.result) return rows[0].result;
      } catch (spErr) {
        // Fallback to direct query
      }

      const { rows } = await pool.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ error, id }, 'OrganizationService.getById failed');
      throw error;
    }
  }

  public static async create(data: CreateOrganizationInput & { custom_attributes?: any }): Promise<IOrganization> {
    try {
      const addressJson = typeof data.address === 'object' ? JSON.stringify(data.address) : data.address;
      const customAttrsJson = typeof data.custom_attributes === 'object' ? JSON.stringify(data.custom_attributes) : (data.custom_attributes || '{}');
      const userId = toNumberParam(data.user_id);

      const { rows } = await pool.query(
        'SELECT save_organization($1, $2::jsonb, $3, $4::jsonb) as result',
        [data.name.trim(), addressJson || null, userId, customAttrsJson]
      );
      const createdOrg = rows[0]?.result;
      if (createdOrg) {
        WorkflowService.triggerWorkflows('organizations', 'create', createdOrg).catch((e) => logger.error(e));
      }
      return createdOrg;
    } catch (error: any) {
      logger.error({ error, data }, 'OrganizationService.create failed');
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
        addressJson = typeof data.address === 'object' ? JSON.stringify(data.address) : data.address;
      } else if (existing.address) {
        addressJson = typeof existing.address === 'object' ? JSON.stringify(existing.address) : existing.address;
      }
      const userId = data.user_id !== undefined ? toNumberParam(data.user_id) : existing.user_id;
      const customAttrsJson = data.custom_attributes !== undefined
        ? (typeof data.custom_attributes === 'object' ? JSON.stringify(data.custom_attributes) : data.custom_attributes)
        : JSON.stringify(existing.custom_attributes || {});

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
      const { rows } = await pool.query<IOrganization>(
        'SELECT * FROM organizations ORDER BY id ASC LIMIT 1'
      );
      if (rows[0]) {
        const addr = rows[0].address || {};
        return {
          name: rows[0].name,
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
