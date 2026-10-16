import React, { useMemo } from 'react';
import {
  IInventoryReportData,
  IInventoryStockItem,
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
import { ReportPanel, HorizontalBarsChart, DonutChart } from './ReportCharts';
import { ReportDataTable } from './ReportDataTable';

interface InventoryReportProps {
  reportData: IInventoryReportData | null;
  filterState: IReportFilterState;
  onFilterChange: (updates: Partial<IReportFilterState>) => void;
  onClearFilters: () => void;
}

export const InventoryReport: React.FC<InventoryReportProps> = ({
  reportData,
  filterState,
  onFilterChange,
  onClearFilters,
}) => {
  const kpis = reportData?.kpis;
  const items = reportData?.items || [];

  const kpiItems: IReportKpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Total Stock Units',
        value: formatDisplayNumber(kpis.total_stock_units),
        subtitle: 'Physical quantity on hand',
      },
      {
        label: 'Inventory Asset Valuation',
        value: formatCompactInr(kpis.total_inventory_valuation),
        subtitle: 'Total holding inventory worth',
      },
      {
        label: 'Monitored SKUs',
        value: formatDisplayNumber(kpis.total_skus),
        subtitle: 'Unique product variants',
      },
      {
        label: 'Active Warehouses',
        value: formatDisplayNumber(kpis.total_warehouses),
        subtitle: 'Storage & fulfillment hubs',
      },
      {
        label: 'Low Stock Alerts',
        value: formatDisplayNumber(kpis.low_stock_skus),
        subtitle: 'SKUs nearing reorder threshold',
      },
      {
        label: 'Out of Stock SKUs',
        value: formatDisplayNumber(kpis.out_of_stock_skus),
        subtitle: 'Zero available inventory',
      },
    ];
  }, [kpis]);

  const warehouseBars = useMemo(() => {
    if (!reportData?.valuation_by_warehouse) return [];
    return reportData.valuation_by_warehouse.map((item) => ({
      ...item,
      displayText: formatCompactInr(item.value),
      color: '#0e90d9',
    }));
  }, [reportData?.valuation_by_warehouse]);

  const stockStatusColors: Record<string, string> = {
    'In Stock': '#10b981',
    'Low Stock': '#f59e0b',
    'Out of Stock': '#ef4444',
  };

  const statusDonutItems = useMemo(() => {
    if (!reportData?.stock_status_mix) return [];
    return reportData.stock_status_mix.map((item) => ({
      label: item.label,
      value: item.count,
      displayText: `${item.count} items`,
      color: stockStatusColors[item.label] || item.color || '#64748b',
    }));
  }, [reportData?.stock_status_mix]);

  const columns: IReportColumnDefinition<IInventoryStockItem>[] = useMemo(
    () => [
      {
        key: 'product_name',
        header: 'Product / Item',
        render: (row) => (
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{row.product_name}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">SKU: {row.sku}</div>
          </div>
        ),
      },
      {
        key: 'warehouse_name',
        header: 'Warehouse Hub',
        accessor: (row) => row.warehouse_name,
        render: (row) => (
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {row.warehouse_name}
          </span>
        ),
      },
      {
        key: 'stock_status',
        header: 'Stock Status',
        accessor: (row) => row.stock_status,
        render: (row) => {
          let badgeClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
          if (row.stock_status === 'In Stock') {
            badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
          } else if (row.stock_status === 'Low Stock') {
            badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
          } else if (row.stock_status === 'Out of Stock') {
            badgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
          }
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${badgeClass}`}>
              {row.stock_status}
            </span>
          );
        },
      },
      {
        key: 'unit_price',
        header: 'Unit Price',
        isNumeric: true,
        accessor: (row) => row.unit_price,
        render: (row) => (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatCurrencyInr(row.unit_price)}
          </span>
        ),
      },
      {
        key: 'in_stock',
        header: 'Physical Stock',
        isNumeric: true,
        accessor: (row) => row.in_stock,
        render: (row) => (
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {formatDisplayNumber(row.in_stock)}
          </span>
        ),
      },
      {
        key: 'allocated',
        header: 'Allocated',
        isNumeric: true,
        accessor: (row) => row.allocated,
        render: (row) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDisplayNumber(row.allocated)}
          </span>
        ),
      },
      {
        key: 'available_stock',
        header: 'Available',
        isNumeric: true,
        accessor: (row) => row.available_stock,
        render: (row) => (
          <span className="font-bold text-primary dark:text-primary-light">
            {formatDisplayNumber(row.available_stock)}
          </span>
        ),
      },
      {
        key: 'asset_valuation',
        header: 'Total Valuation',
        isNumeric: true,
        accessor: (row) => row.asset_valuation,
        render: (row) => (
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrencyInr(row.asset_valuation)}
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
          title="Inventory Valuation by Warehouse"
          subtitle="Capital allocation and stock holding value across logistics centers"
        >
          <HorizontalBarsChart
            items={warehouseBars}
            emptyMessage="No warehouse inventory data recorded"
          />
        </ReportPanel>

        <ReportPanel
          title="Stock Health & Status Mix"
          subtitle="Inventory status distribution across monitored product items"
        >
          <DonutChart
            items={statusDonutItems}
            centerLabel={String(kpis?.total_skus || 0)}
            centerSublabel="SKUs"
            emptyMessage="No inventory items found"
          />
        </ReportPanel>
      </div>

      <ReportDataTable
        tableId="inventory-stock-table"
        title="Warehouse Inventory & Stock Valuation"
        unit="items"
        columns={columns}
        rows={items}
        defaultSortKey="asset_valuation"
        defaultSortDirection="desc"
        onClearFilters={onClearFilters}
        exportFilename="warehouse_inventory_stock_report.csv"
      />
    </div>
  );
};
