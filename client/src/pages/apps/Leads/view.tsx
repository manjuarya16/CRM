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

  // Action Modals: Mail, File, Note, Activity, StageUpdate (Won/Lost)
  const [activeModal, setActiveModal] = useState<"mail" | "file" | "note" | "activity" | "won_lost" | null>(null);
  const [targetWonLostStage, setTargetWonLostStage] = useState<any>(null);

  const [personsList, setPersonsList] = useState<any[]>([]);

  // Forms state for quick actions
  const [modalForm, setModalForm] = useState({
    title: "",
    comment: "",
    type: "call",
    email_to: "",
    email_subject: "",
    email_body: "",
    won_value: "",
    lost_reason: "",
    closed_at: "",
    schedule_from: "",
    schedule_to: "",
    location: "",
    person_id: "",
  });

  // Add Product form
  const [newProd, setNewProd] = useState({ product_id: "", quantity: "1", price: "" });

  useEffect(() => {
    API.get("/persons?limit=100").then((res) => {
      if (res.data?.data) setPersonsList(res.data.data);
    }).catch(() => {});
  }, []);


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
      fetchActivities(1, 100, "", leadId);
      fetchQuotes(1, 50, "");


      API.get("/products?limit=100").then((res) => {
        if (res.data?.data) setProductsList(res.data.data);
      }).catch(() => {});
    }
  }, [leadId]);

  // Lead Activities & Quotes filtered
  const leadActivities = activities.filter(
    (a) => Number(a.lead_id) === leadId || (selectedLead?.person_id && Number(a.person_id) === Number(selectedLead.person_id))
  );
  const leadQuotes = quotes.filter(
    (q) => Number(q.lead_id) === leadId || (selectedLead?.person_id && Number(q.person_id) === Number(selectedLead.person_id))
  );


  const handleStageClick = async (stage: any) => {
    if (stage.code === "won" || stage.code === "lost") {
      setTargetWonLostStage(stage);
      setModalForm({
        ...modalForm,
        won_value: selectedLead?.lead_value ? String(selectedLead.lead_value) : "",
        closed_at: new Date().toISOString().substring(0, 16),
      });
      setActiveModal("won_lost");
      return;
    }

    await updateLeadStage(leadId, stage.id, true);
    fetchLeadById(leadId);
  };

  const handleWonLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWonLostStage) return;

    const isWon = targetWonLostStage.code === "won";
    await updateLeadStage(
      leadId,
      targetWonLostStage.id,
      isWon,
      isWon ? undefined : modalForm.lost_reason
    );
    setActiveModal(null);
    fetchLeadById(leadId);
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
        await addActivity({
          title: modalForm.email_subject || "Email Sent",
          type: "email",
          comment: `To: ${modalForm.email_to}\n${modalForm.email_body}`,
          lead_id: leadId,
          person_id: selectedLead?.person_id,
        });
        Swal.fire("Success", "Email logged for lead", "success");
      } else if (activeModal === "file") {
        await addActivity({
          title: "File Attachment",
          type: "file",
          comment: "Attached file document to lead",
          lead_id: leadId,
          person_id: selectedLead?.person_id,
        });
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
          schedule_from: modalForm.schedule_from || undefined,
          schedule_to: modalForm.schedule_to || undefined,
          location: modalForm.location || undefined,
          lead_id: leadId,
          person_id: modalForm.person_id ? Number(modalForm.person_id) : selectedLead?.person_id,
        });
        Swal.fire("Success", "Activity logged", "success");
      }
      setActiveModal(null);
      setModalForm({ title: "", comment: "", type: "call", email_to: "", email_subject: "", email_body: "", won_value: "", lost_reason: "", closed_at: "", schedule_from: "", schedule_to: "", location: "", person_id: "" });
      fetchActivities(1, 100, "", leadId);
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
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="hover:underline">Dashboard</Link> / <Link to="/leads" className="hover:underline">Leads</Link> / #{selectedLead.id}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/leads/edit/${selectedLead.id}`}
            className="px-3 py-1 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700"
          >
            Edit Lead
          </Link>
          <button
            onClick={async () => {
              const res = await Swal.fire({ title: "Delete Lead?", text: `Delete lead "${selectedLead.title}"?`, icon: "warning", showCancelButton: true, confirmButtonColor: "#d33" });
              if (res.isConfirmed) { await deleteLead(leadId); navigate("/leads"); }
            }}
            className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-200"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout matching Krayin Screenshot 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT PANEL (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-800 p-5 space-y-5">
            {/* Title */}
            <div>
              <span className="text-xs font-semibold text-gray-400">Lead #{selectedLead.id}</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedLead.title}</h1>
            </div>

            {/* 4 Action Buttons: Mail (green), File (blue), Note (orange), Activity (purple) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => setActiveModal("mail")}
                className="flex flex-col items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-xl hover:bg-emerald-200 transition-colors font-bold text-xs gap-1 border border-emerald-300 shadow-sm"
              >
                <i className="mgc_mail_line text-lg"></i>
                Mail
              </button>
              <button
                onClick={() => setActiveModal("file")}
                className="flex flex-col items-center justify-center p-3 bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 rounded-xl hover:bg-sky-200 transition-colors font-bold text-xs gap-1 border border-sky-300 shadow-sm"
              >
                <i className="mgc_attachment_line text-lg"></i>
                File
              </button>
              <button
                onClick={() => setActiveModal("note")}
                className="flex flex-col items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-xl hover:bg-amber-200 transition-colors font-bold text-xs gap-1 border border-amber-300 shadow-sm"
              >
                <i className="mgc_file_text_line text-lg"></i>
                Note
              </button>
              <button
                onClick={() => setActiveModal("activity")}
                className="flex flex-col items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 rounded-xl hover:bg-indigo-200 transition-colors font-bold text-xs gap-1 border border-indigo-300 shadow-sm"
              >
                <i className="mgc_time_line text-lg"></i>
                Activity
              </button>
            </div>

            {/* About Lead Collapsible Section */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
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
                {(() => {
                  let attrs: Record<string, any> = {};
                  if (selectedLead.custom_attributes) {
                    if (typeof selectedLead.custom_attributes === "object") {
                      attrs = selectedLead.custom_attributes;
                    } else if (typeof selectedLead.custom_attributes === "string") {
                      try { attrs = JSON.parse(selectedLead.custom_attributes); } catch {}
                    }
                  }
                  if (Object.keys(attrs).length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wider">Custom Attributes</p>
                      {Object.entries(attrs).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-gray-500 capitalize">{k.replace(/_/g, " ")}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{String(v ?? "-")}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* About Persons Section */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">About Persons</h3>
                <Link to={`/leads/edit/${selectedLead.id}`} className="text-gray-400 hover:text-[#0088cc]">
                  <i className="mgc_edit_line text-base"></i>
                </Link>
              </div>

              {person ? (
                <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center text-xs shrink-0">
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
          {/* Stage Stepper Bar (Chevron Ribbon style matching Krayin view/stages.blade.php) */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-800 p-2 overflow-hidden">
            <div className="flex items-center w-full overflow-x-auto rounded-lg py-1 px-1">
              {stages.map((stage, idx) => {
                const currentStageSort = stages.find((s) => s.id === selectedLead.lead_pipeline_stage_id)?.sort_order || 0;
                const stageSort = stage.sort_order || idx;
                const isPassed = currentStageSort >= stageSort;
                const isLost = !selectedLead.status;
                const isFirst = idx === 0;

                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageClick(stage)}
                    style={{
                      clipPath: isFirst
                        ? "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)"
                        : "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)"
                    }}
                    className={`px-6 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center -mr-2 min-w-[120px] shrink-0 ${
                      isLost
                        ? "bg-red-500 text-white"
                        : isPassed
                        ? "bg-[#10b981] text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {stage.name}
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setTargetWonLostStage(stages.find(s => s.code === "won") || stages[stages.length - 1]);
                  setActiveModal("won_lost");
                }}
                style={{
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)"
                }}
                className={`px-6 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center -mr-2 min-w-[120px] shrink-0 rounded-r-lg ${
                  !selectedLead.status
                    ? "bg-red-500 text-white"
                    : selectedLead.status && selectedLead.stage_name?.toLowerCase() === "won"
                    ? "bg-[#10b981] text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                Won/Lost ▾
              </button>
            </div>
          </div>

          {/* Sub-Tabs Filter Navigation Bar */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto px-4 py-2 bg-gray-50/50 dark:bg-gray-900/50 text-xs font-semibold text-gray-600 dark:text-gray-300">
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
                    <div key={item.id} className="p-4 bg-gray-50/80 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 flex items-start gap-3">
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
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

              {/* ACTIVITIES TABS: PLANNED, NOTES, CALLS, MEETINGS, LUNCHES, FILES, EMAILS */}
              {["planned", "notes", "calls", "meetings", "lunches", "files", "emails"].includes(activeTab) && (
                <div className="space-y-3">
                  {(() => {
                    const filtered = leadActivities.filter((a) => {
                      if (activeTab === "planned") return ["call", "meeting", "lunch"].includes(a.type) && !a.is_done;
                      if (activeTab === "notes") return a.type === "note";
                      if (activeTab === "calls") return a.type === "call";
                      if (activeTab === "meetings") return a.type === "meeting";
                      if (activeTab === "lunches") return a.type === "lunch";
                      if (activeTab === "files") return a.type === "file";
                      if (activeTab === "emails") return a.type === "email" || a.type === "mail";
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 capitalize">
                            No {activeTab} logged for this lead yet.
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Use the quick action buttons (Mail, File, Note, Activity) on the left panel to add data.
                          </p>
                        </div>
                      );
                    }

                    return filtered.map((act) => (
                      <div key={act.id} className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded">
                              {act.type}
                            </span>
                            {act.created_at && (
                              <span className="text-[11px] text-gray-400">
                                {new Date(act.created_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100">{act.title}</h4>
                          {act.comment && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{act.comment}</p>}
                        </div>

                        {/* Status Tag: ONLY for scheduled activities (Call, Meeting, Lunch) */}
                        {["call", "meeting", "lunch"].includes(act.type) && (
                          <button
                            onClick={async () => {
                              await updateActivity(act.id, { is_done: !act.is_done });
                              fetchActivities(1, 100, "", leadId);
                            }}
                            title="Click to toggle Done/Pending"
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                              act.is_done
                                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                            }`}
                          >
                            {act.is_done ? "Done ✓" : "Pending ⏳"}
                          </button>
                        )}
                      </div>
                    ));

                  })()}
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

      {/* QUICK ACTION & WON/LOST MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6 space-y-4">

            {/* WON/LOST STAGE MODAL */}
            {activeModal === "won_lost" ? (
              <>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {targetWonLostStage?.code === "won" ? "Mark Lead as Won" : "Mark Lead as Lost"}
                </h3>
                <form onSubmit={handleWonLostSubmit} className="space-y-4">
                  {targetWonLostStage?.code === "won" ? (
                    <div>
                      <label className="block text-xs font-semibold mb-1">Won Value ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={modalForm.won_value}
                        onChange={(e) => setModalForm({ ...modalForm, won_value: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold mb-1">Lost Reason *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Why was this lead lost?"
                        value={modalForm.lost_reason}
                        onChange={(e) => setModalForm({ ...modalForm, lost_reason: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded text-xs"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold mb-1">Closed At Date & Time</label>
                    <input
                      type="datetime-local"
                      value={modalForm.closed_at}
                      onChange={(e) => setModalForm({ ...modalForm, closed_at: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 border rounded text-xs font-semibold">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-1.5 text-white rounded text-xs font-bold ${
                        targetWonLostStage?.code === "won" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      Save & Update Stage
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
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
                    <>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Select File *</label>
                        <input type="file" required className="w-full text-xs text-gray-600 border p-2 rounded" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Comment / Description</label>
                        <input
                          type="text"
                          placeholder="File description..."
                          value={modalForm.comment}
                          onChange={(e) => setModalForm({ ...modalForm, comment: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded text-xs"
                        />
                      </div>
                    </>
                  )}

                  {(activeModal === "note" || activeModal === "activity") && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="Title"
                          value={modalForm.title}
                          onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded text-xs"
                        />
                      </div>

                      {activeModal === "activity" && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold mb-1">Participants / Contact Person</label>
                            <select
                              value={modalForm.person_id}
                              onChange={(e) => setModalForm({ ...modalForm, person_id: e.target.value })}
                              className="w-full px-3 py-1.5 border rounded text-xs"
                            >
                              <option value="">Select Participant</option>
                              {personsList.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold mb-1">Activity Type</label>
                              <select
                                value={modalForm.type}
                                onChange={(e) => setModalForm({ ...modalForm, type: e.target.value })}
                                className="w-full px-3 py-1.5 border rounded text-xs capitalize"
                              >
                                <option value="call">Call</option>
                                <option value="meeting">Meeting</option>
                                <option value="lunch">Lunch</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Location</label>
                              <input
                                type="text"
                                placeholder="Meeting room / link"
                                value={modalForm.location || ""}
                                onChange={(e) => setModalForm({ ...modalForm, location: e.target.value })}
                                className="w-full px-3 py-1.5 border rounded text-xs"
                              />
                            </div>
                          </div>


                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold mb-1">Schedule From</label>
                              <input
                                type="datetime-local"
                                value={modalForm.schedule_from || ""}
                                onChange={(e) => setModalForm({ ...modalForm, schedule_from: e.target.value })}
                                className="w-full px-3 py-1.5 border rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Schedule To</label>
                              <input
                                type="datetime-local"
                                value={modalForm.schedule_to || ""}
                                onChange={(e) => setModalForm({ ...modalForm, schedule_to: e.target.value })}
                                className="w-full px-3 py-1.5 border rounded text-xs"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-xs font-semibold mb-1">Notes / Comment</label>
                        <textarea
                          rows={3}
                          placeholder="Details..."
                          value={modalForm.comment}
                          onChange={(e) => setModalForm({ ...modalForm, comment: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded text-xs"
                        />
                      </div>
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
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default LeadViewPage;
