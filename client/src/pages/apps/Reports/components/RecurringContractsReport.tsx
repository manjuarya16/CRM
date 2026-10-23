import React, { useMemo } from 'react';
import {
  IRecurringContractsReportData,
  IRecurringContractItem,
  IReportColumnDefinition,
  IReportKpiItem,
  IReportFilterState,
  IReportChartDataItem,
} from '@/interface';
import {
  formatCurrencyInr,
  formatCompactInr,
  formatDisplayNumber,
  formatDateDisplay,
} from '../reportHelpers';
import { ReportKpiCards } from './ReportKpiCards';
import {
  ReportPanel,
  HorizontalBarsChart,
  VerticalColumnsChart,
} from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface RecurringContractsReportProps {
  reportData: IRecurringContractsReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onOpenDrawer: (leadId: number, leadTitle: string) => void;
}

export const RecurringContractsReport: React.FC<RecurringContractsReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onOpenDrawer,
}) => {
  const kpis = reportData?.kpis;
  const statusMix = reportData?.status_mix || [];
  const cycleBreakdown = reportData?.cycle_breakdown || [];
  const offeringMix = reportData?.offering_mix || [];
  const upcomingExpiries = reportData?.upcoming_expiries || [];
  const contracts = reportData?.contracts || [];
  const insights = reportData?.insights || [];

  // Top KPI Cards
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Active Contracts',
        value: formatDisplayNumber(kpis.active_contracts),
        subtitle: `${kpis.total_contracts} total recurring`,
        apply: { selectedContractStatus: 'active' },
      },
      {
        label: 'Active MRR',
        value: formatCompactInr(kpis.total_mrr),
        subtitle: 'Monthly Recurring Revenue',
      },
      {
        label: 'Active ARR',
        value: formatCompactInr(kpis.total_arr),
        subtitle: 'Annualized Run-Rate',
      },
      {
        label: 'Total Contract Value',
        value: formatCompactInr(kpis.total_tcv),
        subtitle: 'Full duration commitment',
      },
      {
        label: 'Renewals Due (<= 30d)',
        value: formatDisplayNumber(kpis.expiring_30_count),
        subtitle: `${formatCompactInr(kpis.expiring_30_mrr)} MRR at risk`,
        apply: { selectedContractStatus: 'expiring_30' },
      },
      {
        label: 'Expired Contracts',
        value: formatDisplayNumber(kpis.expired_count),
        subtitle: `${formatCompactInr(kpis.expired_mrr)} past due MRR`,
        apply: { selectedContractStatus: 'expired' },
      },
    ];
  }, [kpis]);

  // Chart 1: Status / Renewal Health Breakdown
  const statusMixChart: IReportChartDataItem[] = useMemo(() => {
    return statusMix.map((item) => ({
      label: item.label,
      value: item.count,
      displayText: `${item.count} (${formatCompactInr(item.value || 0)} MRR)`,
      color: item.color || '#0e90d9',
    }));
  }, [statusMix]);

  // Chart 2: Billing Cycle Breakdown (MRR)
  const cycleChart: IReportChartDataItem[] = useMemo(() => {
    const cycleColors: Record<string, string> = {
      Monthly: '#0e90d9',
      Quarterly: '#8b5cf6',
      'Half-Yearly': '#f59e0b',
      Yearly: '#10b981',
    };
    return cycleBreakdown.map((item) => ({
      label: item.label,
      value: item.total_mrr,
      displayText: `${formatCompactInr(item.total_mrr)} (${item.count} deals)`,
      color: cycleColors[item.label] || '#0e90d9',
    }));
  }, [cycleBreakdown]);

  // Chart 3: Upcoming Expiries Schedule
  const expiriesChart: IReportChartDataItem[] = useMemo(() => {
    return upcomingExpiries.map((item) => ({
      label: item.label,
      value: item.value,
      displayText: formatCompactInr(item.value),
      color: '#0e90d9',
    }));
  }, [upcomingExpiries]);

  // Chart 4: Offering Mix (Products vs Services)
  const offeringChart: IReportChartDataItem[] = useMemo(() => {
    return offeringMix.map((item) => ({
      label: item.label,
      value: item.value,
      displayText: `${formatCompactInr(item.value)} MRR (${item.count || 0} lines)`,
      color: item.label.toLowerCase() === 'service' ? '#8b5cf6' : '#0e90d9',
    }));
  }, [offeringMix]);

  // Table Column Definitions
  const tableColumns: IReportColumnDefinition<IRecurringContractItem>[] = useMemo(
    () => [
      {
        key: 'lead_id',
        header: 'Lead / Deal',
        render: (row) => (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => onOpenDrawer(row.lead_id, row.lead_title)}
              className="text-[#0e90d9] hover:underline font-semibold text-left flex items-center gap-1"
            >
              <span>#{row.lead_id}</span>
              <span className="truncate max-w-[160px] text-gray-900 dark:text-white font-medium">
                {row.lead_title}
              </span>
            </button>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              <span>{row.pipeline_name}</span>
              <span>·</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">{row.stage_name}</span>
            </div>
          </div>
        ),
        exportAccessor: (row) => `#${row.lead_id} ${row.lead_title}`,
      },
      {
        key: 'organization_name',
        header: 'Account / Contact',
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
              {row.organization_name || '—'}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {row.person_name || '—'}
            </span>
          </div>
        ),
        exportAccessor: (row) => `${row.organization_name} (${row.person_name})`,
      },
      {
        key: 'item_name',
        header: 'Offering & SKU',
        render: (row) => {
          const isService = row.item_type?.toLowerCase() === 'service';
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    isService
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}
                >
                  {isService ? 'Service' : 'Product'}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                  {row.item_name}
                </span>
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5 font-mono">
                {row.sku || 'No SKU'} · Qty: {row.quantity}
              </span>
            </div>
          );
        },
        exportAccessor: (row) => `${row.item_type}: ${row.item_name} (${row.sku})`,
      },
      {
        key: 'billing_cycle',
        header: 'Billing Cycle',
        render: (row) => {
          const cycleMap: Record<string, { label: string; badge: string }> = {
            monthly: { label: 'Monthly', badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200' },
            quarterly: { label: 'Quarterly', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200' },
            half_yearly: { label: 'Half-Yearly', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200' },
            yearly: { label: 'Yearly', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200' },
          };
          const info = cycleMap[row.billing_cycle?.toLowerCase()] || {
            label: row.billing_cycle,
            badge: 'bg-gray-100 text-gray-700',
          };
          return (
            <div className="flex flex-col">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${info.badge} w-fit`}>
                {info.label}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {row.contract_duration_months} Months Term
              </span>
            </div>
          );
        },
        exportAccessor: (row) => `${row.billing_cycle} (${row.contract_duration_months} mo)`,
      },
      {
        key: 'contract_start_date',
        header: 'Contract Dates',
        render: (row) => (
          <div className="flex flex-col text-xs font-medium">
            <span className="text-gray-800 dark:text-gray-200">
              {row.contract_start_date ? formatDateDisplay(row.contract_start_date) : '—'}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-[11px] flex items-center gap-1">
              <span>to</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {row.contract_end_date ? formatDateDisplay(row.contract_end_date) : 'Ongoing'}
              </span>
            </span>
          </div>
        ),
        exportAccessor: (row) => `${row.contract_start_date || '—'} to ${row.contract_end_date || 'Ongoing'}`,
      },
      {
        key: 'expiry_status',
        header: 'Renewal Status',
        render: (row) => {
          if (row.expiry_status === 'expired') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300">
                <i className="mgc_alarm_fill text-xs text-red-500" />
                <span>Expired ({Math.abs(row.days_until_expiry)}d ago)</span>
              </span>
            );
          }
          if (row.expiry_status === 'expiring_30') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 animate-pulse">
                <i className="mgc_time_line text-xs text-amber-600" />
                <span>Due in {row.days_until_expiry}d</span>
              </span>
            );
          }
          if (row.expiry_status === 'expiring_60') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 border border-yellow-200">
                <span>Expiring in {row.days_until_expiry}d</span>
              </span>
            );
          }
          if (row.expiry_status === 'expiring_90') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                <span>{row.days_until_expiry}d remaining</span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
              <i className="mgc_check_circle_line text-xs text-emerald-500" />
              <span>Active {row.contract_end_date ? `(${row.days_until_expiry}d left)` : ''}</span>
            </span>
          );
        },
        exportAccessor: (row) => row.expiry_status,
      },
      {
        key: 'mrr',
        header: 'MRR / Cycle Amt',
        isNumeric: true,
        render: (row) => (
          <div className="flex flex-col text-right">
            <span className="font-bold text-gray-900 dark:text-white tabular-nums">
              {formatCurrencyInr(row.mrr)}
              <span className="text-[10px] text-gray-500 font-normal"> / mo</span>
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
              {formatCurrencyInr(row.cycle_amount)} / {row.billing_cycle}
            </span>
          </div>
        ),
        exportAccessor: (row) => row.mrr,
      },
      {
        key: 'total_contract_value',
        header: 'Total Value (TCV)',
        isNumeric: true,
        render: (row) => (
          <div className="flex flex-col text-right">
            <span className="font-bold text-[#0e90d9] tabular-nums">
              {formatCurrencyInr(row.total_contract_value)}
            </span>
            <span className="text-[11px] text-gray-400 tabular-nums">
              ARR: {formatCompactInr(row.arr)}
            </span>
          </div>
        ),
        exportAccessor: (row) => row.total_contract_value,
      },
      {
        key: 'owner_name',
        header: 'Sales Rep',
        render: (row) => (
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
            {row.owner_name || '—'}
          </span>
        ),
        exportAccessor: (row) => row.owner_name,
      },
    ],
    [onOpenDrawer]
  );

  return (
    <div className="space-y-6">
      {/* 1. KPI Metric Cards */}
      <ReportKpiCards kpiItems={kpiItems} onKpiClick={(apply) => onFilterChange(apply)} />

      {/* 2. Automated Smart Insights Banner */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/80 dark:to-gray-800 border border-blue-200/80 dark:border-blue-900/50 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0e90d9]/10 text-[#0e90d9] flex items-center justify-center shrink-0 mt-0.5">
              <i className="mgc_sparkles_line text-base" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Recurring & Contract Intelligence
              </h4>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {insights.map((insight, idx) => (
                  <p key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0e90d9]" />
                    <span>{insight}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Visual Charts Grid (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ReportPanel
          title="Renewal & Expiry Pipeline"
          subtitle="Contracts categorized by urgency and remaining contract days"
        >
          <HorizontalBarsChart
            items={statusMixChart}
            emptyMessage="No recurring contracts found in current filter range."
          />
        </ReportPanel>

        <ReportPanel
          title="Monthly Recurring Revenue (MRR) by Cycle"
          subtitle="Normalized monthly recurring revenue contribution by billing frequency"
        >
          <HorizontalBarsChart
            items={cycleChart}
            emptyMessage="No cycle data available."
          />
        </ReportPanel>

        <ReportPanel
          title="Upcoming Expiries Schedule (Next 12 Months)"
          subtitle="Projected monthly contract expiry volume to schedule proactive renewal outreach"
        >
          <VerticalColumnsChart
            items={expiriesChart}
            emptyMessage="No contracts expiring in the next 12 months."
          />
        </ReportPanel>

        <ReportPanel
          title="Recurring Revenue by Offering Type"
          subtitle="MRR breakdown between recurring Services vs physical recurring Products"
        >
          <HorizontalBarsChart
            items={offeringChart}
            emptyMessage="No product/service breakdown available."
          />
        </ReportPanel>
      </div>

      {/* 4. Filter chips toolbar & Detailed Contracts Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
              Status Filter:
            </span>
            {[
              { label: 'All Contracts', value: '' },
              { label: 'Active', value: 'active' },
              { label: 'Renewals Due (<=30d)', value: 'expiring_30' },
              { label: 'Expiring in 60d', value: 'expiring_60' },
              { label: 'Expired', value: 'expired' },
            ].map((btn) => {
              const isSelected = (filterState.selectedContractStatus || '') === btn.value;
              return (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => onFilterChange({ selectedContractStatus: btn.value })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? 'bg-[#0e90d9] text-white shadow-2xs font-semibold'
                      : 'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
              Cycle:
            </span>
            {[
              { label: 'All', value: '' },
              { label: 'Monthly', value: 'monthly' },
              { label: 'Quarterly', value: 'quarterly' },
              { label: 'Half-Yearly', value: 'half_yearly' },
              { label: 'Yearly', value: 'yearly' },
            ].map((btn) => {
              const isSelected = (filterState.selectedBillingCycle || '') === btn.value;
              return (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => onFilterChange({ selectedBillingCycle: btn.value })}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                      : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        <ReportDataTable
          tableId="recurring-contracts-table"
          title="Recurring Contracts & Renewal Tracker"
          rows={contracts}
          columns={tableColumns}
          unit="contracts"
          exportFilename="recurring-contracts-report"
          defaultPageSize={15}
          onClearFilters={onClearFilters}
        />
      </div>
    </div>
  );
};
