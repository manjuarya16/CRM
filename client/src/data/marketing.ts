export const pricingPlans = [
  {
    name: "Starter",
    price: 9999,
    description: "A clear workspace for a focused sales team.",
    features: [
      "Leads and pipeline",
      "Persons and organizations",
      "Activities and tasks",
      "Up to 3 teammates",
    ],
  },
  {
    name: "Growth",
    price: 19999,
    description: "For teams ready to standardize customer work.",
    features: [
      "Everything in Starter",
      "Automation workflows",
      "Custom attributes",
      "Reporting and visibility",
    ],
  },
  {
    name: "Business",
    price: 29999,
    description: "For service-heavy sales teams with more complexity.",
    features: [
      "Everything in Growth",
      "Advanced integrations",
      "Quoted products and warehouses",
      "Prioritized onboarding",
    ],
  },
  // {
  //   name: "Enterprise",
  //   price: 5999,
  //   description: "For broader operational scale and custom configuration.",
  //   features: [
  //     "Custom roles and permissions",
  //     "Advanced data access",
  //     "Implementation support",
  //     "Operational governance",
  //   ],
  // },
] as const;

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const modules = [
  {
    name: "Lead management",
    group: "Sales",
    view: "Leads",
    description:
      "Capture leads from web forms, imports and conversations. Keep the source, owner, value and next action together, so a promising opportunity never disappears in a spreadsheet.",
    benefits: [
      "Capture and qualify incoming leads",
      "Assign owners and track sources",
      "Keep the next follow-up visible",
    ],
    use: "Route a new website enquiry to a sales representative with a follow-up activity.",
  },
  {
    name: "Pipeline management",
    group: "Sales",
    view: "Leads",
    description:
      "Make your sales process visible from first contact to won revenue. Create pipelines that reflect your business and move each opportunity through clear, actionable stages.",
    benefits: [
      "Custom pipelines and stages",
      "Deal values and sales ownership",
      "Won and lost opportunity tracking",
    ],
    use: "Review proposal-stage opportunities before the weekly sales meeting.",
  },
  {
    name: "Contacts & persons",
    group: "Relationships",
    view: "Contacts",
    description:
      "Keep people, their roles and their relationship history in one record. Connect each person to organizations, open leads, quotes, emails and activities for a complete view of the relationship.",
    benefits: [
      "Linked person and lead records",
      "Communication and activity history",
      "Custom customer information",
    ],
    use: "Prepare for a customer call with their latest email, open quote and next meeting.",
  },
  {
    name: "Organizations",
    group: "Relationships",
    view: "Contacts",
    description:
      "Understand the whole account, not just one conversation. Link decision makers, associated leads and commercial activity to an organization so your team shares the same customer context.",
    benefits: [
      "Account-level relationship history",
      "Associated people and opportunities",
      "Shared company information",
    ],
    use: "Coordinate multiple decision makers during an enterprise sales cycle.",
  },
  {
    name: "Mail & email templates",
    group: "Communication",
    view: "Mail",
    description:
      "Bring inbox, drafts, sent messages and email templates into your sales workflow. Link conversations to contacts and leads, with CC and BCC available when the wider team needs context.",
    benefits: [
      "Inbox, sent, drafts, spam and trash",
      "Compose with contact and lead context",
      "Reusable email templates",
    ],
    use: "Send a proposal follow-up from the related opportunity without switching tools.",
  },
  {
    name: "Quotes",
    group: "Sales",
    view: "Quotes",
    description:
      "Turn an opportunity into a clear commercial proposal. Connect product information, quantities and pricing with the customer and lead, then keep the quotation status visible to your team.",
    benefits: [
      "Customer and lead-linked quotations",
      "Product line items and totals",
      "Visible quote status",
    ],
    use: "Build a quote for the products discussed in a customer meeting.",
  },
  {
    name: "Activities",
    group: "Sales",
    view: "Dashboard",
    description:
      "Give every opportunity a next step. Keep calls, meetings and follow-up tasks associated with the right customer so your team knows what needs attention today.",
    benefits: [
      "Calls, meetings and follow-ups",
      "Owner and customer associations",
      "Daily activity visibility",
    ],
    use: "Schedule a follow-up after a demo and keep it attached to the lead.",
  },
  {
    name: "Products & warehouses",
    group: "Sales",
    view: "Quotes",
    description:
      "Maintain product information alongside your commercial process. Use products in quotations and organize warehouse information to connect what you sell with how your business operates.",
    benefits: [
      "Structured product catalog",
      "Quote-ready product information",
      "Warehouse organization",
    ],
    use: "Keep a distributor’s product details consistent across customer quotes.",
  },
  {
    name: "Campaigns & events",
    group: "Automation",
    view: "Automation",
    description:
      "Coordinate customer engagement with structured campaigns and event-driven actions. Connect sales follow-ups with the moments that matter in the customer journey.",
    benefits: [
      "Organized campaign activity",
      "Event-based processes",
      "Connected customer records",
    ],
    use: "Create a coordinated follow-up process for incoming campaign leads.",
  },
  {
    name: "Workflows & automation",
    group: "Automation",
    view: "Automation",
    description:
      "Build repeatable processes for lead assignment, welcome emails, task creation and status changes. Use triggers, conditions and actions to remove repetitive work while keeping people in control.",
    benefits: [
      "Trigger, condition and action steps",
      "Lead assignment and follow-up tasks",
      "Repeatable sales processes",
    ],
    use: "Assign a new enquiry, send a welcome email and create the next follow-up.",
  },
  {
    name: "Analytics & reports",
    group: "Analytics",
    view: "Analytics",
    description:
      "See won and lost revenue, lead values, conversion and pipeline distribution in context. Bring sales activity and customer counts together to make pipeline reviews less subjective.",
    benefits: [
      "Revenue and lead performance",
      "Stage and source breakdowns",
      "Sales activity and quotations",
    ],
    use: "Identify where opportunities slow down and which sources bring valuable leads.",
  },
  {
    name: "Roles, groups & access",
    group: "Administration",
    view: "Administration",
    description:
      "Organize users into groups and define roles around their responsibilities. Configure access management so the right people can work with the right records and settings.",
    benefits: [
      "Users, groups and roles",
      "Role-based access management",
      "Structured team administration",
    ],
    use: "Separate sales representative access from administrative responsibilities.",
  },
  {
    name: "Custom attributes & settings",
    group: "Administration",
    view: "Administration",
    description:
      "Fit the CRM to your process with custom attributes, sources, types, tags and pipeline configuration. Capture the information your business actually needs without losing a consistent structure.",
    benefits: [
      "Custom fields and attributes",
      "Lead sources, types and tags",
      "Business-specific pipelines",
    ],
    use: "Track the industry, region and product interest for each incoming enquiry.",
  },
  {
    name: "Web forms & data transfer",
    group: "Administration",
    view: "Administration",
    description:
      "Connect customer enquiries to your CRM through web forms, and bring existing records into a connected workspace. Plan the field mapping and ownership before importing your data.",
    benefits: ["Web enquiry capture", "Structured data transfer", "Existing customer records"],
    use: "Move an existing contact spreadsheet into a shared customer workspace.",
  },
  {
    name: "Webhooks & Google Contacts",
    group: "Administration",
    view: "Administration",
    description:
      "Extend the CRM to the tools around it. Use webhooks for external events and Google Contacts integration to keep relationships connected across your working environment.",
    benefits: [
      "External service connections",
      "Event-driven webhooks",
      "Google Contacts integration",
    ],
    use: "Connect CRM events to an external business process.",
  },
] as const;
export const faqs = [
  [
    "What is MORSE CRM ?",
    "MORSE CRM brings leads, sales pipelines, people, organizations, quotes, mail, activities and workflow automation into one connected customer relationship management workspace.",
  ],
  [
    "Can I import existing leads?",
    "Data transfer helps bring existing records into the CRM. Before an import, review your field mapping, duplicate records, owners and required information with your implementation team.",
  ],
  [
    "Can I manage organizations and contacts?",
    "Yes. Persons and organizations are connected with leads, communication, quotes and activities, so you can view both individual relationships and account-level context.",
  ],
  [
    "Does the CRM support email communication?",
    "Mail includes inbox, drafts, sent, spam and trash, with compose, templates, CC/BCC and associations to contacts and leads.",
  ],
  [
    "Can I create custom pipelines?",
    "Pipelines and stages can be configured around your sales process. Sources, types, tags and custom attributes help preserve the information that matters to your team.",
  ],
  [
    "Can I configure user roles and permissions?",
    "Administration includes users, groups, roles and access management to align the workspace with team responsibilities.",
  ],
  [
    "Does it support workflow automation?",
    "Workflows connect triggers, conditions and actions for processes such as lead assignment, welcome emails, follow-up tasks, notifications and status updates.",
  ],
  [
    "Can I integrate external services?",
    "Webhooks, web forms, data transfer and Google Contacts are part of the integration toolkit. Discuss your specific requirements in a product demo.",
  ],
  [
    "Is the CRM suitable for small teams?",
    "Small teams can start with a clear lead pipeline, shared contacts and follow-up activities, then introduce additional modules as their process grows.",
  ],
  [
    "Can the CRM scale for enterprise teams?",
    "Multiple pipelines, structured roles, groups, custom attributes and workflow configuration support more complex processes. Request a demo to review your access and implementation requirements.",
  ],
] as const;
export const industries = [
  "Technology",
  "Professional services",
  "Manufacturing",
  "Distribution",
  "Consulting",
  "B2B services",
];
export const articles = [
  {
    slug: "sales-pipeline-review",
    category: "Sales operations",
    title: "A better pipeline review starts with the next action.",
    intro:
      "Move your weekly sales meeting from status reporting to decisions that move opportunities forward.",
    body: [
      [
        "Start with the opportunity, not the forecast",
        "A pipeline review should make it clear what is happening, who owns the next step and what is preventing progress. Begin with opportunities that have no scheduled activity or have stayed in one stage longer than expected.",
      ],
      [
        "Give every stage an exit condition",
        "Define what qualified, proposal and negotiation mean for your team. A stage should reflect customer progress, not only an internal task. Use consistent fields for value, source and owner so your team can compare opportunities fairly.",
      ],
      [
        "Leave the meeting with a next action",
        "For each reviewed opportunity, record the next conversation, responsible person and timing. Associate the activity with the lead so context stays available between meetings.",
      ],
    ],
  },
  {
    slug: "connected-customer-context",
    category: "Customer relationships",
    title: "Your customer record should tell a story, not just hold a name.",
    intro:
      "Connect people, organizations, communication and commercial activity into a useful relationship history.",
    body: [
      [
        "Look beyond the contact details",
        "A person’s name and email are only the beginning. The value of a customer record comes from the open opportunities, recent conversations, quotations and activities that explain the relationship.",
      ],
      [
        "Connect the people behind the account",
        "An organization can involve multiple decision makers. Associate people and opportunities with the same organization so a new team member can understand the account without collecting scattered notes.",
      ],
      [
        "Make handoffs easier",
        "Before a handoff, review the last conversation and upcoming commitment. Shared customer context helps the next person continue the relationship rather than start it again.",
      ],
    ],
  },
  {
    slug: "first-sales-workflow",
    category: "Automation",
    title: "The first sales workflow worth automating.",
    intro: "Start with a small, repeatable lead handoff before automating your entire process.",
    body: [
      [
        "Choose a predictable trigger",
        "A new lead is a practical starting point. Define where it comes from, what fields are required and which representative should receive it. Keep exceptions visible rather than silently dropping incomplete records.",
      ],
      [
        "Connect assignment to follow-up",
        "After assigning the lead, create the next activity and use an appropriate welcome template. Build conditions around the customer response before adding more messages.",
      ],
      [
        "Review the process regularly",
        "Automation should support customer conversations, not replace judgment. Review routing, templates and task timing with the people doing the work.",
      ],
    ],
  },
];
export function seo(title: string, description: string, path: string) {
  return {
    meta: [
      { title: `${title} — MORSE CRM ` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — MORSE CRM ` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${title} — MORSE CRM ` },
      { name: "twitter:description", content: description },
    ],
    links: [
      {
        rel: "canonical",
        href: path,
      },
    ],
  };
}
