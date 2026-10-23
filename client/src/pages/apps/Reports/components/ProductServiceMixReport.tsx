import React, { useMemo } from 'react';
import {
  IProductServiceMixReportData,
  IProductServiceMixDealTypeItem,
  IProductServiceMixItem,
  IReportColumnDefinition,
  IReportKpiItem,
  IReportFilterState,
  IReportStackedBarGroup,
  IReportChartDataItem,
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

interface ProductServiceMixReportProps {
  reportData: IProductServiceMixReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
}

export const ProductServiceMixReport: React.FC<ProductServiceMixReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
}) => {
  const kpis = reportData?.kpis;
  const offeringOutcome = reportData?.offering_outcome || [];
  const shareDonut = reportData?.share_donut || [];
  const topServices = reportData?.top_services || [];
  const dealTypes = reportData?.deal_types || [];
  const items = reportData?.items || [];
  const insights = reportData?.insights || [];

  // KPIs
  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Total Offering Value',
        value: formatCompactInr(kpis.total_value),
        subtitle: `${kpis.total_leads_with_items} leads with items`,
        apply: { selectedOutcome: '' },
      },
      {
        label: 'Product Value',
        value: formatCompactInr(kpis.product_value),
        subtitle: `${kpis.product_share_pct}% of total value`,
        apply: { selectedProductType: 'Product' },
      },
      {
        label: 'Service Value',
        value: formatCompactInr(kpis.service_value),
        subtitle: `${kpis.service_share_pct}% of total value`,
        apply: { selectedProductType: 'Service' },
      },
      {
        label: 'Service Attach Rate',
        value: `${kpis.attach_rate_pct || 0}%`,
        subtitle: 'Product deals that include service',
      },
      {
        label: 'Deals with Both',
        value: formatDisplayNumber(kpis.leads_with_both),
        subtitle: 'Cross-sell bundled deals',
      },
      {
        label: 'Products Share',
        value: `${kpis.product_share_pct || 0}%`,
        subtitle: 'Pipeline item mix',
      },
    ];
  }, [kpis]);

  // Chart 1: Value by offering type & outcome (Stacked Bars)
  const stackedGroups: IReportStackedBarGroup[] = useMemo(() => {
    return offeringOutcome.map((item) => ({
      label: item.label === 'Product' ? 'Physical Products' : 'Services',
      totalDisplay: formatCompactInr(item.total_value),
      segments: [
        { name: 'Won', value: item.won_value, color: '#10b981' },
        { name: 'Open', value: item.open_value, color: '#3b82f6' },
        { name: 'Lost', value: item.lost_value, color: '#ef4444' },
      ],
    }));
  }, [offeringOutcome]);

  // Chart 2: Donut share of total value
  const donutItems: IReportChartDataItem[] = useMemo(() => {
    return shareDonut.map((item) => ({
      label: item.label === 'Product' ? 'Physical Products' : 'Services',
      value: item.value,
      displayText: formatCompactInr(item.value),
      color: item.label === 'Product' ? '#3b82f6' : '#f59e0b',
    }));
  }, [shareDonut]);

  // Chart 3: Top Services Horizontal Bars
  const serviceBars: IReportChartDataItem[] = useMemo(() => {
    return topServices.map((svc) => ({
      label: svc.label,
      value: svc.value,
      displayText: formatCompactInr(svc.value),
      color: '#f59e0b',
    }));
  }, [topServices]);

  // Deal type badge helper
  const renderDealKindPill = (kind: string) => {
    let bg = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    if (kind === 'Product + Service') {
      bg = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
    } else if (kind === 'Service only') {
      bg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${bg}`}>
        {kind}
      </span>
    );
  };

  // Table 1 Columns: Deal Types
  const dealTypeColumns: IReportColumnDefinition<IProductServiceMixDealTypeItem>[] = [
    {
      key: 'deal_kind',
      header: 'Deal Type',
      render: (row) => renderDealKindPill(row.deal_kind),
    },
    {
      key: 'leads_count',
      header: 'Leads',
      isNumeric: true,
      render: (row) => formatDisplayNumber(row.leads_count),
    },
    {
      key: 'open_value',
      header: 'Open Pipeline',
      isNumeric: true,
      render: (row) => formatCurrencyInr(row.open_value),
    },
    {
      key: 'won_value',
      header: 'Won Revenue',
      isNumeric: true,
      render: (row) => (
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
          {formatCurrencyInr(row.won_value)}
        </span>
      ),
    },
    {
      key: 'win_rate',
      header: 'Win Rate',
      isNumeric: true,
      render: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.win_rate}%
        </span>
      ),
    },
    {
      key: 'avg_value',
      header: 'Avg Deal Value',
      isNumeric: true,
      render: (row) => formatCurrencyInr(row.avg_value),
    },
    {
      key: 'total_value',
      header: 'Total Value',
      isNumeric: true,
      render: (row) => (
        <span className="font-bold text-gray-900 dark:text-white">
          {formatCurrencyInr(row.total_value)}
        </span>
      ),
    },
  ];

  // Table 2 Columns: Items Breakdown
  const itemColumns: IReportColumnDefinition<IProductServiceMixItem>[] = [
    {
      key: 'item_name',
      header: 'Offering Name',
      render: (row) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-white block">
            {row.item_name}
          </span>
          {row.sku && (
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              SKU: {row.sku}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'item_type',
      header: 'Type',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
            row.item_type === 'Service'
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
          }`}
        >
          {row.item_type || 'Product'}
        </span>
      ),
    },
    {
      key: 'leads_count',
      header: 'Leads',
      isNumeric: true,
      render: (row) => formatDisplayNumber(row.leads_count),
    },
    {
      key: 'total_quantity',
      header: 'Quantity',
      isNumeric: true,
      render: (row) => formatDisplayNumber(row.total_quantity),
    },
    {
      key: 'avg_unit_price',
      header: 'Avg Price',
      isNumeric: true,
      render: (row) => formatCurrencyInr(row.avg_unit_price),
    },
    {
      key: 'open_value',
      header: 'Open Value',
      isNumeric: true,
      render: (row) => formatCurrencyInr(row.open_value),
    },
    {
      key: 'won_value',
      header: 'Won Value',
      isNumeric: true,
      render: (row) => (
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
          {formatCurrencyInr(row.won_value)}
        </span>
      ),
    },
    {
      key: 'total_value',
      header: 'Total Value',
      isNumeric: true,
      render: (row) => (
        <span className="font-bold text-gray-900 dark:text-white">
          {formatCurrencyInr(row.total_value)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Informative Header Callout */}
      <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl p-4 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-3">
        <div className="p-1 rounded-full bg-sky-200/60 dark:bg-sky-800/60 text-sky-700 dark:text-sky-200 shrink-0 mt-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="leading-relaxed">
          <strong>Products and services are measured differently.</strong> Physical products use quantity, SKU and warehouse stock tracking. Services use delivery units (hours, days, months, milestones or contracts). Both share the same product catalog using the <code className="bg-sky-100 dark:bg-sky-900/60 px-1 py-0.5 rounded">Product Type</code> classification.
        </p>
      </div>

      {/* KPI Cards */}
      <ReportKpiCards
        kpiItems={kpiItems}
        activeFilter={filterState}
        onKpiClick={onFilterChange}
      />

      {/* Row 1: Offering Outcome & Share Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ReportPanel
            title="Value by Offering Type and Outcome"
            subtitle="Products vs services broken down by Won, Open and Lost"
          >
            <StackedBarsChart
              groups={stackedGroups}
              legend={[
                { label: 'Won', color: '#10b981' },
                { label: 'Open', color: '#3b82f6' },
                { label: 'Lost', color: '#ef4444' },
              ]}
              emptyMessage="No offering outcome data found"
            />
          </ReportPanel>
        </div>

        <div>
          <ReportPanel
            title="Share of Total Value"
            subtitle="Revenue contribution by catalog offering"
          >
            <DonutChart
              items={donutItems}
              centerLabel={kpis ? formatCompactInr(kpis.total_value) : '₹0'}
              centerSublabel="Total Value"
              emptyMessage="No product or service lines"
            />
          </ReportPanel>
        </div>
      </div>

      {/* Row 2: Top Services & Automated Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel
          title="Top Services by Value"
          subtitle="Highest grossing professional & recurring services"
        >
          <HorizontalBarsChart
            items={serviceBars}
            emptyMessage="No service items attached to leads in this period"
          />
        </ReportPanel>

        <ReportPanel
          title="What Stands Out"
          subtitle="Cross-sell and mix takeaways"
        >
          {insights && insights.length > 0 ? (
            <ul className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <span className="leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">
              Add products and services to leads to view analytical insights.
            </p>
          )}
        </ReportPanel>
      </div>

      {/* Table 1: Deal Types Summary */}
      <ReportDataTable
        tableId="mix-deal-types"
        title="Deal Type Summary"
        unit="deal types"
        columns={dealTypeColumns}
        rows={dealTypes}
        disablePagination={true}
        exportFilename="product-service-deal-types"
      />

      {/* Table 2: Product & Service Breakdown */}
      <ReportDataTable
        tableId="mix-items"
        title="Product and Service Breakdown"
        unit="items"
        columns={itemColumns}
        rows={items}
        defaultSortKey="total_value"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="product-service-breakdown"
      />
    </div>
  );
};
