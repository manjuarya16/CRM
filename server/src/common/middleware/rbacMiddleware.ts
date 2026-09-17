import { Request, Response, NextFunction } from 'express';
import pool from '../../db/db';
import HttpStatusCodes from '../constants/HttpStatusCodes';

/**
 * Middleware to check if the authenticated user has specific CRUD permissions
 * for a given module.
 *
 * @param moduleKey - The key of the module in role_module_access
 * @param requiredAction - The action required: 'can_view', 'can_add', 'can_update', or 'can_delete'
 */
export const checkPermission = (moduleKey: string, requiredAction: 'can_view' | 'can_add' | 'can_update' | 'can_delete') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(HttpStatusCodes.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });
      }

      const roleId = Number(user.role_id);
      if (!roleId) {
        return res.status(HttpStatusCodes.FORBIDDEN).json({ success: false, message: 'No role assigned to user' });
      }

      // If user is Admin, allow all (role id 1 is usually Admin, but let's check name just in case)
      const roleResult = await pool.query('SELECT name FROM public.roles WHERE id = $1', [roleId]);
      const roleName = String(roleResult.rows[0]?.name || '').toLowerCase();
      if (roleName.includes('admin')) {
        return next();
      }

      // Check specific module permission
      const accessResult = await pool.query(
        `SELECT ${requiredAction} FROM public.role_module_access WHERE role_id = $1 AND module_key = $2 AND status = true AND deleted_at IS NULL`,
        [roleId, moduleKey]
      );

      const hasPermission = accessResult.rows.length > 0 && accessResult.rows[0][requiredAction] === true;

      if (!hasPermission) {
        return res.status(HttpStatusCodes.FORBIDDEN).json({
          success: false,
          message: 'You do not have permission to perform this action',
        });
      }

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error during permission check',
      });
    }
  };
};

