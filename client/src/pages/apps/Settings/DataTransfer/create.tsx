import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

const CreateImportPage: React.FC = () => {
  const navigate = useNavigate();

  // General Form State
  const [type, setType] = useState<"Persons" | "Leads" | "Organizations" | "Products">("Persons");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [sampleMeta, setSampleMeta] = useState<{
    headers: string[];
    sampleRows: any[];
    customAttributes: any[];
  }>({
    headers: [],
    sampleRows: [],
    customAttributes: [],
  });
  const [loadingSample, setLoadingSample] = useState<boolean>(false);
  const [showSamplePreview, setShowSamplePreview] = useState<boolean>(true);

  // Settings Panel State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(true);
  const [action, setAction] = useState<string>("Create/Update");
  const [validationStrategy, setValidationStrategy] = useState<string>("Stop on Errors");
  const [allowedErrors, setAllowedErrors] = useState<number>(10);
  const [fieldSeparator, setFieldSeparator] = useState<string>(",");
  const [processInQueue, setProcessInQueue] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);

  // Validation State
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    total: number;
    validCount: number;
    invalidCount: number;
    errorsCount: number;
    errors: string[];
    sampleErrors: Array<{ row: number; error: string }>;
  } | null>(null);

  // Fetch sample metadata (standard fields + custom attributes) whenever module type changes
  useEffect(() => {
    fetchModuleSampleMeta(type);
  }, [type]);

  const fetchModuleSampleMeta = async (currentType: string) => {
    try {
      setLoadingSample(true);
      const res = await API.get(`/data-transfer/sample/${currentType.toLowerCase()}`);
      if (res.data) {
        setSampleMeta({
          headers: res.data.headers || [],
          sampleRows: res.data.data || [],
          customAttributes: res.data.customAttributes || [],
        });
      }
    } catch {
      setSampleMeta({
        headers: [],
        sampleRows: [],
        customAttributes: [],
      });
    } finally {
      setLoadingSample(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setValidationResult(null);
    if (!file) {
      setSelectedFile(null);
      setParsedRows([]);
      return;
    }

    setSelectedFile(file);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("No sheet found in file");
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rows || rows.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "Empty File",
          text: "The selected file does not contain any data rows.",
        });
        setParsedRows([]);
        return;
      }

      setParsedRows(rows);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "File Parse Error",
        text: err?.message || "Failed to parse the file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV file.",
      });
      setSelectedFile(null);
      setParsedRows([]);
    }
  };

  const handleValidateData = async () => {
    if (!parsedRows || parsedRows.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "File Required",
        text: "Please select an Excel (.xlsx, .xls) or CSV file with valid rows first to validate.",
      });
      return;
    }

    try {
      setValidating(true);
      const entityType = type.toLowerCase();
      const actionParam = action.toLowerCase().includes("delete") ? "delete" : "append";
      const stratParam = validationStrategy.toLowerCase().includes("skip")
        ? "skip_error_entries"
        : "stop_on_errors";

      const res = await API.post("/data-transfer/validate", {
        type: entityType,
        action: actionParam,
        validation_strategy: stratParam,
        allowed_errors: allowedErrors,
        rows: parsedRows,
      });

      if (res.data?.success && res.data?.data) {
        setValidationResult(res.data.data);
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: err.response?.data?.message || err.message || "Failed to validate file data",
      });
    } finally {
      setValidating(false);
    }
  };

  const handleDownloadSample = async (formatParam?: any) => {
    const chosenFormat =
      typeof formatParam === "string" && formatParam.toLowerCase() === "csv"
        ? "csv"
        : "xlsx";

    const typeKey = type.toLowerCase();
    try {
      // 1. First attempt direct streaming download from backend endpoint
      const response = await API.get(`/data-transfer/sample/${typeKey}`, {
        params: { format: chosenFormat },
        responseType: "blob",
      });

      const mimeType =
        chosenFormat === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8;";

      const blob = new Blob([response.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sample_${typeKey}_import.${chosenFormat}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // 2. Fallback: generate file in-browser via XLSX library using sampleMeta
      try {
        const headers = sampleMeta.headers;
        const rows = sampleMeta.sampleRows;

        if (chosenFormat === "xlsx") {
          const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, `${type}_Sample`);
          XLSX.writeFile(wb, `sample_${typeKey}_import.xlsx`);
        } else {
          const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
          const csvContent = XLSX.utils.sheet_to_csv(ws, { FS: fieldSeparator || "," });
          const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `sample_${typeKey}_import.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (clientErr: any) {
        Swal.fire({
          icon: "error",
          title: "Download Error",
          text: clientErr.message || "Failed to download sample file",
        });
      }
    }
  };

  const handleSaveImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || parsedRows.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "File Required",
        text: "Please choose an Excel (.xlsx, .xls) or CSV file with valid rows to import.",
      });
      return;
    }

    try {
      setSaving(true);
      const entityType = type.toLowerCase();

      const actionParam = action.toLowerCase().includes("delete") ? "delete" : "append";
      const stratParam = validationStrategy.toLowerCase().includes("skip")
        ? "skip_error_entries"
        : "stop_on_errors";

      const res = await API.post("/data-transfer/import", {
        type: entityType,
        action: actionParam,
        validation_strategy: stratParam,
        allowed_errors: allowedErrors,
        field_separator: fieldSeparator || ",",
        fileName: selectedFile?.name || `${entityType}_import.xlsx`,
        rows: parsedRows,
        process_in_queue: processInQueue,
      });

      const result = res.data?.data;
      if (result) {
        if (result.errors === 0) {
          Swal.fire({
            icon: "success",
            title: "Import Completed",
            html: `Successfully processed <b>${result.processed}</b> of <b>${result.total}</b> records for <b>${type}</b>.`,
            confirmButtonColor: "#0088cc",
          }).then(() => {
            navigate("/settings/data-transfer");
          });
        } else if (result.processed > 0) {
          const errList = (result.details?.error_samples || [])
            .map((e: any) => `<li>Row ${e.row}: ${e.error}</li>`)
            .join("");
          Swal.fire({
            icon: "warning",
            title: "Import Finished with Warnings",
            html: `
              <div class="text-left text-sm space-y-2">
                <p>Imported: <b class="text-green-600">${result.processed}</b> | Errors: <b class="text-red-500">${result.errors}</b></p>
                ${errList ? `<div class="max-h-36 overflow-auto bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 text-xs"><ul>${errList}</ul></div>` : ""}
              </div>
            `,
            confirmButtonColor: "#0088cc",
          }).then(() => {
            navigate("/settings/data-transfer");
          });
        } else {
          const errList = (result.details?.error_samples || [])
            .map((e: any) => `<li>Row ${e.row}: ${e.error}</li>`)
            .join("");
          Swal.fire({
            icon: "error",
            title: "Import Failed",
            html: `
              <div class="text-left text-sm space-y-2">
                <p>0 records imported due to validation errors (${result.errors} error(s) detected).</p>
                ${errList ? `<div class="max-h-36 overflow-auto bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 text-xs"><ul>${errList}</ul></div>` : ""}
              </div>
            `,
            confirmButtonColor: "#ef4444",
          });
        }
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Import Error",
        text: err.response?.data?.message || err.message || "Failed to process import job",
      });
    } finally {
      setSaving(false);
    }
  };

  const previewCols = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
            <Link to="/dashboard" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>
            <span>/</span>
            <Link to="/settings/data-transfer" className="text-[#0088cc] hover:underline">
              Imports
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-normal">Create Import</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Create Import
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/settings/data-transfer")}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleValidateData}
            disabled={validating || parsedRows.length === 0}
            className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {validating ? (
              <>
                <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-1.5"></span>
                Validating Data...
              </>
            ) : (
              "Validate Data"
            )}
          </button>
          <button
            type="button"
            onClick={handleSaveImport}
            disabled={saving || parsedRows.length === 0}
            className="inline-flex items-center justify-center px-5 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-1.5"></span>
                Processing Import...
              </>
            ) : (
              "Save Import"
            )}
          </button>
        </div>
      </div>

      {/* 2-Column Grid Layout */}
      <form onSubmit={handleSaveImport} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: General Section (Col Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">General Information</h2>

            {/* Type Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Module / Type <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleDownloadSample("xlsx")}
                  className="text-xs font-medium text-[#0088cc] hover:underline"
                >
                  Download Sample File (.xlsx)
                </button>
              </div>

              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as any);
                  setParsedRows([]);
                  setSelectedFile(null);
                }}
                className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
              >
                <option value="Persons">Persons</option>
                <option value="Leads">Leads</option>
                <option value="Organizations">Organizations</option>
                <option value="Products">Products</option>
              </select>

              {/* Dynamic Sample File Information & Action Box */}
              <div className="mt-3.5 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <span>📄</span> Sample File for {type} ({sampleMeta.headers.length} total fields)
                    </h3>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                      Includes all standard form fields +{" "}
                      <b>{sampleMeta.customAttributes.length} custom attributes</b> with sample data rows.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadSample("xlsx")}
                      disabled={loadingSample}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0088cc] hover:bg-[#0077b3] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                    >
                      <span>📥 Download Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSample("csv")}
                      disabled={loadingSample}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg shadow-xs transition-colors"
                    >
                      <span>📥 Download CSV (.csv)</span>
                    </button>
                  </div>
                </div>

                {/* Toggleable Sample Columns & Sample Data Preview */}
                <div className="pt-2 border-t border-blue-100 dark:border-blue-900/30">
                  <button
                    type="button"
                    onClick={() => setShowSamplePreview(!showSamplePreview)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>{showSamplePreview ? "Hide" : "Show"} Sample Columns & Data Preview</span>
                    <span>{showSamplePreview ? "▲" : "▼"}</span>
                  </button>

                  {showSamplePreview && sampleMeta.headers.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-white/70 dark:bg-gray-900/60 rounded border border-blue-100 dark:border-gray-700">
                        {sampleMeta.headers.map((h) => {
                          const isCustom = sampleMeta.customAttributes.some((ca) => ca.code === h);
                          return (
                            <span
                              key={h}
                              className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                                isCustom
                                  ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                  : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                              }`}
                              title={isCustom ? "Custom Attribute" : "Standard Form Field"}
                            >
                              {h} {isCustom ? "★" : ""}
                            </span>
                          );
                        })}
                      </div>

                      {/* Sample Rows Preview Table */}
                      {sampleMeta.sampleRows.length > 0 && (
                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 bg-white dark:bg-gray-900">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                {sampleMeta.headers.map((h) => (
                                  <th
                                    key={h}
                                    className="px-2.5 py-1.5 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] whitespace-nowrap"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {sampleMeta.sampleRows.map((sRow, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                  {sampleMeta.headers.map((h) => (
                                    <td
                                      key={h}
                                      className="px-2.5 py-1 text-gray-800 dark:text-gray-200 text-[11px] whitespace-nowrap"
                                    >
                                      {typeof sRow[h] === "object"
                                        ? JSON.stringify(sRow[h])
                                        : String(sRow[h] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* File Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Upload File (.xlsx, .xls, .csv) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden focus-within:ring-2 focus-within:ring-[#0088cc]/20 focus-within:border-[#0088cc]">
                <label className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                  Choose File
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="px-3.5 text-xs text-gray-600 dark:text-gray-400 truncate">
                  {selectedFile ? selectedFile.name : "No file chosen (Supports Excel and CSV)"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Upload your completed Excel or CSV file. All columns corresponding to custom attributes will be imported.
              </p>
            </div>

            {/* Parsed Rows Preview & Validation Status */}
            {parsedRows.length > 0 && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                {/* Validation Status Banner (matching Laravel CRM / Krayin CRM) */}
                {!validationResult && !validating && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                      <i className="mgc_information_line text-lg text-amber-600 flex-shrink-0"></i>
                      <span>
                        Verify your file data before importing to check for schema, foreign key, or duplicate issues.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleValidateData}
                      disabled={validating}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex-shrink-0 whitespace-nowrap"
                    >
                      Validate Data
                    </button>
                  </div>
                )}

                {validating && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-200">
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#0088cc] border-t-transparent flex-shrink-0"></span>
                    <span>Validating file rows against database rules... Please wait.</span>
                  </div>
                )}

                {validationResult && (
                  <div
                    className={`p-4 rounded-xl border space-y-2.5 ${
                      validationResult.isValid
                        ? "bg-green-50/90 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                        : "bg-red-50/90 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        {validationResult.isValid ? (
                          <>
                            <i className="mgc_check_circle_line text-base text-green-600"></i>
                            <span className="text-green-800 dark:text-green-300">
                              Validation Successful: Data is valid and ready to import!
                            </span>
                          </>
                        ) : (
                          <>
                            <i className="mgc_close_circle_line text-base text-red-600"></i>
                            <span className="text-red-800 dark:text-red-300">
                              Validation Failed: {validationResult.errorsCount} error(s) detected
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleValidateData}
                        className="text-[11px] text-[#0088cc] hover:underline font-semibold"
                      >
                        Re-validate Data
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <div>
                        Total Rows: <b>{validationResult.total}</b>
                      </div>
                      <div className="text-green-600 dark:text-green-400">
                        Valid Rows: <b>{validationResult.validCount}</b>
                      </div>
                      <div className={validationResult.errorsCount > 0 ? "text-red-600 dark:text-red-400" : ""}>
                        Errors: <b>{validationResult.errorsCount}</b>
                      </div>
                    </div>

                    {validationResult.errors.length > 0 && (
                      <div className="max-h-36 overflow-auto bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-400 space-y-1">
                        {validationResult.errors.slice(0, 10).map((err, idx) => (
                          <div key={idx}>• {err}</div>
                        ))}
                        {validationResult.errors.length > 10 && (
                          <div className="text-[10px] text-gray-500 italic">
                            ...and {validationResult.errors.length - 10} more error(s)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Data Preview ({parsedRows.length} rows, {previewCols.length} columns)
                  </p>
                  <span className="text-[11px] text-gray-500">
                    All columns will be imported into {type}
                  </span>
                </div>

                {/* Table Preview */}
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-60">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                          #
                        </th>
                        {previewCols.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                      {parsedRows.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-1.5 text-gray-400 text-[11px]">{rIdx + 1}</td>
                          {previewCols.map((col) => (
                            <td
                              key={col}
                              className="px-3 py-1.5 text-gray-800 dark:text-gray-200 truncate max-w-xs text-[11px]"
                            >
                              {typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 5 && (
                  <p className="text-[11px] text-gray-400 italic">
                    Showing first 5 rows of {parsedRows.length} total rows.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings Section (Col Span 1) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header with Accordion Toggle */}
            <div
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer select-none"
            >
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Import Configuration</h2>
              <button type="button" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <i className={`mgc_chevron_${isSettingsOpen ? "up" : "down"}_line text-base`}></i>
              </button>
            </div>

            {isSettingsOpen && (
              <div className="p-5 space-y-4">
                {/* Action Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Action <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                  >
                    <option value="Create/Update">Create/Update</option>
                    <option value="Delete">Delete</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {action === "Create/Update" && "Creates new records or updates existing records and custom attributes."}
                    {action === "Delete" && "Deletes matching records found in the import file."}
                  </p>
                </div>

                {/* Validation Strategy Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Validation Strategy <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={validationStrategy}
                    onChange={(e) => setValidationStrategy(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                  >
                    <option value="Stop on Errors">Stop on Errors</option>
                    <option value="Skip Errors">Skip Errors</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {validationStrategy === "Stop on Errors"
                      ? "Aborts and rolls back the batch when errors exceed allowed threshold."
                      : "Skips invalid rows and imports all error-free rows."}
                  </p>
                </div>

                {/* Allowed Errors */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Allowed Errors Limit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={allowedErrors}
                    onChange={(e) => setAllowedErrors(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Maximum number of row errors permitted before import halts.
                  </p>
                </div>

                {/* Field Separator for CSV */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Field Separator (for CSV)
                  </label>
                  <input
                    type="text"
                    value={fieldSeparator}
                    onChange={(e) => setFieldSeparator(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                  />
                </div>

                {/* Process In Queue Toggle Switch */}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Process In Background Queue
                      </label>
                      <p className="text-[10px] text-gray-400">
                        Recommended for large datasets
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProcessInQueue(!processInQueue)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        processInQueue ? "bg-[#0088cc]" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          processInQueue ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateImportPage;
