import type { IPipeline } from "./settingsSubmodulesInterface";

export interface IFunnelStage {
  stage_id?: number;
  stage_name: string;
  code?: string;
  count: number;
  total_value: number;
}

export interface ITimelinePoint {
  date: string;
  label?: string;
  won_revenue: number;
  lost_revenue: number;
  won_count: number;
  lost_count: number;
  leads_count: number;
}

export interface ITopProduct {
  id: number;
  name: string;
  price: number;
  revenue: number;
  quantity_sold: number;
}

export interface ITopPerson {
  id: number;
  name: string;
  email: string;
  deals_count: number;
  revenue: number;
}

export interface IProgress {
  won_revenue?: number;
  lost_revenue?: number;
  total_leads?: number;
  avg_lead_value?: number;
  avg_leads_per_day?: number;
  total_quotations?: number;
  total_persons?: number;
  total_organizations?: number;
}

export interface IDashboardData {
  pipelines: IPipeline[];
  selected_pipeline_id: number | string;
  start_date: string;
  end_date: string;
  won_revenue: number;
  won_count: number;
  lost_revenue: number;
  lost_count: number;
  avg_lead_value: number;
  total_leads: number;
  avg_leads_per_day: number;
  total_quotations: number;
  total_persons: number;
  total_organizations: number;
  funnel: IFunnelStage[];
  revenue_by_source: { name: string; count: number; total_value: number }[];
  revenue_by_type: { name: string; count: number; total_value: number }[];
  top_products: ITopProduct[];
  top_persons: ITopPerson[];
  timeline: ITimelinePoint[];
  progress: IProgress;
}
