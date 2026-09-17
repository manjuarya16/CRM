const DEFAULT_PAGE_SIZE = 10;

const parseInteger = (value: unknown): number | null => {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(firstValue);
  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
};

const configuredPageSize = parseInteger(process.env.PAGINATION_PAGE_SIZE);

export const LIST_PAGE_SIZE =
  configuredPageSize && configuredPageSize > 0
    ? configuredPageSize
    : DEFAULT_PAGE_SIZE;

export const getPaginationOffset = (
  query: Record<string, unknown>,
  pageSize = LIST_PAGE_SIZE,
): number => {
  const offset = parseInteger(query.offset);
  if (offset !== null && offset >= 0) return offset;

  const page = parseInteger(query.page);
  if (page !== null && page > 0) return (page - 1) * pageSize;

  return 0;
};
