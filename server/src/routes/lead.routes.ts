import { Router } from 'express';
import { pool } from '@/config/db';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.max(1, Number(req.query.per_page) || 10);
    const offset = (page - 1) * perPage;

    const countRes = await pool.query('SELECT COUNT(*) as count FROM leads');
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const { rows } = await pool.query(
      `SELECT l.*, p.name as person_name, ls.name as source_name, lst.name as stage_name
       FROM leads l
       LEFT JOIN persons p ON l.person_id = p.id
       LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
       LEFT JOIN lead_stages lst ON l.lead_stage_id = lst.id
       ORDER BY l.id DESC
       LIMIT $1 OFFSET $2`,
      [perPage, offset]
    );

    res.json({ success: true, data: rows, total });
  } catch (err) {
    next(err);
  }
});

export default router;
