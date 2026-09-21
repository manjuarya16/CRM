import { Router, Request, Response, NextFunction } from 'express';
import { configService } from '@/services/configService';

const router = Router();

// GET /api/configuration - Get all configs
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = await configService.getAllConfigs();
    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/configuration - Save configuration settings
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Invalid settings payload',
      });
      return;
    }
    await configService.saveConfigs(settings);
    const updated = await configService.getAllConfigs();
    res.json({
      success: true,
      message: 'Configuration saved successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
