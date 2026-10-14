import { Router } from 'express';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@/schemas/auth.schema';
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

router.post('/forgot-password', async (req, res, next) => {
  try {
    const validatedInput = forgotPasswordSchema.parse(req.body);
    await AuthService.forgotPassword(validatedInput.email);
    res.json({ success: true, message: 'Email verified. You may proceed to reset your password.' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const validatedInput = resetPasswordSchema.parse(req.body);
    await AuthService.resetPassword(validatedInput);
    res.json({ success: true, message: 'Password reset successfully' });
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
