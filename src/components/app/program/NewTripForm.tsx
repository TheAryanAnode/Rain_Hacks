"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Sparkles } from "lucide-react";
import { createTripFromIntake } from "@/app/(app)/app/trips/actions";
import {
  parseIntake,
  toAirportCode,
  FIELD_PROMPT,
  REQUIRED_FIELDS,
  type IntakeField,
} from "@/lib/trip/intake";

/**
 * Trip intake.
 *
 * Two ways in: describe the trip in a sentence and let the parser fill the
 * fields, or type them directly. Either way the form refuses to submit until
 * origin, destination, and start date are present — those are the inputs
 * planning genuinely cannot proceed without, so asking beats guessing.
 */
export default function NewTripForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [freeText, setFreeText] = useState("");
  const [form, setForm] = useState({
    title: "",
    origin: "",
    destination: "",
    startDate: "",
    endDate: "",
    travelers: "1",
    budgetUsd: "",
    purpose: "OFFSITE",
    costCenter: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const missing: IntakeField[] = useMemo(
    () =>
      REQUIRED_FIELDS.filter((f) =>
        f === "origin" ? !form.origin.trim()
        : f === "destination" ? !form.destination.trim()
        : !form.startDate,
      ),
    [form.origin, form.destination, form.startDate],
  );

  const originCode = form.origin ? toAirportCode(form.origin) : undefined;

  /** Fills whatever the sentence contains; leaves the rest for the user. */
  function applyFreeText() {
    const parsed = parseIntake(freeText, {
      destination: form.destination || undefined,
    });
    setForm((f) => ({
      ...f,
      origin: parsed.origin ?? f.origin,
      startDate: parsed.startDate ?? f.startDate,
      endDate: parsed.endDate ?? f.endDate,
      travelers: parsed.travelers ? String(parsed.travelers) : f.travelers,
      budgetUsd: parsed.budgetUsd ? String(parsed.budgetUsd) : f.budgetUsd,
    }));
  }

  function submit() {
    if (missing.length) return;
    setError(null);
    startTransition(async () => {
      const res = await createTripFromIntake({
        title: form.title.trim() || `Trip to ${form.destination.trim()}`,
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        travelers: Math.max(1, Number(form.travelers) || 1),
        budgetUsd: form.budgetUsd ? Number(form.budgetUsd) : undefined,
        purpose: form.purpose,
        costCenter: form.costCenter.trim() || undefined,
      });
      if (res?.tripId) router.push(`/app/trips/${res.tripId}`);
      else setError("Could not create the trip. Check the fields and try again.");
    });
  }

  return (
    <div className="space-y-4">
      {/* Describe-it-in-a-sentence shortcut */}
      <section className="wp-card p-5">
        <label className="wp-label" htmlFor="freetext">
          Describe the trip
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="freetext"
            className="wp-input"
            placeholder="Offsite in Lisbon from SFO on March 14 for 4 days, 12 people, $32,000"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFreeText()}
          />
          <button
            type="button"
            onClick={applyFreeText}
            disabled={!freeText.trim()}
            className="wp-btn-sm shrink-0 disabled:opacity-40"
            data-tone="accent"
          >
            <Sparkles size={13} /> Fill fields
          </button>
        </div>
        <p className="mt-2 text-xs text-text-tertiary">
          Anything it can&apos;t work out is left blank for you to complete below.
        </p>
      </section>

      {/* Required fields still outstanding */}
      {missing.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/8 px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-warn" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              Still needed before WAYPORT can plan
            </p>
            <ul className="mt-1.5 space-y-1">
              {missing.map((m) => (
                <li key={m} className="text-sm text-text-secondary">
                  {FIELD_PROMPT[m]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section className="wp-card space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Departing from"
            required
            hint={originCode ? `Resolved to ${originCode}` : "City or airport code"}
            missing={!form.origin.trim()}
          >
            <input
              className="wp-input"
              placeholder="San Francisco or SFO"
              value={form.origin}
              onChange={(e) => set("origin", e.target.value)}
            />
          </Field>

          <Field label="Destination" required missing={!form.destination.trim()}>
            <input
              className="wp-input"
              placeholder="Lisbon, Portugal"
              value={form.destination}
              onChange={(e) => set("destination", e.target.value)}
            />
          </Field>

          <Field
            label="Start date"
            required
            hint="Every itinerary time is anchored to this"
            missing={!form.startDate}
          >
            <input
              type="date"
              className="wp-input"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>

          <Field label="End date" hint="Optional — leave blank for a one-day trip">
            <input
              type="date"
              className="wp-input"
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Trip name" hint="Defaults to the destination">
          <input
            className="wp-input"
            placeholder="Engineering Offsite — Lisbon"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Travelers" hint="More than one adds coordination">
            <input
              type="number"
              min={1}
              className="wp-input"
              value={form.travelers}
              onChange={(e) => set("travelers", e.target.value)}
            />
          </Field>

          <Field label="Budget (USD)">
            <input
              type="number"
              min={0}
              className="wp-input"
              placeholder="32000"
              value={form.budgetUsd}
              onChange={(e) => set("budgetUsd", e.target.value)}
            />
          </Field>

          <Field label="Cost center">
            <input
              className="wp-input"
              placeholder="ENG-1042"
              value={form.costCenter}
              onChange={(e) => set("costCenter", e.target.value)}
            />
          </Field>
        </div>

        {Number(form.travelers) > 1 && (
          <Field label="Purpose" hint="Drives policy tier and approval routing">
            <select
              className="wp-select"
              value={form.purpose}
              onChange={(e) => set("purpose", e.target.value)}
            >
              <option value="OFFSITE">Team offsite</option>
              <option value="CONFERENCE">Conference</option>
              <option value="CLIENT_VISIT">Client visit</option>
              <option value="TRAINING">Training</option>
              <option value="RECRUITING">Recruiting</option>
            </select>
          </Field>
        )}

        {error && <p className="text-sm text-err">{error}</p>}

        <div className="flex items-center gap-3 border-t border-white/8 pt-5">
          <button
            onClick={submit}
            disabled={missing.length > 0 || pending}
            className="wp-cta px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Creating…" : "Create trip"}
          </button>
          {missing.length > 0 && (
            <span className="text-xs text-text-tertiary">
              {missing.length} required field{missing.length === 1 ? "" : "s"} left
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  missing,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  missing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="wp-label flex items-center gap-1.5">
        {label}
        {required && (
          <span className={missing ? "text-warn" : "text-ok"} aria-label="required">
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}
