import React, { useMemo } from 'react';
import {
  IMarketingReportData,
  IMarketingFormItem,
  IMarketingCampaignItem,
  IReportColumnDefinition,
  IReportKpiItem,
  IReportFilterState,
} from '@/interface';
import {
  formatDisplayNumber,
  formatDateDisplay,
  formatDateTimeDisplay,
} from '../reportHelpers';
import { ReportKpiCards } from './ReportKpiCards';
import { ReportPanel, DonutChart, VerticalColumnsChart } from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface MarketingReportProps {
  reportData: IMarketingReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
}

export const MarketingReport: React.FC<MarketingReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
}) => {
  const kpis = reportData?.kpis;
  const forms = reportData?.forms || [];
  const campaigns = reportData?.campaigns || [];

  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Active Web Forms',
        value: formatDisplayNumber(kpis.active_forms_count),
        subtitle: 'Embedded lead forms',
      },
      {
        label: 'Total Form Submissions',
        value: formatDisplayNumber(kpis.total_submissions),
        subtitle: 'Inbound inquiries received',
      },
      {
        label: 'Top Performing Form',
        value: kpis.top_form_name || '—',
        subtitle: 'Highest submission volume',
      },
      {
        label: 'Marketing Campaigns',
        value: formatDisplayNumber(kpis.total_campaigns_count),
        subtitle: 'Active email / outreach campaigns',
      },
      {
        label: 'Associated Events',
        value: formatDisplayNumber(kpis.total_events_count),
        subtitle: 'Events linked to campaigns',
      },
    ];
  }, [kpis]);

  const formDonutItems = useMemo(() => {
    if (!reportData?.submissions_by_form) return [];
    const colors = ['#0e90d9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
    return reportData.submissions_by_form.map((item, index) => ({
      ...item,
      displayText: `${item.value} submissions`,
      color: colors[index % colors.length],
    }));
  }, [reportData?.submissions_by_form]);

  const trendColumns = useMemo(() => {
    if (!reportData?.submissions_trend) return [];
    return reportData.submissions_trend.map((item) => ({
      ...item,
      displayText: formatDisplayNumber(item.value),
      color: '#3b82f6',
    }));
  }, [reportData?.submissions_trend]);

  const formColumns: IReportColumnDefinition<IMarketingFormItem>[] = useMemo(
    () => [
      {
        key: 'form_title',
        header: 'Form Name',
        render: (row) => (
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{row.form_title}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">Slug: /{row.slug}</div>
          </div>
        ),
      },
      {
        key: 'pipeline_name',
        header: 'Assigned Pipeline',
        accessor: (row) => row.pipeline_name,
        render: (row) => (
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {row.pipeline_name || 'Default Pipeline'}
          </span>
        ),
      },
      {
        key: 'submission_count',
        header: 'Total Submissions',
        isNumeric: true,
        accessor: (row) => row.submission_count,
        render: (row) => (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            {formatDisplayNumber(row.submission_count)}
          </span>
        ),
      },
      {
        key: 'create_lead',
        header: 'Auto-Create Lead',
        accessor: (row) => (row.create_lead ? 'Enabled' : 'Disabled'),
        render: (row) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              row.create_lead
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {row.create_lead ? '✓ Auto Lead' : 'Disabled'}
          </span>
        ),
      },
      {
        key: 'last_submission_at',
        header: 'Latest Submission',
        accessor: (row) => row.last_submission_at,
        render: (row) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateTimeDisplay(row.last_submission_at)}
          </span>
        ),
      },
    ],
    []
  );

  const campaignColumns: IReportColumnDefinition<IMarketingCampaignItem>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Campaign Name',
        render: (row) => (
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{row.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Subject: {row.subject}</div>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Campaign Type',
        accessor: (row) => row.type,
        render: (row) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            {row.type}
          </span>
        ),
      },
      {
        key: 'event_name',
        header: 'Associated Event',
        accessor: (row) => row.event_name,
        render: (row) => (
          <span className="text-xs text-gray-700 dark:text-gray-300">
            {row.event_name || '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (row) => (row.status ? 'Active' : 'Inactive'),
        render: (row) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              row.status
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {row.status ? 'Active' : 'Paused'}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Created On',
        accessor: (row) => row.created_at,
        render: (row) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateDisplay(row.created_at)}
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
          title="Submissions by Web Form"
          subtitle="Share of inbound inquiries per active form"
        >
          <DonutChart
            items={formDonutItems}
            centerLabel={String(kpis?.total_submissions || 0)}
            centerSublabel="Submissions"
            emptyMessage="No web form submissions recorded"
          />
        </ReportPanel>

        <ReportPanel
          title="Weekly Inbound Submissions Trend"
          subtitle="Recent submission cadence over the past 4 weeks"
        >
          <VerticalColumnsChart
            items={trendColumns}
            emptyMessage="No weekly trend data available"
          />
        </ReportPanel>
      </div>

      <ReportDataTable
        tableId="marketing-webforms"
        title="Web Forms Inbound Performance"
        unit="forms"
        columns={formColumns}
        rows={forms}
        defaultSortKey="submission_count"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="marketing_webforms_report.csv"
      />

      <ReportDataTable
        tableId="marketing-campaigns"
        title="Marketing Campaigns & Events"
        unit="campaigns"
        columns={campaignColumns}
        rows={campaigns}
        defaultSortKey="created_at"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="marketing_campaigns_report.csv"
      />
    </div>
  );
};
