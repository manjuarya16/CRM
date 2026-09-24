export interface IGroup {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  user_count?: number;
  users?: Array<{ id: number; name: string; email: string }>;
}

export interface IPipelineStage {
  id?: number;
  code?: string | null;
  name: string;
  probability: number;
  sort_order: number;
  lead_pipeline_id?: number;
}

export interface IPipeline {
  id: number;
  name: string;
  is_default: boolean;
  rotten_days: number;
  created_at?: string;
  updated_at?: string;
  stages?: IPipelineStage[];
  leads_count?: number;
}

export interface ISource {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface IType {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ITag {
  id: number;
  name: string;
  color: string;
  created_at?: string;
}
