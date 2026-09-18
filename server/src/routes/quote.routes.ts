import { Router } from 'express';
import { pool } from '@/config/db';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.max(1, Number(req.query.per_page) || 10);
    const offset = (page - 1) * perPage;

    const countRes = await pool.query('SELECT COUNT(*) as count FROM quotes');
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const { rows } = await pool.query(
      `SELECT q.*, u.name as sales_person_name, p.name as person_name 
       FROM quotes q 
       LEFT JOIN users u ON q.user_id = u.id 
       LEFT JOIN persons p ON q.person_id = p.id 
       ORDER BY q.id DESC 
       LIMIT $1 OFFSET $2`,
      [perPage, offset]
    );

    res.json({ success: true, data: rows, total });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM quotes WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    next(err);
  }
});

export default router;
