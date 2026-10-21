import React, { useMemo } from 'react';
import {
  ISalesRepsReportData,
  ISalesRepItem,
  IReportColumnDefinition,
  IReportKpiItem,
  IReportFilterState,
} from '@/interface';
import {
  formatCurrencyInr,
  formatCompactInr,
  formatDisplayNumber,
} from '../reportHelpers';
import { ReportKpiCards } from './ReportKpiCards';
import { ReportPanel, HorizontalBarsChart } from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface SalesRepReportProps {
  reportData: ISalesRepsReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
}

export const SalesRepReport: React.FC<SalesRepReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
}) => {
  const kpis = reportData?.kpis;
  const reps = reportData?.reps || [];

  const selectedOwner = filterState.selectedOwnerId;
  const isAllReps = !selectedOwner || selectedOwner === 'all';
  const singleRep = !isAllReps
    ? reps.find((r: ISalesRepItem) => r.rep_name === selectedOwner || String(r.user_id) === selectedOwner) || reps[0]
    : null;

  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];

    if (isAllReps) {
      return [
        {
          label: 'Active Sales Reps',
          value: formatDisplayNumber(kpis.total_active_reps),
          subtitle: 'Team members with deals',
        },
        {
          label: 'Team Won Revenue',
          value: formatCompactInr(kpis.team_won_revenue),
          subtitle: 'Closed deals revenue',
        },
        {
          label: 'Open Pipeline Value',
          value: formatCompactInr(kpis.team_open_pipeline),
          subtitle: 'Deals currently in progress',
        },
        {
          label: 'Team Win Rate',
          value: `${kpis.team_win_rate}%`,
          subtitle: 'Won deals vs closed',
        },
        {
          label: 'Top Performer',
          value: kpis.top_performer_name || '—',
          subtitle: 'Leading revenue generator',
        },
        {
          label: 'Team Activities',
          value: formatDisplayNumber(kpis.total_team_activities),
          subtitle: 'Calls, meetings & tasks',
        },
      ];
    }

    // When a specific Sales Rep is selected, Top Performer is omitted
    return [
      {
        label: 'Total Deals',
        value: formatDisplayNumber(singleRep?.total_leads ?? kpis.total_active_reps),
        subtitle: `${singleRep?.won_leads ?? 0} won, ${singleRep?.lost_leads ?? 0} lost`,
      },
      {
        label: 'Won Revenue',
        value: formatCompactInr(singleRep?.won_value ?? kpis.team_won_revenue),
        subtitle: 'Closed deals revenue',
      },
      {
        label: 'Open Pipeline Value',
        value: formatCompactInr(singleRep?.open_value ?? kpis.team_open_pipeline),
        subtitle: 'Deals currently in progress',
      },
      {
        label: 'Win Rate',
        value: `${singleRep ? singleRep.win_rate : kpis.team_win_rate}%`,
        subtitle: 'Won deals vs closed',
      },
      {
        label: 'Avg Sales Cycle',
        value: singleRep && singleRep.avg_cycle_days > 0 ? `${singleRep.avg_cycle_days} days` : '—',
        subtitle: 'Created to won duration',
      },
      {
        label: 'Activities',
        value: formatDisplayNumber(singleRep?.total_activities ?? kpis.total_team_activities),
        subtitle: singleRep
          ? `${singleRep.completed_activities} done${singleRep.overdue_activities > 0 ? `, ${singleRep.overdue_activities} overdue` : ''}`
          : 'Calls, meetings & tasks',
      },
    ];
  }, [kpis, isAllReps, singleRep]);

  const revenueBars = useMemo(() => {
    if (!reportData?.revenue_by_rep) return [];
    return reportData.revenue_by_rep.map((item) => ({
      ...item,
      displayText: formatCompactInr(item.value),
      color: '#10b981',
    }));
  }, [reportData?.revenue_by_rep]);

  const winRateBars = useMemo(() => {
    if (!reportData?.win_rate_by_rep) return [];
    return reportData.win_rate_by_rep.map((item) => ({
      ...item,
      displayText: `${item.value}%`,
      color: '#3b82f6',
    }));
  }, [reportData?.win_rate_by_rep]);

  const columns: IReportColumnDefinition<ISalesRepItem>[] = useMemo(
    () => [
      {
        key: 'rep_name',
        header: 'Sales Rep',
        render: (row) => (
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{row.rep_name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.email}</div>
          </div>
        ),
      },
      {
        key: 'total_leads',
        header: 'Total Deals',
        isNumeric: true,
        accessor: (row) => row.total_leads,
        render: (row) => <span className="font-medium">{formatDisplayNumber(row.total_leads)}</span>,
      },
      {
        key: 'won_leads',
        header: 'Won',
        isNumeric: true,
        accessor: (row) => row.won_leads,
        render: (row) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            {formatDisplayNumber(row.won_leads)}
          </span>
        ),
      },
      {
        key: 'lost_leads',
        header: 'Lost',
        isNumeric: true,
        accessor: (row) => row.lost_leads,
        render: (row) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {formatDisplayNumber(row.lost_leads)}
          </span>
        ),
      },
      {
        key: 'win_rate',
        header: 'Win Rate',
        isNumeric: true,
        accessor: (row) => row.win_rate,
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min(row.win_rate, 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium">{row.win_rate}%</span>
          </div>
        ),
      },
      {
        key: 'won_value',
        header: 'Won Revenue',
        isNumeric: true,
        accessor: (row) => row.won_value,
        render: (row) => (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrencyInr(row.won_value)}
          </span>
        ),
      },
      {
        key: 'open_value',
        header: 'Open Pipeline',
        isNumeric: true,
        accessor: (row) => row.open_value,
        render: (row) => (
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {formatCurrencyInr(row.open_value)}
          </span>
        ),
      },
      {
        key: 'avg_cycle_days',
        header: 'Avg Cycle',
        isNumeric: true,
        accessor: (row) => row.avg_cycle_days,
        render: (row) => (
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {row.avg_cycle_days > 0 ? `${row.avg_cycle_days} days` : '—'}
          </span>
        ),
      },
      {
        key: 'total_activities',
        header: 'Activities',
        isNumeric: true,
        accessor: (row) => row.total_activities,
        render: (row) => (
          <div className="text-xs">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {formatDisplayNumber(row.total_activities)}
            </span>
            <span className="text-gray-400 dark:text-gray-500 ml-1">
              ({row.completed_activities} done{row.overdue_activities > 0 ? `, ${row.overdue_activities} overdue` : ''})
            </span>
          </div>
        ),
      },
      {
        key: 'accepted_quote_value',
        header: 'Quotes Accepted',
        isNumeric: true,
        accessor: (row) => row.accepted_quote_value,
        render: (row) => (
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
            {formatCompactInr(row.accepted_quote_value)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <ReportKpiCards kpiItems={kpiItems} onKpiClick={onFilterChange} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportPanel
          title={isAllReps ? "Won Revenue by Sales Rep" : `${singleRep?.rep_name || selectedOwner} - Won Revenue`}
          subtitle={isAllReps ? "Top team members by closed deal revenue" : "Closed deal revenue for selected representative"}
        >
          <HorizontalBarsChart
            items={revenueBars}
            emptyMessage="No won deal revenue recorded for this period"
          />
        </ReportPanel>

        <ReportPanel
          title={isAllReps ? "Win Rate by Sales Rep (%)" : `${singleRep?.rep_name || selectedOwner} - Win Rate (%)`}
          subtitle={isAllReps ? "Conversion efficiency across active sales representatives" : "Conversion efficiency for selected representative"}
        >
          <HorizontalBarsChart
            items={winRateBars}
            maxLimit={100}
            emptyMessage="No closed deals to calculate win rates"
          />
        </ReportPanel>
      </div>

      <ReportDataTable
        tableId="sales-reps-leaderboard"
        title={isAllReps ? "Sales Representatives Leaderboard" : `${singleRep?.rep_name || selectedOwner} Performance`}
        unit={isAllReps ? "representatives" : "representative"}
        columns={columns}
        rows={reps}
        defaultSortKey="won_value"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="sales_reps_performance_report.csv"
      />
    </div>
  );
};
