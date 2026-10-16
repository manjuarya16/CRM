import React, { useMemo } from 'react';
import {
  IProductValueReportData,
  IProductValueItem,
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
  DonutChart,
} from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface ProductValueReportProps {
  reportData: IProductValueReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
  onSelectProduct?: (productName: string) => void;
}

export const ProductValueReport: React.FC<ProductValueReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
  onSelectProduct,
}) => {
  const kpis = reportData?.kpis;
  const products = reportData?.products || [];

  // KPI Items
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Products on Leads',
        value: formatDisplayNumber(kpis.products_count),
        subtitle: 'Distinct catalog items',
      },
      {
        label: 'Total Quantity',
        value: formatDisplayNumber(kpis.total_quantity),
        subtitle: 'Units across all lines',
      },
      {
        label: 'Total Product Value',
        value: formatCompactInr(kpis.total_product_value),
        subtitle: 'Line amounts sum',
      },
      {
        label: 'Open Pipeline Value',
        value: formatCompactInr(kpis.open_product_value),
        subtitle: 'Open leads only',
        apply: { selectedOutcome: 'open' },
      },
      {
        label: 'Won Product Value',
        value: formatCompactInr(kpis.won_product_value),
        subtitle: 'Converted orders',
        apply: { selectedOutcome: 'won' },
      },
      {
        label: 'Leads with Products',
        value: formatDisplayNumber(kpis.leads_with_products_count),
        subtitle: 'Distinct leads',
      },
    ];
  }, [kpis]);

  // Stacked Outcome Bar Groups
  const stackedOutcomeGroups: IReportStackedBarGroup[] = useMemo(() => {
    return products.map((item) => ({
      label: item.product_name,
      totalDisplay: formatCompactInr(item.total_value),
      segments: [
        { name: 'Won', value: item.won_value, color: '#10b981' },
        { name: 'Open', value: item.open_value, color: '#3b82f6' },
        { name: 'Lost', value: item.lost_value, color: '#ef4444' },
      ],
    }));
  }, [products]);

  // Outcome Split Donut Items
  const outcomeSplitDonutItems = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Open',
        value: kpis.open_product_value,
        displayText: formatCompactInr(kpis.open_product_value),
        color: '#3b82f6',
      },
      {
        label: 'Won',
        value: kpis.won_product_value,
        displayText: formatCompactInr(kpis.won_product_value),
        color: '#10b981',
      },
      {
        label: 'Lost',
        value: Math.max(kpis.total_product_value - (kpis.open_product_value + kpis.won_product_value), 0),
        displayText: formatCompactInr(
          Math.max(kpis.total_product_value - (kpis.open_product_value + kpis.won_product_value), 0)
        ),
        color: '#ef4444',
      },
    ];
  }, [kpis]);

  // Table Columns Definition (including Open, Won, Lost lead counts!)
  const tableColumns: IReportColumnDefinition<IProductValueItem>[] = useMemo(
    () => [
      {
        key: 'product_name',
        header: 'Product',
        render: (item) => (
          <button
            type="button"
            onClick={() => onSelectProduct && onSelectProduct(item.product_name)}
            className="text-[#0e90d9] hover:underline font-semibold text-left max-w-[200px] truncate block"
            title={item.product_name}
          >
            {item.product_name}
          </button>
        ),
      },
      {
        key: 'sku',
        header: 'SKU',
        render: (item) => (
          <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
            {item.sku || '—'}
          </span>
        ),
      },
      {
        key: 'product_type',
        header: 'Type',
        render: (item) => {
          const isService = item.product_type?.toLowerCase() === 'service';
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                isService
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              }`}
            >
              <span>{isService ? '⚡ Service' : '📦 Product'}</span>
            </span>
          );
        },
      },
      {
        key: 'open_leads_count',
        header: 'Open Leads',
        isNumeric: true,
        render: (item) => (
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {formatDisplayNumber(item.open_leads_count)}
          </span>
        ),
      },
      {
        key: 'won_leads_count',
        header: 'Won Leads',
        isNumeric: true,
        render: (item) => (
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {formatDisplayNumber(item.won_leads_count)}
          </span>
        ),
      },
      {
        key: 'lost_leads_count',
        header: 'Lost Leads',
        isNumeric: true,
        render: (item) => (
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            {formatDisplayNumber(item.lost_leads_count)}
          </span>
        ),
      },
      {
        key: 'total_leads_count',
        header: 'Total Leads',
        isNumeric: true,
        render: (item) => (
          <span className="font-bold text-gray-800 dark:text-white">
            {formatDisplayNumber(item.total_leads_count)}
          </span>
        ),
      },
      {
        key: 'total_quantity',
        header: 'Quantity',
        isNumeric: true,
        render: (item) => formatDisplayNumber(item.total_quantity),
      },
      {
        key: 'avg_unit_price',
        header: 'Avg Unit Price',
        isNumeric: true,
        render: (item) => formatCurrencyInr(item.avg_unit_price),
      },
      {
        key: 'open_value',
        header: 'Open Value',
        isNumeric: true,
        render: (item) => formatCurrencyInr(item.open_value),
      },
      {
        key: 'won_value',
        header: 'Won Value',
        isNumeric: true,
        render: (item) => (
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {formatCurrencyInr(item.won_value)}
          </span>
        ),
      },
      {
        key: 'lost_value',
        header: 'Lost Value',
        isNumeric: true,
        render: (item) => (
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            {formatCurrencyInr(item.lost_value)}
          </span>
        ),
      },
      {
        key: 'total_value',
        header: 'Total Value',
        isNumeric: true,
        render: (item) => (
          <span className="font-bold text-gray-900 dark:text-white">
            {formatCurrencyInr(item.total_value)}
          </span>
        ),
      },
      {
        key: 'share_percent',
        header: 'Share %',
        isNumeric: true,
        render: (item) => `${item.share_percent || 0}%`,
      },
    ],
    [onSelectProduct]
  );

  // Totals Row
  const totalsRow = useMemo(() => {
    if (products.length === 0) return undefined;
    const openLeadsTot = products.reduce((acc, p) => acc + (p.open_leads_count || 0), 0);
    const wonLeadsTot = products.reduce((acc, p) => acc + (p.won_leads_count || 0), 0);
    const lostLeadsTot = products.reduce((acc, p) => acc + (p.lost_leads_count || 0), 0);
    const totalLeadsTot = products.reduce((acc, p) => acc + (p.total_leads_count || 0), 0);
    const totalQtyTot = products.reduce((acc, p) => acc + (p.total_quantity || 0), 0);
    const openValTot = products.reduce((acc, p) => acc + (p.open_value || 0), 0);
    const wonValTot = products.reduce((acc, p) => acc + (p.won_value || 0), 0);
    const lostValTot = products.reduce((acc, p) => acc + (p.lost_value || 0), 0);
    const totalValTot = products.reduce((acc, p) => acc + (p.total_value || 0), 0);

    return {
      product_name: 'Total',
      sku: '',
      open_leads_count: formatDisplayNumber(openLeadsTot),
      won_leads_count: formatDisplayNumber(wonLeadsTot),
      lost_leads_count: formatDisplayNumber(lostLeadsTot),
      total_leads_count: formatDisplayNumber(totalLeadsTot),
      total_quantity: formatDisplayNumber(totalQtyTot),
      avg_unit_price: '—',
      open_value: formatCurrencyInr(openValTot),
      won_value: formatCurrencyInr(wonValTot),
      lost_value: formatCurrencyInr(lostValTot),
      total_value: formatCurrencyInr(totalValTot),
      share_percent: '100%',
    };
  }, [products]);

  return (
    <div className="space-y-4">
      {/* Notice info */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
        <i className="mgc_information_line text-base text-[#0e90d9] shrink-0" />
        <span>
          Product value reflects line amounts attached to lead proposals. Distinct columns now track
          Open, Won, and Lost lead counts per product.
        </span>
      </div>

      {/* Dynamic KPI Cards */}
      <ReportKpiCards
        kpiItems={kpiItems}
        activeFilter={{ selectedOutcome: filterState.selectedOutcome }}
        onKpiClick={(applyFilter) => onFilterChange(applyFilter)}
      />

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReportPanel
          title="Product Value by Outcome"
          subtitle="Line amounts for won, open, and lost leads"
          className="lg:col-span-2"
        >
          <StackedBarsChart
            groups={stackedOutcomeGroups}
            legend={[
              { label: 'Won', color: '#10b981' },
              { label: 'Open', color: '#3b82f6' },
              { label: 'Lost', color: '#ef4444' },
            ]}
          />
        </ReportPanel>

        <ReportPanel title="Outcome Split" subtitle="Total product value distribution">
          <DonutChart
            items={outcomeSplitDonutItems}
            centerLabel={formatCompactInr(kpis?.total_product_value || 0)}
            centerSublabel="Product value"
          />
        </ReportPanel>
      </div>

      {/* Product Value Table */}
      <ReportDataTable<IProductValueItem>
        tableId="product_value_table"
        title="Value by Product"
        unit="products"
        columns={tableColumns}
        rows={products}
        defaultSortKey="total_value"
        defaultSortDirection="desc"
        totalsRow={totalsRow}
        disablePagination={true}
        onClearFilters={onClearFilters}
        exportFilename="crm_product_wise_lead_value"
      />
    </div>
  );
};
