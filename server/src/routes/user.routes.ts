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

const handleSaveUser = async (req: any, res: any, next: any) => {
  try {
    const rawId = (req.params.id && req.params.id !== 'update' && req.params.id !== 'add')
      ? req.params.id
      : (req.body.id ?? req.query.id);

    const validated = userSaveSchema.parse(req.body);
    const targetId = rawId ?? validated.id;

    const user = await UserService.save(validated, targetId ? String(targetId) : undefined);
    const statusCode = targetId ? 200 : 201;
    res.status(statusCode).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

router.post('/add', handleSaveUser);
router.post('/', handleSaveUser);

router.put('/update', handleSaveUser);
router.put('/update/:id', handleSaveUser);
router.put('/:id', handleSaveUser);

router.delete('/delete/:id', async (req, res, next) => {
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
