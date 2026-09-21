import { Router } from 'express';
import { PersonService } from '@/services/person.service';
import { personSchema } from '@/schemas/person.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const perPage = req.query.per_page ? Number(req.query.per_page) : 10;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await PersonService.getAll({ page, perPage, search });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const person = await PersonService.getById(String(req.params.id));
    if (!person) {
      throw new ApiError(404, 'Person not found');
    }
    res.json({ success: true, data: person });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = personSchema.parse(req.body);
    const person = await PersonService.save(validated);
    res.status(201).json({ success: true, data: person });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = personSchema.parse(req.body);
    const person = await PersonService.save(validated, String(req.params.id));
    res.json({ success: true, data: person });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await PersonService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Person not found');
    }
    res.json({ success: true, message: 'Person deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
