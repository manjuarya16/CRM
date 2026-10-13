import React, { useMemo } from 'react';
import {
  IQuotesReportData,
  IQuoteReportItem,
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
  DonutChart,
  HorizontalBarsChart,
  VerticalColumnsChart,
} from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface QuotesReportProps {
  reportData: IQuotesReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onOpenDrawer: (quote: IQuoteReportItem) => void;
  onOpenLeadDrawer?: (leadId: number, leadTitle: string) => void;
}

export const QuotesReport: React.FC<QuotesReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onOpenDrawer,
  onOpenLeadDrawer,
}) => {
  const kpis = reportData?.kpis;
  const quotes = reportData?.quotes || [];

  // KPI Items
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Total Quotes',
        value: formatDisplayNumber(kpis.total_quotes),
        subtitle: 'Created in period',
        apply: { quoteStatus: '', quoteExpiry: '' },
      },
      {
        label: 'Total Quote Value',
        value: formatCompactInr(kpis.total_quote_value),
        subtitle: 'Sum of grand totals',
      },
      {
        label: 'Average Quote Value',
        value: formatCompactInr(kpis.avg_quote_value),
        subtitle: 'Grand total ÷ quotes',
      },
      {
        label: 'Expiring Soon',
        value: formatDisplayNumber(kpis.expiring_soon_count),
        subtitle: 'Next 7 days, undecided',
        apply: { quoteExpiry: 'soon' },
      },
      {
        label: 'Expired Without Decision',
        value: formatDisplayNumber(kpis.expired_unresolved_count),
        subtitle: `${formatCompactInr(kpis.expired_unresolved_value)} unresolved`,
        apply: { quoteExpiry: 'expired', quoteStatus: '' },
      },
      {
        label: 'Accepted Quotes',
        value: formatCompactInr(kpis.accepted_value),
        subtitle: `${formatDisplayNumber(kpis.accepted_count)} quotes accepted`,
        apply: { quoteStatus: 'Accepted', quoteExpiry: '' },
      },
    ];
  }, [kpis]);

  // Quote Status Donut Data
  const statusColors: Record<string, string> = {
    Draft: '#6b7280',
    Sent: '#3b82f6',
    Accepted: '#10b981',
    Rejected: '#ef4444',
  };

  const statusDonutItems = useMemo(() => {
    if (!reportData?.status_mix) return [];
    return reportData.status_mix.map((item) => ({
      label: item.label,
      value: item.count,
      displayText: formatDisplayNumber(item.count),
      color: statusColors[item.label] || '#0e90d9',
    }));
  }, [reportData?.status_mix]);

  // Owner Grand Total Bars Data
  const ownerBarsItems = useMemo(() => {
    if (!reportData?.owner_values) return [];
    return reportData.owner_values.map((ownerItem) => ({
      label: ownerItem.label,
      value: ownerItem.value,
      displayText: formatCompactInr(ownerItem.value),
      color: '#0e90d9',
    }));
  }, [reportData?.owner_values]);

  // Expiry Timeline Buckets
  const expiryBuckets = useMemo(() => {
    const expiredCount = quotes.filter((q) => q.is_expired && (q.quote_status === 'Draft' || q.quote_status === 'Sent')).length;
    const expiringSoonCount = quotes.filter((q) => q.is_expiring_soon && !q.is_expired).length;
    const laterCount = quotes.filter((q) => !q.is_expired && !q.is_expiring_soon).length;

    return [
      {
        label: 'Expired',
        value: expiredCount,
        displayText: String(expiredCount),
        color: '#ef4444',
      },
      {
        label: 'Next 7 Days',
        value: expiringSoonCount,
        displayText: String(expiringSoonCount),
        color: '#f59e0b',
      },
      {
        label: 'Later / Valid',
        value: laterCount,
        displayText: String(laterCount),
        color: '#10b981',
      },
    ];
  }, [quotes]);

  // Table Columns Definition
  const tableColumns: IReportColumnDefinition<IQuoteReportItem>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Quote ID',
        render: (q) => (
          <button
            type="button"
            onClick={() => onOpenDrawer(q)}
            className="text-[#0e90d9] hover:underline font-semibold"
          >
            Q-{q.id}
          </button>
        ),
        exportAccessor: (q) => `Q-${q.id}`,
      },
      {
        key: 'subject',
        header: 'Subject',
        render: (q) => (
          <span className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate block" title={q.subject}>
            {q.subject}
          </span>
        ),
      },
      {
        key: 'lead_title',
        header: 'Lead',
        render: (q) =>
          q.lead_id ? (
            <button
              type="button"
              onClick={() => onOpenLeadDrawer && onOpenLeadDrawer(q.lead_id!, q.lead_title || '')}
              className="text-[#0e90d9] hover:underline font-medium max-w-[170px] truncate block text-left"
              title={q.lead_title || ''}
            >
              #{q.lead_id} {q.lead_title}
            </button>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: 'person_name',
        header: 'Person',
        render: (q) => q.person_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'owner_name',
        header: 'Owner',
      },
      {
        key: 'quote_status',
        header: 'Status',
        render: (q) => {
          const badgeClass =
            q.quote_status === 'Accepted'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              : q.quote_status === 'Rejected'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
          return (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}>
              {q.quote_status}
            </span>
          );
        },
      },
      {
        key: 'sub_total',
        header: 'Subtotal',
        isNumeric: true,
        render: (q) => formatCurrencyInr(q.sub_total),
      },
      {
        key: 'discount_amount',
        header: 'Discount',
        isNumeric: true,
        render: (q) =>
          Number(q.discount_amount) > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              -{formatCurrencyInr(q.discount_amount)}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: 'tax_amount',
        header: 'Tax',
        isNumeric: true,
        render: (q) => formatCurrencyInr(q.tax_amount),
      },
      {
        key: 'grand_total',
        header: 'Grand Total',
        isNumeric: true,
        render: (q) => (
          <span className="font-bold text-gray-900 dark:text-white">
            {formatCurrencyInr(q.grand_total)}
          </span>
        ),
      },
      {
        key: 'expired_at',
        header: 'Expires',
        render: (q) => (
          <div className="flex items-center gap-1.5">
            <span>{formatDateDisplay(q.expired_at)}</span>
            {q.is_expired ? (
              <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                Expired
              </span>
            ) : q.is_expiring_soon ? (
              <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                Soon
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'created_at',
        header: 'Created',
        render: (q) => formatDateDisplay(q.created_at),
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
          quoteStatus: filterState.quoteStatus,
          quoteExpiry: filterState.quoteExpiry,
        }}
        onKpiClick={(applyFilter) => onFilterChange(applyFilter)}
      />

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportPanel title="Quote Status Breakdown" subtitle="Distribution of quotes by status">
          <DonutChart
            items={statusDonutItems}
            centerLabel={String(kpis?.total_quotes || 0)}
            centerSublabel="Quotes"
          />
        </ReportPanel>

        <ReportPanel title="Quote Value by Owner" subtitle="Sum of grand totals across sales reps">
          <HorizontalBarsChart items={ownerBarsItems} />
        </ReportPanel>

        <ReportPanel
          title="Expiry Timeline"
          subtitle="Undecided proposals by expiration status"
          className="md:col-span-2 lg:col-span-1"
        >
          <VerticalColumnsChart items={expiryBuckets} />
        </ReportPanel>
      </div>

      {/* Main Table */}
      <ReportDataTable<IQuoteReportItem>
        tableId="quotes_table"
        title="Quote Details"
        unit="quotes"
        columns={tableColumns}
        rows={quotes}
        defaultSortKey="created_at"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="crm_quotes_summary_report"
      />
    </div>
  );
};
