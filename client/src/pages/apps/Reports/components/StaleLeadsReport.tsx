import React, { useMemo } from 'react';
import {
  IStaleLeadsReportData,
  IStaleLeadItem,
  IReportColumnDefinition,
  IReportKpiItem,
  IReportFilterState,
  IReportStackedBarGroup,
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
  StackedBarsChart,
  HorizontalBarsChart,
} from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface StaleLeadsReportProps {
  reportData: IStaleLeadsReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onOpenDrawer: (lead: any) => void;
}

export const StaleLeadsReport: React.FC<StaleLeadsReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onOpenDrawer,
}) => {
  const kpis = reportData?.kpis;
  const issuesByType = reportData?.issues_by_type || [];
  const issuesByOwner = reportData?.issues_by_owner || [];
  const leads = reportData?.leads || [];

  const currentStaleDays = Number(filterState.selectedStaleDays || kpis?.stale_threshold_days || 14);

  // KPIs
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Open Leads',
        value: formatDisplayNumber(kpis.total_open_leads),
        subtitle: formatCompactInr(kpis.total_open_value),
        apply: { selectedIssueFlag: '' },
      },
      {
        label: 'Leads with an Issue',
        value: formatDisplayNumber(kpis.leads_with_issues_count),
        subtitle: `${formatCompactInr(kpis.leads_with_issues_value)} value at risk`,
      },
      {
        label: 'No Next Step',
        value: formatDisplayNumber(kpis.no_next_step_count),
        subtitle: 'No future activity booked',
        apply: { selectedIssueFlag: 'No next step' },
      },
      {
        label: 'No Recent Activity',
        value: formatDisplayNumber(kpis.no_recent_activity_count),
        subtitle: `Nothing done in ${currentStaleDays} days`,
        apply: { selectedIssueFlag: 'No recent activity' },
      },
      {
        label: 'Past Close Date',
        value: formatDisplayNumber(kpis.past_close_date_count),
        subtitle: 'Target close date passed',
        apply: { selectedIssueFlag: 'Past close date' },
      },
      {
        label: 'Missing Details',
        value: formatDisplayNumber(kpis.missing_details_count),
        subtitle: 'No source, contact or items',
        apply: { selectedIssueFlag: 'Missing details' },
      },
    ];
  }, [kpis, currentStaleDays]);

  // Chart 1: Issues by Type
  const issueTypeBars: IReportChartDataItem[] = useMemo(() => {
    return issuesByType.map((item) => ({
      label: item.label,
      value: item.count,
      displayText: formatDisplayNumber(item.count),
      color: item.color || '#ef4444',
    }));
  }, [issuesByType]);

  // Chart 2: Issues by Owner (Stacked)
  const ownerStackedGroups: IReportStackedBarGroup[] = useMemo(() => {
    return issuesByOwner.map((item) => ({
      label: item.label,
      totalDisplay: formatDisplayNumber(item.total_issues),
      segments: [
        { name: 'No next step', value: item.no_next_step, color: '#ef4444' },
        { name: 'No recent activity', value: item.no_recent_activity, color: '#f59e0b' },
        { name: 'Past close date', value: item.past_close_date, color: '#a855f7' },
        { name: 'Missing details', value: item.missing_details, color: '#64748b' },
      ],
    }));
  }, [issuesByOwner]);

  // Issue flag badge renderer
  const renderFlagPills = (flags: string[]) => {
    if (!flags || flags.length === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
          Healthy
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {flags.map((flag, idx) => {
          let style = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
          if (flag === 'No recent activity') {
            style = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
          } else if (flag === 'Past close date') {
            style = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
          } else if (flag === 'Missing details') {
            style = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
          }
          return (
            <span
              key={idx}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${style}`}
            >
              {flag}
            </span>
          );
        })}
      </div>
    );
  };

  // Table Columns: Flagged Leads
  const columns: IReportColumnDefinition<IStaleLeadItem>[] = [
    {
      key: 'lead_id',
      header: 'Lead ID',
      render: (row) => (
        <button
          onClick={() => onOpenDrawer({ id: row.lead_id, title: row.lead_title })}
          className="text-primary hover:underline font-mono text-xs font-semibold"
        >
          #{row.lead_id}
        </button>
      ),
    },
    {
      key: 'lead_title',
      header: 'Lead Name',
      render: (row) => (
        <div className="min-w-[140px]">
          <button
            onClick={() => onOpenDrawer({ id: row.lead_id, title: row.lead_title })}
            className="text-gray-900 dark:text-white hover:text-primary font-medium text-left truncate max-w-[200px] block"
            title={row.lead_title}
          >
            {row.lead_title}
          </button>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">
            {row.organization_name}
          </span>
        </div>
      ),
    },
    {
      key: 'owner_name',
      header: 'Owner',
      render: (row) => <span className="text-gray-700 dark:text-gray-300">{row.owner_name}</span>,
    },
    {
      key: 'stage_name',
      header: 'Stage',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
          {row.stage_name}
        </span>
      ),
    },
    {
      key: 'lead_value',
      header: 'Value',
      isNumeric: true,
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrencyInr(row.lead_value)}
        </span>
      ),
    },
    {
      key: 'last_activity_at',
      header: 'Last Activity',
      render: (row) =>
        row.last_activity_at ? (
          <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
            {formatDateDisplay(row.last_activity_at)}
          </span>
        ) : (
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
            Never
          </span>
        ),
    },
    {
      key: 'days_idle',
      header: 'Days Idle',
      isNumeric: true,
      render: (row) => (
        <span
          className={`tabular-nums font-medium ${
            row.days_idle > currentStaleDays
              ? 'text-amber-600 dark:text-amber-400 font-semibold'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {row.days_idle} d
        </span>
      ),
    },
    {
      key: 'next_scheduled_activity',
      header: 'Next Step',
      render: (row) =>
        row.next_scheduled_activity ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
            {formatDateDisplay(row.next_scheduled_activity)}
          </span>
        ) : (
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
            None booked
          </span>
        ),
    },
    {
      key: 'issue_flags',
      header: 'Follow-up Flags',
      render: (row) => renderFlagPills(row.issue_flags),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Informative Header Callout */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-1 rounded-full bg-amber-200/60 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200 shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="leading-relaxed">
            <strong>Why this report matters.</strong> Open leads that nobody is touching quietly slip away. This report highlights deals missing a booked next step, deals idle past your aging threshold, past target close dates, or lacking critical qualification details.
          </p>
        </div>

        {/* Inactivity Threshold Days Selector */}
        <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 p-1 rounded-lg">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 px-1.5">
            Stale after:
          </span>
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onFilterChange({ selectedStaleDays: days })}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                currentStaleDays === days
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <ReportKpiCards
        kpiItems={kpiItems}
        activeFilter={filterState}
        onKpiClick={onFilterChange}
      />

      {/* Row 1: Issues by Type & Issues by Owner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel
          title="Issues by Type"
          subtitle="Number of open leads affected per flag"
        >
          <HorizontalBarsChart
            items={issueTypeBars}
            emptyMessage="No issues found across open leads"
          />
        </ReportPanel>

        <ReportPanel
          title="Issues by Owner"
          subtitle="Stacked distribution across deal owners"
        >
          <StackedBarsChart
            groups={ownerStackedGroups}
            legend={[
              { label: 'No next step', color: '#ef4444' },
              { label: 'No recent activity', color: '#f59e0b' },
              { label: 'Past close date', color: '#a855f7' },
              { label: 'Missing details', color: '#64748b' },
            ]}
            emptyMessage="No issues logged for any deal owner"
          />
        </ReportPanel>
      </div>

      {/* Flagged Leads Table */}
      <ReportDataTable
        tableId="stale-leads-attention"
        title="Leads that Need Attention"
        unit="leads"
        columns={columns}
        rows={leads}
        defaultSortKey="days_idle"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="stale-leads-report"
      />
    </div>
  );
};
