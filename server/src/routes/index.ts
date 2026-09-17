import { Router } from 'express';
import authRoutes from '@/routes/auth.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);

export default router;
