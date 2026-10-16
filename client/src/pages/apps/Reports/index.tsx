import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useReportStore } from '@/store';
import {
  ReportTabType,
  IReportFilterState,
  IRecordDrawerState,
  ILeadReportItem,
  IActivityReportItem,
  IQuoteReportItem,
} from '@/interface';
import { formatDateDisplay, formatDateTimeDisplay } from './reportHelpers';
import { RecordDrawer } from './components/RecordDrawer';
import { OverviewReport } from './components/OverviewReport';
import { LeadSummaryReport } from './components/LeadSummaryReport';
import { LeadSourcesReport } from './components/LeadSourcesReport';
import { ProductValueReport } from './components/ProductValueReport';
import { ProductLinesReport } from './components/ProductLinesReport';
import { PipelineReport } from './components/PipelineReport';
import { ActivitiesReport } from './components/ActivitiesReport';
import { QuotesReport } from './components/QuotesReport';
import { SalesRepReport } from './components/SalesRepReport';
import { MarketingReport } from './components/MarketingReport';
import { AccountsReport } from './components/AccountsReport';
import { ForecastReport } from './components/ForecastReport';
import { InventoryReport } from './components/InventoryReport';
import { WinLossReport } from './components/WinLossReport';
import { ProductServiceMixReport } from './components/ProductServiceMixReport';
import { StaleLeadsReport } from './components/StaleLeadsReport';

const ReportsPage: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    activeTab,
    setActiveTab,
    filterState,
    setFilterState,
    resetFilters,
    loading,
    error,
    overviewData,
    leadSummaryData,
    leadSourcesData,
    productValueData,
    productLinesData,
    pipelineData,
    activitiesData,
    quotesData,
    salesRepsData,
    marketingData,
    accountsData,
    forecastData,
    inventoryData,
    winLossData,
    productServiceMixData,
    staleLeadsData,
    filterOptions,
    fetchFilterOptions,
    fetchReportOverview,
    fetchLeadSummaryReport,
    fetchLeadSourcesReport,
    fetchProductValueReport,
    fetchProductLinesReport,
    fetchPipelineReport,
    fetchActivitiesReport,
    fetchQuotesReport,
    fetchSalesRepsReport,
    fetchMarketingReport,
    fetchAccountsReport,
    fetchForecastReport,
    fetchInventoryReport,
    fetchWinLossReport,
    fetchProductServiceMixReport,
    fetchStaleLeadsReport,
  } = useReportStore();

  // Slide-over Record Drawer state
  const [drawerState, setDrawerState] = useState<IRecordDrawerState>({
    isOpen: false,
    recordType: null,
    recordId: null,
    title: '',
    data: null,
  });

  // Load filter dropdown options from real database on mount
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Clean tab switching without cross-tab filter bleeding
  const handleTabSwitch = useCallback(
    (targetTab: ReportTabType, initialFilters?: Partial<IReportFilterState>) => {
      // Reset module-specific filters so they don't corrupt the target report
      const updates: Partial<IReportFilterState> = {
        searchQuery: '',
        selectedOwnerId: '',
        selectedWarehouseId: '',
        selectedProductId: '',
        selectedProductType: '',
        selectedPerson: '',
        selectedOrg: '',
        selectedPipelineId: '',
        selectedStageId: '',
        selectedOutcome: '',
        activityStatus: '',
        activityType: '',
        activityOverdueOnly: '',
        quoteStatus: '',
        quoteExpiry: '',
        agingFilter: '',
        minValue: '',
        maxValue: '',
        selectedDealType: '',
        selectedStaleDays: 14,
        selectedIssueFlag: '',
        ...(initialFilters || {}),
      };

      // Forward-looking deals for Revenue Forecast:
      if (targetTab === 'forecast') {
        updates.datePreset = 'all';
        updates.fromDate = '';
        updates.toDate = '';
      } else if (targetTab === 'inventory') {
        // Real-time current stock
        updates.datePreset = 'all';
        updates.fromDate = '';
        updates.toDate = '';
      } else if (!filterState.datePreset || filterState.datePreset === 'all') {
        updates.datePreset = '90';
      }

      setFilterState(updates);
      setActiveTab(targetTab);
      const queryStr = updates.selectedProductId
        ? `?product=${encodeURIComponent(updates.selectedProductId)}`
        : '';
      navigate(`/reports/${targetTab}${queryStr}`);
    },
    [filterState.datePreset, navigate, setActiveTab, setFilterState]
  );

  // Sync route param with active tab
  useEffect(() => {
    const validTabs: ReportTabType[] = [
      'overview',
      'leads',
      'sources',
      'product-value',
      'product-lines',
      'pipeline',
      'activities',
      'quotes',
      'sales-reps',
      'marketing',
      'accounts',
      'forecast',
      'inventory',
      'win-loss',
      'product-service-mix',
      'stale-leads',
    ];

    const prodParam = searchParams.get('product') || searchParams.get('productId');
    const initialFilters: Partial<IReportFilterState> = {};
    if (prodParam) {
      initialFilters.selectedProductId = prodParam;
    }

    if (tab && validTabs.includes(tab as ReportTabType)) {
      if (tab !== activeTab) {
        handleTabSwitch(tab as ReportTabType, initialFilters);
      } else if (prodParam && filterState.selectedProductId !== prodParam) {
        setFilterState({ selectedProductId: prodParam });
      }
    } else if (!tab && activeTab !== 'overview') {
      handleTabSwitch('overview');
    }
  }, [tab, activeTab, handleTabSwitch, searchParams, filterState.selectedProductId, setFilterState]);

  // Fetch report data for active tab
  const fetchCurrentTabReport = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        fetchReportOverview();
        break;
      case 'leads':
        fetchLeadSummaryReport();
        break;
      case 'sources':
        fetchLeadSourcesReport();
        break;
      case 'product-value':
        fetchProductValueReport();
        break;
      case 'product-lines':
        fetchProductLinesReport();
        break;
      case 'pipeline':
        fetchPipelineReport();
        break;
      case 'activities':
        fetchActivitiesReport();
        break;
      case 'quotes':
        fetchQuotesReport();
        break;
      case 'sales-reps':
        fetchSalesRepsReport();
        break;
      case 'marketing':
        fetchMarketingReport();
        break;
      case 'accounts':
        fetchAccountsReport();
        break;
      case 'forecast':
        fetchForecastReport();
        break;
      case 'inventory':
        fetchInventoryReport();
        break;
      case 'win-loss':
        fetchWinLossReport();
        break;
      case 'product-service-mix':
        fetchProductServiceMixReport();
        break;
      case 'stale-leads':
        fetchStaleLeadsReport();
        break;
      default:
        fetchReportOverview();
    }
  }, [
    activeTab,
    fetchReportOverview,
    fetchLeadSummaryReport,
    fetchLeadSourcesReport,
    fetchProductValueReport,
    fetchProductLinesReport,
    fetchPipelineReport,
    fetchActivitiesReport,
    fetchQuotesReport,
    fetchSalesRepsReport,
    fetchMarketingReport,
    fetchAccountsReport,
    fetchForecastReport,
    fetchInventoryReport,
    fetchWinLossReport,
    fetchProductServiceMixReport,
    fetchStaleLeadsReport,
  ]);

  // Re-fetch when active tab or critical filters change
  useEffect(() => {
    fetchCurrentTabReport();
  }, [
    activeTab,
    filterState.fromDate,
    filterState.toDate,
    filterState.selectedOutcome,
    filterState.selectedOwnerId,
    filterState.selectedOrg,
    filterState.selectedSourceId,
    filterState.selectedTypeId,
    filterState.selectedPipelineId,
    filterState.selectedStageId,
    filterState.selectedWarehouseId,
    filterState.selectedProductId,
    filterState.selectedProductType,
    filterState.selectedDealType,
    filterState.selectedStaleDays,
    filterState.selectedIssueFlag,
    filterState.selectedPerson,
    filterState.activityType,
    filterState.activityStatus,
    filterState.activityOverdueOnly,
    filterState.quoteStatus,
    filterState.quoteExpiry,
    filterState.agingFilter,
    filterState.searchQuery,
    filterState.minValue,
    filterState.maxValue,
    filterState.expectedCloseFrom,
    filterState.expectedCloseTo,
    filterState.quoteSoonDays,
    filterState.quoteExpiresFrom,
    filterState.quoteExpiresTo,
    fetchCurrentTabReport,
  ]);

  // Tab metadata mapping
  const tabMetadata: Record<ReportTabType, { title: string; subtitle: string; basis: string }> = {
    overview: {
      title: 'Reports & Executive Overview',
      subtitle: 'Executive sales performance summary across leads, pipeline, products, activities, and quotes.',
      basis: 'All data',
    },
    leads: {
      title: 'Lead Summary',
      subtitle: 'Every lead with owner, source, stage, value and close dates. Click cards to filter.',
      basis: 'Lead created date',
    },
    sources: {
      title: 'Lead Source Performance',
      subtitle: 'Which sources bring the most leads, the most value and the best win rate.',
      basis: 'Lead created date',
    },
    'product-value': {
      title: 'Product-wise Lead Value',
      subtitle: 'Which products sit on your leads and how much value each carries, with open, won, and lost lead counts.',
      basis: 'Lead created date',
    },
    'product-lines': {
      title: 'Product Lines on Leads (Dedicated Report)',
      subtitle: 'Itemized breakdown of all product line items attached to leads with pricing and warehouse locations.',
      basis: 'Lead created date',
    },
    pipeline: {
      title: 'Sales Pipeline',
      subtitle: 'Open value by stage, weighted forecast, overdue and stuck leads.',
      basis: 'Lead created date',
    },
    activities: {
      title: 'Activity and Follow-up',
      subtitle: 'Calls, meetings and tasks: what is done, pending or overdue.',
      basis: 'Activity scheduled date',
    },
    quotes: {
      title: 'Quote Summary',
      subtitle: 'Quote value, status and expiry, with line items one click away.',
      basis: 'Quote created date',
    },
    'sales-reps': {
      title: 'Sales Reps & Team Performance',
      subtitle: 'Individual and team sales metrics, deal conversion win rates, activities, and accepted quotes.',
      basis: 'Deal and activity date',
    },
    marketing: {
      title: 'Marketing & Inbound Web Forms',
      subtitle: 'Inbound submission volume across web forms, auto-lead creation, and campaign outreach.',
      basis: 'Form submission date',
    },
    accounts: {
      title: 'Accounts & Organizations',
      subtitle: 'Organization-level sales performance, deal history, contact counts, and engagement health.',
      basis: 'Account interaction date',
    },
    forecast: {
      title: 'Revenue Forecast & Deal Velocity',
      subtitle: 'Weighted pipeline revenue projection based on stage win probabilities and target close dates.',
      basis: 'Expected close date',
    },
    inventory: {
      title: 'Warehouse & Inventory Stock',
      subtitle: 'Real-time stock on hand, allocated quantities, stock status, and inventory asset valuation.',
      basis: 'Current stock holding',
    },
    'win-loss': {
      title: 'Win / Loss Analysis',
      subtitle: 'Why we win and lose: by deal type, source, deal size and lost reason.',
      basis: 'Closed date',
    },
    'product-service-mix': {
      title: 'Product vs Service Mix',
      subtitle: 'How much value comes from physical products vs services, attach rates, and bundling.',
      basis: 'Lead created date',
    },
    'stale-leads': {
      title: 'Stale Leads & Follow-up Gaps',
      subtitle: 'Open leads nobody is working on: no next step, no recent activity, or past target close date.',
      basis: 'Lead created date',
    },
  };

  const currentMeta = tabMetadata[activeTab] || tabMetadata.overview;

  // Drawer Open Handlers
  const handleOpenLeadDrawer = (lead: ILeadReportItem) => {
    setDrawerState({
      isOpen: true,
      recordType: 'lead',
      recordId: lead.id,
      title: lead.title,
      data: lead,
    });
  };

  const handleOpenLeadDrawerById = (leadId: number, leadTitle: string) => {
    const existing = leadSummaryData?.leads.find((l) => l.id === leadId);
    setDrawerState({
      isOpen: true,
      recordType: 'lead',
      recordId: leadId,
      title: leadTitle || `Lead #${leadId}`,
      data:
        existing || {
          id: leadId,
          title: leadTitle || `Lead #${leadId}`,
          lead_value: 0,
          owner_name: 'Assigned Owner',
          source_name: 'Direct',
          type_name: 'Standard',
          pipeline_name: 'Default Pipeline',
          stage_name: 'Prospect',
          outcome: 'open',
          is_overdue: false,
          created_at: new Date().toISOString(),
        },
    });
  };

  const handleOpenActivityDrawer = (activity: IActivityReportItem) => {
    setDrawerState({
      isOpen: true,
      recordType: 'activity',
      recordId: activity.id,
      title: activity.title,
      data: activity,
    });
  };

  const handleOpenQuoteDrawer = (quote: IQuoteReportItem) => {
    setDrawerState({
      isOpen: true,
      recordType: 'quote',
      recordId: quote.id,
      title: quote.subject,
      data: quote,
    });
  };

  const handleOpenRecordFromTypeAndId = (type: 'lead' | 'activity' | 'quote', id: number) => {
    if (type === 'lead') {
      handleOpenLeadDrawerById(id, `Lead #${id}`);
    } else if (type === 'activity') {
      const act = activitiesData?.activities.find((a) => a.id === id);
      if (act) handleOpenActivityDrawer(act);
    } else if (type === 'quote') {
      const q = quotesData?.quotes.find((item) => item.id === id);
      if (q) handleOpenQuoteDrawer(q);
    }
  };

  // Quick views definitions per tab (as per Sales CRM · Reports 1.html)
  const quickViewsMap: Record<
    string,
    { label: string; filters: Partial<IReportFilterState>; preset?: string }[]
  > = {
    leads: [
      { label: 'All Leads (Clubbed)', filters: { selectedOutcome: '', searchQuery: '', selectedSourceId: '', selectedOwnerId: '' } },
      { label: 'My open leads', filters: { selectedOutcome: 'open' } },
      { label: 'Won leads', filters: { selectedOutcome: 'won' } },
      { label: 'Closing this month', filters: { selectedOutcome: 'open', datePreset: 'month' } },
      { label: 'Past expected close', filters: { selectedOutcome: 'open' } },
      { label: 'No lead source', filters: { selectedSourceId: 'unknown' } },
    ],
    sources: [
      { label: 'All Sources', filters: { selectedOutcome: '' } },
      { label: 'Open leads only', filters: { selectedOutcome: 'open' } },
      { label: 'Won only', filters: { selectedOutcome: 'won' } },
      { label: 'New business', filters: { selectedTypeId: 'New Business' } },
    ],
    'product-value': [
      { label: 'All Products', filters: { selectedOutcome: '', selectedWarehouseId: '', selectedProductType: '' } },
      { label: 'Physical Products', filters: { selectedProductType: 'Product' } },
      { label: 'Services Only', filters: { selectedProductType: 'Service' } },
      { label: 'Open pipeline only', filters: { selectedOutcome: 'open' } },
      { label: 'Won only', filters: { selectedOutcome: 'won' } },
    ],
    'product-lines': [
      { label: 'All Lines', filters: { searchQuery: '', selectedOutcome: '', selectedProductType: '' } },
      { label: 'Physical Products', filters: { selectedProductType: 'Product' } },
      { label: 'Services Only', filters: { selectedProductType: 'Service' } },
      { label: 'Open Leads Only', filters: { selectedOutcome: 'open' } },
      { label: 'Won Leads Only', filters: { selectedOutcome: 'won' } },
    ],
    pipeline: [
      { label: 'All Pipelines', filters: { selectedPipelineId: '' } },
      { label: 'Closing this month', filters: { datePreset: 'month' } },
      { label: 'This Quarter', filters: { datePreset: '90' } },
    ],
    activities: [
      { label: 'All Activities', filters: { activityStatus: '', activityOverdueOnly: '', activityType: '' } },
      { label: 'Due today', filters: { datePreset: 'today' }, preset: 'today' },
      { label: 'Overdue only', filters: { activityOverdueOnly: 'yes' } },
      { label: 'Meetings only', filters: { activityType: 'Meeting' } },
    ],
    quotes: [
      { label: 'All Quotes', filters: { quoteStatus: '', quoteExpiry: '' } },
      { label: 'Expiring soon', filters: { quoteExpiry: 'soon' } },
      { label: 'Awaiting decision', filters: { quoteStatus: 'Sent' } },
      { label: 'Accepted', filters: { quoteStatus: 'Accepted' } },
    ],
    'sales-reps': [
      { label: 'All Sales Reps', filters: { selectedOwnerId: '', searchQuery: '', datePreset: '90' } },
      { label: 'This Month', filters: { datePreset: 'month' } },
      { label: 'Last 30 Days', filters: { datePreset: '30' } },
      { label: 'All Time', filters: { datePreset: 'all', fromDate: '', toDate: '' } },
    ],
    marketing: [
      { label: 'All Web Forms & Campaigns', filters: { searchQuery: '', datePreset: 'all', fromDate: '', toDate: '' } },
      { label: 'This Month', filters: { datePreset: 'month' } },
      { label: 'Last 30 Days', filters: { datePreset: '30' } },
      { label: 'Last 90 Days', filters: { datePreset: '90' } },
    ],
    accounts: [
      { label: 'All Accounts', filters: { searchQuery: '', datePreset: 'all', fromDate: '', toDate: '' } },
      { label: 'This Month', filters: { datePreset: 'month' } },
      { label: 'Last 30 Days', filters: { datePreset: '30' } },
      { label: 'Last 90 Days', filters: { datePreset: '90' } },
    ],
    forecast: [
      { label: 'All Open Deals', filters: { selectedPipelineId: '', searchQuery: '', datePreset: 'all', fromDate: '', toDate: '' } },
      { label: 'Closing This Month', filters: { datePreset: 'month' } },
      { label: 'Next 30 Days', filters: { datePreset: 'next30' } },
      { label: 'Next 90 Days', filters: { datePreset: 'next90' } },
      { label: 'Next 14 Days', filters: { datePreset: 'next14' } },
    ],
    inventory: [
      { label: 'All Warehouses', filters: { selectedWarehouseId: '', searchQuery: '' } },
      { label: 'Bhiwandi Hub', filters: { selectedWarehouseId: 'Bhiwandi Central Logistics Hub' } },
      { label: 'Sriperumbudur Hub', filters: { selectedWarehouseId: 'Sriperumbudur Distribution Center' } },
      { label: 'Gurugram Hub', filters: { selectedWarehouseId: 'Gurugram North Hub' } },
      { label: 'Chakan Depot', filters: { selectedWarehouseId: 'Chakan Industrial Depot' } },
    ],
    'win-loss': [
      { label: 'All Closed Deals', filters: { selectedOutcome: '', selectedDealType: '', selectedSourceId: '', selectedOwnerId: '' } },
      { label: 'Won Deals', filters: { selectedOutcome: 'won' } },
      { label: 'Lost Deals', filters: { selectedOutcome: 'lost' } },
      { label: 'Product Deals Only', filters: { selectedDealType: 'Product only' } },
      { label: 'Service Deals Only', filters: { selectedDealType: 'Service only' } },
      { label: 'Product + Service Bundles', filters: { selectedDealType: 'Product + Service' } },
    ],
    'product-service-mix': [
      { label: 'All Offerings', filters: { selectedProductType: '', selectedOutcome: '' } },
      { label: 'Won Deals Only', filters: { selectedOutcome: 'won' } },
      { label: 'Open Pipeline', filters: { selectedOutcome: 'open' } },
      { label: 'Physical Products', filters: { selectedProductType: 'Product' } },
      { label: 'Services Only', filters: { selectedProductType: 'Service' } },
    ],
    'stale-leads': [
      { label: 'All Open Deals', filters: { selectedIssueFlag: '', selectedOwnerId: '' } },
      { label: 'No Next Step', filters: { selectedIssueFlag: 'No next step' } },
      { label: 'Idle 14+ Days', filters: { selectedIssueFlag: 'No recent activity', selectedStaleDays: 14 } },
      { label: 'Idle 30+ Days', filters: { selectedIssueFlag: 'No recent activity', selectedStaleDays: 30 } },
      { label: 'Past Close Date', filters: { selectedIssueFlag: 'Past close date' } },
      { label: 'Missing Details', filters: { selectedIssueFlag: 'Missing details' } },
    ],
  };

  const currentQuickViews = quickViewsMap[activeTab] || [];

  // Find selected pipeline object (matching either id or name)
  const selectedPipeline = useMemo(() => {
    if (!filterState.selectedPipelineId) return null;
    return (
      filterOptions?.pipelines.find(
        (p) =>
          String(p.id) === String(filterState.selectedPipelineId) ||
          p.name.toLowerCase() === filterState.selectedPipelineId.toLowerCase()
      ) || null
    );
  }, [filterOptions?.pipelines, filterState.selectedPipelineId]);

  // Stages filtered dynamically by the chosen pipeline
  const availableStages = useMemo(() => {
    if (!filterOptions?.stages) return [];
    if (selectedPipeline) {
      return filterOptions.stages.filter(
        (st) => String(st.pipeline_id) === String(selectedPipeline.id)
      );
    }
    // When no pipeline is selected ("All"), show distinct unique stages by name
    const uniqueMap = new Map<string, (typeof filterOptions.stages)[0]>();
    for (const stage of filterOptions.stages) {
      if (!uniqueMap.has(stage.name.toLowerCase())) {
        uniqueMap.set(stage.name.toLowerCase(), stage);
      }
    }
    return Array.from(uniqueMap.values());
  }, [filterOptions?.stages, selectedPipeline]);

  // When pipeline changes, reset stage if it does not belong to the selected pipeline
  const handlePipelineChange = (newPipelineValue: string) => {
    let nextStage = filterState.selectedStageId;
    if (newPipelineValue) {
      const targetPipeline = filterOptions?.pipelines.find(
        (p) =>
          String(p.id) === String(newPipelineValue) ||
          p.name.toLowerCase() === newPipelineValue.toLowerCase()
      );
      if (targetPipeline && filterState.selectedStageId) {
        const belongs = filterOptions?.stages.some(
          (st) =>
            String(st.pipeline_id) === String(targetPipeline.id) &&
            (st.name.toLowerCase() === filterState.selectedStageId.toLowerCase() ||
              String(st.id) === String(filterState.selectedStageId))
        );
        if (!belongs) {
          nextStage = '';
        }
      }
    }
    setFilterState({
      selectedPipelineId: newPipelineValue,
      selectedStageId: nextStage,
    });
  };

  return (
    <div className="space-y-4">
      {/* 🏷️ Header Card with Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm dark:text-gray-300 shadow-2xs">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <Link to="/dashboard" className="text-[#0e90d9] hover:underline">
              Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <Link to="/reports/overview" className="text-[#0e90d9] hover:underline">
              Reports
            </Link>
            {activeTab !== 'overview' && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                  {currentMeta.title}
                </span>
              </>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
              {currentMeta.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition"
          >
            <i className="mgc_print_line text-sm" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={fetchCurrentTabReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <i className="mgc_refresh_3_line text-sm" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 🧭 Horizontal Report Tabs Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1.5 shadow-2xs overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { key: 'overview', label: 'Overview', icon: 'mgc_dashboard_line' },
            { key: 'leads', label: 'Lead Summary', icon: 'mgc_target_line' },
            { key: 'sources', label: 'Lead Sources', icon: 'mgc_share_forward_line' },
            { key: 'product-value', label: 'Product Value', icon: 'mgc_box_3_line' },
            { key: 'product-lines', label: 'Product Lines', icon: 'mgc_list_check_3_line' },
            { key: 'pipeline', label: 'Sales Pipeline', icon: 'mgc_filter_line' },
            { key: 'activities', label: 'Activities', icon: 'mgc_calendar_line' },
            { key: 'quotes', label: 'Quotes', icon: 'mgc_file_check_line' },
            { key: 'sales-reps', label: 'Sales Reps', icon: 'mgc_user_star_line' },
            { key: 'marketing', label: 'Marketing & Forms', icon: 'mgc_megaphone_line' },
            { key: 'accounts', label: 'Accounts & Orgs', icon: 'mgc_community_line' },
            { key: 'forecast', label: 'Revenue Forecast', icon: 'mgc_trending_up_line' },
            { key: 'inventory', label: 'Inventory & Stock', icon: 'mgc_store_2_line' },
            { key: 'win-loss', label: 'Win / Loss', icon: 'mgc_trophy_line' },
            { key: 'product-service-mix', label: 'Product vs Service', icon: 'mgc_shuffle_line' },
            { key: 'stale-leads', label: 'Stale Leads', icon: 'mgc_alarm_line' },
          ].map((tabItem) => {
            const isActive = activeTab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                type="button"
                onClick={() => handleTabSwitch(tabItem.key as ReportTabType)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#0e90d9] text-white shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <i className={`${tabItem.icon} text-sm`} />
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Box (.fb) matching Sales CRM · Reports 1.html */}
      {activeTab !== 'overview' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-2xs space-y-3.5">
          {/* 1. Quick Views Chips */}
          {currentQuickViews.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                Quick Views:
              </span>
              {currentQuickViews.map((qv, qvIdx) => {
                const isSelected = Object.entries(qv.filters).every(([key, val]) => {
                  return String((filterState as any)[key] ?? '') === String(val ?? '');
                });

                return (
                  <button
                    key={qvIdx}
                    type="button"
                    onClick={() => {
                      setFilterState(qv.filters);
                      fetchCurrentTabReport();
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      isSelected
                        ? 'bg-[#0e90d9] text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {qv.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Dates Row (.dates) */}
          {activeTab === 'inventory' ? (
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 font-medium">
                <i className="mgc_store_2_line text-sm text-[#0e90d9]" />
                <span>Inventory valuation & physical stock: <strong className="text-gray-800 dark:text-gray-200">Real-time warehouse balance on hand</strong></span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'all', label: 'All Time' },
                  { key: 'today', label: 'Today' },
                  { key: '7', label: 'Last 7 days' },
                  { key: '30', label: 'Last 30 days' },
                  { key: '90', label: 'Last 90 days' },
                  { key: 'month', label: 'This month' },
                  { key: 'next30', label: 'Next 30 days' },
                  { key: 'next90', label: 'Next 90 days' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setFilterState({ datePreset: preset.key });
                      fetchCurrentTabReport();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      filterState.datePreset === preset.key
                        ? 'border-[#0e90d9] bg-blue-50 text-[#0e90d9] dark:bg-blue-950/40 dark:border-blue-700 font-semibold'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-gray-500 dark:text-gray-400">From</span>
                  <input
                    type="date"
                    value={filterState.fromDate}
                    onChange={(e) => {
                      setFilterState({ fromDate: e.target.value, datePreset: '' });
                    }}
                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                  <span className="text-gray-500 dark:text-gray-400">To</span>
                  <input
                    type="date"
                    value={filterState.toDate}
                    onChange={(e) => {
                      setFilterState({ toDate: e.target.value, datePreset: '' });
                    }}
                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </div>

              <div className="text-gray-500 dark:text-gray-400 text-[11px] font-medium">
                Date basis: <span className="font-semibold text-gray-700 dark:text-gray-300">{currentMeta.basis}</span>
              </div>
            </div>
          )}

          {/* 3. Filter Grid (.fgrid) customized per active report */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            {/* Lead Summary Filters */}
            {activeTab === 'leads' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Lead Name</label>
                  <input
                    type="text"
                    placeholder="Search title…"
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState({ searchQuery: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Owner</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Organization</label>
                  <select
                    value={filterState.selectedOrg}
                    onChange={(e) => setFilterState({ selectedOrg: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.organizations.map((org) => (
                      <option key={org.id} value={org.name}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Lead Source</label>
                  <select
                    value={filterState.selectedSourceId}
                    onChange={(e) => setFilterState({ selectedSourceId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.sources.map((src) => (
                      <option key={src.id} value={src.name}>{src.name}</option>
                    ))}
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Lead Type</label>
                  <select
                    value={filterState.selectedTypeId}
                    onChange={(e) => setFilterState({ selectedTypeId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.types.map((t) => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pipeline</label>
                  <select
                    value={filterState.selectedPipelineId}
                    onChange={(e) => handlePipelineChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.pipelines.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Stage</label>
                  <select
                    value={filterState.selectedStageId}
                    onChange={(e) => setFilterState({ selectedStageId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {availableStages.map((st) => (
                      <option key={st.id} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Outcome</label>
                  <select
                    value={filterState.selectedOutcome}
                    onChange={(e) => setFilterState({ selectedOutcome: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Expected close from</label>
                  <input
                    type="date"
                    value={filterState.expectedCloseFrom}
                    onChange={(e) => setFilterState({ expectedCloseFrom: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Expected close to</label>
                  <input
                    type="date"
                    value={filterState.expectedCloseTo}
                    onChange={(e) => setFilterState({ expectedCloseTo: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </>
            )}

            {/* Lead Sources Filters */}
            {activeTab === 'sources' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Lead Source</label>
                  <select
                    value={filterState.selectedSourceId}
                    onChange={(e) => setFilterState({ selectedSourceId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.sources.map((src) => (
                      <option key={src.id} value={src.name}>{src.name}</option>
                    ))}
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Owner</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pipeline</label>
                  <select
                    value={filterState.selectedPipelineId}
                    onChange={(e) => handlePipelineChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.pipelines.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Lead Type</label>
                  <select
                    value={filterState.selectedTypeId}
                    onChange={(e) => setFilterState({ selectedTypeId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.types.map((t) => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Organization</label>
                  <select
                    value={filterState.selectedOrg}
                    onChange={(e) => setFilterState({ selectedOrg: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.organizations.map((org) => (
                      <option key={org.id} value={org.name}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Outcome</label>
                  <select
                    value={filterState.selectedOutcome}
                    onChange={(e) => setFilterState({ selectedOutcome: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </>
            )}

            {/* Product Value Filters */}
            {activeTab === 'product-value' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Product</label>
                  <select
                    value={
                      filterOptions?.products.find(
                        (p) => p.name === filterState.selectedProductId || String(p.id) === filterState.selectedProductId
                      )?.name || filterState.selectedProductId || ''
                    }
                    onChange={(e) => setFilterState({ selectedProductId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.products.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Product Type</label>
                  <select
                    value={filterState.selectedProductType || ''}
                    onChange={(e) => setFilterState({ selectedProductType: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Types</option>
                    <option value="Product">Physical Product</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Owner</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pipeline</label>
                  <select
                    value={filterState.selectedPipelineId}
                    onChange={(e) => handlePipelineChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.pipelines.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Stage</label>
                  <select
                    value={filterState.selectedStageId}
                    onChange={(e) => setFilterState({ selectedStageId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {availableStages.map((st) => (
                      <option key={st.id} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Warehouse</label>
                  <select
                    value={filterState.selectedWarehouseId}
                    onChange={(e) => setFilterState({ selectedWarehouseId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.warehouses.map((w) => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Outcome</label>
                  <select
                    value={filterState.selectedOutcome}
                    onChange={(e) => setFilterState({ selectedOutcome: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </>
            )}

            {/* Product Lines Filters */}
            {activeTab === 'product-lines' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Lead / Product Search</label>
                  <input
                    type="text"
                    placeholder="Search…"
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState({ searchQuery: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Product</label>
                  <select
                    value={
                      filterOptions?.products.find(
                        (p) => p.name === filterState.selectedProductId || String(p.id) === filterState.selectedProductId
                      )?.name || filterState.selectedProductId || ''
                    }
                    onChange={(e) => setFilterState({ selectedProductId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.products.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Product Type</label>
                  <select
                    value={filterState.selectedProductType || ''}
                    onChange={(e) => setFilterState({ selectedProductType: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Types</option>
                    <option value="Product">Physical Product</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Owner</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Warehouse</label>
                  <select
                    value={filterState.selectedWarehouseId}
                    onChange={(e) => setFilterState({ selectedWarehouseId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.warehouses.map((w) => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pipeline</label>
                  <select
                    value={filterState.selectedPipelineId}
                    onChange={(e) => handlePipelineChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.pipelines.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Stage</label>
                  <select
                    value={filterState.selectedStageId}
                    onChange={(e) => setFilterState({ selectedStageId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {availableStages.map((st) => (
                      <option key={st.id} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Sales Pipeline Filters */}
            {activeTab === 'pipeline' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pipeline</label>
                  <select
                    value={filterState.selectedPipelineId}
                    onChange={(e) => handlePipelineChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.pipelines.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Stage</label>
                  <select
                    value={filterState.selectedStageId}
                    onChange={(e) => setFilterState({ selectedStageId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {availableStages.map((st) => (
                      <option key={st.id} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Owner</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Outcome</label>
                  <select
                    value={filterState.selectedOutcome}
                    onChange={(e) => setFilterState({ selectedOutcome: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Min value (₹)</label>
                  <input
                    type="number"
                    value={filterState.minValue}
                    onChange={(e) => setFilterState({ minValue: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </>
            )}

            {/* Activities Filters */}
            {activeTab === 'activities' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Activity Type</label>
                  <select
                    value={filterState.activityType}
                    onChange={(e) => setFilterState({ activityType: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Task">Task</option>
                    <option value="Email">Email</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Note">Note</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Assigned To</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <select
                    value={filterState.activityStatus}
                    onChange={(e) => setFilterState({ activityStatus: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Overdue</label>
                  <select
                    value={filterState.activityOverdueOnly}
                    onChange={(e) => setFilterState({ activityOverdueOnly: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    <option value="yes">Overdue only</option>
                    <option value="no">Not overdue</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Search Lead</label>
                  <input
                    type="text"
                    placeholder="Search…"
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState({ searchQuery: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Person / Contact</label>
                  <select
                    value={filterState.selectedPerson}
                    onChange={(e) => setFilterState({ selectedPerson: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.persons.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Quotes Filters */}
            {activeTab === 'quotes' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Lead / Person</label>
                  <input
                    type="text"
                    placeholder="Search…"
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState({ searchQuery: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Owner</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Quote Status</label>
                  <select
                    value={filterState.quoteStatus}
                    onChange={(e) => setFilterState({ quoteStatus: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Expiry</label>
                  <select
                    value={filterState.quoteExpiry}
                    onChange={(e) => setFilterState({ quoteExpiry: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All</option>
                    <option value="expired">Expired</option>
                    <option value="valid">Not expired</option>
                    <option value="soon">Expiring soon</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Expiring-Soon Window</label>
                  <select
                    value={filterState.quoteSoonDays}
                    onChange={(e) => setFilterState({ quoteSoonDays: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Min value (₹)</label>
                  <input
                    type="number"
                    value={filterState.minValue}
                    onChange={(e) => setFilterState({ minValue: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </>
            )}

            {/* Sales Reps Filters */}
            {activeTab === 'sales-reps' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Sales Representative</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Reps</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Accounts Filters */}
            {activeTab === 'accounts' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Search Account / Org</label>
                  <input
                    type="text"
                    placeholder="Search organization…"
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState({ searchQuery: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </>
            )}

            {/* Forecast Filters */}
            {activeTab === 'forecast' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pipeline</label>
                  <select
                    value={filterState.selectedPipelineId}
                    onChange={(e) => setFilterState({ selectedPipelineId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Pipelines</option>
                    {filterOptions?.pipelines.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Inventory Filters */}
            {activeTab === 'inventory' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Warehouse Hub</label>
                  <select
                    value={filterState.selectedWarehouseId}
                    onChange={(e) => setFilterState({ selectedWarehouseId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Warehouses</option>
                    {filterOptions?.warehouses.map((w) => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Search Item / SKU</label>
                  <input
                    type="text"
                    placeholder="Search product or SKU…"
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState({ searchQuery: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </>
            )}

            {/* Win / Loss Filters */}
            {activeTab === 'win-loss' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Deal Type</label>
                  <select
                    value={filterState.selectedDealType || ''}
                    onChange={(e) => setFilterState({ selectedDealType: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Deal Types</option>
                    <option value="Product only">Product only</option>
                    <option value="Service only">Service only</option>
                    <option value="Product + Service">Product + Service</option>
                    <option value="No items">No items</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Outcome</label>
                  <select
                    value={filterState.selectedOutcome}
                    onChange={(e) => setFilterState({ selectedOutcome: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Won + Lost (All)</option>
                    <option value="won">Won Only</option>
                    <option value="lost">Lost Only</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Owner</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Owners</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Source</label>
                  <select
                    value={filterState.selectedSourceId}
                    onChange={(e) => setFilterState({ selectedSourceId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Sources</option>
                    {filterOptions?.sources.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pipeline</label>
                  <select
                    value={filterState.selectedPipelineId}
                    onChange={(e) => setFilterState({ selectedPipelineId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Pipelines</option>
                    {filterOptions?.pipelines.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Search</label>
                  <input
                    type="text"
                    placeholder="Search deal or client…"
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState({ searchQuery: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </>
            )}

            {/* Product vs Service Mix Filters */}
            {activeTab === 'product-service-mix' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Offering Type</label>
                  <select
                    value={filterState.selectedProductType || ''}
                    onChange={(e) => setFilterState({ selectedProductType: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Offerings (Products & Services)</option>
                    <option value="Product">Physical Products Only</option>
                    <option value="Service">Services Only</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Deal Outcome</label>
                  <select
                    value={filterState.selectedOutcome}
                    onChange={(e) => setFilterState({ selectedOutcome: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Outcomes</option>
                    <option value="open">Open Pipeline</option>
                    <option value="won">Won Deals</option>
                    <option value="lost">Lost Deals</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Owner</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Owners</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pipeline</label>
                  <select
                    value={filterState.selectedPipelineId}
                    onChange={(e) => setFilterState({ selectedPipelineId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Pipelines</option>
                    {filterOptions?.pipelines.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Search</label>
                  <input
                    type="text"
                    placeholder="Search offering or lead…"
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState({ searchQuery: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </>
            )}

            {/* Stale Leads Filters */}
            {activeTab === 'stale-leads' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Follow-up Issue</label>
                  <select
                    value={filterState.selectedIssueFlag || ''}
                    onChange={(e) => setFilterState({ selectedIssueFlag: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Open Deals</option>
                    <option value="No next step">No next step</option>
                    <option value="No recent activity">No recent activity</option>
                    <option value="Past close date">Past close date</option>
                    <option value="Missing details">Missing details</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Inactivity Window</label>
                  <select
                    value={String(filterState.selectedStaleDays || '14')}
                    onChange={(e) => setFilterState({ selectedStaleDays: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="7">Idle over 7 days</option>
                    <option value="14">Idle over 14 days (Standard)</option>
                    <option value="30">Idle over 30 days (High Risk)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Owner</label>
                  <select
                    value={filterState.selectedOwnerId}
                    onChange={(e) => setFilterState({ selectedOwnerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Owners</option>
                    {filterOptions?.owners.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pipeline</label>
                  <select
                    value={filterState.selectedPipelineId}
                    onChange={(e) => setFilterState({ selectedPipelineId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Pipelines</option>
                    {filterOptions?.pipelines.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Search</label>
                  <input
                    type="text"
                    placeholder="Search lead or client…"
                    value={filterState.searchQuery}
                    onChange={(e) => setFilterState({ searchQuery: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  />
                </div>
              </>
            )}
          </div>

          {/* 4. Applied Filters Tags Strip (.applied) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
            <span className="text-gray-400 text-[11px]">Showing</span>
            {activeTab === 'inventory' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
                Real-time Stock on Hand
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px]">
                {currentMeta.basis}: {formatDateDisplay(filterState.fromDate)} – {formatDateDisplay(filterState.toDate)}
              </span>
            )}

            {filterState.searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Search: "{filterState.searchQuery}"
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ searchQuery: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedPipelineId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Pipeline: {filterState.selectedPipelineId}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedPipelineId: '', selectedStageId: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedStageId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Stage: {filterState.selectedStageId}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedStageId: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.activityType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Type: {filterState.activityType}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ activityType: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.activityStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Status: {filterState.activityStatus}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ activityStatus: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.activityOverdueOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Overdue: {filterState.activityOverdueOnly === 'yes' ? 'Yes' : 'No'}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ activityOverdueOnly: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedPerson && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Person: {filterState.selectedPerson}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedPerson: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedOwnerId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Owner: {filterState.selectedOwnerId}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedOwnerId: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedOrg && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Org: {filterState.selectedOrg}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedOrg: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedSourceId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Source: {filterState.selectedSourceId}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedSourceId: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedOutcome && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Outcome: {filterState.selectedOutcome}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedOutcome: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedWarehouseId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Warehouse: {filterState.selectedWarehouseId}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedWarehouseId: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedProductId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Product: {filterOptions?.products.find((p) => p.name === filterState.selectedProductId || String(p.id) === filterState.selectedProductId)?.name || filterState.selectedProductId}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedProductId: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.agingFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Aging: {filterState.agingFilter}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ agingFilter: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.selectedProductType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Type: {filterState.selectedProductType}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ selectedProductType: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {filterState.quoteStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Status: {filterState.quoteStatus}
                <button
                  type="button"
                  onClick={() => {
                    setFilterState({ quoteStatus: '' });
                    fetchCurrentTabReport();
                  }}
                  className="hover:text-red-500 ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                resetFilters();
                fetchCurrentTabReport();
              }}
              className="text-[#0e90d9] hover:underline text-[11px] font-medium ml-2"
            >
              Clear filters
            </button>

            <span className="ml-auto text-gray-400 text-[11px]">
              Generated {formatDateTimeDisplay(new Date().toISOString())}
            </span>
          </div>
        </div>
      )}

      {/* Error notification if any */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="mgc_alert_fill text-rose-600 text-base" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchCurrentTabReport}
            className="text-xs font-semibold text-rose-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0e90d9]" />
        </div>
      )}

      {/* Tab Subviews Content */}
      {!loading && (
        <div>
          {activeTab === 'overview' && (
            <OverviewReport
              overviewData={overviewData}
              onNavigateTab={(targetTab) => {
                setActiveTab(targetTab);
                navigate(`/reports/${targetTab}`);
              }}
            />
          )}

          {activeTab === 'leads' && (
            <LeadSummaryReport
              reportData={leadSummaryData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchLeadSummaryReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchLeadSummaryReport();
              }}
              onOpenDrawer={handleOpenLeadDrawer}
            />
          )}

          {activeTab === 'sources' && (
            <LeadSourcesReport
              reportData={leadSourcesData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchLeadSourcesReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchLeadSourcesReport();
              }}
              onDrillDownSource={(sourceName) => {
                setFilterState({ selectedSourceId: sourceName });
                navigate('/reports/leads');
              }}
            />
          )}

          {activeTab === 'product-value' && (
            <ProductValueReport
              reportData={productValueData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchProductValueReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchProductValueReport();
              }}
              onSelectProduct={(productName) => {
                const matched = filterOptions?.products.find(
                  (p) => p.name === productName || String(p.id) === String(productName)
                );
                const prodName = matched ? matched.name : productName;
                handleTabSwitch('product-lines', { selectedProductId: prodName });
                fetchProductLinesReport({ selectedProductId: prodName });
              }}
            />
          )}

          {activeTab === 'product-lines' && (
            <ProductLinesReport
              reportData={productLinesData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchProductLinesReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchProductLinesReport();
              }}
              onOpenLeadDrawer={handleOpenLeadDrawerById}
            />
          )}

          {activeTab === 'pipeline' && (
            <PipelineReport
              reportData={pipelineData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchPipelineReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchPipelineReport();
              }}
              onOpenLeadDrawer={handleOpenLeadDrawerById}
              onDrillDownStage={(stageName) => {
                setFilterState({ selectedStageId: stageName });
                navigate('/reports/leads');
              }}
            />
          )}

          {activeTab === 'activities' && (
            <ActivitiesReport
              reportData={activitiesData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchActivitiesReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchActivitiesReport();
              }}
              onOpenDrawer={handleOpenActivityDrawer}
              onOpenLeadDrawer={handleOpenLeadDrawerById}
            />
          )}

          {activeTab === 'quotes' && (
            <QuotesReport
              reportData={quotesData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchQuotesReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchQuotesReport();
              }}
              onOpenDrawer={handleOpenQuoteDrawer}
              onOpenLeadDrawer={handleOpenLeadDrawerById}
            />
          )}

          {activeTab === 'sales-reps' && (
            <SalesRepReport
              reportData={salesRepsData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchSalesRepsReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchSalesRepsReport();
              }}
            />
          )}

          {activeTab === 'marketing' && (
            <MarketingReport
              reportData={marketingData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchMarketingReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchMarketingReport();
              }}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsReport
              reportData={accountsData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchAccountsReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchAccountsReport();
              }}
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastReport
              reportData={forecastData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchForecastReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchForecastReport();
              }}
              onOpenLeadDrawer={handleOpenLeadDrawerById}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryReport
              reportData={inventoryData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchInventoryReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchInventoryReport();
              }}
            />
          )}

          {activeTab === 'win-loss' && (
            <WinLossReport
              reportData={winLossData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchWinLossReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchWinLossReport();
              }}
              onOpenDrawer={handleOpenLeadDrawer}
            />
          )}

          {activeTab === 'product-service-mix' && (
            <ProductServiceMixReport
              reportData={productServiceMixData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchProductServiceMixReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchProductServiceMixReport();
              }}
            />
          )}

          {activeTab === 'stale-leads' && (
            <StaleLeadsReport
              reportData={staleLeadsData}
              filterState={filterState}
              onFilterChange={(updates) => {
                setFilterState(updates);
                fetchStaleLeadsReport(updates);
              }}
              onClearFilters={() => {
                resetFilters();
                fetchStaleLeadsReport();
              }}
              onOpenDrawer={handleOpenLeadDrawer}
            />
          )}
        </div>
      )}

      {/* Record Slide-over Drawer */}
      <RecordDrawer
        drawerState={drawerState}
        onClose={() => setDrawerState((prev) => ({ ...prev, isOpen: false }))}
        onOpenRecord={handleOpenRecordFromTypeAndId}
      />
    </div>
  );
};

export default ReportsPage;
