import { Router } from 'express';
import { PersonService } from '@/services/person.service';
import { personSchema } from '@/schemas/person.schema';
import { ApiError } from '@/middleware/errorHandler';
import { processWorkflowsForEvent } from '@/utils/workflowEngine';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limitParam = req.query.per_page || req.query.limit;
    const perPage = limitParam ? Number(limitParam) : 200;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await PersonService.getAll({ page, perPage, search });
    res.json({ success: true, data: result.rows, rows: result.rows, total: result.total });
  } catch (err) {
    next(err);
  }
});

router.get('/check-duplicate', async (req, res, next) => {
  try {
    const email = req.query.email ? String(req.query.email).trim() : undefined;
    const phone = req.query.phone ? String(req.query.phone).trim() : undefined;
    const excludeId = req.query.exclude_id ? Number(req.query.exclude_id) : undefined;

    const result = await PersonService.checkDuplicate({ email, phone, excludeId });
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
    if (person?.id) {
      processWorkflowsForEvent('persons', 'created', person.id, (req as any).user).catch(() => {});
    }
    res.status(201).json({ success: true, data: person });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = personSchema.parse(req.body);
    const person = await PersonService.save(validated, String(req.params.id));
    if (person?.id) {
      processWorkflowsForEvent('persons', 'updated', person.id, (req as any).user).catch(() => {});
    }
    res.json({ success: true, data: person });
  } catch (err) {
    next(err);
  }
});

router.delete('/all', async (req, res, next) => {
  try {
    const count = await PersonService.deleteAll();
    res.json({ success: true, message: `${count} persons deleted successfully` });
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
