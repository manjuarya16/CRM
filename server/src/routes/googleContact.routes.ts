import { Router } from 'express';
import { GoogleContactService } from '@/services/googleContact.service';
import { saveGoogleAccountSchema, createGoogleExportBatchSchema } from '@/schemas/googleContact.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/accounts', async (req: any, res, next) => {
  try {
    const userId = req.user?.id || 1;
    const accounts = await GoogleContactService.getAccounts(userId);
    res.json({ success: true, data: accounts });
  } catch (err) {
    next(err);
  }
});

router.post('/accounts', async (req: any, res, next) => {
  try {
    const userId = req.user?.id || 1;
    const validated = saveGoogleAccountSchema.parse(req.body);
    const account = await GoogleContactService.saveAccount(userId, validated);
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

router.delete('/accounts/:id', async (req, res, next) => {
  try {
    const deleted = await GoogleContactService.disconnectAccount(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Google account not found');
    }
    res.json({ success: true, message: 'Google account disconnected successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/sync/:id', async (req: any, res, next) => {
  try {
    const userId = req.user?.id || 1;
    const result = await GoogleContactService.syncGoogleContacts(userId, String(req.params.id));
    res.json({ success: true, data: result, message: 'Synced ' + result.syncedCount + ' contacts from Google' });
  } catch (err) {
    next(err);
  }
});

router.get('/batches', async (req: any, res, next) => {
  try {
    const userId = req.user?.id || 1;
    const batches = await GoogleContactService.getBatches(userId);
    res.json({ success: true, data: batches });
  } catch (err) {
    next(err);
  }
});

router.post('/export', async (req: any, res, next) => {
  try {
    const userId = req.user?.id || 1;
    const validated = createGoogleExportBatchSchema.parse(req.body || {});
    const batch = await GoogleContactService.createBatch(userId, validated.person_ids);
    res.status(201).json({ success: true, data: batch, message: 'Created export batch for ' + batch.total_contacts + ' contacts' });
  } catch (err) {
    next(err);
  }
});

export default router;
