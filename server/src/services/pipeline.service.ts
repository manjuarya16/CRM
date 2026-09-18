import { pool } from '@/config/db';
import { IPipeline, IPipelineStage } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';

export class PipelineService {
  public static async getAll(search?: string): Promise<IPipeline[]> {
    let query = `
      SELECT p.*, COALESCE(COUNT(l.id), 0)::int AS leads_count
      FROM lead_pipelines p
      LEFT JOIN leads l ON l.lead_pipeline_id = p.id
    `;
    const params: any[] = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` WHERE p.name ILIKE $${params.length}`;
    }

    query += `
      GROUP BY p.id
      ORDER BY p.is_default DESC, p.id ASC
    `;

    const { rows: pipelines } = await pool.query<IPipeline>(query, params);

    if (pipelines.length > 0) {
      const pipelineIds = pipelines.map((p) => p.id);
      const { rows: stages } = await pool.query<IPipelineStage>(
        `SELECT * FROM lead_pipeline_stages
         WHERE lead_pipeline_id = ANY($1::int[])
         ORDER BY sort_order ASC, id ASC`,
        [pipelineIds]
      );

      const stageMap: Record<number, IPipelineStage[]> = {};
      for (const s of stages) {
        if (s.lead_pipeline_id) {
          if (!stageMap[s.lead_pipeline_id]) stageMap[s.lead_pipeline_id] = [];
          stageMap[s.lead_pipeline_id].push(s);
        }
      }

      for (const p of pipelines) {
        p.stages = stageMap[p.id] || [];
      }
    }

    return pipelines;
  }

  public static async getById(id: number | string): Promise<IPipeline | null> {
    const { rows } = await pool.query<IPipeline>(
      `SELECT p.*, COALESCE(COUNT(l.id), 0)::int AS leads_count
       FROM lead_pipelines p
       LEFT JOIN leads l ON l.lead_pipeline_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );

    if (!rows[0]) return null;

    const { rows: stages } = await pool.query<IPipelineStage>(
      `SELECT * FROM lead_pipeline_stages
       WHERE lead_pipeline_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    rows[0].stages = stages;
    return rows[0];
  }

  // Unified single function for both Add and Edit
  public static async save(
    data: {
      name: string;
      is_default?: boolean;
      rotten_days?: number;
      stages?: Array<{ id?: number; code?: string | null; name: string; probability?: number; sort_order?: number }>;
    },
    id?: number | string
  ): Promise<IPipeline> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const isDefault = Boolean(data.is_default);
      const rottenDays = Number.isFinite(data.rotten_days) ? Number(data.rotten_days) : 30;

      let pipelineId: number;

      if (id) {
        // Edit / Update
        const existing = await client.query('SELECT * FROM lead_pipelines WHERE id = $1', [id]);
        if (!existing.rows[0]) {
          throw new ApiError(404, 'Pipeline not found');
        }

        pipelineId = Number(id);

        if (isDefault) {
          await client.query('UPDATE lead_pipelines SET is_default = false WHERE id != $1', [pipelineId]);
        }

        const name = data.name !== undefined ? data.name : existing.rows[0].name;

        await client.query(
          `UPDATE lead_pipelines
           SET name = $1, is_default = $2, rotten_days = $3, updated_at = NOW()
           WHERE id = $4`,
          [name, isDefault, rottenDays, pipelineId]
        );
      } else {
        // Add / Create
        if (isDefault) {
          await client.query('UPDATE lead_pipelines SET is_default = false');
        }

        const insertRes = await client.query<IPipeline>(
          `INSERT INTO lead_pipelines (name, is_default, rotten_days, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           RETURNING *`,
          [data.name, isDefault, rottenDays]
        );
        pipelineId = insertRes.rows[0].id;
      }

      // Synchronize stages if provided
      if (Array.isArray(data.stages) && data.stages.length > 0) {
        const keptStageIds: number[] = [];

        for (let i = 0; i < data.stages.length; i++) {
          const st = data.stages[i];
          const sortOrder = typeof st.sort_order === 'number' ? st.sort_order : i + 1;
          const prob = typeof st.probability === 'number' ? st.probability : 0;
          const code = st.code || st.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

          if (st.id) {
            // Update existing stage
            await client.query(
              `UPDATE lead_pipeline_stages
               SET name = $1, code = $2, probability = $3, sort_order = $4
               WHERE id = $5 AND lead_pipeline_id = $6`,
              [st.name, code, prob, sortOrder, st.id, pipelineId]
            );
            keptStageIds.push(Number(st.id));
          } else {
            // Insert new stage
            const stageInsert = await client.query(
              `INSERT INTO lead_pipeline_stages (lead_pipeline_id, name, code, probability, sort_order)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [pipelineId, st.name, code, prob, sortOrder]
            );
            keptStageIds.push(stageInsert.rows[0].id);
          }
        }

        // Delete removed stages (if no leads attached, or safely remove)
        if (keptStageIds.length > 0) {
          await client.query(
            `DELETE FROM lead_pipeline_stages
             WHERE lead_pipeline_id = $1 AND id NOT IN (${keptStageIds.join(',')})`,
            [pipelineId]
          );
        }
      }

      await client.query('COMMIT');

      const updated = await this.getById(pipelineId);
      return updated!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    const pipe = await this.getById(id);
    if (!pipe) {
      throw new ApiError(404, 'Pipeline not found');
    }
    if (pipe.is_default) {
      throw new ApiError(400, 'Default pipeline cannot be deleted.');
    }

    // Move any existing leads to default pipeline if exists
    const defaultPipe = await pool.query('SELECT id FROM lead_pipelines WHERE is_default = true LIMIT 1');
    if (defaultPipe.rows[0]) {
      const defaultStage = await pool.query(
        'SELECT id FROM lead_pipeline_stages WHERE lead_pipeline_id = $1 ORDER BY sort_order ASC LIMIT 1',
        [defaultPipe.rows[0].id]
      );
      await pool.query(
        'UPDATE leads SET lead_pipeline_id = $1, lead_pipeline_stage_id = $2 WHERE lead_pipeline_id = $3',
        [defaultPipe.rows[0].id, defaultStage.rows[0]?.id || null, id]
      );
    }

    const result = await pool.query('DELETE FROM lead_pipelines WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
