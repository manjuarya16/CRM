import { Router } from 'express';
import { WebFormService } from '@/services/webform.service';
import { saveWebFormSchema } from '@/schemas/webform.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const webForms = await WebFormService.getAll(search);
    res.json({ success: true, data: webForms });
  } catch (err) {
    next(err);
  }
});

router.get('/submissions', async (req, res, next) => {
  try {
    const submissions = await WebFormService.getSubmissions();
    res.json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
});

router.get('/form-id/:form_id', async (req, res, next) => {
  try {
    const webForm = await WebFormService.getByFormId(req.params.form_id);
    if (!webForm) {
      throw new ApiError(404, 'Web form not found');
    }
    res.json({ success: true, data: webForm });
  } catch (err) {
    next(err);
  }
});

router.get('/public/:form_id', async (req, res, next) => {
  try {
    const webForm = await WebFormService.getByFormId(req.params.form_id);
    if (!webForm) {
      throw new ApiError(404, 'Web form not found');
    }
    res.json({ success: true, data: webForm });
  } catch (err) {
    next(err);
  }
});

router.post('/submit/:form_id', async (req, res, next) => {
  try {
    const result = await WebFormService.handleSubmission(req.params.form_id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/submissions', async (req, res, next) => {
  try {
    const submissions = await WebFormService.getSubmissions(String(req.params.id));
    res.json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const webForm = await WebFormService.getById(String(req.params.id));
    if (!webForm) {
      throw new ApiError(404, 'Web form not found');
    }
    res.json({ success: true, data: webForm });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = saveWebFormSchema.parse(req.body);
    const webForm = await WebFormService.save(validated);
    res.status(201).json({ success: true, data: webForm });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = saveWebFormSchema.parse(req.body);
    const webForm = await WebFormService.save(validated, String(req.params.id));
    res.json({ success: true, data: webForm });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await WebFormService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Web form not found');
    }
    res.json({ success: true, message: 'Web form deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
