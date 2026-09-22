import { Router, Request, Response, NextFunction } from 'express';
import { configService } from '@/services/configService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for config image uploads (logo, favicon)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "config");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/x-icon", "image/vnd.microsoft.icon"];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(png|jpg|jpeg|webp|bmp|ico)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (PNG, JPG, JPEG, WebP, BMP, ICO)"));
    }
  },
});

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

// POST /api/configuration/upload-image - Upload logo or favicon file
router.post('/upload-image', upload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const relativeUrl = `/uploads/config/${req.file.filename}`;
    res.json({
      success: true,
      data: { url: relativeUrl },
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
