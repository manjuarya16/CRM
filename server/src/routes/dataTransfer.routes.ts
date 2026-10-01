/* eslint-disable @typescript-eslint/ban-ts-comment */
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

router.delete('/imports/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      throw new ApiError(400, 'Invalid import ID');
    }
    const deleted = await DataTransferService.deleteImport(id);
    res.json({ success: true, deleted });
  } catch (err) {
    next(err);
  }
});

router.post('/validate', async (req, res, next) => {
  try {
    const validated = importRequestSchema.parse(req.body);
    const result = await DataTransferService.validateImport(
      validated.type,
      validated.action,
      validated.validation_strategy,
      validated.allowed_errors,
      validated.rows
    );
    res.json({ success: true, data: result });
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

router.get('/sample/:type', async (req, res, next) => {
  try {
    const type = req.params.type;
    const allowed = ['leads', 'persons', 'organizations', 'products'];
    if (!allowed.includes(type.toLowerCase())) {
      throw new ApiError(400, 'Invalid sample entity type');
    }

    const sample = await DataTransferService.getSample(type);

    // If client requested XLSX file download:
    if (req.query.format === 'xlsx') {
      // @ts-ignore
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(sample.sampleRows, { header: sample.headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${type}_Sample`);
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="sample_${type.toLowerCase()}_import.xlsx"`
      );
      return res.send(buffer);
    }

    // If client requested CSV string directly:
    if (req.query.format === 'csv') {
      // @ts-ignore
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(sample.sampleRows, { header: sample.headers });
      const csvContent = XLSX.utils.sheet_to_csv(ws);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="sample_${type.toLowerCase()}_import.csv"`
      );
      return res.send('\uFEFF' + csvContent);
    }

    res.json({
      success: true,
      data: sample.sampleRows,
      headers: sample.headers,
      customAttributes: sample.customAttributes,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
