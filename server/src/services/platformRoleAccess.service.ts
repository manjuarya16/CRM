import { pool } from '@/config/db';
import { ALL_CRM_PERMISSION_KEYS } from '@/constants/permissions';

const ALL_PLATFORM_PERMISSION_KEYS = ALL_CRM_PERMISSION_KEYS.filter((permission) =>
  permission.startsWith('platform.')
);

type SuperAdminAccessRecord = {
  id: number | string;
  name: string;
  email: string;
  status: string;
  platform_role_id: number | string | null;
  is_platform_owner: boolean;
  role_name: string | null;
};

const safeId = (value: number | string | null): number | null => {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('The database returned an invalid platform administrator or role ID.');
  }
  return parsed;
};

export async function resolvePlatformRolePermissions(platformRoleId: number | string | null): Promise<string[]> {
  if (platformRoleId === null) return [];

  const { rows } = await pool.query<{ permissions: string[] }>(
    'SELECT public.resolve_platform_role_permissions($1::bigint, $2::text[]) AS permissions',
    [platformRoleId, ALL_PLATFORM_PERMISSION_KEYS]
  );
  return rows[0]?.permissions || [];
}

export async function getPlatformRoleDescendantIds(platformRoleId: number | string | null): Promise<string[]> {
  if (platformRoleId === null) return [];
  const { rows } = await pool.query<{ id: string | number }>(
    'SELECT id FROM public.get_platform_role_descendant_ids($1::bigint)',
    [platformRoleId]
  );
  return rows.map(({ id }) => String(id));
}

export async function getAllPlatformRoleIds(): Promise<string[]> {
  const { rows } = await pool.query<{ id: string | number }>(
    'SELECT id FROM public.get_all_platform_role_ids()'
  );
  return rows.map(({ id }) => String(id));
}

export async function loadSuperAdminAccess(adminId: number | string): Promise<{
  id: number;
  name: string;
  email: string;
  status: string;
  platform_role_id: number | null;
  is_platform_owner: boolean;
  role_name: string | null;
  permissions: string[];
} | null> {
  const { rows } = await pool.query<SuperAdminAccessRecord>(
    'SELECT * FROM public.load_super_admin_access($1::bigint)',
    [adminId]
  );
  const admin = rows[0];
  if (!admin) return null;
  const permissions = admin.is_platform_owner
    ? ALL_PLATFORM_PERMISSION_KEYS
    : await resolvePlatformRolePermissions(admin.platform_role_id);
  const id = safeId(admin.id);
  if (id === null) throw new Error('The database returned an invalid platform administrator ID.');
  return {
    ...admin,
    id,
    platform_role_id: safeId(admin.platform_role_id),
    permissions,
  };
}
