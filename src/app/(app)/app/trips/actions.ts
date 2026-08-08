"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/server/auth";
import { demoStore, type TripCoordination } from "@/lib/demo/store";
import {
  buildApprovals,
  STANDARD_TIER,
  type ProgramPurpose,
  type RsvpStatus,
} from "@/lib/enterprise/program";
import { toAirportCode } from "@/lib/trip/intake";
import {
  attendeeFromInput,
  findDirectoryTraveler,
  toAttendee,
  type NewTravelerInput,
} from "@/lib/enterprise/directory";

export interface CreateTripInput {
  title: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate?: string;
  budgetUsd?: number;
  purpose?: string;
  costCenter?: string;
  /** Directory ids ticked in the picker. */
  travelerIds?: string[];
  /** Travelers typed in by hand, not in the directory. */
  newTravelers?: NewTravelerInput[];
}

/**
 * Creates a trip from completed intake.
 *
 * Re-validates the required fields server-side — the client disables submit,
 * but this action is the actual trust boundary.
 */
export async function createTripFromIntake(input: CreateTripInput) {
  const userId = await requireUserId();

  if (!input.origin?.trim() || !input.destination?.trim() || !input.startDate) {
    return { error: "origin, destination and startDate are required" as const };
  }

  const startDate = new Date(`${input.startDate}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime())) {
    return { error: "invalid start date" as const };
  }
  const endDate = input.endDate ? new Date(`${input.endDate}T00:00:00Z`) : undefined;

  // Directory picks and hand-entered travelers become one party.
  const travelers = [
    ...(input.travelerIds ?? [])
      .map(findDirectoryTraveler)
      .filter((d) => d !== undefined)
      .map(toAttendee),
    ...(input.newTravelers ?? []).map(attendeeFromInput),
  ];

  // A party of more than one gets the coordination surface; solo trips don't.
  const coordination: TripCoordination | undefined =
    travelers.length > 1
      ? {
          purpose: (input.purpose as ProgramPurpose) ?? "OFFSITE",
          costCenter: input.costCenter,
          policyTier: STANDARD_TIER,
          travelers,
          roomBlocks: [],
          approvals: buildApprovals(travelers, STANDARD_TIER),
          agenda: [],
        }
      : undefined;

  const trip = demoStore.createTrip(userId, {
    title: input.title,
    destination: input.destination.trim(),
    origin: input.origin.trim(),
    originAirport: toAirportCode(input.origin),
    arrivalAirport: toAirportCode(input.destination) ?? undefined,
    startDate,
    endDate,
    budgetUsd: input.budgetUsd,
    coordination,
  });

  revalidatePath("/app/trips");
  return { tripId: trip.id };
}

export async function decideApproval(
  tripId: string,
  approvalId: string,
  approve: boolean,
) {
  const trip = demoStore.getTripById(tripId);
  const coord = trip?.coordination;
  if (!coord) return;

  const approval = coord.approvals.find((a) => a.id === approvalId);
  if (!approval) return;

  approval.status = approve ? "APPROVED" : "DECLINED";
  approval.decidedAt = new Date();

  // Clearing a traveler's last pending item unblocks their booking.
  const stillPending = coord.approvals.some(
    (a) => a.attendeeId === approval.attendeeId && a.status === "PENDING",
  );
  const traveler = coord.travelers.find((t) => t.id === approval.attendeeId);
  if (traveler && !stillPending) {
    traveler.travelStatus = approve ? "BOOKED" : "OPTIONS_READY";
  }

  revalidatePath(`/app/trips/${tripId}`);
}

/**
 * Adds people to a trip that already exists. A solo trip gains a coordination
 * surface the moment a second traveler joins.
 */
export async function addTravelersToTrip(
  tripId: string,
  travelerIds: string[],
  newTravelers: NewTravelerInput[] = [],
) {
  const trip = demoStore.getTripById(tripId);
  if (!trip) return { error: "trip not found" as const };

  const incoming = [
    ...travelerIds
      .map(findDirectoryTraveler)
      .filter((d) => d !== undefined)
      .map(toAttendee),
    ...newTravelers.map(attendeeFromInput),
  ];
  if (!incoming.length) return { added: 0 };

  if (!trip.coordination) {
    trip.coordination = {
      purpose: "OFFSITE",
      policyTier: STANDARD_TIER,
      travelers: [],
      roomBlocks: [],
      approvals: [],
      agenda: [],
    };
  }

  // Email is the identity here — re-adding someone must not duplicate them.
  const seen = new Set(trip.coordination.travelers.map((t) => t.email.toLowerCase()));
  const added = incoming.filter((t) => !seen.has(t.email.toLowerCase()));
  trip.coordination.travelers.push(...added);
  trip.coordination.approvals = buildApprovals(
    trip.coordination.travelers,
    trip.coordination.policyTier,
    trip.coordination.approvals,
  );

  revalidatePath(`/app/trips/${tripId}`);
  return { added: added.length };
}

export async function removeTravelerFromTrip(tripId: string, attendeeId: string) {
  const coord = demoStore.getTripById(tripId)?.coordination;
  if (!coord) return;
  coord.travelers = coord.travelers.filter((t) => t.id !== attendeeId);
  coord.approvals = coord.approvals.filter((a) => a.attendeeId !== attendeeId);
  revalidatePath(`/app/trips/${tripId}`);
}

export async function setRsvp(tripId: string, attendeeId: string, rsvp: RsvpStatus) {
  const trip = demoStore.getTripById(tripId);
  const coord = trip?.coordination;
  if (!coord) return;

  const traveler = coord.travelers.find((t) => t.id === attendeeId);
  if (!traveler) return;

  traveler.rsvp = rsvp;
  if (rsvp === "DECLINED") {
    traveler.roomBlockId = undefined;
    traveler.travelStatus = "NOT_STARTED";
  }
  // Re-derive so the queue matches the new roster state.
  coord.approvals = buildApprovals(coord.travelers, coord.policyTier, coord.approvals);

  revalidatePath(`/app/trips/${tripId}`);
}
