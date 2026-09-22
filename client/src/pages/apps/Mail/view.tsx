import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMailStore } from "@/store/mailStore";
import { useLeadStore } from "@/store";
import {
  EmailItem,
  sendEmail,
  linkEmailEntities,
  deleteEmail,
  toggleReadStatus,
} from "@/services/mailService";
import API from "@/config";

const MailViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchEmailDetails, counts, fetchCounts } = useMailStore();
  const { leads, fetchLeads } = useLeadStore();

  const [email, setEmail] = useState<EmailItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [persons, setPersons] = useState<any[]>([]);

  // Action Composer Mode
  const [composerMode, setComposerMode] = useState<"reply" | "reply-all" | "forward" | null>(null);
  const [replyTo, setReplyTo] = useState<string[]>([]);
  const [ccList, setCcList] = useState<string[]>([]);
  const [bccList, setBccList] = useState<string[]>([]);
  const [showCc, setShowCc] = useState<boolean>(false);
  const [showBcc, setShowBcc] = useState<boolean>(false);
  const [toInput, setToInput] = useState<string>("");
  const [ccInput, setCcInput] = useState<string>("");
  const [bccInput, setBccInput] = useState<string>("");
  const [replyBody, setReplyBody] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // CRM Link Picker State
  const [linkingPersonId, setLinkingPersonId] = useState<string>("");
  const [linkingLeadId, setLinkingLeadId] = useState<string>("");
  const [isLinking, setIsLinking] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadEmail(Number(id));
    }
    if (leads.length === 0) {
      fetchLeads(1, 100);
    }
    fetchPersonsList();
  }, [id]);

  const loadEmail = async (emailId: number) => {
    setLoading(true);
    const data = await fetchEmailDetails(emailId);
    if (data) {
      setEmail(data);
    }
    setLoading(false);
  };

  const fetchPersonsList = async () => {
    try {
      const res = await API.get("/persons");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setPersons(res.data.data);
      }
    } catch (e) {}
  };

  const handleOpenComposer = (mode: "reply" | "reply-all" | "forward") => {
    if (!email) return;
    setComposerMode(mode);
    setComposerError(null);
    setAttachments([]);

    const fromAddr = email.from_email?.email || email.sender?.email || "";

    if (mode === "reply") {
      setReplyTo(fromAddr ? [fromAddr] : []);
      setCcList([]);
      setBccList([]);
      setShowCc(false);
      setShowBcc(false);
      setReplyBody("");
    } else if (mode === "reply-all") {
      const allRecipients = Array.from(
        new Set([...(fromAddr ? [fromAddr] : []), ...(email.reply_to || [])])
      );
      setReplyTo(allRecipients);
      setCcList(email.cc || []);
      setBccList([]);
      if (email.cc && email.cc.length > 0) setShowCc(true);
      setShowBcc(false);
      setReplyBody("");
    } else if (mode === "forward") {
      setReplyTo([]);
      setCcList([]);
      setBccList([]);
      setShowCc(false);
      setShowBcc(false);
      setReplyBody(
        `\n\n---------- Forwarded message ---------\nFrom: ${
          email.sender?.name || email.from_email?.name || "Sender"
        } <${fromAddr}>\nDate: ${new Date(email.created_at).toLocaleString()}\nSubject: ${
          email.subject
        }\nTo: ${(email.reply_to || []).join(", ")}\n\n${email.reply || ""}`
      );
    }
  };

  const handleAddEmail = (type: "to" | "cc" | "bcc", value: string) => {
    const addresses = value
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"));

    if (type === "to") {
      setReplyTo((prev) => Array.from(new Set([...prev, ...addresses])));
      setToInput("");
    } else if (type === "cc") {
      setCcList((prev) => Array.from(new Set([...prev, ...addresses])));
      setCcInput("");
    } else {
      setBccList((prev) => Array.from(new Set([...prev, ...addresses])));
      setBccInput("");
    }
  };

  const handleRemoveEmail = (type: "to" | "cc" | "bcc", addr: string) => {
    if (type === "to") setReplyTo((prev) => prev.filter((e) => e !== addr));
    else if (type === "cc") setCcList((prev) => prev.filter((e) => e !== addr));
    else setBccList((prev) => prev.filter((e) => e !== addr));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSendReply = async () => {
    if (!email) return;

    let finalTo = [...replyTo];
    if (toInput.trim() && toInput.includes("@")) {
      finalTo.push(toInput.trim());
    }

    if (finalTo.length === 0) {
      setComposerError("Please specify at least one recipient address.");
      return;
    }

    if (!replyBody.trim()) {
      setComposerError("Please enter a reply message.");
      return;
    }

    setSending(true);
    setComposerError(null);

    try {
      const formData = new FormData();
      const prefix = composerMode === "forward" ? "Fwd: " : "Re: ";
      const cleanSubject = email.subject?.startsWith("Re: ") || email.subject?.startsWith("Fwd: ")
        ? email.subject
        : `${prefix}${email.subject || ""}`;

      formData.append("subject", cleanSubject);
      formData.append("reply", replyBody);
      formData.append("is_draft", "0");
      formData.append("reply_to", JSON.stringify(finalTo));
      if (ccList.length > 0) formData.append("cc", JSON.stringify(ccList));
      if (bccList.length > 0) formData.append("bcc", JSON.stringify(bccList));
      if (email.lead_id) formData.append("lead_id", String(email.lead_id));
      if (email.person_id) formData.append("person_id", String(email.person_id));
      formData.append("parent_id", String(email.parent_id || email.id));

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      await sendEmail(formData);
      setComposerMode(null);
      setReplyBody("");
      setAttachments([]);
      await loadEmail(email.id);
      fetchCounts();
    } catch (err: any) {
      setComposerError(err.response?.data?.message || "Failed to send email reply.");
    } finally {
      setSending(false);
    }
  };

  const handleLinkPerson = async (newPersonId: number | null) => {
    if (!email) return;
    setIsLinking(true);
    try {
      await linkEmailEntities(email.id, { person_id: newPersonId });
      await loadEmail(email.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLinking(false);
      setLinkingPersonId("");
    }
  };

  const handleLinkLead = async (newLeadId: number | null) => {
    if (!email) return;
    setIsLinking(true);
    try {
      await linkEmailEntities(email.id, { lead_id: newLeadId });
      await loadEmail(email.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLinking(false);
      setLinkingLeadId("");
    }
  };

  const handleDeleteEmail = async () => {
    if (!email) return;
    if (confirm("Are you sure you want to move this email to Trash?")) {
      await deleteEmail(email.id, "trash");
      fetchCounts();
      navigate("/mail");
    }
  };

  const handleToggleRead = async () => {
    if (!email) return;
    await toggleReadStatus(email.id, !email.is_read);
    setEmail({ ...email, is_read: !email.is_read });
    fetchCounts();
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    if (bytes < k * 1024) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3 text-gray-400">
        <i className="mgc_loading_2_line animate-spin text-3xl text-[#0088cc]"></i>
        <p className="text-sm">Loading conversation thread...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="p-16 text-center space-y-4">
        <div className="text-4xl text-gray-400">
          <i className="mgc_close_circle_line"></i>
        </div>
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200">Email Not Found</h2>
        <p className="text-xs text-gray-500">The requested email thread could not be found.</p>
        <Link
          to="/mail"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0088cc] text-white text-xs font-semibold rounded-lg"
        >
          <i className="mgc_arrow_left_line"></i> Back to Mail
        </Link>
      </div>
    );
  }

  const senderName =
    email.name ||
    email.sender?.name ||
    email.from_email?.name ||
    email.sender?.email ||
    "Sender";
  const senderEmail = email.sender?.email || email.from_email?.email || "";

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Link
            to="/mail"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Back to Mailbox"
          >
            <i className="mgc_arrow_left_line text-xl"></i>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 line-clamp-1">
                {email.subject || "(No Subject)"}
              </h1>
              {Array.isArray(email.folders) && email.folders.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-[#0088cc] dark:bg-blue-900/40 dark:text-blue-300">
                  {email.folders[0]}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Conversation with {senderName}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleRead}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
            title="Toggle Read Status"
          >
            <i className={email.is_read ? "mgc_mail_line" : "mgc_mail_open_line"}></i>
            <span>{email.is_read ? "Mark Unread" : "Mark Read"}</span>
          </button>

          <button
            onClick={handleDeleteEmail}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
            title="Move to Trash"
          >
            <i className="mgc_delete_2_line"></i>
            <span>Trash</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Thread Conversation + CRM Context Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Conversation Thread (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* 1. Root Email Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs p-6 space-y-5">
            {/* Header / Sender details */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#0088cc]/10 text-[#0088cc] dark:bg-[#0088cc]/20 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                  {senderName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {senderName}
                    </span>
                    {senderEmail && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        &lt;{senderEmail}&gt;
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-x-1">
                    <span>To:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {Array.isArray(email.reply_to) ? email.reply_to.join(", ") : "Me"}
                    </span>
                    {email.cc && email.cc.length > 0 && (
                      <>
                        <span className="text-gray-400">| Cc:</span>
                        <span>{email.cc.join(", ")}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(email.created_at).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>

            {/* Email Message Content Body */}
            <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap min-h-[100px]">
              {email.reply}
            </div>

            {/* Email Attachments */}
            {email.attachments && email.attachments.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="mgc_attachment_line text-sm"></i>
                  <span>Attachments ({email.attachments.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {email.attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50/40 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <i className="mgc_file_line text-xl text-[#0088cc] flex-shrink-0"></i>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>

                      <a
                        href={`http://localhost:3040/api/mail/attachments/${file.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-gray-400 group-hover:text-[#0088cc] hover:bg-blue-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                        title="Download Attachment"
                      >
                        <i className="mgc_download_line text-base"></i>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center gap-3">
              <button
                onClick={() => handleOpenComposer("reply")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-[#0088cc] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <i className="mgc_back_line text-sm"></i> Reply
              </button>

              <button
                onClick={() => handleOpenComposer("reply-all")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-[#0088cc] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <i className="mgc_reply_line text-sm"></i> Reply All
              </button>

              <button
                onClick={() => handleOpenComposer("forward")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-[#0088cc] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <i className="mgc_forward_line text-sm"></i> Forward
              </button>
            </div>
          </div>

          {/* 2. Conversation Child Replies List */}
          {email.emails && email.emails.length > 0 && (
            <div className="space-y-4 pl-4 border-l-2 border-[#0088cc]/30">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
                Conversation Thread ({email.emails.length}{" "}
                {email.emails.length === 1 ? "reply" : "replies"})
              </div>

              {email.emails.map((replyItem, idx) => {
                const repSenderName =
                  replyItem.name ||
                  replyItem.sender?.name ||
                  replyItem.from_email?.name ||
                  "Sender";
                const repSenderEmail =
                  replyItem.sender?.email || replyItem.from_email?.email || "";

                return (
                  <div
                    key={replyItem.id || idx}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0088cc] flex items-center justify-center font-bold text-xs">
                          {repSenderName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-gray-900 dark:text-white">
                              {repSenderName}
                            </span>
                            {repSenderEmail && (
                              <span className="text-[11px] text-gray-400">
                                &lt;{repSenderEmail}&gt;
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            To:{" "}
                            {Array.isArray(replyItem.reply_to)
                              ? replyItem.reply_to.join(", ")
                              : "Recipient"}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] text-gray-400">
                        {new Date(replyItem.created_at).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {replyItem.reply}
                    </div>

                    {/* Reply Attachments */}
                    {replyItem.attachments && replyItem.attachments.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {replyItem.attachments.map((file) => (
                          <a
                            key={file.id}
                            href={`http://localhost:3040/api/mail/attachments/${file.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs text-gray-700 dark:text-gray-200 hover:text-[#0088cc]"
                          >
                            <i className="mgc_attachment_line"></i>
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <span className="text-[10px] text-gray-400">
                              ({formatFileSize(file.size)})
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Inline Action / Reply Composer */}
          {composerMode ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-[#0088cc]/40 shadow-lg p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-blue-100 text-[#0088cc] dark:bg-blue-900/50 dark:text-blue-300">
                    {composerMode.replace("-", " ")}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {email.subject}
                  </span>
                </div>
                <button
                  onClick={() => setComposerMode(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                >
                  <i className="mgc_close_line text-lg"></i>
                </button>
              </div>

              {composerError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                  <i className="mgc_alert_line"></i>
                  <span>{composerError}</span>
                </div>
              )}

              {/* Recipients Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-gray-700 dark:text-gray-300">To *</label>
                  <div className="flex items-center gap-2">
                    {!showCc && (
                      <button
                        type="button"
                        onClick={() => setShowCc(true)}
                        className="text-[#0088cc] hover:underline"
                      >
                        + Cc
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        type="button"
                        onClick={() => setShowBcc(true)}
                        className="text-[#0088cc] hover:underline"
                      >
                        + Bcc
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 min-h-[38px]">
                  {replyTo.map((addr) => (
                    <span
                      key={addr}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-[#0088cc] dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium"
                    >
                      {addr}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail("to", addr)}
                        className="hover:text-red-500"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "," || e.key === " ") {
                        e.preventDefault();
                        handleAddEmail("to", toInput);
                      }
                    }}
                    onBlur={() => handleAddEmail("to", toInput)}
                    placeholder={replyTo.length === 0 ? "recipient@example.com" : "Add..."}
                    className="flex-1 min-w-[120px] text-xs bg-transparent border-none outline-hidden focus:ring-0 text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              {/* CC Input */}
              {showCc && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">Cc</label>
                    <button
                      type="button"
                      onClick={() => setShowCc(false)}
                      className="text-gray-400 hover:text-gray-600 text-[11px]"
                    >
                      Remove Cc
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 min-h-[36px]">
                    {ccList.map((addr) => (
                      <span
                        key={addr}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs"
                      >
                        {addr}
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail("cc", addr)}
                          className="hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "," || e.key === " ") {
                          e.preventDefault();
                          handleAddEmail("cc", ccInput);
                        }
                      }}
                      onBlur={() => handleAddEmail("cc", ccInput)}
                      placeholder="cc@example.com"
                      className="flex-1 min-w-[120px] text-xs bg-transparent border-none outline-hidden focus:ring-0"
                    />
                  </div>
                </div>
              )}

              {/* Message Box */}
              <div>
                <textarea
                  rows={6}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your reply message here..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                />
              </div>

              {/* Attachment Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-xs text-[#0088cc] hover:underline"
                  >
                    <i className="mgc_attachment_line"></i> Add Attachments
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs"
                      >
                        <i className="mgc_file_line text-gray-400"></i>
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-red-500 font-bold ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Composer Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setComposerMode(null)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg"
                >
                  Discard
                </button>

                <button
                  type="button"
                  disabled={sending}
                  onClick={handleSendReply}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b5] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <i className="mgc_loading_2_line animate-spin"></i> Sending...
                    </>
                  ) : (
                    <>
                      <i className="mgc_send_line"></i> Send Reply
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                <i className="mgc_edit_line"></i>
              </div>
              <p className="text-xs text-gray-500 flex-1">
                Click to reply or forward this conversation...
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenComposer("reply")}
                  className="px-3 py-1.5 text-xs font-semibold text-[#0088cc] bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Reply
                </button>
                <button
                  onClick={() => handleOpenComposer("forward")}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Forward
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: CRM Context Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Contact Person Context Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <i className="mgc_user_3_line text-base text-[#0088cc]"></i>
                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  Contact Person
                </h3>
              </div>

              {email.person_id && (
                <button
                  onClick={() => handleLinkPerson(null)}
                  disabled={isLinking}
                  title="Unlink Contact"
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  <i className="mgc_unlink_line text-sm"></i>
                </button>
              )}
            </div>

            {email.person_id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
                    {(email.person_name || "P").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {email.person_name}
                    </h4>
                    <p className="text-xs text-gray-500">Contact #ID {email.person_id}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Link
                    to={`/contacts/persons/${email.person_id}/edit`}
                    className="inline-flex items-center gap-1.5 text-xs text-[#0088cc] hover:underline font-medium"
                  >
                    <span>View Contact Profile</span>
                    <i className="mgc_right_line text-sm"></i>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No contact person currently linked to this email thread.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                    Link Existing Contact
                  </label>
                  <select
                    value={linkingPersonId}
                    onChange={(e) => {
                      setLinkingPersonId(e.target.value);
                      if (e.target.value) handleLinkPerson(Number(e.target.value));
                    }}
                    disabled={isLinking}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="">-- Select Contact --</option>
                    {persons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.email ? `(${p.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 2. Lead Context Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <i className="mgc_flag_3_line text-base text-amber-600"></i>
                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  Linked CRM Lead
                </h3>
              </div>

              {email.lead_id && (
                <button
                  onClick={() => handleLinkLead(null)}
                  disabled={isLinking}
                  title="Unlink Lead"
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  <i className="mgc_unlink_line text-sm"></i>
                </button>
              )}
            </div>

            {email.lead_id ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {email.lead_title || `Lead #${email.lead_id}`}
                  </h4>
                  <p className="text-xs text-gray-500">Lead ID #{email.lead_id}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Link
                    to={`/leads/view/${email.lead_id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-[#0088cc] hover:underline font-medium"
                  >
                    <span>Open Lead View</span>
                    <i className="mgc_right_line text-sm"></i>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No CRM lead currently associated with this mail thread.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                    Link to CRM Lead
                  </label>
                  <select
                    value={linkingLeadId}
                    onChange={(e) => {
                      setLinkingLeadId(e.target.value);
                      if (e.target.value) handleLinkLead(Number(e.target.value));
                    }}
                    disabled={isLinking}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="">-- Select Lead --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        #{l.id} - {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailViewPage;
