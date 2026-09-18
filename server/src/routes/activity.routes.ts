import { Router } from 'express';
import { pool } from '@/config/db';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.max(1, Number(req.query.per_page) || 10);
    const offset = (page - 1) * perPage;

    const countRes = await pool.query('SELECT COUNT(*) as count FROM activities');
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const { rows } = await pool.query(
      'SELECT * FROM activities ORDER BY id DESC LIMIT $1 OFFSET $2',
      [perPage, offset]
    );

    res.json({ success: true, data: rows, total });
  } catch (err) {
    next(err);
  }
});

export default router;
