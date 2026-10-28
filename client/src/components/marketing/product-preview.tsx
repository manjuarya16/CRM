import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Mail,
  GitBranch,
  BarChart3,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Check,
  Clock,
  Building2,
  FileText,
  Send,
  X,
  ChevronRight,
  Bell,
  Filter,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export const views = [
  "Dashboard",
  "Leads",
  "Contacts",
  "Mail",
  "Quotes",
  "Automation",
  "Analytics",
  "Administration",
] as const;
export type View = (typeof views)[number];
const icons = [LayoutDashboard, GitBranch, Users, Mail, FileText, GitBranch, BarChart3, Settings];
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
function Count({ value }: { value: number }) {
  const [n, setN] = useState(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    let frame: number;
    const start = performance.now();
    const tick = () => {
      const progress = Math.min((performance.now() - start) / 1200, 1);
      setN(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);
  return <>{n.toLocaleString("en-US")}</>;
}
export function Bars() {
  return (
    <div className="chart-bars" aria-label="Sample monthly revenue chart">
      <div className="chart-grid" />
      {[43, 61, 53, 78, 67, 91, 84, 100, 76, 93, 88, 112].map((n, i) => (
        <div key={i} className="bar-track">
          <motion.div
            className={cn("chart-bar", i > 8 && "chart-bar-strong")}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: i * 0.04 }}
            style={{ height: n }}
          />
          <span>
            {
              ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
                i
              ]
            }
          </span>
        </div>
      ))}
    </div>
  );
}
export function Dashboard({ analytics = false }: { analytics?: boolean }) {
  return (
    <div className="dashboard-body">
      <div className="ui-heading">
        <div>
          <p className="ui-label">
            {analytics ? "Revenue analytics" : "Your revenue, in perspective"}
          </p>
          <h3>
            {analytics ? "Sales performance" : "Good morning, Alex"}{" "}
            <span className="greeting-dot" />
          </h3>
        </div>
        <span className="ui-badge">This quarter</span>
      </div>
      <div className="metric-row">
        {[
          ["Won revenue", "₹", "284730", "+18.6%"],
          ["Open pipeline", "₹", "847300", "32 active deals"],
          ["Win rate", "", "34", "+4.2 pts"],
          ["Total leads", "", "428", "+28 this month"],
        ].map(([label, prefix, value, change]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>
              {prefix}
              <Count value={Number(value)} />
              {label === "Win rate" ? "%" : ""}
            </strong>
            <small>
              {change?.startsWith("+") ? <ArrowUpRight size={12} /> : null}
              {change}
            </small>
          </div>
        ))}
      </div>
      <div className="dashboard-charts">
        <div>
          <div className="ui-heading">
            <h4>Revenue overview</h4>
            <span className="ui-label">
              <span className="legend-dot" />
              Won revenue
            </span>
          </div>
          <Bars />
        </div>
        <div className="stage-report">
          <h4>Open leads by stage</h4>
          {[
            ["New", "28"],
            ["Qualified", "42"],
            ["Proposal", "35"],
            ["Negotiation", "19"],
          ].map(([s, n], i) => (
            <div key={s}>
              <span>
                {s}
                <b>{n}</b>
              </span>
              <div className="stage-track">
                <div className={"stage-fill stage-fill-" + i} />
              </div>
            </div>
          ))}
          <p className="ui-label">124 opportunities · ₹847,300</p>
        </div>
      </div>
      <div className="ui-heading">
        <h4>{analytics ? "Revenue by source" : "Opportunities needing attention"}</h4>
        <span className="ui-label">{analytics ? "This quarter" : "Next steps"}</span>
      </div>
      <div className="deal-table">
        {(analytics
          ? [
              ["Website enquiry", "38 leads", "₹124,000", "43%"],
              ["Referral", "24 leads", "₹96,000", "34%"],
              ["Campaign", "31 leads", "₹64,730", "23%"],
            ]
          : [
              ["Northwind Traders", "Enterprise expansion", "₹48,000", "Send proposal"],
              ["Cobalt Manufacturing", "Annual agreement", "₹126,500", "Review quote"],
              ["Harbor Distribution", "Regional rollout", "₹31,200", "Follow-up call"],
            ]
        ).map(([name, desc, value, action], i) => (
          <div className="deal-row" key={name}>
            <span className={"company-avatar avatar-" + i}>{name?.slice(0, 1)}</span>
            <div>
              <b>{name}</b>
              <small>{desc}</small>
            </div>
            <span>{value}</span>
            <span className="ui-badge">{action}</span>
          </div>
        ))}
      </div>
      {analytics && (
        <div className="extra-metrics">
          {[
            "Lost revenue: ₹42,800",
            "Avg. lead value: ₹6,833",
            "Leads/day: 14",
            "Quotes: 86",
            "Persons: 612",
            "Organizations: 148",
          ].map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      )}
    </div>
  );
}
const pipelineStages = ["New", "Qualified", "Proposal", "Negotiation", "Won"];
export function Pipeline() {
  const [stage, setStage] = useState(1);
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const [added, setAdded] = useState(false);
  return (
    <div className="pipeline-demo">
      <div className="ui-heading">
        <div>
          <h3>Sales pipeline</h3>
          <p className="ui-label">
            {stage === 4 ? "₹95,400 won revenue" : "₹69,600 open pipeline"} ·{" "}
            {stage === 4 ? "40%" : "25%"} win rate · Sample data
          </p>
        </div>
        <Button size="sm" onClick={() => setAdded(true)} disabled={added}>
          <Plus />
          {added ? "Lead added" : "New lead"}
        </Button>
      </div>
      <div className="pipeline-tools">
        <label className="ui-search">
          <Search size={14} />
          <input
            aria-label="Search pipeline"
            placeholder="Search opportunities"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Button size="sm" variant={mine ? "secondary" : "ghost"} onClick={() => setMine(!mine)}>
          <Filter />
          {mine ? "My deals" : "All owners"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Reset pipeline"
          title="Reset pipeline"
          onClick={() => {
            setStage(1);
            setAdded(false);
            setQuery("");
            setMine(false);
          }}
        >
          <RotateCcw />
        </Button>
      </div>
      <div className="kanban-scroll">
        <div className="kanban">
          {pipelineStages.map((name, i) => (
            <div className={cn("kanban-column", i === 3 && "kanban-column-highlight")} key={name}>
              <div className="kanban-title">
                <span className={"stage-dot dot-" + i} />
                <b>{name}</b>
                <span>{i === stage ? 2 : 1}</span>
              </div>
              {!mine &&
                (!query ||
                  (
                    [
                      "Vela Consulting",
                      "Tidewater Labs",
                      "Northwind Traders",
                      "Cobalt Manufacturing",
                      "Meridian Services",
                    ][i] ?? ""
                  )
                    .toLowerCase()
                    .includes(query.toLowerCase())) && (
                  <article className="lead-card">
                    <span className="ui-label">
                      {
                        [
                          "Consulting",
                          "Technology",
                          "Distribution",
                          "Manufacturing",
                          "B2B services",
                        ][i]
                      }
                    </span>
                    <h4>
                      {
                        [
                          "Vela Consulting",
                          "Tidewater Labs",
                          "Northwind Traders",
                          "Cobalt Manufacturing",
                          "Meridian Services",
                        ][i]
                      }
                    </h4>
                    <strong>{["₹22,400", "₹67,000", "₹48,000", "₹126,500", "₹38,900"][i]}</strong>
                    <div className="lead-owner">
                      <span className="tiny-avatar">{["AS", "PN", "DR", "JL", "MK"][i]}</span>
                      {["Alex Smith", "Priya Nair", "Dana Reyes", "James Lee", "Maya Kim"][i]}
                    </div>
                    <p>
                      <Clock size={12} />
                      {
                        [
                          "Qualify call",
                          "Budget check",
                          "Demo follow-up",
                          "Send quote",
                          "Renewal review",
                        ][i]
                      }
                    </p>
                  </article>
                )}
              {i === stage && (!query || "acme global".includes(query.toLowerCase())) && (
                <motion.article
                  key={stage}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="lead-card moving-lead"
                >
                  <span className="ui-label">Enterprise expansion</span>
                  <h4>Acme Global</h4>
                  <strong>₹24,000</strong>
                  <div className="lead-owner">
                    <span className="tiny-avatar">AS</span>Alex Smith
                  </div>
                  <p>
                    <Clock size={12} />
                    {stage === 4 ? "Agreement confirmed" : "Next stage ready"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={stage === 4}
                    onClick={() => setStage(Math.min(stage + 1, 4))}
                  >
                    {stage === 4 ? <Check /> : <ArrowRight />}
                    {stage === 4 ? "Deal won" : "Move to " + pipelineStages[stage + 1]}
                  </Button>
                </motion.article>
              )}
              {added && i === 0 && (
                <article className="lead-card">
                  <span className="ui-label">Website enquiry</span>
                  <h4>New opportunity</h4>
                  <strong>₹5,000</strong>
                  <p>Assigned to Alex Smith</p>
                </article>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="demo-status" aria-live="polite">
        {stage === 4
          ? "Deal won — revenue and win rate updated."
          : "Connected opportunities. Clear ownership. A next step for every deal."}
      </p>
    </div>
  );
}
export function Contacts() {
  const [person, setPerson] = useState("Priya Sharma");
  return (
    <div className="contact-demo">
      <aside>
        <h4>People & organizations</h4>
        {["Priya Sharma", "Dana Reyes", "Alex Morgan"].map((n) => (
          <Button
            variant={person === n ? "secondary" : "ghost"}
            key={n}
            onClick={() => setPerson(n)}
            className="contact-person"
          >
            <span className="company-avatar">
              {n
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </span>
            <span>
              {n}
              <small>
                {n === "Priya Sharma"
                  ? "Acme Global"
                  : n === "Dana Reyes"
                    ? "Northwind Traders"
                    : "Harbor Distribution"}
              </small>
            </span>
          </Button>
        ))}
      </aside>
      <div className="contact-record">
        <span className="ui-badge">Decision maker</span>
        <h3>{person}</h3>
        <p className="ui-label">
          <Building2 size={14} />{" "}
          {person === "Priya Sharma"
            ? "Acme Global"
            : person === "Dana Reyes"
              ? "Northwind Traders"
              : "Harbor Distribution"}{" "}
          · Director of operations
        </p>
        <div className="contact-numbers">
          <div>
            <strong>3</strong>
            <span>Open leads</span>
          </div>
          <div>
            <strong>2</strong>
            <span>Active quotes</span>
          </div>
          <div>
            <strong>₹48K</strong>
            <span>Opportunity value</span>
          </div>
        </div>
        <h4>Relationship timeline</h4>
        {[
          ["Email received", "Requested the updated proposal", "Today, 10:24 AM", Mail],
          ["Meeting scheduled", "Implementation discussion with sales", "Tomorrow, 2:00 PM", Clock],
          ["Quote created", "Q-2026-089 · Enterprise expansion", "October 5", FileText],
          ["Note added", "Customer is reviewing two regional teams", "October 3", Users],
        ].map(([title, desc, date, Icon]) => {
          const I = Icon as typeof Mail;
          return (
            <div className="timeline-row" key={String(title)}>
              <span>
                <I size={15} />
              </span>
              <div>
                <b>{String(title)}</b>
                <p>{String(desc)}</p>
                <small>{String(date)}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export function MailDemo() {
  const [folder, setFolder] = useState("Inbox");
  const [compose, setCompose] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <div className="mail-demo">
      <aside>
        <Button
          size="sm"
          onClick={() => {
            setCompose(true);
            setSent(false);
          }}
        >
          <Plus />
          Compose mail
        </Button>
        {["Inbox", "Drafts", "Sent", "Spam", "Trash"].map((f) => (
          <Button
            variant={folder === f ? "secondary" : "ghost"}
            key={f}
            onClick={() => setFolder(f)}
            className="mail-folder"
          >
            <Mail />
            {f}
            <span>{f === "Inbox" ? "7" : f === "Sent" && sent ? "1" : ""}</span>
          </Button>
        ))}
      </aside>
      <div className="mail-thread">
        <div className="ui-heading">
          <h4>{folder === "Inbox" ? "Your rollout proposal" : folder}</h4>
          <span className="ui-label">{folder === "Inbox" ? "Today, 10:24" : ""}</span>
        </div>
        {folder === "Inbox" ? (
          <>
            <div className="sender">
              <span className="company-avatar">PS</span>
              <div>
                <b>Priya Sharma</b>
                <small>priya@example.com → Alex Smith</small>
              </div>
            </div>
            <p>Hi Alex,</p>
            <p>
              Thanks for the walkthrough. Our team is aligned on the next steps. Could you share the
              updated proposal for our regional rollout?
            </p>
            <p>We’d like to discuss implementation with both teams next week.</p>
            <p>
              Best,
              <br />
              Priya
            </p>
            <Button variant="outline" size="sm" onClick={() => setCompose(true)}>
              Reply
              <ArrowRight />
            </Button>
          </>
        ) : (
          <p className="ui-label">
            {folder === "Sent" && sent
              ? "Proposal follow-up · Priya Sharma · Sent just now"
              : `No messages in ${folder.toLowerCase()} in this sample workspace.`}
          </p>
        )}
        <div className="mail-context">
          <span>
            <Users size={13} />
            Priya Sharma
          </span>
          <span>
            <Building2 size={13} />
            Acme Global
          </span>
          <span>
            <GitBranch size={13} />
            ₹24,000 · Proposal
          </span>
        </div>
      </div>
      {compose && (
        <div className="compose-panel">
          <div className="ui-heading">
            <h4>New message</h4>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close compose"
              onClick={() => setCompose(false)}
            >
              <X />
            </Button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
              setCompose(false);
              setFolder("Sent");
            }}
          >
            <label>
              To
              <input
                type="email"
                required
                defaultValue="priya@example.com"
                aria-label="Recipient"
              />
            </label>
            <label>
              CC / BCC
              <input type="text" placeholder="Optional" aria-label="CC and BCC" />
            </label>
            <label>
              Subject
              <input required defaultValue="Your updated rollout proposal" />
            </label>
            <textarea
              aria-label="Message"
              required
              defaultValue="Hi Priya, thank you for sharing your requirements. I’ve prepared the next steps for your regional rollout. Shall we discuss them next week?"
            />
            <Button type="submit" size="sm">
              <Send />
              Send sample email
            </Button>
            <span className="ui-label">Preview only · no email is delivered</span>
          </form>
        </div>
      )}
    </div>
  );
}
export function Quotes() {
  const [sent, setSent] = useState(false);
  return (
    <div className="quote-demo">
      <div className="ui-heading">
        <div>
          <p className="ui-label">Acme Global · Enterprise expansion</p>
          <h3>Quote Q-2026-089</h3>
        </div>
        <span className="ui-badge">{sent ? "Sent" : "Draft"}</span>
      </div>
      <div className="quote-customer">
        <b>Prepared for Priya Sharma</b>
        <p>Acme Global · Regional operations team</p>
      </div>
      <div className="quote-table">
        <div>
          <b>Product</b>
          <b>Quantity</b>
          <b>Amount</b>
        </div>
        {[
          ["Enterprise workspace", "40", "₹20,000"],
          ["Implementation services", "1", "₹4,000"],
        ].map((row) => (
          <div key={row[0]}>
            {row.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="quote-total">
        <span>Total quotation value</span>
        <strong>₹24,000</strong>
      </div>
      <Button onClick={() => setSent(true)} disabled={sent}>
        {sent ? <Check /> : <Send />}
        {sent ? "Sample quote sent" : "Send sample quote"}
      </Button>
      <p className="ui-label mt-3">Sample commercial data · not a product price</p>
    </div>
  );
}
export function Workflow() {
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () =>
        setStep((s) => {
          if (s >= 7) {
            setRunning(false);
            return s;
          }
          return s + 1;
        }),
      430,
    );
    return () => clearInterval(timer);
  }, [running]);
  const nodes = [
    { label: "New lead created", Icon: Plus, type: "TRIGGER", detail: "Priya Sharma · Website" },
    { label: "Assign sales rep", Icon: Users, type: "ACTION", detail: "Assigned to Rohan" },
    { label: "Send welcome email", Icon: Mail, type: "ACTION", detail: "Email sent" },
    { label: "Wait 24 hours", Icon: Clock, type: "ACTION", detail: "24 hours elapsed" },
    { label: "Check response", Icon: GitBranch, type: "CONDITION", detail: "No reply yet" },
    { label: "Create follow-up", Icon: FileText, type: "ACTION", detail: "Task created" },
    { label: "Notify manager", Icon: Bell, type: "ACTION", detail: "Manager notified" },
    { label: "Update lead status", Icon: Check, type: "ACTION", detail: "Status: Contacted" },
  ] as const;
  return (
    <div className="workflow-demo">
      <div className="ui-heading">
        <div>
          <h3>New lead → meaningful follow-up</h3>
          <p className="ui-label">Lead MORSE CRM workflow</p>
        </div>
        <Button
          size="sm"
          disabled={running}
          onClick={() => {
            setStep(-1);
            setRunning(true);
          }}
        >
          <Play />
          {running ? "Running" : "Run workflow"}
        </Button>
      </div>
      <div className="workflow-nodes" aria-label="Eight connected automation steps">
        {nodes.map(({ label, Icon, type, detail }, i) => (
          <div
            className={cn(
              "workflow-node",
              step === i && "node-running",
              step > i && "node-complete",
            )}
            data-step={i + 1}
            key={label}
          >
            <span className="node-icon">
              {step > i ? <Check size={18} /> : <Icon size={18} />}
            </span>
            <span>
              <small
                className={
                  type === "TRIGGER"
                    ? "node-type-trigger"
                    : type === "CONDITION"
                      ? "node-type-condition"
                      : ""
                }
              >
                {type}
              </small>
              <b>{label}</b>
              <em>{detail}</em>
            </span>
            {i < 7 && <ChevronRight className="node-arrow" size={16} aria-hidden="true" />}
            <span className="node-status" aria-hidden="true">
              {step > i ? <Check size={13} /> : null}
            </span>
          </div>
        ))}
      </div>
      <div
        className={cn(
          "workflow-status",
          running && "workflow-status-running",
          step === 7 && "workflow-status-complete",
        )}
        role="status"
        aria-live="polite"
      >
        <span
          className="workflow-status-progress"
          style={{ width: `${Math.max(0, ((step + 1) / nodes.length) * 100)}%` }}
        />
        <span className={cn("status-indicator", step === 7 && "status-success")} />
        <span className="workflow-status-copy">
          {step === 7
            ? "Workflow executed successfully"
            : running
              ? `Executing ${nodes[Math.min(step + 1, 7)]?.label.toLowerCase() ?? "workflow"}…`
              : "Ready to run · Lead assignment, communication and follow-up in one flow"}
        </span>
      </div>
    </div>
  );
}
export function Admin() {
  const [item, setItem] = useState("Roles");
  const [permission, setPermission] = useState(true);
  const items = [
    "Users",
    "Roles",
    "Groups",
    "Access management",
    "Pipelines",
    "Sources",
    "Types",
    "Attributes",
    "Warehouses",
    "Email templates",
    "Events",
    "Campaigns",
    "Webhooks",
    "Workflows",
    "Web forms",
    "Tags",
    "Data transfer",
    "Google Contacts",
  ];
  return (
    <div className="admin-demo">
      <aside>
        <h4>Workspace settings</h4>
        {items.map((n) => (
          <Button
            key={n}
            variant={item === n ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setItem(n)}
          >
            {n}
          </Button>
        ))}
      </aside>
      <div>
        <p className="ui-label">Administration / {item}</p>
        <h3>{item}</h3>
        <p className="ui-label mt-3">
          {["Roles", "Access management"].includes(item)
            ? "Sales representative · Manage permissions for this role."
            : `Configure ${item.toLowerCase()} around your business process.`}
        </p>
        {["Roles", "Access management"].includes(item) ? (
          <div className="permissions">
            {[
              "View leads & contacts",
              "Create and edit quotes",
              "Manage own activities",
              "Manage workspace settings",
            ].map((x, i) => (
              <label key={x}>
                <span>{x}</span>
                <input
                  type="checkbox"
                  checked={i === 3 ? permission : true}
                  disabled={i !== 3}
                  onChange={(e) => setPermission(e.target.checked)}
                />
              </label>
            ))}
            <p className="ui-label">Changes apply to this sample preview only.</p>
          </div>
        ) : (
          <div className="settings-list">
            {(item === "Users"
              ? ["Alex Smith · Sales", "Priya Nair · Operations", "James Lee · Management"]
              : item === "Pipelines"
                ? [
                    "New → Qualified → Proposal → Negotiation → Won",
                    "Distribution sales",
                    "Enterprise expansion",
                  ]
                : item === "Google Contacts"
                  ? [
                      "Contact synchronization",
                      "Connected customer records",
                      "Import field mapping",
                    ]
                  : [
                      `${item} configuration`,
                      `Associated customer records`,
                      `Team visibility and ownership`,
                    ]
            ).map((x) => (
              <div key={x}>
                <Check size={16} />
                <span>{x}</span>
                <span className="ui-badge">Active</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export function ProductPreview({
  initial = "Dashboard",
  tabs = true,
}: {
  initial?: View;
  tabs?: boolean;
}) {
  const [view, setView] = useState<View>(initial);
  return (
    <Reveal className="product-explorer pt-5">
      {tabs && (
        <div className="explorer-tabs" role="tablist" aria-label="Explore CRM modules">
          {views.map((v) => (
            <Button
              key={v}
              role="tab"
              aria-selected={view === v}
              aria-controls="product-panel"
              variant="ghost"
              className={cn("explorer-tab", view === v && "tab-active")}
              onClick={() => setView(v)}
            >
              {v}
            </Button>
          ))}
        </div>
      )}
      <div className="product-window">
        <div className="browser-bar">
          <div className="browser-dots">
            <i />
            <i />
            <i />
          </div>
          <span>MORSE CRM / {view.toLowerCase()}</span>
          <span className="sample-label">Sample workspace</span>
        </div>
        <div className="product-shell">
          <aside className="product-sidebar">
            <div className="workspace-brand">
              <span className="brand-mark" />
              Acme workspace
            </div>
            <p className="ui-label">WORKSPACE</p>
            {views.map((v, i) => {
              const Icon = icons[i] ?? LayoutDashboard;
              return (
                <Button
                  variant="ghost"
                  key={v}
                  onClick={() => setView(v)}
                  className={cn("sidebar-item", view === v && "sidebar-active")}
                >
                  <Icon size={16} />
                  {v}
                  {v === "Mail" && <span>7</span>}
                </Button>
              );
            })}
            <div className="sidebar-bottom">
              <span className="tiny-avatar">AS</span>
              <div>
                Alex Smith<small>Sales representative</small>
              </div>
            </div>
          </aside>
          <motion.div
            id="product-panel"
            role="tabpanel"
            aria-label={`${view} preview`}
            className="product-content"
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {view === "Dashboard" ? (
              <Dashboard />
            ) : view === "Leads" ? (
              <Pipeline />
            ) : view === "Contacts" ? (
              <Contacts />
            ) : view === "Mail" ? (
              <MailDemo />
            ) : view === "Quotes" ? (
              <Quotes />
            ) : view === "Automation" ? (
              <Workflow />
            ) : view === "Analytics" ? (
              <Dashboard analytics />
            ) : (
              <Admin />
            )}
          </motion.div>
        </div>
      </div>
    </Reveal>
  );
}
