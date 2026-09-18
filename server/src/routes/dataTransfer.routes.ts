import { Router } from 'express';
import { DataTransferService } from '@/services/dataTransfer.service';
import { importRequestSchema } from '@/schemas/dataTransfer.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/imports', async (_req, res, next) => {
  try {
    const imports = await DataTransferService.getAllImports();
    res.json({ success: true, data: imports });
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const validated = importRequestSchema.parse(req.body);
    const result = await DataTransferService.processImport(
      validated.type,
      validated.action,
      validated.validation_strategy,
      validated.allowed_errors,
      validated.rows
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/export/:type', async (req, res, next) => {
  try {
    const type = req.params.type;
    const allowed = ['leads', 'persons', 'organizations', 'products'];
    if (!allowed.includes(type)) {
      throw new ApiError(400, 'Invalid export entity type');
    }
    const data = await DataTransferService.exportData(type);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/sample/:type', (req, res) => {
  const type = req.params.type;
  let sample: any[] = [];
  if (type === 'leads') {
    sample = [{ title: 'Enterprise CRM Migration Lead', description: 'Interested in enterprise cloud plan', lead_value: 15000 }];
  } else if (type === 'persons') {
    sample = [{ name: 'John Doe', email: 'john@example.com', phone: '+1-555-0101', job_title: 'Sales VP' }];
  } else if (type === 'organizations') {
    sample = [{ name: 'Acme Global Corp', address: '123 Market St', city: 'San Francisco', country: 'USA' }];
  } else if (type === 'products') {
    sample = [{ sku: 'PROD-001', name: 'Standard Software License', description: 'Annual seat license', quantity: 50, price: 99.99 }];
  }
  res.json({ success: true, data: sample });
});

export default router;
