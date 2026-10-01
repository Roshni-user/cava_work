"use client";

import { FormEvent, useState } from "react";
import { ConsultationBooking } from "@/components/ConsultationBooking";

const fields = [
  { id: "name", label: "Name", type: "text", required: true, autoComplete: "name" },
  { id: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
  { id: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel" },
  {
    id: "company",
    label: "Company",
    type: "text",
    required: false,
    autoComplete: "organization",
  },
] as const;

type FieldName = (typeof fields)[number]["id"] | "message";
type FormValues = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const emptyValues: FormValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const message = values.message.trim();

  if (!name) {
    errors.name = "Name is required.";
  }
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!phone) {
    errors.phone = "Phone is required.";
  }
  if (!message) {
    errors.message = "Message is required.";
  }

  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fieldErrors(value: unknown): FieldErrors {
  if (!isRecord(value)) {
    return {};
  }

  const errors: FieldErrors = {};
  const names: FieldName[] = ["name", "email", "phone", "company", "message"];

  for (const name of names) {
    const message = value[name];
    if (typeof message === "string" && message.trim()) {
      errors[name] = message.trim();
    }
  }

  return errors;
}

function userMessage(status: number, payload: unknown): string {
  const message = isRecord(payload) && typeof payload.message === "string" ? payload.message.trim() : "";
  const safe =
    message.length > 0 &&
    message.length < 200 &&
    !/prisma|postgres|stack|econn|database/i.test(message);

  if (!safe || status >= 500) {
    return status >= 500
      ? "We could not save your request. Please try again in a moment."
      : "We could not submit your request. Check the form and try again.";
  }

  return message;
}

export function ConsultSection() {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  function updateField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) {
        return current;
      }
      const next = { ...current };
      delete next[name];
      return next;
    });
    setNotice(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setNotice({ tone: "error", text: "Check the highlighted fields and try again." });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/consult", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          company: values.company.trim(),
          message: values.message.trim(),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const succeeded = response.ok && isRecord(payload) && payload.success === true;

      const id =
        succeeded && isRecord(payload) && typeof payload.consultationId === "string"
          ? payload.consultationId
          : "";

      if (succeeded && id) {
        setErrors({});
        setNotice(null);
        setConsultationId(id);
        return;
      }

      setErrors(fieldErrors(isRecord(payload) ? payload.errors : null));
      setNotice({ tone: "error", text: userMessage(response.status, payload) });
    } catch {
      setNotice({
        tone: "error",
        text: "We could not reach the consultation service. Check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="consult" className="border-t border-line bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">
            Consult now
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Talk through a Hubble fit
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Leave your name, email, phone, and a short note. Company is optional. After that,
            choose an open consultation time.
          </p>
        </div>

        {consultationId ? (
          <ConsultationBooking
            consultationId={consultationId}
            onRestart={() => setConsultationId(null)}
          />
        ) : (
        <form
          className="rounded-2xl border border-line bg-background p-5 shadow-sm sm:p-7"
          onSubmit={onSubmit}
          noValidate
          aria-busy={submitting}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const errorId = `${field.id}-error`;
              const error = errors[field.id];

              return (
                <div key={field.id}>
                  <label htmlFor={field.id} className="text-sm font-medium text-ink">
                    {field.label}
                    {field.required ? <span className="text-accent"> *</span> : null}
                  </label>
                  <input
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    required={field.required}
                    autoComplete={field.autoComplete}
                    value={values[field.id]}
                    disabled={submitting}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(event) => updateField(field.id, event.target.value)}
                    className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent disabled:opacity-70"
                  />
                  {error ? (
                    <p id={errorId} className="mt-1 text-sm text-red-800">
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <label htmlFor="message" className="text-sm font-medium text-ink">
              Message
              <span className="text-accent"> *</span>
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              value={values.message}
              disabled={submitting}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? "message-error" : undefined}
              onChange={(event) => updateField("message", event.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-70"
            />
            {errors.message ? (
              <p id="message-error" className="mt-1 text-sm text-red-800">
                {errors.message}
              </p>
            ) : null}
          </div>
          {notice ? (
            <p
              role={notice.tone === "error" ? "alert" : "status"}
              className={`mt-4 text-sm leading-6 ${
                notice.tone === "error" ? "text-red-800" : "text-accent-strong"
              }`}
            >
              {notice.text}
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted">
              Name, email, phone, and message are required.
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Sending…" : "Submit"}
          </button>
        </form>
        )}
      </div>
    </section>
  );
}
