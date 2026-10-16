import React, { useMemo } from 'react';
import {
  IActivitiesReportData,
  IActivityReportItem,
  IReportColumnDefinition,
  IReportKpiItem,
  IReportFilterState,
  IReportStackedBarGroup,
} from '@/interface';
import {
  formatDisplayNumber,
  formatDateTimeDisplay,
  formatDateDisplay,
} from '../reportHelpers';
import { ReportKpiCards } from './ReportKpiCards';
import {
  ReportPanel,
  DonutChart,
  StackedBarsChart,
  VerticalColumnsChart,
} from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface ActivitiesReportProps {
  reportData: IActivitiesReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onOpenDrawer: (activity: IActivityReportItem) => void;
  onOpenLeadDrawer?: (leadId: number, leadTitle: string) => void;
}

export const ActivitiesReport: React.FC<ActivitiesReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onOpenDrawer,
  onOpenLeadDrawer,
}) => {
  const kpis = reportData?.kpis;
  const activities = reportData?.activities || [];

  // KPI Items
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Total Activities',
        value: formatDisplayNumber(kpis.total_activities),
        subtitle: 'Scheduled in period',
        apply: { activityStatus: '', activityOverdueOnly: '' },
      },
      {
        label: 'Completed',
        value: formatDisplayNumber(kpis.completed_count),
        subtitle: `${kpis.completion_rate || 0}% completion rate`,
        apply: { activityStatus: 'Completed', activityOverdueOnly: '' },
      },
      {
        label: 'Pending',
        value: formatDisplayNumber(kpis.pending_count),
        subtitle: 'Not marked completed',
        apply: { activityStatus: 'Pending', activityOverdueOnly: '' },
      },
      {
        label: 'Overdue',
        value: formatDisplayNumber(kpis.overdue_count),
        subtitle: 'Past schedule, not done',
        apply: { activityOverdueOnly: 'yes', activityStatus: '' },
      },
      {
        label: 'Scheduled Today',
        value: formatDisplayNumber(kpis.scheduled_today_count),
        subtitle: formatDateDisplay(new Date().toISOString()),
      },
      {
        label: 'Completion Rate',
        value: `${kpis.completion_rate || 0}%`,
        subtitle: 'Completed ÷ Total',
      },
    ];
  }, [kpis]);

  // Activity Type Donut Data
  const typeColors: Record<string, string> = {
    Call: '#0e90d9',
    Meeting: '#10b981',
    Task: '#f59e0b',
    Email: '#8b5cf6',
    Lunch: '#ec4899',
    Note: '#6b7280',
    File: '#06b6d4',
  };

  const typeDonutItems = useMemo(() => {
    if (!reportData?.type_mix) return [];
    return reportData.type_mix.map((item) => ({
      label: item.label,
      value: item.count,
      displayText: formatDisplayNumber(item.count),
      color: typeColors[item.label] || '#0e90d9',
    }));
  }, [reportData?.type_mix]);

  // User Breakdown Stacked Groups
  const userStackedGroups: IReportStackedBarGroup[] = useMemo(() => {
    if (!reportData?.user_breakdown) return [];
    return reportData.user_breakdown.map((item) => ({
      label: item.label,
      totalDisplay: formatDisplayNumber(item.completed + item.pending + item.overdue),
      segments: [
        { name: 'Completed', value: item.completed, color: '#10b981' },
        { name: 'Pending', value: item.pending, color: '#3b82f6' },
        { name: 'Overdue', value: item.overdue, color: '#f59e0b' },
      ],
    }));
  }, [reportData?.user_breakdown]);

  // Upcoming Days Columns
  const upcomingColumnItems = useMemo(() => {
    if (!reportData?.upcoming_days) return [];
    return reportData.upcoming_days.map((dayItem) => ({
      label: dayItem.label,
      value: dayItem.count,
      displayText: String(dayItem.count),
      color: '#0e90d9',
    }));
  }, [reportData?.upcoming_days]);

  // Table Columns Definition
  const tableColumns: IReportColumnDefinition<IActivityReportItem>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Activity ID',
        render: (act) => (
          <button
            type="button"
            onClick={() => onOpenDrawer(act)}
            className="text-[#0e90d9] hover:underline font-semibold"
          >
            #{act.id}
          </button>
        ),
        exportAccessor: (act) => `#${act.id}`,
      },
      {
        key: 'title',
        header: 'Title',
        render: (act) => (
          <span className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate block" title={act.title}>
            {act.title}
          </span>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (act) => (
          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-300">
            {act.type}
          </span>
        ),
      },
      {
        key: 'lead_title',
        header: 'Lead',
        render: (act) =>
          act.lead_id ? (
            <button
              type="button"
              onClick={() => onOpenLeadDrawer && onOpenLeadDrawer(act.lead_id!, act.lead_title || '')}
              className="text-[#0e90d9] hover:underline font-medium max-w-[170px] truncate block text-left"
              title={act.lead_title || ''}
            >
              #{act.lead_id} {act.lead_title}
            </button>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: 'person_name',
        header: 'Person',
        render: (act) => act.person_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'user_name',
        header: 'Assigned To',
      },
      {
        key: 'schedule_from',
        header: 'Starts',
        render: (act) => formatDateTimeDisplay(act.schedule_from),
      },
      {
        key: 'schedule_to',
        header: 'Ends',
        render: (act) => formatDateTimeDisplay(act.schedule_to),
      },
      {
        key: 'computed_status',
        header: 'Status',
        render: (act) => {
          const badgeClass =
            act.computed_status === 'Completed'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              : act.computed_status === 'Overdue'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
          return (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}>
              {act.computed_status}
            </span>
          );
        },
      },
      {
        key: 'location',
        header: 'Location',
        render: (act) => act.location || <span className="text-gray-400">—</span>,
      },
      {
        key: 'comment',
        header: 'Comments',
        render: (act) => (
          <span className="max-w-[150px] truncate block text-gray-500 dark:text-gray-400" title={act.comment || ''}>
            {act.comment || '—'}
          </span>
        ),
      },
    ],
    [onOpenDrawer, onOpenLeadDrawer]
  );

  return (
    <div className="space-y-4">
      {/* Dynamic KPI Cards */}
      <ReportKpiCards
        kpiItems={kpiItems}
        activeFilter={{
          activityStatus: filterState.activityStatus,
          activityOverdueOnly: filterState.activityOverdueOnly,
        }}
        onKpiClick={(applyFilter) => onFilterChange(applyFilter)}
      />

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportPanel title="Activity Types" subtitle="Share of activities in period">
          <DonutChart
            items={typeDonutItems}
            centerLabel={String(kpis?.total_activities || 0)}
            centerSublabel="Activities"
          />
        </ReportPanel>

        <ReportPanel
          title="By Assigned User"
          subtitle="Completed, pending and overdue breakdown"
        >
          <StackedBarsChart
            groups={userStackedGroups}
            legend={[
              { label: 'Completed', color: '#10b981' },
              { label: 'Pending', color: '#3b82f6' },
              { label: 'Overdue', color: '#f59e0b' },
            ]}
          />
        </ReportPanel>

        <ReportPanel
          title="Coming Up: Next 7 Days"
          subtitle="Open activities scheduled per day"
          className="md:col-span-2 lg:col-span-1"
        >
          <VerticalColumnsChart items={upcomingColumnItems} emptyMessage="No activities due in next 7 days" />
        </ReportPanel>
      </div>

      {/* Main Table */}
      <ReportDataTable<IActivityReportItem>
        tableId="activities_table"
        title="Activity Details"
        unit="activities"
        columns={tableColumns}
        rows={activities}
        defaultSortKey="schedule_from"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="crm_activities_and_followups_report"
      />
    </div>
  );
};
