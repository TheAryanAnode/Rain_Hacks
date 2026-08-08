import { BaseAgent } from "./base";
import { getBookingProvider, type NormalizedOffer, type BookingResult } from "../tools/providers/booking";
import { demoStore, useMemoryGraph } from "../demo/store";
import { TravelGraph } from "../graph/service";

/**
 * Execution agent — proposes bookings through PolicyEngine, then mock-books.
 */
export class ExecutionAgent extends BaseAgent {
  kind = "EXECUTOR" as const;

  async proposeBook(offer: NormalizedOffer) {
    const decision = this.check({
      agent: "BOOKING",
      tool: "booking_provider",
      action: "book",
      amountUsd: offer.priceUsd,
      isBooking: true,
      isFinancial: true,
      metadata: { category: offer.kind === "flight" ? "flight" : offer.kind === "hotel" ? "hotel" : "other" },
    });
    await this.logAction({
      action: "propose_book",
      tool: "policy",
      input: { offerId: offer.id, priceUsd: offer.priceUsd },
      decision: decision as any,
      status: decision.requiresApproval ? "PENDING_APPROVAL" : "APPROVED",
    });
    return decision;
  }

  async confirmBook(offer: NormalizedOffer, approved = false): Promise<{
    policy: ReturnType<ExecutionAgent["check"]>;
    booking?: BookingResult;
    blocked?: boolean;
  }> {
    const policy = await this.proposeBook(offer);
    if (policy.requiresApproval && !approved) {
      return { policy, blocked: true };
    }
    if (!policy.allowed && !approved) {
      return { policy, blocked: true };
    }

    const provider = getBookingProvider();
    const booking = await provider.book(offer);

    if (this.ctx.tripId && useMemoryGraph()) {
      demoStore.addItem(this.ctx.tripId, {
        kind: offer.kind === "hotel" ? "HOTEL" : offer.kind === "flight" ? "FLIGHT" : offer.kind === "restaurant" ? "RESTAURANT" : "EXPERIENCE",
        title: offer.title,
        status: "CONFIRMED",
        location: offer.location,
        payload: {
          priceUsd: offer.priceUsd,
          confirmationCode: booking.confirmationCode,
          provider: offer.provider,
          simulated: true,
          effective: offer.effective,
          description: `Booked via WAYPORT · ${booking.confirmationCode}`,
          whatToDo: ["Save confirmation to Wallet", "Add to calendar", "Check cancellation window"],
        },
      });
      demoStore.logAction({
        userId: this.ctx.userId,
        tripId: this.ctx.tripId,
        agent: "BOOKING",
        tool: "mock_booking",
        action: "book_confirmed",
        input: { offerId: offer.id },
        result: { confirmationCode: booking.confirmationCode },
        status: "EXECUTED",
      });
      demoStore.addAlert(this.ctx.tripId, {
        title: `Booked · ${offer.title}`,
        body: `Confirmation ${booking.confirmationCode} (simulated transaction). Graph updated.`,
        severity: "INFO",
      });
    } else if (this.ctx.tripId) {
      await new TravelGraph(this.ctx.userId).addItem(this.ctx.tripId, {
        kind: (offer.kind === "hotel" ? "HOTEL" : "CUSTOM") as any,
        title: offer.title,
        status: "CONFIRMED",
        confirmationCode: booking.confirmationCode,
        payload: { priceUsd: offer.priceUsd, simulated: true },
      });
    }

    await this.logAction({
      action: "book_executed",
      tool: "booking_provider",
      input: { offerId: offer.id },
      result: booking as any,
      status: "EXECUTED",
      userAuthorization: approved,
    });

    return { policy, booking };
  }

  async searchAndRank(kind: "hotel" | "flight" | "experience" | "restaurant", params: Record<string, unknown>) {
    const provider = getBookingProvider();
    const offers = await provider.search(kind, params);
    await this.logAction({
      action: `search_${kind}`,
      tool: "booking_provider",
      input: params as any,
      result: { count: offers.length } as any,
    });
    return offers.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.priceUsd - b.priceUsd);
  }
}
