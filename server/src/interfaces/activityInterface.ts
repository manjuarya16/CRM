export interface IActivity {
  id: number;
  title?: string;
  type: string;
  comment?: string;
  schedule_from?: string;
  schedule_to?: string;
  is_done?: boolean;
  location?: string;
  user_id?: number;
  user_name?: string;
  lead_id?: number;
  person_id?: number;
  created_at?: string;
  updated_at?: string;
  total_count?: number;
}

export interface IActivityCreateInput {
  title?: string;
  type?: string;
  comment?: string;
  schedule_from?: string;
  schedule_to?: string;
  is_done?: boolean;
  user_id?: number;
  location?: string;
  lead_id?: number;
  person_id?: number;
}

export interface IActivityUpdateInput extends Partial<IActivityCreateInput> {}
