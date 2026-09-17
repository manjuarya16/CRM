export function isRelationalKey(arg: unknown): arg is number {
  return typeof arg === 'number' && arg >= -1;
}

export const transIsDate = (arg: unknown): boolean => {
  const date = new Date(String(arg));
  return !Number.isNaN(date.getTime());
};
