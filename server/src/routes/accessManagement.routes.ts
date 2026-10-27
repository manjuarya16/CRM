import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '@/middleware/auth';
import { RoleService } from '@/services/role.service';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();
router.use(requireAuth);

const STANDARD_MODULES = [
  { module_key: 'dashboard', module_name: 'Dashboard', view: 'dashboard.view', add: 'dashboard.create', update: 'dashboard.edit', delete: 'dashboard.delete' },
  { module_key: 'organization', module_name: 'Organization', view: 'organizations.view', add: 'organizations.create', update: 'organizations.edit', delete: 'organizations.delete' },
  { module_key: 'users', module_name: 'Users', view: 'settings.users.view', add: 'settings.users.create', update: 'settings.users.edit', delete: 'settings.users.delete' },
  { module_key: 'roles', module_name: 'Roles', view: 'settings.roles.view', add: 'settings.roles.create', update: 'settings.roles.edit', delete: 'settings.roles.delete' },
  { module_key: 'user_access', module_name: 'User Access Manage', view: 'settings.access_management.view', add: 'settings.access_management.create', update: 'settings.access_management.edit', delete: 'settings.access_management.delete' },
  { module_key: 'groups', module_name: 'Groups', view: 'settings.groups.view', add: 'settings.groups.create', update: 'settings.groups.edit', delete: 'settings.groups.delete' },
  { module_key: 'leads', module_name: 'Leads', view: 'leads.view', add: 'leads.create', update: 'leads.edit', delete: 'leads.delete' },
  { module_key: 'persons', module_name: 'Persons', view: 'persons.view', add: 'persons.create', update: 'persons.edit', delete: 'persons.delete' },
  { module_key: 'products', module_name: 'Products', view: 'products.view', add: 'products.create', update: 'products.edit', delete: 'products.delete' },
  { module_key: 'quotes', module_name: 'Quotes', view: 'quotes.view', add: 'quotes.create', update: 'quotes.edit', delete: 'quotes.delete' },
  { module_key: 'activities', module_name: 'Activities', view: 'activities.view', add: 'activities.create', update: 'activities.edit', delete: 'activities.delete' },
  { module_key: 'mail', module_name: 'Mail', view: 'mail.inbox', add: 'mail.sent', update: 'mail.setting', delete: 'mail.trash' },
  { module_key: 'pipelines', module_name: 'Pipelines', view: 'settings.pipelines.view', add: 'settings.pipelines.create', update: 'settings.pipelines.edit', delete: 'settings.pipelines.delete' },
  { module_key: 'sources', module_name: 'Sources', view: 'settings.sources.view', add: 'settings.sources.create', update: 'settings.sources.edit', delete: 'settings.sources.delete' },
  { module_key: 'types', module_name: 'Types', view: 'settings.types.view', add: 'settings.types.create', update: 'settings.types.edit', delete: 'settings.types.delete' },
  { module_key: 'warehouses', module_name: 'Warehouses', view: 'settings.warehouses.view', add: 'settings.warehouses.create', update: 'settings.warehouses.edit', delete: 'settings.warehouses.delete' },
  { module_key: 'attributes', module_name: 'Attributes', view: 'settings.attributes.view', add: 'settings.attributes.create', update: 'settings.attributes.edit', delete: 'settings.attributes.delete' },
  { module_key: 'reports', module_name: 'Reports', view: 'dashboard.view', add: 'dashboard.view', update: 'dashboard.view', delete: 'dashboard.view' },
];

function buildModuleAccessForRole(role: any) {
  const isAll = role.permission_type === 'all' || !role.permissions || role.name?.toLowerCase().includes('admin');
  const perms: string[] = Array.isArray(role.permissions) ? role.permissions : [];

  return STANDARD_MODULES.map((mod, idx) => ({
    id: idx + 1,
    role_id: role.id,
    module_key: mod.module_key,
    module_name: mod.module_name,
    can_view: isAll || perms.includes(mod.view),
    can_add: isAll || perms.includes(mod.add),
    can_update: isAll || perms.includes(mod.update),
    can_delete: isAll || perms.includes(mod.delete),
    status: true,
  }));
}

// GET /api/access-management/role/:roleId
router.get('/role/:roleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.roleId);
    if (!roleId) throw new ApiError(400, 'Invalid role ID');

    const role = await RoleService.getById(roleId);
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    const accessList = buildModuleAccessForRole(role);
    res.json({ success: true, data: accessList });
  } catch (err) {
    next(err);
  }
});

// PUT /api/access-management/role
router.put('/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role_id, access } = req.body;
    if (!role_id) throw new ApiError(400, 'Role ID is required');

    const role = await RoleService.getById(Number(role_id));
    if (!role) throw new ApiError(404, 'Role not found');

    const permKeys: string[] = [];
    if (Array.isArray(access)) {
      for (const item of access) {
        const mod = STANDARD_MODULES.find((m) => m.module_key === item.module_key);
        if (mod) {
          if (item.can_view) permKeys.push(mod.view);
          if (item.can_add) permKeys.push(mod.add);
          if (item.can_update) permKeys.push(mod.update);
          if (item.can_delete) permKeys.push(mod.delete);
        }
      }
    }

    await RoleService.save(
      {
        name: role.name,
        description: role.description,
        permission_type: 'custom',
        permissions: permKeys,
        parent_role_id: role.parent_role_id,
      },
      role.id
    );

    res.json({ success: true, data: access });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/access-management/role/:roleId/:moduleKey
router.delete('/role/:roleId/:moduleKey', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.params.roleId);
    const moduleKey = req.params.moduleKey;
    const role = await RoleService.getById(roleId);
    if (!role) throw new ApiError(404, 'Role not found');

    const mod = STANDARD_MODULES.find((m) => m.module_key === moduleKey);
    if (mod && Array.isArray(role.permissions)) {
      const keysToRemove = [mod.view, mod.add, mod.update, mod.delete];
      const updatedPerms = role.permissions.filter((p: string) => !keysToRemove.includes(p));
      await RoleService.save(
        {
          name: role.name,
          description: role.description,
          permission_type: 'custom',
          permissions: updatedPerms,
          parent_role_id: role.parent_role_id,
        },
        role.id
      );
    }

    res.json({ success: true, message: 'Role access updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
