import type { Route, RouteLeg, TransportMode, TripStop } from "./types";
import { randomUUID } from "crypto";

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function curve(a: [number, number], b: [number, number]): [number, number][] {
  const mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.08;
  const my = (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.08;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const u = 1 - t;
    pts.push([
      u * u * a[0] + 2 * u * t * mx + t * t * b[0],
      u * u * a[1] + 2 * u * t * my + t * t * b[1],
    ]);
  }
  return pts;
}

async function mapboxDirections(
  coords: [number, number][],
  mode: TransportMode,
): Promise<{ geometry: GeoJSON.LineString; distance: number; duration: number; legs: { distance: number; duration: number }[] } | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token || coords.length < 2) return null;
  const profile = mode === "walking" ? "walking" : mode === "cycling" ? "cycling" : "driving-traffic";
  const path = coords.map((c) => `${c[0]},${c[1]}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${path}?geometries=geojson&overview=full&steps=false&access_token=${token}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      legs: (route.legs ?? []).map((l: any) => ({ distance: l.distance, duration: l.duration })),
    };
  } catch {
    return null;
  }
}

export async function buildDayRoute(
  tripId: string,
  dayOffset: number,
  stops: TripStop[],
  mode: TransportMode = "walking",
): Promise<Route | null> {
  if (stops.length < 2) return null;
  const ordered = [...stops].sort((a, b) => a.order - b.order);
  const coords = ordered.map((s) => [s.lng, s.lat] as [number, number]);

  const live = await mapboxDirections(coords, mode);
  const legs: RouteLeg[] = [];
  let allCoords: [number, number][] = [];
  let totalDist = 0;
  let totalDur = 0;

  for (let i = 0; i < ordered.length - 1; i++) {
    const from = ordered[i];
    const to = ordered[i + 1];
    const a: [number, number] = [from.lng, from.lat];
    const b: [number, number] = [to.lng, to.lat];
    const dist = live?.legs[i]?.distance ?? haversine(a, b) * 1.25;
    const speed = mode === "walking" ? 1.35 : mode === "cycling" ? 4.5 : 8.5;
    const dur = live?.legs[i]?.duration ?? dist / speed;
    const geomCoords = live
      ? (live.geometry.coordinates.slice(
          /* approximate segment */ 0,
        ) as [number, number][])
      : curve(a, b);

    // Prefer per-leg curve when mock
    const segmentGeom: GeoJSON.LineString = {
      type: "LineString",
      coordinates: live ? [a, b] : curve(a, b),
    };
    if (!live) {
      allCoords = allCoords.concat(curve(a, b));
    }

    legs.push({
      fromStopId: from.id,
      toStopId: to.id,
      distanceMeters: dist,
      durationSeconds: dur,
      mode,
      geometry: segmentGeom,
      summary: `${Math.round(dur / 60)} min`,
    });
    totalDist += dist;
    totalDur += dur;
  }

  const geometry: GeoJSON.LineString = live?.geometry ?? {
    type: "LineString",
    coordinates: allCoords.length ? allCoords : coords,
  };
  if (live) {
    totalDist = live.distance;
    totalDur = live.duration;
  }

  return {
    id: randomUUID(),
    tripId,
    dayOffset,
    mode,
    distanceMeters: totalDist,
    durationSeconds: totalDur,
    legs,
    geometry,
    status: "active",
  };
}

/** Convert trip items → TripStops with coordinates (server-side). */
export async function itemsToStops(
  items: {
    id: string;
    kind: string;
    title: string;
    location?: string | null;
    startTime?: Date | string | null;
    payload?: Record<string, unknown> | null;
    status?: string;
  }[],
  destination: string,
  tripStart?: Date | null,
): Promise<TripStop[]> {
  const { resolveItemCoords } = await import("./geocoding");

  const stops: TripStop[] = [];
  let order = 0;
  for (const it of items) {
    const start = it.startTime ? new Date(it.startTime) : null;
    const payload = (it.payload ?? {}) as Record<string, unknown>;
    const coords = await resolveItemCoords(it, destination);
    const meta =
      typeof payload.priceUsd === "number"
        ? null
        : (await import("@/lib/agents/pricing")).enrichItemMeta(it.kind, it.title, it.location ?? undefined);
    stops.push({
      id: `stop-${it.id}`,
      tripItemId: it.id,
      title: it.title,
      kind: it.kind,
      lng: coords.lng,
      lat: coords.lat,
      dayOffset: 0,
      order: order++,
      priceUsd: typeof payload.priceUsd === "number" ? (payload.priceUsd as number) : meta?.priceUsd,
      description: typeof payload.description === "string" ? (payload.description as string) : meta?.description,
      whatToDo: Array.isArray(payload.whatToDo) ? (payload.whatToDo as string[]) : meta?.whatToDo,
      startTime: start?.toISOString() ?? null,
      status: it.status,
      location: it.location || coords.geocodedName,
    });
  }
  // Day buckets from start dates
  const sortedDays = [...new Set(stops.map((s) => (s.startTime ? s.startTime.slice(0, 10) : "unknown")))].sort();
  for (const s of stops) {
    const key = s.startTime ? s.startTime.slice(0, 10) : "unknown";
    s.dayOffset = Math.max(0, sortedDays.indexOf(key));
  }
  // Stable order within day by time then original order
  stops.sort((a, b) => {
    if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset;
    return (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.order - b.order;
  });
  stops.forEach((s, i) => {
    s.order = i;
  });
  return stops;
}
