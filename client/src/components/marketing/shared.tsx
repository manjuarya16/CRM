import Link from "next/link";
import { ArrowUpRight, Plus, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { faqs } from "@/data/marketing";

export function Actions() {
  return (
    <div className="actions">
      <Button asChild className="cta-button">
        <Link href="/book-demo">
          Book a Demo
          <ArrowUpRight />
        </Link>
      </Button>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-dark">{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-intro container-width">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <Actions />
    </section>
  );
}

export function FAQ() {
  return (
    <section className="container-width section-space faq-section">
      <div className="section-heading">
        <p className="eyebrow">A little more clarity</p>
        <h2 className="text-dark">
          Good questions. <span className="faq-heading-accent">Straight answers.</span>
        </h2>
        <p className="section-description">
          The details behind a more connected sales process.
        </p>
      </div>
      <div className="faq-list">
        {faqs.map(([q, a]) => (
          <details key={q} name="marketing-faq">
            <summary>
              {q}
              <Plus size={20} className="faq-plus" />
              <Minus size={20} className="faq-minus" />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="container-width">
        <div>
          <p className="eyebrow">Bring it all together</p>
          <h2>
            Ready to bring
            <br />
            the whole operation
            <br />
            <span>into sync?</span>
          </h2>
          <p>
            Build a sales process your team can actually scale. Bring leads, relationships,
            communication and automation together in one intelligent CRM.
          </p>
        </div>
        <Actions />
      </div>
    </section>
  );
}
