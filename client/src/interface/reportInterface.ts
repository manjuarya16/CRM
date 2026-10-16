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
  product_type?: string;
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
  product_type?: string;
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

export interface IReportFilterState {
  datePreset: string;
  fromDate: string;
  toDate: string;
  searchQuery: string;
  selectedOwnerId: string;
  selectedOrg: string;
  selectedSourceId: string;
  selectedTypeId: string;
  selectedPipelineId: string;
  selectedStageId: string;
  selectedOutcome: string;
  minValue: string;
  maxValue: string;
  expectedCloseFrom: string;
  expectedCloseTo: string;
  agingFilter: string;
  selectedWarehouseId: string;
  selectedProductId: string;
  selectedPerson: string;
  activityType: string;
  activityStatus: string;
  activityOverdueOnly: string;
  quoteStatus: string;
  quoteExpiry: string;
  quoteSoonDays: string;
  quoteExpiresFrom: string;
  quoteExpiresTo: string;
  selectedProductType?: string;
  selectedDealType?: string;
  selectedStaleDays?: number | string;
  selectedIssueFlag?: string;
}

export type ReportTabType =
  | 'overview'
  | 'leads'
  | 'sources'
  | 'product-value'
  | 'product-lines'
  | 'pipeline'
  | 'activities'
  | 'quotes'
  | 'sales-reps'
  | 'marketing'
  | 'accounts'
  | 'forecast'
  | 'inventory'
  | 'win-loss'
  | 'product-service-mix'
  | 'stale-leads';

export interface ISalesRepItem {
  user_id: number;
  rep_name: string;
  email: string;
  total_leads: number;
  won_leads: number;
  lost_leads: number;
  open_leads: number;
  won_value: number;
  open_value: number;
  win_rate: number;
  avg_cycle_days: number;
  total_activities: number;
  completed_activities: number;
  overdue_activities: number;
  total_quotes: number;
  total_quote_value: number;
  accepted_quote_value: number;
}

export interface ISalesRepsKpis {
  total_active_reps: number;
  team_won_revenue: number;
  team_open_pipeline: number;
  team_win_rate: number;
  total_team_activities: number;
  top_performer_name: string;
}

export interface ISalesRepsReportData {
  kpis: ISalesRepsKpis;
  reps: ISalesRepItem[];
  revenue_by_rep: IReportChartDataItem[];
  win_rate_by_rep: IReportChartDataItem[];
}

export interface IMarketingFormItem {
  form_id: number;
  form_title: string;
  slug: string;
  pipeline_name: string;
  submission_count: number;
  create_lead: boolean;
  last_submission_at: string | null;
}

export interface IMarketingCampaignItem {
  id: number;
  name: string;
  subject: string;
  type: string;
  status: boolean;
  event_name?: string | null;
  created_at: string;
}

export interface IMarketingKpis {
  active_forms_count: number;
  total_submissions: number;
  top_form_name: string;
  total_campaigns_count: number;
  total_events_count: number;
}

export interface IMarketingReportData {
  kpis: IMarketingKpis;
  forms: IMarketingFormItem[];
  campaigns: IMarketingCampaignItem[];
  submissions_trend: IReportChartDataItem[];
  submissions_by_form: IReportChartDataItem[];
}

export interface IAccountReportItem {
  organization_id: number;
  organization_name: string;
  location?: string | null;
  contacts_count: number;
  total_deals: number;
  won_deals: number;
  open_deals: number;
  won_value: number;
  open_value: number;
  total_activities: number;
  last_activity_at: string | null;
  engagement_status: string;
}

export interface IAccountsKpis {
  total_accounts: number;
  active_accounts_count: number;
  stale_accounts_count: number;
  total_won_revenue: number;
  total_open_value: number;
  top_account_name: string;
}

export interface IAccountsReportData {
  kpis: IAccountsKpis;
  accounts: IAccountReportItem[];
  engagement_mix: IOutcomeMixItem[];
  revenue_by_org: IReportChartDataItem[];
}

export interface IForecastDealItem {
  lead_id: number;
  lead_title: string;
  lead_value: number;
  weighted_value: number;
  probability: number;
  expected_close_date: string | null;
  confidence_category: string;
  stage_name: string;
  pipeline_name: string;
  owner_name: string;
  organization_name?: string | null;
  age_days: number;
  created_at: string;
}

export interface IForecastMonthlyItem {
  label: string;
  value: number;
  unweighted: number;
  count: number;
}

export interface IForecastKpis {
  total_open_deals: number;
  unweighted_pipeline: number;
  weighted_forecast: number;
  avg_probability: number;
  commit_deals_value: number;
  closing_this_month_count: number;
  closing_this_month_value: number;
}

export interface IForecastReportData {
  kpis: IForecastKpis;
  deals: IForecastDealItem[];
  confidence_mix: IOutcomeMixItem[];
  monthly_forecast: IForecastMonthlyItem[];
}

export interface IInventoryStockItem {
  product_id: number;
  product_name: string;
  sku: string;
  unit_price: number;
  warehouse_id: number;
  warehouse_name: string;
  in_stock: number;
  allocated: number;
  available_stock: number;
  stock_status: string;
  asset_valuation: number;
}

export interface IInventoryKpis {
  total_skus: number;
  total_stock_units: number;
  total_inventory_valuation: number;
  low_stock_skus: number;
  out_of_stock_skus: number;
  total_warehouses: number;
}

export interface IInventoryReportData {
  kpis: IInventoryKpis;
  items: IInventoryStockItem[];
  stock_status_mix: IOutcomeMixItem[];
  valuation_by_warehouse: IReportChartDataItem[];
}

// Win / Loss Report Interfaces
export interface IWinLossKpis {
  total_closed: number;
  won_count: number;
  won_value: number;
  lost_count: number;
  lost_value: number;
  win_rate_deals: number;
  win_rate_value: number;
  avg_won_deal: number;
  avg_sales_cycle_days: number;
}

export interface IWinLossDealTypeItem {
  deal_type: string;
  total_deals: number;
  won_deals: number;
  lost_deals: number;
  win_rate: number;
  won_value: number;
  avg_won_value: number;
  avg_cycle_days: number;
}

export interface IWinLossLostReasonItem {
  label: string;
  count: number;
  value: number;
}

export interface IWinLossChartItem {
  label: string;
  count: number;
  won_count: number;
  value: number;
}

export interface IWinLossDealItem {
  lead_id: number;
  lead_title: string;
  organization_name: string;
  owner_name: string;
  source_name: string;
  pipeline_name: string;
  stage_name: string;
  outcome: 'won' | 'lost';
  lead_value: number;
  lost_reason: string;
  created_at: string;
  closed_at: string;
  cycle_days: number;
  deal_type: string;
}

export interface IWinLossReportData {
  kpis: IWinLossKpis;
  deal_types: IWinLossDealTypeItem[];
  lost_reasons: IWinLossLostReasonItem[];
  win_rate_by_source: IWinLossChartItem[];
  win_rate_by_deal_size: IWinLossChartItem[];
  insights: string[];
  deals: IWinLossDealItem[];
}

// Product vs Service Mix Report Interfaces
export interface IProductServiceMixKpis {
  total_value: number;
  product_value: number;
  service_value: number;
  product_share_pct: number;
  service_share_pct: number;
  total_leads_with_items: number;
  leads_with_both: number;
  attach_rate_pct: number;
}

export interface IOfferingOutcomeItem {
  label: string;
  won_value: number;
  open_value: number;
  lost_value: number;
  total_value: number;
}

export interface IProductServiceMixDealTypeItem {
  deal_kind: string;
  leads_count: number;
  open_value: number;
  won_value: number;
  win_rate: number;
  avg_value: number;
  total_value: number;
}

export interface IProductServiceMixItem {
  product_id: number;
  item_name: string;
  item_type: string;
  sku: string;
  leads_count: number;
  total_quantity: number;
  avg_unit_price: number;
  open_value: number;
  won_value: number;
  lost_value: number;
  total_value: number;
}

export interface IProductServiceMixReportData {
  kpis: IProductServiceMixKpis;
  offering_outcome: IOfferingOutcomeItem[];
  share_donut: IReportChartDataItem[];
  top_services: IReportChartDataItem[];
  deal_types: IProductServiceMixDealTypeItem[];
  items: IProductServiceMixItem[];
  insights: string[];
}

// Stale Leads & Follow-up Gaps Report Interfaces
export interface IStaleLeadsKpis {
  total_open_leads: number;
  total_open_value: number;
  leads_with_issues_count: number;
  leads_with_issues_value: number;
  no_next_step_count: number;
  no_recent_activity_count: number;
  past_close_date_count: number;
  missing_details_count: number;
  stale_threshold_days: number;
}

export interface IStaleLeadsOwnerItem {
  label: string;
  no_next_step: number;
  no_recent_activity: number;
  past_close_date: number;
  missing_details: number;
  total_issues: number;
}

export interface IStaleLeadItem {
  lead_id: number;
  lead_title: string;
  organization_name: string;
  person_name: string;
  owner_name: string;
  pipeline_name: string;
  stage_name: string;
  lead_value: number;
  expected_close_date: string | null;
  last_activity_at: string | null;
  next_scheduled_activity: string | null;
  days_idle: number;
  items_count: number;
  issue_flags: string[];
}

export interface IStaleLeadsReportData {
  kpis: IStaleLeadsKpis;
  issues_by_type: IOutcomeMixItem[];
  issues_by_owner: IStaleLeadsOwnerItem[];
  leads: IStaleLeadItem[];
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

export interface IReportStore {
  overviewData: IReportOverviewData | null;
  leadSummaryData: ILeadSummaryReportData | null;
  leadSourcesData: ILeadSourcesReportData | null;
  productValueData: IProductValueReportData | null;
  productLinesData: IProductLinesReportData | null;
  pipelineData: IPipelineReportData | null;
  activitiesData: IActivitiesReportData | null;
  quotesData: IQuotesReportData | null;
  salesRepsData: ISalesRepsReportData | null;
  marketingData: IMarketingReportData | null;
  accountsData: IAccountsReportData | null;
  forecastData: IForecastReportData | null;
  inventoryData: IInventoryReportData | null;
  winLossData: IWinLossReportData | null;
  productServiceMixData: IProductServiceMixReportData | null;
  staleLeadsData: IStaleLeadsReportData | null;
  filterOptions: IReportFilterOptions | null;
  loading: boolean;
  error: string | null;
  activeTab: ReportTabType;
  filterState: IReportFilterState;
  setActiveTab: (tab: ReportTabType) => void;
  setFilterState: (updates: Partial<IReportFilterState>) => void;
  resetFilters: () => void;
  fetchFilterOptions: () => Promise<void>;
  fetchReportOverview: () => Promise<void>;
  fetchLeadSummaryReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchLeadSourcesReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchProductValueReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchProductLinesReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchPipelineReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchActivitiesReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchQuotesReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchSalesRepsReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchMarketingReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchAccountsReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchForecastReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchInventoryReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchWinLossReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchProductServiceMixReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
  fetchStaleLeadsReport: (customFilters?: Partial<IReportFilterState>) => Promise<void>;
}

export interface IReportColumnDefinition<T = any> {
  key: string;
  header: string;
  isNumeric?: boolean;
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => any;
  exportAccessor?: (row: T) => string | number | null | undefined;
}

export interface IReportQuickView {
  label: string;
  filters: Partial<IReportFilterState>;
  preset?: string;
}

export interface IRecordDrawerState {
  isOpen: boolean;
  recordType: 'lead' | 'activity' | 'quote' | null;
  recordId: number | null;
  title: string;
  data?: any;
}

export interface IReportChartDataItem {
  label: string;
  value: number;
  displayText?: string;
  color?: string;
}

export interface IReportStackedBarSegment {
  name: string;
  value: number;
  color: string;
}

export interface IReportStackedBarGroup {
  label: string;
  totalDisplay?: string;
  segments: IReportStackedBarSegment[];
}
