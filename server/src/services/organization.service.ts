import { pool } from '@/config/db';
import { IOrganization } from '@/interfaces/crm.interface';
import { CreateOrganizationInput, UpdateOrganizationInput } from '@/schemas/organization.schema';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class OrganizationService {
  public static async getAll(): Promise<IOrganization[]> {
    try {
      const { rows } = await pool.query<IOrganization>(
        `SELECT o.*, COALESCE(COUNT(p.id), 0)::int AS person_count
         FROM organizations o
         LEFT JOIN persons p ON p.organization_id = o.id
         GROUP BY o.id
         ORDER BY o.id ASC`
      );
      return rows;
    } catch (error: any) {
      logger.error({ error }, 'OrganizationService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IOrganization | null> {
    try {
      const orgId = toNumberParam(id);
      if (!orgId) return null;

      const { rows } = await pool.query<IOrganization>(
        'SELECT * FROM organizations WHERE id = $1',
        [orgId]
      );
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ error, id }, 'OrganizationService.getById failed');
      throw error;
    }
  }

  public static async create(data: CreateOrganizationInput): Promise<IOrganization> {
    try {
      const addressJson = typeof data.address === 'object' ? JSON.stringify(data.address) : data.address;
      const userId = toNumberParam(data.user_id);

      const { rows } = await pool.query<IOrganization>(
        `INSERT INTO organizations (name, address, user_id, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [data.name.trim(), addressJson || null, userId]
      );
      return rows[0];
    } catch (error: any) {
      logger.error({ error, data }, 'OrganizationService.create failed');
      throw error;
    }
  }

  public static async update(id: number | string, data: UpdateOrganizationInput): Promise<IOrganization> {
    try {
      const orgId = toNumberParam(id);
      if (!orgId) throw new ApiError(404, 'Organization not found');

      const existing = await this.getById(orgId);
      if (!existing) {
        throw new ApiError(404, 'Organization not found');
      }

      const name = data.name !== undefined ? data.name.trim() : existing.name;
      let address = existing.address;
      if (data.address !== undefined) {
        address = typeof data.address === 'object' ? JSON.stringify(data.address) : data.address;
      }
      const userId = data.user_id !== undefined ? toNumberParam(data.user_id) : existing.user_id;

      const { rows } = await pool.query<IOrganization>(
        `UPDATE organizations 
         SET name = $1, address = $2, user_id = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [name, address, userId, orgId]
      );
      return rows[0];
    } catch (error: any) {
      logger.error({ error, id, data }, 'OrganizationService.update failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const orgId = toNumberParam(id);
      if (!orgId) return false;

      const result = await pool.query('DELETE FROM organizations WHERE id = $1', [orgId]);
      return (result.rowCount ?? 0) > 0;
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
