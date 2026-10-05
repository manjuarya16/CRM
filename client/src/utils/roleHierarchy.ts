import { IRole } from "@/interface";

export interface HierarchicalRole extends IRole {
  __depth: number;
}

/**
 * Organizes a flat list of roles into a hierarchical array ordered by parent-child depth,
 * respecting explicit parent_role_id relations.
 */
export function buildHierarchicalRoleList<T extends { id: number | string; parent_role_id?: number | string | null; name?: string }>(
  roles: T[]
): (T & { __depth: number })[] {
  if (!roles || roles.length === 0) return [];

  const childrenMap = new Map<number | null, T[]>();

  roles.forEach((r) => {
    const rid = Number(r.id);
    const pid =
      r.parent_role_id != null &&
      String(r.parent_role_id).trim() !== "" &&
      Number(r.parent_role_id) > 0
        ? Number(r.parent_role_id)
        : null;

    const key = pid && pid !== rid ? pid : null;

    if (!childrenMap.has(key)) {
      childrenMap.set(key, []);
    }
    childrenMap.get(key)!.push(r);
  });

  const result: (T & { __depth: number })[] = [];
  const visited = new Set<number>();

  const traverse = (parentId: number | null, depth: number) => {
    const children = childrenMap.get(parentId) || [];
    children.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    for (const child of children) {
      const childId = Number(child.id);
      if (visited.has(childId)) continue;
      visited.add(childId);

      result.push({ ...child, __depth: depth });
      traverse(childId, depth + 1);
    }
  };

  // 1. Traverse top-level roots (parentId = null)
  traverse(null, 0);

  // 2. Include any unvisited roles
  roles.forEach((r) => {
    const idNum = Number(r.id);
    if (!visited.has(idNum)) {
      visited.add(idNum);
      result.push({ ...r, __depth: 0 });
    }
  });

  return result;
}
