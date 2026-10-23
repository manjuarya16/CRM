import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useLeadStore, useActivityStore, useQuoteStore, usePersonStore, useEmailTemplateStore, useWarehouseStore, useProductStore } from "@/store";
import API, { SERVER_URL } from "@/config";
import { extractFileUrl } from "@/utils/fileHelper";
import { ComposeMailModal } from "@/pages/apps/Mail/ComposeMailModal";
import { getRottenInfo } from "@/utils/rottenHelper";
import { stripHtmlToText, cleanEmailAddress } from "@/utils/formatters";

const getDurationOptionsForCycle = (cycle?: string) => {
  const c = (cycle || "monthly").toLowerCase();
  switch (c) {
    case "quarterly":
      return [
        { value: "3", label: "1 Quarter (3 Mo)" },
        { value: "6", label: "2 Quarters (6 Mo)" },
        { value: "9", label: "3 Quarters (9 Mo)" },
        { value: "12", label: "4 Quarters (1 Yr / 12 Mo)" },
        { value: "24", label: "8 Quarters (2 Yr / 24 Mo)" },
        { value: "36", label: "12 Quarters (3 Yr / 36 Mo)" },
        { value: "60", label: "20 Quarters (5 Yr / 60 Mo)" },
      ];
    case "half-yearly":
      return [
        { value: "6", label: "1 Half-Year (6 Mo)" },
        { value: "12", label: "2 Half-Years (1 Yr / 12 Mo)" },
        { value: "18", label: "3 Half-Years (1.5 Yr / 18 Mo)" },
        { value: "24", label: "4 Half-Years (2 Yr / 24 Mo)" },
        { value: "36", label: "6 Half-Years (3 Yr / 36 Mo)" },
        { value: "60", label: "10 Half-Years (5 Yr / 60 Mo)" },
      ];
    case "yearly":
    case "annually":
      return [
        { value: "12", label: "1 Year (12 Mo)" },
        { value: "24", label: "2 Years (24 Mo)" },
        { value: "36", label: "3 Years (36 Mo)" },
        { value: "48", label: "4 Years (48 Mo)" },
        { value: "60", label: "5 Years (60 Mo)" },
      ];
    case "monthly":
    default:
      return [
        { value: "1", label: "1 Month" },
        { value: "3", label: "3 Months" },
        { value: "6", label: "6 Months" },
        { value: "12", label: "12 Months (1 Yr)" },
        { value: "24", label: "24 Months (2 Yr)" },
        { value: "36", label: "36 Months (3 Yr)" },
        { value: "60", label: "60 Months (5 Yr)" },
      ];
  }
};

const getAdjustedDurationForCycle = (newCycle: string, currentDuration?: string | number) => {
  const options = getDurationOptionsForCycle(newCycle);
  const curStr = String(currentDuration || "12");
  const exists = options.some((opt) => opt.value === curStr);
  if (exists) return curStr;
  const has12 = options.find((opt) => opt.value === "12");
  return has12 ? "12" : (options[0]?.value || "12");
};

const formatCycleDuration = (cycle?: string, duration?: number | string) => {
  const c = (cycle || "monthly").toLowerCase();
  const months = Number(duration) || 12;

  if (c === "yearly" || c === "annually") {
    const years = Math.max(1, Math.round(months / 12));
    return `${years} ${years === 1 ? "Year" : "Years"} (${months} mo)`;
  }
  if (c === "half-yearly") {
    const periods = Math.max(1, Math.round(months / 6));
    const yearEquiv = months >= 12 ? ` · ${months / 12} ${months === 12 ? "Yr" : "Yrs"}` : "";
    return `${periods} Half-Yr${periods === 1 ? "" : "s"} (${months} mo${yearEquiv})`;
  }
  if (c === "quarterly") {
    const quarters = Math.max(1, Math.round(months / 3));
    const yearEquiv = months >= 12 ? ` · ${months / 12} ${months === 12 ? "Yr" : "Yrs"}` : "";
    return `${quarters} Quarter${quarters === 1 ? "" : "s"} (${months} mo${yearEquiv})`;
  }
  if (months >= 12 && months % 12 === 0) {
    const years = months / 12;
    return `${months} Months (${years} ${years === 1 ? "Yr" : "Yrs"})`;
  }
  return `${months} ${months === 1 ? "Month" : "Months"}`;
};

const computeContractEndDate = (startDateStr?: string, durationMonthsStr?: string): string => {
  if (!startDateStr) return "";
  const parts = startDateStr.split("-").map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return "";
  const [y, m, d] = parts;
  const months = parseInt(durationMonthsStr || "12", 10) || 12;
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

const getContractStatusBadge = (startDate?: string, endDate?: string) => {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const start = startDate ? new Date(startDate) : null;
  if (start) start.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilEnd = Math.round((end.getTime() - today.getTime()) / msPerDay);

  if (start && start.getTime() > today.getTime()) {
    const daysUntilStart = Math.round((start.getTime() - today.getTime()) / msPerDay);
    return {
      status: "Upcoming",
      badgeCls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
      icon: "mgc_time_line",
      text: `Starts in ${daysUntilStart}d`,
    };
  }

  if (daysUntilEnd < 0) {
    const expiredDays = Math.abs(daysUntilEnd);
    return {
      status: "Expired",
      badgeCls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
      icon: "mgc_alert_line",
      text: `Expired ${expiredDays}d ago`,
    };
  }

  if (daysUntilEnd <= 30) {
    return {
      status: "Expiring Soon",
      badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
      icon: "mgc_alarm_line",
      text: `${daysUntilEnd}d left`,
    };
  }

  return {
    status: "Active",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    icon: "mgc_check_circle_line",
    text: `${daysUntilEnd}d left`,
  };
};

const getActivityBadge = (type: string) => {
  switch (type?.toLowerCase()) {
    case "email":
    case "mail":
      return {
        badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-blue-800",
        icon: "mgc_mail_line",
        label: "Email",
      };
    case "call":
      return {
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
        icon: "mgc_phone_line",
        label: "Call",
      };
    case "meeting":
      return {
        badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
        icon: "mgc_calendar_line",
        label: "Meeting",
      };
    case "lunch":
      return {
        badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
        icon: "mgc_restaurant_line",
        label: "Lunch",
      };
    case "note":
      return {
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
        icon: "mgc_edit_line",
        label: "Note",
      };
    case "file":
      return {
        badgeClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800",
        icon: "mgc_file_text_line",
        label: "File",
      };
    default:
      return {
        badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
        icon: "mgc_information_line",
        label: type || "Activity",
      };
  }
};

const ActivityCommentContent: React.FC<{ comment: string; type: string }> = ({ comment }) => {
  const [expanded, setExpanded] = useState(false);

  if (!comment) return null;

  // 1. Strip any HTML tags & clean boilerplate text if present
  const plainComment = stripHtmlToText(comment);
  let cleaned = plainComment
    .replace(/unfortunately,\s*your\s*email\s*client\s*cannot\s*display\s*html[^\n\r]*(\r?\n[^\n\r]*)*/gi, '')
    .replace(/to\s*view\s*this\s*email[^.\n]*into\s*your\s*browser\.?/gi, '')
    .replace(/(\*{4,}|\-{4,}|_{4,})/g, '')
    .trim();

  // 2. Check for sender/recipient headers
  let senderHeader = '';
  const fromMatch = cleaned.match(/^(Received email from [^\n\r]+)/i);
  const toMatch = cleaned.match(/^(To:\s*[^\n\r]+)/i);

  if (fromMatch) {
    senderHeader = fromMatch[1];
    cleaned = cleaned.replace(/^(Received email from [^\n\r]+)\s*/i, '').trim();
  } else if (toMatch) {
    senderHeader = toMatch[1];
    cleaned = cleaned.replace(/^(To:\s*[^\n\r]+)\s*/i, '').trim();
  }

  // 3. Extract "View web version: <url>"
  let webVersionUrl = '';
  const webVersionMatch = cleaned.match(/view\s*web\s*version:\s*(https?:\/\/[^\s]+)/i);
  if (webVersionMatch) {
    webVersionUrl = webVersionMatch[1];
    cleaned = cleaned.replace(/view\s*web\s*version:\s*https?:\/\/[^\s]+\s*/gi, '').trim();
  }

  // Fallback if cleaned is empty but webVersionUrl exists
  if (!cleaned && !senderHeader && !webVersionUrl) {
    cleaned = plainComment;
  }

  const isLong = cleaned.length > 280;
  const displayText = (!expanded && isLong) ? cleaned.slice(0, 260) + '...' : cleaned;

  // Helper to render text with clickable links
  const renderFormattedText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, idx) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0088cc] underline hover:text-[#006699] break-all inline-flex items-center gap-0.5 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part.length > 55 ? part.slice(0, 50) + '...' : part}</span>
            <i className="mgc_external_link_line text-[10px]"></i>
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-2 mt-1.5 min-w-0">
      {senderHeader && (
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 max-w-full">
          <i className="mgc_user_3_line text-xs text-[#0088cc] shrink-0"></i>
          <span className="truncate">{senderHeader}</span>
        </div>
      )}

      {cleaned && (
        <div className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed font-normal">
          {renderFormattedText(displayText)}
        </div>
      )}

      {isLong && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#0088cc] hover:underline font-semibold inline-flex items-center gap-1"
          >
            {expanded ? "Show less" : "Show full message"}
            <i className={expanded ? "mgc_up_line text-xs" : "mgc_down_line text-xs"}></i>
          </button>
        </div>
      )}

      {webVersionUrl && (
        <div className="pt-1">
          <a
            href={webVersionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0088cc] hover:text-[#0077bb] bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
          >
            <i className="mgc_external_link_line text-xs"></i>
            View Web Version
          </a>
        </div>
      )}
    </div>
  );
};

const LeadViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const leadId = Number(id);

  const {
    fetchLeadById, selectedLead, stages, fetchStages,
    updateLeadStage, leadProducts, fetchLeadProducts, addLeadProduct, deleteLeadProduct, deleteLead,
    pipelines, fetchPipelines
  } = useLeadStore();

  const { activities, fetchActivities, addActivity, updateActivity } = useActivityStore();
  const { quotes, fetchQuotes } = useQuoteStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    "all" | "planned" | "notes" | "calls" | "meetings" | "lunches" | "files" | "emails" | "changelogs" | "description" | "products" | "quotes"
  >("all");
  const [person, setPerson] = useState<any>(null);

  useEffect(() => {
    fetchPipelines();
  }, []);
  const [productsList, setProductsList] = useState<any[]>([]);

  // Action Modals: Mail, File, Note, Activity, StageUpdate (Won/Lost)
  const [activeModal, setActiveModal] = useState<"mail" | "file" | "note" | "activity" | "won_lost" | null>(null);
  const [targetWonLostStage, setTargetWonLostStage] = useState<any>(null);

  const [personsList, setPersonsList] = useState<any[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [newProd, setNewProd] = useState<{
    product_id: string;
    quantity: string;
    price: string;
    warehouse_id: string;
    warehouse_location_id: string;
    is_recurring?: boolean;
    billing_cycle?: string;
    contract_duration?: string;
    contract_start_date?: string;
    contract_end_date?: string;
  }>({
    product_id: "",
    quantity: "1",
    price: "",
    warehouse_id: "",
    warehouse_location_id: "",
    is_recurring: false,
    billing_cycle: "monthly",
    contract_duration: "12",
    contract_start_date: new Date().toISOString().split("T")[0],
    contract_end_date: "",
  });
  const [prodError, setProdError] = useState<string>("");

  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  useEffect(() => {
    usePersonStore.getState().fetchPersons({ limit: 500, per_page: 500 }).then(() => {
      const statePersons = usePersonStore.getState().persons;
      if (statePersons) {
        const sorted = [...statePersons].sort((a: any, b: any) =>
          (a.name || "").localeCompare(b.name || "")
        );
        setPersonsList(sorted);
      }
    }).catch(() => { });

    useEmailTemplateStore.getState().fetchEmailTemplates().then((templates) => {
      if (templates) setEmailTemplates(templates);
    }).catch(() => { });

    useWarehouseStore.getState().fetchWarehouses().then((warehouses) => {
      if (warehouses) setWarehousesList(warehouses);
    }).catch(() => { });
  }, []);


  useEffect(() => {
    if (leadId) {
      fetchLeadById(leadId).then((lead) => {
        if (lead) {
          if (lead.lead_pipeline_id) fetchStages(lead.lead_pipeline_id);
          else fetchStages();

          if (lead.person_id) {
            usePersonStore.getState().getPersonById(lead.person_id).then((p) => {
              if (p) setPerson(p);
            }).catch(() => { });
          }
        }
        setLoading(false);
      });

      fetchLeadProducts(leadId);
      fetchActivities(1, 100, "", leadId);
      fetchQuotes(1, 50, "", leadId);

      useProductStore.getState().fetchProducts(1, 100).then(() => {
        const prods = useProductStore.getState().products;
        if (prods) setProductsList(prods);
      }).catch(() => { });
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

  const handleSelectEmailTemplate = (templateIdStr: string) => {
    setSelectedTemplateId(templateIdStr);
    if (!templateIdStr) return;
    const tmpl = emailTemplates.find((t) => String(t.id) === templateIdStr);
    if (tmpl) {
      let body = tmpl.content || "";
      const personName = person?.name || selectedLead?.person_name || "Customer";
      const leadTitle = selectedLead?.title || "Lead";
      const leadValue = selectedLead?.lead_value ? `₹${selectedLead.lead_value}` : "₹0";
      const userName = selectedLead?.user_name || "Sales Team";

      body = body
        .replace(/\{\{\s*name\s*\}\}/gi, personName)
        .replace(/\{\{\s*person_name\s*\}\}/gi, personName)
        .replace(/\{\{\s*title\s*\}\}/gi, leadTitle)
        .replace(/\{\{\s*lead_title\s*\}\}/gi, leadTitle)
        .replace(/\{\{\s*lead_value\s*\}\}/gi, leadValue)
        .replace(/\{\{\s*user_name\s*\}\}/gi, userName);

      setModalForm((prev) => ({
        ...prev,
        email_subject: tmpl.subject || tmpl.name || "",
        email_body: body,
      }));
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.product_id) {
      setProdError("Please select a product");
      return;
    }
    setProdError("");
    const selectedP = productsList.find((p) => String(p.id) === String(newProd.product_id));
    const isService = selectedP?.type === "Service" || selectedP?.type?.toLowerCase() === "service";
    const isRecurring = Boolean(newProd.is_recurring ?? isService);
    const billingCycle = isRecurring ? (newProd.billing_cycle || "monthly") : undefined;
    const contractDuration = isRecurring ? (Number(newProd.contract_duration) || 12) : undefined;
    const contractStartDate = isRecurring ? (newProd.contract_start_date || new Date().toISOString().split("T")[0]) : undefined;
    const contractEndDate = isRecurring ? (newProd.contract_end_date || computeContractEndDate(contractStartDate, String(contractDuration || 12))) : undefined;

    await addLeadProduct(
      leadId,
      Number(newProd.product_id),
      Number(newProd.quantity) || 1,
      newProd.price ? Number(newProd.price) : undefined,
      isService ? undefined : (newProd.warehouse_id ? Number(newProd.warehouse_id) : undefined),
      isService ? undefined : (newProd.warehouse_location_id ? Number(newProd.warehouse_location_id) : undefined),
      isRecurring,
      billingCycle,
      contractDuration,
      contractStartDate,
      contractEndDate
    );
    const todayStr = new Date().toISOString().split("T")[0];
    setNewProd({
      product_id: "",
      quantity: "1",
      price: "",
      warehouse_id: "",
      warehouse_location_id: "",
      is_recurring: false,
      billing_cycle: "monthly",
      contract_duration: "12",
      contract_start_date: todayStr,
      contract_end_date: computeContractEndDate(todayStr, "12"),
    });
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
        if (selectedFile) {
          const formData = new FormData();
          formData.append("file", selectedFile);
          await API.post(`/leads/${leadId}/upload-file`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          Swal.fire("Success", "File uploaded and attached to lead", "success");
          setSelectedFile(null);
        } else {
          await addActivity({
            title: modalForm.title || "File Attachment",
            type: "file",
            comment: modalForm.comment || "Attached file document to lead",
            lead_id: leadId,
            person_id: selectedLead?.person_id,
          });
          Swal.fire("Success", "File activity logged", "success");
        }
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


const getPersonEmail = (person: any): string => {
  if (!person) return "";
  if (person.email) return cleanEmailAddress(person.email);
  if (!person.emails) return "";
  return cleanEmailAddress(person.emails);
};

  const mailInitialData = useMemo(() => {
    const emailStr = getPersonEmail(person) || (selectedLead?.custom_attributes?.email || "");
    const recipient = emailStr ? [emailStr] : [];
    return {
      lead_id: leadId,
      person_id: selectedLead?.person_id,
      to: recipient,
      subject: selectedLead?.title ? `Regarding ${selectedLead.title}` : "",
    };
  }, [leadId, selectedLead?.person_id, selectedLead?.title, person]);

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
    { id: 5, action: `Updated Lead Value : ₹${Number(selectedLead.lead_value || 0).toFixed(2)}`, time: new Date(selectedLead.created_at || Date.now()).toLocaleString(), user: selectedLead.user_name || "Admin" },
    { id: 6, action: `Created Lead #${selectedLead.id}`, time: new Date(selectedLead.created_at || Date.now()).toLocaleString(), user: selectedLead.user_name || "Admin" },
  ];

  // Calculate rotten status
  const currentPipeline = selectedLead?.lead_pipeline_id
    ? pipelines.find((p) => Number(p.id) === Number(selectedLead.lead_pipeline_id))
    : pipelines[0];
  const rottenInfo = selectedLead ? getRottenInfo(selectedLead, currentPipeline) : { isRotten: false, daysIdle: 0, rottenDaysThreshold: 30 };

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

      {/* Rotten Lead Alert Banner */}
      {rottenInfo.isRotten && (
        <div className="bg-gradient-to-r from-rose-500/10 via-rose-50 to-amber-50 dark:from-rose-950/40 dark:via-rose-900/20 dark:to-amber-950/30 border border-rose-300 dark:border-rose-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center text-xl shrink-0 shadow-inner">
              🍅
            </div>
            <div>
              <h4 className="font-bold text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2">
                Rotten Lead Warning
                <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200 text-[10px] font-extrabold uppercase">
                  {rottenInfo.daysIdle} Days Idle
                </span>
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                This deal has exceeded the pipeline rotting threshold of {rottenInfo.rottenDaysThreshold} days without progress. Log an activity or note to keep it moving forward.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal("activity")}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
            >
              <i className="mgc_time_line text-sm"></i>
              Log Activity
            </button>
            <button
              onClick={() => setActiveModal("note")}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
            >
              <i className="mgc_file_text_line text-sm"></i>
              Add Note
            </button>
          </div>
        </div>
      )}

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
                  <span className="font-bold text-gray-800 dark:text-gray-200">₹{Number(selectedLead.lead_value || 0).toFixed(2)}</span>
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
                      try { attrs = JSON.parse(selectedLead.custom_attributes); } catch { }
                    }
                  }
                  if (Object.keys(attrs).length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wider">Custom Attributes</p>
                      {Object.entries(attrs).map(([k, v]) => {
                        const valStr = String(v ?? "");
                        const isImage = typeof v === "string" && (
                          valStr.startsWith("data:image/") ||
                          valStr.startsWith("http://") ||
                          valStr.startsWith("https://") ||
                          /\.(jpg|jpeg|png|gif|webp)$/i.test(valStr)
                        );
                        return (
                          <div key={k} className="flex justify-between items-center gap-2">
                            <span className="text-gray-500 capitalize">{k.replace(/_/g, " ")}</span>
                            {isImage ? (
                              <img
                                src={valStr}
                                alt={k}
                                className="w-12 h-12 object-cover rounded-md border border-gray-200 dark:border-gray-700 shadow-sm"
                              />
                            ) : (
                              <span className="font-medium text-gray-700 dark:text-gray-300">{valStr || "-"}</span>
                            )}
                          </div>
                        );
                      })}
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

              {(() => {
                const leadOrgId = selectedLead.organization_id;
                const otherOrgPersons = leadOrgId
                  ? personsList.filter(
                      (p) => String(p.organization_id) === String(leadOrgId) && String(p.id) !== String(selectedLead.person_id)
                    )
                  : [];

                if (!person && otherOrgPersons.length === 0) {
                  return selectedLead.person_name ? (
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedLead.person_name}</p>
                  ) : (
                    <p className="text-xs text-gray-400">No person linked.</p>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {/* Primary Contact Person */}
                    {person && (
                      <div className="flex items-start gap-3 bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="w-8 h-8 rounded-full bg-[#0088cc] text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {person.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5 text-xs flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-[#0088cc]">{person.name}</p>
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#0088cc] text-white rounded">Primary</span>
                          </div>
                          {person.job_title && <p className="text-gray-600 dark:text-gray-300 font-medium text-[11px]">{person.job_title}</p>}
                          {person.emails?.[0] && <p className="text-gray-500">{cleanEmailAddress(person.emails[0])} (work)</p>}
                          {person.contact_numbers?.[0] && <p className="text-gray-500">{person.contact_numbers[0].value || person.contact_numbers[0]}</p>}
                        </div>
                      </div>
                    )}

                    {/* Secondary Organization Contacts */}
                    {otherOrgPersons.map((op) => {
                      const emailVal = cleanEmailAddress(Array.isArray(op.emails) ? op.emails[0] : op.email);
                      const phoneVal = Array.isArray(op.contact_numbers) ? (op.contact_numbers[0]?.value || op.contact_numbers[0]) : op.phone;
                      return (
                        <div key={op.id} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                          <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {op.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="space-y-0.5 text-xs flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-gray-800 dark:text-gray-200">{op.name}</p>
                              <span className="px-1.5 py-0.5 text-[9px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">Org Contact</span>
                            </div>
                            {op.job_title && <p className="text-gray-600 dark:text-gray-300 font-medium text-[11px]">{op.job_title}</p>}
                            {emailVal && <p className="text-gray-500">{emailVal}</p>}
                            {phoneVal && <p className="text-gray-500">{phoneVal}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Stage Stepper Bar (Chevron Ribbon style matching Krayin view/stages.blade.php) */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-800 p-2 overflow-hidden">
            <div
              className="flex items-center w-full overflow-x-auto no-scrollbar scroll-smooth rounded-lg py-1 px-1"
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
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
                    className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center -mr-2 min-w-[120px] shrink-0 ${isLost
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
                className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center -mr-2 min-w-[110px] shrink-0 rounded-r-lg ${!selectedLead.status
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
            <div
              className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar scroll-smooth px-4 py-2 bg-gray-50/50 dark:bg-gray-900/50 text-xs font-semibold text-gray-600 dark:text-gray-300"
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              {(["all", "planned", "notes", "calls", "meetings", "lunches", "files", "emails", "changelogs", "description", "products", "quotes"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-colors shrink-0 ${activeTab === tab
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

              {/* CHANGELOGS TIMELINE */}
              {activeTab === "changelogs" && (
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

              {/* ACTIVITIES TABS: ALL, PLANNED, NOTES, CALLS, MEETINGS, LUNCHES, FILES, EMAILS */}
              {["all", "planned", "notes", "calls", "meetings", "lunches", "files", "emails"].includes(activeTab) && (
                <div className="space-y-3">
                  {(() => {
                    const filtered = leadActivities.filter((a) => {
                      if (activeTab === "all") return true;
                      if (activeTab === "planned") return ["call", "meeting", "lunch"].includes(a.type) && !a.is_done;
                      if (activeTab === "notes") return a.type === "note";
                      if (activeTab === "calls") return a.type === "call";
                      if (activeTab === "meetings") return a.type === "meeting";
                      if (activeTab === "lunches") return a.type === "lunch";
                      if (activeTab === "files") return a.type === "file";
                      if (activeTab === "emails") return a.type === "email" || a.type === "mail";
                      return true;
                    });

                    if (filtered.length === 0 && activeTab !== "all") {
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

                    if (filtered.length === 0 && activeTab === "all" && changelogs.length > 0) {
                      return (
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
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {filtered.map((act) => {
                          const fileUrl = extractFileUrl(act.comment);
                          const badge = getActivityBadge(act.type);
                          const isEmail = act.type === "email" || act.type === "mail";
                          return (
                            <div
                              key={act.id}
                              className={`p-4 rounded-xl border transition-all ${
                                isEmail
                                  ? "bg-white dark:bg-gray-900/60 border-indigo-100 dark:border-indigo-900/30 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700"
                                  : "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                              } space-y-2.5 overflow-hidden`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-flex items-center gap-1 ${badge.badgeClass}`}>
                                      <i className={`${badge.icon} text-xs`}></i>
                                      {badge.label}
                                    </span>
                                    {act.created_at && (
                                      <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                                        <i className="mgc_time_line text-xs"></i>
                                        {new Date(act.created_at).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 break-words">{act.title}</h4>
                                  {act.comment && act.type !== "file" && (
                                    <ActivityCommentContent comment={act.comment} type={act.type} />
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {/* For email activities: quick link to Mailbox */}
                                  {isEmail && (
                                    <Link
                                      to="/mail"
                                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                                      title="Open in Mailbox"
                                    >
                                      <i className="mgc_mail_line text-xs"></i>
                                      <span className="hidden sm:inline">Mailbox</span>
                                    </Link>
                                  )}

                                  {/* Status Tag: ONLY for scheduled activities (Call, Meeting, Lunch) */}
                                  {["call", "meeting", "lunch"].includes(act.type) && (
                                    <button
                                      onClick={async () => {
                                        await updateActivity(act.id, { is_done: !act.is_done });
                                        fetchActivities(1, 100, "", leadId);
                                      }}
                                      title="Click to toggle Done/Pending"
                                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${act.is_done
                                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300"
                                          : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                                        }`}
                                    >
                                      {act.is_done ? "Done ✓" : "Pending ⏳"}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* File Card with Download Link */}
                              {(act.type === "file" || fileUrl) && (
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

                        {/* Append stage updates timeline to 'All' tab */}
                        {activeTab === "all" && changelogs.map((item) => (
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
                    );
                  })()}
                </div>
              )}



              {/* PRODUCTS TAB */}
              {activeTab === "products" && (
                <div className="space-y-4">
                  {/* Recurring Contracts Tracking Bar */}
                  {(() => {
                    const recurringProds = leadProducts.filter((p) => p.is_recurring);
                    if (recurringProds.length === 0) return null;

                    const expiringSoon = recurringProds.filter((p) => {
                      const b = getContractStatusBadge(p.contract_start_date, p.contract_end_date);
                      return b?.status === "Expiring Soon";
                    });
                    const expired = recurringProds.filter((p) => {
                      const b = getContractStatusBadge(p.contract_start_date, p.contract_end_date);
                      return b?.status === "Expired";
                    });
                    const active = recurringProds.filter((p) => {
                      const b = getContractStatusBadge(p.contract_start_date, p.contract_end_date);
                      return b?.status === "Active";
                    });

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-amber-50/50 dark:from-gray-800/80 dark:via-gray-800/50 dark:to-gray-800/80 rounded-xl border border-blue-100 dark:border-gray-700 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {active.length}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Active Contracts</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">Live & currently active</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            expiringSoon.length > 0
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-2 ring-amber-400 animate-pulse"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                          }`}>
                            {expiringSoon.length}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Expiring Soon (≤30d)</div>
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              {expiringSoon.length > 0 ? `${expiringSoon.length} contract(s) up for renewal` : "No upcoming renewals"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            expired.length > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                          }`}>
                            {expired.length}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Expired Contracts</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {expired.length > 0 ? `${expired.length} contract(s) expired` : "None"}
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-3 flex justify-end pt-2 border-t border-blue-100/60 dark:border-gray-700/60">
                          <Link
                            to="/reports/recurring-contracts"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0e90d9] hover:underline"
                          >
                            <i className="mgc_repeat_line text-xs" />
                            <span>Open Contracts & Renewals Report &rarr;</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })()}

                  <form onSubmit={handleAddProduct} className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[180px]">
                        <label className="block text-xs font-semibold mb-1">Product</label>
                        <select
                          value={newProd.product_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            const prod = productsList.find((p) => String(p.id) === String(val));
                            const isService = prod?.type === "Service" || prod?.type?.toLowerCase() === "service";
                            const todayStr = new Date().toISOString().split("T")[0];
                            setNewProd((prev) => ({
                              ...prev,
                              product_id: val,
                              price: prod ? String(prod.price || 0) : prev.price,
                              quantity: isService ? "1" : (prev.quantity || "1"),
                              is_recurring: isService ? true : prev.is_recurring,
                              contract_start_date: prev.contract_start_date || todayStr,
                              contract_duration: prev.contract_duration || "12",
                              contract_end_date: computeContractEndDate(prev.contract_start_date || todayStr, prev.contract_duration || "12"),
                            }));
                            if (prodError) setProdError("");
                          }}
                          className={`w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border ${prodError ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600"
                            } rounded text-xs`}
                        >
                          <option value="">Select Product</option>
                          {productsList.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                          ))}
                        </select>
                        {prodError && <p className="mt-1 text-xs text-red-500 font-medium">{prodError}</p>}
                      </div>

                      {/* Warehouse Dropdown */}
                      {(() => {
                        const selectedP = productsList.find((p) => String(p.id) === String(newProd.product_id));
                        const isService = selectedP?.type === "Service" || selectedP?.type?.toLowerCase() === "service";
                        if (isService) return null;
                        return (
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold mb-1">Warehouse</label>
                            <select
                              value={newProd.warehouse_id}
                              onChange={(e) => {
                                setNewProd({ ...newProd, warehouse_id: e.target.value, warehouse_location_id: "" });
                              }}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs"
                            >
                              <option value="">Select Warehouse</option>
                              {warehousesList.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}

                      {/* Storage Location Dropdown */}
                      {(() => {
                        const selectedP = productsList.find((p) => String(p.id) === String(newProd.product_id));
                        const isService = selectedP?.type === "Service" || selectedP?.type?.toLowerCase() === "service";
                        if (isService) return null;
                        const selectedW = warehousesList.find((w) => String(w.id) === newProd.warehouse_id);
                        const availableLocations = selectedW?.locations || [];
                        return (
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold mb-1">Location</label>
                            <select
                              value={newProd.warehouse_location_id}
                              onChange={(e) => setNewProd({ ...newProd, warehouse_location_id: e.target.value })}
                              disabled={!newProd.warehouse_id}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs disabled:opacity-50"
                            >
                              <option value="">Select Location</option>
                              {availableLocations.map((loc: any) => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}

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

                      <div className="flex items-center gap-2 pb-1">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={Boolean(newProd.is_recurring)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const todayStr = new Date().toISOString().split("T")[0];
                              setNewProd((prev) => ({
                                ...prev,
                                is_recurring: checked,
                                contract_start_date: prev.contract_start_date || todayStr,
                                contract_duration: prev.contract_duration || "12",
                                contract_end_date: computeContractEndDate(prev.contract_start_date || todayStr, prev.contract_duration || "12"),
                              }));
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Recurring</span>
                        </label>
                      </div>

                      <button type="submit" className="px-3.5 py-1.5 bg-[#0088cc] hover:bg-[#0077b3] text-white text-xs font-bold rounded shadow-xs transition-colors">
                        + Add Product
                      </button>
                    </div>

                    {newProd.is_recurring && (
                      <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-gray-200/80 dark:border-gray-700 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Cycle:</span>
                          <select
                            value={newProd.billing_cycle || "monthly"}
                            onChange={(e) => {
                              const cycle = e.target.value;
                              const adjusted = getAdjustedDurationForCycle(cycle, newProd.contract_duration);
                              setNewProd((prev) => ({
                                ...prev,
                                billing_cycle: cycle,
                                contract_duration: adjusted,
                                contract_end_date: computeContractEndDate(prev.contract_start_date, adjusted),
                              }));
                            }}
                            className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly (3 Mo)</option>
                            <option value="half-yearly">Half-Yearly (6 Mo)</option>
                            <option value="yearly">Yearly (12 Mo)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Duration:</span>
                          <select
                            value={newProd.contract_duration || "12"}
                            onChange={(e) => {
                              const dur = e.target.value;
                              setNewProd((prev) => ({
                                ...prev,
                                contract_duration: dur,
                                contract_end_date: computeContractEndDate(prev.contract_start_date, dur),
                              }));
                            }}
                            className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          >
                            {getDurationOptionsForCycle(newProd.billing_cycle).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Start Date:</span>
                          <input
                            type="date"
                            value={newProd.contract_start_date || ""}
                            onChange={(e) => {
                              const start = e.target.value;
                              setNewProd((prev) => ({
                                ...prev,
                                contract_start_date: start,
                                contract_end_date: computeContractEndDate(start, prev.contract_duration || "12"),
                              }));
                            }}
                            className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">End Date:</span>
                          <input
                            type="date"
                            value={newProd.contract_end_date || ""}
                            onChange={(e) => setNewProd({ ...newProd, contract_end_date: e.target.value })}
                            className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </form>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-gray-900/50">
                          <th className="p-2">Product</th>
                          <th className="p-2">Type / Schedule</th>
                          <th className="p-2">Contract Period</th>
                          <th className="p-2">Contract Status</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2">Warehouse</th>
                          <th className="p-2">Location</th>
                          <th className="p-2">Qty</th>
                          <th className="p-2">Price</th>
                          <th className="p-2">Amount</th>
                          <th className="p-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadProducts.length === 0 ? (
                          <tr><td colSpan={11} className="text-center py-6 text-gray-400">No products added.</td></tr>
                        ) : (
                          leadProducts.map((p) => {
                            const badge = p.is_recurring ? getContractStatusBadge(p.contract_start_date, p.contract_end_date) : null;
                            return (
                              <tr key={p.id} className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                                <td className="p-2 font-semibold text-gray-900 dark:text-gray-100">{p.product_name}</td>
                                <td className="p-2">
                                  {p.is_recurring ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[11px] font-semibold">
                                      <i className="mgc_refresh_2_line text-xs text-blue-600"></i>
                                      <span className="capitalize">{p.billing_cycle || "Monthly"}</span> ({formatCycleDuration(p.billing_cycle, p.contract_duration)})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[11px] font-medium">
                                      One-Time
                                    </span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {p.is_recurring ? (
                                    <div className="text-[11px] text-gray-700 dark:text-gray-300 whitespace-nowrap space-y-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-400 text-[10px] w-6">From:</span>
                                        <span>{formatDateDisplay(p.contract_start_date)}</span>
                                      </div>
                                      <div className="flex items-center gap-1 font-medium">
                                        <span className="text-gray-400 text-[10px] w-6">To:</span>
                                        <span>{formatDateDisplay(p.contract_end_date)}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {badge ? (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${badge.badgeCls}`}>
                                      <i className={`${badge.icon} text-xs`}></i>
                                      <span className="font-semibold">{badge.status}</span>
                                      <span className="opacity-80">({badge.text})</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="p-2 text-gray-500 font-mono">{p.sku || "-"}</td>
                                <td className="p-2">
                                  {p.warehouse_name ? (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-medium">
                                      {p.warehouse_name}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">-</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {p.warehouse_location_name ? (
                                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[11px] font-medium">
                                      {p.warehouse_location_name}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">-</span>
                                  )}
                                </td>
                                <td className="p-2">{p.quantity}</td>
                                <td className="p-2">
                                  ₹{Number(p.price || 0).toFixed(2)}
                                  {p.is_recurring && (
                                    <span className="text-[10px] text-blue-600 block">/{p.billing_cycle || "mo"}</span>
                                  )}
                                </td>
                                <td className="p-2 font-bold">₹{Number(p.amount || 0).toFixed(2)}</td>
                                <td className="p-2 text-right">
                                  <button onClick={() => deleteLeadProduct(p.id, leadId)} className="text-red-500 hover:underline">
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* QUOTES TAB */}
              {activeTab === "quotes" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <h4 className="font-bold text-xs">Associated Quotes</h4>
                    <Link to={`/quotes/create?lead_id=${leadId}`} className="px-3 py-1 bg-[#0088cc] text-white rounded text-xs font-semibold">
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
                          <p className="text-gray-500">Grand Total: ₹{Number(q.grand_total || 0).toFixed(2)}</p>
                        </div>
                        <Link to={`/quotes/edit/${q.id}`} className="px-2.5 py-1 border rounded text-xs">View Quote</Link>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* DESCRIPTION TAB */}
              {activeTab === "description" && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {stripHtmlToText(selectedLead.description) || "No description provided for this lead."}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* FULL COMPOSE MAIL MODAL FOR LEADS */}
      <ComposeMailModal
        isOpen={activeModal === "mail"}
        onClose={() => setActiveModal(null)}
        onSuccess={(msg) => {
          Swal.fire("Success", msg || "Email sent successfully", "success");
          setActiveModal(null);
          fetchActivities(1, 100, "", leadId);
        }}
        initialData={mailInitialData}
      />

      {/* QUICK ACTION & WON/LOST MODALS */}
      {activeModal && activeModal !== "mail" && (
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
                      <label className="block text-xs font-semibold mb-1">Won Value (₹)</label>
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
                      className={`px-4 py-1.5 text-white rounded text-xs font-bold ${targetWonLostStage?.code === "won" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
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
                  {activeModal === "file" ? "Attach File" : activeModal === "note" ? "Add Note" : "Log Activity"}
                </h3>
                <form onSubmit={handleQuickActionSubmit} className="space-y-3">

                  {activeModal === "file" && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Select File *</label>
                        <input
                          type="file"
                          required
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="w-full text-xs text-gray-600 border p-2 rounded"
                        />
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
                                <option value="task">Task</option>
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
