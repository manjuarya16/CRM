import React from 'react';
import { IReportOverviewData, ReportTabType } from '@/interface';
import { formatCompactInr, formatDisplayNumber } from '../reportHelpers';

interface OverviewReportProps {
  overviewData: IReportOverviewData | null;
  onNavigateTab: (tab: ReportTabType) => void;
}

export const OverviewReport: React.FC<OverviewReportProps> = ({
  overviewData,
  onNavigateTab,
}) => {
  const summaryCards = [
    {
      tab: 'leads' as ReportTabType,
      title: 'Lead Summary',
      badge: 'Phase 1 · Created Date',
      value: overviewData ? formatCompactInr(overviewData.open_leads_value) : '—',
      sublabel: `${formatDisplayNumber(overviewData?.open_leads_count || 0)} open leads worth`,
      description: 'Every lead with owner, source, stage, value and close dates. Click cards to filter.',
      icon: 'mgc_target_line',
      color: '#0e90d9',
    },
    {
      tab: 'sources' as ReportTabType,
      title: 'Lead Sources',
      badge: 'Phase 1 · Source Mix',
      value: overviewData?.top_source_name || '—',
      sublabel: `Top source bringing ${formatDisplayNumber(overviewData?.top_source_count || 0)} leads`,
      description: 'Which sources bring the most leads, the most value and the best win rate.',
      icon: 'mgc_share_forward_line',
      color: '#2a8f6a',
    },
    {
      tab: 'product-value' as ReportTabType,
      title: 'Product-wise Value',
      badge: 'Phase 1 · Product Mix',
      value: overviewData ? formatCompactInr(overviewData.top_product_value) : '—',
      sublabel: `${overviewData?.top_product_name || 'Top product'} value on leads`,
      description: 'Which products sit on your leads and how much value each carries.',
      icon: 'mgc_box_3_line',
      color: '#c58a1b',
    },
    {
      tab: 'product-lines' as ReportTabType,
      title: 'Product Lines on Leads',
      badge: 'Dedicated Report · 49 Lines',
      value: '49+ Lines',
      sublabel: 'Distinct lines across leads & warehouses',
      description: 'Detailed breakdown of every product item attached to leads with pricing and quantity.',
      icon: 'mgc_list_check_3_line',
      color: '#8b5cf6',
    },
    {
      tab: 'pipeline' as ReportTabType,
      title: 'Sales Pipeline',
      badge: 'Phase 3 · Forecast',
      value: overviewData ? formatCompactInr(overviewData.weighted_pipeline_value) : '—',
      sublabel: 'Weighted pipeline value across stages',
      description: 'Open value by stage, weighted forecast, overdue and stuck leads.',
      icon: 'mgc_filter_line',
      color: '#2563eb',
    },
    {
      tab: 'activities' as ReportTabType,
      title: 'Activities & Follow-ups',
      badge: 'Phase 2 · Scheduled',
      value: formatDisplayNumber(overviewData?.overdue_activities_count || 0),
      sublabel: 'Overdue activities requiring immediate action',
      description: 'Calls, meetings and tasks: what is done, pending or overdue.',
      icon: 'mgc_calendar_line',
      color: '#dc2626',
    },
    {
      tab: 'quotes' as ReportTabType,
      title: 'Quote Summary',
      badge: 'Phase 2 · Grand Totals',
      value: formatDisplayNumber(overviewData?.expiring_quotes_count || 0),
      sublabel: 'Quotes expiring within next 7 days',
      description: 'Quote value, status and expiry, with line items one click away.',
      icon: 'mgc_file_check_line',
      color: '#ea580c',
    },
    {
      tab: 'sales-reps' as ReportTabType,
      title: 'Sales Reps Performance',
      badge: 'Team Leaderboard',
      value: 'Rep Metrics',
      sublabel: 'Win rates, rep revenue & activities',
      description: 'Track individual rep conversions, won deal volumes, sales velocity and activity completion.',
      icon: 'mgc_user_star_line',
      color: '#10b981',
    },
    {
      tab: 'marketing' as ReportTabType,
      title: 'Marketing & Web Forms',
      badge: 'Inbound Inquiries',
      value: 'Inbound Forms',
      sublabel: 'Form submissions & campaigns',
      description: 'Analyze inbound submissions from embedded lead forms, conversion velocity and email campaigns.',
      icon: 'mgc_megaphone_line',
      color: '#6366f1',
    },
    {
      tab: 'accounts' as ReportTabType,
      title: 'Accounts & Organizations',
      badge: 'Client Health',
      value: 'Client Orgs',
      sublabel: 'Client deals & engagement status',
      description: 'Organization-level sales performance, deal history, contact counts, and engagement health.',
      icon: 'mgc_community_line',
      color: '#0e90d9',
    },
    {
      tab: 'forecast' as ReportTabType,
      title: 'Revenue Forecast',
      badge: 'Weighted Projections',
      value: overviewData ? formatCompactInr(overviewData.weighted_pipeline_value) : '—',
      sublabel: 'Expected realization this month & quarter',
      description: 'Weighted pipeline revenue projection based on stage win probabilities and target close dates.',
      icon: 'mgc_trending_up_line',
      color: '#059669',
    },
    {
      tab: 'inventory' as ReportTabType,
      title: 'Warehouse & Inventory',
      badge: 'Stock Valuation',
      value: 'Stock Valuation',
      sublabel: 'Warehouse stock & low-stock alerts',
      description: 'Real-time inventory levels, allocated stock, stock status, and total holding valuation.',
      icon: 'mgc_store_2_line',
      color: '#d97706',
    },
  ];

  const dataHealthItems = [
    {
      type: 'warning',
      text: 'Lead outcome classification is dynamically calculated via PostgreSQL procedural functions from pipeline stage code (won, lost, open).',
    },
    {
      type: 'info',
      text: 'Activities completion time uses the dedicated completed_at timestamp column for high precision.',
    },
    {
      type: 'success',
      text: 'Quotes status tracking uses quote_status enum (draft, sent, accepted, rejected) with proactive expiry calculation.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Quick Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => (
          <div
            key={idx}
            onClick={() => onNavigateTab(card.tab)}
            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#0e90d9] dark:hover:border-[#0e90d9] rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-full">
                  {card.badge}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: card.color }}
                >
                  <i className={card.icon} />
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-800 dark:text-white group-hover:text-[#0e90d9] transition-colors">
                {card.title}
              </h3>

              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight my-2 tabular-nums">
                {card.value}
              </div>

              <p className="text-xs font-semibold text-[#0e90d9] mb-1.5">{card.sublabel}</p>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {card.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs font-semibold text-[#0e90d9]">
              <span>View Report</span>
              <i className="mgc_arrow_right_line transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Row: Scheduled Reports & Data Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scheduled Reports Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <i className="mgc_time_line text-[#0e90d9] text-base" />
              <span>Automated Report Schedules</span>
            </h3>
            <span className="text-xs text-gray-400">Background Email Service</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                CSV
              </span>
              <div className="text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Lead Summary Digest
                </span>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                  Every Monday, 9:00 AM to sales-head@yourcompany.com
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                PDF
              </span>
              <div className="text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Daily Quotations Status
                </span>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                  Every day, 8:30 AM to quotes-team@yourcompany.com
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Architecture & Engine Health */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <i className="mgc_shield_check_line text-emerald-600 text-base" />
              <span>Reporting Engine & Architecture</span>
            </h3>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              ● Connected
            </span>
          </div>

          <div className="space-y-2.5">
            {dataHealthItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300"
              >
                <i className="mgc_check_circle_fill text-emerald-600 text-sm shrink-0 mt-0.5" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
