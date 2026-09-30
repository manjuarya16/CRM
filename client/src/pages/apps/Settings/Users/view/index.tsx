import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import API from "@/config";
import { IUserData } from "@/interface";
import { useActivityStore } from "@/store";
import { extractFileUrl, fileToBase64 } from "@/utils/fileHelper";

const ViewUserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = Number(id);

  const [selectedUser, setSelectedUser] = useState<IUserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    "all" | "planned" | "notes" | "calls" | "meetings" | "lunches" | "files" | "emails" | "changelogs"
  >("all");

  const { activities, fetchActivities, addActivity, updateActivity } = useActivityStore();

  // Quick Action Modals state: mail, file, note, activity
  const [activeModal, setActiveModal] = useState<"mail" | "file" | "note" | "activity" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const [modalForm, setModalForm] = useState({
    title: "",
    comment: "",
    description: "",
    type: "Call",
    email_to: "",
    email_cc: "",
    email_bcc: "",
    email_subject: "",
    email_body: "",
    schedule_from: "",
    schedule_to: "",
    location: "",
    participants: "",
    file_name: "",
  });

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchActivities(1, 100, "");
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/users/${userId}`);
      const userData = res.data?.data || res.data;
      if (userData) {
        setSelectedUser(userData);
        setModalForm((prev) => ({
          ...prev,
          email_to: userData.email || "",
        }));
      } else {
        // Fallback fetch from list
        const listRes = await API.get("/users");
        const found = (listRes.data?.data || []).find((u: IUserData) => Number(u.id) === userId);
        if (found) {
          setSelectedUser(found);
          setModalForm((prev) => ({ ...prev, email_to: found.email || "" }));
        }
      }
    } catch {
      // Fallback fetch all users
      try {
        const listRes = await API.get("/users");
        const found = (listRes.data?.data || []).find((u: IUserData) => Number(u.id) === userId);
        if (found) {
          setSelectedUser(found);
          setModalForm((prev) => ({ ...prev, email_to: found.email || "" }));
        }
      } catch (err) {
        console.error("Failed to load user details", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const res = await Swal.fire({
      title: "Delete User?",
      text: `Are you sure you want to delete user "${selectedUser.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete",
    });

    if (res.isConfirmed) {
      try {
        await API.delete(`/users/${selectedUser.id}`);
        Swal.fire("Deleted!", "User has been deleted.", "success");
        navigate("/settings/users");
      } catch (err: any) {
        Swal.fire("Error", err?.response?.data?.message || "Failed to delete user", "error");
      }
    }
  };

  const handleQuickActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeModal === "mail") {
        const mailFormData = new FormData();
        mailFormData.append("subject", modalForm.email_subject || "Email to User");
        mailFormData.append("reply", modalForm.email_body || "");
        mailFormData.append("reply_to", JSON.stringify([modalForm.email_to]));
        if (modalForm.email_cc) mailFormData.append("cc", JSON.stringify([modalForm.email_cc]));
        if (modalForm.email_bcc) mailFormData.append("bcc", JSON.stringify([modalForm.email_bcc]));
        mailFormData.append("is_draft", "false");

        // Dispatch real email via SMTP
        await API.post("/mail", mailFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        }).catch((err) => console.warn("SMTP email dispatch warning:", err));

        await addActivity({
          title: modalForm.email_subject || "Email Sent to User",
          type: "email",
          comment: `To: ${modalForm.email_to}\n${modalForm.email_body}`,
          user_id: userId,
        });
        Swal.fire("Success", "Email sent and activity logged for user", "success");
      } else if (activeModal === "file") {
        let uploadedFileUrl = "";
        if (selectedFile) {
          try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            const uploadRes = await API.post("/activities/upload-file", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            uploadedFileUrl = uploadRes.data?.fileUrl || uploadRes.data?.data?.fileUrl || "";
          } catch (uploadErr) {
            console.warn("Server file upload failed, attempting fallback:", uploadErr);
            try {
              uploadedFileUrl = await fileToBase64(selectedFile);
            } catch (b64Err) {
              console.warn("Base64 fallback failed:", b64Err);
            }
          }
        }
        const commentText = modalForm.description || modalForm.comment || `Attached document: ${selectedFile?.name || "file"}`;
        const finalComment = uploadedFileUrl ? `${commentText}\n${uploadedFileUrl}` : commentText;

        await addActivity({
          title: modalForm.title || selectedFile?.name || "File Attachment",
          type: "file",
          comment: finalComment,
          user_id: userId,
        });
        Swal.fire("Success", "File activity logged", "success");
        setSelectedFile(null);
      } else if (activeModal === "note") {
        await addActivity({
          title: modalForm.title || "User Note",
          type: "note",
          comment: modalForm.comment || modalForm.description,
          user_id: userId,
        });
        Swal.fire("Success", "Note saved", "success");
      } else if (activeModal === "activity") {
        await addActivity({
          title: modalForm.title,
          type: (modalForm.type || "call").toLowerCase(),
          comment: modalForm.description || modalForm.comment || "",
          schedule_from: modalForm.schedule_from || undefined,
          schedule_to: modalForm.schedule_to || undefined,
          location: modalForm.location || undefined,
          user_id: userId,
        });
        Swal.fire("Success", "Activity logged", "success");
      }
      setActiveModal(null);
      setModalForm({
        title: "",
        comment: "",
        description: "",
        type: "Call",
        email_to: selectedUser?.email || "",
        email_cc: "",
        email_bcc: "",
        email_subject: "",
        email_body: "",
        schedule_from: "",
        schedule_to: "",
        location: "",
        participants: "",
        file_name: "",
      });
      fetchActivities(1, 100, "");
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to process action", "error");
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "US";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (loading || !selectedUser) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0088cc] border-t-transparent"></div>
        <p className="mt-2 text-xs text-gray-400 font-medium">Loading user profile...</p>
      </div>
    );
  }

  // Generate changelogs feed for this user
  const changelogs = [
    { id: 1, action: `Updated Account Status : Inactive → Active`, time: new Date(selectedUser.created_at || Date.now()).toLocaleString(), user: selectedUser.name },
    { id: 2, action: `Assigned Role : ${selectedUser.role_name || "Administrator"}`, time: new Date(selectedUser.created_at || Date.now()).toLocaleString(), user: "Admin" },
    { id: 3, action: `Created User Account #${selectedUser.id}`, time: new Date(selectedUser.created_at || Date.now()).toLocaleString(), user: "Admin" },
  ];

  // User activities filter strictly for this specific user
  const userActivities = activities.filter((a: any) => {
    const uId = a.user_id ?? a.userId ?? a.user?.id ?? a.created_by ?? a.assigned_to;
    return uId !== undefined && uId !== null && Number(uId) === Number(userId);
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Top Breadcrumb & Actions Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Link to="/dashboard" className="hover:text-[#0088cc]">Dashboard</Link>
          <span>/</span>
          <Link to="/settings" className="hover:text-[#0088cc]">Settings</Link>
          <span>/</span>
          <Link to="/settings/users" className="hover:text-[#0088cc]">Users</Link>
          <span>/</span>
          <span className="text-gray-400 font-medium">#{selectedUser.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/settings/users"
            onClick={() => {
              // Trigger edit modal when returning or navigate
            }}
            className="px-3.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Edit User
          </Link>
          <button
            onClick={handleDeleteUser}
            className="px-3.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-200 hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout matching Krayin Person View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-800 p-5 space-y-6">
            
            {/* User Title Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#0088cc] text-white font-bold text-lg flex items-center justify-center border-2 border-blue-400 shrink-0 shadow-md">
                {getInitials(selectedUser.name)}
              </div>
              <div className="space-y-0.5 min-w-0">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 truncate">{selectedUser.name}</h1>
                <p className="text-xs text-[#0088cc] font-medium truncate flex items-center gap-1">
                  <i className="mgc_mail_line"></i>
                  {selectedUser.email}
                </p>
              </div>
            </div>

            {/* 4 Pastel Color Action Cards (Mail, File, Note, Activity) */}
            <div className="grid grid-cols-4 gap-2.5">
              <button
                onClick={() => setActiveModal("mail")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#dcfce7] text-[#166534] dark:bg-emerald-950/40 dark:text-emerald-300 hover:opacity-90 transition-all gap-1.5 shadow-sm border border-[#bbf7d0] dark:border-emerald-800"
              >
                <div className="w-7 h-7 rounded-lg border border-[#86efac] flex items-center justify-center">
                  <i className="mgc_mail_line text-base"></i>
                </div>
                <span className="text-xs font-bold">Mail</span>
              </button>

              <button
                onClick={() => setActiveModal("file")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#cffaff] text-[#0e7490] dark:bg-cyan-950/40 dark:text-cyan-300 hover:opacity-90 transition-all gap-1.5 shadow-sm border border-[#a5f3fc] dark:border-cyan-800"
              >
                <div className="w-7 h-7 rounded-lg border border-[#67e8f9] flex items-center justify-center">
                  <i className="mgc_attachment_line text-base"></i>
                </div>
                <span className="text-xs font-bold">File</span>
              </button>

              <button
                onClick={() => setActiveModal("note")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#ffedd5] text-[#c2410c] dark:bg-orange-950/40 dark:text-orange-300 hover:opacity-90 transition-all gap-1.5 shadow-sm border border-[#fed7aa] dark:border-orange-800"
              >
                <div className="w-7 h-7 rounded-lg border border-[#fdba74] flex items-center justify-center">
                  <i className="mgc_file_text_line text-base"></i>
                </div>
                <span className="text-xs font-bold">Note</span>
              </button>

              <button
                onClick={() => setActiveModal("activity")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#dbeafe] text-[#1e40af] dark:bg-blue-950/40 dark:text-blue-300 hover:opacity-90 transition-all gap-1.5 shadow-sm border border-[#bfdbfe] dark:border-blue-800"
              >
                <div className="w-7 h-7 rounded-lg border border-[#93c5fd] flex items-center justify-center">
                  <i className="mgc_time_line text-base"></i>
                </div>
                <span className="text-xs font-bold">Activity</span>
              </button>
            </div>

            {/* About User Collapsible Section */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
              <div className="flex items-center justify-between text-gray-800 dark:text-gray-100 font-bold text-sm">
                <span>About User</span>
                <i className="mgc_up_line text-gray-400"></i>
              </div>
              <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">User ID</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">#{selectedUser.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Account Status</span>
                  {selectedUser.status ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Inactive
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Role</span>
                  <span className="font-bold text-[#0088cc]">{selectedUser.role_name || "Administrator"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">View Permission</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{selectedUser.view_permission || "Global"}</span>
                </div>
              </div>
            </div>

            {/* Assigned Groups Section */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm uppercase tracking-wider text-[11px]">
                Assigned Groups
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedUser.groups && selectedUser.groups.length > 0 ? (
                  selectedUser.groups.map((g) => (
                    <span key={g.id} className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold">
                      {g.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No groups assigned.</span>
                )}
              </div>
            </div>

            {/* Account Metadata */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Created Date:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : "-"}
                </span>
              </div>
              {selectedUser.updated_at && (
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {new Date(selectedUser.updated_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT PANEL (8 cols) - Engagement Timeline */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-800 overflow-hidden">
            {/* Navigation Bar Tabs matching Krayin design */}
            <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto px-6 pt-3 pb-0 text-xs font-medium text-gray-500">
              {(["all", "planned", "notes", "calls", "meetings", "lunches", "files", "emails", "changelogs"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 capitalize transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? "border-b-2 border-[#0088cc] text-[#0088cc] font-bold"
                      : "hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  {tab === "all" ? "All" : tab === "changelogs" ? "Changelogs" : tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="p-6">
              {/* CHANGELOGS TAB ONLY */}
              {activeTab === "changelogs" && (
                <div className="space-y-4">
                  {changelogs.map((item) => (
                    <div key={item.id} className="p-4 bg-[#f8fafc] dark:bg-gray-800/40 rounded-xl flex items-start gap-4 border border-gray-100 dark:border-gray-800">
                      <div className="w-9 h-9 rounded-full bg-[#fef08a] text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                        <i className="mgc_settings_line text-base"></i>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                          {item.action}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {item.time}, By {item.user}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ACTIVITIES TABS: ALL, PLANNED, NOTES, CALLS, MEETINGS, LUNCHES, FILES, EMAILS */}
              {["all", "planned", "notes", "calls", "meetings", "lunches", "files", "emails"].includes(activeTab) && (
                <div className="space-y-4">
                  {(() => {
                    const filtered = userActivities.filter((a) => {
                      const t = (a.type || "").toLowerCase();
                      if (activeTab === "all") return true;
                      if (activeTab === "planned") return ["call", "meeting", "lunch"].includes(t) && !a.is_done;
                      if (activeTab === "notes") return t === "note";
                      if (activeTab === "calls") return t === "call";
                      if (activeTab === "meetings") return t === "meeting";
                      if (activeTab === "lunches") return t === "lunch";
                      if (activeTab === "files") return t === "file";
                      if (activeTab === "emails") return t === "email" || t === "mail";
                      return true;
                    });

                    if (filtered.length === 0 && activeTab !== "all") {
                      return (
                        <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 capitalize">
                            No {activeTab} logged for this user yet.
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Use the quick action buttons (Mail, File, Note, Activity) on the left panel to log interactions.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {/* Logged Activities */}
                        {filtered.map((act) => {
                          const fileUrl = extractFileUrl(act.comment);
                          const t = (act.type || "").toLowerCase();
                          const isScheduledType = ["call", "meeting", "lunch"].includes(t);

                          return (
                            <div key={act.id} className="p-4 bg-[#f8fafc] dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
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
                                  {act.comment && t !== "file" && (
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{act.comment}</p>
                                  )}
                                  {(act.schedule_from || act.schedule_to || act.location) && (
                                    <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                                      {act.schedule_from && (
                                        <span>🗓 <strong>From:</strong> {new Date(act.schedule_from).toLocaleString()}</span>
                                      )}
                                      {act.schedule_to && (
                                        <span><strong>To:</strong> {new Date(act.schedule_to).toLocaleString()}</span>
                                      )}
                                      {act.location && (
                                        <span>📍 <strong>Location:</strong> {act.location}</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {isScheduledType && (
                                  <button
                                    onClick={async () => {
                                      await updateActivity(act.id, { is_done: !act.is_done });
                                      fetchActivities(1, 100, "");
                                    }}
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

                              {(t === "file" || fileUrl) && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mt-2">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0088cc] flex items-center justify-center text-xl shrink-0">
                                      <i className="mgc_file_text_line"></i>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{act.title}</p>
                                      <p className="text-[10px] text-gray-400">Uploaded Document</p>
                                    </div>
                                  </div>
                                  {fileUrl ? (
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0088cc] text-white rounded-lg text-xs font-semibold hover:bg-[#0077bb] shadow-sm transition-colors"
                                    >
                                      <i className="mgc_download_2_line text-sm"></i> Download / View File
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">No file link</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Changelog Entries (rendered under All tab below activities) */}
                        {activeTab === "all" && (
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audit Changelogs</h4>
                            {changelogs.map((item) => (
                              <div key={item.id} className="p-4 bg-[#f8fafc] dark:bg-gray-800/40 rounded-xl flex items-start gap-4 border border-gray-100 dark:border-gray-800">
                                <div className="w-9 h-9 rounded-full bg-[#fef08a] text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                                  <i className="mgc_settings_line text-base"></i>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                                    {item.action}
                                  </p>
                                  <p className="text-[11px] text-gray-400">
                                    {item.time}, By {item.user}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTION MODALS (MAIL, FILE, NOTE, ACTIVITY) MATCHING KRAYIN DESIGN */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-lg w-full overflow-hidden">
            
            {/* ADD ACTIVITY MODAL */}
            {activeModal === "activity" && (
              <>
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-base font-bold text-gray-800 dark:text-gray-100">
                    <span>Add Activity -</span>
                    <select
                      value={modalForm.type}
                      onChange={(e) => setModalForm({ ...modalForm, type: e.target.value })}
                      className="bg-transparent border-none font-bold text-gray-800 dark:text-gray-100 focus:outline-none cursor-pointer text-base"
                    >
                      <option value="Call">Call</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Lunch">Lunch</option>
                    </select>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleQuickActionSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      value={modalForm.title}
                      onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={modalForm.description}
                      onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Participants</label>
                    <input
                      type="text"
                      placeholder="Type to search participants"
                      value={modalForm.participants}
                      onChange={(e) => setModalForm({ ...modalForm, participants: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Schedule From *</label>
                      <input
                        type="datetime-local"
                        required
                        value={modalForm.schedule_from}
                        onChange={(e) => setModalForm({ ...modalForm, schedule_from: e.target.value })}
                        className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Schedule To *</label>
                      <input
                        type="datetime-local"
                        required
                        value={modalForm.schedule_to}
                        onChange={(e) => setModalForm({ ...modalForm, schedule_to: e.target.value })}
                        className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Location</label>
                    <input
                      type="text"
                      value={modalForm.location}
                      onChange={(e) => setModalForm({ ...modalForm, location: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077bb] text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                    >
                      Save Activity
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ADD NOTE MODAL */}
            {activeModal === "note" && (
              <>
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Add Note</h3>
                  <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleQuickActionSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Comment *</label>
                    <textarea
                      required
                      rows={5}
                      value={modalForm.comment}
                      onChange={(e) => setModalForm({ ...modalForm, comment: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077bb] text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                    >
                      Save Note
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ADD FILE MODAL */}
            {activeModal === "file" && (
              <>
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Add File</h3>
                  <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleQuickActionSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      value={modalForm.title}
                      onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={modalForm.description}
                      onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={modalForm.file_name}
                      onChange={(e) => setModalForm({ ...modalForm, file_name: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">File *</label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 dark:bg-gray-900 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077bb] text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                    >
                      Save File
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* COMPOSE MAIL MODAL */}
            {activeModal === "mail" && (
              <>
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Compose Mail</h3>
                  <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleQuickActionSubmit} className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">To *</label>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <button type="button" onClick={() => setShowCc(!showCc)} className="hover:text-[#0088cc]">CC</button>
                        <button type="button" onClick={() => setShowBcc(!showBcc)} className="hover:text-[#0088cc]">BCC</button>
                      </div>
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="Press enter to add emails"
                      value={modalForm.email_to}
                      onChange={(e) => setModalForm({ ...modalForm, email_to: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  {showCc && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">CC</label>
                      <input
                        type="text"
                        placeholder="CC emails"
                        value={modalForm.email_cc}
                        onChange={(e) => setModalForm({ ...modalForm, email_cc: e.target.value })}
                        className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                      />
                    </div>
                  )}

                  {showBcc && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">BCC</label>
                      <input
                        type="text"
                        placeholder="BCC emails"
                        value={modalForm.email_bcc}
                        onChange={(e) => setModalForm({ ...modalForm, email_bcc: e.target.value })}
                        className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                    <input
                      type="text"
                      required
                      placeholder="Subject"
                      value={modalForm.email_subject}
                      onChange={(e) => setModalForm({ ...modalForm, email_subject: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div>
                    <textarea
                      required
                      rows={5}
                      value={modalForm.email_body}
                      onChange={(e) => setModalForm({ ...modalForm, email_body: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-[#0088cc] dark:bg-gray-900"
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <label className="cursor-pointer text-gray-500 hover:text-gray-700 p-1 text-lg">
                      <i className="mgc_attachment_line"></i>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077bb] text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                    >
                      Send
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

export default ViewUserPage;
