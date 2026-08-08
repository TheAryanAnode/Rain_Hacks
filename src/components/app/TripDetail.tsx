"use client";

import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import QualityPanel from "@/components/app/QualityPanel";
import BookingReview from "@/components/app/BookingReview";
import VoiceDemo from "@/components/app/VoiceDemo";
import TripEditPanel from "@/components/app/TripEditPanel";
import RiskAwarePanel from "@/components/app/RiskAwarePanel";
import DecisionTracePanel from "@/components/app/DecisionTracePanel";
import DecisionGraph from "@/components/graph/DecisionGraph";
import type { NormalizedOffer } from "@/lib/tools/providers/booking";
import type { RiskDecision } from "@/lib/decision/risk";
import type { DecisionTrace } from "@/lib/decision/transparency";
import { useEffect, useState } from "react";
import { day0DinnerRiskDecision } from "@/lib/decision/risk";

type Item = {
  id: string;
  kind: string;
  title: string;
  status: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  location?: string | null;
  payload?: {
    priceUsd?: number;
    description?: string;
    whatToDo?: string[];
    notes?: string;
  } | null;
};

type Action = {
  id: string;
  agent: string;
  action: string;
  tool?: string;
  createdAt: string | Date;
  status: string;
};

type Trip = {
  id: string;
  title: string;
  destination: string;
  mode: string;
  status: string;
  budgets?: { totalBudget: number; actual: number; remaining: number; currency: string }[];
  items: Item[];
  alerts: { id: string; title: string; body: string; severity: string }[];
};

export default function TripDetail({
  trip,
  actions = [],
  meta = {},
}: {
  trip: Trip;
  actions?: Action[];
  meta?: Record<string, unknown>;
}) {
  const [tab, setTab] = useState<"itinerary" | "graph" | "quality" | "activity" | "money" | "alerts" | "book">("itinerary");
  const [openId, setOpenId] = useState<string | null>(null);
  const [hotelOffers, setHotelOffers] = useState<NormalizedOffer[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const budget = trip.budgets?.[0] ?? { totalBudget: 2500, actual: 0, remaining: 2500, currency: "USD" };
  const itemTotal = trip.items.reduce((s, it) => s + Number(it.payload?.priceUsd ?? 0), 0);
  const grandTotal = itemTotal || Number(budget.actual) || 0;
  const risk = (meta.risk as RiskDecision | undefined) ?? day0DinnerRiskDecision();
  const hotelDecision = meta.hotelDecision as DecisionTrace | undefined;
  const localDecision = meta.localDecision as DecisionTrace | undefined;

  useEffect(() => {
    if (tab !== "book") return;
    fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "search",
        tripId: trip.id,
        kind: "hotel",
        params: { destination: trip.destination },
      }),
    })
      .then((r) => r.json())
      .then((d) => setHotelOffers(d.offers ?? []));
  }, [tab, trip.id, trip.destination]);

  async function shareTrip() {
    setShareBusy(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareUrl(data.url);
        setMarkdown(data.markdown);
      }
    } finally {
      setShareBusy(false);
    }
  }

  const hotelTitle = trip.items.find((i) => i.kind === "HOTEL")?.title;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wp-eyebrow">{trip.destination}</p>
          <h1 className="font-display mt-2 text-4xl">{trip.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className={cn("rounded-full px-3 py-1", trip.mode === "LIVE" ? "bg-ok/10 text-ok" : "bg-white/10 text-text-secondary")}>
              {trip.mode}
            </span>
            <span className="text-text-tertiary">{trip.items.length} items</span>
            <span className="rounded-full bg-ember/15 px-3 py-1 text-ember">
              Grand total {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={shareTrip} disabled={shareBusy} className="wp-cta-ghost px-4 py-2 text-sm disabled:opacity-50">
            {shareBusy ? "Sharing…" : "Share / export"}
          </button>
          <Link href="/app" className="wp-cta px-4 py-2 text-sm">
            Map OS
          </Link>
          <Link href="/app/concierge" className="wp-cta-ghost px-4 py-2 text-sm">
            Concierge
          </Link>
        </div>
      </header>

      {shareUrl && (
        <div className="wp-glass rounded-2xl p-4 text-sm">
          <div className="wp-eyebrow">Shareable proposal</div>
          <a href={shareUrl} className="mt-2 block break-all text-ember" target="_blank" rel="noreferrer">
            {shareUrl}
          </a>
          {markdown && (
            <details className="mt-3">
              <summary className="cursor-pointer text-text-tertiary">Markdown export</summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-text-secondary">{markdown}</pre>
            </details>
          )}
        </div>
      )}

      <VoiceDemo tripId={trip.id} hotelName={hotelTitle} />

      <TripEditPanel tripId={trip.id} />

      <RiskAwarePanel risk={risk} />

      {(hotelDecision || localDecision) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {hotelDecision && <DecisionTracePanel decision={hotelDecision} />}
          {localDecision && <DecisionTracePanel decision={localDecision} />}
        </div>
      )}

      <nav className="flex flex-wrap gap-2 border-b border-white/10">
        {(["itinerary", "graph", "quality", "book", "activity", "money", "alerts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-3 text-sm capitalize",
              tab === t ? "border-ember text-white" : "border-transparent text-text-secondary hover:text-white",
            )}
          >
            {t === "graph" ? "3D Graph" : t}
          </button>
        ))}
      </nav>

      {tab === "graph" && <DecisionGraph trip={trip} />}

      {tab === "quality" && <QualityPanel tripId={trip.id} />}

      {tab === "book" && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Real/search inventory → review → policy check → <strong className="text-white">mock</strong> transaction → graph update.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {hotelOffers.map((o) => (
              <div key={o.id} className="wp-glass rounded-2xl p-4 text-sm">
                <div className="font-medium">{o.title}</div>
                <div className="mt-1 text-ember">{formatCurrency(o.priceUsd)}</div>
                {o.effective && (
                  <div className="text-xs text-text-tertiary">Effective {formatCurrency(o.effective.effectiveUsd)}</div>
                )}
              </div>
            ))}
          </div>
          {hotelOffers[0] && <BookingReview tripId={trip.id} offer={hotelOffers[0]} />}
        </div>
      )}

      {tab === "itinerary" && (
        <div className="space-y-4">
          {trip.items.length === 0 ? (
            <div className="wp-glass rounded-2xl p-10 text-center text-text-secondary">No itinerary items yet.</div>
          ) : (
            <ol className="space-y-3">
              {trip.items.map((item) => {
                const price = item.payload?.priceUsd;
                const open = openId === item.id;
                return (
                  <li key={item.id} className="wp-glass overflow-hidden rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : item.id)}
                      className="grid w-full gap-3 p-5 text-left md:grid-cols-[auto,1fr,auto,auto] md:items-center"
                    >
                      <div className="font-mono text-sm text-text-tertiary">
                        {item.startTime
                          ? new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "--:--"}
                      </div>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="mt-1 text-xs text-text-tertiary">
                          {item.kind}
                          {item.location ? ` · ${item.location}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-ember">
                        {price != null ? formatCurrency(price) : "—"}
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs",
                          item.status === "CONFIRMED"
                            ? "bg-ok/10 text-ok"
                            : item.status === "CANCELLED" || item.status === "DISRUPTED"
                              ? "bg-err/10 text-err"
                              : "bg-white/10 text-text-secondary",
                        )}
                      >
                        {item.status.toLowerCase()}
                      </span>
                    </button>
                    {open && (
                      <div className="border-t border-white/10 bg-black/20 px-5 py-4 text-sm text-text-secondary">
                        {item.payload?.description && <p>{item.payload.description}</p>}
                        {item.payload?.whatToDo && item.payload.whatToDo.length > 0 && (
                          <div className="mt-3">
                            <div className="wp-eyebrow mb-2">What you can do</div>
                            <ul className="space-y-1.5">
                              {item.payload.whatToDo.map((t, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-ember">·</span>
                                  {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {item.payload?.notes && (
                          <p className="mt-3 text-xs text-text-tertiary">Note · {item.payload.notes}</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <div className="wp-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
            <div>
              <div className="wp-eyebrow">Grand total</div>
              <div className="mt-1 text-2xl font-semibold text-ember">{formatCurrency(grandTotal)}</div>
            </div>
            <div className="text-right text-xs text-text-tertiary">
              Sum of priced events
              <br />
              Budget remaining {formatCurrency(Number(budget.remaining))}
            </div>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="wp-glass space-y-3 rounded-2xl p-6">
          <div className="wp-eyebrow">Live Agent Activity</div>
          <ul className="space-y-2 font-mono text-sm text-text-secondary">
            {actions.length === 0 ? (
              <li>No actions logged yet.</li>
            ) : (
              actions.map((a) => (
                <li key={a.id}>
                  {new Date(a.createdAt).toLocaleTimeString()} — <span className="text-ember">{a.agent}</span> · {a.action}
                  {a.tool ? ` (${a.tool})` : ""}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {tab === "money" && (
        <div className="grid gap-4 md:grid-cols-3">
          <MoneyCard label="Budget" value={formatCurrency(Number(budget.totalBudget), budget.currency)} />
          <MoneyCard label="Event total" value={formatCurrency(grandTotal, budget.currency)} />
          <MoneyCard label="Remaining" value={formatCurrency(Number(budget.remaining), budget.currency)} highlight />
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-4">
          {trip.alerts.length === 0 ? (
            <div className="wp-glass rounded-2xl p-10 text-center text-text-secondary">All clear.</div>
          ) : (
            trip.alerts.map((a) => (
              <div key={a.id} className="wp-glass rounded-2xl p-5">
                <div className="font-medium">{a.title}</div>
                <div className="mt-1 text-sm text-text-secondary">{a.body}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MoneyCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("wp-glass rounded-2xl p-5", highlight && "border-ember/40")}>
      <div className="wp-eyebrow">{label}</div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}
