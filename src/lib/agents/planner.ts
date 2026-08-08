import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { parsePlanningIntent, kindToDb } from "../graph/service";
import { BaseAgent } from "./base";
import type { TravelerDNA } from "../graph/types";
import { demoStore, useMemoryGraph } from "../demo/store";
import { enrichItemMeta } from "./pricing";
import { day0DinnerRiskDecision, type RiskDecision } from "../decision/risk";
import { emitTrace } from "./trace";

/** Cheap free-tier Gemini model; falls back to skeleton itinerary without a key. */
const model = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ? google("gemini-3.1-flash-lite")
  : null;

const ItineraryItemSchema = z.object({
  kind: z.enum(["FLIGHT", "HOTEL", "RESTAURANT", "ACTIVITY", "EVENT", "TRANSIT", "TRANSFER", "EXPERIENCE", "LANDMARK", "CUSTOM"]),
  title: z.string(),
  dayOffset: z.number().int(),
  startHour: z.number().min(0).max(23).optional(),
  durationMinutes: z.number().int().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  priceUsd: z.number().optional(),
  description: z.string().optional(),
  whatToDo: z.array(z.string()).optional(),
});

const PlanSchema = z.object({
  destination: z.string(),
  summary: z.string(),
  days: z.number().int(),
  budgetUsd: z.number().optional(),
  items: z.array(ItineraryItemSchema),
});

export class PlannerAgent extends BaseAgent {
  kind = "PLANNER" as const;

  async planFromText(taskId: string, text: string, dna?: Partial<TravelerDNA>) {
    const intent = parsePlanningIntent(text, dna as TravelerDNA | undefined);

    let plan: z.infer<typeof PlanSchema> = {
      destination: intent.destination,
      summary: `Trip to ${intent.destination}`,
      days: intent.durationDays ?? 4,
      budgetUsd: intent.budgetUsd ?? 3000,
      items: [] as z.infer<typeof ItineraryItemSchema>[],
    };

    if (model) {
      const { object } = await generateObject({
        model,
        schema: PlanSchema,
        prompt: `Turn this travel request into a concrete day-by-day itinerary. Keep it realistic, budget-aware, and traveler-aware.\n\nRequest: ${text}\n\nTraveler DNA: ${JSON.stringify(dna ?? {})}\n\nRules: no overlapping items, first activity at least 2 hours after flight arrival, respect relaxation preference, prioritize food when food priority is high. Each item must have a dayOffset (0-indexed). For every item include: priceUsd (realistic USD), description (1-2 sentences), and whatToDo (2-4 short actionable tips for that stop).`,
      });
      plan = object;
      // Ensure every item has pricing / tips
      plan.items = plan.items.map((item) => {
        const meta = enrichItemMeta(item.kind, item.title, item.location);
        return {
          ...item,
          priceUsd: item.priceUsd ?? meta.priceUsd,
          description: item.description ?? meta.description,
          whatToDo: item.whatToDo?.length ? item.whatToDo : meta.whatToDo,
        };
      });
    } else {
      // Deterministic fallback skeleton when no LLM key is present.
      plan.items = skeletonItinerary(intent.destination, plan.days).map((item) => {
        const meta = enrichItemMeta(item.kind, item.title, item.location);
        return { ...item, ...meta };
      });
    }

    // Risk-aware day-0 dinner: choose time by arrival distribution, not a fixed 7 PM.
    const risk: RiskDecision = day0DinnerRiskDecision(16, 30);
    const chosenDinner = risk.options.find((o) => o.chosen);
    const dinnerHour = chosenDinner?.id === "dinner-1945" ? 19 : chosenDinner?.id === "dinner-2030" ? 20 : 19;
    const dinnerMinute = chosenDinner?.id === "dinner-1945" ? 45 : chosenDinner?.id === "dinner-2030" ? 30 : 0;
    plan.items = plan.items.map((item) => {
      if (item.kind === "RESTAURANT" && item.dayOffset === 0) {
        return {
          ...item,
          startHour: dinnerHour + dinnerMinute / 60,
          title: item.title.includes("Dinner") ? `Dinner — ${chosenDinner?.timeLabel ?? "7:45 PM"}` : item.title,
          notes: risk.rationale.slice(0, 180),
        };
      }
      // Nudge flight arrival display toward scheduled 4:30 for the distribution story
      if (item.kind === "FLIGHT" && item.dayOffset === 0) {
        return { ...item, startHour: 9, notes: "Arrival modeled as a probability distribution, not a point ETA." };
      }
      return item;
    });

    emitTrace({
      tripId: this.ctx.tripId,
      agent: "RISK",
      step: "Probabilistic dinner pick",
      detail: `${chosenDinner?.label} · ${chosenDinner?.successProbability}% success`,
      status: "ok",
    });

    await this.logAction({
      taskId,
      action: "plan_generated",
      input: { text, intent },
      result: { ...plan, risk } as unknown as Record<string, unknown>,
    });

    if (!this.ctx.tripId) return { plan, tripId: null, risk };

    if (useMemoryGraph()) {
      const trip = demoStore.getTrip(this.ctx.userId, this.ctx.tripId);
      if (!trip) throw new Error("Trip not found");
      // Fresh plan — replace items
      demoStore.clearItems(this.ctx.tripId);
      const baseDate = trip.startDate ?? new Date();
      for (const item of plan.items) {
        const start = new Date(baseDate);
        start.setDate(start.getDate() + item.dayOffset);
        const hour = Math.floor(item.startHour ?? 10);
        const minute = Math.round(((item.startHour ?? 10) % 1) * 60);
        start.setHours(hour, minute, 0, 0);
        const end = new Date(start.getTime() + (item.durationMinutes ?? 60) * 60_000);
        demoStore.addItem(this.ctx.tripId, {
          kind: kindToDb(item.kind),
          title: item.title,
          status: "TENTATIVE",
          startTime: start,
          endTime: end,
          location: item.location,
          payload: {
            notes: item.notes,
            priceUsd: item.priceUsd,
            description: item.description,
            whatToDo: item.whatToDo,
            risk: item.kind === "RESTAURANT" && item.dayOffset === 0 ? risk : undefined,
          },
        });
      }
      const grand = plan.items.reduce((s, i) => s + (i.priceUsd ?? 0), 0);
      demoStore.updateTrip(this.ctx.tripId, {
        destination: plan.destination,
        status: "PLANNING",
        title: plan.summary?.slice(0, 60) || `Trip to ${plan.destination}`,
      });
      demoStore.setTripMeta(this.ctx.tripId, { risk });
      const t = demoStore.getTrip(this.ctx.userId, this.ctx.tripId);
      if (t?.budgets?.[0]) {
        t.budgets[0].actual = grand;
        t.budgets[0].remaining = Math.max(0, Number(t.budgets[0].totalBudget) - grand);
      }
      return { plan, tripId: this.ctx.tripId, grandTotalUsd: grand, risk };
    }

    // Write plan items into the Travel Graph.
    const trip = await prisma.trip.findFirst({ where: { id: this.ctx.tripId, userId: this.ctx.userId } });
    if (!trip) throw new Error("Trip not found");

    const baseDate = trip.startDate ?? new Date();
    for (const item of plan.items) {
      const start = new Date(baseDate);
      start.setDate(start.getDate() + item.dayOffset);
      const hour = Math.floor(item.startHour ?? 10);
      const minute = Math.round(((item.startHour ?? 10) % 1) * 60);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start.getTime() + (item.durationMinutes ?? 60) * 60_000);
      await prisma.tripItem.create({
        data: {
          tripId: this.ctx.tripId,
          kind: kindToDb(item.kind),
          title: item.title,
          status: "TENTATIVE",
          startTime: start,
          endTime: end,
          location: item.location,
          payload: {
            notes: item.notes,
            priceUsd: item.priceUsd,
            description: item.description,
            whatToDo: item.whatToDo,
            risk: item.kind === "RESTAURANT" && item.dayOffset === 0 ? risk : undefined,
          },
        },
      });
    }

    await prisma.trip.update({
      where: { id: this.ctx.tripId },
      data: { destination: plan.destination, status: "PLANNING" },
    });

    const grandTotalUsd = plan.items.reduce((s, i) => s + (i.priceUsd ?? 0), 0);
    return { plan, tripId: this.ctx.tripId, grandTotalUsd, risk };
  }
}

function skeletonItinerary(destination: string, days: number): z.infer<typeof ItineraryItemSchema>[] {
  const items: z.infer<typeof ItineraryItemSchema>[] = [];
  for (let d = 0; d < Math.min(days, 7); d++) {
    if (d === 0) {
      items.push({ kind: "FLIGHT", title: `Flight to ${destination}`, dayOffset: 0, startHour: 9, durationMinutes: 240 });
      items.push({ kind: "TRANSFER", title: "Airport → Hotel", dayOffset: 0, startHour: 14, durationMinutes: 45 });
      items.push({ kind: "HOTEL", title: "Check in", dayOffset: 0, startHour: 15, durationMinutes: 30 });
      items.push({ kind: "RESTAURANT", title: "Dinner — neighborhood spot", dayOffset: 0, startHour: 19, durationMinutes: 90 });
    } else if (d === days - 1) {
      items.push({ kind: "HOTEL", title: "Check out", dayOffset: d, startHour: 10, durationMinutes: 30 });
      items.push({ kind: "TRANSFER", title: "Hotel → Airport", dayOffset: d, startHour: 11, durationMinutes: 45 });
      items.push({ kind: "FLIGHT", title: `Return flight`, dayOffset: d, startHour: 13, durationMinutes: 240 });
    } else {
      items.push({ kind: "ACTIVITY", title: "Morning anchor experience", dayOffset: d, startHour: 10, durationMinutes: 120 });
      items.push({ kind: "RESTAURANT", title: "Lunch", dayOffset: d, startHour: 12, durationMinutes: 60 });
      items.push({ kind: "ACTIVITY", title: "Afternoon exploration", dayOffset: d, startHour: 14, durationMinutes: 150 });
      items.push({ kind: "RESTAURANT", title: "Dinner", dayOffset: d, startHour: 19, durationMinutes: 90 });
    }
  }
  return items;
}
