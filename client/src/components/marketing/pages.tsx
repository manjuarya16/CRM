"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  GitBranch,
  Mail,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { articles, formatINR, modules, pricingPlans } from "@/data/marketing";

import { RequestForm } from "./forms";
import { ProductPreview, Reveal } from "./product-preview";
import { PageIntro, SectionTitle, FinalCTA, FAQ, Actions } from "./shared";
import { SalesJourney } from "./home";

type DetailCard = {
  title: string;
  description: string;
  eyebrow?: string;
};

function DetailCardSection({
  eyebrow,
  title,
  description,
  cards,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cards: DetailCard[];
}) {
  return (
    <section className="container-width section-space detail-card-section">
      <SectionTitle eyebrow={eyebrow} title={title} description={description} />
      <div className="detail-card-grid">
        {cards.map((card, index) => (
          <article className="detail-card" key={card.title}>
            <span className="detail-card-number">{String(index + 1).padStart(2, "0")}</span>
            {card.eyebrow && <p className="eyebrow">{card.eyebrow}</p>}
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FeaturesPage() {
  const [category, setCategory] = useState("All capabilities");
  const visibleModules = modules.filter(
    (module) => category === "All capabilities" || module.group === category,
  );

  return (
    <>
      <PageIntro
        eyebrow="The complete CRM toolkit"
        title="All the work. None of the disconnect."
        description="Leads, relationships, communication, products and business processes — connected in one workspace, with the flexibility to make it your own."
      />
      <section className="container-width">
        <div className="feature-library-heading">
          <div>
            <p className="eyebrow">Explore the toolkit</p>
            <h2>Choose a capability. See how it fits.</h2>
            <p>
              Browse by the kind of work you want to improve, from capturing a new enquiry to
              understanding how your pipeline is moving.
            </p>
          </div>
          <span className="feature-library-count" aria-live="polite">
            <strong>{String(visibleModules.length).padStart(2, "0")}</strong>
            capabilities
          </span>
        </div>
        <div className="feature-filters" aria-label="Feature categories">
          {[
            "All capabilities",
            "Sales",
            "Relationships",
            "Communication",
            "Automation",
            "Analytics",
            "Administration",
          ].map((item) => (
            <Button
              variant={category === item ? "secondary" : "ghost"}
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </Button>
          ))}
        </div>
        {visibleModules.map((module, index) => (
          <section className="feature-detail" key={module.name}>
            <div>
              <p className="eyebrow">
                {module.group} / {String(index + 1).padStart(2, "0")}
              </p>
              <h2>{module.name}</h2>
              <p>{module.description}</p>
              <ul className="benefit-list">
                {module.benefits.map((benefit) => (
                  <li key={benefit}>
                    <Check />
                    {benefit}
                  </li>
                ))}
              </ul>
              <div className="use-case">
                <span>IN PRACTICE</span>
                <p>{module.use}</p>
              </div>
              <Button asChild variant="link" className="px-0">
                <Link href="/book-demo">
                  See it in a demo
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            <ProductPreview initial={module.view} tabs={false} />
          </section>
        ))}
      </section>
      <FinalCTA />
    </>
  );
}

export function FeaturePage({ kind }: { kind: string }) {
  const selected = modules.filter((module) =>
    kind === "leads"
      ? module.name === "Lead management"
      : kind === "pipeline"
        ? module.name === "Pipeline management"
        : kind === "contacts"
          ? module.group === "Relationships"
          : kind === "mail"
            ? module.group === "Communication"
            : kind === "automation"
              ? module.group === "Automation"
              : kind === "analytics"
                ? module.group === "Analytics"
                : module.group === "Administration",
  );
  const first = selected[0] ?? modules[0];

  return (
    <>
      <PageIntro
        eyebrow={first.group}
        title={
          first.name === "Lead management"
            ? "Every opportunity deserves a clear next step."
            : first.name === "Pipeline management"
              ? "Know exactly where every opportunity stands."
              : first.name
        }
        description={first.description}
      />
      <section className="container-width">
        <ProductPreview initial={first.view} />
      </section>
      <section className="container-width section-space">
        {selected.map((module) => (
          <div className="feature-editorial" key={module.name}>
            <SectionTitle
              eyebrow={module.group}
              title={module.name}
              description={module.description}
            />
            <div>
              <ul className="benefit-list">
                {module.benefits.map((benefit) => (
                  <li key={benefit}>
                    <Check />
                    {benefit}
                  </li>
                ))}
              </ul>
              <div className="use-case">
                <span>IN PRACTICE</span>
                <p>{module.use}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
      <FAQ />
      <FinalCTA />
    </>
  );
}

export function ProductPage() {
  return (
    <>
      <PageIntro
        eyebrow="Meet MORSE CRM"
        title="Your entire customer journey. One connected workspace."
        description="A CRM that connects your customer records to the work around them. Capture opportunities, organize people and organizations, manage communication, build quotations and keep the next step visible."
      />
      <section className="container-width">
        <ProductPreview />
      </section>
      <section className="container-width section-space">
        <SectionTitle
          eyebrow="A revenue workspace, not another silo"
          title="From the first enquiry to the next opportunity."
          description="Customer context stays connected as work moves between sales, operations and management. Explore the modules above to see how a lead, a conversation, a quote and an activity fit into the same story."
        />
        <div className="product-overview-list">
          {[
            [
              "01",
              "A clear sales process",
              "Leads, values, owners, sources and pipeline stages keep opportunities organized. Activities make the next action visible.",
            ],
            [
              "02",
              "A complete customer picture",
              "Persons and organizations connect communication, quotations and associated leads in one shared relationship history.",
            ],
            [
              "03",
              "Work that moves itself forward",
              "Workflows connect triggers, conditions and actions to standardize routing, follow-ups and status changes.",
            ],
            [
              "04",
              "Control and perspective",
              "Revenue analytics, custom attributes, user roles and settings bring structure without disconnecting the customer journey.",
            ],
          ].map(([number, title, description]) => (
            <div key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
      <DetailCardSection
        eyebrow="The connected journey"
        title="Keep context as work moves forward."
        description="A useful CRM does more than store records. It helps your team understand what happened, what matters now and what needs to happen next."
        cards={[
          {
            title: "Capture the opportunity",
            description:
              "Bring new enquiries into a shared pipeline with their source, owner, value and qualification details in view.",
          },
          {
            title: "Build the relationship",
            description:
              "Connect people and organizations to emails, meetings, activities and quotes so the customer story stays together.",
          },
          {
            title: "Move with purpose",
            description:
              "Use clear stages, timely follow-ups and practical automation to keep important work from getting lost.",
          },
        ]}
      />
      <SalesJourney />
      <section className="container-width section-space">
        <SectionTitle
          eyebrow="Connected by design"
          title="Explore the full product toolkit."
          description="Quotes, mail, products, warehouses, campaigns, web forms, webhooks and Google Contacts are part of the wider connected CRM."
        />
        <Button asChild variant="outline" className="cta-button">
          <Link href="/features">
            Explore all features
            <ArrowUpRight />
          </Link>
        </Button>
      </section>
      <FinalCTA />
    </>
  );
}

export function IntegrationsPage() {
  return (
    <>
      <section className="integration-intro">
        <div className="container-width">
          <SectionTitle
            eyebrow="Connected workflows"
            title="Bring your customer tools into one connected process."
            description="Extend MORSE CRM with practical ways to capture enquiries, connect customer relationships and share events with the services around your business."
          />
          <div className="integration-list" aria-label="Available integration options">
            {["Google Contacts", "Webhooks", "Web forms", "Data transfer"].map((integration) => (
              <span className="integration-chip" key={integration}>
                <Check size={17} aria-hidden="true" />
                {integration}
              </span>
            ))}
          </div>
        </div>
      </section>
      <DetailCardSection
        eyebrow="Integration toolkit"
        title="Connect the work around your CRM."
        description="Choose the connection that fits the way your team captures, manages and shares customer information."
        cards={[
          {
            title: "Google Contacts",
            description:
              "Connect customer relationships across MORSE CRM and your working environment.",
          },
          {
            title: "Webhooks",
            description:
              "Share CRM events with external services to connect customer activity to other business processes.",
          },
          {
            title: "Web forms",
            description:
              "Capture website enquiries and bring them into a structured customer workflow.",
          },
          {
            title: "Data transfer",
            description:
              "Bring existing customer records into the CRM with a planned, structured import.",
          },
        ]}
      />
      <FinalCTA />
    </>
  );
}

const solutionData = {
  "sales-teams": {
    label: "Sales teams",
    title: "Less chasing. More closing.",
    description:
      "Give every representative a visible pipeline, complete customer context and a clear next step. Bring lead ownership, communication and follow-up activities into one shared sales process.",
    view: "Leads",
    points: [
      [
        "Keep every opportunity visible",
        "Track stages, deal values and owners so representatives and managers see the same picture.",
      ],
      [
        "Make follow-up part of the process",
        "Link activities and email conversations to the opportunity instead of relying on separate notes.",
      ],
      [
        "Prepare quotes with context",
        "Keep the commercial proposal connected to the customer, products and associated lead.",
      ],
    ],
  },
  "small-business": {
    label: "Small business",
    title: "A little more structure. A lot less admin.",
    description:
      "Move from scattered spreadsheets and inboxes to a clear customer workspace. Start with leads, contacts and follow-ups, then build a more connected process as your team grows.",
    view: "Contacts",
    points: [
      [
        "Know who needs attention",
        "Keep customer records and open opportunities together so the next conversation is easy to find.",
      ],
      [
        "Make the sales process repeatable",
        "Define a simple pipeline and clear next actions before adding more complex workflows.",
      ],
      [
        "Keep communication close",
        "Use templates and contact-linked mail to make customer communication consistent.",
      ],
    ],
  },
  "growing-companies": {
    label: "Growing companies",
    title: "Keep the momentum. Add the structure.",
    description:
      "Build a shared process that does not depend on one person knowing everything. Connect teams around customer records, repeatable workflows and common pipeline definitions.",
    view: "Automation",
    points: [
      [
        "Make handoffs clearer",
        "Connect people, organizations and lead records so context travels with the opportunity.",
      ],
      [
        "Standardize repetitive work",
        "Use workflow triggers and actions for assignment, communication and follow-up creation.",
      ],
      [
        "Adapt as you grow",
        "Add custom attributes, sources, tags and team groups to reflect the way your business evolves.",
      ],
    ],
  },
  enterprise: {
    label: "Enterprise teams",
    title: "Complex operations. A connected perspective.",
    description:
      "Configure pipelines, custom information, roles and groups around a more complex organization. Keep customer context consistent while giving teams a structure for their responsibilities.",
    view: "Administration",
    points: [
      [
        "Organize responsibilities",
        "Use users, roles, groups and access management to structure who works with which records and settings.",
      ],
      [
        "Fit the process to the business",
        "Configure pipelines, types, sources, attributes and integrations for different operational needs.",
      ],
      [
        "Review implementation requirements",
        "Explore access, migration, external services and deployment requirements with a product specialist.",
      ],
    ],
  },
  operations: {
    label: "Operations",
    title: "Make the process as reliable as the people.",
    description:
      "Connect the work behind the sale — routing, quotations, product information, workflows and follow-up activities — in one coordinated process.",
    view: "Automation",
    points: [
      [
        "Build repeatable workflows",
        "Start with a trigger, define conditions and connect the actions your team repeats.",
      ],
      [
        "Keep product information connected",
        "Use products and warehouses to keep commercial details aligned with operational execution.",
      ],
      [
        "Coordinate the work behind every deal",
        "Use workflows, owners and activities to keep approvals and handoffs visible.",
      ],
    ],
  },
  management: {
    label: "Management",
    title: "Shared visibility. Better decisions.",
    description:
      "Connect revenue forecasting, team performance and customer context to the decisions leaders need to make. Align sales, operations and customer teams around a common picture.",
    view: "Analytics",
    points: [
      [
        "See the full picture",
        "Review pipeline health, sales progress and customer moments together.",
      ],
      [
        "Keep teams aligned",
        "Use shared context to avoid handoff friction and keep priorities visible.",
      ],
      [
        "Track the right signals",
        "Use analytics and workflow data to monitor customer momentum and revenue movement.",
      ],
    ],
  },
} as const;

export function SolutionsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Solutions"
        title="One CRM. Different teams. One source of truth."
        description="Sales, operations and management work differently. MORSE CRM connects their customer information, workflows and commercial momentum in a shared working environment."
      />
      <section className="container-width section-space">
        <SectionTitle
          eyebrow="Choose your starting point"
          title="A CRM that meets teams where the work happens."
          description="Explore a path shaped around your role, from an individual sales team to a business coordinating more complex operations."
        />
        <div className="solution-grid">
          {Object.entries(solutionData).map(([key, value]) => (
            <div key={key} className="mini-solution-card">
              <p className="eyebrow">{value.label}</p>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
              <Link href={`/solutions/${key}`} className="text-link">
                Learn more
                <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </section>
      <FinalCTA />
    </>
  );
}

export function SolutionPage({ slug }: { slug: string }) {
  const solution = solutionData[slug as keyof typeof solutionData];
  if (!solution)
    return (
      <section className="container-width section-space">
        <h1>Solution not found</h1>
        <Link href="/solutions">Explore solutions</Link>
      </section>
    );

  return (
    <div
      className={
        slug === "sales-teams"
          ? "sales-teams-solution-page"
          : slug === "management"
            ? "management-solution-page"
            : undefined
      }
    >
      <PageIntro
        eyebrow={solution.label}
        title={solution.title}
        description={solution.description}
      />
      <section className="container-width">
        <ProductPreview initial={solution.view} />
      </section>
      <DetailCardSection
        eyebrow="Why teams choose this path"
        title={solution.title}
        description={solution.description}
        cards={solution.points.map(([cardTitle, cardDescription]) => ({
          title: cardTitle,
          description: cardDescription,
        }))}
      />
      <FinalCTA />
    </div>
  );
}

export function PricingPage() {
  return (
    <>
      <PageIntro
        eyebrow="Plans and pricing"
        title="Choose the workspace that matches your customer process."
        description="Clear, predictable pricing built around the work your team does every day."
      />
      <section className="container-width section-space">
        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <div key={plan.name} className="price-card">
              <p className="eyebrow">{plan.name}</p>
              <h3>{plan.name}</h3>
              <div className="price-row">
                <strong>{formatINR(plan.price)}</strong>
                <span>/per year</span>
              </div>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild className="cta-button">
                <Link href="/book-demo">Talk to sales</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
      <DetailCardSection
        eyebrow="Choosing a plan"
        title="Start with the process you need today."
        description="Compare the capabilities included in each plan, then choose the level of structure that fits your team and operating needs."
        cards={[
          {
            title: "Start with the essentials",
            description:
              "A focused team can begin with lead tracking, a pipeline, customer records and follow-up activities.",
          },
          {
            title: "Add repeatable processes",
            description:
              "As work grows, introduce automation, custom fields and reporting to bring more consistency to everyday sales.",
          },
          {
            title: "Plan for broader operations",
            description:
              "For more complex requirements, review access, integrations, onboarding and configuration with the MORSE team.",
          },
        ]}
      />
      <FinalCTA />
    </>
  );
}

export function BookingPage({ kind = "demo" }: { kind?: "demo" | "trial" | "contact" }) {
  return (
    <>
      <section className={`container-width booking-page${kind === "demo" ? " booking-page-demo" : ""}`}>
        <div className={`booking-copy${kind === "demo" ? " booking-copy-demo" : ""}`}>
          <p className="eyebrow">
            {kind === "demo"
              ? "A closer look"
              : kind === "trial"
                ? "Start with a better process"
                : "Let’s talk"}
          </p>
          <h1>
            {kind === "demo"
              ? "Book a demo for your team."
              : kind === "trial"
                ? "Start your free trial."
                : "Tell us what you’re building."}
          </h1>
          <p>
            {kind === "demo"
              ? "A focused conversation about your sales process, customer journey and what you want your CRM to do better."
              : kind === "trial"
                ? "Explore the workspace with a guided walkthrough and a practical setup plan."
                : "Share the shape of your process and we’ll help map the right next step."}
          </p>
          <div className="booking-points">
            <p>
              <Check aria-hidden="true" />
              {kind === "demo"
                ? "Discuss your team’s current workflow"
                : "Tell us about your goals"}
            </p>
            <p>
              <Check aria-hidden="true" />
              {kind === "trial"
                ? "Explore the CRM at your own pace"
                : "Get guidance relevant to your process"}
            </p>
            <p>
              <Check aria-hidden="true" />
              No obligation to move forward
            </p>
          </div>
        </div>
        <div className="booking-form-wrap">
          <RequestForm kind={kind} />
        </div>
      </section>
      <DetailCardSection
        eyebrow="A clear next step"
        title="Make the conversation useful from the start."
        description="A little context helps us focus on the parts of MORSE CRM that matter most to your team."
        cards={[
          {
            title: "Share your process",
            description: "Tell us how enquiries, customer relationships and follow-ups work today.",
          },
          {
            title: "Explore the right workflows",
            description:
              "We can focus on the features, team handoffs and reporting relevant to your goals.",
          },
          {
            title: "Decide what comes next",
            description:
              "Leave with a clearer understanding of fit and the practical steps for evaluating the CRM.",
          },
        ]}
      />
    </>
  );
}

export function ContactPage() {
  return (
    <section className="contact-page">
      <div className="container-width contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">Contact MORSE CRM</p>
          <h1>Let’s make your customer work feel more connected.</h1>
          <p className="contact-description">
            Tell us a little about your team and what you’re looking for. We’ll make sure your
            message gets to the right person.
          </p>

          <div className="contact-options">
            <div className="contact-option contact-info-option">
              <span className="contact-option-icon">
                <Phone size={19} aria-hidden="true" />
              </span>
              <span>
                <strong>Call Us</strong>
                <small className="contact-info-values">
                  <a href="tel:+918956308346">+91 89563 08346</a>
                  <a href="tel:+918956308347">+91 89563 08347</a>
                </small>
              </span>
            </div>
            <div className="contact-option contact-info-option">
              <span className="contact-option-icon">
                <Mail size={19} aria-hidden="true" />
              </span>
              <span>
                <strong>Email Us</strong>
                <small className="contact-info-values">
                  <a href="mailto:INFO@IMORSETECH.COM">INFO@IMORSETECH.COM</a>
                </small>
              </span>
            </div>
          </div>

          <div className="contact-assurances">
            <p>
              <Clock3 size={17} aria-hidden="true" />
              Your message goes to our team for review.
            </p>
            <p>
              <ShieldCheck size={17} aria-hidden="true" />
              Your information is used only to respond.
            </p>
          </div>
        </div>

        <div className="contact-form-card" id="contact-form">
          <RequestForm kind="contact" />
        </div>
      </div>
      <div className="container-width contact-next-step">
        <p className="eyebrow">What to include</p>
        <p>
          A short note about your team, current process and the challenge you want to solve helps us
          route your enquiry and prepare a more relevant response.
        </p>
      </div>
    </section>
  );
}

export function ResourcesPage({ mode = "resources" }: { mode?: string }) {
  const heading =
    mode === "blog"
      ? "Ideas for a more connected sales process."
      : mode === "documentation"
        ? "Understand the workspace. Connect the work."
        : mode === "help-center"
          ? "Helpful guidance for daily customer work."
          : mode === "product-updates"
            ? "Product updates and CRM improvements."
            : "Practical CRM guidance for connected customer relationships";
  const description =
    mode === "documentation"
      ? "Get familiar with core CRM concepts, customer records and the ways information moves through a connected sales process."
      : mode === "help-center"
        ? "Find practical guidance for organizing leads, preparing for customer conversations and keeping important follow-ups visible."
        : mode === "blog"
          ? "Read actionable ideas for pipeline reviews, relationship context and the small workflows that help sales teams stay aligned."
          : mode === "product-updates"
            ? "See how product capabilities support clearer customer records, more consistent workflows and better day-to-day visibility."
            : "Explore practical guides to customer workflows, process design, pipeline reviews and more connected sales work.";

  return (
    <div className={mode === "resources" ? "resources-page" : undefined}>
      <PageIntro
        eyebrow={
          mode === "documentation"
            ? "Documentation"
            : mode === "help-center"
              ? "Help center"
              : mode === "blog"
                ? "Blog"
                : mode === "product-updates"
                  ? "Product updates"
                  : "Resources"
        }
        title={heading}
        description={description}
      />
      <section className="container-width section-space resources-section">
        <SectionTitle
          eyebrow={`${articles.length} practical guides`}
          title="Start with a question your team is already asking."
          description="Each guide focuses on a specific part of customer work and offers a practical way to bring more clarity to the process."
        />
        <div className="resources-list">
          {articles.map((article, index) => (
            <article key={article.slug} className="resource-card">
              <div className="resource-card-meta">
                <span className="resource-card-index">{String(index + 1).padStart(2, "0")}</span>
                <p className="eyebrow">{article.category}</p>
              </div>
              <h2>{article.title}</h2>
              <p className="resource-card-description">{article.intro}</p>
              <Link href={`/blog/${article.slug}`}>
                Read article <ArrowUpRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ArticlePage({ slug }: { slug: string }) {
  const article = articles.find((entry) => entry.slug === slug);
  if (!article)
    return (
      <section className="container-width section-space">
        <h1>Guide not found</h1>
        <Link href="/blog">Browse the blog</Link>
      </section>
    );

  return (
    <article className="container-width section-space article-page">
      <header className="article-header">
        <Link href="/blog" className="article-back-link">
          <ArrowRight aria-hidden="true" />
          All resources
        </Link>
        <p className="eyebrow">{article.category}</p>
        <h1>{article.title}</h1>
        <p className="article-intro">{article.intro}</p>
        <p className="article-reading-note">
          A practical guide to making everyday customer work clearer and more connected.
        </p>
      </header>
      <div className="article-body">
        {article.body.map(([heading, copy], index) => (
          <section key={heading} className="article-block">
            <span className="article-step">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{heading}</h2>
              <p>{copy}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="article-close">
        <p className="eyebrow">Keep exploring</p>
        <p>Bring these ideas into a customer process your whole team can follow.</p>
        <Link href="/book-demo" className="text-link">
          Explore MORSE CRM
          <ArrowRight />
        </Link>
      </div>
    </article>
  );
}

export function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-hero">
        <div className="about-wrap about-hero-grid">
          <div className="about-hero-copy">
            <p className="about-eyebrow">About MORSE CRM</p>
            <h1>Your people. Your process. One connected revenue engine.</h1>
            <p className="about-lead">
              Sales work rarely happens in one place. MORSE CRM brings the customer story, the sales
              process and the work around it into one connected workspace.
            </p>
            <Link className="about-button" href="/book-demo">
              Book a demo
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
          </div>
          <div className="about-record" role="group" aria-label="Example customer record">
            <div className="about-record-person">
              <span className="about-avatar" aria-hidden="true">
                PN
              </span>
              <div>
                <strong>Priya Nair</strong>
                <span>Halden Logistics</span>
              </div>
            </div>
            <ol className="about-story">
              <li>
                <strong>Enquiry</strong>
                <small>Website form · 3 Oct</small>
              </li>
              <li>
                <strong>Conversation</strong>
                <small>Intro call and 4 emails</small>
              </li>
              <li>
                <strong>Opportunity</strong>
                <small>Fleet renewal · Proposal stage</small>
              </li>
              <li className="about-story-next">
                <strong>Send revised quote</strong>
                <small>Due Thursday · Owner: Arjun</small>
              </li>
            </ol>
          </div>
        </div>
      </header>

      <section className="about-band">
        <div className="about-wrap">
          <p className="about-eyebrow">Built for modern teams</p>
          <h2>A more connected way to sell.</h2>
          <p className="about-lead">
            We built MORSE CRM to reduce context loss between enquiries, opportunities, customer
            conversations and commercial decisions.
          </p>
        </div>
      </section>

      <section className="about-principles">
        <div className="about-wrap">
          <div className="about-principles-heading">
            <div>
              <p className="about-eyebrow">How we think about CRM</p>
              <h2>Good systems should make good work easier.</h2>
            </div>
            <p className="about-lead">
              MORSE CRM is shaped around the practical connections that help teams serve customers
              consistently as the business grows.
            </p>
          </div>
          <div className="about-pillars">
            <article className="about-pillar">
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <circle cx="14" cy="14" r="5" />
                <circle cx="32" cy="12" r="4" />
                <circle cx="22" cy="32" r="6" />
                <path d="m18 16 3 11m7-13-4 13m-5-14h9" />
              </svg>
              <h3>Keep the customer in context</h3>
              <p>
                Bring people, organizations, opportunities and conversations together instead of
                making teams reconstruct the story.
              </p>
            </article>
            <article className="about-pillar">
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <path d="M6 32h10V20h10V9h12" />
                <path d="m33 4 5 5-5 5" />
                <circle cx="6" cy="32" r="2" />
              </svg>
              <h3>Make the next step visible</h3>
              <p>
                Connect activities and ownership to customer work so important commitments are
                easier to follow through.
              </p>
            </article>
            <article className="about-pillar">
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <rect x="6" y="8" width="12" height="28" rx="2" />
                <rect x="21" y="8" width="17" height="12" rx="2" />
                <rect x="21" y="24" width="17" height="12" rx="2" />
              </svg>
              <h3>Fit the way teams operate</h3>
              <p>
                Use pipelines, fields, roles and workflows to bring structure to the process your
                business actually runs.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="about-features">
        <div className="about-wrap about-split">
          <div className="about-sticky-heading">
            <p className="about-eyebrow">One connected workspace</p>
            <h2>Everything the sale touches, in one place.</h2>
            <p className="about-lead">
              The parts of a customer relationship that usually live in separate tools, working
              from the same record.
            </p>
          </div>
          <dl className="about-feature-list">
            <div>
              <dt>People and organizations</dt>
              <dd>
                Every contact, the company they belong to, and the history between you, on one
                record.
              </dd>
            </div>
            <div>
              <dt>Opportunities and pipelines</dt>
              <dd>Track each deal through stages that match how your team actually sells.</dd>
            </div>
            <div>
              <dt>Conversations</dt>
              <dd>Keep calls, emails and notes attached to the customer and the deal they relate to.</dd>
            </div>
            <div>
              <dt>Activities and ownership</dt>
              <dd>Assign follow-ups to a named person with a due date, so nothing is left to memory.</dd>
            </div>
            <div>
              <dt>Fields, roles and workflows</dt>
              <dd>
                Adjust what you capture, who can see it and what happens next as your process
                changes.
              </dd>
            </div>
            <div>
              <dt>Commercial decisions</dt>
              <dd>
                See quotes, pricing discussions and approvals alongside the customer story behind
                them.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="about-process">
        <div className="about-wrap">
          <p className="about-eyebrow">A clear path forward</p>
          <h2>From first enquiry to closed deal.</h2>
          <ol className="about-steps">
            <li>
              <h3>Capture the enquiry</h3>
              <p>New enquiries land on a customer record instead of in someone&apos;s inbox.</p>
            </li>
            <li>
              <h3>Assign and qualify</h3>
              <p>Give the opportunity an owner and record what you learn in the first conversations.</p>
            </li>
            <li>
              <h3>Move it forward</h3>
              <p>Progress through your pipeline stages with the next step always in view.</p>
            </li>
            <li>
              <h3>Review and decide</h3>
              <p>Look at the full story behind a deal before you quote, discount or close.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="about-roles">
        <div className="about-wrap">
          <p className="about-eyebrow">Made for the whole team</p>
          <h2>Useful to everyone on the revenue team.</h2>
          <div className="about-role-list">
            <article>
              <h3>Sales representatives</h3>
              <p>
                Open a customer and see the whole story: who is involved, what was said and what you
                promised to do next.
              </p>
            </article>
            <article>
              <h3>Sales managers</h3>
              <p>
                Understand where each deal stands and who owns the next step without chasing
                updates in chat.
              </p>
            </article>
            <article>
              <h3>Founders and operations</h3>
              <p>
                Set up the pipelines, fields and roles once, then adjust them as the business grows.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="about-faq">
        <div className="about-wrap about-split">
          <div>
            <p className="about-eyebrow">A little more clarity</p>
            <h2>Questions teams ask us.</h2>
          </div>
          <div className="about-faq-list">
            <details>
              <summary>Can we shape MORSE CRM around our own process?</summary>
              <p>
                Yes. Pipelines, fields, roles and workflows are there so the system follows how
                your business already sells.
              </p>
            </details>
            <details>
              <summary>Who is it built for?</summary>
              <p>
                Teams that need enquiries, opportunities and customer conversations to stay
                connected as they grow.
              </p>
            </details>
            <details>
              <summary>What happens in a demo?</summary>
              <p>
                We walk through a customer record end to end, then look at how your own pipeline
                would be set up.
              </p>
            </details>
            <details>
              <summary>How do we get started?</summary>
              <p>Book a demo and tell us how your team sells today. We will take it from there.</p>
            </details>
          </div>
        </div>
      </section>

    </div>
  );
}

export function SecurityPage() {
  return (
    <div className="security-page">
      <header className="security-hero">
        <div className="security-wrap security-hero-grid">
          <div>
            <p className="security-eyebrow">Security &amp; administration</p>
            <h1>Shared context. Thoughtful control.</h1>
            <p className="security-lead">
              Customer information deserves a clear access model. Explore the CRM&apos;s roles,
              permissions and controls for operating with confidence.
            </p>
            <Link className="security-button" href="/book-demo">
              Book a demo
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
          </div>
          <div className="security-access">
            <h2>Workspace access</h2>
            <div
              className="security-table-scroll"
              role="region"
              aria-label="Workspace access by role"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Role</th>
                    <th scope="col">Scope</th>
                    <th scope="col">View</th>
                    <th scope="col">Edit</th>
                    <th scope="col">Administer</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Admin", "Whole workspace", true, true, true],
                    ["Manager", "Their team", true, true, false],
                    ["Sales rep", "Own records", true, true, false],
                    ["Viewer", "Assigned groups", true, false, false],
                  ].map(([role, scope, canView, canEdit, canAdminister]) => (
                    <tr key={String(role)}>
                      <td>{role}</td>
                      <td>{scope}</td>
                      {[canView, canEdit, canAdminister].map((allowed, index) => (
                        <td key={index}>
                          <span
                            className={`security-dot${allowed ? " security-dot-on" : ""}`}
                            role="img"
                            aria-label={allowed ? "Yes" : "No"}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </header>

      <section className="security-band">
        <div className="security-wrap">
          <p className="security-eyebrow">Operational clarity</p>
          <h2>Simple access. Strong control.</h2>
          <p className="security-lead">
            Role-based access, structured data and connected work keep your team aligned without
            creating chaos.
          </p>
        </div>
      </section>

      <section className="security-controls">
        <div className="security-wrap">
          <div className="security-controls-head">
            <div>
              <p className="security-eyebrow">Controls in the product</p>
              <h2>Build a workspace with clear responsibilities.</h2>
            </div>
            <p className="security-lead">
              Review the administration tools that help teams organize access and keep customer work
              structured.
            </p>
          </div>
          <div className="security-pillars">
            <article>
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <path d="M22 5 37 11v10c0 9-6 16-15 18C13 37 7 30 7 21V11z" />
                <circle cx="22" cy="19" r="3.5" />
                <path d="M22 23v7" />
              </svg>
              <h3>Roles and permissions</h3>
              <p>Align workspace access with team responsibilities and administrative needs.</p>
            </article>
            <article>
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <circle cx="15" cy="15" r="5" />
                <circle cx="31" cy="17" r="4" />
                <path d="M5 35c0-6 4-10 10-10s10 4 10 10m2-8c5-1 11 1 12 8" />
              </svg>
              <h3>Groups and ownership</h3>
              <p>
                Organize people and records so teams understand who is responsible for each part of
                the process.
              </p>
            </article>
            <article>
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <rect x="6" y="8" width="32" height="28" rx="3" />
                <path d="M6 17h32M6 26h32M18 17v19" />
              </svg>
              <h3>Consistent customer records</h3>
              <p>
                Use structured fields, sources and pipeline stages to make information easier to
                review across the team.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="security-process">
        <div className="security-wrap">
          <p className="security-eyebrow">A clear setup</p>
          <h2>How access is set up, step by step.</h2>
          <ol className="security-steps">
            <li>
              <h3>Define roles</h3>
              <p>Decide what each kind of user needs to do, such as view, edit or administer.</p>
            </li>
            <li>
              <h3>Organize groups</h3>
              <p>Place people into groups that reflect your teams and how they work.</p>
            </li>
            <li>
              <h3>Assign ownership</h3>
              <p>Give every record and opportunity a person who is responsible for it.</p>
            </li>
            <li>
              <h3>Keep records consistent</h3>
              <p>
                Use shared fields, sources and pipeline stages so everyone reads a record the same
                way.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="security-example">
        <div className="security-wrap security-split">
          <div>
            <p className="security-eyebrow">Access in practice</p>
            <h2>One customer, three people, three views.</h2>
            <p className="security-lead">
              Here is how a single opportunity looks to the people around it when roles and groups
              are set up clearly.
            </p>
          </div>
          <div>
            <div className="security-example-list">
              <article>
                <div>
                  <strong>Arjun</strong>
                  <small>Sales rep, record owner</small>
                </div>
                <p>
                  Updates the conversation, edits the opportunity and sets the next step for Halden
                  Logistics.
                </p>
              </article>
              <article>
                <div>
                  <strong>Meera</strong>
                  <small>Sales manager</small>
                </div>
                <p>
                  Reviews the opportunity alongside the rest of her team&apos;s pipeline and checks
                  who owns what.
                </p>
              </article>
              <article>
                <div>
                  <strong>Dev</strong>
                  <small>Viewer, finance group</small>
                </div>
                <p>
                  Can see the details he needs to prepare the commercial side, without changing the
                  deal.
                </p>
              </article>
            </div>
            <p className="security-example-note">Example scenario for illustration.</p>
          </div>
        </div>
      </section>

      <section className="security-glossary">
        <div className="security-wrap security-split">
          <div className="security-glossary-head">
            <p className="security-eyebrow">Shared language</p>
            <h2>Key terms in plain language.</h2>
            <p className="security-lead">
              The words you will see when you set up and review your workspace.
            </p>
          </div>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>A set of responsibilities that decides what a person can do in the workspace.</dd>
            </div>
            <div>
              <dt>Permission</dt>
              <dd>A single thing a role is allowed to do, such as viewing or editing a record.</dd>
            </div>
            <div>
              <dt>Group</dt>
              <dd>A collection of people, usually a team, used to organize who works on what.</dd>
            </div>
            <div>
              <dt>Ownership</dt>
              <dd>The person accountable for a record or opportunity and its next step.</dd>
            </div>
            <div>
              <dt>Structured field</dt>
              <dd>
                A defined place to record information, so entries look the same across the team.
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>Where an enquiry or customer came from, recorded the same way every time.</dd>
            </div>
            <div>
              <dt>Pipeline stage</dt>
              <dd>
                A step in your sales process that shows how far an opportunity has progressed.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="security-faq">
        <div className="security-wrap security-split">
          <div>
            <p className="security-eyebrow">A little more clarity</p>
            <h2>Common questions about access.</h2>
          </div>
          <div className="security-faq-list">
            <details name="security-faq">
              <summary>What is the difference between a role and a group?</summary>
              <p>
                A role decides what someone can do. A group decides who they work with. Most teams
                use both together.
              </p>
            </details>
            <details name="security-faq">
              <summary>Who should own a customer record?</summary>
              <p>
                The person responsible for the relationship and its next step. Clear ownership means
                nobody has to ask who is handling it.
              </p>
            </details>
            <details name="security-faq">
              <summary>Can access change as the team grows?</summary>
              <p>
                Yes. Roles and groups are meant to be adjusted as responsibilities change, so you
                can start simple and refine later.
              </p>
            </details>
            <details name="security-faq">
              <summary>What should we decide before setup?</summary>
              <p>
                List the roles your team has today, who needs to see what, and who is accountable
                for each stage of the pipeline. We can work through this with you in a demo.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* <section className="security-band security-cta">
        <div className="security-wrap">
          <p className="security-eyebrow">Bring your team into alignment</p>
          <h2>See the controls in your own workspace.</h2>
          <p className="security-lead">
            Book a demo and we will walk through roles, permissions and groups for your team.
          </p>
          <Link className="security-button" href="/book-demo">
            Book a demo
            <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </section> */}
    </div>
  );
}

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  const sections = privacy
    ? [
        [
          "Information submitted on this website",
          "Demo, trial, contact and newsletter forms collect the information required to respond to your request and keep you informed about relevant product updates.",
        ],
        [
          "How information is used",
          "Submitted information is used to contact you about your enquiry, support conversations, product updates and relevant CRM-related guidance.",
        ],
        [
          "Data protection",
          "We keep access to customer information limited, use secure infrastructure and review handling practices as a normal part of product operations.",
        ],
      ]
    : [
        [
          "Terms of use",
          "This site and its content are provided for informational and sales-enablement purposes. Use them in accordance with your business requirements and applicable law.",
        ],
        [
          "Customer relationships",
          "The products and content described on this site are illustrative examples intended to explain a connected CRM experience. Any implementation should be tailored to your process.",
        ],
        [
          "Changes",
          "MORSE CRM may update product descriptions, pricing and guidance to better reflect the service and customer context over time.",
        ],
      ];

  return (
    <section className={`container-width section-space legal-page${privacy ? " privacy-page" : ""}`}>
      <p className="eyebrow">{privacy ? "Privacy policy" : "Terms of service"}</p>
      <h1>{privacy ? "Privacy policy" : "Terms of service"}</h1>
      <p className="legal-intro">
        {privacy
          ? "This page explains how information shared through MORSE CRM’s website forms is used in connection with your enquiry."
          : "These terms describe the general use of this website and the product information presented here."}
      </p>
      {sections.map(([heading, body]) => (
        <section key={heading} className="legal-section">
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
      <p className="legal-contact">
        Questions about this information?{" "}
        <Link href="/contact" className="text-link">
          Contact our team <ArrowRight aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}

export function CareersPage() {
  return (
    <>
      <PageIntro
        eyebrow="Careers"
        title="Build around better customer relationships."
        description="Thoughtful product design starts with understanding how people work. MORSE CRM connects the customer journey, workflow and communication behind a better revenue process."
      />
      <section className="container-width section-space">
        <SectionTitle
          eyebrow="Our approach"
          title="We value people who care about process and people."
          description="We are interested in thoughtful builders who want to make practical CRM workflows and connected customer context easier for teams to use."
        />
      </section>
      <DetailCardSection
        eyebrow="What we value"
        title="Bring curiosity, craft and a customer-first mindset."
        description="The best improvements start with listening to the people doing the work and understanding the details of their day."
        cards={[
          {
            title: "Thoughtful problem solving",
            description:
              "Look for the underlying process challenge, not just the visible symptom or quick feature request.",
          },
          {
            title: "Reliable execution",
            description:
              "Take care with the details that make software predictable, understandable and useful every day.",
          },
          {
            title: "Clear collaboration",
            description:
              "Share context early and work across disciplines to create a better experience for customers.",
          },
        ]}
      />
      <FinalCTA />
    </>
  );
}

export function LoginPage() {
  return (
    <section className="container-width login-page">
      <div className="login-card">
        <span className="brand-mark" />
        <p className="eyebrow">Your CRM workspace</p>
        <h1>Welcome back.</h1>
        <p>
          Your account is accessed through your organization’s MORSE CRM environment. This website
          is the product information and support hub.
        </p>
        <div className="login-help">
          <strong>Need help finding your workspace?</strong>
          <p>Contact your administrator or talk to our team about getting started.</p>
        </div>
        <Button asChild className="cta-button">
          <Link href="/book-demo">Request access</Link>
        </Button>
        <Link href="/contact" className="text-link">
          Contact support
          <ArrowRight />
        </Link>
      </div>
    </section>
  );
}
