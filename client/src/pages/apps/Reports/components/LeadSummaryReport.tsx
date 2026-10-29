import React, { useMemo } from 'react';
import {
  ILeadSummaryReportData,
  ILeadReportItem,
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
import {
  ReportPanel,
  VerticalColumnsChart,
  DonutChart,
  HorizontalBarsChart,
} from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface LeadSummaryReportProps {
  reportData: ILeadSummaryReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onOpenDrawer: (lead: ILeadReportItem) => void;
}

export const LeadSummaryReport: React.FC<LeadSummaryReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onOpenDrawer,
}) => {
  const kpis = reportData?.kpis;
  const leads = reportData?.leads || [];

  // KPI Items
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Total Leads',
        value: formatDisplayNumber(kpis.total_leads),
        subtitle: 'All leads in period',
        apply: { selectedOutcome: '' },
      },
      {
        label: 'Open Leads',
        value: formatDisplayNumber(kpis.open_leads),
        subtitle: `${kpis.open_percentage || 0}% of all leads`,
        apply: { selectedOutcome: 'open' },
      },
      {
        label: 'Won Leads',
        value: formatDisplayNumber(kpis.won_leads),
        subtitle: `${kpis.win_percentage || 0}% conversion`,
        apply: { selectedOutcome: 'won' },
      },
      {
        label: 'Lost Leads',
        value: formatDisplayNumber(kpis.lost_leads),
        subtitle: 'Lost opportunities',
        apply: { selectedOutcome: 'lost' },
      },
      {
        label: 'Open Lead Value',
        value: formatCompactInr(kpis.open_lead_value),
        subtitle: 'Active pipeline only',
        apply: { selectedOutcome: 'open' },
      },
      {
        label: 'Average Lead Value',
        value: formatCompactInr(kpis.avg_lead_value),
        subtitle: `Across ${formatDisplayNumber(kpis.total_leads)} leads`,
      },
    ];
  }, [kpis]);

  // Outcome Donut Data
  const outcomeDonutItems = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Open',
        value: kpis.open_leads,
        displayText: formatDisplayNumber(kpis.open_leads),
        color: '#3b82f6',
      },
      {
        label: 'Won',
        value: kpis.won_leads,
        displayText: formatDisplayNumber(kpis.won_leads),
        color: '#10b981',
      },
      {
        label: 'Lost',
        value: kpis.lost_leads,
        displayText: formatDisplayNumber(kpis.lost_leads),
        color: '#ef4444',
      },
    ];
  }, [kpis]);

  // Leads Creation Timeline Columns Data (grouped by exact lead creation date)
  const weeklyColumnItems = useMemo(() => {
    if (reportData?.weeks && reportData.weeks.length > 0) {
      return reportData.weeks.map((weekItem) => ({
        label: weekItem.label,
        value: weekItem.count,
        displayText: String(weekItem.count),
        color: '#0e90d9',
      }));
    }

    if (leads && leads.length > 0) {
      const dateCounts: Record<string, { count: number; dateSort: string; label: string }> = {};
      leads.forEach((l) => {
        if (!l.created_at) return;
        const d = new Date(l.created_at);
        if (isNaN(d.getTime())) return;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const sortKey = `${y}-${m}-${day}`;
        const month = d.toLocaleString('en-US', { month: 'short' });
        const label = `${day} ${month}`;
        if (!dateCounts[sortKey]) {
          dateCounts[sortKey] = { count: 0, dateSort: sortKey, label };
        }
        dateCounts[sortKey].count += 1;
      });

      const sortedDates = Object.values(dateCounts).sort((a, b) => a.dateSort.localeCompare(b.dateSort));
      if (sortedDates.length > 0) {
        return sortedDates.map((item) => ({
          label: item.label,
          value: item.count,
          displayText: String(item.count),
          color: '#0e90d9',
        }));
      }
    }

    return [];
  }, [reportData?.weeks, leads]);

  // Owner Open Value Bars Data
  const ownerBarsItems = useMemo(() => {
    if (!reportData?.owner_values) return [];
    return reportData.owner_values.map((ownerItem) => ({
      label: ownerItem.label,
      value: ownerItem.value,
      displayText: formatCompactInr(ownerItem.value),
      color: '#0e90d9',
    }));
  }, [reportData?.owner_values]);

  // Lost Reasons Bars Data
  const lostReasonBarsItems = useMemo(() => {
    if (!reportData?.lost_reasons) return [];
    return reportData.lost_reasons.map((reasonItem) => ({
      label: reasonItem.label,
      value: reasonItem.count,
      displayText: formatDisplayNumber(reasonItem.count),
      color: '#ef4444',
    }));
  }, [reportData?.lost_reasons]);

  // Table Columns Definition
  const tableColumns: IReportColumnDefinition<ILeadReportItem>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Lead ID',
        render: (lead) => (
          <button
            type="button"
            onClick={() => onOpenDrawer(lead)}
            className="text-[#0e90d9] hover:underline font-semibold"
          >
            #{lead.id}
          </button>
        ),
        exportAccessor: (lead) => `#${lead.id}`,
      },
      {
        key: 'title',
        header: 'Lead Name',
        render: (lead) => (
          <span className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate block" title={lead.title}>
            {lead.title}
          </span>
        ),
      },
      {
        key: 'person_name',
        header: 'Person',
        render: (lead) => lead.person_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'organization_name',
        header: 'Organization',
        render: (lead) => lead.organization_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'owner_name',
        header: 'Owner',
      },
      {
        key: 'source_name',
        header: 'Source',
        render: (lead) => (
          <span className="text-gray-600 dark:text-gray-300">
            {lead.source_name || 'Not specified'}
          </span>
        ),
      },
      {
        key: 'type_name',
        header: 'Type',
      },
      {
        key: 'pipeline_name',
        header: 'Pipeline',
      },
      {
        key: 'stage_name',
        header: 'Stage',
        render: (lead) => {
          const badgeClass =
            lead.outcome === 'won'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              : lead.outcome === 'lost'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
          return (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}>
              {lead.stage_name}
            </span>
          );
        },
      },
      {
        key: 'lead_value',
        header: 'Lead Value',
        isNumeric: true,
        render: (lead) => (
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrencyInr(lead.lead_value)}
          </span>
        ),
        exportAccessor: (lead) => lead.lead_value,
      },
      {
        key: 'expected_close_date',
        header: 'Expected Close',
        render: (lead) => (
          <div className="flex items-center gap-1.5">
            <span>{formatDateDisplay(lead.expected_close_date)}</span>
            {lead.is_overdue && (
              <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                Overdue
              </span>
            )}
          </div>
        ),
        exportAccessor: (lead) => lead.expected_close_date || '',
      },
      {
        key: 'created_at',
        header: 'Created',
        render: (lead) => formatDateDisplay(lead.created_at),
        exportAccessor: (lead) => lead.created_at,
      },
    ],
    [onOpenDrawer]
  );

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
          title="Leads Created Timeline"
          subtitle="Daily creation · Date basis: Created date"
          className="lg:col-span-2"
        >
          <VerticalColumnsChart items={weeklyColumnItems} emptyMessage="No leads created in this period" />
        </ReportPanel>

        <ReportPanel title="Outcome Mix" subtitle="Open, won and lost distribution">
          <DonutChart
            items={outcomeDonutItems}
            centerLabel={String(kpis?.total_leads || 0)}
            centerSublabel="leads"
          />
        </ReportPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel title="Open Value by Owner" subtitle="Active pipeline leads only">
          <HorizontalBarsChart
            items={ownerBarsItems}
            emptyMessage="No open leads found for owners in this period"
          />
        </ReportPanel>

        <ReportPanel title="Lost Reasons Breakdown" subtitle="Why leads were marked lost">
          <HorizontalBarsChart
            items={lostReasonBarsItems}
            emptyMessage="No lost leads recorded in this selection"
          />
        </ReportPanel>
      </div>

      {/* Main Details Table */}
      <ReportDataTable<ILeadReportItem>
        tableId="lead_summary_table"
        title="Lead Details"
        unit="leads"
        columns={tableColumns}
        rows={leads}
        defaultSortKey="created_at"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="crm_lead_summary_report"
      />
    </div>
  );
};
