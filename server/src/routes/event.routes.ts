import { Router } from 'express';
import { EventService } from '@/services/event.service';
import { saveEventSchema } from '@/schemas/event.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const events = await EventService.getAll(search);
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await EventService.getById(String(req.params.id));
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = saveEventSchema.parse(req.body);
    const event = await EventService.save(validated);
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = saveEventSchema.parse(req.body);
    const event = await EventService.save(validated, String(req.params.id));
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await EventService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Event not found');
    }
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
