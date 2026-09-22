import { Router, Request, Response, NextFunction } from 'express';
import { mailService } from '@/services/mailService';
import { createMailSchema, updateMailSchema, massUpdateMailSchema, massDestroyMailSchema } from '@/schemas/mail.schema';
import { requireAuth } from '@/middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer storage for mail attachments
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'mail');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `mail-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit per file
});

// ── 1. Static Routes (Must come before /:id) ────────────────────────────────

// GET /api/mail/counts - Get unread & total counters per folder
router.get('/counts', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const counts = await mailService.getFolderCounts();
    res.json({ success: true, data: counts });
  } catch (error) {
    next(error);
  }
});

// POST /api/mail/mass-update - Mass update folders / read status
router.post('/mass-update', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = massUpdateMailSchema.parse(req.body);
    const result = await mailService.massUpdate(parsed);
    res.json({ success: true, message: 'Emails updated successfully', data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/mail/mass-destroy - Mass move to trash or delete
router.post('/mass-destroy', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = massDestroyMailSchema.parse(req.body);
    const result = await mailService.massDestroy(parsed);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
});

// GET /api/mail/attachments/:id/download - Download attachment
router.get('/attachments/:id/download', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachment = await mailService.getAttachment(Number(req.params.id));
    if (!attachment) {
      res.status(404).json({ success: false, message: 'Attachment not found' });
      return;
    }
    const filePath = path.join(process.cwd(), attachment.path.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'File not found on server' });
      return;
    }
    res.download(filePath, attachment.name);
  } catch (error) {
    next(error);
  }
});

// ── 2. List & Create Routes ──────────────────────────────────────────────────

// GET /api/mail - List emails in folder
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folder = (req.query.folder as string) || 'inbox';
    const search = (req.query.search as string) || '';
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 25;

    const result = await mailService.getEmails({ folder, search, page, limit });
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/mail - Compose email or save draft
router.post('/', requireAuth, upload.array('attachments', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let payload = { ...req.body };
    if (typeof payload.reply_to === 'string' && payload.reply_to.startsWith('[')) {
      try { payload.reply_to = JSON.parse(payload.reply_to); } catch (e) {}
    }
    if (typeof payload.cc === 'string' && payload.cc.startsWith('[')) {
      try { payload.cc = JSON.parse(payload.cc); } catch (e) {}
    }
    if (typeof payload.bcc === 'string' && payload.bcc.startsWith('[')) {
      try { payload.bcc = JSON.parse(payload.bcc); } catch (e) {}
    }

    const parsed = createMailSchema.parse(payload);
    const files = (req.files as Express.Multer.File[]) || [];
    const created = await mailService.createEmail(parsed, files, (req as any).user);

    res.status(201).json({
      success: true,
      message: parsed.is_draft ? 'Draft saved successfully' : 'Email sent successfully',
      data: created,
    });
  } catch (error) {
    next(error);
  }
});

// ── 3. Dynamic /:id Routes ───────────────────────────────────────────────────

// GET /api/mail/:id - View email thread
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const email = await mailService.getEmailById(id);
    if (!email) {
      res.status(404).json({ success: false, message: 'Email not found' });
      return;
    }
    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
});

// PUT /api/mail/:id - Update draft
router.put('/:id', requireAuth, upload.array('attachments', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    let payload = { ...req.body };
    if (typeof payload.reply_to === 'string' && payload.reply_to.startsWith('[')) {
      try { payload.reply_to = JSON.parse(payload.reply_to); } catch (e) {}
    }

    const parsed = updateMailSchema.parse(payload);
    const files = (req.files as Express.Multer.File[]) || [];
    const updated = await mailService.updateEmail(id, parsed, files, (req as any).user);

    res.json({
      success: true,
      message: parsed.is_draft ? 'Draft updated' : 'Email sent successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/mail/:id/read - Toggle read status
router.patch('/:id/read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const isRead = req.body.is_read !== undefined ? Boolean(req.body.is_read) : true;
    const result = await mailService.toggleReadStatus(id, isRead);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// PUT /api/mail/:id/link - Update linked lead or person
router.put('/:id/link', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { person_id, lead_id } = req.body;
    if (person_id !== undefined) {
      await mailService.linkPerson(id, person_id ? Number(person_id) : null);
    }
    if (lead_id !== undefined) {
      await mailService.linkLead(id, lead_id ? Number(lead_id) : null);
    }
    const updated = await mailService.getEmailById(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/mail/:id - Move to trash or permanently delete
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const type = (req.query.type as 'trash' | 'delete') || 'trash';
    const result = await mailService.deleteEmail(id, type);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
});

export default router;
