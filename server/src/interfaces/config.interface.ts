export interface CoreConfigRow {
  id: number;
  code: string;
  value: string | null;
  channel: string;
  locale: string;
  created_at: Date;
  updated_at: Date;
}

export type CoreConfigMap = Record<string, string | boolean | number | null>;
