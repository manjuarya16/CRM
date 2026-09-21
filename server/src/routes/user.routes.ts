import { Router } from 'express';
import { UserService } from '@/services/user.service';
import { userSaveSchema } from '@/schemas/user.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const roleId = req.query.role_id ? Number(req.query.role_id) : undefined;
    let status: boolean | undefined = undefined;
    if (req.query.status === 'true' || req.query.status === '1') status = true;
    else if (req.query.status === 'false' || req.query.status === '0') status = false;

    const users = await UserService.getAll({ search, status, roleId });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await UserService.getById(String(req.params.id));
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = userSaveSchema.parse(req.body);
    const user = await UserService.save(validated);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = userSaveSchema.parse(req.body);
    const user = await UserService.save(validated, String(req.params.id));
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await UserService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'User not found');
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
