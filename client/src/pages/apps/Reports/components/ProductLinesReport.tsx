import React, { useMemo } from 'react';
import {
  IProductLinesReportData,
  IProductLineItem,
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
import { ReportDataTable } from './ReportDataTable';

interface ProductLinesReportProps {
  reportData: IProductLinesReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onOpenLeadDrawer: (leadId: number, leadTitle: string) => void;
}

export const ProductLinesReport: React.FC<ProductLinesReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onOpenLeadDrawer,
}) => {
  const kpis = reportData?.kpis;
  const lines = reportData?.lines || [];

  // KPI Items
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Total Product Lines',
        value: formatDisplayNumber(kpis.total_lines),
        subtitle: 'Line items on leads',
      },
      {
        label: 'Total Units Quantity',
        value: formatDisplayNumber(kpis.total_quantity),
        subtitle: 'Sum of line quantities',
      },
      {
        label: 'Total Product Value',
        value: formatCompactInr(kpis.total_amount),
        subtitle: 'Sum of all line amounts',
      },
      {
        label: 'Distinct Products',
        value: formatDisplayNumber(kpis.distinct_products),
        subtitle: 'Catalog items referenced',
      },
      {
        label: 'Distinct Leads',
        value: formatDisplayNumber(kpis.distinct_leads),
        subtitle: 'Leads with line items',
      },
      {
        label: 'Average Line Value',
        value: formatCurrencyInr(kpis.total_lines ? kpis.total_amount / kpis.total_lines : 0),
        subtitle: 'Per proposal line',
      },
    ];
  }, [kpis]);

  // Table Columns Definition
  const tableColumns: IReportColumnDefinition<IProductLineItem>[] = useMemo(
    () => [
      {
        key: 'lead_id',
        header: 'Lead ID',
        render: (line) => (
          <button
            type="button"
            onClick={() => onOpenLeadDrawer(line.lead_id, line.lead_title)}
            className="text-[#0e90d9] hover:underline font-semibold"
          >
            #{line.lead_id}
          </button>
        ),
        exportAccessor: (line) => `#${line.lead_id}`,
      },
      {
        key: 'lead_title',
        header: 'Lead Name',
        render: (line) => (
          <span
            className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate block"
            title={line.lead_title}
          >
            {line.lead_title}
          </span>
        ),
      },
      {
        key: 'product_name',
        header: 'Product Name',
        render: (line) => (
          <span className="font-semibold text-gray-800 dark:text-gray-100 max-w-[180px] truncate block" title={line.product_name}>
            {line.product_name}
          </span>
        ),
      },
      {
        key: 'sku',
        header: 'SKU',
        render: (line) => (
          <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
            {line.sku || '—'}
          </span>
        ),
      },
      {
        key: 'quantity',
        header: 'Qty',
        isNumeric: true,
        render: (line) => formatDisplayNumber(line.quantity),
      },
      {
        key: 'unit_price',
        header: 'Unit Price',
        isNumeric: true,
        render: (line) => formatCurrencyInr(line.unit_price),
      },
      {
        key: 'amount',
        header: 'Line Amount',
        isNumeric: true,
        render: (line) => (
          <div className="flex items-center justify-end gap-1 font-bold text-gray-900 dark:text-white">
            <span>{formatCurrencyInr(line.amount)}</span>
            {line.is_calculated && (
              <span
                className="text-amber-500 text-xs cursor-help"
                title="Amount was calculated as Quantity × Unit Price"
              >
                *
              </span>
            )}
          </div>
        ),
        exportAccessor: (line) => line.amount,
      },
      {
        key: 'pipeline_name',
        header: 'Pipeline',
      },
      {
        key: 'stage_name',
        header: 'Stage',
        render: (line) => {
          const badgeClass =
            line.outcome === 'won'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              : line.outcome === 'lost'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
          return (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}>
              {line.stage_name}
            </span>
          );
        },
      },
      {
        key: 'owner_name',
        header: 'Lead Owner',
      },
      {
        key: 'organization_name',
        header: 'Organization',
        render: (line) => line.organization_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'warehouse_name',
        header: 'Warehouse',
        render: (line) => line.warehouse_name || <span className="text-gray-400">—</span>,
      },
    ],
    [onOpenLeadDrawer]
  );

  return (
    <div className="space-y-4">
      {/* Notice info */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-300">
        <i className="mgc_box_3_line text-base text-purple-600 shrink-0" />
        <span>
          Dedicated Report: Detailed item-by-item breakdown of all 49+ product lines attached to lead
          proposals with individual pricing, warehouse sources, and pipeline stages.
        </span>
      </div>

      {/* Dedicated KPI Cards */}
      <ReportKpiCards
        kpiItems={kpiItems}
        activeFilter={{}}
        onKpiClick={(applyFilter) => onFilterChange(applyFilter)}
      />

      {/* Main Product Lines Table */}
      <ReportDataTable<IProductLineItem>
        tableId="product_lines_table"
        title="Product Lines on Leads"
        unit="lines"
        columns={tableColumns}
        rows={lines}
        defaultSortKey="amount"
        defaultSortDirection="desc"
        defaultPageSize={10}
        onClearFilters={onClearFilters}
        exportFilename="crm_product_lines_on_leads_report"
      />
    </div>
  );
};
