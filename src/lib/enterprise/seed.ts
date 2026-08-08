/**
 * Seeds the demo group trip — an engineering offsite in Lisbon with 12 people
 * converging from 6 cities.
 *
 * Deliberately stocked with the situations an organizer actually has to
 * resolve: policy breaches, a cabin upgrade, a late booker, a deviation
 * request, non-responders, and a room block about to release.
 */

import type { DemoTrip, DemoItem, TripCoordination } from "@/lib/demo/store";
import {
  buildApprovals,
  STANDARD_TIER,
  type Attendee,
  type CabinClass,
  type FlightLeg,
  type RoomBlock,
} from "./program";

/** Midnight-UTC anchored so server and client render identical dates. */
function baseDay(offsetDays: number, hour = 0, minute = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function leg(
  flightNo: string,
  carrier: string,
  origin: string,
  destination: string,
  departDay: number,
  departHour: number,
  durationHours: number,
  priceUsd: number,
  cabin: CabinClass = "ECONOMY",
  bookedDaysAhead = 26,
  originTerminal?: string,
  destinationTerminal?: string,
): FlightLeg {
  const depart = baseDay(departDay, departHour, 0);
  return {
    flightNo,
    carrier,
    origin,
    destination,
    depart,
    arrive: new Date(depart.getTime() + durationHours * 3_600_000),
    cabin,
    priceUsd,
    bookedDaysAhead,
    originTerminal,
    destinationTerminal,
  };
}

const START = 24;
const END = 28;
const NIGHTS = 4;

export function buildLisbonTrip(userId: string): DemoTrip {
  const blockMain: RoomBlock = {
    id: "block-tivoli",
    hotelName: "Tivoli Avenida Liberdade",
    address: "Av. da Liberdade 185, 1269-050 Lisbon, Portugal",
    nightlyRateUsd: 240,
    isContractedRate: true,
    roomsHeld: 10,
    cutoffDate: baseDay(6, 12),
    walkMinutesToVenue: 7,
  };

  const blockOverflow: RoomBlock = {
    id: "block-locke",
    hotelName: "Locke de Santa Joana",
    address: "R. de Santa Marta 48, 1150-297 Lisbon, Portugal",
    nightlyRateUsd: 205,
    isContractedRate: false,
    roomsHeld: 4,
    cutoffDate: baseDay(11, 12),
    walkMinutesToVenue: 14,
  };

  const A = (
    name: string,
    email: string,
    department: string,
    title: string,
    originAirport: string,
    rest: Partial<Attendee>,
  ): Attendee => ({
    id: `att-${email.split("@")[0]}`,
    name,
    email,
    department,
    title,
    originAirport,
    rsvp: "ACCEPTED",
    travelStatus: "BOOKED",
    roomBlockId: blockMain.id,
    nightlyRateUsd: blockMain.nightlyRateUsd,
    nights: NIGHTS,
    ...rest,
  });

  const travelers: Attendee[] = [
    A("Dana Whitfield", "dana@northwind.co", "Engineering", "VP Engineering", "SFO", {
      inbound: leg("UA 970", "United", "SFO", "LIS", START - 1, 16, 11.5, 1180, "BUSINESS", 31, "3", "1"),
      outbound: leg("UA 971", "United", "LIS", "SFO", END, 11, 12, 1240, "BUSINESS", 31, "1", "3"),
      nightlyRateUsd: 390,
    }),
    A("Marcus Chen", "marcus@northwind.co", "Engineering", "Staff Engineer", "SFO", {
      inbound: leg("UA 970", "United", "SFO", "LIS", START - 1, 16, 11.5, 640, "ECONOMY", 30, "3", "1"),
      outbound: leg("UA 971", "United", "LIS", "SFO", END, 11, 12, 610, "ECONOMY", 30, "1", "3"),
    }),
    A("Priya Raghunathan", "priya@northwind.co", "Engineering", "Engineering Manager", "JFK", {
      inbound: leg("TP 208", "TAP Air Portugal", "JFK", "LIS", START - 1, 21, 6.8, 495, "ECONOMY", 28, "5", "1"),
      outbound: leg("TP 209", "TAP Air Portugal", "LIS", "JFK", END, 10, 8, 470, "ECONOMY", 28, "1", "5"),
    }),
    A("Tomás Oliveira", "tomas@northwind.co", "Design", "Principal Designer", "JFK", {
      inbound: leg("TP 208", "TAP Air Portugal", "JFK", "LIS", START - 1, 21, 6.8, 510, "ECONOMY", 27, "5", "1"),
      outbound: leg("TP 209", "TAP Air Portugal", "LIS", "JFK", END, 10, 8, 505, "ECONOMY", 27, "1", "5"),
      dietary: ["vegetarian"],
    }),
    A("Sarah Lindqvist", "sarah@northwind.co", "Product", "Group PM", "LHR", {
      inbound: leg("BA 502", "British Airways", "LHR", "LIS", START, 8, 2.7, 210, "ECONOMY", 25, "5", "1"),
      outbound: leg("BA 503", "British Airways", "LIS", "LHR", END, 18, 2.7, 195, "ECONOMY", 25, "1", "5"),
    }),
    A("Owen Baptiste", "owen@northwind.co", "Product", "PM", "LHR", {
      inbound: leg("BA 502", "British Airways", "LHR", "LIS", START, 8, 2.7, 210, "ECONOMY", 25, "5", "1"),
      outbound: leg("BA 503", "British Airways", "LIS", "LHR", END, 18, 2.7, 195, "ECONOMY", 25, "1", "5"),
      accessibility: ["step-free room"],
    }),
    // Booked late; the fare spiked past the IC cap.
    A("Nadia Haddad", "nadia@northwind.co", "Engineering", "Senior Engineer", "ORD", {
      inbound: leg("LH 431", "Lufthansa", "ORD", "LIS", START, 9, 12.5, 880, "ECONOMY", 9, "1", "1"),
      outbound: leg("LH 432", "Lufthansa", "LIS", "ORD", END, 12, 13, 810, "ECONOMY", 9, "1", "1"),
      travelStatus: "PENDING_APPROVAL",
    }),
    // Extending into the weekend at personal cost.
    A("Ben Arkwright", "ben@northwind.co", "Engineering", "Engineer", "SEA", {
      inbound: leg("DL 262", "Delta", "SEA", "LIS", START - 1, 14, 13, 720, "ECONOMY", 22, "A", "1"),
      outbound: leg("DL 263", "Delta", "LIS", "SEA", END + 2, 13, 14, 690, "ECONOMY", 22, "1", "A"),
      travelStatus: "PENDING_APPROVAL",
      deviationNote: "Extending 2 nights personally — return leg moved to Sunday",
    }),
    // Overflow hotel, over the nightly cap because the main block filled.
    A("Grace Mbeki", "grace@northwind.co", "Data", "Analytics Lead", "AMS", {
      inbound: leg("KL 1693", "KLM", "AMS", "LIS", START, 10, 3.2, 265, "ECONOMY", 24, "2", "1"),
      outbound: leg("KL 1694", "KLM", "LIS", "AMS", END, 16, 3.2, 250, "ECONOMY", 24, "1", "2"),
      roomBlockId: blockOverflow.id,
      nightlyRateUsd: 295,
      travelStatus: "PENDING_APPROVAL",
    }),
    A("Felix Toure", "felix@northwind.co", "Data", "Data Engineer", "AMS", {
      inbound: leg("KL 1693", "KLM", "AMS", "LIS", START, 10, 3.2, 265, "ECONOMY", 24, "2", "1"),
      outbound: leg("KL 1694", "KLM", "LIS", "AMS", END, 16, 3.2, 250, "ECONOMY", 24, "1", "2"),
      roomBlockId: blockOverflow.id,
      nightlyRateUsd: blockOverflow.nightlyRateUsd,
      travelStatus: "OPTIONS_READY",
    }),
    // Not responded — blocking the room block.
    A("Isabel Moreau", "isabel@northwind.co", "Design", "Designer", "CDG", {
      rsvp: "INVITED",
      travelStatus: "NOT_STARTED",
      roomBlockId: undefined,
      nightlyRateUsd: undefined,
      nights: undefined,
    }),
    A("Ravi Anand", "ravi@northwind.co", "Engineering", "Engineer", "BLR", {
      rsvp: "TENTATIVE",
      travelStatus: "OPTIONS_READY",
      inbound: leg("EK 569", "Emirates", "BLR", "LIS", START - 1, 4, 16, 940, "ECONOMY", 20, "1", "1"),
      outbound: leg("EK 570", "Emirates", "LIS", "BLR", END, 9, 17, 910, "ECONOMY", 20, "1", "1"),
    }),
  ];

  const coordination: TripCoordination = {
    purpose: "OFFSITE",
    costCenter: "ENG-1042",
    policyTier: STANDARD_TIER,
    travelers,
    roomBlocks: [blockMain, blockOverflow],
    approvals: buildApprovals(travelers, STANDARD_TIER),
    agenda: [
      {
        id: "ag-1",
        title: "Welcome dinner — Time Out Market",
        start: baseDay(START, 19, 30),
        end: baseDay(START, 22, 0),
        location: "Time Out Market, Cais do Sodré, Lisbon",
        attendeeIds: [],
        mandatory: false,
      },
      {
        id: "ag-2",
        title: "Day 1 — Roadmap working session",
        start: baseDay(START + 1, 9, 0),
        end: baseDay(START + 1, 17, 0),
        location: "LX Factory, Room 4, Alcântara",
        attendeeIds: [],
        mandatory: true,
      },
      {
        id: "ag-3",
        title: "Architecture deep dive",
        start: baseDay(START + 2, 9, 30),
        end: baseDay(START + 2, 13, 0),
        location: "LX Factory, Room 4, Alcântara",
        attendeeIds: travelers.filter((a) => a.department === "Engineering").map((a) => a.id),
        mandatory: true,
      },
      {
        id: "ag-4",
        title: "Team activity — Sintra day trip",
        start: baseDay(START + 3, 10, 0),
        end: baseDay(START + 3, 18, 0),
        location: "Sintra, Portugal",
        attendeeIds: [],
        mandatory: false,
      },
    ],
  };

  // Shared agenda entries double as itinerary items so the timeline is populated.
  const items: DemoItem[] = coordination.agenda.map((e) => ({
    id: `item-${e.id}`,
    tripId: "trip-lisbon-offsite",
    kind: e.mandatory ? "EVENT" : "ACTIVITY",
    title: e.title,
    status: "CONFIRMED",
    startTime: e.start,
    endTime: e.end,
    location: e.location,
    payload: { attendeeCount: e.attendeeIds.length || travelers.length },
    createdAt: new Date(),
  }));

  const budget = 32_000;
  return {
    id: "trip-lisbon-offsite",
    userId,
    title: "Engineering Offsite — Lisbon",
    destination: "Lisbon, Portugal",
    origin: "Multiple origins",
    originAirport: null,
    arrivalAirport: "LIS",
    status: "PLANNING",
    mode: "PLANNING",
    startDate: baseDay(START),
    endDate: baseDay(END),
    createdAt: new Date(),
    budgets: [{ totalBudget: budget, actual: 0, remaining: budget, currency: "USD" }],
    items,
    alerts: [],
    edges: [],
    bookings: [],
    coordination,
  };
}
