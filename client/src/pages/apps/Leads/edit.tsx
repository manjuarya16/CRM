import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  useLeadStore,
  useUserStore,
  usePersonStore,
  useOrganizationStore,
  useProductStore,
  useWarehouseStore,
  useTagStore,
} from "@/store";
import API from "@/config";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { leadSchema } from "@/schemas";
import { TagPicker } from "@/components/TagPicker";
import { ProductRow, ILeadContactItem } from "@/interface";

const TABS = [
  { id: "lead-details", label: "Lead Details" },
  { id: "contact-person", label: "Contact Person" },
  { id: "products", label: "Products" },
  { id: "custom-attributes", label: "Custom Attributes" },
];

const fmtCurrency = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}`;

const getPersonEmail = (person: any): string => {
  if (!person) return "";
  if (person.email) return person.email;
  if (!person.emails) return "";
  try {
    const emails =
      typeof person.emails === "string"
        ? JSON.parse(person.emails)
        : person.emails;
    if (Array.isArray(emails) && emails.length > 0) {
      const first = emails[0];
      return typeof first === "object"
        ? first.value || first.email || ""
        : String(first);
    }
    if (typeof emails === "string") return emails;
  } catch (e) {}
  return "";
};

const getPersonOrg = (person: any, orgList: any[] = []): string => {
  if (!person) return "";
  if (person.organization_name) return person.organization_name;
  if (person.organization?.name) return person.organization.name;
  if (typeof person.organization === "string" && person.organization.trim())
    return person.organization;
  if (person.organization_id && orgList.length > 0) {
    const found = orgList.find(
      (org: any) => String(org.id) === String(person.organization_id),
    );
    if (found?.name) return found.name;
  }
  return "";
};

const getPersonPhone = (person: any): string => {
  if (!person) return "";
  if (person.phone) return person.phone;
  if (!person.contact_numbers) return "";
  try {
    const phones =
      typeof person.contact_numbers === "string"
        ? JSON.parse(person.contact_numbers)
        : person.contact_numbers;
    if (Array.isArray(phones) && phones.length > 0) {
      const first = phones[0];
      return typeof first === "object"
        ? first.value || first.number || first.phone || ""
        : String(first);
    }
    if (typeof phones === "string") return phones;
  } catch (e) {}
  return "";
};

const parseContactItems = (
  data: any,
  defaultLabel: string = "Work",
): ILeadContactItem[] => {
  if (!data) return [{ label: defaultLabel, value: "" }];
  let parsed = data;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      return [{ label: defaultLabel, value: data }];
    }
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map((item: any) => {
      if (typeof item === "string") return { label: defaultLabel, value: item };
      return {
        label: item.label || defaultLabel,
        value: item.value || item.email || item.number || item.phone || "",
      };
    });
  }
  return [{ label: defaultLabel, value: "" }];
};

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

const getAdjustedDurationForCycle = (
  newCycle: string,
  currentDuration?: string | number,
) => {
  const options = getDurationOptionsForCycle(newCycle);
  const curStr = String(currentDuration || "12");
  const exists = options.some((opt) => opt.value === curStr);
  if (exists) return curStr;
  const has12 = options.find((opt) => opt.value === "12");
  return has12 ? "12" : options[0]?.value || "12";
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
    const yearEquiv =
      months >= 12 ? ` · ${months / 12} ${months === 12 ? "Yr" : "Yrs"}` : "";
    return `${periods} Half-Yr${periods === 1 ? "" : "s"} (${months} mo${yearEquiv})`;
  }
  if (c === "quarterly") {
    const quarters = Math.max(1, Math.round(months / 3));
    const yearEquiv =
      months >= 12 ? ` · ${months / 12} ${months === 12 ? "Yr" : "Yrs"}` : "";
    return `${quarters} Quarter${quarters === 1 ? "" : "s"} (${months} mo${yearEquiv})`;
  }
  if (months >= 12 && months % 12 === 0) {
    const years = months / 12;
    return `${months} Months (${years} ${years === 1 ? "Yr" : "Yrs"})`;
  }
  return `${months} ${months === 1 ? "Month" : "Months"}`;
};

const computeContractEndDate = (
  startDateStr?: string,
  durationMonthsStr?: string,
): string => {
  if (!startDateStr) return "";
  const parts = startDateStr.split("-").map(Number);
  if (
    parts.length !== 3 ||
    isNaN(parts[0]) ||
    isNaN(parts[1]) ||
    isNaN(parts[2])
  )
    return "";
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

const EditLeadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    fetchLeadById,
    updateLead,
    sources,
    types,
    pipelines,
    stages,
    fetchSources,
    fetchTypes,
    fetchPipelines,
    fetchStages,
  } = useLeadStore();

  const [activeTab, setActiveTab] = useState("lead-details");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Users for Sales Owner
  const [users, setUsers] = useState<any[]>([]);

  // Tab 1 – Lead Details
  const [details, setDetails] = useState({
    title: "",
    description: "",
    lead_value: "",
    user_id: "",
    status: "true",
    lost_reason: "",
    lead_source_id: "",
    lead_type_id: "",
    lead_pipeline_id: "",
    lead_pipeline_stage_id: "",
    expected_close_date: "",
  });
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>(
    {},
  );
  const [hasCustomAttributes, setHasCustomAttributes] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tabs = [
    { id: "lead-details", label: "Lead Details" },
    { id: "contact-person", label: "Contact Person" },
    ...(hasCustomAttributes
      ? [{ id: "custom-attributes", label: "Custom Fields" }]
      : []),
    { id: "products", label: "Products" },
  ];

  // Tab 2 – Contact Person
  const [persons, setPersons] = useState<any[]>([]);
  const [personId, setPersonId] = useState("");
  const [personName, setPersonName] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const [contactEmails, setContactEmails] = useState<ILeadContactItem[]>([
    { label: "Work", value: "" },
  ]);
  const [contactPhones, setContactPhones] = useState<ILeadContactItem[]>([
    { label: "Work", value: "" },
  ]);
  const [organizationId, setOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const personDropdownRef = useRef<HTMLDivElement>(null);

  // Tab 3 – Products
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([
    {
      product_id: "",
      product_name: "",
      quantity: "1",
      price: "0",
      warehouse_id: "",
      warehouse_location_id: "",
      is_recurring: false,
      billing_cycle: "monthly",
      contract_duration: "12",
      contract_start_date: new Date().toISOString().split("T")[0],
      contract_end_date: "",
    },
  ]);

  useEffect(() => {
    fetchSources();
    fetchTypes();
    fetchPipelines();
    useUserStore
      .getState()
      .fetchUsers(1, 200)
      .then((res: any) => {
        if (res?.rows || res) setUsers(res?.rows || res || []);
      })
      .catch(() => {});
    usePersonStore
      .getState()
      .fetchPersons({ limit: 500, per_page: 500 })
      .then(() => {
        const statePersons = usePersonStore.getState().persons;
        if (statePersons) {
          const sorted = [...statePersons].sort((a: any, b: any) =>
            (a.name || "").localeCompare(b.name || ""),
          );
          setPersons(sorted);
        }
      })
      .catch(() => {});
    useOrganizationStore
      .getState()
      .fetchOrganizations(1, 500)
      .then((res: any) => {
        const orgList = res?.data || res?.rows || [];
        if (Array.isArray(orgList) && orgList.length > 0) {
          setOrganizations(orgList);
        } else {
          useOrganizationStore
            .getState()
            .getOrganization()
            .then(() => {
              const org = useOrganizationStore.getState().organization;
              if (org) setOrganizations([org]);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    useProductStore
      .getState()
      .fetchProducts(1, 500)
      .then(() => {
        const prods = useProductStore.getState().products;
        if (prods) setProducts(prods);
      })
      .catch(() => {});
    useWarehouseStore
      .getState()
      .fetchWarehouses()
      .then((list) => {
        if (list) setWarehouses(list);
      })
      .catch(() => {});

    if (id) {
      useTagStore
        .getState()
        .fetchEntityTags("lead", id)
        .then((tags) => {
          if (tags) setSelectedTagIds(tags.map((t: any) => t.id));
        })
        .catch(() => {});
      setLoading(true);
      fetchLeadById(Number(id)).then((lead) => {
        if (lead) {
          setDetails({
            title: lead.title || "",
            description: lead.description || "",
            lead_value: lead.lead_value ? String(lead.lead_value) : "",
            user_id: lead.user_id ? String(lead.user_id) : "",
            status: lead.status !== false ? "true" : "false",
            lost_reason: lead.lost_reason || "",
            lead_source_id: lead.lead_source_id
              ? String(lead.lead_source_id)
              : "",
            lead_type_id: lead.lead_type_id ? String(lead.lead_type_id) : "",
            lead_pipeline_id: lead.lead_pipeline_id
              ? String(lead.lead_pipeline_id)
              : "",
            lead_pipeline_stage_id: lead.lead_pipeline_stage_id
              ? String(lead.lead_pipeline_stage_id)
              : "",
            expected_close_date: lead.expected_close_date
              ? lead.expected_close_date.substring(0, 10)
              : "",
          });
          if (lead.organization_id) {
            setOrganizationId(String(lead.organization_id));
          }
          if (lead.person_id) {
            setPersonId(String(lead.person_id));
          }
          if (lead.custom_attributes) {
            if (typeof lead.custom_attributes === "object") {
              setCustomAttributes(lead.custom_attributes);
            } else if (typeof lead.custom_attributes === "string") {
              try {
                setCustomAttributes(JSON.parse(lead.custom_attributes));
              } catch {
                setCustomAttributes({});
              }
            }
          }
          fetchStages(lead.lead_pipeline_id || undefined);
        }
        setLoading(false);
      });

      useLeadStore
        .getState()
        .fetchLeadProducts(Number(id))
        .then(() => {
          const prods = useLeadStore.getState().leadProducts;
          if (Array.isArray(prods) && prods.length > 0) {
            setProductRows(
              prods.map((lp: any) => ({
                id: lp.id,
                product_id: String(lp.product_id || lp.id || ""),
                product_name: lp.product_name || lp.name || "",
                quantity: String(lp.quantity || 1),
                price: String(lp.price || 0),
                warehouse_id: lp.warehouse_id ? String(lp.warehouse_id) : "",
                warehouse_location_id: lp.warehouse_location_id
                  ? String(lp.warehouse_location_id)
                  : "",
                is_recurring: Boolean(lp.is_recurring),
                billing_cycle: lp.billing_cycle || "monthly",
                contract_duration: lp.contract_duration
                  ? String(lp.contract_duration)
                  : "12",
                contract_start_date: lp.contract_start_date
                  ? String(lp.contract_start_date).substring(0, 10)
                  : "",
                contract_end_date: lp.contract_end_date
                  ? String(lp.contract_end_date).substring(0, 10)
                  : "",
              })),
            );
          } else {
            const todayStr = new Date().toISOString().split("T")[0];
            setProductRows([
              {
                product_id: "",
                product_name: "",
                quantity: "1",
                price: "0",
                warehouse_id: "",
                warehouse_location_id: "",
                is_recurring: false,
                billing_cycle: "monthly",
                contract_duration: "12",
                contract_start_date: todayStr,
                contract_end_date: computeContractEndDate(todayStr, "12"),
              },
            ]);
          }
        })
        .catch(() => {
          const todayStr = new Date().toISOString().split("T")[0];
          setProductRows([
            {
              product_id: "",
              product_name: "",
              quantity: "1",
              price: "0",
              warehouse_id: "",
              warehouse_location_id: "",
              is_recurring: false,
              billing_cycle: "monthly",
              contract_duration: "12",
              contract_start_date: todayStr,
              contract_end_date: computeContractEndDate(todayStr, "12"),
            },
          ]);
        });
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        personDropdownRef.current &&
        !personDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPersonDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (personId && persons.length > 0) {
      const p = persons.find((item) => String(item.id) === String(personId));
      if (p) {
        setPersonName(p.name || "");
        setPersonSearch(p.name || "");
        setContactEmails(parseContactItems(p.emails, "Work"));
        setContactPhones(parseContactItems(p.contact_numbers, "Work"));
        if (!organizationId && p.organization_id) {
          setOrganizationId(String(p.organization_id));
        }
      }
    }
  }, [personId, persons]);

  useEffect(() => {
    if (details.lead_pipeline_id) {
      fetchStages(Number(details.lead_pipeline_id));
    }
  }, [details.lead_pipeline_id]);

  const scrollToSection = (sectionId: string) => {
    setActiveTab(sectionId);
    const el = sectionRefs.current[sectionId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearError = (...fields: string[]) => {
    setErrors((prev) => {
      let hasChange = false;
      const updated = { ...prev };
      fields.forEach((f) => {
        if (updated[f]) {
          delete updated[f];
          hasChange = true;
        }
      });
      return hasChange ? updated : prev;
    });
  };

  const handleSelectPerson = (p: any) => {
    setPersonId(String(p.id));
    setPersonName(p.name || "");
    setPersonSearch(p.name || "");
    setContactEmails(parseContactItems(p.emails, "Work"));
    setContactPhones(parseContactItems(p.contact_numbers, "Work"));
    if (p.organization_id) {
      setOrganizationId(String(p.organization_id));
    } else {
      setOrganizationId("");
    }
    clearError("personName", "contactEmail");
    setIsPersonDropdownOpen(false);
  };

  const handleClearPerson = () => {
    setPersonId("");
    setPersonName("");
    setPersonSearch("");
    setContactEmails([{ label: "Work", value: "" }]);
    setContactPhones([{ label: "Work", value: "" }]);
    setOrganizationId("");
  };

  const handleAddEmailRow = () => {
    setContactEmails((prev) => [...prev, { label: "Work", value: "" }]);
  };

  const handleEmailChange = (
    index: number,
    field: "label" | "value",
    val: string,
  ) => {
    setContactEmails((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveEmailRow = (index: number) => {
    if (contactEmails.length <= 1) {
      setContactEmails([{ label: "Work", value: "" }]);
    } else {
      setContactEmails((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddPhoneRow = () => {
    setContactPhones((prev) => [...prev, { label: "Work", value: "" }]);
  };

  const handlePhoneChange = (
    index: number,
    field: "label" | "value",
    val: string,
  ) => {
    const cleanVal =
      field === "value" ? val.replace(/[^0-9+\-\s()]/g, "") : val;
    setContactPhones((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: cleanVal };
      return updated;
    });
  };

  const handleRemovePhoneRow = (index: number) => {
    if (contactPhones.length <= 1) {
      setContactPhones([{ label: "Work", value: "" }]);
    } else {
      setContactPhones((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Products helpers
  const addProductRow = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setProductRows((rows) => [
      ...rows,
      {
        product_id: "",
        product_name: "",
        quantity: "1",
        price: "0",
        is_recurring: false,
        billing_cycle: "monthly",
        contract_duration: "12",
        contract_start_date: todayStr,
        contract_end_date: computeContractEndDate(todayStr, "12"),
      },
    ]);
  };

  const removeProductRow = (index: number) => {
    setProductRows((rows) => rows.filter((_, i) => i !== index));
    clearError("products", `product_${index}`, `quantity_${index}`, `price_${index}`);
  };

  const updateProductRow = (
    index: number,
    field: keyof ProductRow,
    value: any,
  ) => {
    setProductRows((rows) => {
      const updated = [...rows];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "billing_cycle") {
        const adjustedDuration = getAdjustedDurationForCycle(
          value,
          updated[index].contract_duration,
        );
        updated[index].contract_duration = adjustedDuration;
        if (updated[index].contract_start_date) {
          updated[index].contract_end_date = computeContractEndDate(
            updated[index].contract_start_date,
            adjustedDuration,
          );
        }
      }

      if (field === "is_recurring" && value) {
        const todayStr = new Date().toISOString().split("T")[0];
        if (!updated[index].contract_start_date) {
          updated[index].contract_start_date = todayStr;
        }
        if (!updated[index].contract_duration) {
          updated[index].contract_duration = "12";
        }
        if (!updated[index].contract_end_date) {
          updated[index].contract_end_date = computeContractEndDate(
            updated[index].contract_start_date,
            updated[index].contract_duration,
          );
        }
      }

      if (field === "contract_start_date") {
        updated[index].contract_end_date = computeContractEndDate(
          value,
          updated[index].contract_duration || "12",
        );
      }

      if (field === "contract_duration") {
        if (updated[index].contract_start_date) {
          updated[index].contract_end_date = computeContractEndDate(
            updated[index].contract_start_date,
            value,
          );
        }
      }

      return updated;
    });
    clearError("products", `product_${index}`, `quantity_${index}`, `price_${index}`);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((p) => String(p.id) === productId);
    const isService =
      product?.type === "Service" || product?.type?.toLowerCase() === "service";
    setProductRows((rows) => {
      const updated = [...rows];
      const todayStr = new Date().toISOString().split("T")[0];
      const duration = updated[index]?.contract_duration || "12";
      const startDate = updated[index]?.contract_start_date || todayStr;
      const endDate =
        updated[index]?.contract_end_date ||
        computeContractEndDate(startDate, duration);

      updated[index] = {
        ...updated[index],
        product_id: productId,
        product_name: product?.name || "",
        price: String(product?.price ?? 0),
        quantity: isService ? "1" : updated[index]?.quantity || "1",
        warehouse_id: "",
        warehouse_location_id: "",
        inventories: [],
        is_recurring: isService
          ? true
          : (updated[index]?.is_recurring ?? false),
        billing_cycle: updated[index]?.billing_cycle || "monthly",
        contract_duration: duration,
        contract_start_date: startDate,
        contract_end_date: endDate,
      };
      return updated;
    });

    if (productId) {
      useProductStore
        .getState()
        .fetchProductById(Number(productId))
        .then((productData) => {
          if (productData && Array.isArray(productData.inventories)) {
            const invs = productData.inventories;
            setProductRows((rows) => {
              const next = [...rows];
              if (
                next[index] &&
                String(next[index].product_id) === String(productId)
              ) {
                next[index] = { ...next[index], inventories: invs };
              }
              return next;
            });
          }
        })
        .catch(() => {});
    }

    clearError("products", `product_${index}`, `quantity_${index}`, `price_${index}`);
  };

  const handleSplitProductRow = (
    idx: number,
    maxQty: number,
    remainingQty: number,
  ) => {
    setProductRows((rows) => {
      const next = [...rows];
      const currentRow = next[idx];
      next[idx] = { ...currentRow, quantity: String(maxQty) };

      const newRow: ProductRow = {
        product_id: currentRow.product_id,
        product_name: currentRow.product_name,
        price: currentRow.price,
        quantity: String(remainingQty),
        warehouse_id: "",
        warehouse_location_id: "",
        inventories: currentRow.inventories,
        is_recurring: currentRow.is_recurring,
        billing_cycle: currentRow.billing_cycle,
        contract_duration: currentRow.contract_duration,
        contract_start_date: currentRow.contract_start_date,
        contract_end_date: currentRow.contract_end_date,
      };

      next.splice(idx + 1, 0, newRow);
      return next;
    });
  };

  const triggerStockShortagePopup = (
    idx: number,
    locStock: number,
    shortageQty: number,
  ) => {
    Swal.fire({
      title: "Stock Shortage Warning",
      html: `
        <div class="text-left space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>Selected location only has <strong class="text-amber-600">${locStock} unit(s)</strong> in stock.</p>
          <p>Would you like to keep <strong>${locStock} unit(s)</strong> in this location and add another row with the remaining <strong>${shortageQty} unit(s)</strong> to select another location?</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0088cc",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `+ Deduct remaining ${shortageQty} from another location`,
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        handleSplitProductRow(idx, locStock, shortageQty);
      }
    });
  };

  const calculateRowTotal = (row: ProductRow, isService: boolean = false) => {
    const qty = isService ? 1 : parseFloat(row.quantity) || 0;
    const price = parseFloat(row.price) || 0;
    if (!row.is_recurring) {
      return qty * price;
    }
    const cycle = (row.billing_cycle || "monthly").toLowerCase();
    const durationMonths = parseInt(row.contract_duration || "12", 10) || 1;
    let cycles = durationMonths;
    if (cycle === "yearly" || cycle === "annually") {
      cycles = Math.max(1, Math.round(durationMonths / 12));
    } else if (cycle === "half-yearly") {
      cycles = Math.max(1, Math.round(durationMonths / 6));
    } else if (cycle === "quarterly") {
      cycles = Math.max(1, Math.round(durationMonths / 3));
    } else {
      cycles = durationMonths;
    }
    return qty * price * cycles;
  };

  const totalLeadValue = productRows.reduce((runningTotal, row) => {
    const selectedProd = products.find(
      (prod) => String(prod.id) === String(row.product_id),
    );
    const isService =
      selectedProd?.type?.toLowerCase() === "service" ||
      selectedProd?.type === "Service";
    return runningTotal + calculateRowTotal(row, isService);
  }, 0);

  const oneTimeTotal = productRows.reduce((sum, row) => {
    if (row.is_recurring) return sum;
    const selectedProd = products.find(
      (prod) => String(prod.id) === String(row.product_id),
    );
    const isService =
      selectedProd?.type?.toLowerCase() === "service" ||
      selectedProd?.type === "Service";
    return sum + calculateRowTotal(row, isService);
  }, 0);

  const mrrTotal = productRows.reduce((sum, row) => {
    if (!row.is_recurring) return sum;
    const selectedProd = products.find(
      (prod) => String(prod.id) === String(row.product_id),
    );
    const isService =
      selectedProd?.type?.toLowerCase() === "service" ||
      selectedProd?.type === "Service";
    const qty = isService ? 1 : parseFloat(row.quantity) || 0;
    const price = parseFloat(row.price) || 0;
    const cycleRate = qty * price;
    const cycle = (row.billing_cycle || "monthly").toLowerCase();
    if (cycle === "yearly" || cycle === "annually") return sum + cycleRate / 12;
    if (cycle === "half-yearly") return sum + cycleRate / 6;
    if (cycle === "quarterly") return sum + cycleRate / 3;
    return sum + cycleRate;
  }, 0);

  const filteredPersons = persons.filter((person) => {
    if (!personSearch) return true;
    if (
      personId &&
      personSearch ===
        (persons.find((item) => String(item.id) === String(personId))?.name ||
          "")
    )
      return true;
    const query = personSearch.toLowerCase().trim();
    const name = (person.name || "").toLowerCase();
    const email = getPersonEmail(person).toLowerCase();
    const phone = getPersonPhone(person).toLowerCase();
    const organizationName = getPersonOrg(person, organizations).toLowerCase();
    return (
      name.includes(query) ||
      email.includes(query) ||
      phone.includes(query) ||
      organizationName.includes(query)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors: Record<string, string> = {};

    if (!details.title.trim()) {
      fieldErrors.title = "Title is required";
    }

    if (!personId && !personName.trim()) {
      fieldErrors.personName = "Contact Person Name is required";
    }

    const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
    const firstEmail = contactEmails[0]?.value?.trim();
    if (!firstEmail) {
      fieldErrors.contactEmail = "Contact Person Email is required";
    } else if (!strictEmailRegex.test(firstEmail)) {
      fieldErrors.contactEmail = "Please enter a valid email address without trailing dots (e.g. name@domain.com)";
    }

    contactEmails.forEach((ce, idx) => {
      const val = ce.value?.trim();
      if (val && !strictEmailRegex.test(val)) {
        fieldErrors[`contactEmail_${idx}`] = "Please enter a valid email address (e.g. name@domain.com)";
      }
    });

    // Product rows validation - At least one product is required
    const hasAnyValidProduct = productRows.some((r) => r.product_id);
    if (!hasAnyValidProduct) {
      fieldErrors.products = "At least one product is required";
      if (productRows.length > 0) {
        fieldErrors.product_0 = "Please select a product";
      }
    }

    productRows.forEach((row, idx) => {
      if (!row.product_id) {
        fieldErrors[`product_${idx}`] = "Please select a product";
      }
      const selectedProd = products.find(
        (p) => String(p.id) === String(row.product_id),
      );
      const isService =
        selectedProd?.type?.toLowerCase() === "service" ||
        selectedProd?.type === "Service";
      if (!isService) {
        const qty = Number(row.quantity);
        if (isNaN(qty) || qty <= 0) {
          fieldErrors[`quantity_${idx}`] = "Quantity must be at least 1";
        }
      }
      const price = Number(row.price);
      if (isNaN(price) || price < 0) {
        fieldErrors[`price_${idx}`] = "Price cannot be negative";
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      if (fieldErrors.title) {
        scrollToSection("lead-details");
      } else if (fieldErrors.personName || fieldErrors.contactEmail) {
        scrollToSection("contact-person");
      } else {
        scrollToSection("products");
      }
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const validProducts = productRows
        .filter((r) => r.product_id)
        .map((r) => {
          const selectedProd = products.find(
            (p) => String(p.id) === String(r.product_id),
          );
          const isService =
            selectedProd?.type?.toLowerCase() === "service" ||
            selectedProd?.type === "Service";
          return {
            product_id: Number(r.product_id),
            quantity: isService ? 1 : Number(r.quantity) || 1,
            price: parseFloat(r.price) || 0,
            warehouse_id: isService
              ? undefined
              : r.warehouse_id
                ? Number(r.warehouse_id)
                : undefined,
            warehouse_location_id: isService
              ? undefined
              : r.warehouse_location_id
                ? Number(r.warehouse_location_id)
                : undefined,
            is_recurring: Boolean(r.is_recurring),
            billing_cycle: r.is_recurring
              ? r.billing_cycle || "monthly"
              : undefined,
            contract_duration: r.is_recurring
              ? Number(r.contract_duration) || 12
              : 1,
            contract_start_date: r.is_recurring
              ? r.contract_start_date || undefined
              : undefined,
            contract_end_date: r.is_recurring
              ? r.contract_end_date || undefined
              : undefined,
          };
        });

      const leadValue =
        validProducts.length > 0
          ? totalLeadValue
          : details.lead_value
            ? Number(details.lead_value)
            : undefined;

      const payload: any = {
        title: details.title.trim(),
        description: details.description || undefined,
        lead_value: leadValue,
        status: details.status === "true",
        lost_reason: details.lost_reason || undefined,
        user_id: details.user_id ? Number(details.user_id) : undefined,
        lead_source_id: details.lead_source_id
          ? Number(details.lead_source_id)
          : undefined,
        lead_type_id: details.lead_type_id
          ? Number(details.lead_type_id)
          : undefined,
        lead_pipeline_id: details.lead_pipeline_id
          ? Number(details.lead_pipeline_id)
          : undefined,
        lead_pipeline_stage_id: details.lead_pipeline_stage_id
          ? Number(details.lead_pipeline_stage_id)
          : undefined,
        expected_close_date: details.expected_close_date || undefined,
        organization_id: organizationId ? Number(organizationId) : undefined,
        products: validProducts,
        custom_attributes: customAttributes,
      };

      if (personId) {
        payload.person_id = Number(personId);
      } else if (personName.trim()) {
        const validEmails = contactEmails.filter((e) => e.value.trim());
        const validPhones = contactPhones.filter((p) => p.value.trim());
        payload.person = {
          name: personName.trim(),
          emails: validEmails.length > 0 ? validEmails : undefined,
          contact_numbers: validPhones.length > 0 ? validPhones : undefined,
          organization_id: organizationId ? Number(organizationId) : undefined,
        };
      }

      await updateLead(Number(id), payload);

      if (id) {
        await useTagStore
          .getState()
          .saveEntityTags("lead", Number(id), selectedTagIds);
      }

      navigate("/leads");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to update lead", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[#0088cc] dark:focus:border-[#0088cc] rounded-xl text-xs sm:text-sm font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-100 placeholder-gray-400";
  const labelCls =
    "block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5";

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading lead details...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link
          to="/dashboard"
          className="text-[#0e90d9] hover:underline flex items-center gap-1"
        >
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/leads" className="text-[#0e90d9] hover:underline">
          Leads
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          Edit Lead #{id}
        </span>
      </div>

      {/* 🏷️ Page Header with Actions & Live Total */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/leads"
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-[#0e90d9] flex items-center justify-center transition shadow-2xs shrink-0"
            title="Back to Leads"
          >
            <i className="mgc_arrow_left_line text-lg"></i>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Edit Lead
              </h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-[#0088cc] dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                #LD-{id}
              </span>
            </div>
            {details.title && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                {details.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end shrink-0">
          <div className="hidden md:flex flex-col text-right pr-3 border-r border-gray-200 dark:border-gray-700">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Total Value
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(
                totalLeadValue > 0
                  ? totalLeadValue
                  : parseFloat(details.lead_value) || 0,
              )}
            </span>
          </div>

          <Link
            to="/leads"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2 active:scale-98"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <i className="mgc_check_line text-base"></i>
            )}
            <span>Save Lead</span>
          </button>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* 📋 CARD 1: LEAD INFORMATION */}
        <div
          id="lead-details"
          ref={(el) => {
            sectionRefs.current["lead-details"] = el;
          }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0088cc] flex items-center justify-center font-bold">
              <i className="mgc_document_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Lead Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Basic opportunity details, pipeline, and valuation
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Title */}
            <div className="md:col-span-2 lg:col-span-4">
              <label className={labelCls}>
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={details.title}
                onChange={(e) => {
                  setDetails({ ...details, title: e.target.value });
                  clearError("title");
                }}
                className={`${inputCls} ${errors.title ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Sales Owner Dropdown */}
            <div>
              <label className={labelCls}>Sales Owner</label>
              <select
                value={details.user_id}
                onChange={(e) =>
                  setDetails({ ...details, user_id: e.target.value })
                }
                className={inputCls}
              >
                <option value="">-- Select Sales Owner --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Value */}
            <div>
              <label className={labelCls}>Lead Value (₹)</label>
              <input
                type="number"
                step="0.01"
                value={details.lead_value}
                onChange={(e) =>
                  setDetails({ ...details, lead_value: e.target.value })
                }
                className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
              {totalLeadValue > 0 && (
                <p className="text-xs text-[#0088cc] mt-1 font-medium">
                  Auto from products: {fmtCurrency(totalLeadValue)}
                </p>
              )}
            </div>

            {/* Expected Close Date */}
            <div>
              <label className={labelCls}>Expected Close Date</label>
              <input
                type="date"
                value={details.expected_close_date}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    expected_close_date: e.target.value,
                  })
                }
                className={inputCls}
              />
            </div>

            {/* Lead Source */}
            <div>
              <label className={labelCls}>Lead Source</label>
              <select
                value={details.lead_source_id}
                onChange={(e) =>
                  setDetails({ ...details, lead_source_id: e.target.value })
                }
                className={inputCls}
              >
                <option value="">Select Source</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Type */}
            <div>
              <label className={labelCls}>Lead Type</label>
              <select
                value={details.lead_type_id}
                onChange={(e) =>
                  setDetails({ ...details, lead_type_id: e.target.value })
                }
                className={inputCls}
              >
                <option value="">Select Type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pipeline */}
            <div>
              <label className={labelCls}>Pipeline</label>
              <select
                value={details.lead_pipeline_id}
                onChange={(e) =>
                  setDetails({ ...details, lead_pipeline_id: e.target.value })
                }
                className={inputCls}
              >
                <option value="">Select Pipeline</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div>
              <label className={labelCls}>Stage</label>
              <select
                value={details.lead_pipeline_stage_id}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    lead_pipeline_stage_id: e.target.value,
                  })
                }
                className={inputCls}
                disabled={!details.lead_pipeline_id}
              >
                <option value="">Select Stage</option>
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2 lg:col-span-4">
              <label className={labelCls}>Description</label>
              <textarea
                rows={4}
                value={details.description}
                onChange={(e) =>
                  setDetails({ ...details, description: e.target.value })
                }
                className={inputCls}
              />
            </div>

            {/* Tags */}
            <div className="md:col-span-2 lg:col-span-4">
              <label className={labelCls}>Tags</label>
              <TagPicker
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
              />
            </div>
          </div>
        </div>

        {/* 👤 CARD 2: CONTACT PERSON */}
        <div
          id="contact-person"
          ref={(el) => {
            sectionRefs.current["contact-person"] = el;
          }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center font-bold">
              <i className="mgc_user_3_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Contact Person
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Information about the primary contact person and organization
              </p>
            </div>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name * Searchable Dropdown */}
            <div className="relative" ref={personDropdownRef}>
              <label className={labelCls}>
                Name <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={personSearch}
                  onFocus={() => setIsPersonDropdownOpen(true)}
                  onChange={(e) => {
                    setPersonSearch(e.target.value);
                    setPersonName(e.target.value);
                    if (personId) setPersonId("");
                    clearError("personName");
                    setIsPersonDropdownOpen(true);
                  }}
                  placeholder="Click to Add"
                  className={`${inputCls} pr-8 ${errors.personName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                />
                {personSearch ? (
                  <button
                    type="button"
                    onClick={handleClearPerson}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="absolute right-3 text-gray-400 pointer-events-none text-xs">
                    ▼
                  </span>
                )}
              </div>
              {errors.personName && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.personName}
                </p>
              )}

              {/* Dropdown popup */}
              {isPersonDropdownOpen && (
                <div className="absolute z-30 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filteredPersons.length > 0 ? (
                    filteredPersons.map((p) => {
                      const email = getPersonEmail(p);
                      const phone = getPersonPhone(p);
                      const org = getPersonOrg(p, organizations);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPerson(p)}
                          className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex flex-col border-b last:border-b-0 border-gray-100 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {p.name}
                              {org && (
                                <span className="text-gray-500 dark:text-gray-400 font-normal">
                                  {" "}
                                  • {org}
                                </span>
                              )}
                            </span>
                          </div>
                          {(email || phone) && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {email && <span>{email}</span>}
                              {email && phone && <span>•</span>}
                              {phone && <span>{phone}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      No contacts found. Type a name to create a new contact.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Organization */}
            <div>
              <label className={labelCls}>Organization</label>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className={inputCls}
              >
                <option value="">Click to add</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Email * */}
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                Email <span className="text-red-500">*</span>
              </label>
              {contactEmails.map((em, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={`flex-1 flex border rounded-lg overflow-hidden bg-white dark:bg-gray-900 focus-within:ring-1 ${
                      errors.contactEmail
                        ? "border-red-500 focus-within:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus-within:ring-[#0088cc]"
                    }`}
                  >
                    <input
                      type="email"
                      value={em.value}
                      onChange={(e) => {
                        handleEmailChange(idx, "value", e.target.value);
                        clearError("contactEmail");
                      }}
                      placeholder=""
                      className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none dark:text-gray-200"
                    />
                    <select
                      value={em.label}
                      onChange={(e) =>
                        handleEmailChange(idx, "label", e.target.value)
                      }
                      className="w-20 sm:w-24 px-2 sm:px-3 py-2 bg-gray-50 dark:bg-gray-800 border-l border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer shrink-0"
                    >
                      <option value="Work">Work</option>
                      <option value="Home">Home</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {contactEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmailRow(idx)}
                      className="text-red-500 hover:text-red-700 px-2 py-1 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Remove email"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {errors.contactEmail && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.contactEmail}
                </p>
              )}
              <button
                type="button"
                onClick={handleAddEmailRow}
                className="self-start text-xs font-semibold text-[#0088cc] hover:underline flex items-center gap-1 mt-0.5"
              >
                + Add More
              </button>
            </div>

            {/* Contact Number */}
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Contact Number</label>
              {contactPhones.map((pn, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1 flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-900 focus-within:ring-1 focus-within:ring-[#0088cc]">
                    <input
                      type="tel"
                      value={pn.value}
                      onChange={(e) =>
                        handlePhoneChange(idx, "value", e.target.value)
                      }
                      placeholder=""
                      className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none dark:text-gray-200"
                    />
                    <select
                      value={pn.label}
                      onChange={(e) =>
                        handlePhoneChange(idx, "label", e.target.value)
                      }
                      className="w-20 sm:w-24 px-2 sm:px-3 py-2 bg-gray-50 dark:bg-gray-800 border-l border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer shrink-0"
                    >
                      <option value="Work">Work</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Home">Home</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {contactPhones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoneRow(idx)}
                      className="text-red-500 hover:text-red-700 px-2 py-1 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Remove phone"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPhoneRow}
                className="self-start text-xs font-semibold text-[#0088cc] hover:underline flex items-center gap-1 mt-0.5"
              >
                + Add More
              </button>
            </div>

            {/* Organization */}
            <div>
              <label className={labelCls}>Organization</label>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className={inputCls}
              >
                <option value="">Click to add</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Organization Contacts List */}
            {(() => {
              const orgContacts = organizationId
                ? persons.filter(
                    (p) => String(p.organization_id) === String(organizationId),
                  )
                : [];
              if (orgContacts.length === 0) return null;
              const orgObj = organizations.find(
                (o) => String(o.id) === String(organizationId),
              );

              return (
                <div className="mt-2 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <i className="mgc_group_line text-sm text-[#0088cc]"></i>
                        Organization Contacts ({orgContacts.length})
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        {orgObj?.name
                          ? `Contacts associated with ${orgObj.name}`
                          : "Contacts associated with this organization"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {orgContacts.map((contact) => {
                      const isPrimary = String(contact.id) === String(personId);
                      const cEmail = getPersonEmail(contact);
                      const cPhone = getPersonPhone(contact);

                      return (
                        <div
                          key={contact.id}
                          className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
                            isPrimary
                              ? "bg-blue-50/80 border-[#0088cc] dark:bg-blue-900/20 dark:border-blue-700 shadow-sm"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isPrimary
                                    ? "bg-[#0088cc] text-white"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {contact.name?.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
                                  {contact.name}
                                </p>
                                {contact.job_title && (
                                  <p className="text-[10px] text-gray-500 font-medium">
                                    {contact.job_title}
                                  </p>
                                )}
                              </div>
                            </div>

                            {isPrimary ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0088cc] text-white rounded-full shrink-0">
                                Primary
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectPerson(contact)}
                                className="px-2 py-0.5 text-[10px] font-semibold text-[#0088cc] border border-[#0088cc] rounded hover:bg-[#0088cc] hover:text-white transition-colors shrink-0"
                              >
                                Set Primary
                              </button>
                            )}
                          </div>

                          <div className="text-[11px] text-gray-500 space-y-0.5 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                            {cPhone && (
                              <p className="flex items-center gap-1">
                                <i className="mgc_phone_line text-gray-400 text-xs"></i>
                                {cPhone}
                              </p>
                            )}
                            {cEmail && (
                              <p className="flex items-center gap-1">
                                <i className="mgc_mail_line text-gray-400 text-xs"></i>
                                {cEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ⚙️ CARD 3: CUSTOM FIELDS */}
        <div
          id="custom-attributes"
          ref={(el) => {
            sectionRefs.current["custom-attributes"] = el;
          }}
        >
          <DynamicAttributeFields
            entityType="leads"
            values={customAttributes}
            onChange={(code, val) =>
              setCustomAttributes((prev) => ({ ...prev, [code]: val }))
            }
            onAttributesLoaded={(attrs) =>
              setHasCustomAttributes(attrs.length > 0)
            }
            containerClassName="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5"
          />
        </div>

        {/* 📦 CARD 4: PRODUCTS */}
        <div
          id="products"
          ref={(el) => {
            sectionRefs.current["products"] = el;
          }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center font-bold">
                <i className="mgc_box_line text-lg"></i>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Products ({productRows.filter((r) => r.product_id).length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Attach products to automatically calculate the total deal
                  value
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={addProductRow}
              className="px-3 py-1.5 bg-[#0e90d9]/10 hover:bg-[#0e90d9]/20 text-[#0e90d9] rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <i className="mgc_add_line text-sm"></i>
              <span>Add Product</span>
            </button>
          </div>

          {errors.products && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
              <i className="mgc_alert_line text-base shrink-0"></i>
              <span>{errors.products}</span>
            </div>
          )}

          {(() => {
            const hasPhysicalProduct = productRows.some((r) => {
              if (!r.product_id) return true;
              const prod = products.find(
                (p) => String(p.id) === String(r.product_id),
              );
              return (
                prod &&
                prod.type !== "Service" &&
                prod.type?.toLowerCase() !== "service"
              );
            });

            const getRowData = (row: any, index: number) => {
              const selectedProd = products.find(
                (p) => String(p.id) === String(row.product_id),
              );
              const isService =
                selectedProd?.type?.toLowerCase() === "service" ||
                selectedProd?.type === "Service";
              const effectiveQty = isService
                ? 1
                : parseFloat(row.quantity) || 0;
              const unitPrice = parseFloat(row.price) || 0;
              const cycleAmount = effectiveQty * unitPrice;
              const rowAmount = calculateRowTotal(row, isService);

              const cycle = (row.billing_cycle || "monthly").toLowerCase();
              const durationMonths =
                parseInt(row.contract_duration || "12", 10) || 1;
              let cyclesCount = durationMonths;
              if (cycle === "yearly" || cycle === "annually") {
                cyclesCount = Math.max(1, Math.round(durationMonths / 12));
              } else if (cycle === "half-yearly") {
                cyclesCount = Math.max(1, Math.round(durationMonths / 6));
              } else if (cycle === "quarterly") {
                cyclesCount = Math.max(1, Math.round(durationMonths / 3));
              }

              const prodErr = errors[`product_${index}`];
              const qtyErr = errors[`quantity_${index}`];
              const priceErr = errors[`price_${index}`];

              // Dependent Warehouses for selected product
              const productInventories = row.inventories || [];
              const hasInvRecords = productInventories.length > 0;
              const validWarehouseIds = new Set(
                productInventories
                  .map((inv: any) => Number(inv.warehouse_id))
                  .filter(Boolean),
              );

              // Helper: calculate quantity already used in OTHER rows for same product & location/warehouse
              const getUsedQtyInOtherRows = (
                locId?: string | number,
                wId?: string | number,
              ) => {
                if (!row.product_id) return 0;
                return productRows.reduce((sum, r, rIdx) => {
                  if (rIdx === index) return sum;
                  if (String(r.product_id) !== String(row.product_id))
                    return sum;
                  if (
                    locId &&
                    String(r.warehouse_location_id) === String(locId)
                  ) {
                    return sum + (parseFloat(r.quantity) || 0);
                  }
                  if (!locId && wId && String(r.warehouse_id) === String(wId)) {
                    return sum + (parseFloat(r.quantity) || 0);
                  }
                  return sum;
                }, 0);
              };

              const availableWarehouses = warehouses.filter((w) => {
                if (
                  !row.product_id ||
                  !hasInvRecords ||
                  validWarehouseIds.size === 0
                )
                  return true;
                return validWarehouseIds.has(Number(w.id));
              });

              const getWarehouseLabel = (w: any) => {
                if (!row.product_id || !hasInvRecords) return w.name;
                const invsForW = productInventories.filter(
                  (inv: any) => Number(inv.warehouse_id) === Number(w.id),
                );
                const dbTotalStock = invsForW.reduce(
                  (sum: number, inv: any) => sum + (Number(inv.in_stock) || 0),
                  0,
                );
                const usedOther = getUsedQtyInOtherRows(undefined, w.id);
                const availStock = Math.max(0, dbTotalStock - usedOther);
                return availStock > 0
                  ? `${w.name} (Stock: ${availStock})`
                  : `${w.name} (Out of Stock)`;
              };

              // Dependent Locations for selected warehouse
              const selectedW = warehouses.find(
                (w) => String(w.id) === String(row.warehouse_id),
              );
              const allLocations = selectedW?.locations || [];
              const locInvsForW = productInventories.filter(
                (inv: any) =>
                  Number(inv.warehouse_id) === Number(row.warehouse_id),
              );
              const validLocationIds = new Set(
                locInvsForW
                  .map((inv: any) => Number(inv.warehouse_location_id))
                  .filter(Boolean),
              );

              const availableLocations = allLocations.filter((loc: any) => {
                if (
                  !row.product_id ||
                  !hasInvRecords ||
                  validLocationIds.size === 0
                )
                  return true;
                return validLocationIds.has(Number(loc.id));
              });

              const getLocationLabel = (loc: any) => {
                if (!row.product_id || !hasInvRecords) return loc.name;
                const invForLoc = locInvsForW.find(
                  (inv: any) =>
                    Number(inv.warehouse_location_id) === Number(loc.id),
                );
                if (!invForLoc) return loc.name;
                const dbLocStock = Number(invForLoc.in_stock) || 0;
                const usedOther = getUsedQtyInOtherRows(loc.id);
                const availStock = Math.max(0, dbLocStock - usedOther);
                return availStock > 0
                  ? `${loc.name} (Stock: ${availStock})`
                  : `${loc.name} (Out of Stock - 0 left)`;
              };

              const invForLoc = locInvsForW.find(
                (inv: any) =>
                  Number(inv.warehouse_location_id) ===
                  Number(row.warehouse_location_id),
              );
              const dbLocStock = invForLoc
                ? Number(invForLoc.in_stock) || 0
                : null;
              const usedOtherLoc =
                dbLocStock !== null && row.warehouse_location_id
                  ? getUsedQtyInOtherRows(row.warehouse_location_id)
                  : 0;
              const locStock =
                dbLocStock !== null
                  ? Math.max(0, dbLocStock - usedOtherLoc)
                  : null;
              const reqQty = Number(row.quantity || 0);
              const isStockShortage =
                !isService &&
                Boolean(row.warehouse_location_id) &&
                locStock !== null &&
                reqQty > locStock;
              const shortageQty =
                isStockShortage && locStock !== null ? reqQty - locStock : 0;

              return {
                selectedProd,
                isService,
                effectiveQty,
                unitPrice,
                cycleAmount,
                rowAmount,
                cyclesCount,
                durationMonths,
                prodErr,
                qtyErr,
                priceErr,
                availableWarehouses,
                getWarehouseLabel,
                availableLocations,
                getLocationLabel,
                locStock,
                isStockShortage,
                shortageQty,
              };
            };

            return (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                        <th className="py-2.5 px-3 min-w-[220px]">
                          Product / Service{" "}
                          <span className="text-red-500">*</span>
                        </th>
                        {hasPhysicalProduct && (
                          <th className="py-2.5 px-3 w-44">Warehouse</th>
                        )}
                        {hasPhysicalProduct && (
                          <th className="py-2.5 px-3 w-44">Location</th>
                        )}
                        {hasPhysicalProduct && (
                          <th className="py-2.5 px-3 w-24">Qty</th>
                        )}
                        <th className="py-2.5 px-3 w-32">Price (₹)</th>
                        <th className="py-2.5 px-3 w-36 text-right">Amount</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {productRows.map((row, index) => {
                        const {
                          isService,
                          unitPrice,
                          cycleAmount,
                          rowAmount,
                          cyclesCount,
                          durationMonths,
                          prodErr,
                          qtyErr,
                          priceErr,
                          availableWarehouses,
                          getWarehouseLabel,
                          availableLocations,
                          getLocationLabel,
                          locStock,
                          isStockShortage,
                          shortageQty,
                        } = getRowData(row, index);

                        const colSpanTotal = hasPhysicalProduct ? 7 : 4;

                        return (
                          <React.Fragment key={index}>
                            {/* Tier 1: Main Product & Pricing Row */}
                            <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="py-2.5 px-3 align-top">
                                <select
                                  value={row.product_id}
                                  onChange={(e) =>
                                    selectProduct(index, e.target.value)
                                  }
                                  className={`${inputCls} pr-7 truncate ${prodErr ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                >
                                  <option value="">Select an item...</option>
                                  {row.product_id && !products.some((p) => String(p.id) === String(row.product_id)) && (
                                    <option key={row.product_id} value={row.product_id}>
                                      {row.product_name || `Product #${row.product_id}`}
                                    </option>
                                  )}
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} {p.sku ? `(${p.sku})` : ""}{" "}
                                      {p.type === "Service" ? "[Service]" : ""}
                                    </option>
                                  ))}
                                </select>
                                {prodErr && (
                                  <p className="mt-1 text-xs text-red-500 font-medium">
                                    {prodErr}
                                  </p>
                                )}
                              </td>

                              {hasPhysicalProduct && (
                                <td className="py-2.5 px-3 align-top">
                                  {isService ? (
                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic block pt-2 text-center">
                                      -
                                    </span>
                                  ) : (
                                    <select
                                      value={row.warehouse_id || ""}
                                      onChange={(e) => {
                                        updateProductRow(
                                          index,
                                          "warehouse_id",
                                          e.target.value,
                                        );
                                        updateProductRow(
                                          index,
                                          "warehouse_location_id",
                                          "",
                                        );
                                      }}
                                      className={`${inputCls} pr-7 truncate`}
                                    >
                                      <option value="">Select Warehouse</option>
                                      {availableWarehouses.map((w) => (
                                        <option key={w.id} value={w.id}>
                                          {getWarehouseLabel(w)}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                              )}

                              {hasPhysicalProduct && (
                                <td className="py-2.5 px-3 align-top">
                                  {isService ? (
                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic block pt-2 text-center">
                                      -
                                    </span>
                                  ) : (
                                    <select
                                      value={row.warehouse_location_id || ""}
                                      onChange={(e) =>
                                        updateProductRow(
                                          index,
                                          "warehouse_location_id",
                                          e.target.value,
                                        )
                                      }
                                      disabled={!row.warehouse_id}
                                      className={`${inputCls} pr-7 truncate disabled:opacity-50`}
                                    >
                                      <option value="">Select Location</option>
                                      {availableLocations.map((loc: any) => (
                                        <option key={loc.id} value={loc.id}>
                                          {getLocationLabel(loc)}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                              )}

                              {hasPhysicalProduct && (
                                <td className="py-2.5 px-3 align-top">
                                  {isService ? (
                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic block pt-2 text-center">
                                      -
                                    </span>
                                  ) : (
                                    <>
                                      <input
                                        type="number"
                                        min="1"
                                        value={row.quantity}
                                        onChange={(e) =>
                                          updateProductRow(
                                            index,
                                            "quantity",
                                            e.target.value,
                                          )
                                        }
                                        className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                          qtyErr || isStockShortage
                                            ? "border-amber-500 focus:border-amber-500 focus:ring-amber-500"
                                            : ""
                                        }`}
                                      />
                                      {qtyErr && (
                                        <p className="mt-1 text-xs text-red-500 font-medium">
                                          {qtyErr}
                                        </p>
                                      )}
                                      {isStockShortage &&
                                        locStock !== null &&
                                        (locStock > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              triggerStockShortagePopup(
                                                index,
                                                locStock,
                                                shortageQty,
                                              )
                                            }
                                            className="mt-1.5 w-full text-left p-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors flex flex-col gap-0.5"
                                          >
                                            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                                              ⚠️ Only {locStock} in stock
                                            </span>
                                            <span className="text-[#0088cc] hover:underline font-bold text-[11px]">
                                              + Deduct {shortageQty} from other
                                            </span>
                                          </button>
                                        ) : (
                                          <div className="mt-1.5 p-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded text-xs font-medium text-red-700 dark:text-red-300">
                                            ⚠️ Out of stock
                                          </div>
                                        ))}
                                    </>
                                  )}
                                </td>
                              )}

                              <td className="py-2.5 px-3 align-top">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.price}
                                  onChange={(e) =>
                                    updateProductRow(
                                      index,
                                      "price",
                                      e.target.value,
                                    )
                                  }
                                  disabled
                                  className={`${inputCls} bg-gray-100 dark:bg-gray-800/60 cursor-not-allowed text-gray-500 dark:text-gray-400 ${priceErr ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                />
                                {priceErr && (
                                  <p className="mt-1 text-xs text-red-500 font-medium">
                                    {priceErr}
                                  </p>
                                )}
                              </td>

                              <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200 align-top text-right pt-3">
                                <div>{fmtCurrency(rowAmount)}</div>
                                {row.is_recurring && (
                                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                                    {fmtCurrency(cycleAmount)} /{" "}
                                    {row.billing_cycle || "monthly"}
                                  </div>
                                )}
                              </td>

                              <td className="py-2 px-2 text-center align-top pt-2.5">
                                {productRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeProductRow(index)}
                                    className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Remove item"
                                  >
                                    <i className="mgc_delete_2_line text-base"></i>
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* Tier 2: Billing & Contract Details Sub-bar */}
                            <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-gray-200 dark:border-gray-700">
                              <td
                                colSpan={colSpanTotal}
                                className="px-3.5 py-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Billing:
                                      </span>
                                      {/* Segmented Pill Switch */}
                                      <div className="inline-flex p-0.5 rounded-lg bg-gray-200/80 dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (row.is_recurring)
                                              updateProductRow(
                                                index,
                                                "is_recurring",
                                                false,
                                              );
                                          }}
                                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                            !row.is_recurring
                                              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                                              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                          }`}
                                        >
                                          One-Time
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!row.is_recurring)
                                              updateProductRow(
                                                index,
                                                "is_recurring",
                                                true,
                                              );
                                          }}
                                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                                            row.is_recurring
                                              ? "bg-blue-600 text-white shadow-xs"
                                              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                          }`}
                                        >
                                          <i className="mgc_refresh_2_line text-xs"></i>
                                          Recurring
                                        </button>
                                      </div>
                                    </div>

                                    {row.is_recurring ? (
                                      <div className="flex flex-wrap items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                            Cycle:
                                          </span>
                                          <select
                                            value={
                                              row.billing_cycle || "monthly"
                                            }
                                            onChange={(e) =>
                                              updateProductRow(
                                                index,
                                                "billing_cycle",
                                                e.target.value,
                                              )
                                            }
                                            className="py-1 px-2.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                                          >
                                            <option value="monthly">
                                              Monthly
                                            </option>
                                            <option value="quarterly">
                                              Quarterly (3 Mo)
                                            </option>
                                            <option value="half-yearly">
                                              Half-Yearly (6 Mo)
                                            </option>
                                            <option value="yearly">
                                              Yearly (12 Mo)
                                            </option>
                                          </select>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                            Duration:
                                          </span>
                                          <select
                                            value={
                                              row.contract_duration || "12"
                                            }
                                            onChange={(e) =>
                                              updateProductRow(
                                                index,
                                                "contract_duration",
                                                e.target.value,
                                              )
                                            }
                                            className="py-1 px-2.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                                          >
                                            {getDurationOptionsForCycle(
                                              row.billing_cycle,
                                            ).map((opt) => (
                                              <option
                                                key={opt.value}
                                                value={opt.value}
                                              >
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                            Start:
                                          </span>
                                          <input
                                            type="date"
                                            value={
                                              row.contract_start_date || ""
                                            }
                                            onChange={(e) =>
                                              updateProductRow(
                                                index,
                                                "contract_start_date",
                                                e.target.value,
                                              )
                                            }
                                            className="py-1 px-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                                          />
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                            End:
                                          </span>
                                          <input
                                            type="date"
                                            value={row.contract_end_date || ""}
                                            onChange={(e) =>
                                              updateProductRow(
                                                index,
                                                "contract_end_date",
                                                e.target.value,
                                              )
                                            }
                                            className="py-1 px-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-gray-400 dark:text-gray-500 italic pl-1">
                                        Standard one-off sale
                                      </span>
                                    )}
                                  </div>

                                  {row.is_recurring && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                      <i className="mgc_calendar_line text-sm text-blue-500"></i>
                                      <span>
                                        Contract:{" "}
                                        <strong>
                                          {fmtCurrency(cycleAmount)}
                                        </strong>{" "}
                                        / {row.billing_cycle || "monthly"}{" "}
                                        &times; {cyclesCount}{" "}
                                        {cyclesCount === 1 ? "cycle" : "cycles"}{" "}
                                        (
                                        {formatCycleDuration(
                                          row.billing_cycle,
                                          durationMonths,
                                        )}
                                        ) ={" "}
                                        <span className="font-bold text-blue-800 dark:text-blue-200">
                                          {fmtCurrency(rowAmount)}
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-3">
                  {productRows.map((row, index) => {
                    const {
                      isService,
                      cycleAmount,
                      rowAmount,
                      cyclesCount,
                      durationMonths,
                      prodErr,
                      qtyErr,
                      priceErr,
                      availableWarehouses,
                      getWarehouseLabel,
                      availableLocations,
                      getLocationLabel,
                      locStock,
                      isStockShortage,
                      shortageQty,
                    } = getRowData(row, index);

                    return (
                      <div
                        key={index}
                        className="p-3.5 bg-gray-50/70 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 relative shadow-xs"
                      >
                        <div className="flex items-center justify-between border-b border-gray-200/70 dark:border-gray-700 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Item #{index + 1}{" "}
                            {isService && (
                              <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                Service
                              </span>
                            )}
                          </span>
                          {productRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProductRow(index)}
                              className="text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                            >
                              <i className="mgc_delete_2_line text-sm"></i>{" "}
                              Remove
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Product / Service{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={row.product_id}
                            onChange={(e) =>
                              selectProduct(index, e.target.value)
                            }
                            className={`${inputCls} pr-7 truncate text-xs ${prodErr ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                          >
                            <option value="">Select an item...</option>
                            {row.product_id && !products.some((p) => String(p.id) === String(row.product_id)) && (
                              <option key={row.product_id} value={row.product_id}>
                                {row.product_name || `Product #${row.product_id}`}
                              </option>
                            )}
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(${p.sku})` : ""}{" "}
                                {p.type === "Service" ? "[Service]" : ""}
                              </option>
                            ))}
                          </select>
                          {prodErr && (
                            <p className="mt-1 text-xs text-red-500 font-medium">
                              {prodErr}
                            </p>
                          )}
                        </div>

                        {/* Mobile Billing Segmented Switch */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Billing Type
                          </label>
                          <div className="inline-flex p-0.5 rounded-lg bg-gray-200/80 dark:bg-gray-700 w-full border border-gray-300/40 dark:border-gray-600">
                            <button
                              type="button"
                              onClick={() => {
                                if (row.is_recurring)
                                  updateProductRow(
                                    index,
                                    "is_recurring",
                                    false,
                                  );
                              }}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all text-center ${
                                !row.is_recurring
                                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              One-Time
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!row.is_recurring)
                                  updateProductRow(index, "is_recurring", true);
                              }}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                                row.is_recurring
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              <i className="mgc_refresh_2_line text-xs"></i>
                              Recurring
                            </button>
                          </div>

                          {row.is_recurring && (
                            <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Billing Cycle
                                </label>
                                <select
                                  value={row.billing_cycle || "monthly"}
                                  onChange={(e) =>
                                    updateProductRow(
                                      index,
                                      "billing_cycle",
                                      e.target.value,
                                    )
                                  }
                                  className={`${inputCls} !py-1 text-xs`}
                                >
                                  <option value="monthly">Monthly</option>
                                  <option value="quarterly">
                                    Quarterly (3 Mo)
                                  </option>
                                  <option value="half-yearly">
                                    Half-Yearly (6 Mo)
                                  </option>
                                  <option value="yearly">Yearly (12 Mo)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Contract Duration
                                </label>
                                <select
                                  value={row.contract_duration || "12"}
                                  onChange={(e) =>
                                    updateProductRow(
                                      index,
                                      "contract_duration",
                                      e.target.value,
                                    )
                                  }
                                  className={`${inputCls} !py-1 text-xs`}
                                >
                                  {getDurationOptionsForCycle(
                                    row.billing_cycle,
                                  ).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  value={row.contract_start_date || ""}
                                  onChange={(e) =>
                                    updateProductRow(
                                      index,
                                      "contract_start_date",
                                      e.target.value,
                                    )
                                  }
                                  className={`${inputCls} !py-1 text-xs`}
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  value={row.contract_end_date || ""}
                                  onChange={(e) =>
                                    updateProductRow(
                                      index,
                                      "contract_end_date",
                                      e.target.value,
                                    )
                                  }
                                  className={`${inputCls} !py-1 text-xs`}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {!isService && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Warehouse
                              </label>
                              <select
                                value={row.warehouse_id || ""}
                                onChange={(e) => {
                                  updateProductRow(
                                    index,
                                    "warehouse_id",
                                    e.target.value,
                                  );
                                  updateProductRow(
                                    index,
                                    "warehouse_location_id",
                                    "",
                                  );
                                }}
                                className={`${inputCls} pr-7 truncate text-xs`}
                              >
                                <option value="">Select Warehouse</option>
                                {availableWarehouses.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {getWarehouseLabel(w)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Location
                              </label>
                              <select
                                value={row.warehouse_location_id || ""}
                                onChange={(e) =>
                                  updateProductRow(
                                    index,
                                    "warehouse_location_id",
                                    e.target.value,
                                  )
                                }
                                disabled={!row.warehouse_id}
                                className={`${inputCls} pr-7 truncate text-xs disabled:opacity-50`}
                              >
                                <option value="">Select Location</option>
                                {availableLocations.map((loc: any) => (
                                  <option key={loc.id} value={loc.id}>
                                    {getLocationLabel(loc)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2.5">
                          {!isService ? (
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) =>
                                  updateProductRow(
                                    index,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className={`${inputCls} text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                  qtyErr || isStockShortage
                                    ? "border-amber-500 focus:border-amber-500 focus:ring-amber-500"
                                    : ""
                                }`}
                              />
                              {qtyErr && (
                                <p className="mt-1 text-xs text-red-500 font-medium">
                                  {qtyErr}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Type
                              </label>
                              <div className="py-2 px-3 bg-gray-100 dark:bg-gray-800/60 rounded-lg text-xs text-gray-600 dark:text-gray-400 font-medium">
                                Service (Fixed)
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                              Price (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={row.price}
                              onChange={(e) =>
                                updateProductRow(index, "price", e.target.value)
                              }
                              disabled
                              className={`${inputCls} text-xs bg-gray-100 dark:bg-gray-800/60 cursor-not-allowed text-gray-500 dark:text-gray-400 ${priceErr ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                            />
                            {priceErr && (
                              <p className="mt-1 text-xs text-red-500 font-medium">
                                {priceErr}
                              </p>
                            )}
                          </div>
                        </div>

                        {isStockShortage &&
                          locStock !== null &&
                          (locStock > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                triggerStockShortagePopup(
                                  index,
                                  locStock,
                                  shortageQty,
                                )
                              }
                              className="w-full text-left p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors flex flex-col gap-0.5"
                            >
                              <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                                ⚠️ Only {locStock} in stock
                              </span>
                              <span className="text-[#0088cc] hover:underline font-bold text-[11px]">
                                + Deduct {shortageQty} from other
                              </span>
                            </button>
                          ) : (
                            <div className="p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg text-xs font-medium text-red-700 dark:text-red-300">
                              ⚠️ Out of stock. Please select another location.
                            </div>
                          ))}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-700/60 text-xs">
                          <span className="font-medium text-gray-500 dark:text-gray-400">
                            Line Amount:
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-gray-800 dark:text-white text-sm block">
                              {fmtCurrency(rowAmount)}
                            </span>
                            {row.is_recurring && (
                              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block">
                                {fmtCurrency(cycleAmount)} /{" "}
                                {row.billing_cycle || "monthly"} &times;{" "}
                                {cyclesCount}{" "}
                                {cyclesCount === 1 ? "cycle" : "cycles"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* Revenue Summary Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/50 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900 border border-gray-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                  One-Time Revenue
                </span>
                <span className="text-base font-bold text-gray-800 dark:text-gray-100">
                  {fmtCurrency(oneTimeTotal)}
                </span>
              </div>

              {mrrTotal > 0 && (
                <>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                  <div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 block font-semibold flex items-center gap-1">
                      <i className="mgc_refresh_2_line text-sm"></i> Monthly
                      Recurring (MRR)
                    </span>
                    <span className="text-base font-bold text-blue-700 dark:text-blue-300">
                      {fmtCurrency(mrrTotal)} / mo
                    </span>
                  </div>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                  <div>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 block font-semibold">
                      Annual Recurring (ARR)
                    </span>
                    <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                      {fmtCurrency(mrrTotal * 12)} / yr
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="text-right ml-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                Total Deal Value
              </span>
              <span className="text-2xl font-black text-[#0088cc]">
                {fmtCurrency(totalLeadValue)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={addProductRow}
              className="px-3.5 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 hover:border-[#0e90d9] text-gray-600 hover:text-[#0e90d9] dark:text-gray-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <i className="mgc_add_line text-sm"></i>
              <span>Add Another Item</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditLeadPage;
