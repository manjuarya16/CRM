import React, { useState, useEffect, useRef } from "react";
import { useLeadStore, useMailStore } from "@/store";
import { ComposeMailModalProps, IEmailTemplate, PlaceholderItem, PlaceholderCategory } from "@/interface";
import API from "@/config";
import Swal from "sweetalert2";
import { SearchableLeadSelect } from "@/components/SearchableLeadSelect";

// Categorized Placeholders matching Krayin CRM exact specification
const PLACEHOLDER_CATEGORIES: PlaceholderCategory[] = [
  {
    name: "Leads",
    items: [
      { label: "Title", tag: "{%lead.title%}" },
      { label: "Value", tag: "{%lead.value%}" },
      { label: "Source", tag: "{%lead.source%}" },
      { label: "Type", tag: "{%lead.type%}" },
      { label: "Sales Owner", tag: "{%lead.user_name%}" },
      { label: "Expected Close Date", tag: "{%lead.expected_close_date%}" },
      { label: "Pipeline", tag: "{%lead.pipeline%}" },
      { label: "Stage", tag: "{%lead.stage%}" },
    ],
  },
  {
    name: "Activities",
    items: [
      { label: "Title", tag: "{%activity.title%}" },
      { label: "Type", tag: "{%activity.type%}" },
      { label: "Schedule From", tag: "{%activity.schedule_from%}" },
      { label: "Schedule To", tag: "{%activity.schedule_to%}" },
      { label: "Location", tag: "{%activity.location%}" },
      { label: "Comment", tag: "{%activity.comment%}" },
      { label: "Participants", tag: "{%activity.participants%}" },
    ],
  },
  {
    name: "Persons",
    items: [
      { label: "Name", tag: "{%person.name%}" },
      { label: "Email", tag: "{%person.email%}" },
      { label: "Contact Numbers", tag: "{%person.contact_numbers%}" },
      { label: "Organization", tag: "{%person.organization%}" },
    ],
  },
  {
    name: "Organizations",
    items: [
      { label: "Name", tag: "{%organization.name%}" },
      { label: "Address", tag: "{%organization.address%}" },
    ],
  },
  {
    name: "Quotes",
    items: [
      { label: "Subject", tag: "{%quote.subject%}" },
      { label: "Grand Total", tag: "{%quote.grand_total%}" },
      { label: "Expiration Date", tag: "{%quote.expired_at%}" },
      { label: "Sales Owner", tag: "{%quote.user_name%}" },
      { label: "Billing Address", tag: "{%quote.billing_address%}" },
      { label: "Shipping Address", tag: "{%quote.shipping_address%}" },
    ],
  },
  {
    name: "Users",
    items: [
      { label: "Name", tag: "{%user.name%}" },
      { label: "Email", tag: "{%user.email%}" },
    ],
  },
];

export const ComposeMailModal: React.FC<ComposeMailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { leads, fetchLeads } = useLeadStore();
  const { sendEmail, updateDraft } = useMailStore();
  const [persons, setPersons] = useState<{ id: number; name: string; email?: string }[]>([]);
  const [organizations, setOrganizations] = useState<{ id: number; name: string }[]>([]);
  const [templates, setTemplates] = useState<IEmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | string>("");
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

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
  const [organizationId, setOrganizationId] = useState<number | string>("");
  const [linkEntityType, setLinkEntityType] = useState<"person" | "organization">("person");
  const [attachments, setAttachments] = useState<File[]>([]);

  const [sending, setSending] = useState<boolean>(false);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editor states
  const [showPlaceholders, setShowPlaceholders] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string | null>("Users");
  const [showMoreTools, setShowMoreTools] = useState<boolean>(false);
  const [textColor, setTextColor] = useState<string>("#0088cc");
  const [bgColor, setBgColor] = useState<string>("#fef08a");
  const [showTextColorPicker, setShowTextColorPicker] = useState<boolean>(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // Primitive dependency key to prevent infinite re-render loops from inline object references
  const initialDataKey = isOpen && initialData
    ? `${initialData.lead_id || ""}-${initialData.person_id || ""}-${(initialData.to || []).join(",")}-${initialData.subject || ""}-${initialData.reply || ""}`
    : "";

  useEffect(() => {
    if (isOpen) {
      if (leads.length === 0) fetchLeads(1, 100);
      fetchPersons();
      fetchOrganizations();
      fetchTemplates();

      if (initialData) {
        setToList(initialData.to || []);
        setCcList(initialData.cc || []);
        setBccList(initialData.bcc || []);
        if (initialData.cc && initialData.cc.length > 0) setShowCc(true);
        if (initialData.bcc && initialData.bcc.length > 0) setShowBcc(true);
        setSubject(initialData.subject || "");
        const initContent = initialData.reply || "";
        setReply(initContent);
        if (editorRef.current) {
          editorRef.current.innerHTML = initContent;
        }
        setLeadId(initialData.lead_id || "");
        setPersonId(initialData.person_id || "");
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialDataKey]);

  // Keep editor content in sync when opening
  useEffect(() => {
    if (isOpen && editorRef.current) {
      if (editorRef.current.innerHTML !== reply) {
        editorRef.current.innerHTML = reply || "";
      }
    }
  }, [isOpen]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (placeholderRef.current && !placeholderRef.current.contains(e.target as Node)) {
        setShowPlaceholders(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await API.get("/email-templates");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setTemplates(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch email templates", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchPersons = async () => {
    try {
      const res = await API.get("/persons");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setPersons(res.data.data);
      }
    } catch (e) {}
  };

  const fetchOrganizations = async () => {
    try {
      const res = await API.get("/organizations");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setOrganizations(res.data.data);
      } else if (res.data?.success && Array.isArray(res.data?.rows)) {
        setOrganizations(res.data.rows);
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
    setSelectedTemplateId("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setLeadId("");
    setPersonId("");
    setOrganizationId("");
    setAttachments([]);
    setErrorMsg(null);
    setShowPlaceholders(false);
    setShowMoreTools(false);
  };

  const handleAddEmail = (type: "to" | "cc" | "bcc", value: string) => {
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

  const syncReplyFromEditor = () => {
    if (editorRef.current) {
      setReply(editorRef.current.innerHTML);
    }
  };

  // Convert template placeholders like {%lead.title%} into styled badges in the editor
  const formatContentWithBadges = (html: string) => {
    if (!html) return "";
    return html.replace(
      /(<span[^>]*contenteditable="false"[^>]*>.*?<\/span>)|(\{%\s*([a-zA-Z0-9_.]+)\s*%\})/gi,
      (match, alreadySpan, _fullTag, tagKey) => {
        if (alreadySpan) return alreadySpan;
        const tag = `{%${tagKey}%}`;
        return `<span style="background-color: #e0f2fe; color: #0088cc; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px; font-family: monospace; display: inline-block; margin: 0 2px;" contenteditable="false">${tag}</span>&nbsp;`;
      }
    );
  };

  const handleSelectTemplate = async (templateId: string | number) => {
    if (!templateId) {
      setSelectedTemplateId("");
      return;
    }

    const template = templates.find((t) => String(t.id) === String(templateId));
    if (!template) return;

    const currentContent = editorRef.current?.innerHTML?.trim() || "";
    const hasContent =
      (currentContent && currentContent !== "<br>" && currentContent !== "<p><br></p>") ||
      subject.trim().length > 0;

    if (hasContent) {
      const result = await Swal.fire({
        title: "Apply Template?",
        text: "Applying this template will replace your current subject and message body. Do you want to proceed?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#0088cc",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, apply template",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    setSelectedTemplateId(template.id);
    if (template.subject) {
      setSubject(template.subject);
    }
    const formatted = formatContentWithBadges(template.content || "");
    setReply(formatted);
    if (editorRef.current) {
      editorRef.current.innerHTML = formatted;
    }
  };

  // Insert tag into WYSIWYG editor
  const insertTag = (tag: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const tagBadge = `<span style="background-color: #e0f2fe; color: #0088cc; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px; font-family: monospace; display: inline-block; margin: 0 2px;" contenteditable="false">${tag}</span>&nbsp;`;
    document.execCommand("insertHTML", false, tagBadge);
    syncReplyFromEditor();
    setShowPlaceholders(false);
  };

  // Apply WYSIWYG formatting commands natively
  const applyFormat = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    switch (command) {
      case "bold":
        document.execCommand("bold", false);
        break;
      case "italic":
        document.execCommand("italic", false);
        break;
      case "strike":
        document.execCommand("strikeThrough", false);
        break;
      case "textColor":
        document.execCommand("foreColor", false, value || textColor);
        break;
      case "bgColor":
        document.execCommand("hiliteColor", false, value || bgColor);
        break;
      case "alignLeft":
        document.execCommand("justifyLeft", false);
        break;
      case "alignCenter":
        document.execCommand("justifyCenter", false);
        break;
      case "alignRight":
        document.execCommand("justifyRight", false);
        break;
      case "alignJustify":
        document.execCommand("justifyFull", false);
        break;
      case "ul":
        document.execCommand("insertUnorderedList", false);
        break;
      case "ol":
        document.execCommand("insertOrderedList", false);
        break;
      case "link": {
        const url = prompt("Enter URL:", "https://");
        if (url) document.execCommand("createLink", false, url);
        break;
      }
      case "image": {
        const url = prompt("Enter Image URL:", "https://via.placeholder.com/600x400");
        if (url) document.execCommand("insertImage", false, url);
        break;
      }
      case "hr":
        document.execCommand("insertHorizontalRule", false);
        break;
      case "code": {
        const selected = window.getSelection()?.toString() || "code";
        document.execCommand(
          "insertHTML",
          false,
          `<code style="background:#f3f4f6;padding:2px 5px;border-radius:4px;font-family:monospace;font-size:11px;">${selected}</code>`
        );
        break;
      }
      case "table": {
        document.execCommand(
          "insertHTML",
          false,
          `<table style="border-collapse:collapse;width:100%;margin:10px 0;border:1px solid #e5e7eb;"><thead><tr style="background:#f9fafb;"><th style="border:1px solid #e5e7eb;padding:6px;">Header 1</th><th style="border:1px solid #e5e7eb;padding:6px;">Header 2</th></tr></thead><tbody><tr><td style="border:1px solid #e5e7eb;padding:6px;">Cell 1</td><td style="border:1px solid #e5e7eb;padding:6px;">Cell 2</td></tr></tbody></table><p></p>`
        );
        break;
      }
      case "clear":
        document.execCommand("removeFormat", false);
        break;
      case "indent":
        document.execCommand("indent", false);
        break;
      case "outdent":
        document.execCommand("outdent", false);
        break;
      default:
        break;
    }
    syncReplyFromEditor();
  };

  const handleSubmit = async (isDraft: boolean) => {
    let finalTo = [...toList];
    if (toInput.trim() && toInput.includes("@")) {
      finalTo.push(toInput.trim());
    }

    const currentContent = editorRef.current?.innerHTML || reply;

    if (!isDraft && finalTo.length === 0) {
      setErrorMsg("Please specify at least one recipient email address.");
      return;
    }

    if (!currentContent.trim() || currentContent === "<br>") {
      setErrorMsg("Please enter a message body.");
      return;
    }

    setErrorMsg(null);
    if (isDraft) setSavingDraft(true);
    else setSending(true);

    try {
      const formData = new FormData();
      formData.append("subject", subject || "(No Subject)");
      formData.append("reply", currentContent);
      formData.append("is_draft", isDraft ? "1" : "0");
      formData.append("reply_to", JSON.stringify(finalTo));
      if (ccList.length > 0) formData.append("cc", JSON.stringify(ccList));
      if (bccList.length > 0) formData.append("bcc", JSON.stringify(bccList));
      if (leadId) formData.append("lead_id", String(leadId));
      if (personId) formData.append("person_id", String(personId));
      if (organizationId) formData.append("organization_id", String(organizationId));
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

  const availableCategories = PLACEHOLDER_CATEGORIES.filter((cat) => {
    if (cat.name === "Users") return true;
    if (["Leads", "Activities", "Quotes"].includes(cat.name)) {
      return Boolean(leadId);
    }
    if (cat.name === "Persons") {
      return Boolean(personId || leadId);
    }
    if (cat.name === "Organizations") {
      return Boolean(organizationId || personId || leadId);
    }
    return true;
  });

  const effectiveCategory = (activeCategory && availableCategories.some((c) => c.name === activeCategory))
    ? activeCategory
    : availableCategories[0]?.name || "Users";

  const currentCategoryObj = availableCategories.find((c) => c.name === effectiveCategory) || availableCategories[0];

  const getWordCount = () => {
    const text = editorRef.current?.innerText || "";
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden">
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
                  <button type="button" onClick={() => setShowCc(true)} className="text-[#0088cc] hover:underline">
                    + CC
                  </button>
                )}
                {!showBcc && (
                  <button type="button" onClick={() => setShowBcc(true)} className="text-[#0088cc] hover:underline">
                    + BCC
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
                  <button type="button" onClick={() => handleRemoveEmail("to", email)} className="hover:text-red-500">
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
                placeholder={toList.length === 0 ? "Press enter to add emails" : "Add more..."}
                className="flex-1 min-w-[140px] text-xs bg-transparent border-none outline-hidden focus:ring-0 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">CC</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowCc(false);
                    setCcList([]);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Remove CC
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 min-h-[40px]">
                {ccList.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs"
                  >
                    {email}
                    <button type="button" onClick={() => handleRemoveEmail("cc", email)} className="hover:text-red-500">
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
                  className="flex-1 min-w-[140px] text-xs bg-transparent border-none outline-hidden focus:ring-0 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">BCC</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowBcc(false);
                    setBccList([]);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Remove BCC
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 min-h-[40px]">
                {bccList.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs"
                  >
                    {email}
                    <button type="button" onClick={() => handleRemoveEmail("bcc", email)} className="hover:text-red-500">
                      &times;
                    </button>
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
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
            />
          </div>

          {/* CRM Linking (Lead & Person/Organization) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchableLeadSelect
              value={leadId}
              onChange={(val) => setLeadId(val)}
              leads={leads}
              label="Link to lead"
              placeholder="Click to add"
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Link {linkEntityType === "person" ? "Contact Person" : "Organization"}
                </label>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-md text-[10px]">
                  <button
                    type="button"
                    onClick={() => setLinkEntityType("person")}
                    className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                      linkEntityType === "person"
                        ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                    }`}
                  >
                    Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkEntityType("organization")}
                    className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                      linkEntityType === "organization"
                        ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                    }`}
                  >
                    Organization
                  </button>
                </div>
              </div>

              {linkEntityType === "person" ? (
                <select
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 min-h-[38px]"
                >
                  <option value="">-- Select Contact Person --</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.email ? `(${p.email})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 min-h-[38px]"
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Visual WYSIWYG Editor Container */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-gray-800">
            {/* Top Toolbar Container */}
            <div className="bg-gray-50 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600 p-2 space-y-2">
              {/* Row 1: Templates, Placeholders & Primary Tools */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Email Template Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                      <i className="mgc_file_text_line text-sm text-[#0088cc]"></i>
                      <span className="hidden sm:inline">Template:</span>
                    </span>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      disabled={loadingTemplates}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition cursor-pointer max-w-[190px] truncate"
                      title="Select Email Template"
                    >
                      <option value="">
                        {loadingTemplates ? "Loading templates..." : "-- Select Template --"}
                      </option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id} title={t.subject ? `Subject: ${t.subject}` : undefined}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-600 mx-0.5 hidden sm:block"></div>

                  <div className="flex items-center gap-1 relative" ref={placeholderRef}>
                    {/* Placeholders Menu Button */}
                    <button
                      type="button"
                      onClick={() => setShowPlaceholders((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                    >
                      <span>Placeholders</span>
                      <i className={`mgc_down_line text-xs transition-transform ${showPlaceholders ? "rotate-180" : ""}`}></i>
                    </button>

                    {/* Multi-level Placeholders Dropdown */}
                    {showPlaceholders && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl flex overflow-hidden min-w-[340px]">
                        {/* Left Column: Categories */}
                        <div className="w-36 bg-gray-50 dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 py-1">
                          {availableCategories.map((cat) => (
                            <button
                              key={cat.name}
                              type="button"
                              onMouseEnter={() => setActiveCategory(cat.name)}
                              onClick={() => setActiveCategory(cat.name)}
                              className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                                effectiveCategory === cat.name
                                  ? "bg-blue-50 dark:bg-blue-900/40 text-[#0088cc] font-semibold"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                              }`}
                            >
                              <span>{cat.name}</span>
                              <i className="mgc_right_line text-xs"></i>
                            </button>
                          ))}
                        </div>

                        {/* Right Column: Category Items */}
                        <div className="flex-1 py-1 max-h-64 overflow-y-auto">
                          {currentCategoryObj?.items.map((item) => (
                            <button
                              key={item.tag}
                              type="button"
                              onClick={() => insertTag(item.tag)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors block cursor-pointer"
                            >
                              <span className="font-medium text-gray-800 dark:text-gray-200 block">{item.label}</span>
                              <span className="text-[10px] text-[#0088cc] font-mono">{item.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Toggle More Tools Button */}
                    <button
                      type="button"
                      onClick={() => setShowMoreTools((v) => !v)}
                      className={`p-1.5 text-xs rounded-lg border transition cursor-pointer ${
                        showMoreTools
                          ? "bg-blue-50 text-[#0088cc] border-blue-200 dark:bg-blue-900/40 dark:border-blue-800"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
                      }`}
                      title="Toggle Formatting Toolbar"
                    >
                      <i className="mgc_more_3_line text-base"></i>
                    </button>
                  </div>
                </div>

                {/* Quick Toolbar */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyFormat("bold")}
                    className="p-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition cursor-pointer"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("italic")}
                    className="p-1.5 text-xs italic text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition cursor-pointer"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("ul")}
                    className="p-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition cursor-pointer"
                    title="Bullet List"
                  >
                    <i className="mgc_list_line"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("ol")}
                    className="p-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition cursor-pointer"
                    title="Numbered List"
                  >
                    <i className="mgc_list_ordered_line"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("link")}
                    className="p-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition cursor-pointer"
                    title="Insert Link"
                  >
                    <i className="mgc_link_line"></i>
                  </button>
                </div>
              </div>

              {/* Extended Formatting Toolbar Panel */}
              {showMoreTools && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600 grid grid-cols-1 gap-2 bg-white dark:bg-gray-800 p-2.5 rounded-lg">
                  {/* Formatting Controls Grid */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {/* Bold / Italic / Strike */}
                    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-900">
                      <button type="button" onClick={() => applyFormat("bold")} className="p-1.5 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 w-7 text-center cursor-pointer">B</button>
                      <button type="button" onClick={() => applyFormat("italic")} className="p-1.5 italic hover:bg-gray-200 dark:hover:bg-gray-700 w-7 text-center cursor-pointer">I</button>
                      <button type="button" onClick={() => applyFormat("strike")} className="p-1.5 line-through hover:bg-gray-200 dark:hover:bg-gray-700 w-7 text-center cursor-pointer">S</button>
                    </div>

                    {/* Text Color Picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setShowTextColorPicker((v) => !v); setShowBgColorPicker(false); }}
                        className="p-1.5 flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        title="Text Color"
                      >
                        <span className="font-bold underline" style={{ color: textColor }}>A</span>
                        <i className="mgc_down_line text-[10px]"></i>
                      </button>
                      {showTextColorPicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg flex gap-1">
                          {["#0088cc", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#111827"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => { setTextColor(c); applyFormat("textColor", c); setShowTextColorPicker(false); }}
                              className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer"
                              style={{ backgroundColor: c }}
                            ></button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Background Highlight Color Picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setShowBgColorPicker((v) => !v); setShowTextColorPicker(false); }}
                        className="p-1.5 flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        title="Background Highlight"
                      >
                        <i className="mgc_pencil_line" style={{ color: bgColor }}></i>
                        <i className="mgc_down_line text-[10px]"></i>
                      </button>
                      {showBgColorPicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg flex gap-1">
                          {["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#e5e7eb"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => { setBgColor(c); applyFormat("bgColor", c); setShowBgColorPicker(false); }}
                              className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer"
                              style={{ backgroundColor: c }}
                            ></button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Image / Link */}
                    <button type="button" onClick={() => applyFormat("image")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" title="Insert Image">
                      <i className="mgc_pic_line"></i>
                    </button>
                    <button type="button" onClick={() => applyFormat("link")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" title="Insert Link">
                      <i className="mgc_link_line"></i>
                    </button>

                    {/* Alignments */}
                    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-900">
                      <button type="button" onClick={() => applyFormat("alignLeft")} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer" title="Align Left"><i className="mgc_align_left_line"></i></button>
                      <button type="button" onClick={() => applyFormat("alignCenter")} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer" title="Align Center"><i className="mgc_align_center_line"></i></button>
                      <button type="button" onClick={() => applyFormat("alignRight")} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer" title="Align Right"><i className="mgc_align_right_line"></i></button>
                      <button type="button" onClick={() => applyFormat("alignJustify")} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer" title="Align Justify"><i className="mgc_align_justify_line"></i></button>
                    </div>

                    {/* Horizontal Rule & Lists */}
                    <button type="button" onClick={() => applyFormat("hr")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" title="Horizontal Line">
                      <i className="mgc_minimize_line"></i>
                    </button>
                    <button type="button" onClick={() => applyFormat("ul")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" title="Bullet List">
                      <i className="mgc_list_line"></i>
                    </button>
                    <button type="button" onClick={() => applyFormat("ol")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" title="Numbered List">
                      <i className="mgc_list_ordered_line"></i>
                    </button>

                    {/* Indents & Code & Table */}
                    <button type="button" onClick={() => applyFormat("outdent")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" title="Outdent">
                      <i className="mgc_indent_decrease_line"></i>
                    </button>
                    <button type="button" onClick={() => applyFormat("indent")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" title="Indent">
                      <i className="mgc_indent_increase_line"></i>
                    </button>
                    <button type="button" onClick={() => applyFormat("code")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" title="Source Code">
                      <i className="mgc_code_line"></i>
                    </button>
                    <button type="button" onClick={() => applyFormat("table")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" title="Insert Table">
                      <i className="mgc_table_line"></i>
                    </button>
                    <button type="button" onClick={() => applyFormat("clear")} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 cursor-pointer" title="Clear Formatting">
                      Tx
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Visual ContentEditable Editor */}
            <div
              ref={editorRef}
              contentEditable
              onInput={syncReplyFromEditor}
              onBlur={syncReplyFromEditor}
              className="w-full min-h-[200px] max-h-[350px] p-4 text-xs font-sans text-gray-800 dark:text-gray-200 focus:outline-hidden overflow-y-auto leading-relaxed"
              style={{ minHeight: "200px" }}
            />

            {/* Word Count Footer */}
            <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-400">
              <span>p</span>
              <span>{getWordCount()} words</span>
            </div>
          </div>

          {/* Attachments list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Attachments</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs text-[#0088cc] hover:underline"
              >
                <i className="mgc_attachment_line"></i> Attach Files
              </button>
              <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
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
                      className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
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
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 text-lg p-1 cursor-pointer"
            title="Attach file"
          >
            <i className="mgc_attachment_line"></i>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={sending || savingDraft}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg shadow-2xs transition disabled:opacity-50 cursor-pointer"
            >
              {savingDraft ? <i className="mgc_loading_2_line animate-spin mr-1"></i> : null}
              Draft
            </button>

            <button
              type="button"
              disabled={sending || savingDraft}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#0088cc] hover:bg-[#0077b5] rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {sending ? (
                <>
                  <i className="mgc_loading_2_line animate-spin"></i> Sending...
                </>
              ) : (
                <>Send</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
