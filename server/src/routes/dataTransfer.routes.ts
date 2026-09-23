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
      validated.rows,
      req.body.fileName,
      validated.field_separator,
      Boolean(req.body.process_in_queue || req.body.processInQueue)
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
    sample = [
      { title: 'Enterprise Software Deal', description: 'Interested in CRM integration', lead_value: 50000 },
      { title: 'Website Lead', description: 'Requested product demo', lead_value: 15000 }
    ];
  } else if (type === 'persons') {
    sample = [
      { name: 'Wilson Fisk', emails: '[{"label": "work", "value": "contact@wilson.com"}, {"label": "home", "value": "contact.home@wilson.com"}]', contact_numbers: '[{"label": "work", "value": "5454445454"}]', organization_id: 1, job_title: 'Sales Executive', user_id: 1 },
      { name: 'Sasha Calle', emails: '[{"label": "work", "value": "contact@sasha.com"}]', contact_numbers: '[{"label": "work", "value": "15454445454"}]', organization_id: 1, job_title: 'Sales Representatives', user_id: 1 }
    ];
  } else if (type === 'organizations') {
    sample = [
      { name: 'Acme Corporation', address: '123 Tech Boulevard', city: 'San Francisco', country: 'USA' },
      { name: 'Global Logistics Ltd', address: '456 Freight Way', city: 'London', country: 'UK' }
    ];
  } else if (type === 'products') {
    sample = [
      { sku: 'PROD-101', name: 'Enterprise License', description: 'Annual license', quantity: 50, price: 999.00 },
      { sku: 'PROD-102', name: 'Standard Support', description: 'Support package', quantity: 10, price: 299.00 }
    ];
  }
  res.json({ success: true, data: sample });
});

export default router;
