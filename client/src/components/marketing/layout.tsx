"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Fragment } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  FileText,
  GitBranch,
  Layers,
  Menu,
  ArrowUp,
  ShieldCheck,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Newsletter } from "./forms";

export const navigation = [
  {
    name: "Product",
    items: [
      {
        title: "Product overview",
        description: "Your entire CRM, connected.",
        href: "/product",
        icon: Layers,
      },
      {
        title: "All features",
        description: "Explore the complete toolkit.",
        href: "/features",
        icon: FileText,
      },
      {
        title: "Lead management",
        description: "Capture and qualify every opportunity.",
        href: "/features/leads",
        icon: Users,
      },
      {
        title: "Sales pipeline",
        description: "Every deal and its next step.",
        href: "/features/pipeline",
        icon: GitBranch,
      },
      {
        title: "Automation",
        description: "Build repeatable sales processes.",
        href: "/features/automation",
        icon: Workflow,
      },
      {
        title: "Analytics",
        description: "See the numbers behind sales.",
        href: "/features/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    name: "Solutions",
    items: [
      {
        title: "All solutions",
        description: "One workspace, different teams.",
        href: "/solutions",
        icon: Building2,
      },
      {
        title: "Sales teams",
        description: "Keep every opportunity moving.",
        href: "/solutions/sales-teams",
        icon: Users,
      },
      {
        title: "Small business",
        description: "Less admin. Better relationships.",
        href: "/solutions/small-business",
        icon: Building2,
      },
      {
        title: "Growing companies",
        description: "Structure that grows with you.",
        href: "/solutions/growing-companies",
        icon: GitBranch,
      },
      {
        title: "Enterprise",
        description: "Control, flexibility and visibility.",
        href: "/solutions/enterprise",
        icon: ShieldCheck,
      },
      {
        title: "Operations",
        description: "Standardize the work behind sales.",
        href: "/solutions/operations",
        icon: Workflow,
      },
      {
        title: "Management",
        description: "Make decisions with shared context.",
        href: "/solutions/management",
        icon: BarChart3,
      },
    ],
  },
  {
    name: "Resources",
    items: [
      {
        title: "Resource library",
        description: "Practical ideas for connected sales.",
        href: "/resources",
        icon: BookOpen,
      },
      {
        title: "CRM guide",
        description: "Build a process worth repeating.",
        href: "/resources/crm-guide",
        icon: FileText,
      },
      {
        title: "Blog",
        description: "Sales and customer relationships.",
        href: "/blog",
        icon: BookOpen,
      },
      {
        title: "Documentation",
        description: "Understand the CRM modules.",
        href: "/documentation",
        icon: FileText,
      },
      {
        title: "Help center",
        description: "Answers and product guidance.",
        href: "/help-center",
        icon: BookOpen,
      },
      {
        title: "Product updates",
        description: "Stay connected to what’s next.",
        href: "/product-updates",
        icon: Layers,
      },
    ],
  },
  {
    name: "Company",
    items: [
      {
        title: "About",
        description: "A more connected way to work.",
        href: "/about",
        icon: Building2,
      },
      // {
      //   title: "Contact",
      //   description: "Let’s talk about your team.",
      //   href: "/contact",
      //   icon: Users,
      // },
      // {
      //   title: "Careers",
      //   description: "Build better customer experiences.",
      //   href: "/careers",
      //   icon: Users,
      // },
      {
        title: "Security",
        description: "Access and data responsibility.",
        href: "/security",
        icon: ShieldCheck,
      },
      {
        title: "Privacy",
        description: "How information is handled.",
        href: "/privacy",
        icon: FileText,
      },
    ],
  },
] as const;

export function Navbar() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobile]);
  useEffect(() => {
    if (!open && !mobile) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, mobile]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className={cn("site-header", scrolled && "header-scrolled")}>
        <div className="nav-inner">
          <Link href="/" className="brand" aria-label="MORSE CRM home">
            <Image
              src="/logonew.png"
              alt="MORSE CRM"
              width={442}
              height={247}
              priority
              className="brand-logo"
            />
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map((group, index) => (
              <Fragment key={group.name}>
                {index === 2 && (
                  <Link className="nav-link pricing-nav" href="/pricing">
                    Pricing
                  </Link>
                )}
                <div
                  className="nav-group"
                  onMouseEnter={() => setOpen(group.name)}
                  onMouseLeave={() => setOpen(null)}
                >
                  <Button
                    variant="ghost"
                    className="nav-link hover:bg-transparent hover:text-[var(--foreground)]"
                    aria-expanded={open === group.name}
                    aria-controls={"nav-" + group.name}
                    onClick={() => setOpen(open === group.name ? null : group.name)}
                  >
                    {group.name}
                    <ChevronDown size={13} className={cn(open === group.name && "chevron-open")} />
                  </Button>
                  {open === group.name && (
                    <div id={"nav-" + group.name} className="nav-dropdown">
                      {group.items.map((item) => (
                        <Link
                          key={item.title}
                          href={item.href}
                          className="dropdown-item"
                          onClick={() => setOpen(null)}
                        >
                          <span>
                            <item.icon size={18} />
                          </span>
                          <div>
                            <b>{item.title}</b>
                            <small>{item.description}</small>
                          </div>
                          <ArrowUpRight size={14} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </Fragment>
            ))}
          </nav>
          <div className="nav-actions">
            <Button asChild className="nav-trial">
              <Link href="/book-demo">
                Book a Demo
                <ArrowUpRight />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-toggle"
              aria-label={mobile ? "Close navigation" : "Open navigation"}
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
      {mobile && (
        <div className="mobile-menu">
          <nav aria-label="Mobile navigation">
            {navigation.map((group) => (
              <div key={group.name}>
                <Button
                  variant="ghost"
                  aria-expanded={open === group.name}
                  onClick={() => setOpen(open === group.name ? null : group.name)}
                >
                  {group.name}
                  <ChevronDown className={cn(open === group.name && "chevron-open")} />
                </Button>
                {open === group.name && (
                  <div className="mobile-submenu">
                    {group.items.map((item) => (
                      <Link key={item.title} href={item.href}>
                        <item.icon size={17} />
                        <span>
                          {item.title}
                          <small>{item.description}</small>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
          </nav>
          <Button asChild className="cta-button nav-trial">
            <Link href="/book-demo">
              Book a Demo
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-atmosphere" aria-hidden="true">
        <span className="footer-glow footer-glow-blue" />
        <span className="footer-glow footer-glow-violet" />
        {/* <span className="footer-watermark">MORSE CRM</span> */}
      </div>
      <div className="container-width">
        <div className="footer-top">
          <Link href="/" className="brand footer-brand" aria-label="MORSE CRM home">
            <Image
              src="/logo-2.png"
              alt="MORSE CRM"
              width={442}
              height={247}
              className="brand-logo footer-brand-logo"
            />
          </Link>
          <div className="footer-cta">
            <p>
              Your entire sales operation.
              <span> Finally in sync.</span>
            </p>
            <Button asChild className="footer-cta-button">
              <Link href="/book-demo">
                Book a Demo <ArrowUpRight size={18} />
              </Link>
            </Button>
          </div>
        </div>
        <nav className="footer-columns" aria-label="Footer">
          {navigation.map((group) => (
            <div className="footer-column" key={group.name}>
              <h3>{group.name}</h3>
              {group.items.map((item) => (
                <Link key={item.title} href={item.href}>
                  {item.title}
                </Link>
              ))}
            </div>
          ))}
          <div className="footer-column">
            <h3>Connect</h3>
            <Link href="/pricing">Pricing</Link>
            <Link href="/book-demo">Book a Demo</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/security">Security</Link>
          </div>
        </nav>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Powered By{" "}
            <a href="https://imorsetech.com" target="_blank" rel="noopener noreferrer">
            iMorse Technologies 
            </a>{" "}
            Pvt. Ltd. All rights reserved.
          </span>
          <p>MorseCRM By iMorse Technologies Pvt Ltd</p>
          <button
            className="footer-back-to-top"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Back to top <ArrowUp size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
