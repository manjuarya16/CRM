import { create } from 'zustand';
import { API } from '@/config';
import {
  IReportStore,
  IReportFilterState,
  ReportTabType,
} from '@/interface';

const calculatePresetDateRange = (preset: string): { from: string; to: string } => {
  const currentDate = new Date();
  const formatIsoDate = (targetDate: Date) => {
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toDateString = formatIsoDate(currentDate);

  if (preset === 'today') {
    return { from: toDateString, to: toDateString };
  }
  if (preset === '7') {
    const pastDate = new Date(currentDate);
    pastDate.setDate(currentDate.getDate() - 6);
    return { from: formatIsoDate(pastDate), to: toDateString };
  }
  if (preset === '30') {
    const pastDate = new Date(currentDate);
    pastDate.setDate(currentDate.getDate() - 29);
    return { from: formatIsoDate(pastDate), to: toDateString };
  }
  if (preset === '90') {
    const pastDate = new Date(currentDate);
    pastDate.setDate(currentDate.getDate() - 89);
    return { from: formatIsoDate(pastDate), to: toDateString };
  }
  if (preset === 'month') {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return { from: formatIsoDate(startOfMonth), to: formatIsoDate(endOfMonth) };
  }
  if (preset === 'next14') {
    const futureDate = new Date(currentDate);
    futureDate.setDate(currentDate.getDate() + 14);
    return { from: toDateString, to: formatIsoDate(futureDate) };
  }

  // Default to 90 days
  const defaultPastDate = new Date(currentDate);
  defaultPastDate.setDate(currentDate.getDate() - 89);
  return { from: formatIsoDate(defaultPastDate), to: toDateString };
};

const initialDefaultDates = calculatePresetDateRange('90');

const initialFilterState: IReportFilterState = {
  datePreset: '90',
  fromDate: initialDefaultDates.from,
  toDate: initialDefaultDates.to,
  searchQuery: '',
  selectedOwnerId: '',
  selectedOrg: '',
  selectedSourceId: '',
  selectedTypeId: '',
  selectedPipelineId: '',
  selectedStageId: '',
  selectedOutcome: '',
  minValue: '',
  maxValue: '',
  expectedCloseFrom: '',
  expectedCloseTo: '',
  agingFilter: '',
  selectedWarehouseId: '',
  selectedProductId: '',
  selectedPerson: '',
  activityType: '',
  activityStatus: '',
  activityOverdueOnly: '',
  quoteStatus: '',
  quoteExpiry: '',
  quoteSoonDays: '7',
  quoteExpiresFrom: '',
  quoteExpiresTo: '',
};

export const useReportStore = create<IReportStore>((set, get) => ({
  overviewData: null,
  leadSummaryData: null,
  leadSourcesData: null,
  productValueData: null,
  productLinesData: null,
  pipelineData: null,
  activitiesData: null,
  quotesData: null,
  filterOptions: null,
  loading: false,
  error: null,
  activeTab: 'overview',
  filterState: { ...initialFilterState },

  setActiveTab: (tab: ReportTabType) => {
    set({ activeTab: tab });
  },

  setFilterState: (updates: Partial<IReportFilterState>) => {
    const currentFilters = get().filterState;
    let nextFilters = { ...currentFilters, ...updates };

    if (updates.datePreset && updates.datePreset !== currentFilters.datePreset) {
      const computedRange = calculatePresetDateRange(updates.datePreset);
      nextFilters = {
        ...nextFilters,
        fromDate: computedRange.from,
        toDate: computedRange.to,
      };
    }

    set({ filterState: nextFilters });
  },

  resetFilters: () => {
    const defaultDates = calculatePresetDateRange('90');
    set({
      filterState: {
        ...initialFilterState,
        fromDate: defaultDates.from,
        toDate: defaultDates.to,
      },
    });
  },

  fetchFilterOptions: async () => {
    try {
      const response = await API.get('/reports/filter-options');
      if (response.data?.success) {
        set({ filterOptions: response.data.data });
      }
    } catch (error: any) {
      // Non-blocking for report display
      console.warn('Could not load report filter options:', error.message);
    }
  },

  fetchReportOverview: async () => {
    set({ loading: true, error: null });
    try {
      const response = await API.get('/reports/overview');
      if (response.data?.success) {
        set({ overviewData: response.data.data });
      } else {
        set({ error: response.data?.message || 'Failed to fetch report overview' });
      }
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message || 'Error fetching report overview' });
    } finally {
      set({ loading: false });
    }
  },

  fetchLeadSummaryReport: async (customFilters?: Partial<IReportFilterState>) => {
    set({ loading: true, error: null });
    try {
      const activeFilters = { ...get().filterState, ...(customFilters || {}) };
      const queryParams = new URLSearchParams();

      if (activeFilters.fromDate) queryParams.append('from', activeFilters.fromDate);
      if (activeFilters.toDate) queryParams.append('to', activeFilters.toDate);
      if (activeFilters.selectedOwnerId) queryParams.append('owner', activeFilters.selectedOwnerId);
      if (activeFilters.selectedSourceId) queryParams.append('source', activeFilters.selectedSourceId);
      if (activeFilters.selectedTypeId) queryParams.append('type', activeFilters.selectedTypeId);
      if (activeFilters.selectedPipelineId) queryParams.append('pipeline', activeFilters.selectedPipelineId);
      if (activeFilters.selectedStageId) queryParams.append('stage', activeFilters.selectedStageId);
      if (activeFilters.selectedOrg) queryParams.append('org', activeFilters.selectedOrg);
      if (activeFilters.selectedOutcome) queryParams.append('outcome', activeFilters.selectedOutcome);
      if (activeFilters.minValue) queryParams.append('min_value', activeFilters.minValue);
      if (activeFilters.maxValue) queryParams.append('max_value', activeFilters.maxValue);
      if (activeFilters.searchQuery) queryParams.append('search', activeFilters.searchQuery);
      if (activeFilters.expectedCloseFrom) queryParams.append('ec_from', activeFilters.expectedCloseFrom);
      if (activeFilters.expectedCloseTo) queryParams.append('ec_to', activeFilters.expectedCloseTo);
      if (activeFilters.agingFilter) queryParams.append('aging', activeFilters.agingFilter);

      const response = await API.get(`/reports/leads?${queryParams.toString()}`);
      if (response.data?.success) {
        set({ leadSummaryData: response.data.data });
      } else {
        set({ error: response.data?.message || 'Failed to fetch lead summary report' });
      }
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message || 'Error fetching lead summary report' });
    } finally {
      set({ loading: false });
    }
  },

  fetchLeadSourcesReport: async (customFilters?: Partial<IReportFilterState>) => {
    set({ loading: true, error: null });
    try {
      const activeFilters = { ...get().filterState, ...(customFilters || {}) };
      const queryParams = new URLSearchParams();

      if (activeFilters.fromDate) queryParams.append('from', activeFilters.fromDate);
      if (activeFilters.toDate) queryParams.append('to', activeFilters.toDate);
      if (activeFilters.selectedSourceId) queryParams.append('source', activeFilters.selectedSourceId);
      if (activeFilters.selectedOwnerId) queryParams.append('owner', activeFilters.selectedOwnerId);
      if (activeFilters.selectedPipelineId) queryParams.append('pipeline', activeFilters.selectedPipelineId);
      if (activeFilters.selectedTypeId) queryParams.append('type', activeFilters.selectedTypeId);
      if (activeFilters.selectedOrg) queryParams.append('org', activeFilters.selectedOrg);
      if (activeFilters.selectedOutcome) queryParams.append('outcome', activeFilters.selectedOutcome);

      const response = await API.get(`/reports/sources?${queryParams.toString()}`);
      if (response.data?.success) {
        set({ leadSourcesData: response.data.data });
      } else {
        set({ error: response.data?.message || 'Failed to fetch lead sources report' });
      }
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message || 'Error fetching lead sources report' });
    } finally {
      set({ loading: false });
    }
  },

  fetchProductValueReport: async (customFilters?: Partial<IReportFilterState>) => {
    set({ loading: true, error: null });
    try {
      const activeFilters = { ...get().filterState, ...(customFilters || {}) };
      const queryParams = new URLSearchParams();

      if (activeFilters.fromDate) queryParams.append('from', activeFilters.fromDate);
      if (activeFilters.toDate) queryParams.append('to', activeFilters.toDate);
      if (activeFilters.selectedProductId) queryParams.append('product', activeFilters.selectedProductId);
      if (activeFilters.selectedOwnerId) queryParams.append('owner', activeFilters.selectedOwnerId);
      if (activeFilters.selectedPipelineId) queryParams.append('pipeline', activeFilters.selectedPipelineId);
      if (activeFilters.selectedStageId) queryParams.append('stage', activeFilters.selectedStageId);
      if (activeFilters.selectedOrg) queryParams.append('org', activeFilters.selectedOrg);
      if (activeFilters.selectedOutcome) queryParams.append('outcome', activeFilters.selectedOutcome);
      if (activeFilters.selectedWarehouseId) queryParams.append('warehouse', activeFilters.selectedWarehouseId);

      const response = await API.get(`/reports/product-value?${queryParams.toString()}`);
      if (response.data?.success) {
        set({ productValueData: response.data.data });
      } else {
        set({ error: response.data?.message || 'Failed to fetch product value report' });
      }
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message || 'Error fetching product value report' });
    } finally {
      set({ loading: false });
    }
  },

  fetchProductLinesReport: async (customFilters?: Partial<IReportFilterState>) => {
    set({ loading: true, error: null });
    try {
      const activeFilters = { ...get().filterState, ...(customFilters || {}) };
      const queryParams = new URLSearchParams();

      if (activeFilters.fromDate) queryParams.append('from', activeFilters.fromDate);
      if (activeFilters.toDate) queryParams.append('to', activeFilters.toDate);
      if (activeFilters.selectedProductId) queryParams.append('product', activeFilters.selectedProductId);
      if (activeFilters.selectedOwnerId) queryParams.append('owner', activeFilters.selectedOwnerId);
      if (activeFilters.selectedWarehouseId) queryParams.append('warehouse', activeFilters.selectedWarehouseId);
      if (activeFilters.selectedPipelineId) queryParams.append('pipeline', activeFilters.selectedPipelineId);
      if (activeFilters.selectedStageId) queryParams.append('stage', activeFilters.selectedStageId);
      if (activeFilters.searchQuery) queryParams.append('search', activeFilters.searchQuery);

      const response = await API.get(`/reports/product-lines?${queryParams.toString()}`);
      if (response.data?.success) {
        set({ productLinesData: response.data.data });
      } else {
        set({ error: response.data?.message || 'Failed to fetch product lines report' });
      }
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message || 'Error fetching product lines report' });
    } finally {
      set({ loading: false });
    }
  },

  fetchPipelineReport: async (customFilters?: Partial<IReportFilterState>) => {
    set({ loading: true, error: null });
    try {
      const activeFilters = { ...get().filterState, ...(customFilters || {}) };
      const queryParams = new URLSearchParams();

      if (activeFilters.fromDate) queryParams.append('from', activeFilters.fromDate);
      if (activeFilters.toDate) queryParams.append('to', activeFilters.toDate);
      if (activeFilters.selectedPipelineId) queryParams.append('pipeline', activeFilters.selectedPipelineId);
      if (activeFilters.selectedStageId) queryParams.append('stage', activeFilters.selectedStageId);
      if (activeFilters.selectedOwnerId) queryParams.append('owner', activeFilters.selectedOwnerId);
      if (activeFilters.selectedOutcome) queryParams.append('outcome', activeFilters.selectedOutcome);
      if (activeFilters.agingFilter) queryParams.append('aging', activeFilters.agingFilter);

      const response = await API.get(`/reports/pipeline?${queryParams.toString()}`);
      if (response.data?.success) {
        set({ pipelineData: response.data.data });
      } else {
        set({ error: response.data?.message || 'Failed to fetch pipeline report' });
      }
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message || 'Error fetching pipeline report' });
    } finally {
      set({ loading: false });
    }
  },

  fetchActivitiesReport: async (customFilters?: Partial<IReportFilterState>) => {
    set({ loading: true, error: null });
    try {
      const activeFilters = { ...get().filterState, ...(customFilters || {}) };
      const queryParams = new URLSearchParams();

      if (activeFilters.fromDate) queryParams.append('from', activeFilters.fromDate);
      if (activeFilters.toDate) queryParams.append('to', activeFilters.toDate);
      if (activeFilters.selectedOwnerId) queryParams.append('user', activeFilters.selectedOwnerId);
      if (activeFilters.activityType) queryParams.append('type', activeFilters.activityType);
      if (activeFilters.activityStatus) queryParams.append('status', activeFilters.activityStatus);
      if (activeFilters.activityOverdueOnly) queryParams.append('overdue', activeFilters.activityOverdueOnly);
      if (activeFilters.searchQuery) queryParams.append('lead', activeFilters.searchQuery);
      if (activeFilters.selectedPerson) queryParams.append('person', activeFilters.selectedPerson);

      const response = await API.get(`/reports/activities?${queryParams.toString()}`);
      if (response.data?.success) {
        set({ activitiesData: response.data.data });
      } else {
        set({ error: response.data?.message || 'Failed to fetch activities report' });
      }
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message || 'Error fetching activities report' });
    } finally {
      set({ loading: false });
    }
  },

  fetchQuotesReport: async (customFilters?: Partial<IReportFilterState>) => {
    set({ loading: true, error: null });
    try {
      const activeFilters = { ...get().filterState, ...(customFilters || {}) };
      const queryParams = new URLSearchParams();

      if (activeFilters.fromDate) queryParams.append('from', activeFilters.fromDate);
      if (activeFilters.toDate) queryParams.append('to', activeFilters.toDate);
      if (activeFilters.selectedOwnerId) queryParams.append('owner', activeFilters.selectedOwnerId);
      if (activeFilters.quoteStatus) queryParams.append('status', activeFilters.quoteStatus);
      if (activeFilters.quoteExpiry) queryParams.append('expiry', activeFilters.quoteExpiry);
      if (activeFilters.quoteSoonDays) queryParams.append('soon_days', activeFilters.quoteSoonDays);
      if (activeFilters.minValue) queryParams.append('min_value', activeFilters.minValue);
      if (activeFilters.maxValue) queryParams.append('max_value', activeFilters.maxValue);
      if (activeFilters.searchQuery) queryParams.append('search', activeFilters.searchQuery);
      if (activeFilters.quoteExpiresFrom) queryParams.append('ex_from', activeFilters.quoteExpiresFrom);
      if (activeFilters.quoteExpiresTo) queryParams.append('ex_to', activeFilters.quoteExpiresTo);

      const response = await API.get(`/reports/quotes?${queryParams.toString()}`);
      if (response.data?.success) {
        set({ quotesData: response.data.data });
      } else {
        set({ error: response.data?.message || 'Failed to fetch quotes report' });
      }
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message || 'Error fetching quotes report' });
    } finally {
      set({ loading: false });
    }
  },
}));
