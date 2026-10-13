import React from 'react';
import {
  IReportChartDataItem,
  IReportStackedBarGroup,
} from '@/interface';

/**
 * Chart Card Container
 */
export const ReportPanel: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, children, className = '' }) => (
  <div
    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col justify-between ${className}`}
  >
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

/**
 * Horizontal Progress Bar Chart
 */
export const HorizontalBarsChart: React.FC<{
  items: IReportChartDataItem[];
  maxLimit?: number;
  emptyMessage?: string;
}> = ({ items, maxLimit, emptyMessage = 'No data available' }) => {
  if (!items || items.length === 0) {
    return <div className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">{emptyMessage}</div>;
  }

  const maxValue = maxLimit || Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-2.5">
      {items.map((item, index) => {
        const percentage = Math.max(Math.min((item.value / maxValue) * 100, 100), item.value > 0 ? 2 : 0);
        return (
          <div key={index} className="grid grid-cols-[110px_1fr_auto] sm:grid-cols-[140px_1fr_auto] gap-2.5 items-center text-xs">
            <span
              className="text-gray-700 dark:text-gray-300 truncate font-medium"
              title={item.label}
            >
              {item.label}
            </span>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color || '#0e90d9',
                }}
              />
            </div>
            <span className="text-gray-600 dark:text-gray-400 font-semibold tabular-nums text-right min-w-[50px]">
              {item.displayText !== undefined ? item.displayText : item.value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Horizontal Stacked Bars Chart (e.g. Outcome by Source, User Activity Breakdown)
 */
export const StackedBarsChart: React.FC<{
  groups: IReportStackedBarGroup[];
  legend: { label: string; color: string }[];
  emptyMessage?: string;
}> = ({ groups, legend, emptyMessage = 'No data available' }) => {
  if (!groups || groups.length === 0) {
    return <div className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">{emptyMessage}</div>;
  }

  const maxTotal = Math.max(
    ...groups.map((group) => group.segments.reduce((acc, curr) => acc + curr.value, 0)),
    1
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {groups.map((group, groupIdx) => {
          const groupTotal = group.segments.reduce((acc, curr) => acc + curr.value, 0);
          return (
            <div
              key={groupIdx}
              className="grid grid-cols-[110px_1fr_auto] sm:grid-cols-[140px_1fr_auto] gap-2.5 items-center text-xs"
            >
              <span className="text-gray-700 dark:text-gray-300 truncate font-medium" title={group.label}>
                {group.label}
              </span>
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex">
                {group.segments.map((segment, segIdx) => {
                  const segmentPercent = maxTotal > 0 ? (segment.value / maxTotal) * 100 : 0;
                  if (segment.value <= 0) return null;
                  return (
                    <div
                      key={segIdx}
                      style={{
                        width: `${segmentPercent}%`,
                        backgroundColor: segment.color,
                      }}
                      title={`${segment.name}: ${segment.value}`}
                      className="h-full transition-all duration-300"
                    />
                  );
                })}
              </div>
              <span className="text-gray-600 dark:text-gray-400 font-semibold tabular-nums text-right min-w-[50px]">
                {group.totalDisplay || groupTotal.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-400">
        {legend.map((legendItem, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs"
              style={{ backgroundColor: legendItem.color }}
            />
            <span>{legendItem.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Vertical Columns Bar Chart (e.g. Leads per week, Upcoming activities)
 */
export const VerticalColumnsChart: React.FC<{
  items: IReportChartDataItem[];
  emptyMessage?: string;
}> = ({ items, emptyMessage = 'No data available' }) => {
  if (!items || items.length === 0) {
    return <div className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">{emptyMessage}</div>;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="flex items-end gap-2 h-44 pt-4 px-1">
      {items.map((item, index) => {
        const barHeight = Math.max(Math.round((item.value / maxValue) * 115), item.value > 0 ? 4 : 0);
        return (
          <div
            key={index}
            className="flex-1 flex flex-col justify-end items-center gap-1 h-full min-w-0"
            title={`${item.label}: ${item.displayText || item.value}`}
          >
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tabular-nums min-h-[14px]">
              {item.value > 0 ? (item.displayText || item.value) : ''}
            </span>
            <div
              className="w-full max-w-[32px] rounded-t-md transition-all duration-300"
              style={{
                height: `${barHeight}px`,
                backgroundColor: item.color || '#0e90d9',
              }}
            />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * SVG Donut Chart with Center Summary and Legend
 */
export const DonutChart: React.FC<{
  items: IReportChartDataItem[];
  centerLabel: string;
  centerSublabel?: string;
  emptyMessage?: string;
}> = ({ items, centerLabel, centerSublabel, emptyMessage = 'No data available' }) => {
  const totalValue = items.reduce((accumulator, current) => accumulator + current.value, 0);

  if (!items || items.length === 0 || totalValue === 0) {
    return <div className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">{emptyMessage}</div>;
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let strokeOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 justify-between py-1">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
            strokeWidth="15"
          />
          {items.map((item, index) => {
            const segmentLength = (item.value / totalValue) * circumference;
            const currentOffset = strokeOffset;
            strokeOffset += segmentLength;

            if (item.value <= 0) return null;

            return (
              <circle
                key={index}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={item.color || '#0e90d9'}
                strokeWidth="15"
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={-currentOffset}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-base sm:text-lg font-bold text-gray-800 dark:text-white tabular-nums tracking-tight">
            {centerLabel}
          </span>
          {centerSublabel && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {centerSublabel}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <ul className="flex-1 w-full space-y-2 text-xs">
        {items.map((item, index) => (
          <li key={index} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: item.color || '#0e90d9' }}
              />
              <span className="text-gray-700 dark:text-gray-300 truncate font-medium">
                {item.label}
              </span>
            </div>
            <span className="text-gray-600 dark:text-gray-400 font-semibold tabular-nums shrink-0">
              {item.displayText || item.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
