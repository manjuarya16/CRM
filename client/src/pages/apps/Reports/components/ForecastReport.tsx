import React, { useMemo } from 'react';
import {
  IForecastReportData,
  IForecastDealItem,
  IReportColumnDefinition,
  IReportKpiItem,
  IReportFilterState,
} from '@/interface';
import {
  formatCurrencyInr,
  formatCompactInr,
  formatDisplayNumber,
  formatDateDisplay,
} from '../reportHelpers';
import { ReportKpiCards } from './ReportKpiCards';
import { ReportPanel, VerticalColumnsChart, DonutChart } from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface ForecastReportProps {
  reportData: IForecastReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onOpenLeadDrawer?: (leadId: number, leadTitle: string) => void;
}

export const ForecastReport: React.FC<ForecastReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onOpenLeadDrawer,
}) => {
  const kpis = reportData?.kpis;
  const deals = reportData?.deals || [];

  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Open Deals in Pipeline',
        value: formatDisplayNumber(kpis.total_open_deals),
        subtitle: 'Deals currently under forecast',
      },
      {
        label: 'Unweighted Pipeline Value',
        value: formatCompactInr(kpis.unweighted_pipeline),
        subtitle: '100% nominal pipeline sum',
      },
      {
        label: 'Weighted Revenue Forecast',
        value: formatCompactInr(kpis.weighted_forecast),
        subtitle: 'Adjusted by stage probability',
      },
      {
        label: 'Average Probability',
        value: `${kpis.avg_probability}%`,
        subtitle: 'Weighted pipeline confidence',
      },
      {
        label: 'Closing This Month',
        value: formatCompactInr(kpis.closing_this_month_value),
        subtitle: `${formatDisplayNumber(kpis.closing_this_month_count)} deals scheduled this month`,
      },
      {
        label: 'Commit Deals Value',
        value: formatCompactInr(kpis.commit_deals_value),
        subtitle: 'High confidence (≥80% prob)',
      },
    ];
  }, [kpis]);

  const monthlyColumns = useMemo(() => {
    if (!reportData?.monthly_forecast) return [];
    return reportData.monthly_forecast.map((item) => ({
      label: item.label,
      value: item.value,
      displayText: formatCompactInr(item.value),
      color: '#10b981',
    }));
  }, [reportData?.monthly_forecast]);

  const confidenceColors: Record<string, string> = {
    Commit: '#10b981',
    'Best Case': '#3b82f6',
    Pipeline: '#f59e0b',
  };

  const confidenceDonutItems = useMemo(() => {
    if (!reportData?.confidence_mix) return [];
    return reportData.confidence_mix.map((item) => ({
      label: item.label,
      value: item.count,
      displayText: `${item.count} deals`,
      color: confidenceColors[item.label] || item.color || '#64748b',
    }));
  }, [reportData?.confidence_mix]);

  const columns: IReportColumnDefinition<IForecastDealItem>[] = useMemo(
    () => [
      {
        key: 'lead_title',
        header: 'Deal / Opportunity',
        render: (row) => (
          <div>
            <button
              onClick={() => onOpenLeadDrawer?.(row.lead_id, row.lead_title)}
              className="text-left font-semibold text-primary hover:underline"
            >
              {row.lead_title}
            </button>
            {row.organization_name && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {row.organization_name}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'stage_name',
        header: 'Stage & Pipeline',
        render: (row) => (
          <div>
            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {row.stage_name}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{row.pipeline_name}</div>
          </div>
        ),
      },
      {
        key: 'owner_name',
        header: 'Owner',
        accessor: (row) => row.owner_name,
        render: (row) => (
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
            {row.owner_name}
          </span>
        ),
      },
      {
        key: 'confidence_category',
        header: 'Confidence',
        accessor: (row) => row.confidence_category,
        render: (row) => {
          let badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
          if (row.confidence_category === 'Commit') {
            badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
          } else if (row.confidence_category === 'Best Case') {
            badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
          }
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${badgeClass}`}>
              {row.confidence_category}
            </span>
          );
        },
      },
      {
        key: 'expected_close_date',
        header: 'Target Close',
        accessor: (row) => row.expected_close_date,
        render: (row) => (
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {formatDateDisplay(row.expected_close_date)}
          </span>
        ),
      },
      {
        key: 'probability',
        header: 'Win Prob.',
        isNumeric: true,
        accessor: (row) => row.probability,
        render: (row) => (
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {row.probability}%
          </span>
        ),
      },
      {
        key: 'lead_value',
        header: 'Nominal Value',
        isNumeric: true,
        accessor: (row) => row.lead_value,
        render: (row) => (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatCurrencyInr(row.lead_value)}
          </span>
        ),
      },
      {
        key: 'weighted_value',
        header: 'Weighted Forecast',
        isNumeric: true,
        accessor: (row) => row.weighted_value,
        render: (row) => (
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrencyInr(row.weighted_value)}
          </span>
        ),
      },
    ],
    [onOpenLeadDrawer]
  );

  return (
    <div className="space-y-6">
      <ReportKpiCards kpiItems={kpiItems} onKpiClick={onFilterChange} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportPanel
          title="Weighted Revenue Forecast by Month"
          subtitle="Forecasted expected revenue realization based on close dates & win probabilities"
        >
          <VerticalColumnsChart
            items={monthlyColumns}
            emptyMessage="No deals scheduled with target close dates"
          />
        </ReportPanel>

        <ReportPanel
          title="Forecast Confidence Mix"
          subtitle="Distribution of deals across Commit (≥80%), Best Case (≥50%), and Pipeline (<50%)"
        >
          <DonutChart
            items={confidenceDonutItems}
            centerLabel={String(kpis?.total_open_deals || 0)}
            centerSublabel="Deals"
            emptyMessage="No open deals found"
          />
        </ReportPanel>
      </div>

      <ReportDataTable
        tableId="forecast-deals"
        title="Revenue Forecast Deals Pipeline"
        unit="deals"
        columns={columns}
        rows={deals}
        defaultSortKey="weighted_value"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="revenue_forecast_report.csv"
      />
    </div>
  );
};
