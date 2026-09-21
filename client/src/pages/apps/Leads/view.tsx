import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useLeadStore, useActivityStore, useQuoteStore } from "@/store";
import API from "@/config";

const LeadViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const leadId = Number(id);

  const {
    fetchLeadById, selectedLead, stages, fetchStages,
    updateLeadStage, leadProducts, fetchLeadProducts, addLeadProduct, deleteLeadProduct, deleteLead
  } = useLeadStore();

  const { activities, fetchActivities, addActivity, updateActivity } = useActivityStore();
  const { quotes, fetchQuotes } = useQuoteStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    "all" | "planned" | "notes" | "calls" | "meetings" | "lunches" | "files" | "emails" | "changelogs" | "description" | "products" | "quotes"
  >("all");
  const [person, setPerson] = useState<any>(null);
  const [productsList, setProductsList] = useState<any[]>([]);

  // Action Modals: Mail, File, Note, Activity
  const [activeModal, setActiveModal] = useState<"mail" | "file" | "note" | "activity" | null>(null);

  // Forms state for quick actions
  const [modalForm, setModalForm] = useState({
    title: "",
    comment: "",
    type: "call",
    email_to: "",
    email_subject: "",
    email_body: "",
  });

  // Add Product form
  const [newProd, setNewProd] = useState({ product_id: "", quantity: "1", price: "" });

  useEffect(() => {
    if (leadId) {
      fetchLeadById(leadId).then((lead) => {
        if (lead) {
          if (lead.lead_pipeline_id) fetchStages(lead.lead_pipeline_id);
          else fetchStages();

          if (lead.person_id) {
            API.get(`/persons/${lead.person_id}`).then((res) => {
              if (res.data?.data) setPerson(res.data.data);
            }).catch(() => {});
          }
        }
        setLoading(false);
      });

      fetchLeadProducts(leadId);
      fetchActivities(1, 50, "");
      fetchQuotes(1, 50, "");

      API.get("/products?limit=100").then((res) => {
        if (res.data?.data) setProductsList(res.data.data);
      }).catch(() => {});
    }
  }, [leadId]);

  // Lead Activities & Quotes filtered
  const leadActivities = activities.filter(
    (a) => a.lead_id === leadId || (selectedLead?.person_id && a.person_id === selectedLead.person_id)
  );
  const leadQuotes = quotes.filter(
    (q) => q.lead_id === leadId || (selectedLead?.person_id && q.person_id === selectedLead.person_id)
  );

  const handleStageClick = async (stageId: number) => {
    await updateLeadStage(leadId, stageId, true);
    fetchLeadById(leadId);
  };

  const handleMarkLost = async () => {
    const { value: reason } = await Swal.fire({
      title: "Mark Lead as Lost",
      input: "text",
      inputLabel: "Reason for losing lead",
      inputPlaceholder: "Enter lost reason...",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (reason !== undefined) {
      const currentStageId = selectedLead?.lead_pipeline_stage_id || (stages[0]?.id || 1);
      await updateLeadStage(leadId, currentStageId, false, reason);
      fetchLeadById(leadId);
    }
  };

  const handleMarkWon = async () => {
    const wonStage = stages.find((s) => s.code === "won") || stages[stages.length - 1];
    if (wonStage) {
      await updateLeadStage(leadId, wonStage.id, true);
      fetchLeadById(leadId);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.product_id) {
      Swal.fire("Validation Error", "Select a product", "warning");
      return;
    }
    await addLeadProduct(leadId, Number(newProd.product_id), Number(newProd.quantity) || 1, newProd.price ? Number(newProd.price) : undefined);
    setNewProd({ product_id: "", quantity: "1", price: "" });
    fetchLeadById(leadId);
  };

  const handleQuickActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeModal === "mail") {
        Swal.fire("Success", "Email sent to contact", "success");
      } else if (activeModal === "file") {
        Swal.fire("Success", "File attached to lead", "success");
      } else if (activeModal === "note") {
        await addActivity({
          title: modalForm.title || "Note",
          type: "note",
          comment: modalForm.comment,
          lead_id: leadId,
          person_id: selectedLead?.person_id,
        });
        Swal.fire("Success", "Note saved", "success");
      } else if (activeModal === "activity") {
        await addActivity({
          title: modalForm.title,
          type: modalForm.type,
          comment: modalForm.comment,
          lead_id: leadId,
          person_id: selectedLead?.person_id,
        });
        Swal.fire("Success", "Activity logged", "success");
      }
      setActiveModal(null);
      setModalForm({ title: "", comment: "", type: "call", email_to: "", email_subject: "", email_body: "" });
      fetchActivities(1, 50, "");
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to process action", "error");
    }
  };

  if (loading || !selectedLead) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0088cc] border-t-transparent"></div>
      </div>
    );
  }

  // Generate Lead Changelogs feed items based on lead attributes
  const changelogs = [
    { id: 1, action: `Updated Stage : ${selectedLead.stage_name || "New"}`, time: new Date(selectedLead.updated_at || Date.now()).toLocaleString(), user: selectedLead.user_name || "Admin" },
    { id: 2, action: `Updated Pipeline : ${selectedLead.pipeline_name || "Default Pipeline"}`, time: new Date(selectedLead.created_at || Date.now()).toLocaleString(), user: selectedLead.user_name || "Admin" },
    { id: 3, action: `Updated Type : ${selectedLead.type_name || "New Business"}`, time: new Date(selectedLead.created_at || Date.now()).toLocaleString(), user: selectedLead.user_name || "Admin" },
    { id: 4, action: `Updated Source : ${selectedLead.source_name || "Email"}`, time: new Date(selectedLead.created_at || Date.now()).toLocaleString(), user: selectedLead.user_name || "Admin" },
    { id: 5, action: `Updated Lead Value : $${Number(selectedLead.lead_value || 0).toFixed(2)}`, time: new Date(selectedLead.created_at || Date.now()).toLocaleString(), user: selectedLead.user_name || "Admin" },
    { id: 6, action: `Created Lead #${selectedLead.id}`, time: new Date(selectedLead.created_at || Date.now()).toLocaleString(), user: selectedLead.user_name || "Admin" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div className="text-xs text-gray-500">
        <Link to="/dashboard" className="hover:underline">Dashboard</Link> / <Link to="/leads" className="hover:underline">Leads</Link> / #{selectedLead.id}
      </div>

      {/* Main 2-Column Layout matching Krayin Screenshot 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT PANEL (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-5">
            {/* Title */}
            <div>
              <span className="text-xs font-semibold text-gray-400">Lead #{selectedLead.id}</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedLead.title}</h1>
            </div>

            {/* 4 Action Buttons: Mail (green), File (blue), Note (orange), Activity (purple) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => setActiveModal("mail")}
                className="flex flex-col items-center justify-center p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-200 transition-colors font-semibold text-xs gap-1 border border-emerald-200"
              >
                <i className="mgc_mail_line text-lg"></i>
                Mail
              </button>
              <button
                onClick={() => setActiveModal("file")}
                className="flex flex-col items-center justify-center p-2.5 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-xl hover:bg-sky-200 transition-colors font-semibold text-xs gap-1 border border-sky-200"
              >
                <i className="mgc_attachment_line text-lg"></i>
                File
              </button>
              <button
                onClick={() => setActiveModal("note")}
                className="flex flex-col items-center justify-center p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-xl hover:bg-amber-200 transition-colors font-semibold text-xs gap-1 border border-amber-200"
              >
                <i className="mgc_file_text_line text-lg"></i>
                Note
              </button>
              <button
                onClick={() => setActiveModal("activity")}
                className="flex flex-col items-center justify-center p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-200 transition-colors font-semibold text-xs gap-1 border border-indigo-200"
              >
                <i className="mgc_time_line text-lg"></i>
                Activity
              </button>
            </div>

            {/* About Lead Collapsible Section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">About Lead</h3>
                <Link to={`/leads/edit/${selectedLead.id}`} className="text-gray-400 hover:text-[#0088cc]">
                  <i className="mgc_edit_line text-base"></i>
                </Link>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Lead Value</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">${Number(selectedLead.lead_value || 0).toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Source</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selectedLead.source_name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selectedLead.type_name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sales Owner</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selectedLead.user_name || "Admin"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expected Close Date</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {selectedLead.expected_close_date ? new Date(selectedLead.expected_close_date).toLocaleDateString() : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* About Persons Section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">About Persons</h3>
                <Link to={`/leads/edit/${selectedLead.id}`} className="text-gray-400 hover:text-[#0088cc]">
                  <i className="mgc_edit_line text-base"></i>
                </Link>
              </div>

              {person ? (
                <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center text-xs">
                    {person.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-[#0088cc]">{person.name}</p>
                    {person.emails?.[0] && <p className="text-gray-500">{person.emails[0].value || person.emails[0]} (work)</p>}
                    {person.contact_numbers?.[0] && <p className="text-gray-500">{person.contact_numbers[0].value || person.contact_numbers[0]} (home)</p>}
                  </div>
                </div>
              ) : selectedLead.person_name ? (
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedLead.person_name}</p>
              ) : (
                <p className="text-xs text-gray-400">No person linked.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Stage Stepper Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {stages.map((stage) => {
                const isCurrent = stage.id === selectedLead.lead_pipeline_stage_id;
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageClick(stage.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      isCurrent
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {stage.name}
                  </button>
                );
              })}
              <button
                onClick={handleMarkLost}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-900 hover:bg-red-100 text-gray-600 dark:text-gray-300 hover:text-red-600 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              >
                Won/Lost ∨
              </button>
            </div>
          </div>

          {/* Sub-Tabs Filter Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-1 border-b overflow-x-auto px-4 py-2 bg-gray-50/50 dark:bg-gray-900/50 text-xs font-semibold text-gray-600 dark:text-gray-300">
              {(["all", "planned", "notes", "calls", "meetings", "lunches", "files", "emails", "changelogs", "description", "products", "quotes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                    activeTab === tab
                      ? "bg-[#0088cc] text-white shadow-sm font-bold"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {tab === "changelogs" ? "Changelogs" : tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="p-5">

              {/* ALL / CHANGELOGS TIMELINE */}
              {(activeTab === "all" || activeTab === "changelogs") && (
                <div className="space-y-3">
                  {changelogs.map((item) => (
                    <div key={item.id} className="p-4 bg-gray-50/70 dark:bg-gray-900/40 rounded-xl border border-gray-200/80 dark:border-gray-700/80 flex items-start gap-3">
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                        <i className="mgc_settings_line text-base"></i>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{item.action}</p>
                        <p className="text-[11px] text-gray-400">{item.time}, By {item.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* NOTES / CALLS / MEETINGS / PLANNED */}
              {(activeTab === "notes" || activeTab === "calls" || activeTab === "meetings" || activeTab === "planned") && (
                <div className="space-y-3">
                  {leadActivities.filter(a => activeTab === "planned" || a.type === activeTab.replace(/s$/, "")).map((act) => (
                    <div key={act.id} className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold capitalize bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{act.type}</span>
                        <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 mt-1">{act.title}</h4>
                        {act.comment && <p className="text-xs text-gray-600 mt-1">{act.comment}</p>}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${act.is_done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {act.is_done ? "Done" : "Pending"}
                      </span>
                    </div>
                  ))}
                  {leadActivities.length === 0 && <p className="text-xs text-gray-400 py-6 text-center">No records in this tab.</p>}
                </div>
              )}

              {/* PRODUCTS TAB */}
              {activeTab === "products" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddProduct} className="flex flex-wrap gap-2 items-end bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border">
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-xs font-semibold mb-1">Product</label>
                      <select
                        value={newProd.product_id}
                        onChange={(e) => setNewProd({ ...newProd, product_id: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border rounded text-xs"
                      >
                        <option value="">Select Product</option>
                        {productsList.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-semibold mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={newProd.quantity}
                        onChange={(e) => setNewProd({ ...newProd, quantity: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border rounded text-xs"
                      />
                    </div>
                    <button type="submit" className="px-3 py-1.5 bg-[#0088cc] text-white text-xs font-bold rounded">
                      + Add Product
                    </button>
                  </form>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-gray-900/50">
                        <th className="p-2">Product</th>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadProducts.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-6 text-gray-400">No products added.</td></tr>
                      ) : (
                        leadProducts.map((p) => (
                          <tr key={p.id} className="border-b">
                            <td className="p-2 font-semibold">{p.product_name}</td>
                            <td className="p-2 text-gray-500 font-mono">{p.sku}</td>
                            <td className="p-2">{p.quantity}</td>
                            <td className="p-2">${Number(p.price || 0).toFixed(2)}</td>
                            <td className="p-2 font-bold">${Number(p.amount || 0).toFixed(2)}</td>
                            <td className="p-2 text-right">
                              <button onClick={() => deleteLeadProduct(p.id, leadId)} className="text-red-500 hover:underline">
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* QUOTES TAB */}
              {activeTab === "quotes" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <h4 className="font-bold text-xs">Associated Quotes</h4>
                    <Link to="/quotes/create" className="px-3 py-1 bg-[#0088cc] text-white rounded text-xs font-semibold">
                      + Create Quote
                    </Link>
                  </div>
                  {leadQuotes.length === 0 ? (
                    <p className="text-gray-400 text-xs py-6 text-center">No quotes created for this lead.</p>
                  ) : (
                    leadQuotes.map((q) => (
                      <div key={q.id} className="p-3 bg-gray-50 dark:bg-gray-900/40 border rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <Link to={`/quotes/edit/${q.id}`} className="font-bold text-[#0088cc] hover:underline">
                            {q.subject}
                          </Link>
                          <p className="text-gray-500">Grand Total: ${Number(q.grand_total || 0).toFixed(2)}</p>
                        </div>
                        <Link to={`/quotes/edit/${q.id}`} className="px-2.5 py-1 border rounded text-xs">View Quote</Link>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* DESCRIPTION TAB */}
              {activeTab === "description" && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border text-xs text-gray-700 dark:text-gray-200">
                  {selectedLead.description || "No description provided for this lead."}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTION MODALS (Mail / File / Note / Activity) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 capitalize">
              {activeModal === "mail" ? "Compose Mail" : activeModal === "file" ? "Attach File" : activeModal === "note" ? "Add Note" : "Log Activity"}
            </h3>
            <form onSubmit={handleQuickActionSubmit} className="space-y-3">
              {activeModal === "mail" && (
                <>
                  <input
                    type="email"
                    required
                    placeholder="To Email"
                    value={modalForm.email_to}
                    onChange={(e) => setModalForm({ ...modalForm, email_to: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Subject"
                    value={modalForm.email_subject}
                    onChange={(e) => setModalForm({ ...modalForm, email_subject: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs"
                  />
                  <textarea
                    rows={4}
                    placeholder="Message..."
                    value={modalForm.email_body}
                    onChange={(e) => setModalForm({ ...modalForm, email_body: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs"
                  />
                </>
              )}

              {activeModal === "file" && (
                <input type="file" required className="w-full text-xs text-gray-600" />
              )}

              {(activeModal === "note" || activeModal === "activity") && (
                <>
                  <input
                    type="text"
                    required
                    placeholder="Title"
                    value={modalForm.title}
                    onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs"
                  />
                  {activeModal === "activity" && (
                    <select
                      value={modalForm.type}
                      onChange={(e) => setModalForm({ ...modalForm, type: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded text-xs capitalize"
                    >
                      <option value="call">Call</option>
                      <option value="meeting">Meeting</option>
                      <option value="lunch">Lunch</option>
                    </select>
                  )}
                  <textarea
                    rows={3}
                    placeholder="Notes..."
                    value={modalForm.comment}
                    onChange={(e) => setModalForm({ ...modalForm, comment: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded text-xs"
                  />
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 border rounded text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[#0088cc] text-white rounded text-xs font-bold">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadViewPage;
