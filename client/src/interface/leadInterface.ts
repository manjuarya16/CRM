export interface ILead {
  id: number;
  title: string;
  description?: string;
  lead_value?: number;
  status?: boolean;
  lost_reason?: string;
  closed_at?: string;
  user_id?: number;
  person_id?: number;
  lead_source_id?: number;
  lead_type_id?: number;
  lead_pipeline_id?: number;
  lead_pipeline_stage_id?: number;
  expected_close_date?: string;
  created_at?: string;
  updated_at?: string;
  person_name?: string;
  source_name?: string;
  stage_name?: string;
  pipeline_name?: string;
  type_name?: string;
  user_name?: string;
  total_count?: number;
  custom_attributes?: Record<string, any>;
}

export interface ILeadSource {
  id: number;
  name: string;
}

export interface ILeadType {
  id: number;
  name: string;
}

export interface ILeadPipeline {
  id: number;
  name: string;
  is_default?: boolean;
  rotten_days?: number;
}

export interface ILeadStage {
  id: number;
  code?: string;
  name: string;
  probability?: number;
  sort_order?: number;
  lead_pipeline_id: number;
}

export interface ILeadProduct {
  id: number;
  lead_id: number;
  product_id: number;
  product_name?: string;
  sku?: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface LeadStore {
  leads: ILead[];
  total: number;
  loading: boolean;
  error: string | null;
  selectedLead: ILead | null;
  sources: ILeadSource[];
  types: ILeadType[];
  pipelines: ILeadPipeline[];
  stages: ILeadStage[];
  leadProducts: ILeadProduct[];
  kanbanLeads: ILead[];
  fetchLeads: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchKanbanLeads: (pipelineId?: number, search?: string) => Promise<void>;
  fetchLeadById: (id: number) => Promise<ILead | null>;
  addLead: (leadData: any) => Promise<any>;
  updateLead: (id: number, leadData: any) => Promise<any>;
  deleteLead: (id: number) => Promise<void>;
  updateLeadStage: (id: number, stageId: number, status?: boolean, lostReason?: string) => Promise<any>;
  fetchLeadProducts: (leadId: number) => Promise<void>;
  addLeadProduct: (leadId: number, productId: number, quantity?: number, price?: number) => Promise<any>;
  deleteLeadProduct: (itemId: number, leadId: number) => Promise<void>;
  fetchSources: () => Promise<void>;
  fetchTypes: () => Promise<void>;
  fetchPipelines: () => Promise<void>;
  fetchStages: (pipelineId?: number) => Promise<void>;
  setSelectedLead: (lead: ILead | null) => void;
  clearError: () => void;
}
