"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { requestSchema } from "@/lib/request-schema";
import { submitRequest } from "@/lib/requests.functions";

export function RequestForm({ kind = "demo" }: { kind?: "demo" | "trial" | "contact" }) {
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [responseMessage, setResponseMessage] = useState("");
  const submissionId = useRef<string | null>(null);

  return (
    <form
      className="request-form"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const payload = {
          ...Object.fromEntries(form),
          consent: form.get("consent") === "on",
          kind,
          submission_id: (submissionId.current ??= crypto.randomUUID()),
        };
        const result = requestSchema.safeParse(payload);

        if (!result.success) {
          const validationErrors = Object.fromEntries(
            result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
          );
          setErrors(validationErrors);
          setState("idle");
          toast.error("Please check the highlighted fields.");
          const firstInvalidField = result.error.issues[0]?.path[0];
          if (firstInvalidField) {
            const field = formElement.elements.namedItem(String(firstInvalidField));
            if (field instanceof HTMLElement) field.focus();
          }
          return;
        }

        setErrors({});
        setResponseMessage("");
        setState("loading");

        try {
          const response = await submitRequest(result.data);
          setResponseMessage(response.message);
          if (response.ok) {
            formElement.reset();
            submissionId.current = null;
            setErrors({});
            setState("idle");
            toast.success(response.message, { duration: 10000 });
          } else {
            setState("idle");
            toast.error(response.message, { duration: 10000 });
          }
        } catch {
          setState("idle");
          const message = "We couldn’t save your request. Please try again.";
          setResponseMessage(message);
          toast.error(message, { duration: 10000 });
        }
      }}
    >
      <div className="form-heading">
        <h2>
          {kind === "demo"
            ? "Tell us about your team."
            : kind === "trial"
              ? "Start a more connected sales process."
              : "How can we help?"}
        </h2>
        <p>
          {kind === "demo"
            ? "A focused conversation around your process, not a generic product tour."
            : kind === "trial"
              ? "Request trial access for your team. A workspace is not created automatically."
              : "Share your question or requirements with us."}
        </p>
      </div>
      <div className="form-grid">
        {kind === "demo" && (
          <label className="full-field">
            Organization name <span>*</span>
            <input
              name="organization"
              type="text"
              required
              maxLength={191}
              placeholder="e.g. Acme Solutions"
              autoComplete="organization"
              aria-invalid={Boolean(errors.organization)}
              aria-describedby={errors.organization ? "organization-error" : undefined}
              onChange={() => {
                if (errors.organization) {
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.organization;
                    return next;
                  });
                }
              }}
            />
            {errors.organization && (
              <small id="organization-error" className="field-error">
                {errors.organization}
              </small>
            )}
          </label>
        )}
        {[
          ["first_name", "First name", "text", true],
          ["last_name", "Last name", "text", false],
          ["email", "Work email", "email", true],
          ["phone", "Phone", "tel", false],
        ].map(([name, label, type, required]) => (
          <label key={String(name)}>
            {label}
            {required && <span> *</span>}
            <input
              name={String(name)}
              type={String(type)}
              required={Boolean(required)}
              maxLength={name === "email" ? 254 : 100}
              onChange={() => {
                if (errors[String(name)]) {
                  setErrors((current) => {
                    const next = { ...current };
                    delete next[String(name)];
                    return next;
                  });
                }
              }}
              autoComplete={
                name === "first_name"
                  ? "given-name"
                  : name === "last_name"
                    ? "family-name"
                    : name === "email"
                      ? "email"
                      : name === "phone"
                        ? "tel"
                        : name === "company"
                          ? "organization"
                          : "organization-title"
              }
              aria-invalid={Boolean(errors[String(name)])}
              aria-describedby={errors[String(name)] ? `${name}-error` : undefined}
            />
            {errors[String(name)] && (
              <small id={`${name}-error`} className="field-error">
                {errors[String(name)]}
              </small>
            )}
          </label>
        ))}
        {kind === "demo" && (
          <>
            <label>
              City
              <input name="city" type="text" maxLength={100} placeholder="e.g. Ahmedabad" />
            </label>
            <label>
              State
              <input name="state" type="text" maxLength={100} placeholder="e.g. Gujarat" />
            </label>
            <label>
              Preferred Demo Date
              <input name="preferred_demo_date" type="date" />
            </label>
            <label>
              Preferred Demo Time
              <input name="preferred_demo_time" type="time" />
            </label>
          </>
        )}

        <label className="full-field">
          {kind === "demo" ? "What would you like to explore?" : "Your message"}
          {kind === "contact" && <span> *</span>}
          <textarea
            name="message"
            maxLength={3000}
            rows={4}
            required={kind === "contact"}
            placeholder="Your sales process, team needs, or integration requirements…"
            aria-invalid={Boolean(errors["message"])}
            aria-describedby={errors["message"] ? "message-error" : undefined}
            onChange={() => {
              if (errors["message"]) {
                setErrors((current) => {
                  const next = { ...current };
                  delete next["message"];
                  return next;
                });
              }
            }}
          />
          {errors["message"] && (
            <small id="message-error" className="field-error">
              {errors["message"]}
            </small>
          )}
        </label>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="consent-check">
        <input
          type="checkbox"
          required
          name="consent"
          aria-invalid={Boolean(errors["consent"])}
          aria-describedby={errors["consent"] ? "consent-error" : undefined}
          onChange={() => {
            if (errors["consent"]) {
              setErrors((current) => {
                const next = { ...current };
                delete next["consent"];
                return next;
              });
            }
          }}
        />
        <span>
          I agree to the <Link href="/privacy">Privacy Policy</Link> and consent to being contacted
          about this request.
        </span>
      </label>
      {errors["consent"] && (
        <small id="consent-error" className="field-error consent-error">
          {errors["consent"]}
        </small>
      )}
      <Button type="submit" className="cta-button w-full" disabled={state === "loading"}>
        {state === "loading" ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        {state === "loading"
          ? "Sending…"
          : kind === "demo"
            ? "Request a Demo"
            : kind === "trial"
              ? "Request Trial Access"
              : "Send Message"}
      </Button>
      {responseMessage && (
        <p className="full-field" role="status" aria-live="polite">
          {responseMessage}
        </p>
      )}
      <p className="form-note">Your information is used only to respond to your request.</p>
    </form>
  );
}

export function Newsletter() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const submissionId = useRef<string | null>(null);

  return (
    <form
      className="newsletter"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const email = String(new FormData(form).get("email") || "");
        const parsed = requestSchema.safeParse({
          kind: "newsletter",
          email,
          submission_id: (submissionId.current ??= crypto.randomUUID()),
        });

        if (!parsed.success) {
          setStatus("Enter a valid email address.");
          return;
        }

        setBusy(true);
        try {
          const response = await submitRequest(parsed.data);
          setStatus(response.message);
          if (response.ok) {
            form.reset();
            submissionId.current = null;
          }
        } catch {
          setStatus("Please try again shortly.");
        }
        setBusy(false);
      }}
    >
      <label htmlFor="newsletter-email">Get product updates and CRM insights.</label>
      <div>
        <input
          type="email"
          id="newsletter-email"
          name="email"
          required
          maxLength={254}
          placeholder="Your work email"
        />
        <Button type="submit" size="icon" aria-label="Subscribe to product updates" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </div>
      <small>
        By subscribing, you agree to our <Link href="/privacy">Privacy Policy</Link>.
      </small>
      <p role="status">{status}</p>
    </form>
  );
}
