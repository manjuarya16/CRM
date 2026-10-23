import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextData {
  tenantId?: number;
  tenantSlug?: string;
  isSuperAdmin?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantContextData>();

export function getTenantContext(): TenantContextData | undefined {
  return tenantStorage.getStore();
}

export function runWithTenantContext<T>(data: TenantContextData, fn: () => T): T {
  return tenantStorage.run(data, fn);
}
