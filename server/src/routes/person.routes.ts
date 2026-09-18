import { Router } from 'express';
import { pool } from '@/config/db';

const router = Router();

// GET /api/persons - list with pagination and search
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.max(1, Number(req.query.per_page) || 10);
    const search = req.query.search ? String(req.query.search).trim() : '';
    const offset = (page - 1) * perPage;

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereSql += ` AND (p.name ILIKE $${params.length} OR p.job_title ILIKE $${params.length} OR o.name ILIKE $${params.length} OR p.emails::text ILIKE $${params.length})`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) as count 
       FROM persons p 
       LEFT JOIN organizations o ON p.organization_id = o.id 
       ${whereSql}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    params.push(perPage, offset);
    const { rows } = await pool.query(
      `SELECT p.*, o.name as organization_name, u.name as sales_owner_name
       FROM persons p
       LEFT JOIN organizations o ON p.organization_id = o.id
       LEFT JOIN users u ON p.user_id = u.id
       ${whereSql}
       ORDER BY p.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: rows, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/persons/:id - single person details
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, o.name as organization_name, u.name as sales_owner_name
       FROM persons p
       LEFT JOIN organizations o ON p.organization_id = o.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }

    // Also get activities and leads for this person
    const activitiesRes = await pool.query(
      `SELECT * FROM activities WHERE id IN (
         SELECT activity_id FROM activity_participants WHERE person_id = $1
       ) ORDER BY id DESC`,
      [req.params.id]
    ).catch(() => ({ rows: [] }));

    const leadsRes = await pool.query(
      `SELECT * FROM leads WHERE person_id = $1 ORDER BY id DESC`,
      [req.params.id]
    ).catch(() => ({ rows: [] }));

    res.json({
      success: true,
      data: {
        ...rows[0],
        activities: activitiesRes.rows,
        leads: leadsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/persons - create person
router.post('/', async (req, res, next) => {
  try {
    const { name, emails, contact_numbers, organization_id, job_title, user_id } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const emailsJson = typeof emails === 'object' ? JSON.stringify(emails) : (emails || '[]');
    const contactsJson = typeof contact_numbers === 'object' ? JSON.stringify(contact_numbers) : (contact_numbers || '[]');

    const { rows } = await pool.query(
      `INSERT INTO persons (name, emails, contact_numbers, organization_id, job_title, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        name,
        emailsJson,
        contactsJson,
        organization_id ? Number(organization_id) : null,
        job_title || null,
        user_id ? Number(user_id) : null,
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/persons/:id - update person
router.put('/:id', async (req, res, next) => {
  try {
    const { name, emails, contact_numbers, organization_id, job_title, user_id } = req.body;

    const existingRes = await pool.query('SELECT * FROM persons WHERE id = $1', [req.params.id]);
    if (!existingRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }

    const existing = existingRes.rows[0];
    const newName = name !== undefined ? name : existing.name;
    const emailsJson = emails !== undefined ? (typeof emails === 'object' ? JSON.stringify(emails) : emails) : existing.emails;
    const contactsJson = contact_numbers !== undefined ? (typeof contact_numbers === 'object' ? JSON.stringify(contact_numbers) : contact_numbers) : existing.contact_numbers;
    const orgId = organization_id !== undefined ? (organization_id ? Number(organization_id) : null) : existing.organization_id;
    const job = job_title !== undefined ? job_title : existing.job_title;
    const uId = user_id !== undefined ? (user_id ? Number(user_id) : null) : existing.user_id;

    const { rows } = await pool.query(
      `UPDATE persons
       SET name = $1, emails = $2, contact_numbers = $3, organization_id = $4, job_title = $5, user_id = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [newName, emailsJson, contactsJson, orgId, job, uId, req.params.id]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/persons/:id - delete person
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM persons WHERE id = $1', [req.params.id]);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }
    res.json({ success: true, message: 'Person deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
