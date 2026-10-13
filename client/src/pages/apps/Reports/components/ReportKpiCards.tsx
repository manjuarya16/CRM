import React from 'react';
import { IReportKpiItem } from '@/interface';

interface ReportKpiCardsProps {
  kpiItems: IReportKpiItem[];
  activeFilter?: Record<string, any>;
  onKpiClick?: (applyFilter: Record<string, any>) => void;
}

export const ReportKpiCards: React.FC<ReportKpiCardsProps> = ({
  kpiItems,
  activeFilter,
  onKpiClick,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {kpiItems.map((item, index) => {
        const isClickable = Boolean(item.apply && onKpiClick);
        const isActive =
          Boolean(item.apply && activeFilter) &&
          Object.entries(item.apply || {}).every(
            ([filterKey, filterVal]) => String(activeFilter?.[filterKey] || '') === String(filterVal)
          );

        return (
          <div
            key={index}
            onClick={() => {
              if (isClickable && item.apply && onKpiClick) {
                onKpiClick(item.apply);
              }
            }}
            className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
              isActive
                ? 'border-[#0e90d9] ring-2 ring-[#0e90d9]/20 bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            } ${isClickable ? 'cursor-pointer hover:shadow-xs' : ''}`}
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              {item.label}
            </span>
            <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white tracking-tight my-1 tabular-nums">
              {item.value}
            </div>
            {item.subtitle && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {item.subtitle}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
