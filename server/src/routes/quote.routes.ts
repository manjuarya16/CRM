import { Router } from 'express';
import { QuoteService } from '@/services/quote.service';
import { quoteSchema } from '@/schemas/quote.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const perPage = req.query.per_page ? Number(req.query.per_page) : 10;

    const result = await QuoteService.getAll({ page, perPage });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const quote = await QuoteService.getById(String(req.params.id));
    if (!quote) {
      throw new ApiError(404, 'Quote not found');
    }
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = quoteSchema.parse(req.body);
    const quote = await QuoteService.save(validated);
    res.status(201).json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = quoteSchema.parse(req.body);
    const quote = await QuoteService.save(validated, String(req.params.id));
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await QuoteService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Quote not found');
    }
    res.json({ success: true, message: 'Quote deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
