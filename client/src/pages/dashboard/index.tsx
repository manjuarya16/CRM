import React, { useEffect, useState, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import API from "@/config";

interface IPipeline {
  id: number;
  name: string;
  is_default?: boolean;
}

interface IFunnelStage {
  stage_id: number;
  stage_name: string;
  code: string;
  count: number;
  total_value: number;
}

interface ITimelinePoint {
  date: string;
  won_revenue: number;
  lost_revenue: number;
  leads_count: number;
}

interface IDashboardData {
  pipelines: IPipeline[];
  selected_pipeline_id: number;
  start_date: string;
  end_date: string;
  won_revenue: number;
  won_count: number;
  lost_revenue: number;
  lost_count: number;
  avg_lead_value: number;
  total_leads: number;
  avg_leads_per_day: number;
  total_quotations: number;
  total_persons: number;
  total_organizations: number;
  funnel: IFunnelStage[];
  revenue_by_source: { name: string; count: number; total_value: number }[];
  revenue_by_type: { name: string; count: number; total_value: number }[];
  timeline: ITimelinePoint[];
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

const defaultInitialData: IDashboardData = {
  pipelines: [{ id: 1, name: "Default Pipeline", is_default: true }],
  selected_pipeline_id: 1,
  start_date: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
  end_date: new Date().toISOString().split("T")[0],
  won_revenue: 0,
  won_count: 0,
  lost_revenue: 0,
  lost_count: 0,
  avg_lead_value: 0,
  total_leads: 0,
  avg_leads_per_day: 0,
  total_quotations: 0,
  total_persons: 0,
  total_organizations: 0,
  funnel: [
    { stage_id: 1, stage_name: "Qualified", code: "qualified", count: 0, total_value: 0 },
    { stage_id: 2, stage_name: "New Inquiry", code: "new_inquiry", count: 0, total_value: 0 },
    { stage_id: 3, stage_name: "Proposal Sent", code: "proposal_sent", count: 0, total_value: 0 },
    { stage_id: 4, stage_name: "Negotiation", code: "negotiation", count: 0, total_value: 0 },
    { stage_id: 5, stage_name: "Won", code: "won", count: 0, total_value: 0 },
  ],
  revenue_by_source: [],
  revenue_by_type: [],
  timeline: [],
};

const SafeApexChart: React.FC<any> = (props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[200px] w-full flex items-center justify-center text-xs text-gray-400">Loading chart...</div>;
  }

  try {
    return <ReactApexChart {...props} />;
  } catch (err) {
    console.error("ApexChart rendering error:", err);
    return <div className="h-[200px] w-full flex items-center justify-center text-xs text-gray-400">Chart unavailable</div>;
  }
};

export const DashboardPage: React.FC = () => {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  }, []);

  const [startDate, setStartDate] = useState<string>(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | number>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<IDashboardData>(defaultInitialData);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await API.get("/dashboard/stats", {
        params: {
          start_date: startDate,
          end_date: endDate,
          pipeline_id: selectedPipelineId,
        },
      });
      if (res.data?.data) {
        setData(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [startDate, endDate, selectedPipelineId]);

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("CRM Analytics Dashboard Report", 14, 20);

      doc.setFontSize(10);
      doc.text(`Period: ${data.start_date} to ${data.end_date}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

      autoTable(doc, {
        startY: 42,
        head: [["Metric", "Value"]],
        body: [
          ["Won Revenue", formatCurrency(data.won_revenue)],
          ["Lost Revenue", formatCurrency(data.lost_revenue)],
          ["Average Lead Value", formatCurrency(data.avg_lead_value)],
          ["Total Leads", String(data.total_leads)],
          ["Average Leads / Day", data.avg_leads_per_day.toFixed(2)],
          ["Total Quotations", String(data.total_quotations)],
          ["Total Persons", String(data.total_persons)],
          ["Total Organizations", String(data.total_organizations)],
        ],
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      doc.setFontSize(14);
      doc.text("Open Leads By Pipeline Stages", 14, finalY + 14);

      autoTable(doc, {
        startY: finalY + 20,
        head: [["Stage Name", "Leads Count", "Total Value"]],
        body: (data.funnel || []).map((f) => [f.stage_name, String(f.count), formatCurrency(f.total_value)]),
      });

      doc.save(`CRM_Dashboard_Report_${data.start_date}_to_${data.end_date}.pdf`);
    } catch (err) {
      console.error("PDF export fallback to print", err);
      window.print();
    }
  };

  // Won vs Lost Revenue Chart Options
  const revenueChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    colors: ["#10b981", "#ef4444"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
    },
    xaxis: {
      categories: (data.timeline || []).map((t) => t.date),
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
    },
    yaxis: {
      labels: {
        formatter: (val) => `$${val}`,
        style: { colors: "#64748b", fontSize: "11px" },
      },
    },
    legend: { position: "bottom", horizontalAlign: "center" },
    grid: { borderColor: "#f1f5f9" },
  };

  const revenueChartSeries = [
    {
      name: "Won Revenue",
      data: (data.timeline || []).map((t) => t.won_revenue),
    },
    {
      name: "Lost Revenue",
      data: (data.timeline || []).map((t) => t.lost_revenue),
    },
  ];

  // Leads Timeline Chart Options
  const leadsTimelineChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
    },
    colors: ["#0088cc"],
    stroke: { curve: "smooth", width: 3 },
    xaxis: {
      categories: (data.timeline || []).map((t) => t.date),
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
    },
    yaxis: {
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
    },
    grid: { borderColor: "#f1f5f9" },
  };

  const leadsTimelineChartSeries = [
    {
      name: "Leads Count",
      data: (data.timeline || []).map((t) => t.leads_count),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto text-gray-800 dark:text-gray-100">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
            {loading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time sales performance, pipeline stages, and revenue metrics
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200"
          >
            <option value="all">Default Pipeline</option>
            {(data.pipelines || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 shadow-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-none dark:text-gray-200"
            />
            <i className="mgc_calendar_line text-gray-400"></i>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 shadow-sm">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-none dark:text-gray-200"
            />
            <i className="mgc_calendar_line text-gray-400"></i>
          </div>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <i className="mgc_pdf_line text-sm"></i>
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 8 COLUMNS */}
        <div className="lg:col-span-8 space-y-6">
          {/* Won / Lost Revenue Chart Container */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-xs">
              {/* Won Revenue Card */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Won Revenue</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(data.won_revenue || 0)}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                    ↑ 0%
                  </span>
                </div>
              </div>

              {/* Lost Revenue Card */}
              <div className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/40">
                <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">Lost Revenue</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(data.lost_revenue || 0)}
                  </span>
                  <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 flex items-center">
                    ↓ 0%
                  </span>
                </div>
              </div>
            </div>

            {/* Area Chart */}
            <div className="h-[260px] w-full pt-2">
              <SafeApexChart
                options={revenueChartOptions}
                series={revenueChartSeries}
                type="area"
                height="100%"
              />
            </div>
          </div>

          {/* 6 Middle KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Average Lead Value */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Average Lead Value</span>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(data.avg_lead_value || 0)}
                </h3>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  ↑ 0%
                </span>
              </div>
            </div>

            {/* Card 2: Total Leads */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Leads</span>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {data.total_leads || 0}
                </h3>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  ↑ 0%
                </span>
              </div>
            </div>

            {/* Card 3: Average Leads Per Day */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Average Leads Per Day</span>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {(data.avg_leads_per_day || 0).toFixed(2)}
                </h3>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  ↑ 0%
                </span>
              </div>
            </div>

            {/* Card 4: Total Quotations */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Quotations</span>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {data.total_quotations || 0}
                </h3>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  ↑ 100%
                </span>
              </div>
            </div>

            {/* Card 5: Total Persons */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Persons</span>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {data.total_persons || 0}
                </h3>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  ↑ 100%
                </span>
              </div>
            </div>

            {/* Card 6: Total Organizations */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Organizations</span>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {data.total_organizations || 0}
                </h3>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  ↑ 100%
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Leads Trend Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Leads Creation Velocity</h3>
            <div className="h-[220px] w-full">
              <SafeApexChart
                options={leadsTimelineChartOptions}
                series={leadsTimelineChartSeries}
                type="line"
                height="100%"
              />
            </div>
          </div>
        </div>

        {/* RIGHT 4 COLUMNS SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          {/* Open Leads By Stages (Funnel Diagram) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Open Leads By Stages</h3>

            {(!data.funnel || data.funnel.length === 0) ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">No pipeline stages available</p>
            ) : (
              <div className="space-y-2 py-1">
                {data.funnel.map((stage, idx) => {
                  const maxCount = Math.max(...data.funnel.map((f) => f.count), 1);
                  const widthPct = Math.max(30, Math.min(100, Math.round((stage.count / maxCount) * 100)));

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                          {stage.stage_name}
                        </span>
                        <span className="font-bold">{stage.count}</span>
                      </div>
                      {/* Styled Funnel Bar */}
                      <div className="w-full bg-gray-100 dark:bg-gray-700/60 h-6 rounded-lg overflow-hidden relative flex items-center justify-center">
                        <div
                          className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-lg transition-all duration-500 shadow-sm"
                          style={{ width: `${widthPct}%` }}
                        ></div>
                        <span className="absolute text-[10px] font-bold text-gray-700 dark:text-gray-200 drop-shadow-sm">
                          {stage.count} leads ({formatCurrency(stage.total_value)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revenue By Sources Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Revenue By Sources</h3>

            {(!data.revenue_by_source || data.revenue_by_source.length === 0) ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                  <i className="mgc_layout_grid_line text-2xl"></i>
                </div>
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400">No Data Available</h4>
                <p className="text-[11px] text-gray-400">No data available for selected interval</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.revenue_by_source.map((src, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{src.name}</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 dark:text-gray-100 block">{formatCurrency(src.total_value)}</span>
                      <span className="text-[10px] text-gray-400">{src.count} leads</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue By Types Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Revenue By Types</h3>

            {(!data.revenue_by_type || data.revenue_by_type.length === 0) ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                  <i className="mgc_chart_pie_line text-2xl"></i>
                </div>
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400">No Data Available</h4>
                <p className="text-[11px] text-gray-400">No data available for selected interval</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.revenue_by_type.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{t.name}</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 dark:text-gray-100 block">{formatCurrency(t.total_value)}</span>
                      <span className="text-[10px] text-gray-400">{t.count} leads</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
