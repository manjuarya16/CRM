import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";

const CreateImportPage: React.FC = () => {
  const navigate = useNavigate();

  // General Form State
  const [type, setType] = useState<"Persons" | "Leads" | "Organizations" | "Products">("Persons");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  // Settings Panel State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(true);
  const [action, setAction] = useState<string>("Create/Update");
  const [validationStrategy, setValidationStrategy] = useState<string>("Stop on Errors");
  const [allowedErrors, setAllowedErrors] = useState<number>(10);
  const [fieldSeparator, setFieldSeparator] = useState<string>(",");
  const [processInQueue, setProcessInQueue] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setCsvText("");
      setParsedRows([]);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      setCsvText(text);
      parseCsv(text, fieldSeparator);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string, sep: string) => {
    try {
      const separator = sep || ",";
      const cleanText = text.replace(/^\uFEFF/, "");
      const allRows: string[][] = [];
      let currentRow: string[] = [];
      let currentField = "";
      let inQuotes = false;

      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const nextChar = cleanText[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === separator && !inQuotes) {
          currentRow.push(currentField.trim());
          currentField = "";
        } else if ((char === "\r" || char === "\n") && !inQuotes) {
          if (char === "\r" && nextChar === "\n") {
            i++;
          }
          currentRow.push(currentField.trim());
          if (currentRow.some((cell) => cell.length > 0)) {
            allRows.push(currentRow);
          }
          currentRow = [];
          currentField = "";
        } else {
          currentField += char;
        }
      }

      if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          allRows.push(currentRow);
        }
      }

      if (allRows.length < 2) {
        setParsedRows([]);
        return;
      }

      const rawHeaders = allRows[0];
      const resultObjects: any[] = [];

      for (let i = 1; i < allRows.length; i++) {
        const rowVals = allRows[i];
        const rowObj: Record<string, any> = {};
        rawHeaders.forEach((h, idx) => {
          rowObj[h] = rowVals[idx] !== undefined ? rowVals[idx] : "";
        });
        resultObjects.push(rowObj);
      }

      setParsedRows(resultObjects);
    } catch {
      setParsedRows([]);
    }
  };

  const handleDownloadSample = async () => {
    let sampleCsv = "";
    const typeKey = type.toLowerCase();
    
    if (typeKey === "persons") {
      sampleCsv = 'name,emails,contact_numbers,organization_id,job_title,user_id\nWilson Fisk,"[{""label"": ""work"", ""value"": ""contact@wilson.com""}, {""label"": ""home"", ""value"": ""contact.home@wilson.com""}]","[{""label"": ""work"", ""value"": ""5454445454""}]",1,Sales Executive,1\nSasha Calle,"[{""label"": ""work"", ""value"": ""contact@sasha.com""}]","[{""label"": ""work"", ""value"": ""15454445454""}]",1,Sales Representatives,1';
    } else if (typeKey === "leads") {
      sampleCsv = 'title,description,lead_value,person_id,organization_id,user_id,status\nEnterprise Software Deal,Interested in CRM integration,50000,1,1,1,Open\nWebsite Lead,Requested product demo,15000,2,2,1,Open';
    } else if (typeKey === "organizations") {
      sampleCsv = 'name,address,city,state,country,postcode,user_id\nAcme Corporation,123 Tech Boulevard,San Francisco,California,USA,94105,1\nGlobal Logistics Ltd,456 Freight Way,London,Greater London,UK,EC1A 1BB,1';
    } else if (typeKey === "products") {
      sampleCsv = 'sku,name,description,quantity,price\nPROD-101,Enterprise License,Annual license,50,999.00\nPROD-102,Standard Support,Support package,10,299.00';
    }

    const blob = new Blob(["\uFEFF" + sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sample_${typeKey}_import.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && parsedRows.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "File Required",
        text: "Please choose a valid CSV file to import.",
      });
      return;
    }

    try {
      setSaving(true);
      const entityType = type.toLowerCase();
      const actionParam = action === "Create/Update" ? "append" : action.toLowerCase() === "create" ? "append" : "overwrite";
      const stratParam = validationStrategy.toLowerCase().includes("stop") ? "stop_on_errors" : "skip_error_entries";

      const res = await API.post("/data-transfer/import", {
        type: entityType,
        action: actionParam,
        validation_strategy: stratParam,
        allowed_errors: allowedErrors,
        field_separator: fieldSeparator || ",",
        fileName: selectedFile?.name || "import.csv",
        rows: parsedRows,
      });

      Swal.fire({
        icon: "success",
        title: "Import Submitted",
        text: res.data?.message || "Import job started successfully!",
        timer: 1500,
        showConfirmButton: false,
      });

      navigate("/settings/data-transfer");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Import Error",
        text: err.response?.data?.message || err.message || "Failed to create import job",
      });
    } finally {
      setSaving(false);
    }
  };

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

        <div>
          <button
            type="button"
            onClick={handleSaveImport}
            disabled={saving}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#0088cc] hover:bg-[#0077b3] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                Saving...
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
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">General</h2>

            {/* Type Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Type <span className="text-red-500">*</span>
              </label>
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
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="text-xs font-medium text-[#0088cc] hover:underline"
                >
                  Download Sample
                </button>
              </div>
            </div>

            {/* File Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                File <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden focus-within:ring-2 focus-within:ring-[#0088cc]/20 focus-within:border-[#0088cc]">
                <label className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                  Choose File
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="px-3.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedFile ? selectedFile.name : "No file chosen"}
                </span>
              </div>
            </div>

            {/* Parsed Rows Preview */}
            {parsedRows.length > 0 && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">
                  ✓ Ready to import {parsedRows.length} rows from CSV
                </p>
                <div className="max-h-40 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-gray-50 dark:bg-gray-900 p-3 font-mono">
                  <pre>{JSON.stringify(parsedRows.slice(0, 2), null, 2)}</pre>
                  {parsedRows.length > 2 && (
                    <p className="text-[10px] text-gray-400 italic mt-1">
                      ...and {parsedRows.length - 2} more rows
                    </p>
                  )}
                </div>
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
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Settings</h2>
              <button type="button" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <i className={`mgc_chevron_${isSettingsOpen ? "up" : "down"}_line text-base`}></i>
              </button>
            </div>

            {isSettingsOpen && (
              <div className="p-5 space-y-4">
                {/* Action */}
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
                    <option value="Create">Create Only</option>
                    <option value="Update">Update Only</option>
                  </select>
                </div>

                {/* Validation Strategy */}
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
                    <option value="Skip Erroneous Rows">Skip Erroneous Rows</option>
                  </select>
                </div>

                {/* Allowed Errors */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Allowed Errors <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={allowedErrors}
                    onChange={(e) => setAllowedErrors(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                  />
                </div>

                {/* Field Separator */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Field Separator <span className="text-red-500">*</span>
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
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Process In Queue
                  </label>
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
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateImportPage;
