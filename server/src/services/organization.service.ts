import { pool } from '@/config/db';
import { IOrganization } from '@/interfaces/crm.interface';
import { CreateOrganizationInput, UpdateOrganizationInput } from '@/schemas/organization.schema';
import { ApiError } from '@/middleware/errorHandler';

export class OrganizationService {
  public static async getAll(): Promise<IOrganization[]> {
    const { rows } = await pool.query<IOrganization>(
      `SELECT o.*, COALESCE(COUNT(p.id), 0)::int AS person_count
       FROM organizations o
       LEFT JOIN persons p ON p.organization_id = o.id
       GROUP BY o.id
       ORDER BY o.id ASC`
    );
    return rows;
  }

  public static async getById(id: number | string): Promise<IOrganization | null> {
    const { rows } = await pool.query<IOrganization>(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  public static async create(data: CreateOrganizationInput): Promise<IOrganization> {
    const addressJson = typeof data.address === 'object' ? JSON.stringify(data.address) : data.address;
    const { rows } = await pool.query<IOrganization>(
      `INSERT INTO organizations (name, address, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [data.name, addressJson || null, data.user_id || null]
    );
    return rows[0];
  }

  public static async update(id: number | string, data: UpdateOrganizationInput): Promise<IOrganization> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ApiError(404, 'Organization not found');
    }

    const name = data.name !== undefined ? data.name : existing.name;
    let address = existing.address;
    if (data.address !== undefined) {
      address = typeof data.address === 'object' ? JSON.stringify(data.address) : data.address;
    }
    const userId = data.user_id !== undefined ? data.user_id : existing.user_id;

    const { rows } = await pool.query<IOrganization>(
      `UPDATE organizations 
       SET name = $1, address = $2, user_id = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, address, userId, id]
    );
    return rows[0];
  }

  public static async delete(id: number | string): Promise<boolean> {
    const result = await pool.query('DELETE FROM organizations WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  public static async getPublicBranding(): Promise<{ name: string; logo: string | null }> {
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
  }
}
