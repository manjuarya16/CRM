import { Router } from 'express';
import { WarehouseService } from '@/services/warehouse.service';
import { warehouseSchema } from '@/schemas/warehouse.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const warehouses = await WarehouseService.getAll(search);
    res.json({ success: true, data: warehouses });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const warehouse = await WarehouseService.getById(String(req.params.id));
    if (!warehouse) {
      throw new ApiError(404, 'Warehouse not found');
    }
    res.json({ success: true, data: warehouse });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = warehouseSchema.parse(req.body);
    const warehouse = await WarehouseService.save(validated);
    res.status(201).json({ success: true, data: warehouse });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = warehouseSchema.parse(req.body);
    const warehouse = await WarehouseService.save(validated, String(req.params.id));
    res.json({ success: true, data: warehouse });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await WarehouseService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Warehouse not found');
    }
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
