import React, { useMemo } from 'react';
import {
  ILeadSourcesReportData,
  ILeadSourcePerformanceItem,
  IReportColumnDefinition,
  IReportKpiItem,
  IReportFilterState,
  IReportStackedBarGroup,
} from '@/interface';
import {
  formatCurrencyInr,
  formatCompactInr,
  formatDisplayNumber,
} from '../reportHelpers';
import { ReportKpiCards } from './ReportKpiCards';
import {
  ReportPanel,
  StackedBarsChart,
  HorizontalBarsChart,
  DonutChart,
} from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface LeadSourcesReportProps {
  reportData: ILeadSourcesReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onDrillDownSource?: (sourceName: string) => void;
}

export const LeadSourcesReport: React.FC<LeadSourcesReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onDrillDownSource,
}) => {
  const kpis = reportData?.kpis;
  const sources = reportData?.sources || [];

  // KPI Items
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Total Leads Generated',
        value: formatDisplayNumber(kpis.total_leads),
        subtitle: `${sources.length} sources tracked`,
        apply: { selectedOutcome: '' },
      },
      {
        label: 'Open Lead Value',
        value: formatCompactInr(kpis.open_lead_value),
        subtitle: 'Active pipeline',
        apply: { selectedOutcome: 'open' },
      },
      {
        label: 'Won Lead Value',
        value: formatCompactInr(kpis.won_lead_value),
        subtitle: 'Closed revenue',
        apply: { selectedOutcome: 'won' },
      },
      {
        label: 'Lost Lead Value',
        value: formatCompactInr(kpis.lost_lead_value),
        subtitle: 'Missed opportunities',
        apply: { selectedOutcome: 'lost' },
      },
      {
        label: 'Lead Conversion Rate',
        value: `${kpis.win_rate || 0}%`,
        subtitle: 'Won ÷ closed leads',
      },
      {
        label: 'Average Lead Value',
        value: formatCompactInr(kpis.avg_lead_value),
        subtitle: 'Across all sources',
      },
    ];
  }, [kpis, sources.length]);

  // Stacked Bars (Outcome Mix by Source)
  const stackedGroups: IReportStackedBarGroup[] = useMemo(() => {
    return sources.map((source) => ({
      label: source.source_name,
      totalDisplay: formatDisplayNumber(source.total_leads),
      segments: [
        { name: 'Won', value: source.won_leads, color: '#10b981' },
        { name: 'Open', value: source.open_leads, color: '#3b82f6' },
        { name: 'Lost', value: source.lost_leads, color: '#ef4444' },
      ],
    }));
  }, [sources]);

  // Win Rate Bars
  const winRateBars = useMemo(() => {
    const list = [...sources];
    list.sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));
    return list.map((source) => ({
      label: source.source_name,
      value: source.win_rate || 0,
      displayText: `${source.win_rate || 0}%`,
      color: '#10b981',
    }));
  }, [sources]);

  // Share of Total Value Donut
  const donutColors = ['#0e90d9', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280', '#ef4444'];
  const shareDonutItems = useMemo(() => {
    return sources.map((source, idx) => ({
      label: source.source_name,
      value: source.total_value,
      displayText: formatCompactInr(source.total_value),
      color: donutColors[idx % donutColors.length],
    }));
  }, [sources]);

  const totalValueSum = useMemo(() => {
    return sources.reduce((acc, s) => acc + (s.total_value || 0), 0);
  }, [sources]);

  // Dynamic "What Stands Out" Insights
  const dynamicInsights = useMemo(() => {
    if (sources.length === 0) return [];
    const insights: string[] = [];
    const sortedByTotal = [...sources].sort((a, b) => b.total_leads - a.total_leads);
    const topSource = sortedByTotal[0];

    if (topSource && topSource.total_leads > 0) {
      const percent = kpis?.total_leads
        ? Math.round((topSource.total_leads / kpis.total_leads) * 100)
        : 0;
      insights.push(
        `${topSource.source_name} brings the most leads (${formatDisplayNumber(topSource.total_leads)}, ${percent}% of total).`
      );
    }

    const eligibleForWinRate = sources.filter((s) => s.won_leads + s.lost_leads >= 2);
    if (eligibleForWinRate.length > 0) {
      eligibleForWinRate.sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));
      const bestWinSource = eligibleForWinRate[0];
      insights.push(
        `${bestWinSource.source_name} has the highest win rate at ${bestWinSource.win_rate}% across closed opportunities.`
      );
    }

    const sortedByOpenVal = [...sources].sort((a, b) => b.open_value - a.open_value);
    const topOpenSource = sortedByOpenVal[0];
    if (topOpenSource && topOpenSource.open_value > 0) {
      insights.push(
        `${topOpenSource.source_name} holds the largest open value (${formatCompactInr(topOpenSource.open_value)}). Prioritize follow-ups here.`
      );
    }

    const unknownSource = sources.find(
      (s) => s.source_name.toLowerCase().includes('unknown') || s.source_name.toLowerCase().includes('not specified')
    );
    if (unknownSource && unknownSource.total_leads > 0) {
      insights.push(
        `${unknownSource.total_leads} leads have no specified source. Mandate lead source on creation to increase reporting accuracy.`
      );
    }

    return insights;
  }, [sources, kpis?.total_leads]);

  // Table Columns
  const tableColumns: IReportColumnDefinition<ILeadSourcePerformanceItem>[] = useMemo(
    () => [
      {
        key: 'source_name',
        header: 'Lead Source',
        render: (source) => (
          <button
            type="button"
            onClick={() => onDrillDownSource && onDrillDownSource(source.source_name)}
            className="text-[#0e90d9] hover:underline font-semibold text-left"
          >
            {source.source_name}
          </button>
        ),
      },
      {
        key: 'total_leads',
        header: 'Total Leads',
        isNumeric: true,
        render: (s) => formatDisplayNumber(s.total_leads),
      },
      {
        key: 'open_leads',
        header: 'Open',
        isNumeric: true,
        render: (s) => formatDisplayNumber(s.open_leads),
      },
      {
        key: 'won_leads',
        header: 'Won',
        isNumeric: true,
        render: (s) => (
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {formatDisplayNumber(s.won_leads)}
          </span>
        ),
      },
      {
        key: 'lost_leads',
        header: 'Lost',
        isNumeric: true,
        render: (s) => (
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            {formatDisplayNumber(s.lost_leads)}
          </span>
        ),
      },
      {
        key: 'total_value',
        header: 'Total Value',
        isNumeric: true,
        render: (s) => formatCurrencyInr(s.total_value),
      },
      {
        key: 'open_value',
        header: 'Open Value',
        isNumeric: true,
        render: (s) => formatCurrencyInr(s.open_value),
      },
      {
        key: 'won_value',
        header: 'Won Value',
        isNumeric: true,
        render: (s) => (
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {formatCurrencyInr(s.won_value)}
          </span>
        ),
      },
      {
        key: 'win_rate',
        header: 'Win Rate',
        isNumeric: true,
        render: (s) => (
          <span className="font-semibold text-gray-900 dark:text-white">
            {s.win_rate != null ? `${s.win_rate}%` : 'N/A'}
          </span>
        ),
      },
      {
        key: 'avg_lead_value',
        header: 'Avg Lead Value',
        isNumeric: true,
        render: (s) => formatCurrencyInr(s.avg_lead_value),
      },
    ],
    [onDrillDownSource]
  );

  // Totals Row
  const totalsRow = useMemo(() => {
    if (sources.length === 0) return undefined;
    const totalLeads = sources.reduce((acc, s) => acc + s.total_leads, 0);
    const totalOpen = sources.reduce((acc, s) => acc + s.open_leads, 0);
    const totalWon = sources.reduce((acc, s) => acc + s.won_leads, 0);
    const totalLost = sources.reduce((acc, s) => acc + s.lost_leads, 0);
    const totalVal = sources.reduce((acc, s) => acc + s.total_value, 0);
    const totalOpenVal = sources.reduce((acc, s) => acc + s.open_value, 0);
    const totalWonVal = sources.reduce((acc, s) => acc + s.won_value, 0);
    const closedCount = totalWon + totalLost;
    const avgWinRate = closedCount > 0 ? ((totalWon / closedCount) * 100).toFixed(1) + '%' : 'N/A';
    const overallAvg = totalLeads > 0 ? totalVal / totalLeads : 0;

    return {
      source_name: 'Total',
      total_leads: formatDisplayNumber(totalLeads),
      open_leads: formatDisplayNumber(totalOpen),
      won_leads: formatDisplayNumber(totalWon),
      lost_leads: formatDisplayNumber(totalLost),
      total_value: formatCurrencyInr(totalVal),
      open_value: formatCurrencyInr(totalOpenVal),
      won_value: formatCurrencyInr(totalWonVal),
      win_rate: avgWinRate,
      avg_lead_value: formatCurrencyInr(overallAvg),
    };
  }, [sources]);

  return (
    <div className="space-y-4">
      {/* Dynamic KPI Cards */}
      <ReportKpiCards
        kpiItems={kpiItems}
        activeFilter={{ selectedOutcome: filterState.selectedOutcome }}
        onKpiClick={(applyFilter) => onFilterChange(applyFilter)}
      />

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReportPanel
          title="Outcome by Lead Source"
          subtitle="Lead counts split by won, open, and lost"
          className="lg:col-span-2"
        >
          <StackedBarsChart
            groups={stackedGroups}
            legend={[
              { label: 'Won', color: '#10b981' },
              { label: 'Open', color: '#3b82f6' },
              { label: 'Lost', color: '#ef4444' },
            ]}
          />
        </ReportPanel>

        <ReportPanel title="What Stands Out" subtitle="Algorithmic insights from active filters">
          {dynamicInsights.length > 0 ? (
            <ul className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
              {dynamicInsights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0e90d9] shrink-0 mt-1.5" />
                  <span className="leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">No data for current filters</p>
          )}
        </ReportPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel
          title="Win Rate by Source"
          subtitle="Won ÷ (Won + Lost) · Open leads excluded"
        >
          <HorizontalBarsChart items={winRateBars} />
        </ReportPanel>

        <ReportPanel title="Share of Total Lead Value" subtitle="Where pipeline revenue originates">
          <DonutChart
            items={shareDonutItems}
            centerLabel={formatCompactInr(totalValueSum)}
            centerSublabel="Total value"
          />
        </ReportPanel>
      </div>

      {/* Main Table */}
      <ReportDataTable<ILeadSourcePerformanceItem>
        tableId="source_performance_table"
        title="Source Performance"
        unit="sources"
        columns={tableColumns}
        rows={sources}
        defaultSortKey="total_leads"
        defaultSortDirection="desc"
        totalsRow={totalsRow}
        disablePagination={true}
        onClearFilters={onClearFilters}
        exportFilename="crm_lead_source_performance"
      />
    </div>
  );
};
