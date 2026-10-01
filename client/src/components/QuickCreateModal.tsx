import React, { useState, useEffect } from "react";
import API from "@/config";
import Swal from "sweetalert2";
import { useLeadStore } from "@/store";

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"lead" | "person" | "organization" | "product">("lead");
  const [loading, setLoading] = useState(false);

  // Dropdown lists
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);

  // Lead Form
  const [leadTitle, setLeadTitle] = useState("");
  const [leadValue, setLeadValue] = useState("");
  const [leadPipelineId, setLeadPipelineId] = useState("");
  const [leadPersonId, setLeadPersonId] = useState("");
  const [leadSourceId, setLeadSourceId] = useState("");

  // Person Form
  const [personName, setPersonName] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personPhone, setPersonPhone] = useState("");

  // Organization Form
  const [orgName, setOrgName] = useState("");

  // Product Form
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodPrice, setProdPrice] = useState("");

  useEffect(() => {
    if (isOpen) {
      API.get("/pipelines").then((res) => setPipelines(res.data?.data || [])).catch(() => {});
      API.get("/persons").then((res) => setPersons(res.data?.data || res.data?.rows || [])).catch(() => {});
      API.get("/sources").then((res) => setSources(res.data?.data || [])).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await useLeadStore.getState().addLead({
        title: leadTitle.trim(),
        lead_value: leadValue ? Number(leadValue) : null,
        lead_pipeline_id: leadPipelineId ? Number(leadPipelineId) : null,
        person_id: leadPersonId ? Number(leadPersonId) : null,
        lead_source_id: leadSourceId ? Number(leadSourceId) : null,
      });
      Swal.fire({ icon: "success", title: "Lead Created!", timer: 1200, showConfirmButton: false });
      resetForms();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || err.message || "Failed to create lead" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post("/persons", {
        name: personName.trim(),
        emails: personEmail ? [{ label: "work", value: personEmail.trim() }] : [],
        contact_numbers: personPhone ? [{ label: "work", value: personPhone.trim() }] : [],
      });
      Swal.fire({ icon: "success", title: "Contact Created!", timer: 1200, showConfirmButton: false });
      resetForms();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to create contact" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post("/organizations", {
        name: orgName.trim(),
      });
      Swal.fire({ icon: "success", title: "Organization Created!", timer: 1200, showConfirmButton: false });
      resetForms();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to create organization" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post("/products", {
        name: prodName.trim(),
        sku: prodSku.trim() || undefined,
        price: prodPrice ? Number(prodPrice) : 0,
      });
      Swal.fire({ icon: "success", title: "Product Created!", timer: 1200, showConfirmButton: false });
      resetForms();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to create product" });
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setLeadTitle("");
    setLeadValue("");
    setLeadPipelineId("");
    setLeadPersonId("");
    setLeadSourceId("");
    setPersonName("");
    setPersonEmail("");
    setPersonPhone("");
    setOrgName("");
    setProdName("");
    setProdSku("");
    setProdPrice("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 my-8">
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <div>
            <span className="text-xs uppercase font-semibold text-blue-600 dark:text-blue-400">Quick Actions</span>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Create New Entity</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">&times;</button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
          {[
            { id: "lead", label: "Lead", icon: "mgc_flag_2_line" },
            { id: "person", label: "Person", icon: "mgc_user_3_line" },
            { id: "organization", label: "Organization", icon: "mgc_building_1_line" },
            { id: "product", label: "Product", icon: "mgc_box_3_line" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#0088cc] text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              <i className={`${tab.icon} text-sm`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* LEAD TAB */}
        {activeTab === "lead" && (
          <form onSubmit={handleCreateLead} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lead Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Enterprise Software License"
                value={leadTitle}
                onChange={(e) => setLeadTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lead Value ($)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="5000"
                  value={leadValue}
                  onChange={(e) => setLeadValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pipeline
                </label>
                <select
                  value={leadPipelineId}
                  onChange={(e) => setLeadPipelineId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="">-- Default Pipeline --</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Associated Person
                </label>
                <select
                  value={leadPersonId}
                  onChange={(e) => setLeadPersonId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="">-- Select Person --</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lead Source
                </label>
                <select
                  value={leadSourceId}
                  onChange={(e) => setLeadSourceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="">-- Select Source --</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg">
                {loading ? "Creating..." : "Create Lead"}
              </button>
            </div>
          </form>
        )}

        {/* PERSON TAB */}
        {activeTab === "person" && (
          <form onSubmit={handleCreatePerson} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="jane@company.com"
                value={personEmail}
                onChange={(e) => setPersonEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 555-123-4567"
                value={personPhone}
                onChange={(e) => setPersonPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg">
                {loading ? "Creating..." : "Create Contact"}
              </button>
            </div>
          </form>
        )}

        {/* ORGANIZATION TAB */}
        {activeTab === "organization" && (
          <form onSubmit={handleCreateOrg} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Acme Corporation"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg">
                {loading ? "Creating..." : "Create Organization"}
              </button>
            </div>
          </form>
        )}

        {/* PRODUCT TAB */}
        {activeTab === "product" && (
          <form onSubmit={handleCreateProduct} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="CRM Subscription - Annual"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SKU Code
                </label>
                <input
                  type="text"
                  placeholder="SKU-1001"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="299.00"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg">
                {loading ? "Creating..." : "Create Product"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
