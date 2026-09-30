import { Router } from 'express';
import { CampaignService } from '@/services/campaign.service';
import { saveCampaignSchema } from '@/schemas/campaign.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const campaigns = await CampaignService.getAll(search);
    res.json({ success: true, data: campaigns });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const campaign = await CampaignService.getById(String(req.params.id));
    if (!campaign) {
      throw new ApiError(404, 'Campaign not found');
    }
    res.json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = saveCampaignSchema.parse(req.body);
    const campaign = await CampaignService.save(validated);
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = saveCampaignSchema.parse(req.body);
    const campaign = await CampaignService.save(validated, String(req.params.id));
    res.json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await CampaignService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Campaign not found');
    }
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/process-due', async (_req, res, next) => {
  try {
    const dispatched = await CampaignService.processDueCampaigns();
    res.json({ success: true, message: `Processed due campaigns: ${dispatched} campaign(s) launched` });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/send', async (req, res, next) => {
  try {
    const result = await CampaignService.sendCampaign(String(req.params.id));
    res.json({
      success: true,
      message: `Campaign sent successfully to ${result.sentCount} of ${result.totalRecipients} recipient(s)`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
