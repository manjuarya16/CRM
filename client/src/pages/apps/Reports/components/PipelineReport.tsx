import React, { useMemo } from 'react';
import {
  IPipelineReportData,
  IPipelineStageReportItem,
  IPipelineAttentionLead,
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
import { ReportPanel, HorizontalBarsChart } from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface PipelineReportProps {
  reportData: IPipelineReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onOpenLeadDrawer: (leadId: number, leadTitle: string) => void;
  onDrillDownStage?: (stageName: string) => void;
}

export const PipelineReport: React.FC<PipelineReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onOpenLeadDrawer,
  onDrillDownStage,
}) => {
  const kpis = reportData?.kpis;
  const stages = reportData?.stages || [];
  const attentionLeads = reportData?.attention_leads || [];

  // KPI Items
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Open Pipeline Value',
        value: formatCompactInr(kpis.open_pipeline_value),
        subtitle: 'Won & lost excluded',
        apply: { selectedOutcome: 'open' },
      },
      {
        label: 'Open Leads',
        value: formatDisplayNumber(kpis.open_leads_count),
        subtitle: 'In active stages',
        apply: { selectedOutcome: 'open' },
      },
      {
        label: 'Weighted Pipeline Value',
        value: formatCompactInr(kpis.weighted_pipeline_value),
        subtitle: 'Value × stage probability',
      },
      {
        label: 'Closing This Month',
        value: formatDisplayNumber(kpis.closing_this_month_count),
        subtitle: formatCompactInr(kpis.closing_this_month_value),
      },
      {
        label: 'Past Expected Close',
        value: formatDisplayNumber(kpis.overdue_leads_count),
        subtitle: `${formatCompactInr(kpis.overdue_leads_value)} at risk`,
      },
      {
        label: 'Over Stage-Aging Limit',
        value: formatDisplayNumber(kpis.rotten_stuck_count),
        subtitle: 'Stuck beyond rotten threshold',
      },
    ];
  }, [kpis]);

  // Funnel Bars Data (Open stages)
  const funnelBars = useMemo(() => {
    return stages
      .filter((s) => s.stage_code !== 'won' && s.stage_code !== 'lost')
      .map((stage) => ({
        label: `${stage.stage_name} (${stage.probability}%)`,
        value: stage.stage_value,
        displayText: `${formatCompactInr(stage.stage_value)} · ${stage.leads_count} leads`,
        color: '#0e90d9',
      }));
  }, [stages]);

  // Average Days in Stage Bars Data
  const avgDaysBars = useMemo(() => {
    return stages
      .filter((s) => s.stage_code !== 'won' && s.stage_code !== 'lost')
      .map((stage) => {
        const isSlow = stage.rotten_days > 0 && stage.avg_days_in_stage > stage.rotten_days;
        return {
          label: stage.stage_name,
          value: stage.avg_days_in_stage || 0,
          displayText: `${(stage.avg_days_in_stage || 0).toFixed(1)} d`,
          color: isSlow ? '#f59e0b' : '#3b82f6',
        };
      });
  }, [stages]);

  // Stage Table Columns
  const stageColumns: IReportColumnDefinition<IPipelineStageReportItem>[] = useMemo(
    () => [
      {
        key: 'pipeline_name',
        header: 'Pipeline',
      },
      {
        key: 'sort_order',
        header: 'Order',
        isNumeric: true,
      },
      {
        key: 'stage_name',
        header: 'Stage',
        render: (item) => (
          <button
            type="button"
            onClick={() => onDrillDownStage && onDrillDownStage(item.stage_name)}
            className="text-[#0e90d9] hover:underline font-semibold"
          >
            {item.stage_name}
          </button>
        ),
      },
      {
        key: 'probability',
        header: 'Probability',
        isNumeric: true,
        render: (item) => `${item.probability}%`,
      },
      {
        key: 'leads_count',
        header: 'Leads',
        isNumeric: true,
        render: (item) => formatDisplayNumber(item.leads_count),
      },
      {
        key: 'stage_value',
        header: 'Stage Value',
        isNumeric: true,
        render: (item) => formatCurrencyInr(item.stage_value),
      },
      {
        key: 'weighted_value',
        header: 'Weighted Value',
        isNumeric: true,
        render: (item) => formatCurrencyInr(item.weighted_value),
      },
      {
        key: 'avg_days_in_stage',
        header: 'Avg Days in Stage',
        isNumeric: true,
        render: (item) => {
          const isSlow = item.rotten_days > 0 && item.avg_days_in_stage > item.rotten_days;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <span>{(item.avg_days_in_stage || 0).toFixed(1)}</span>
              {isSlow && (
                <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                  Slow
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'overdue_count',
        header: 'Overdue Leads',
        isNumeric: true,
        render: (item) =>
          item.overdue_count > 0 ? (
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {formatDisplayNumber(item.overdue_count)}
            </span>
          ) : (
            '0'
          ),
      },
    ],
    [onDrillDownStage]
  );

  // Totals Row for Stages
  const stageTotals = useMemo(() => {
    if (stages.length === 0) return undefined;
    const leadsTot = stages.reduce((acc, s) => acc + s.leads_count, 0);
    const valueTot = stages.reduce((acc, s) => acc + s.stage_value, 0);
    const weightedTot = stages.reduce((acc, s) => acc + s.weighted_value, 0);
    const overdueTot = stages.reduce((acc, s) => acc + s.overdue_count, 0);

    return {
      pipeline_name: 'Total',
      sort_order: '',
      stage_name: '',
      probability: '',
      leads_count: formatDisplayNumber(leadsTot),
      stage_value: formatCurrencyInr(valueTot),
      weighted_value: formatCurrencyInr(weightedTot),
      avg_days_in_stage: '—',
      overdue_count: formatDisplayNumber(overdueTot),
    };
  }, [stages]);

  // Attention Leads Columns
  const attentionColumns: IReportColumnDefinition<IPipelineAttentionLead>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Lead ID',
        render: (lead) => (
          <button
            type="button"
            onClick={() => onOpenLeadDrawer(lead.id, lead.title)}
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
        key: 'owner_name',
        header: 'Owner',
      },
      {
        key: 'stage_name',
        header: 'Stage',
        render: (lead) => (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
            {lead.stage_name}
          </span>
        ),
      },
      {
        key: 'lead_value',
        header: 'Lead Value',
        isNumeric: true,
        render: (lead) => formatCurrencyInr(lead.lead_value),
      },
      {
        key: 'days_in_stage',
        header: 'Days in Stage',
        isNumeric: true,
        render: (lead) => (
          <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">
            {lead.days_in_stage}
          </span>
        ),
      },
      {
        key: 'expected_close_date',
        header: 'Expected Close',
        render: (lead) => formatDateDisplay(lead.expected_close_date),
      },
      {
        key: 'flags',
        header: 'Why It Needs Attention',
        render: (lead) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            {lead.is_overdue && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                Past Close Date
              </span>
            )}
            {lead.is_stuck && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                Stuck in Stage
              </span>
            )}
          </div>
        ),
        exportAccessor: (lead) =>
          [lead.is_overdue ? 'Past Close Date' : '', lead.is_stuck ? 'Stuck in Stage' : '']
            .filter(Boolean)
            .join('; '),
      },
    ],
    [onOpenLeadDrawer]
  );

  return (
    <div className="space-y-4">
      {/* Notice info */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
        <i className="mgc_time_line text-base text-[#0e90d9] shrink-0" />
        <span>
          Stage aging is tracked with the <code>lead_stage_history</code> table and trigger. Amber bars
          highlight stages exceeding rotten-days limits.
        </span>
      </div>

      {/* Dynamic KPI Cards */}
      <ReportKpiCards
        kpiItems={kpiItems}
        activeFilter={{ selectedOutcome: filterState.selectedOutcome }}
        onKpiClick={(applyFilter) => onFilterChange(applyFilter)}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel
          title="Pipeline Funnel"
          subtitle="Open pipeline value by stage with lead count"
        >
          <HorizontalBarsChart items={funnelBars} />
        </ReportPanel>

        <ReportPanel
          title="Average Days in Stage"
          subtitle="Amber indicates stages exceeding rotten days threshold"
        >
          <HorizontalBarsChart items={avgDaysBars} />
        </ReportPanel>
      </div>

      {/* Pipeline by Stage Table */}
      <ReportDataTable<IPipelineStageReportItem>
        tableId="pipeline_stages_table"
        title="Pipeline by Stage"
        unit="stages"
        columns={stageColumns}
        rows={stages}
        defaultSortKey="sort_order"
        defaultSortDirection="asc"
        totalsRow={stageTotals}
        disablePagination={true}
        onClearFilters={onClearFilters}
        exportFilename="crm_sales_pipeline_by_stage"
      />

      {/* Leads That Need Attention Table */}
      <ReportDataTable<IPipelineAttentionLead>
        tableId="attention_leads_table"
        title="Leads That Need Attention"
        unit="leads at risk"
        columns={attentionColumns}
        rows={attentionLeads}
        defaultSortKey="days_in_stage"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="crm_pipeline_leads_needing_attention"
      />
    </div>
  );
};
