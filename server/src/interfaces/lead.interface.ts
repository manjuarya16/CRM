export interface ILead {
  id: number;
  title: string;
  description?: string | null;
  lead_value?: number | null;
  status?: boolean | null;
  lost_reason?: string | null;
  closed_at?: string | null;
  user_id?: number | null;
  person_id?: number | null;
  lead_source_id?: number | null;
  lead_type_id?: number | null;
  lead_pipeline_id?: number | null;
  lead_pipeline_stage_id?: number | null;
  expected_close_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ILeadPipeline {
  id: number;
  name: string;
  is_default: boolean;
  rotten_days: number;
  created_at?: string;
  updated_at?: string;
}

export interface ILeadPipelineStage {
  id: number;
  code?: string | null;
  name?: string | null;
  probability: number;
  sort_order: number;
  lead_pipeline_id: number;
}

export interface ILeadSource {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ILeadType {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}
