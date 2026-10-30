"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Search,
  BarChart3,
  Building2,
  FileText,
  Users,
  GitBranch,
  Mail,
  Layers,
  ChevronRight,
  CalendarDays,
  Zap,
  MessageCircle,
  Handshake,
  ClipboardList,
  Bell,
  PhoneCall,
  Target,
  Link2,
  Paperclip,
  Settings,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { industries, modules } from "@/data/marketing";

import {
  ProductPreview,
  Pipeline,
  MailDemo,
  Workflow,
  Contacts,
  Dashboard,
  Admin,
  Reveal,
} from "./product-preview";
import { SectionTitle, FinalCTA, FAQ } from "./shared";
import { billingIntervalLabel, formatPricingAmount, usePricingPlans } from "./usePricingPlans";

const heroLeadActivity = [
  ["PS", "Priya S.", "New lead assigned"],
  ["NW", "Northwind Co.", "Added to workspace"],
  ["JM", "Jordan M.", "New lead assigned"],
  ["BL", "Brightline", "Lead qualified"],
  ["AK", "Aisha K.", "New lead assigned"],
  ["OL", "Orbit Labs", "Added to workspace"],
];

const heroRevenueActivity = [
  ["₹", "+₹4,200", "Quote accepted"],
  ["UP", "Acme Retail", "Deal moved forward"],
  ["₹", "+₹12,800", "Quote accepted"],
  ["@", "Helix Group", "Reply received"],
  ["₹", "+₹2,950", "Quote accepted"],
  ["UP", "Orbit Labs", "Deal moved forward"],
];

export function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-side-decorations" aria-hidden="true">
          <span className="hero-bubble hero-bubble-users">
            <Users size={23} />
          </span>
          <span className="hero-bubble hero-bubble-deal">
            <Handshake size={22} />
          </span>
          <div className="hero-orbit hero-orbit-left" />
          <div className="hero-orbit hero-orbit-right" />
          <div className="hero-side hero-side-left">
            <div className="hero-side-track">
              {[0, 1].map((copy) => (
                <div className="hero-side-group" key={copy}>
                  {heroLeadActivity.map(([initials, name, activity]) => (
                    <div className="hero-side-chip" key={`${copy}-${name}`}>
                      <span>{initials}</span>
                      <div>
                        <strong>{name}</strong>
                        <small>{activity}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="hero-side hero-side-right">
            <div className="hero-side-track">
              {[0, 1].map((copy) => (
                <div className="hero-side-group" key={copy}>
                  {heroRevenueActivity.map(([initials, name, activity]) => (
                    <div className="hero-side-chip" key={`${copy}-${name}`}>
                      <span>{initials}</span>
                      <div>
                        <strong>{name}</strong>
                        <small>{activity}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="container-width hero-content">
          <p className="hero-eyebrow">
            <span />
            The connected revenue workspace
          </p>
          <h1>
            Your entire sales operation.
            <br />
            <span className="hero-highlight">Finally in sync.</span>
          </h1>
          <p className="hero-description">
            Connect your leads, conversations, pipeline and revenue in one workspace that helps your
            whole team stay in sync.
          </p>
          <div className="hero-actions">
            <Button asChild className="hero-cta hero-cta-secondary">
              <Link href="/book-demo">
                Book a Demo
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>

          <div className="hero-flow" aria-label="How your data stays in sync">
            <div className="hero-flow-rail" aria-hidden="true">
              <span />
            </div>
            <div className="hero-flow-nodes">
              <div className="hero-flow-node">
                <span>Leads</span>
                <strong>New lead assigned</strong>
                <p>Added to your workspace</p>
              </div>
              <div className="hero-flow-node">
                <span>Conversations</span>
                <strong>Reply received</strong>
                <p>Synced to the contact</p>
              </div>
              <div className="hero-flow-node">
                <span>Pipeline</span>
                <strong>Deal moved forward</strong>
                <p>Updated for the team</p>
              </div>
              <div className="hero-flow-node">
                <span>Revenue</span>
                <strong>Quote accepted</strong>
                <p>Revenue stays up to date</p>
              </div>
            </div>
          </div>

          {/* <div className="hero-metrics" aria-label="Sample CRM metrics">
            <div>
              <strong>428</strong>
              <span>Total leads</span>
            </div>
            <div>
              <strong>32</strong>
              <span>Active deals</span>
            </div>
            <div>
              <strong>34%</strong>
              <span>Win rate</span>
            </div>
          </div> */}
        </div>
      </section>
      <section id="product-preview" className="container-width hero-product">
        <ProductPreview />
      </section>
      <section className="trust-band container-width">
        <p className="mb-5">Built for teams that take growth seriously.</p>
        <div>
          {industries.map((item, index) => (
            <span key={item}>
              {index % 2 === 0 ? <Building2 size={17} /> : <Layers size={17} />} {item}
            </span>
          ))}
        </div>
      </section>
      <HomeGrowthSection />
      <WorkflowFeaturesSection />
      <LeadManagementSection />
      {/* <section className="container-width section-space pipeline-section">
        <Reveal>
          <SectionTitle
            eyebrow="Pipeline · Capture → Grow"
            title="Move every deal with momentum."
            description="Stop chasing updates across spreadsheets, emails and conversations. Give your team one live view of every opportunity — from first contact to closed revenue."
          />
        </Reveal>
        <Reveal>
          <Pipeline />
        </Reveal>
        <div className="section-bottom">
          <p>Clear stages. Shared ownership. No opportunity without a next step.</p>
          <Link href="/features/pipeline">
            Explore pipeline management
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section> */}
      <section className="mail-band">
        <div className="mail-ambient" aria-hidden="true">
          <span className="mail-glow mail-glow-blue" />
          <span className="mail-glow mail-glow-violet" />
          <span className="mail-orbit mail-orbit-left" />
          <span className="mail-orbit mail-orbit-right" />
          {[
            { icon: Mail, className: "mail-bubble mail-bubble-one" },
            { icon: Link2, className: "mail-bubble mail-bubble-two" },
            { icon: Paperclip, className: "mail-bubble mail-bubble-three" },
            { icon: MessageCircle, className: "mail-bubble mail-bubble-four" },
            { icon: Check, className: "mail-bubble mail-bubble-five" },
          ].map(({ icon: Icon, className }) => (
            <span className={className} key={className}>
              <Icon size={21} strokeWidth={1.8} />
            </span>
          ))}
          {Array.from({ length: 12 }, (_, index) => (
            <span
              className="mail-particle"
              key={index}
              style={{
                left: `${(index * 41 + 9) % 96}%`,
                animationDelay: `-${(index * 1.9) % 13}s`,
                animationDuration: `${10 + (index % 6)}s`,
              }}
            />
          ))}
        </div>
        <div className="container-width mail-composition">
          <Reveal>
            <div className="section-heading mail-heading">
              <p className="eyebrow">Connected mail</p>
              <h2>
                Every message knows <span>the deal behind it.</span>
              </h2>
              <p className="section-description">
                Open a thread and see the contact, company, opportunity and next activity side by
                side — no tab-hopping, no lost context.
              </p>
            </div>
            <ul className="benefit-list">
              <li>
                <Check />
                An inbox connected to people and opportunities
              </li>
              <li>
                <Check />
                Reusable templates for consistent conversations
              </li>
              <li>
                <Check />
                The customer context behind every reply
              </li>
            </ul>
            <Link href="/features/mail" className="text-link">
              Explore connected communication
              <ArrowRight size={17} />
            </Link>
          </Reveal>
          <Reveal className="mail-showcase">
            <span className="mail-showcase-backdrop" aria-hidden="true" />
            <span className="mail-floating-card mail-floating-card-deal" aria-hidden="true">
              <Link2 size={17} />
              <span>
                <strong>Linked to deal</strong>
                <small>Acme Global · Proposal</small>
              </span>
            </span>
            <span className="mail-floating-card mail-floating-card-template" aria-hidden="true">
              <Paperclip size={17} />
              <span>
                <strong>Template inserted</strong>
                <small>Proposal follow-up</small>
              </span>
            </span>
            <MailDemo />
          </Reveal>
        </div>
      </section>
      <section className="workflow-automation-section">
        <div className="workflow-automation-ambient" aria-hidden="true">
          <span className="workflow-automation-glow workflow-automation-glow-left" />
          <span className="workflow-automation-glow workflow-automation-glow-right" />
          <span className="workflow-automation-orbit workflow-automation-orbit-left" />
          <span className="workflow-automation-orbit workflow-automation-orbit-right" />
          {[
            { icon: Settings, className: "workflow-automation-bubble-one" },
            { icon: Zap, className: "workflow-automation-bubble-two" },
            { icon: Clock, className: "workflow-automation-bubble-three" },
            { icon: Bell, className: "workflow-automation-bubble-four" },
            { icon: Mail, className: "workflow-automation-bubble-five" },
            { icon: Check, className: "workflow-automation-bubble-six" },
          ].map(({ icon: Icon, className }) => (
            <span className={`workflow-automation-bubble ${className}`} key={className}>
              <Icon size={21} strokeWidth={1.8} />
            </span>
          ))}
          {Array.from({ length: 14 }, (_, index) => (
            <span
              className="workflow-automation-particle"
              key={index}
              style={{
                left: `${(index * 43 + 7) % 97}%`,
                width: `${4 + (index % 4)}px`,
                height: `${4 + (index % 4)}px`,
                animationDelay: `-${(index * 1.8) % 14}s`,
                animationDuration: `${9 + (index % 8)}s`,
              }}
            />
          ))}
        </div>
        <div className="container-width workflow-automation-layout">
          <Reveal className="workflow-automation-heading">
            <p className="eyebrow">Automation</p>
            <h2>
              Repetitive work, <span>quietly handled.</span>
            </h2>
            <p className="section-description">
              Build your process once. Let your CRM run it every time. Automate lead assignment,
              welcome emails, follow-ups and status updates — so your team stays focused on the
              conversations that move revenue forward.
            </p>
          </Reveal>
          <Reveal className="workflow-automation-preview">
            <span className="workflow-automation-backdrop" aria-hidden="true" />
            <span
              className="workflow-automation-float workflow-automation-float-trigger"
              aria-hidden="true"
            >
              <Zap size={18} />
              <span>
                <strong>Triggered automatically</strong>
                <small>New lead created</small>
              </span>
            </span>
            <span
              className="workflow-automation-float workflow-automation-float-manual"
              aria-hidden="true"
            >
              <Check size={18} />
              <span>
                <strong>0 manual steps</strong>
                <small>Runs every time</small>
              </span>
            </span>
            <Workflow />
          </Reveal>
          <div className="workflow-automation-footer">
            <p>From trigger to follow-up, your process stays connected.</p>
            <Link href="/features/automation">
              Explore workflow automation
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <WhyConnected />
      <SalesJourney />
      {/* <CustomerStoriesSection /> */}
      {/* <TeamSolutions /> */}
      <section className="container-width section-space">
        <div className="editorial-heading">
          <div className="section-heading">
            <p className="eyebrow">Built around your business</p>
            <h2 className="text-dark">
              Your process. Your permissions. <span className="business-heading-accent">Your CRM.</span>
            </h2>
            <p className="section-description">
              Configure users, groups, roles and access around your team. Adapt pipelines, sources,
              custom attributes, warehouses and integrations without disconnecting the customer
              journey.
            </p>
          </div>
          <Link href="/features" className="text-link">
            Explore every capability
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <Reveal className="standalone-preview">
          <Admin />
        </Reveal>
      </section>
      {/* <CommandSearch /> */}

      <HomePricingSection />
      <FAQ />
      <FinalCTA />
    </div>
  );
}

function HomeGrowthSection() {
  const [activeCapability, setActiveCapability] = useState(0);
  const capabilities = [
    {
      title: "Customer relationships",
      description: "Give every customer conversation the context of a complete relationship.",
      icon: Users,
      className: "growth-feature-relationships",
    },
    {
      title: "Connected workflows",
      description: "Automate handoffs and follow-ups, so no opportunity gets left behind.",
      icon: GitBranch,
      className: "growth-feature-workflows",
    },
    {
      title: "Actionable insights",
      description: "See pipeline health and team performance clearly, in one shared view.",
      icon: BarChart3,
      className: "growth-feature-insights",
    },
    {
      title: "Sales that keep moving",
      description: "Bring leads, deals and next steps together from first touch to close.",
      icon: Zap,
      className: "growth-feature-sales",
    },
  ];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveCapability((current) => (current + 1) % capabilities.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [capabilities.length]);

  return (
    <section className="home-growth-section" aria-labelledby="home-growth-title">
      <div className="home-growth-fx" aria-hidden="true">
        <span className="growth-orbit growth-orbit-left" />
        <span className="growth-orbit growth-orbit-right" />
        <span className="growth-float growth-float-users">
          <Users size={22} />
        </span>
        <span className="growth-float growth-float-chat">
          <MessageCircle size={21} />
        </span>
        <span className="growth-float growth-float-chart">
          <BarChart3 size={22} />
        </span>
        <span className="growth-float growth-float-deal">
          <Handshake size={22} />
        </span>
        <span className="growth-float growth-float-check">
          <Check size={21} />
        </span>
        <span className="growth-float growth-float-zap">
          <Zap size={22} />
        </span>
        <span className="growth-particle growth-particle-one" />
        <span className="growth-particle growth-particle-two" />
        <span className="growth-particle growth-particle-three" />
        <span className="growth-particle growth-particle-four" />
      </div>
      <div className="home-growth-heading">
        <h2 id="home-growth-title">
          A connected business hub <span>built for growth</span>
        </h2>
        <p>
          Bring sales, customer relationships, workflows and insights together in one workspace.
        </p>
      </div>

      <div className="home-growth-content">
        <div className="home-growth-photo">
          <img
            src="/growth-team-photo.jpg"
            alt="A customer-focused team member working on a laptop"
            loading="lazy"
          />
          <div className="growth-photo-status" aria-label="Customer context connected">
            <span aria-hidden="true">
              <MessageCircle size={15} />
            </span>
            <div>
              <strong>Customer context</strong>
              <small>Conversations, deals and next steps</small>
            </div>
          </div>
          <span className="growth-photo-caption">
            More context.
            <span>Better conversations.</span>
            <small>Every chat, deal and next step in one place.</small>
          </span>
        </div>

        <div className="home-growth-details">
          <div className="home-growth-grid">
            {capabilities.map(({ title, description, icon: Icon, className }, index) => (
              <Link
                className={[
                  "growth-feature-card",
                  className,
                  "is-visible",
                  activeCapability === index ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                href="/features"
                key={title}
                data-card-index={index}
              >
                <span className="growth-feature-icon">
                  <Icon size={23} strokeWidth={1.9} />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="growth-feature-more">
                  Learn more <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
          <div className="home-growth-cta-bar">
            <p>See how your team can work from one connected view.</p>
            <Link className="growth-section-cta" href="/features">
              Explore the MORSE CRM platform
              <span aria-hidden="true">
                <ArrowUpRight size={16} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowFeaturesSection() {
  const [activeJourneyStep, setActiveJourneyStep] = useState(0);
  const [journeyVisible, setJourneyVisible] = useState(false);
  const features = [
    {
      title: "CRM",
      description: "Manage your sales pipeline, activities and customer relationships.",
      icon: Building2,
    },
    {
      title: "Meetings",
      description: "Keep client conversations and follow-up actions connected.",
      icon: CalendarDays,
    },
    {
      title: "Automations",
      description: "Automate lead assignments, reminders and everyday workflows.",
      icon: Zap,
    },
    {
      title: "Contacts",
      description: "Keep every person, company and interaction organized.",
      icon: Users,
    },
    {
      title: "Deals",
      description: "Track opportunities clearly from first conversation to close.",
      icon: Handshake,
    },
    {
      title: "Forms",
      description: "Capture and organize new enquiries in one place.",
      icon: ClipboardList,
    },
  ];
  const featureJourneySteps = [2, 1, 1, 0, 2, 0];

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setJourneyVisible(true);
      return;
    }
    const section = document.querySelector(".workflow-features-section");
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setJourneyVisible(true);
      },
      { threshold: 0.15 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!journeyVisible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveJourneyStep((step) => (step + 1) % 3);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [journeyVisible]);

  return (
    <section className="workflow-features-section" aria-labelledby="workflow-features-title">
      <div className="container-width">
        <div className="workflow-showcase">
          <div className="workflow-showcase-ambient" aria-hidden="true">
            <span className="workflow-showcase-glow workflow-showcase-glow-blue" />
            <span className="workflow-showcase-glow workflow-showcase-glow-violet" />
            <span className="workflow-showcase-shine" />
            {Array.from({ length: 12 }, (_, index) => (
              <span className="workflow-showcase-particle" key={index} />
            ))}
          </div>
          <div className="workflow-showcase-intro">
            <span className="workflow-showcase-kicker">
              <span aria-hidden="true" />
              ONE CONNECTED WORKFLOW
            </span>
            <h2 id="workflow-features-title">
              Streamline your <span>client workflow.</span>
            </h2>
            <p>
              From the first enquiry to the next big deal, give every part of your customer journey
              a place to move forward.
            </p>
            <div
              role="group"
              className="workflow-journey"
              aria-label="A connected customer journey"
            >
              {[
                ["01", "Capture", "New lead"],
                ["02", "Connect", "Client meeting"],
                ["03", "Grow", "Deal won"],
              ].map(([number, stage, detail], index) => (
                <Fragment key={number}>
                  <div
                    className={[
                      "workflow-journey-step",
                      activeJourneyStep === index ? "is-active" : "",
                      activeJourneyStep > index ? "is-complete" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="workflow-journey-marker">{number}</span>
                    <div>
                      <strong>{stage}</strong>
                      <small>{detail}</small>
                    </div>
                  </div>
                  {index < 2 && (
                    <span
                      className={`workflow-journey-link ${activeJourneyStep > index ? "is-complete" : ""}`}
                      aria-hidden="true"
                    >
                      <span />
                    </span>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="workflow-features-grid">
            {features.map(({ title, description, icon: Icon }, index) => (
              <article
                className={[
                  "workflow-feature",
                  `workflow-feature-${index + 1}`,
                  journeyVisible ? "is-visible" : "",
                  activeJourneyStep === featureJourneySteps[index] ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={title}
              >
                <span className={`workflow-feature-icon workflow-feature-icon-${index + 1}`}>
                  <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="workflow-feature-copy">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <span className="workflow-feature-number" aria-hidden="true">
                  0{index + 1}
                </span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LeadManagementSection() {
  const [activeBenefit, setActiveBenefit] = useState(0);
  const benefits = [
    {
      title: "Lead tracking",
      description: "Capture every enquiry, track its source and assign a clear owner.",
    },
    {
      title: "Timely follow-ups",
      description: "Schedule the next call or email so promising conversations keep moving.",
    },
    {
      title: "A healthier pipeline",
      description:
        "See deal stages and priorities at a glance, then focus on what needs attention.",
    },
  ];
  const dashboardViews = [
    { label: "Lead tracking", title: "New enquiries" },
    { label: "Follow-ups", title: "Next steps due" },
    { label: "Pipeline overview", title: "Sales opportunities" },
  ];
  const activeDashboardView = dashboardViews[activeBenefit] ?? {
    label: "Lead tracking",
    title: "New enquiries",
  };
  const leadRows = [
    { initials: "PS", name: "Priya Sharma", owner: "Assigned to Rohan", source: "Website" },
    { initials: "NW", name: "Northwind Co.", owner: "Assigned to Aisha", source: "Referral" },
    { initials: "JM", name: "Jordan Mills", owner: "Assigned to Rohan", source: "LinkedIn" },
    { initials: "BL", name: "Brightline", owner: "Assigned to Meera", source: "Website" },
  ];
  const followUpRows = [
    { icon: PhoneCall, name: "Call Northwind Co.", due: "Today · 3:00 PM" },
    { icon: Mail, name: "Send proposal to Priya", due: "Today · 5:30 PM" },
    { icon: CalendarDays, name: "Demo with Brightline", due: "Tomorrow · 11:00 AM" },
    { icon: MessageCircle, name: "Check in with Jordan", due: "Wednesday · 10:00 AM" },
  ];
  const pipelineStages = [
    { name: "New leads", amount: "48", width: "85%" },
    { name: "Qualified", amount: "32", width: "62%" },
    { name: "In discussion", amount: "19", width: "40%" },
    { name: "Won", amount: "12", width: "24%" },
  ];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveBenefit((current) => (current + 1) % benefits.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [benefits.length]);

  return (
    <section className="lead-management-section" aria-labelledby="lead-management-title">
      <span className="lead-management-glow lead-management-glow-left" aria-hidden="true" />
      <span className="lead-management-glow lead-management-glow-right" aria-hidden="true" />
      <div className="lead-management-decoration" aria-hidden="true">
        <span className="lead-management-orbit lead-management-orbit-left" />
        <span className="lead-management-orbit lead-management-orbit-right" />
        {[
          { icon: Target, className: "lead-management-bubble-1" },
          { icon: CalendarDays, className: "lead-management-bubble-2" },
          { icon: Mail, className: "lead-management-bubble-3" },
          { icon: BarChart3, className: "lead-management-bubble-4" },
          { icon: Handshake, className: "lead-management-bubble-5" },
          { icon: Users, className: "lead-management-bubble-6" },
        ].map(({ icon: Icon, className }) => (
          <span className={`lead-management-bubble ${className}`} key={className}>
            <Icon size={22} strokeWidth={1.8} />
          </span>
        ))}
        {Array.from({ length: 16 }, (_, index) => (
          <span
            className="lead-management-particle"
            key={index}
            style={{
              left: `${(index * 37 + 11) % 97}%`,
              width: `${4 + (index % 4)}px`,
              height: `${4 + (index % 4)}px`,
              animationDelay: `-${(index * 1.7) % 14}s`,
              animationDuration: `${9 + (index % 7)}s`,
            }}
          />
        ))}
      </div>
      <div className="container-width">
        <div className="lead-management-heading">
          <p className="eyebrow">Key features</p>
          <h2 id="lead-management-title">
            Unlock more momentum with <span>MORSE CRM</span>
          </h2>
          <p>
            Make lead management, follow-ups and pipeline visibility part of one connected sales
            process.
          </p>
        </div>

        <div className="lead-management-layout">
          <div className="lead-management-copy">
            <h3>Turn every new lead into a clear next step.</h3>
            <p className="lead-management-intro">
              Keep your team focused on the right opportunities with customer context and sales
              activity together in one place.
            </p>
            <div className="lead-benefits" role="group" aria-label="CRM benefits">
              {benefits.map((benefit, index) => (
                <button
                  aria-pressed={activeBenefit === index}
                  className={`lead-benefit${activeBenefit === index ? " is-active" : ""}`}
                  key={benefit.title}
                  onClick={() => setActiveBenefit(index)}
                  type="button"
                >
                  <span className="lead-benefit-dot" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="lead-benefit-copy">
                    <strong>{benefit.title}</strong>
                    <span>{benefit.description}</span>
                  </span>
                  <span
                    className="lead-benefit-progress"
                    aria-hidden="true"
                    key={`${activeBenefit}-${index}`}
                  />
                </button>
              ))}
            </div>
            <Link className="lead-management-link" href="/features">
              Explore CRM features
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="lead-management-visual" aria-hidden="true">
            <div className="lead-visual-backdrop" />
            <div className="lead-floating-card lead-floating-card-one">
              <span className="lead-floating-icon lead-floating-icon-blue">
                <Bell size={17} />
              </span>
              <span>
                <strong>New lead assigned</strong>
                <small>Just now</small>
              </span>
            </div>
            <div className="lead-floating-card lead-floating-card-two">
              <span className="lead-floating-icon lead-floating-icon-violet">
                <PhoneCall size={17} />
              </span>
              <span>
                <strong>Follow-up due</strong>
                <small>Today, 3:00 PM</small>
              </span>
            </div>
            <div className="lead-floating-card lead-floating-card-three">
              <span className="lead-floating-icon lead-floating-icon-green">
                <Check size={17} />
              </span>
              <span>
                <strong>Deal won</strong>
                <small>+₹12,800</small>
              </span>
            </div>
            <div className="lead-dashboard">
              <div className="lead-dashboard-heading">
                <div>
                  <span>{activeDashboardView.label}</span>
                  <strong>{activeDashboardView.title}</strong>
                </div>
                <span className="lead-dashboard-period">This month</span>
              </div>
              <div className="lead-dashboard-stage" key={activeBenefit}>
                {activeBenefit === 0 &&
                  leadRows.map((row, index) => (
                    <div
                      className="lead-dashboard-row"
                      key={row.name}
                      style={{ animationDelay: `${index * 0.14 + 0.1}s` }}
                    >
                      <span className="lead-dashboard-avatar">{row.initials}</span>
                      <span className="lead-dashboard-person">
                        <strong>{row.name}</strong>
                        <small>{row.owner}</small>
                      </span>
                      <span className={`lead-dashboard-chip lead-dashboard-chip-${index}`}>
                        {row.source}
                      </span>
                    </div>
                  ))}
                {activeBenefit === 1 &&
                  followUpRows.map(({ icon: Icon, name, due }, index) => (
                    <div
                      className="lead-dashboard-row"
                      key={name}
                      style={{ animationDelay: `${index * 0.14 + 0.1}s` }}
                    >
                      <span className="lead-dashboard-avatar lead-dashboard-task-icon">
                        <Icon size={16} />
                      </span>
                      <span className="lead-dashboard-person">
                        <strong>{name}</strong>
                        <small>{due}</small>
                      </span>
                      <span className="lead-dashboard-check">
                        <Check size={13} />
                      </span>
                    </div>
                  ))}
                {activeBenefit === 2 &&
                  pipelineStages.map((stage, index) => (
                    <div
                      className="lead-dashboard-bar"
                      key={stage.name}
                      style={{ animationDelay: `${index * 0.12}s` }}
                    >
                      <div>
                        <span>{stage.name}</span>
                        <strong>{stage.amount}</strong>
                      </div>
                      <span className="lead-dashboard-track">
                        <span style={{ width: stage.width }} />
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomePricingSection() {
  const { plans, loading, error, reload } = usePricingPlans();

  return (
    <section className="home-pricing-section" aria-labelledby="home-pricing-title">
      <div className="container-width">
        <div className="home-pricing-heading">
          <p className="eyebrow">Plans and pricing</p>
          <h2 id="home-pricing-title">
            Straightforward pricing. <span className="home-pricing-heading-accent">Room to grow.</span>
          </h2>
          <p>Choose a MORSE CRM plan that fits your team and the way you work.</p>
        </div>

        <div className="home-pricing-grid">
          {loading ? (
            <p role="status">Loading pricing plans…</p>
          ) : error ? (
            <p role="alert">
              {error}{" "}
              <button type="button" onClick={() => void reload()}>Try again</button>
            </p>
          ) : plans.length === 0 ? (
            <p role="status">No pricing plans are currently available.</p>
          ) : (
            plans.map((plan) => (
              <article className="home-pricing-card" key={plan.id}>
                <p className="home-pricing-plan-name">{plan.name}</p>
                <h3>{plan.name}</h3>
                <div className="home-pricing-price">
                  <strong>{formatPricingAmount(plan.amount_cents, plan.currency)}</strong>
                  <span>/{billingIntervalLabel(plan.billing_interval)}</span>
                </div>
                <p className="home-pricing-description">{plan.description}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={17} aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="home-pricing-cta">
                  <Link href="/book-demo">Talk to sales</Link>
                </Button>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

// function CustomerStoriesSection() {
//   const [emblaRef, emblaApi] = useEmblaCarousel({
//     align: "center",
//     containScroll: "trimSnaps",
//     loop: true,
//   });
//   const [selectedIndex, setSelectedIndex] = useState(0);
//   const [snapCount, setSnapCount] = useState(0);

//   useEffect(() => {
//     if (!emblaApi) return;

//     const updateSelection = () => {
//       setSelectedIndex(emblaApi.selectedScrollSnap());
//       setSnapCount(emblaApi.scrollSnapList().length);
//     };
//     updateSelection();
//     emblaApi.on("select", updateSelection);
//     emblaApi.on("reInit", updateSelection);

//     return () => {
//       emblaApi.off("select", updateSelection);
//       emblaApi.off("reInit", updateSelection);
//     };
//   }, [emblaApi]);

//   useEffect(() => {
//     if (!emblaApi || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

//     const interval = window.setInterval(() => emblaApi.scrollNext(), 5500);
//     return () => window.clearInterval(interval);
//   }, [emblaApi]);

//   const stories = [
//     {
//       image: "/crm-sales-team.jpg",
//       imageAlt: "Sales colleagues reviewing customer information together",
//       category: "Lead management",
//       copy: "Keep every enquiry, owner and next follow-up together, so promising leads stay in motion.",
//       capability: "Leads · Ownership · Follow-ups",
//     },
//     {
//       image: "/growth-team-photo.jpg",
//       imageAlt: "A professional working through customer conversations on a laptop",
//       category: "Customer relationships",
//       copy: "See the people, conversations and activities connected to each customer in one place.",
//       capability: "Contacts · Organizations · Mail",
//     },
//     {
//       image: "/crm-customer-conversation.jpg",
//       imageAlt: "Two colleagues discussing a customer plan around a tablet",
//       category: "Pipeline visibility",
//       copy: "Make deal progress clear to the whole team, from the first conversation to a won opportunity.",
//       capability: "Pipeline · Reporting · Teamwork",
//     },
//     {
//       image: "/crm-sales-team.jpg",
//       imageAlt: "A sales team planning their next customer opportunity",
//       category: "Connected workflows",
//       copy: "Turn repeatable sales steps into clear workflows, with handoffs and actions your team can follow.",
//       capability: "Automation · Activities · Process",
//     },
//   ];

//   return (
//     <section className="customer-stories-section" aria-labelledby="customer-stories-title">
//       <div className="customer-stories-ambient" aria-hidden="true">
//         <span className="customer-stories-glow customer-stories-glow-left" />
//         <span className="customer-stories-glow customer-stories-glow-right" />
//         <span className="customer-stories-orbit customer-stories-orbit-left" />
//         <span className="customer-stories-orbit customer-stories-orbit-right" />
//         {[Handshake, MessageCircle, BarChart3, Users].map((Icon, index) => (
//           <span
//             className={`customer-stories-bubble customer-stories-bubble-${index + 1}`}
//             key={index}
//           >
//             <Icon size={21} strokeWidth={1.8} />
//           </span>
//         ))}
//       </div>
//       <div className="customer-stories-heading">
//         <p className="customer-stories-eyebrow">
//           <span aria-hidden="true" />
//           The MORSE CRM difference
//         </p>
//         <h2 id="customer-stories-title">
//           Better customer work starts with <span>a connected team.</span>
//         </h2>
//         <p>Explore how one shared workspace brings every part of the sales journey together.</p>
//       </div>

//       <div className="customer-stories-carousel" ref={emblaRef}>
//         <div className="customer-stories-track">
//           {stories.map((story, index) => (
//             <article
//               aria-current={selectedIndex === index ? "true" : undefined}
//               aria-label={`${story.category} story`}
//               aria-roledescription="slide"
//               className={`customer-story-slide${selectedIndex === index ? " is-active" : ""}`}
//               key={story.category}
//             >
//               <div className="customer-story-card">
//                 <div className="customer-story-image">
//                   <img src={story.image} alt={story.imageAlt} loading="lazy" />
//                   <span className="customer-story-image-index">
//                     0{index + 1}
//                     <small> / 0{stories.length}</small>
//                   </span>
//                 </div>
//                 <div className="customer-story-copy">
//                   <span className="customer-story-category">{story.category}</span>
//                   <p>{story.copy}</p>
//                   <div className="customer-story-capability">
//                     {story.capability.split(" · ").map((capability) => (
//                       <span key={capability}>{capability}</span>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             </article>
//           ))}
//         </div>
//       </div>

//       <div className="customer-stories-controls" aria-label="Customer stories carousel controls">
//         <button
//           className="customer-stories-nav"
//           type="button"
//           aria-label="Previous customer story"
//           onClick={() => emblaApi?.scrollPrev()}
//         >
//           <ArrowLeft size={18} />
//         </button>
//         <div className="customer-stories-dots" role="group" aria-label="Choose a customer story">
//           {Array.from({ length: snapCount }, (_, index) => (
//             <button
//               key={index}
//               type="button"
//               className={selectedIndex === index ? "active" : ""}
//               aria-label={`Show customer story ${index + 1}`}
//               aria-current={selectedIndex === index ? "true" : undefined}
//               onClick={() => emblaApi?.scrollTo(index)}
//             >
//               {selectedIndex === index && <span key={selectedIndex} />}
//             </button>
//           ))}
//         </div>
//         <button
//           className="customer-stories-nav"
//           type="button"
//           aria-label="Next customer story"
//           onClick={() => emblaApi?.scrollNext()}
//         >
//           <ArrowRight size={18} />
//         </button>
//       </div>
//     </section>
//   );
// }

function WhyConnected() {
  const [syncStage, setSyncStage] = useState(0);
  const connectedItems = ["Leads", "Contacts", "Quotes", "Activities", "Workflows", "Analytics"];
  const backgroundIcons = [Layers, BarChart3, MessageCircle, Link2, Mail, Check];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setSyncStage((stage) => (stage + 1) % 9);
    }, 1400);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="connected-showcase" aria-labelledby="connected-showcase-title">
      <div className="connected-ambient" aria-hidden="true">
        <span className="connected-glow connected-glow-left" />
        <span className="connected-glow connected-glow-right" />
        <span className="connected-orbit connected-orbit-left" />
        <span className="connected-orbit connected-orbit-right" />
        {backgroundIcons.map((Icon, index) => (
          <span className={`connected-bubble connected-bubble-${index + 1}`} key={index}>
            <Icon size={21} strokeWidth={1.8} />
          </span>
        ))}
        {Array.from({ length: 16 }, (_, index) => (
          <span
            className="connected-particle"
            key={index}
            style={{
              left: `${(index * 37 + 9) % 97}%`,
              width: `${4 + (index % 4)}px`,
              height: `${4 + (index % 4)}px`,
              animationDelay: `-${(index * 1.7) % 14}s`,
              animationDuration: `${9 + (index % 8)}s`,
            }}
          />
        ))}
      </div>
      <div className="connected-inner container-width">
        <div className="connected-heading">
          <p className="connected-eyebrow">
            <span aria-hidden="true" />
            Less fragmentation. More momentum.
          </p>
          <h2 id="connected-showcase-title">
            Your team doesn’t <span>need another tool.</span>
            {/* <span>It needs fewer disconnected ones.</span> */}
          </h2>
          <p className="connected-description">
            MORSE CRM connects the work before, during and after the sale. Not another place to
            store customer data — one place to move the relationship forward.
          </p>
        </div>

        <div className="connected-stage" data-sync-stage={syncStage}>
          <span className="connected-plate" aria-hidden="true" />
          <span className="connected-float connected-float-tabs" aria-hidden="true">
            <Layers size={19} />
            <span>
              <strong>Fewer tabs</strong>
              <small>Everything in one place</small>
            </span>
          </span>
          <span className="connected-float connected-float-truth" aria-hidden="true">
            <Link2 size={19} />
            <span>
              <strong>One source of truth</strong>
              <small>Always in sync</small>
            </span>
          </span>

          <div
            className="connected-board"
            role="group"
            aria-label="Scattered tools become one connected workspace"
          >
            <div className="connected-card connected-before">
              <div className="connected-card-kicker">BEFORE</div>
              <div className="connected-card-title">Scattered across tools</div>
              <div className="connected-scattered-tools">
                {["Spreadsheets", "Email", "Chat", "Reports"].map((item) => (
                  <span className="connected-scattered-tool" key={item}>
                    {item}
                  </span>
                ))}
              </div>
              <p>Important details get lost between apps.</p>
            </div>

            <div
              className={`connected-flow connected-flow-before${syncStage >= 3 && syncStage <= 5 ? " is-active" : ""}`}
              aria-hidden="true"
            >
              <span className="connected-flow-arrow">
                <ArrowRight size={17} />
              </span>
            </div>

            <div className={`connected-hub${syncStage === 4 ? " is-pulsing" : ""}`}>
              <span className="connected-hub-mark">
                <span className="brand-mark" />
              </span>
              <strong>MORSE CRM</strong>
              <span>One connected workspace</span>
            </div>

            <div
              className={`connected-flow connected-flow-after${syncStage >= 4 && syncStage <= 7 ? " is-active" : ""}`}
              aria-hidden="true"
            >
              <span className="connected-flow-arrow">
                <ArrowRight size={17} />
              </span>
            </div>

            <div className="connected-card connected-after">
              <span
                className={`connected-sync-badge${syncStage >= 7 && syncStage <= 8 ? " is-synced" : ""}`}
                role="status"
                aria-live="polite"
              >
                <span aria-hidden="true" />
                {syncStage >= 7 && syncStage <= 8
                  ? "All synced"
                  : syncStage >= 3 && syncStage <= 6
                    ? "Syncing…"
                    : "Waiting…"}
              </span>
              <div className="connected-card-kicker">WITH MORSE CRM</div>
              <div className="connected-card-title">Every step, in sync</div>
              <div className="connected-integrated-tools">
                {connectedItems.map((item) => (
                  <span
                    className={`connected-integrated-tool${syncStage >= 5 && syncStage <= 8 ? " is-synced" : ""}`}
                    key={item}
                  >
                    <span className="connected-check">
                      <Check size={12} />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
              <p>Shared context moves every relationship forward.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SalesJourney() {
  const [active, setActive] = useState(0);
  const stages = [
    {
      name: "Capture",
      title: "Every enquiry has somewhere to go.",
      description:
        "Bring leads in through web forms, data imports and customer conversations. Record the source, associate the organization and give the opportunity an owner.",
      view: "Leads",
    },
    {
      name: "Qualify",
      title: "Focus on the right opportunities.",
      description:
        "Review the customer’s needs, associate the right people and define a clear next step. Custom attributes keep business-specific information close to the opportunity.",
      view: "Contacts",
    },
    {
      name: "Engage",
      title: "A conversation with all the context.",
      description:
        "Keep emails, meetings and follow-ups linked to the contact and lead. Your team can see what has happened and what has been promised next.",
      view: "Mail",
    },
    {
      name: "Close",
      title: "Turn the conversation into a quote.",
      description:
        "Connect products, customer information and commercial value in one quotation. Keep the status visible as the opportunity moves towards a won deal.",
      view: "Quotes",
    },
    {
      name: "Grow",
      title: "Keep the relationship moving forward.",
      description:
        "Stay close to the account after the sale. Review customer history, schedule the next activity and organize expansion opportunities in a shared pipeline.",
      view: "Analytics",
    },
  ] as const;
  const selectedStage = stages[active] ?? stages[0];

  return (
    <section className="journey-band">
      <div className="container-width section-space">
        <div className="journey-heading">
          <p className="journey-eyebrow">Your customer journey</p>
          <h2 id="journey-title">
            <span>A complete story, from first</span>
            <span>enquiry to loyal customer.</span>
          </h2>
          <p className="journey-description">
            Every stage has the context, action and visibility your team needs.
          </p>
        </div>
        <div className="journey-tabs">
          {stages.map((stage, index) => (
            <button
              key={stage.name}
              type="button"
              className={active === index ? "journey-active" : ""}
              aria-pressed={active === index}
              onClick={() => setActive(index)}
            >
              {stage.name}
            </button>
          ))}
        </div>
        <div className="journey-content">
          <div className="journey-copy">
            <p className="eyebrow">{selectedStage.name}</p>
            <h3>{selectedStage.title}</h3>
            <p>{selectedStage.description}</p>
          </div>
          <div className="journey-preview">
            <ProductPreview initial={selectedStage.view} tabs={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

// function TeamSolutions() {
//   return (
//     <section className="container-width section-space team-solutions">
//       <SectionTitle
//         eyebrow="Built for how teams work"
//         title="Different teams. One source of truth."
//         description="Sales, operations and leadership all work from the same customer context and deal momentum."
//       />
//       <div className="solution-grid">
//         {[
//           {
//             title: "Sales teams",
//             description: "A single view of customers, pipeline and next action.",
//           },
//           {
//             title: "Operations",
//             description: "Repeatable process, consistent routing and fewer gaps.",
//           },
//           {
//             title: "Management",
//             description: "Clear visibility into performance, progress and pipeline health.",
//           },
//         ].map((item) => (
//           <div key={item.title} className="mini-solution-card">
//             <h3>{item.title}</h3>
//             <p>{item.description}</p>
//             <Link href="/solutions">
//               Explore
//               <ChevronRight size={14} />
//             </Link>
//           </div>
//         ))}
//       </div>
//     </section>
//   );
// }

// function CommandSearch() {
//   const integrations = ["Logoipsum", "Logoipsum", "logoipsum", "logo", "Logoipsum"];

//   return (
//     <section className="integrations-section">
//       <div className="container-width">
//         <div className="integrations-header">
//           <h2>Integrate with the tools you already use</h2>
//           <p>Get more done in a day by connecting MORSE CRM to your favorite software.</p>
//         </div>

//         <div className="logo-cloud" aria-label="Integration partners">
//           {integrations.map((brand, index) => (
//             <div key={`${brand}-${index}`} className="integration-tool">
//               <span className="tool-mark" aria-hidden="true">
//                 {index % 2 === 0 ? "◉" : index === 2 ? "◌" : "◔"}
//               </span>
//               <span className="tool-name">{brand}</span>
//             </div>
//           ))}
//         </div>

//         <div className="global-payments" aria-label="Global payments map">
//           <h3>Get money from people all over the world.</h3>
//           <p>
//             Effortlessly receive payments from individuals across the globe, regardless of their
//             location or time zone.
//           </p>

//           <div className="payments-map">
//             <div className="world-globe" aria-hidden="true" />
//             <span className="world-arc arc-one" aria-hidden="true" />
//             <span className="world-arc arc-two" aria-hidden="true" />
//             <span className="world-arc arc-three" aria-hidden="true" />

//             <div className="country-marker marker-bangladesh" role="img" aria-label="Bangladesh">
//               <span className="marker-dot" aria-hidden="true">
//                 <CountryFlag country="bangladesh" />
//               </span>
//               <span className="marker-label">Bangladesh</span>
//             </div>
//             <div className="country-marker marker-colombia" role="img" aria-label="Colombia">
//               <span className="marker-dot" aria-hidden="true">
//                 <CountryFlag country="colombia" />
//               </span>
//               <span className="marker-label">Colombia</span>
//             </div>
//             <div className="country-marker marker-argentina" role="img" aria-label="Argentina">
//               <span className="marker-dot" aria-hidden="true">
//                 <CountryFlag country="argentina" />
//               </span>
//               <span className="marker-label">Argentina</span>
//             </div>
//             <div className="country-marker marker-france" role="img" aria-label="France">
//               <span className="marker-dot" aria-hidden="true">
//                 <CountryFlag country="france" />
//               </span>
//               <span className="marker-label">France</span>
//             </div>
//             <div className="country-marker marker-belgium" role="img" aria-label="Belgium">
//               <span className="marker-dot" aria-hidden="true">
//                 <CountryFlag country="belgium" />
//               </span>
//               <span className="marker-label">Belgium</span>
//             </div>
//             <div className="country-marker marker-india" role="img" aria-label="India">
//               <span className="marker-dot" aria-hidden="true">
//                 <CountryFlag country="india" />
//               </span>
//               <span className="marker-label">India</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }

// type Country = "argentina" | "bangladesh" | "belgium" | "colombia" | "france" | "india";

// function CountryFlag({ country }: { country: Country }) {
//   const flags = {
//     bangladesh: (
//       <>
//         <rect width="32" height="32" fill="#006a4e" />
//         <circle cx="17" cy="16" r="8" fill="#f42a41" />
//       </>
//     ),
//     colombia: (
//       <>
//         <rect width="32" height="16" fill="#fcd116" />
//         <rect y="16" width="32" height="8" fill="#003893" />
//         <rect y="24" width="32" height="8" fill="#ce1126" />
//       </>
//     ),
//     argentina: (
//       <>
//         <rect width="32" height="10.67" fill="#74acdf" />
//         <rect y="10.67" width="32" height="10.66" fill="#fff" />
//         <rect y="21.33" width="32" height="10.67" fill="#74acdf" />
//         <circle cx="16" cy="16" r="3" fill="#f6b40e" />
//       </>
//     ),
//     france: (
//       <>
//         <rect width="10.67" height="32" fill="#0055a4" />
//         <rect x="10.67" width="10.66" height="32" fill="#fff" />
//         <rect x="21.33" width="10.67" height="32" fill="#ef4135" />
//       </>
//     ),
//     belgium: (
//       <>
//         <rect width="10.67" height="32" fill="#181818" />
//         <rect x="10.67" width="10.66" height="32" fill="#fdda25" />
//         <rect x="21.33" width="10.67" height="32" fill="#ef3340" />
//       </>
//     ),
//     india: (
//       <>
//         <rect width="32" height="10.67" fill="#ff9933" />
//         <rect y="10.67" width="32" height="10.66" fill="#fff" />
//         <rect y="21.33" width="32" height="10.67" fill="#138808" />
//         <circle cx="16" cy="16" r="4" fill="none" stroke="#000080" strokeWidth="1" />
//         <circle cx="16" cy="16" r="1" fill="#000080" />
//       </>
//     ),
//   } satisfies Record<Country, React.ReactNode>;

//   return (
//     <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
//       {flags[country]}
//     </svg>
//   );
// }
