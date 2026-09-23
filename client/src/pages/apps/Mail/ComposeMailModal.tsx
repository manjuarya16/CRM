import React, { useState, useEffect, useRef } from "react";
import { sendEmail, updateDraft } from "@/services/mailService";
import { useLeadStore } from "@/store";
import API from "@/config";

interface ComposeMailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message?: string) => void;
  initialData?: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    reply?: string;
    lead_id?: number | null;
    person_id?: number | null;
    parent_id?: number | null;
    draftId?: number | null;
  };
}

export const ComposeMailModal: React.FC<ComposeMailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { leads, fetchLeads } = useLeadStore();
  const [persons, setPersons] = useState<{ id: number; name: string; email?: string }[]>([]);

  const [toInput, setToInput] = useState<string>("");
  const [toList, setToList] = useState<string[]>([]);
  const [showCc, setShowCc] = useState<boolean>(false);
  const [showBcc, setShowBcc] = useState<boolean>(false);
  const [ccInput, setCcInput] = useState<string>("");
  const [ccList, setCcList] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState<string>("");
  const [bccList, setBccList] = useState<string[]>([]);

  const [subject, setSubject] = useState<string>("");
  const [reply, setReply] = useState<string>("");
  const [leadId, setLeadId] = useState<number | string>("");
  const [personId, setPersonId] = useState<number | string>("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const [sending, setSending] = useState<boolean>(false);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (leads.length === 0) fetchLeads(1, 100);
      fetchPersons();

      if (initialData) {
        setToList(initialData.to || []);
        setCcList(initialData.cc || []);
        setBccList(initialData.bcc || []);
        if (initialData.cc && initialData.cc.length > 0) setShowCc(true);
        if (initialData.bcc && initialData.bcc.length > 0) setShowBcc(true);
        setSubject(initialData.subject || "");
        setReply(initialData.reply || "");
        setLeadId(initialData.lead_id || "");
        setPersonId(initialData.person_id || "");
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const fetchPersons = async () => {
    try {
      const res = await API.get("/persons");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setPersons(res.data.data);
      }
    } catch (e) {}
  };

  const resetForm = () => {
    setToList([]);
    setToInput("");
    setCcList([]);
    setCcInput("");
    setBccList([]);
    setBccInput("");
    setShowCc(false);
    setShowBcc(false);
    setSubject("");
    setReply("");
    setLeadId("");
    setPersonId("");
    setAttachments([]);
    setErrorMsg(null);
  };

  const handleAddEmail = (
    type: "to" | "cc" | "bcc",
    value: string
  ) => {
    const emails = value
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"));

    if (type === "to") {
      setToList((prev) => Array.from(new Set([...prev, ...emails])));
      setToInput("");
    } else if (type === "cc") {
      setCcList((prev) => Array.from(new Set([...prev, ...emails])));
      setCcInput("");
    } else {
      setBccList((prev) => Array.from(new Set([...prev, ...emails])));
      setBccInput("");
    }
  };

  const handleRemoveEmail = (type: "to" | "cc" | "bcc", emailToRemove: string) => {
    if (type === "to") setToList((prev) => prev.filter((e) => e !== emailToRemove));
    else if (type === "cc") setCcList((prev) => prev.filter((e) => e !== emailToRemove));
    else setBccList((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (isDraft: boolean) => {
    // Collect any remaining text in the To field
    let finalTo = [...toList];
    if (toInput.trim() && toInput.includes("@")) {
      finalTo.push(toInput.trim());
    }

    if (!isDraft && finalTo.length === 0) {
      setErrorMsg("Please specify at least one recipient email address.");
      return;
    }

    if (!reply.trim()) {
      setErrorMsg("Please enter a message body.");
      return;
    }

    setErrorMsg(null);
    if (isDraft) setSavingDraft(true);
    else setSending(true);

    try {
      const formData = new FormData();
      formData.append("subject", subject || "(No Subject)");
      formData.append("reply", reply);
      formData.append("is_draft", isDraft ? "1" : "0");
      formData.append("reply_to", JSON.stringify(finalTo));
      if (ccList.length > 0) formData.append("cc", JSON.stringify(ccList));
      if (bccList.length > 0) formData.append("bcc", JSON.stringify(bccList));
      if (leadId) formData.append("lead_id", String(leadId));
      if (personId) formData.append("person_id", String(personId));
      if (initialData?.parent_id) formData.append("parent_id", String(initialData.parent_id));

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      let res: any;
      if (initialData?.draftId) {
        res = await updateDraft(initialData.draftId, formData);
      } else {
        res = await sendEmail(formData);
      }

      resetForm();
      onClose();
      const successText = res?.message || (isDraft ? "Draft saved successfully!" : "Email sent successfully!");
      if (onSuccess) onSuccess(successText);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to process email.");
    } finally {
      setSending(false);
      setSavingDraft(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <i className="mgc_mail_send_line text-xl text-[#0088cc]"></i>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
              {initialData?.draftId ? "Edit Draft" : initialData?.parent_id ? "Reply to Thread" : "Compose Mail"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <i className="mgc_close_line text-lg"></i>
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <i className="mgc_alert_line text-base flex-shrink-0"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* TO Recipients */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">To *</label>
              <div className="flex items-center gap-2 text-xs">
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

            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 min-h-[42px]">
              {toList.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-[#0088cc] dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail("to", email)}
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
                placeholder={toList.length === 0 ? "recipient@example.com (press Enter)" : "Add more..."}
                className="flex-1 min-w-[140px] text-xs bg-transparent border-none outline-hidden focus:ring-0 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cc</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowCc(false);
                    setCcList([]);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Remove Cc
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 min-h-[40px]">
                {ccList.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs"
                  >
                    {email}
                    <button type="button" onClick={() => handleRemoveEmail("cc", email)} className="hover:text-red-500">&times;</button>
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
                  className="flex-1 min-w-[140px] text-xs bg-transparent border-none outline-hidden focus:ring-0 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Bcc</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowBcc(false);
                    setBccList([]);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Remove Bcc
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 min-h-[40px]">
                {bccList.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs"
                  >
                    {email}
                    <button type="button" onClick={() => handleRemoveEmail("bcc", email)} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "," || e.key === " ") {
                      e.preventDefault();
                      handleAddEmail("bcc", bccInput);
                    }
                  }}
                  onBlur={() => handleAddEmail("bcc", bccInput)}
                  placeholder="bcc@example.com"
                  className="flex-1 min-w-[140px] text-xs bg-transparent border-none outline-hidden focus:ring-0 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Project Proposal & Quotation"
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
            />
          </div>

          {/* CRM Linking (Lead & Person) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Link to Lead</label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                <option value="">-- None --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    #{l.id} - {l.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Link to Contact Person</label>
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                <option value="">-- None --</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.email ? `(${p.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Message Body *</label>
            <textarea
              rows={7}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write your email message here..."
              className="w-full px-3.5 py-3 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] leading-relaxed"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Attachments</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs text-[#0088cc] hover:underline"
              >
                <i className="mgc_attachment_line"></i> Add Files
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
                  >
                    <i className="mgc_file_line text-gray-400"></i>
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <span className="text-[10px] text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-red-500 hover:text-red-700 font-bold ml-1"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={sending || savingDraft}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              {savingDraft ? <i className="mgc_loading_2_line animate-spin mr-1"></i> : <i className="mgc_save_line mr-1"></i>}
              Save as Draft
            </button>

            <button
              type="button"
              disabled={sending || savingDraft}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b5] rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {sending ? (
                <>
                  <i className="mgc_loading_2_line animate-spin"></i> Sending...
                </>
              ) : (
                <>
                  <i className="mgc_send_line"></i> Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
