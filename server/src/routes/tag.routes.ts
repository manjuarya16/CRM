import { Router, Request, Response } from 'express';
import { TagService } from '@/services/tag.service';

const router = Router();

// GET /api/tags
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const tags = await TagService.getAll(search as string);
    return res.json({ success: true, data: tags });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch tags' });
  }
});

// GET /api/tags/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tag = await TagService.getById(String(req.params.id));
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }
    return res.json({ success: true, data: tag });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch tag' });
  }
});

// POST /api/tags
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color, user_id } = req.body;
    const userId = (req as any).user?.id || user_id;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tag name is required' });
    }
    const saved = await TagService.save({ name: name.trim(), color: color || '#0088cc' }, undefined, userId);
    return res.status(201).json({ success: true, data: saved, message: 'Tag created successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create tag' });
  }
});

// PUT /api/tags/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, color, user_id } = req.body;
    const userId = (req as any).user?.id || user_id;
    const saved = await TagService.save(
      { name: name ? name.trim() : '', color: color || '#0088cc' },
      String(req.params.id),
      userId
    );
    return res.json({ success: true, data: saved, message: 'Tag updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update tag' });
  }
});

// DELETE /api/tags/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const success = await TagService.delete(String(req.params.id));
    if (!success) {
      return res.status(404).json({ success: false, message: 'Tag not found or already deleted' });
    }
    return res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete tag' });
  }
});

// GET /api/tags/entity/:type/:id
router.get('/entity/:type/:id', async (req: Request, res: Response) => {
  try {
    const tags = await TagService.getEntityTags(String(req.params.type), String(req.params.id));
    return res.json({ success: true, data: tags });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch entity tags' });
  }
});

// POST /api/tags/entity
router.post('/entity', async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id, tag_ids } = req.body;
    if (!entity_type || !entity_id) {
      return res.status(400).json({ success: false, message: 'entity_type and entity_id are required' });
    }
    const tags = await TagService.saveEntityTags(entity_type, entity_id, tag_ids || []);
    return res.json({ success: true, data: tags, message: 'Entity tags saved successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to save entity tags' });
  }
});

export default router;
