/**
 * In-memory Travel Graph for demo / no-DATABASE_URL mode.
 * Persists for the Node process lifetime so planner → trip detail works without Prisma.
 */

import { isDemoMode } from "@/lib/demo";
import { randomUUID } from "crypto";
import { enrichItemMeta } from "@/lib/agents/pricing";

export function useMemoryGraph(): boolean {
  return isDemoMode() || !process.env.DATABASE_URL;
}

export type DemoItem = {
  id: string;
  tripId: string;
  kind: string;
  title: string;
  status: string;
  startTime: Date | null;
  endTime: Date | null;
  location: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type DemoAlert = {
  id: string;
  tripId: string;
  title: string;
  body: string;
  severity: string;
  resolved: boolean;
  createdAt: Date;
};

export type DemoBudget = {
  totalBudget: number;
  actual: number;
  remaining: number;
  currency: string;
};

export type DemoTrip = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  status: string;
  mode: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  budgets: DemoBudget[];
  items: DemoItem[];
  alerts: DemoAlert[];
  edges: unknown[];
  bookings: unknown[];
};

export type DemoAction = {
  id: string;
  userId: string;
  tripId?: string;
  agent: string;
  tool?: string;
  action: string;
  input: unknown;
  result?: unknown;
  status: string;
  createdAt: Date;
};

export type DemoInboxDoc = {
  id: string;
  userId: string;
  name: string;
  mime: string;
  size: number;
  extracted: { kind: string; title: string; detail: string }[];
  tripId?: string;
  createdAt: Date;
};

export type DemoProfile = {
  dna: Record<string, unknown>;
  autonomy: {
    mode: string;
    autoBookHotelUnder: number;
    autoBookFlightUnder: number;
    autoBookRestaurants: boolean;
    autoBookChangesUnder: number;
    allowInternationalFlights: boolean;
    notifyOnlyImportantDisruptions: boolean;
  };
  name: string;
  email: string;
  homeAirport: string;
  preferences: string[];
};

type Store = {
  trips: Map<string, DemoTrip>;
  actions: DemoAction[];
  inbox: DemoInboxDoc[];
  profiles: Map<string, DemoProfile>;
  seeded: boolean;
};

const g = globalThis as unknown as { __wayportDemoStore?: Store };

function store(): Store {
  if (!g.__wayportDemoStore) {
    g.__wayportDemoStore = {
      trips: new Map(),
      actions: [],
      inbox: [],
      profiles: new Map(),
      seeded: false,
    };
  }
  return g.__wayportDemoStore;
}

export function defaultDna() {
  return {
    personality: { adventure: 7, luxury: 5, spontaneity: 6, planning: 4 },
    physical: { walkingTolerance: 6, heatTolerance: 5, jetLagSeverity: 5 },
    social: { nightlife: 5, crowds: 4, touristAttractions: 4 },
    food: { dietary: [] as string[], spice: 5, fineDining: 5, streetFood: 6 },
    money: { budgetSensitivity: 6, hotelPriority: 5, experiencePriority: 7 },
    style: { slowTravel: false, localExperiences: true, photography: false, architecture: false },
  };
}

export function getOrCreateProfile(userId: string): DemoProfile {
  const s = store();
  let p = s.profiles.get(userId);
  if (!p) {
    p = {
      name: "Aryan",
      email: "aryan@wayport.demo",
      homeAirport: "JFK",
      preferences: ["local food", "walkable stays", "golden hour photography"],
      dna: defaultDna(),
      autonomy: {
        mode: "execute_with_approval",
        autoBookHotelUnder: 250,
        autoBookFlightUnder: 400,
        autoBookRestaurants: true,
        autoBookChangesUnder: 100,
        allowInternationalFlights: false,
        notifyOnlyImportantDisruptions: true,
      },
    };
    s.profiles.set(userId, p);
  }
  return p;
}

export function updateProfile(userId: string, patch: Partial<DemoProfile>) {
  const p = getOrCreateProfile(userId);
  Object.assign(p, patch);
  return p;
}

export function ensureSampleTrip(userId: string) {
  const s = store();
  if (s.seeded) return;
  s.seeded = true;
  getOrCreateProfile(userId);

  const tripId = "demo-kyoto-sunset";
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);

  const items: DemoItem[] = [
    mkItem(tripId, "FLIGHT", "JFK → KIX", "CONFIRMED", start, 9, 840, "JFK Terminal 4, New York"),
    mkItem(tripId, "TRANSFER", "Airport → Gion", "TENTATIVE", start, 14, 60, "Kansai International Airport, Osaka"),
    mkItem(tripId, "HOTEL", "Ryokan near Yasaka", "CONFIRMED", start, 15, 30, "Gion, Kyoto"),
    mkItem(tripId, "RESTAURANT", "Kaiseki dinner in Pontocho", "TENTATIVE", start, 19, 120, "Pontocho Alley, Kyoto"),
  ];
  const day2 = new Date(start);
  day2.setDate(day2.getDate() + 1);
  items.push(
    mkItem(tripId, "ACTIVITY", "Fushimi Inari at dawn", "TENTATIVE", day2, 6, 150, "Fushimi Inari Taisha, Kyoto"),
    mkItem(tripId, "ACTIVITY", "Philosopher's Path walk", "TENTATIVE", day2, 14, 120, "Philosopher's Path, Kyoto"),
    mkItem(tripId, "RESTAURANT", "Nishiki market lunch", "TENTATIVE", day2, 12, 60, "Nishiki Market, Kyoto"),
  );

  const trip: DemoTrip = {
    id: tripId,
    userId,
    title: "Kyoto at golden hour",
    destination: "Kyoto, Japan",
    status: "PLANNING",
    mode: "PLANNING",
    startDate: start,
    endDate: end,
    createdAt: new Date(),
    budgets: [{ totalBudget: 3200, actual: 1180, remaining: 2020, currency: "USD" }],
    items,
    alerts: [
      {
        id: randomUUID(),
        tripId,
        title: "Typhoon watch — Kansai",
        body: "Guardian is monitoring a low-pressure system. No action needed yet.",
        severity: "INFO",
        resolved: false,
        createdAt: new Date(),
      },
    ],
    edges: [],
    bookings: [],
  };
  const seededTotal = items.reduce((s, it) => s + Number((it.payload as any)?.priceUsd ?? 0), 0);
  trip.budgets[0].actual = seededTotal;
  trip.budgets[0].remaining = Math.max(0, 3200 - seededTotal);
  s.trips.set(tripId, trip);

  s.actions.push({
    id: randomUUID(),
    userId,
    tripId,
    agent: "PLANNER",
    action: "seed_sample_trip",
    input: { destination: "Kyoto" },
    result: { items: items.length },
    status: "INFO",
    createdAt: new Date(),
  });

  s.inbox.push({
    id: randomUUID(),
    userId,
    name: "ANA_boarding_pass.pdf",
    mime: "application/pdf",
    size: 240_112,
    extracted: [{ kind: "FLIGHT", title: "NH 109 JFK–KIX", detail: "Confirmation NH8X2K" }],
    tripId,
    createdAt: new Date(Date.now() - 86_400_000),
  });
}

function mkItem(
  tripId: string,
  kind: string,
  title: string,
  status: string,
  day: Date,
  hour: number,
  durationMin: number,
  location: string,
): DemoItem {
  const startTime = new Date(day);
  startTime.setHours(hour, 0, 0, 0);
  const endTime = new Date(startTime.getTime() + durationMin * 60_000);
  const meta = enrichItemMeta(kind, title, location);
  return {
    id: randomUUID(),
    tripId,
    kind,
    title,
    status,
    startTime,
    endTime,
    location,
    payload: {
      priceUsd: meta.priceUsd,
      description: meta.description,
      whatToDo: meta.whatToDo,
      ...coordsFor(location),
    },
    createdAt: new Date(),
  };
}

function coordsFor(location: string): { lat?: number; lng?: number; geocodedName?: string } {
  const lower = location.toLowerCase();
  const anchors: { match: string; lng: number; lat: number; name: string }[] = [
    { match: "terminal 4", lng: -73.783, lat: 40.644, name: "JFK Terminal 4" },
    { match: "jfk", lng: -73.7781, lat: 40.6413, name: "JFK Airport" },
    { match: "kansai", lng: 135.244, lat: 34.434, name: "Kansai Airport" },
    { match: "pontocho", lng: 135.7715, lat: 35.0045, name: "Pontocho" },
    { match: "fushimi", lng: 135.7727, lat: 34.9671, name: "Fushimi Inari" },
    { match: "philosopher", lng: 135.7955, lat: 35.0265, name: "Philosopher's Path" },
    { match: "nishiki", lng: 135.7648, lat: 35.005, name: "Nishiki Market" },
    { match: "arashiyama", lng: 135.6721, lat: 35.0094, name: "Arashiyama" },
    { match: "kinkaku", lng: 135.7292, lat: 35.0394, name: "Kinkaku-ji" },
    { match: "kiyomizu", lng: 135.785, lat: 34.9949, name: "Kiyomizu-dera" },
    { match: "gion", lng: 135.7751, lat: 35.0037, name: "Gion" },
    { match: "higashiyama", lng: 135.782, lat: 35.002, name: "Higashiyama" },
    { match: "yasaka", lng: 135.7786, lat: 35.0036, name: "Yasaka Shrine" },
  ];
  for (const a of anchors) {
    if (lower.includes(a.match)) return { lat: a.lat, lng: a.lng, geocodedName: a.name };
  }
  return {};
}

export const demoStore = {
  createTrip(userId: string, input: { title: string; destination: string; startDate?: Date; endDate?: Date; budgetUsd?: number }) {
    ensureSampleTrip(userId);
    const id = randomUUID();
    const trip: DemoTrip = {
      id,
      userId,
      title: input.title,
      destination: input.destination,
      status: "PLANNING",
      mode: "PLANNING",
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      createdAt: new Date(),
      budgets: input.budgetUsd
        ? [{ totalBudget: input.budgetUsd, actual: 0, remaining: input.budgetUsd, currency: "USD" }]
        : [{ totalBudget: 2500, actual: 0, remaining: 2500, currency: "USD" }],
      items: [],
      alerts: [],
      edges: [],
      bookings: [],
    };
    store().trips.set(id, trip);
    return trip;
  },

  getTrip(userId: string, tripId: string) {
    ensureSampleTrip(userId);
    const t = store().trips.get(tripId);
    if (!t || t.userId !== userId) return null;
    return t;
  },

  listTrips(userId: string) {
    ensureSampleTrip(userId);
    return [...store().trips.values()]
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t) => ({
        ...t,
        _count: { items: t.items.length, alerts: t.alerts.filter((a) => !a.resolved).length },
      }));
  },

  addItem(
    tripId: string,
    input: {
      kind: string;
      title: string;
      status?: string;
      startTime?: Date;
      endTime?: Date;
      location?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    const t = store().trips.get(tripId);
    if (!t) throw new Error("Trip not found");
    const item: DemoItem = {
      id: randomUUID(),
      tripId,
      kind: input.kind,
      title: input.title,
      status: input.status ?? "TENTATIVE",
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      location: input.location ?? null,
      payload: input.payload ?? {},
      createdAt: new Date(),
    };
    t.items.push(item);
    t.items.sort((a, b) => (a.startTime?.getTime() ?? 0) - (b.startTime?.getTime() ?? 0));
    return item;
  },

  clearItems(tripId: string) {
    const t = store().trips.get(tripId);
    if (!t) return;
    t.items = [];
  },

  setTripMeta(tripId: string, meta: Record<string, unknown>) {
    const t = store().trips.get(tripId);
    if (!t) return;
    (t as any).meta = { ...((t as any).meta ?? {}), ...meta };
  },

  getTripMeta(tripId: string) {
    const t = store().trips.get(tripId);
    return ((t as any)?.meta ?? {}) as Record<string, unknown>;
  },

  updateTrip(tripId: string, data: Partial<Pick<DemoTrip, "destination" | "status" | "mode" | "title">>) {
    const t = store().trips.get(tripId);
    if (!t) throw new Error("Trip not found");
    Object.assign(t, data);
    return t;
  },

  addAlert(tripId: string, alert: { title: string; body: string; severity?: string }) {
    const t = store().trips.get(tripId);
    if (!t) throw new Error("Trip not found");
    const a: DemoAlert = {
      id: randomUUID(),
      tripId,
      title: alert.title,
      body: alert.body,
      severity: alert.severity ?? "INFO",
      resolved: false,
      createdAt: new Date(),
    };
    t.alerts.unshift(a);
    return a;
  },

  logAction(a: Omit<DemoAction, "id" | "createdAt">) {
    const row: DemoAction = { ...a, id: randomUUID(), createdAt: new Date() };
    store().actions.unshift(row);
    return row;
  },

  listActions(userId: string, tripId?: string, take = 40) {
    return store()
      .actions.filter((a) => a.userId === userId && (!tripId || a.tripId === tripId))
      .slice(0, take);
  },

  addInbox(doc: Omit<DemoInboxDoc, "id" | "createdAt">) {
    const row: DemoInboxDoc = { ...doc, id: randomUUID(), createdAt: new Date() };
    store().inbox.unshift(row);
    return row;
  },

  listInbox(userId: string) {
    ensureSampleTrip(userId);
    return store().inbox.filter((d) => d.userId === userId);
  },

  startTask(kind: string, tripId: string | undefined, input: unknown) {
    return { id: randomUUID(), kind, tripId, status: "RUNNING", input };
  },

  finishTask() {
    return true;
  },
};
