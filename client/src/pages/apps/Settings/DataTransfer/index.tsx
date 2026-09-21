import React, { useState, useEffect } from "react";
import API from "@/config";
import Swal from "sweetalert2";
import { PageBreadcrumb } from "@/components";
import { IImport } from "@/interface";

const DataTransferPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"imports" | "export">("imports");
  const [imports, setImports] = useState<IImport[]>([]);
  const [loading, setLoading] = useState(false);

  // Import Modal Wizard State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<"leads" | "persons" | "organizations" | "products">("leads");
  const [importAction, setImportAction] = useState<"append" | "overwrite">("append");
  const [validationStrategy, setValidationStrategy] = useState<"stop_on_errors" | "skip_error_entries">("skip_error_entries");
  const [allowedErrors, setAllowedErrors] = useState<number>(10);
  const [csvText, setCsvText] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Export State
  const [exportType, setExportType] = useState<"leads" | "persons" | "organizations" | "products">("leads");
  const [isExporting, setIsExporting] = useState(false);

  const fetchImports = async () => {
    try {
      setLoading(true);
      const res = await API.get("/data-transfer/imports").catch(() => ({ data: { data: [] } }));
      setImports(res.data?.data || []);
    } catch {
      setImports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    try {
      const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setParsedRows([]);
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || "";
        });
        rows.push(rowObj);
      }
      setParsedRows(rows);
    } catch {
      setParsedRows([]);
    }
  };

  const loadSample = async () => {
    try {
      const res = await API.get(`/data-transfer/sample/${importType}`);
      const sample = res.data?.data || [];
      if (sample.length > 0) {
        const headers = Object.keys(sample[0]).join(",");
        const values = Object.values(sample[0]).join(",");
        const csv = headers + "\n" + values;
        setCsvText(csv);
        setParsedRows(sample);
      }
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to load sample template" });
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      Swal.fire({ icon: "warning", title: "No Data", text: "Please upload a valid CSV file or load a sample first." });
      return;
    }

    try {
      setIsImporting(true);
      const res = await API.post("/data-transfer/import", {
        type: importType,
        action: importAction,
        validation_strategy: validationStrategy,
        allowed_errors: allowedErrors,
        field_separator: ",",
        rows: parsedRows,
      });

      Swal.fire({
        icon: "success",
        title: "Import Finished!",
        text: `Processed ${res.data?.data?.processed} of ${res.data?.data?.total} records with ${res.data?.data?.errors} errors.`,
      });

      setIsImportModalOpen(false);
      setCsvText("");
      setParsedRows([]);
      fetchImports();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Import Failed", text: err.response?.data?.message || "Import encountered an error" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExecuteExport = async () => {
    try {
      setIsExporting(true);
      const res = await API.get(`/data-transfer/export/${exportType}`);
      const data = res.data?.data || [];
      if (data.length === 0) {
        Swal.fire({ icon: "info", title: "Empty", text: `No records found to export for ${exportType}.` });
        return;
      }

      const headers = Object.keys(data[0]);
      const csvLines = [headers.join(",")];
      data.forEach((row: any) => {
        const values = headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvLines.push(values.join(","));
      });

      const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `crm_${exportType}_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Swal.fire({ icon: "success", title: "Export Ready!", text: `Downloaded ${data.length} ${exportType} records as CSV.`, timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Export Failed", text: err.response?.data?.message || "Export error" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Data Transfer" breadCrumbItems={["Settings", "Data Transfer"]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Data Transfer</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bulk CSV import and data export tools for CRM entities</p>
        </div>
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-sm transition-colors"
        >
          <i className="mgc_upload_line text-lg"></i>
          Import CSV Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("imports")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "imports"
              ? "border-blue-600 text-blue-600 font-bold dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <i className="mgc_history_line"></i>
          Import History & Logs
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "export"
              ? "border-blue-600 text-blue-600 font-bold dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <i className="mgc_download_2_line"></i>
          Export CRM Data
        </button>
      </div>

      {/* Tab 1: Imports */}
      {activeTab === "imports" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Past Import Records</h3>
            <span className="text-xs text-gray-400">{imports.length} imports</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Processed / Total</th>
                  <th className="py-3.5 px-4">Errors</th>
                  <th className="py-3.5 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">Loading import logs...</td>
                  </tr>
                ) : imports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">No import records found. Click "Import CSV Data" to begin.</td>
                  </tr>
                ) : (
                  imports.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-gray-500">#{item.id}</td>
                      <td className="py-3 px-4 capitalize font-medium text-gray-800 dark:text-gray-100">{item.type}</td>
                      <td className="py-3 px-4 capitalize text-gray-600 dark:text-gray-300">{item.action}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          item.state === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                          item.state === "partial" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        }`}>
                          {item.state || "completed"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-300">
                        {item.summary?.processed ?? 0} / {item.summary?.total ?? 0}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        <span className={item.summary?.errors ? "text-red-500 font-bold" : "text-gray-400"}>
                          {item.summary?.errors ?? 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 text-right">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Export */}
      {activeTab === "export" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 max-w-2xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Export CRM Entities to CSV</h3>
            <p className="text-sm text-gray-500 mt-1">Download your CRM leads, contacts, organizations, or product catalog.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Entity to Export
              </label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="leads">Leads (Title, Value, Pipeline Status, Dates)</option>
                <option value="persons">Persons / Contacts (Name, Emails, Phones, Job Title)</option>
                <option value="organizations">Organizations (Name, Addresses)</option>
                <option value="products">Products (SKU, Name, Price, Quantity)</option>
              </select>
            </div>

            <button
              onClick={handleExecuteExport}
              disabled={isExporting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <i className="mgc_download_2_line text-lg"></i>
              {isExporting ? "Generating CSV..." : `Export ${exportType.toUpperCase()} CSV`}
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">CSV Import Wizard</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Entity Type</label>
                <select
                  value={importType}
                  onChange={(e) => {
                    setImportType(e.target.value as any);
                    setParsedRows([]);
                    setCsvText("");
                  }}
                  className="w-full px-3 py-1.5 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="leads">Leads</option>
                  <option value="persons">Persons / Contacts</option>
                  <option value="organizations">Organizations</option>
                  <option value="products">Products</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Import Action</label>
                <select
                  value={importAction}
                  onChange={(e) => setImportAction(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="append">Append (Insert New)</option>
                  <option value="overwrite">Overwrite / Update</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Validation Strategy</label>
                <select
                  value={validationStrategy}
                  onChange={(e) => setValidationStrategy(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="skip_error_entries">Skip invalid rows</option>
                  <option value="stop_on_errors">Stop entire import on error</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Max Allowed Errors</label>
                <input
                  type="number"
                  value={allowedErrors}
                  onChange={(e) => setAllowedErrors(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>

            {/* File Upload / Sample */}
            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-5 text-center space-y-3 bg-gray-50 dark:bg-gray-750">
              <i className="mgc_upload_2_line text-3xl text-gray-400"></i>
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200">Upload CSV file for {importType.toUpperCase()}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Comma separated .csv files with header row</p>
              </div>
              <div className="flex justify-center gap-3">
                <label className="cursor-pointer px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-sm">
                  Choose File
                  <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={loadSample}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-100"
                >
                  Load Sample Template
                </button>
              </div>
            </div>

            {/* Parsed Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Ready to Import: {parsedRows.length} rows</span>
                </div>
                <div className="max-h-36 overflow-auto border rounded-lg text-xs bg-gray-50 dark:bg-gray-900/50 p-2 font-mono">
                  <pre>{JSON.stringify(parsedRows.slice(0, 3), null, 2)}</pre>
                  {parsedRows.length > 3 && <p className="text-[10px] text-gray-400 italic mt-1">...and {parsedRows.length - 3} more rows</p>}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || parsedRows.length === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting ? "Importing..." : "Execute Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DataTransferPage;
