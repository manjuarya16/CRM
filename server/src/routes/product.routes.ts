import { Router } from 'express';
import { ProductService } from '@/services/product.service';
import { productSchema } from '@/schemas/product.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const perPage = req.query.per_page ? Number(req.query.per_page) : 10;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await ProductService.getAll({ page, perPage, search });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await ProductService.getById(String(req.params.id));
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = productSchema.parse(req.body);
    const product = await ProductService.save(validated);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = productSchema.parse(req.body);
    const product = await ProductService.save(validated, String(req.params.id));
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await ProductService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Product not found');
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
