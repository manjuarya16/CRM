import React, { useEffect, useState, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import API from "@/config";
import type {
  IPipeline,
  IFunnelStage,
  ITimelinePoint,
  ITopProduct,
  ITopPerson,
  IProgress,
  IDashboardData,
} from "@/interface";

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

const getInitials = (name: string) => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const pastelAvatarStyles = [
  { bg: "#FED7AA", text: "#9A3412" }, // Orange pastel
  { bg: "#FEF08A", text: "#854D0E" }, // Yellow pastel
  { bg: "#FECDD3", text: "#9F1239" }, // Rose pastel
  { bg: "#BFDBFE", text: "#1E40AF" }, // Blue pastel
  { bg: "#D9F99D", text: "#3F6212" }, // Lime pastel
];

const sourcePalette = ["#8979FF", "#FF928A", "#3CC3DF", "#D4E157", "#BA68C8", "#FBC02D"];
const typePalette = ["#8979FF", "#FF928A", "#3CC3DF", "#BA68C8"];

const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getDefaultStartDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyInitialData: IDashboardData = {
  pipelines: [],
  selected_pipeline_id: "all",
  start_date: getDefaultStartDateStr(),
  end_date: getTodayDateStr(),
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
  funnel: [],
  revenue_by_source: [],
  revenue_by_type: [],
  top_products: [],
  top_persons: [],
  timeline: [],
  progress: {},
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
  const [startDate, setStartDate] = useState<string>(getDefaultStartDateStr);
  const [endDate, setEndDate] = useState<string>(getTodayDateStr);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | number>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<IDashboardData>(emptyInitialData);

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
          ["Average Leads / Day", (data.avg_leads_per_day || 0).toFixed(2)],
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

  // 1. Won vs Lost Revenue Horizontal Bar Chart
  const revenueBarChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "36%",
        distributed: true,
        borderRadius: 2,
      },
    },
    colors: ["#22c55e", "#ef4444"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Won Revenue", "Lost Revenue"],
      labels: {
        formatter: (val) => "₹" + Number(val).toLocaleString("en-IN"),
        rotate: -45,
        style: { colors: "#64748b", fontSize: "11px" },
      },
      axisBorder: { show: true },
    },
    yaxis: {
      show: false,
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
    },
    legend: {
      show: false,
    },
    tooltip: {
      y: {
        formatter: (val) => formatCurrency(Number(val)),
      },
    },
  };

  const revenueBarChartSeries = [
    {
      name: "Revenue",
      data: [data.won_revenue || 0, data.lost_revenue || 0],
    },
  ];

  // 2. Leads Velocity Grouped Bar Chart
  const timelinePoints = data.timeline || [];

  const leadsBarChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
    },
    colors: ["#8979FF", "#63CFE5", "#FFA8A1"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 2,
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: {
      categories: timelinePoints.map((t) => t.label || t.date),
      labels: {
        rotate: -45,
        style: { colors: "#64748b", fontSize: "10px" },
      },
    },
    yaxis: {
      labels: { style: { colors: "#64748b", fontSize: "11px" } },
    },
    legend: { show: false },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} leads`,
      },
    },
  };

  const leadsBarChartSeries = [
    {
      name: "Total Leads",
      data: timelinePoints.map((t) => t.leads_count),
    },
    {
      name: "Won Leads",
      data: timelinePoints.map((t) => t.won_count || 0),
    },
    {
      name: "Lost Leads",
      data: timelinePoints.map((t) => t.lost_count || 0),
    },
  ];

  // 3. Revenue by Sources Donut Chart
  const sourceSeries = useMemo(() => {
    if (!data.revenue_by_source || data.revenue_by_source.length === 0) return [];
    const values = data.revenue_by_source.map((s) => s.total_value);
    const sum = values.reduce((a, b) => a + b, 0);
    return sum > 0 ? values : data.revenue_by_source.map((s) => s.count);
  }, [data.revenue_by_source]);

  const sourceChartOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut" },
    labels: data.revenue_by_source.map((s) => s.name),
    colors: sourcePalette,
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter: (val) => formatCurrency(Number(val)),
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
        },
      },
    },
  };

  // 4. Revenue by Types Donut Chart
  const typeSeries = useMemo(() => {
    if (!data.revenue_by_type || data.revenue_by_type.length === 0) return [];
    const values = data.revenue_by_type.map((t) => t.total_value);
    const sum = values.reduce((a, b) => a + b, 0);
    return sum > 0 ? values : data.revenue_by_type.map((t) => t.count);
  }, [data.revenue_by_type]);

  const typeChartOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut" },
    labels: data.revenue_by_type.map((t) => t.name),
    colors: typePalette,
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter: (val) => formatCurrency(Number(val)),
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
        },
      },
    },
  };

  // 5. Dynamic Funnel Calculations
  const funnelStages = data.funnel && data.funnel.length > 0 ? data.funnel : [];
  const maxFunnelCount = Math.max(...funnelStages.map((f) => f.count), 1);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1700px] mx-auto text-gray-800 dark:text-gray-100 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
          {loading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pipeline selector */}
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="h-[38px] px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-gray-200"
          >
            <option value="all">All Pipelines</option>
            {(data.pipelines || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Start Date */}
          <div className="flex items-center gap-2 h-[38px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 shadow-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-none text-gray-700 dark:text-gray-200"
            />
            <i className="mgc_calendar_line text-gray-400 text-sm"></i>
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2 h-[38px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 shadow-sm">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-none text-gray-700 dark:text-gray-200"
            />
            <i className="mgc_calendar_line text-gray-400 text-sm"></i>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="h-[38px] px-4 text-xs font-semibold text-blue-600 bg-white dark:bg-gray-800 border border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Row 1: Won/Lost Revenue & Open Leads By Stages */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Won/Lost Revenue Card (Left ~flex-1) */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Won & Lost Stat Cards */}
            <div className="flex flex-col gap-2.5 w-full md:w-56 shrink-0">
              {/* Won Revenue */}
              <div className="border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-3">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
                  Won Revenue
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-green-600 dark:text-green-500">
                    {formatCurrency(data.won_revenue || 0)}
                  </span>
                  <span className="text-xs font-semibold text-green-500 flex items-center">
                    ↑ {data.won_revenue > 0 ? "100" : "0"}%
                  </span>
                </div>
              </div>

              {/* Lost Revenue */}
              <div className="border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-3">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
                  Lost Revenue
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-red-500">
                    {formatCurrency(data.lost_revenue || 0)}
                  </span>
                  <span className="text-xs font-semibold text-red-500 flex items-center">
                    ↓ {data.lost_revenue > 0 ? "100" : "0"}%
                  </span>
                </div>
              </div>
            </div>

            {/* Horizontal Bar Chart (Won vs Lost Revenue) */}
            <div className="flex-1 flex flex-col justify-between pt-1">
              <div className="h-[140px] w-full">
                <SafeApexChart
                  options={revenueBarChartOptions}
                  series={revenueBarChartSeries}
                  type="bar"
                  height="100%"
                />
              </div>

              {/* Legend Below Revenue Chart */}
              <div className="flex justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-sm bg-green-500 opacity-80"></span>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Won Revenue</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-sm bg-red-500 opacity-80"></span>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Lost Revenue</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Open Leads By Stages Funnel (Right ~378px) */}
        <div className="w-full lg:w-[378px] shrink-0 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm flex flex-col justify-between">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Open Leads By Stages
          </p>

          <div className="flex items-center justify-between gap-4 mt-2">
            {/* Left Stages List */}
            <div className="flex-1 flex flex-col justify-around py-1">
              {funnelStages.map((st, idx) => (
                <div
                  key={idx}
                  className="flex flex-col border-b border-gray-200 dark:border-gray-800 pb-2 pt-1 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      {st.count}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      {formatCurrency(st.total_value)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {st.stage_name}
                  </span>
                </div>
              ))}
            </div>

            {/* Right Funnel SVG Graphic (Dynamically Sized to Counts) */}
            <div className="w-[180px] h-[190px] flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm">
                <defs>
                  <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#90f7ec" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#32ccbc" stopOpacity="1" />
                  </linearGradient>
                </defs>
                {funnelStages.map((st, idx) => {
                  const n = funnelStages.length;
                  const totalH = 180;
                  const gap = 4;
                  const sliceH = (totalH - (n - 1) * gap) / Math.max(n, 1);
                  const yTop = 10 + idx * (sliceH + gap);
                  const yBottom = yTop + sliceH;

                  // Proportional widths
                  const topW = Math.max(st.count > 0 ? 35 : 14, Math.round((st.count / maxFunnelCount) * 180));
                  const nextStage = funnelStages[idx + 1];
                  const rawNextW = nextStage
                    ? Math.max(nextStage.count > 0 ? 30 : 12, Math.round((nextStage.count / maxFunnelCount) * 180))
                    : topW * 0.85;
                  const botW = Math.min(topW, rawNextW);

                  const x1 = 100 - topW / 2;
                  const x2 = 100 + topW / 2;
                  const x3 = 100 + botW / 2;
                  const x4 = 100 - botW / 2;

                  return (
                    <polygon
                      key={idx}
                      points={`${x1},${yTop} ${x2},${yTop} ${x3},${yBottom} ${x4},${yBottom}`}
                      fill="url(#funnelGrad)"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 6 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Average Lead Value */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm space-y-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Average Lead Value</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {formatCurrency(data.avg_lead_value || 0)}
            </h3>
            <span className="text-xs font-semibold text-green-500">
              ↑ {data.avg_lead_value > 0 ? "100" : "0"}%
            </span>
          </div>
        </div>

        {/* Card 2: Total Leads */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm space-y-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Leads</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {data.total_leads || 0}
            </h3>
            <span className="text-xs font-semibold text-green-500">
              ↑ {data.total_leads > 0 ? "100" : "0"}%
            </span>
          </div>
        </div>

        {/* Card 3: Average Leads Per Day */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm space-y-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Average Leads Per Day</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {(data.avg_leads_per_day || 0).toFixed(2)}
            </h3>
            <span className="text-xs font-semibold text-green-500">
              ↑ {data.avg_leads_per_day > 0 ? "100" : "0"}%
            </span>
          </div>
        </div>

        {/* Card 4: Total Quotations */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm space-y-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Quotations</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {data.total_quotations || 0}
            </h3>
            <span className="text-xs font-semibold text-green-500">
              ↑ {data.total_quotations > 0 ? "100" : "0"}%
            </span>
          </div>
        </div>

        {/* Card 5: Total Persons */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm space-y-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Persons</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {data.total_persons || 0}
            </h3>
            <span className="text-xs font-semibold text-green-500">
              ↑ {data.total_persons > 0 ? "100" : "0"}%
            </span>
          </div>
        </div>

        {/* Card 6: Total Organizations */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm space-y-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Organizations</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {data.total_organizations || 0}
            </h3>
            <span className="text-xs font-semibold text-green-500">
              ↑ {data.total_organizations > 0 ? "100" : "0"}%
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Leads Velocity Bar Chart & Revenue By Sources Donut */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Leads Velocity Chart (Left flex-1) */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm space-y-3">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Leads
          </p>

          <div className="h-[260px] w-full">
            <SafeApexChart
              options={leadsBarChartOptions}
              series={leadsBarChartSeries}
              type="bar"
              height="100%"
            />
          </div>

          {/* Legend Below Leads Chart */}
          <div className="flex justify-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#8979FF]"></span>
              <p className="text-xs text-gray-600 dark:text-gray-300">Total Leads</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#63CFE5]"></span>
              <p className="text-xs text-gray-600 dark:text-gray-300">Won Leads</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#FFA8A1]"></span>
              <p className="text-xs text-gray-600 dark:text-gray-300">Lost Leads</p>
            </div>
          </div>
        </div>

        {/* Revenue By Sources Donut (Right ~378px) */}
        <div className="w-full lg:w-[378px] shrink-0 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm flex flex-col justify-between">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Revenue By Sources
          </p>

          <div className="h-[210px] w-full flex items-center justify-center my-auto">
            {sourceSeries.length > 0 ? (
              <SafeApexChart
                options={sourceChartOptions}
                series={sourceSeries}
                type="donut"
                height="100%"
              />
            ) : (
              <p className="text-xs text-gray-400">No source data</p>
            )}
          </div>

          {/* Legend Grid Below Donut */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-2">
            {(data.revenue_by_source || []).map((src, i) => (
              <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className="h-3.5 w-3.5 rounded-sm shrink-0"
                  style={{ backgroundColor: sourcePalette[i % sourcePalette.length] }}
                ></span>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {src.name} <span className="text-gray-400 font-medium">({formatCurrency(src.total_value)})</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Top Products, Top Persons, Revenue By Types */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Top Products (flex-1) */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Top Products
            </p>

            <div className="flex flex-col">
              {(data.top_products || []).slice(0, 5).map((p, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1.5 py-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all rounded px-1"
                >
                  <p className="text-sm font-normal text-gray-600 dark:text-gray-300 truncate">
                    {p.name}
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                      {formatCurrency(p.price)}
                    </p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                      {formatCurrency(p.revenue)}
                    </p>
                  </div>
                </div>
              ))}
              {(!data.top_products || data.top_products.length === 0) && (
                <p className="text-xs text-gray-400 py-6 text-center">No products found</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Persons (flex-1) */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Top Persons
            </p>

            <div className="flex flex-col">
              {(data.top_persons || []).slice(0, 5).map((person, idx) => {
                const avatarStyle = pastelAvatarStyles[idx % pastelAvatarStyles.length];
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all rounded px-1"
                  >
                    {/* Pastel Avatar */}
                    <div
                      className="w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0"
                      style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}
                    >
                      {getInitials(person.name)}
                    </div>

                    {/* Person Details */}
                    <div className="flex flex-col truncate">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                        {person.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {person.email || "No email"}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!data.top_persons || data.top_persons.length === 0) && (
                <p className="text-xs text-gray-400 py-6 text-center">No persons found</p>
              )}
            </div>
          </div>
        </div>

        {/* Revenue By Types (Right ~378px) */}
        <div className="w-full lg:w-[378px] shrink-0 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-800 p-4 shadow-sm flex flex-col justify-between">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Revenue By Types
          </p>

          <div className="h-[210px] w-full flex items-center justify-center my-auto">
            {typeSeries.length > 0 ? (
              <SafeApexChart
                options={typeChartOptions}
                series={typeSeries}
                type="donut"
                height="100%"
              />
            ) : (
              <p className="text-xs text-gray-400">No type data</p>
            )}
          </div>

          {/* Legend Grid Below Donut */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-2">
            {(data.revenue_by_type || []).map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className="h-3.5 w-3.5 rounded-sm shrink-0"
                  style={{ backgroundColor: typePalette[i % typePalette.length] }}
                ></span>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {t.name} <span className="text-gray-400 font-medium">({formatCurrency(t.total_value)})</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
