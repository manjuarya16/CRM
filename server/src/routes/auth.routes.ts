import { Router } from 'express';
import { registerSchema, loginSchema } from '@/schemas/auth.schema';
import { AuthService } from '@/services/auth.service';
import { requireAuth } from '@/middleware/auth';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const validatedInput = registerSchema.parse(req.body);
    const result = await AuthService.register(validatedInput);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const validatedInput = loginSchema.parse(req.body);
    const result = await AuthService.login(validatedInput);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default router;
