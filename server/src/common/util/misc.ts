
/******************************************************************************
                                Functions
******************************************************************************/

/**
 * Get a random number between 1 and 1,000,000,000,000
 */
export function getRandomInt(): number {
  return Math.floor(Math.random() * 1_000_000_000_000);
}


export const toStringSafe = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
};

export const cleanRedis = (val: string | null): string => {
  return (val ?? "").replace(/^"+|"+$/g, "");
}