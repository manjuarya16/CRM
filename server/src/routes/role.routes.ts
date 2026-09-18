import { Router } from 'express';
import { RoleService } from '@/services/role.service';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const roles = await RoleService.getAll(search);
    res.json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const role = await RoleService.getById(String(req.params.id));
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }
    res.json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const role = await RoleService.save(req.body);
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const role = await RoleService.save(req.body, String(req.params.id));
    res.json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await RoleService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Role not found');
    }
    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
