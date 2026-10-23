import React, { useMemo } from 'react';
import {
  IWinLossReportData,
  IWinLossDealItem,
  IWinLossDealTypeItem,
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
} from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface WinLossReportProps {
  reportData: IWinLossReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onOpenDrawer: (lead: any) => void;
}

export const WinLossReport: React.FC<WinLossReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onOpenDrawer,
}) => {
  const kpis = reportData?.kpis;
  const dealTypes = reportData?.deal_types || [];
  const deals = reportData?.deals || [];
  const lostReasons = reportData?.lost_reasons || [];
  const winRateBySource = reportData?.win_rate_by_source || [];
  const winRateByDealSize = reportData?.win_rate_by_deal_size || [];
  const insights = reportData?.insights || [];

  // KPI Items
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Closed Deals',
        value: formatDisplayNumber(kpis.total_closed),
        subtitle: 'Won + lost in period',
        apply: { selectedOutcome: '' },
      },
      {
        label: 'Won Deals',
        value: formatDisplayNumber(kpis.won_count),
        subtitle: formatCurrencyInr(kpis.won_value),
        apply: { selectedOutcome: 'won' },
      },
      {
        label: 'Lost Deals',
        value: formatDisplayNumber(kpis.lost_count),
        subtitle: formatCurrencyInr(kpis.lost_value),
        apply: { selectedOutcome: 'lost' },
      },
      {
        label: 'Win Rate (Deals)',
        value: `${kpis.win_rate_deals || 0}%`,
        subtitle: 'Won ÷ closed deals',
      },
      {
        label: 'Win Rate (Value)',
        value: `${kpis.win_rate_value || 0}%`,
        subtitle: 'Won value ÷ closed value',
      },
      {
        label: 'Avg Won Deal',
        value: formatCompactInr(kpis.avg_won_deal),
        subtitle: 'Average deal size',
      },
      {
        label: 'Avg Sales Cycle',
        value: `${kpis.avg_sales_cycle_days || 0} days`,
        subtitle: 'Created to won',
      },
    ];
  }, [kpis]);

  // Chart 1: Win rate by deal type
  const dealTypeBars: IReportChartDataItem[] = useMemo(() => {
    return dealTypes.map((item) => ({
      label: item.deal_type,
      value: item.win_rate || 0,
      displayText: `${item.win_rate}% (${item.won_deals}/${item.total_deals})`,
      color: '#10b981',
    }));
  }, [dealTypes]);

  // Chart 2: Why we lose (Lost reasons)
  const lostReasonBars: IReportChartDataItem[] = useMemo(() => {
    const maxVal = Math.max(...lostReasons.map((r) => r.value), 1);
    return lostReasons.map((item) => ({
      label: item.label,
      value: item.value,
      displayText: `${formatCompactInr(item.value)} · ${item.count}`,
      color: '#ef4444',
    }));
  }, [lostReasons]);

  // Chart 3: Win rate by source
  const sourceBars: IReportChartDataItem[] = useMemo(() => {
    return winRateBySource.map((item) => ({
      label: item.label,
      value: item.value,
      displayText: `${item.value}% (${item.won_count}/${item.count})`,
      color: '#0e90d9',
    }));
  }, [winRateBySource]);

  // Chart 4: Win rate by deal size
  const sizeBars: IReportChartDataItem[] = useMemo(() => {
    return winRateByDealSize.map((item) => ({
      label: item.label,
      value: item.value,
      displayText: `${item.value}% (${item.won_count}/${item.count})`,
      color: '#8b5cf6',
    }));
  }, [winRateByDealSize]);

  // Deal type badge helper
  const renderDealTypePill = (type: string) => {
    let bg = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    if (type === 'Product + Service') {
      bg = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
    } else if (type === 'Service only') {
      bg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
    } else if (type === 'No items') {
      bg = 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${bg}`}>
        {type}
      </span>
    );
  };

  // Summary Table: Deal Types
  const dealTypeColumns: IReportColumnDefinition<IWinLossDealTypeItem>[] = [
    {
      key: 'deal_type',
      header: 'Deal Type',
      render: (row) => renderDealTypePill(row.deal_type),
    },
    {
      key: 'total_deals',
      header: 'Closed',
      isNumeric: true,
      render: (row) => formatDisplayNumber(row.total_deals),
    },
    {
      key: 'won_deals',
      header: 'Won',
      isNumeric: true,
      render: (row) => (
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
          {formatDisplayNumber(row.won_deals)}
        </span>
      ),
    },
    {
      key: 'win_rate',
      header: 'Win Rate',
      isNumeric: true,
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.win_rate}%
        </span>
      ),
    },
    {
      key: 'won_value',
      header: 'Won Value',
      isNumeric: true,
      render: (row) => formatCurrencyInr(row.won_value),
    },
    {
      key: 'avg_won_value',
      header: 'Avg Won Value',
      isNumeric: true,
      render: (row) => formatCurrencyInr(row.avg_won_value),
    },
    {
      key: 'avg_cycle_days',
      header: 'Avg Cycle (Days)',
      isNumeric: true,
      render: (row) => `${row.avg_cycle_days || 0} d`,
    },
  ];

  // Deals Table Columns
  const dealColumns: IReportColumnDefinition<IWinLossDealItem>[] = [
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
      key: 'deal_type',
      header: 'Deal Type',
      render: (row) => renderDealTypePill(row.deal_type),
    },
    {
      key: 'source_name',
      header: 'Source',
      render: (row) => <span className="text-gray-600 dark:text-gray-400 text-xs">{row.source_name}</span>,
    },
    {
      key: 'lead_value',
      header: 'Deal Value',
      isNumeric: true,
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrencyInr(row.lead_value)}
        </span>
      ),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            row.outcome === 'won'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {row.outcome === 'won' ? 'Won' : 'Lost'}
        </span>
      ),
    },
    {
      key: 'lost_reason',
      header: 'Lost Reason',
      render: (row) =>
        row.outcome === 'lost' ? (
          <span className="text-xs text-red-600 dark:text-red-400 truncate max-w-[150px] block" title={row.lost_reason}>
            {row.lost_reason}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ),
    },
    {
      key: 'cycle_days',
      header: 'Cycle (Days)',
      isNumeric: true,
      render: (row) => (
        <span className="tabular-nums text-gray-700 dark:text-gray-300">
          {row.cycle_days} d
        </span>
      ),
    },
    {
      key: 'closed_at',
      header: 'Closed',
      render: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDateDisplay(row.closed_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <ReportKpiCards
        kpiItems={kpiItems}
        activeFilter={filterState}
        onKpiClick={onFilterChange}
      />

      {/* Row 1: Deal Type & Lost Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel
          title="Win Rate by Deal Type"
          subtitle="Product-based vs service-based vs mixed deals"
        >
          <HorizontalBarsChart
            items={dealTypeBars}
            maxLimit={100}
            emptyMessage="No closed deals in this period"
          />
        </ReportPanel>

        <ReportPanel
          title="Why We Lose"
          subtitle="Lost deal value by reason"
        >
          <HorizontalBarsChart
            items={lostReasonBars}
            emptyMessage="No lost deals in this period"
          />
        </ReportPanel>
      </div>

      {/* Row 2: Source, Size Bands & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportPanel
          title="Win Rate by Source"
          subtitle="Won ÷ closed deals per channel"
        >
          <HorizontalBarsChart
            items={sourceBars}
            maxLimit={100}
            emptyMessage="No closed deals across sources"
          />
        </ReportPanel>

        <ReportPanel
          title="Win Rate by Deal Size"
          subtitle="Bigger deals vs smaller deal velocity"
        >
          <HorizontalBarsChart
            items={sizeBars}
            maxLimit={100}
            emptyMessage="No deals categorized by size band"
          />
        </ReportPanel>

        <ReportPanel
          title="What Stands Out"
          subtitle="Automated analytical takeaways"
        >
          {insights && insights.length > 0 ? (
            <ul className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">
              Not enough closed deals yet to generate insights.
            </p>
          )}
        </ReportPanel>
      </div>

      {/* Deal Types Summary Table */}
      <ReportDataTable
        tableId="win-loss-types"
        title="Product vs Service Deals Summary"
        unit="deal types"
        columns={dealTypeColumns}
        rows={dealTypes}
        disablePagination={true}
        exportFilename="win-loss-deal-types"
      />

      {/* Closed Deals Table */}
      <ReportDataTable
        tableId="win-loss-closed-deals"
        title="Closed Deals"
        unit="deals"
        columns={dealColumns}
        rows={deals}
        defaultSortKey="closed_at"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="win-loss-closed-deals"
      />
    </div>
  );
};
