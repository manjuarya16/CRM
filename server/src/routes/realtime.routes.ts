import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { SseService } from '@/services/sse.service';

const router = Router();

// GET /api/realtime/stream
router.get('/stream', requireAuth, (req, res) => {
  SseService.handleConnection(req, res);
});

export default router;
