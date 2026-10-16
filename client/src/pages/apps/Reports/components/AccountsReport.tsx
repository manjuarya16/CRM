import React, { useMemo } from 'react';
import {
  IAccountsReportData,
  IAccountReportItem,
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
import { ReportPanel, HorizontalBarsChart, DonutChart } from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface AccountsReportProps {
  reportData: IAccountsReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
}

export const AccountsReport: React.FC<AccountsReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
}) => {
  const kpis = reportData?.kpis;
  const accounts = reportData?.accounts || [];

  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Total Accounts',
        value: formatDisplayNumber(kpis.total_accounts),
        subtitle: 'Registered client organizations',
      },
      {
        label: 'Active Accounts',
        value: formatDisplayNumber(kpis.active_accounts_count),
        subtitle: 'With open deals or recent activities',
      },
      {
        label: 'Won Revenue',
        value: formatCompactInr(kpis.total_won_revenue),
        subtitle: 'Lifetime closed revenue',
      },
      {
        label: 'Open Pipeline Value',
        value: formatCompactInr(kpis.total_open_value),
        subtitle: 'In-flight deals value',
      },
      {
        label: 'Top Account',
        value: kpis.top_account_name || '—',
        subtitle: 'Highest customer revenue',
      },
      {
        label: 'Inactive / Dormant',
        value: formatDisplayNumber(kpis.stale_accounts_count),
        subtitle: 'No deals or interactions',
      },
    ];
  }, [kpis]);

  const revenueBars = useMemo(() => {
    if (!reportData?.revenue_by_org) return [];
    return reportData.revenue_by_org.map((item) => ({
      ...item,
      displayText: formatCompactInr(item.value),
      color: '#0e90d9',
    }));
  }, [reportData?.revenue_by_org]);

  const engagementColors: Record<string, string> = {
    'Active Engagement': '#10b981',
    'In Discussion': '#3b82f6',
    'Closed Customer': '#8b5cf6',
    'No Recent Activity': '#9ca3af',
  };

  const engagementDonutItems = useMemo(() => {
    if (!reportData?.engagement_mix) return [];
    return reportData.engagement_mix.map((item) => ({
      label: item.label,
      value: item.count,
      displayText: formatDisplayNumber(item.count),
      color: engagementColors[item.label] || item.color || '#64748b',
    }));
  }, [reportData?.engagement_mix]);

  const columns: IReportColumnDefinition<IAccountReportItem>[] = useMemo(
    () => [
      {
        key: 'organization_name',
        header: 'Organization / Account',
        render: (row) => (
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {row.organization_name}
            </div>
            {row.location && (
              <div className="text-xs text-gray-400 dark:text-gray-500">{row.location}</div>
            )}
          </div>
        ),
      },
      {
        key: 'engagement_status',
        header: 'Engagement Status',
        accessor: (row) => row.engagement_status,
        render: (row) => {
          let badgeClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
          if (row.engagement_status === 'Active Engagement') {
            badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
          } else if (row.engagement_status === 'In Discussion') {
            badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
          } else if (row.engagement_status === 'Closed Customer') {
            badgeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300';
          }
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${badgeClass}`}>
              {row.engagement_status}
            </span>
          );
        },
      },
      {
        key: 'contacts_count',
        header: 'Contacts',
        isNumeric: true,
        accessor: (row) => row.contacts_count,
        render: (row) => (
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {formatDisplayNumber(row.contacts_count)}
          </span>
        ),
      },
      {
        key: 'won_deals',
        header: 'Won Deals',
        isNumeric: true,
        accessor: (row) => row.won_deals,
        render: (row) => (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatDisplayNumber(row.won_deals)}
          </span>
        ),
      },
      {
        key: 'won_value',
        header: 'Won Revenue',
        isNumeric: true,
        accessor: (row) => row.won_value,
        render: (row) => (
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
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
        key: 'total_activities',
        header: 'Activities Logged',
        isNumeric: true,
        accessor: (row) => row.total_activities,
        render: (row) => (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatDisplayNumber(row.total_activities)}
          </span>
        ),
      },
      {
        key: 'last_activity_at',
        header: 'Last Interaction',
        accessor: (row) => row.last_activity_at,
        render: (row) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateDisplay(row.last_activity_at)}
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
          title="Top Accounts by Won Revenue"
          subtitle="Client organizations with largest closed deal value"
        >
          <HorizontalBarsChart
            items={revenueBars}
            emptyMessage="No won deals associated with client accounts"
          />
        </ReportPanel>

        <ReportPanel
          title="Account Engagement Distribution"
          subtitle="Health status breakdown of organizations in CRM"
        >
          <DonutChart
            items={engagementDonutItems}
            centerLabel={String(kpis?.total_accounts || 0)}
            centerSublabel="Accounts"
            emptyMessage="No account data available"
          />
        </ReportPanel>
      </div>

      <ReportDataTable
        tableId="accounts-overview"
        title="Accounts & Organizations Performance"
        unit="accounts"
        columns={columns}
        rows={accounts}
        defaultSortKey="won_value"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="accounts_organizations_report.csv"
      />
    </div>
  );
};
