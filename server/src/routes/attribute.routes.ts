import { Router, Request, Response } from 'express';
import { AttributeService } from '@/services/attribute.service';
import { saveAttributeSchema, updateAttributeSchema } from '@/schemas/attribute.schema';

const router = Router();

// GET /api/attributes (with search, entity_type, and type filter queries)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, entity_type, type } = req.query;
    const attributes = await AttributeService.getAll(
      search as string,
      entity_type as string,
      type as string
    );
    return res.json({ success: true, data: attributes });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch attributes' });
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
