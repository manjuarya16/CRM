export interface ILead {
  id: number;
  title: string;
  description?: string;
  lead_value?: number;
  status?: boolean;
  lost_reason?: string;
  closed_at?: Date;
  user_id?: number;
  person_id?: number;
  lead_source_id?: number;
  lead_type_id?: number;
  lead_pipeline_id?: number;
  lead_pipeline_stage_id?: number;
  expected_close_date?: string;
  created_at?: Date;
  updated_at?: Date;
  person_name?: string;
  source_name?: string;
  stage_name?: string;
  pipeline_name?: string;
  type_name?: string;
  total_count?: number;
}

export interface ILeadCreateInput {
  title: string;
  description?: string;
  lead_value?: number;
  user_id?: number;
  person_id?: number;
  lead_source_id?: number;
  lead_type_id?: number;
  lead_pipeline_id?: number;
  expected_close_date?: string;
}

export interface ILeadUpdateInput extends Partial<ILeadCreateInput> {
  status?: boolean;
  lost_reason?: string;
  lead_pipeline_stage_id?: number;
}
