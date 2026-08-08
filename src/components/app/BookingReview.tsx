"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { NormalizedOffer } from "@/lib/tools/providers/booking";

export default function BookingReview({
  tripId,
  offer: initial,
  onBooked,
}: {
  tripId: string;
  offer: NormalizedOffer;
  onBooked?: (confirmationCode: string) => void;
}) {
  const [offer] = useState(initial);
  const [phase, setPhase] = useState<"review" | "booking" | "done" | "need_approval">("review");
  const [steps, setSteps] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [policyReason, setPolicyReason] = useState<string | null>(null);

  async function book(approved = false) {
    setPhase("booking");
    setSteps(["Reviewing policy…"]);
    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "book", tripId, offer, approved }),
    });
    const data = await res.json();
    if (data.blocked) {
      setPolicyReason(data.policy?.reason ?? "Needs your approval");
      setPhase("need_approval");
      return;
    }
    if (data.booking) {
      const staged = data.booking.steps as string[];
      for (let i = 0; i < staged.length; i++) {
        await new Promise((r) => setTimeout(r, 280));
        setSteps(staged.slice(0, i + 1).map((s) => `✓ ${s}`));
      }
      setConfirmation(data.booking.confirmationCode);
      setPhase("done");
      onBooked?.(data.booking.confirmationCode);
    }
  }

  return (
    <div className="wp-glass rounded-2xl p-6 space-y-4">
      <div className="wp-eyebrow">Review booking</div>
      <h3 className="font-display text-2xl">{offer.title}</h3>
      <p className="text-sm text-text-secondary">{offer.subtitle}</p>
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <div className="text-text-tertiary text-xs">Cash</div>
          <div className="font-semibold">{formatCurrency(offer.priceUsd)}</div>
        </div>
        <div>
          <div className="text-text-tertiary text-xs">Effective</div>
          <div className="font-semibold text-ember">
            {offer.effective ? formatCurrency(offer.effective.effectiveUsd) : "—"}
          </div>
        </div>
        <div>
          <div className="text-text-tertiary text-xs">Policy</div>
          <div>{offer.refundable ? "Free cancellation" : "Non-refundable"}</div>
        </div>
      </div>
      <ul className="text-xs text-text-secondary space-y-1">
        <li>✓ Within budget check</li>
        <li>✓ Preference match via DNA / quality vector</li>
        <li>✓ Transaction simulated — intelligence is live</li>
      </ul>

      {phase === "review" && (
        <button onClick={() => book(false)} className="wp-cta px-5 py-2.5 text-sm">
          Confirm booking
        </button>
      )}
      {phase === "need_approval" && (
        <div className="space-y-3">
          <p className="text-sm text-warn">Policy: {policyReason}. Approve to continue.</p>
          <button onClick={() => book(true)} className="wp-cta px-5 py-2.5 text-sm">
            Approve & book
          </button>
        </div>
      )}
      {phase === "booking" && (
        <div className="font-mono text-xs text-text-secondary space-y-1">
          <div className="text-ember">BOOKING {offer.kind.toUpperCase()}</div>
          {steps.map((s) => (
            <div key={s}>{s}</div>
          ))}
        </div>
      )}
      {phase === "done" && confirmation && (
        <div className="rounded-xl border border-ok/30 bg-ok/10 p-4">
          <div className="font-semibold text-ok">BOOKED</div>
          <div className="mt-1 font-mono text-sm">Confirmation {confirmation}</div>
          <p className="mt-2 text-xs text-text-secondary">Travel Graph updated with CONFIRMED node.</p>
        </div>
      )}
    </div>
  );
}
