export interface IReportKpiItem {
  label: string;
  value: string | number;
  subtitle?: string;
  apply?: Record<string, any>;
}

export interface ILeadSummaryKpis {
  total_leads: number;
  open_leads: number;
  won_leads: number;
  lost_leads: number;
  open_lead_value: number;
  avg_lead_value: number;
  open_percentage: number;
  win_percentage: number;
}

export interface ILeadWeeklyData {
  label: string;
  week_start: string;
  count: number;
}

export interface IOutcomeMixItem {
  label: string;
  count: number;
  color: string;
}

export interface IOwnerValueItem {
  label: string;
  value: number;
  count: number;
}

export interface ILostReasonItem {
  label: string;
  count: number;
}

export interface ILeadReportItem {
  id: number;
  tenant_id?: number | null;
  title: string;
  description?: string | null;
  lead_value: number;
  status: boolean;
  lost_reason?: string | null;
  closed_at?: string | null;
  user_id?: number | null;
  person_id?: number | null;
  organization_id?: number | null;
  lead_source_id?: number | null;
  lead_type_id?: number | null;
  lead_pipeline_id?: number | null;
  lead_pipeline_stage_id?: number | null;
  created_at: string;
  updated_at: string;
  expected_close_date?: string | null;
  owner_name: string;
  person_name?: string | null;
  organization_name?: string | null;
  source_name: string;
  type_name: string;
  pipeline_name: string;
  rotten_days: number;
  stage_code?: string | null;
  stage_name: string;
  stage_probability: number;
  stage_order: number;
  outcome: 'open' | 'won' | 'lost';
  is_overdue: boolean;
  days_in_stage: number;
}

export interface ILeadSummaryReportData {
  kpis: ILeadSummaryKpis;
  weeks: ILeadWeeklyData[];
  outcome_mix: IOutcomeMixItem[];
  owner_values: IOwnerValueItem[];
  lost_reasons: ILostReasonItem[];
  leads: ILeadReportItem[];
}

export interface ILeadSourcePerformanceItem {
  source_name: string;
  total_leads: number;
  open_leads: number;
  won_leads: number;
  lost_leads: number;
  total_value: number;
  open_value: number;
  won_value: number;
  win_rate: number;
  avg_lead_value: number;
}

export interface ILeadSourceKpis {
  total_leads: number;
  open_lead_value: number;
  won_lead_value: number;
  lost_lead_value: number;
  win_rate: number;
  avg_lead_value: number;
}

export interface ILeadSourcesReportData {
  kpis: ILeadSourceKpis;
  sources: ILeadSourcePerformanceItem[];
}

export interface IProductValueItem {
  product_id: number;
  product_name: string;
  sku: string;
  total_leads_count: number;
  open_leads_count: number;
  won_leads_count: number;
  lost_leads_count: number;
  total_quantity: number;
  avg_unit_price: number;
  open_value: number;
  won_value: number;
  lost_value: number;
  total_value: number;
  share_percent: number;
}

export interface IProductValueKpis {
  products_count: number;
  total_quantity: number;
  total_product_value: number;
  open_product_value: number;
  won_product_value: number;
  leads_with_products_count: number;
}

export interface IProductValueReportData {
  kpis: IProductValueKpis;
  products: IProductValueItem[];
}

export interface IProductLineItem {
  id: number;
  lead_id: number;
  lead_title: string;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  amount: number;
  is_calculated: boolean;
  pipeline_name: string;
  stage_name: string;
  outcome: 'open' | 'won' | 'lost';
  owner_name: string;
  organization_name: string;
  warehouse_name: string;
  lead_created_at: string;
}

export interface IProductLinesKpis {
  total_lines: number;
  total_quantity: number;
  total_amount: number;
  distinct_products: number;
  distinct_leads: number;
}

export interface IProductLinesReportData {
  kpis: IProductLinesKpis;
  lines: IProductLineItem[];
}

export interface IPipelineStageReportItem {
  pipeline_name: string;
  stage_id: number;
  stage_name: string;
  sort_order: number;
  probability: number;
  stage_code: string;
  leads_count: number;
  stage_value: number;
  weighted_value: number;
  avg_days_in_stage: number;
  overdue_count: number;
  rotten_days: number;
}

export interface IPipelineAttentionLead {
  id: number;
  title: string;
  owner_name: string;
  stage_name: string;
  lead_value: number;
  expected_close_date?: string | null;
  days_in_stage: number;
  is_overdue: boolean;
  is_stuck: boolean;
}

export interface IPipelineKpis {
  open_pipeline_value: number;
  open_leads_count: number;
  weighted_pipeline_value: number;
  closing_this_month_count: number;
  closing_this_month_value: number;
  overdue_leads_count: number;
  overdue_leads_value: number;
  rotten_stuck_count: number;
}

export interface IPipelineReportData {
  kpis: IPipelineKpis;
  stages: IPipelineStageReportItem[];
  attention_leads: IPipelineAttentionLead[];
}

export interface IActivityReportItem {
  id: number;
  title: string;
  type: string;
  comment?: string | null;
  location?: string | null;
  schedule_from: string;
  schedule_to: string;
  is_done: boolean;
  created_at: string;
  completed_at?: string | null;
  user_name: string;
  lead_id?: number | null;
  lead_title?: string | null;
  person_name?: string | null;
  computed_status: 'Completed' | 'Pending' | 'Overdue';
}

export interface IActivitiesKpis {
  total_activities: number;
  completed_count: number;
  pending_count: number;
  overdue_count: number;
  scheduled_today_count: number;
  completion_rate: number;
}

export interface IActivitiesReportData {
  kpis: IActivitiesKpis;
  type_mix: { label: string; count: number }[];
  user_breakdown: { label: string; completed: number; pending: number; overdue: number }[];
  upcoming_days: { label: string; count: number }[];
  activities: IActivityReportItem[];
}

export interface IQuoteReportItem {
  id: number;
  subject: string;
  lead_id?: number | null;
  lead_title?: string | null;
  person_name?: string | null;
  owner_name: string;
  quote_status: string;
  sub_total: number;
  discount_amount: number;
  tax_amount: number;
  adjustment_amount: number;
  grand_total: number;
  expired_at?: string | null;
  created_at: string;
  updated_at: string;
  is_expired: boolean;
  is_expiring_soon: boolean;
}

export interface IQuotesKpis {
  total_quotes: number;
  total_quote_value: number;
  avg_quote_value: number;
  expiring_soon_count: number;
  expired_unresolved_count: number;
  expired_unresolved_value: number;
  accepted_count: number;
  accepted_value: number;
  rejected_count: number;
  rejected_value: number;
}

export interface IQuotesReportData {
  kpis: IQuotesKpis;
  status_mix: { label: string; count: number }[];
  owner_values: { label: string; value: number; count: number }[];
  quotes: IQuoteReportItem[];
}

export interface IReportOverviewData {
  open_leads_value: number;
  open_leads_count: number;
  top_source_name: string;
  top_source_count: number;
  top_product_name: string;
  top_product_value: number;
  overdue_activities_count: number;
  expiring_quotes_count: number;
  weighted_pipeline_value: number;
}

export interface IReportFilterOptionItem {
  id: number | string;
  name: string;
  pipeline_id?: number | string;
}

export interface IReportFilterOptions {
  owners: IReportFilterOptionItem[];
  organizations: IReportFilterOptionItem[];
  sources: IReportFilterOptionItem[];
  types: IReportFilterOptionItem[];
  pipelines: IReportFilterOptionItem[];
  stages: IReportFilterOptionItem[];
  warehouses: IReportFilterOptionItem[];
  products: IReportFilterOptionItem[];
  persons: IReportFilterOptionItem[];
}
