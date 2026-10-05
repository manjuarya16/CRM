import { Router, Request, Response } from 'express';
import { AttributeService } from '@/services/attribute.service';
import { saveAttributeSchema, updateAttributeSchema } from '@/schemas/attribute.schema';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, entity_type, type, quick_add } = req.query;
    const isQuickAdd = quick_add === 'true' ? true : quick_add === 'false' ? false : undefined;
    const attributes = await AttributeService.getAll(
      search as string,
      entity_type as string,
      type as string,
      isQuickAdd
    );
    return res.json({ success: true, data: attributes });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch attributes' });
  }
});

// POST /api/attributes/bulk-delete
router.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide array of attribute IDs to delete' });
    }
    const numericIds = ids.map(Number).filter(Boolean);
    const deletedCount = await AttributeService.deleteBulk(numericIds);
    return res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} attributes`,
      deletedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to bulk delete attributes' });
  }
});

// DELETE /api/attributes/all or POST /api/attributes/delete-all
router.delete('/all', async (req: Request, res: Response) => {
  try {
    const { search, entity_type } = req.query;
    const deletedCount = await AttributeService.deleteAll(entity_type as string, search as string);
    return res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} attributes`,
      deletedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete all attributes' });
  }
});

router.post('/delete-all', async (req: Request, res: Response) => {
  try {
    const { search, entity_type } = req.body;
    const deletedCount = await AttributeService.deleteAll(entity_type, search);
    return res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} attributes`,
      deletedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete all attributes' });
  }
});

// GET /api/attributes/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const attribute = await AttributeService.getById(req.params.id);
    if (!attribute) {
      return res.status(404).json({ success: false, message: 'Attribute not found' });
    }
    return res.json({ success: true, data: attribute });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch attribute' });
  }
});

// POST /api/attributes
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = saveAttributeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const saved = await AttributeService.save(validation.data);
    return res.status(201).json({ success: true, data: saved, message: 'Attribute created successfully' });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: `Attribute with code '${req.body.code}' already exists for entity type '${req.body.entity_type}'.`,
      });
    }
    return res.status(500).json({ success: false, message: error.message || 'Failed to create attribute' });
  }
});

// PUT /api/attributes/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const validation = updateAttributeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const saved = await AttributeService.save(validation.data, req.params.id);
    return res.json({ success: true, data: saved, message: 'Attribute updated successfully' });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: `Attribute with code '${req.body.code}' already exists for entity type '${req.body.entity_type}'.`,
      });
    }
    return res.status(500).json({ success: false, message: error.message || 'Failed to update attribute' });
  }
});

// DELETE /api/attributes/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const success = await AttributeService.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Attribute not found or already deleted' });
    }
    return res.json({ success: true, message: 'Attribute deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete attribute' });
  }
});

export default router;
