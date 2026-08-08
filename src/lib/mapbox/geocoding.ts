import type { GeocodeResult } from "./types";

/** Known anchors — exact coords when Mapbox is offline or query is fuzzy */
const PLACES: Record<string, GeocodeResult> = {
  kyoto: { name: "Kyoto", lng: 135.7681, lat: 35.0116 },
  gion: { name: "Gion", lng: 135.7751, lat: 35.0037 },
  yasaka: { name: "Yasaka Shrine", lng: 135.7786, lat: 35.0036 },
  fushimi: { name: "Fushimi Inari", lng: 135.7727, lat: 34.9671 },
  "fushimi inari": { name: "Fushimi Inari", lng: 135.7727, lat: 34.9671 },
  nishiki: { name: "Nishiki Market", lng: 135.7648, lat: 35.005 },
  pontocho: { name: "Pontocho", lng: 135.7715, lat: 35.0045 },
  pontochō: { name: "Pontocho", lng: 135.7715, lat: 35.0045 },
  higashiyama: { name: "Higashiyama", lng: 135.782, lat: 35.002 },
  "philosopher": { name: "Philosopher's Path", lng: 135.7955, lat: 35.0265 },
  arashiyama: { name: "Arashiyama", lng: 135.6721, lat: 35.0094 },
  "kinkaku": { name: "Kinkaku-ji", lng: 135.7292, lat: 35.0394 },
  "kiyomizu": { name: "Kiyomizu-dera", lng: 135.785, lat: 34.9949 },
  "bamboo": { name: "Arashiyama Bamboo Grove", lng: 135.6721, lat: 35.0094 },
  "kamo": { name: "Kamo River", lng: 135.771, lat: 35.011 },
  "kansai": { name: "Kansai Airport", lng: 135.244, lat: 34.434 },
  kix: { name: "Kansai Airport", lng: 135.244, lat: 34.434 },
  lisbon: { name: "Lisbon", lng: -9.1393, lat: 38.7223 },
  baixa: { name: "Baixa", lng: -9.139, lat: 38.7139 },
  alfama: { name: "Alfama", lng: -9.131, lat: 38.7129 },
  belem: { name: "Belém", lng: -9.2057, lat: 38.6979 },
  belém: { name: "Belém", lng: -9.2057, lat: 38.6979 },
  tokyo: { name: "Tokyo", lng: 139.6917, lat: 35.6895 },
  shibuya: { name: "Shibuya", lng: 139.7016, lat: 35.6595 },
  shinjuku: { name: "Shinjuku", lng: 139.7006, lat: 35.6896 },
  asakusa: { name: "Asakusa", lng: 139.7967, lat: 35.7148 },
  paris: { name: "Paris", lng: 2.3522, lat: 48.8566 },
  nyc: { name: "New York", lng: -73.9857, lat: 40.7484 },
  "new york": { name: "New York", lng: -73.9857, lat: 40.7484 },
  portugal: { name: "Lisbon", lng: -9.1393, lat: 38.7223 },
  japan: { name: "Kyoto", lng: 135.7681, lat: 35.0116 },
  jfk: { name: "JFK Airport", lng: -73.7781, lat: 40.6413 },
  "terminal 4": { name: "JFK T4", lng: -73.783, lat: 40.644 },
  terminal: { name: "JFK T4", lng: -73.783, lat: 40.644 },
  nrt: { name: "Narita Airport", lng: 140.3929, lat: 35.772 },
  hnd: { name: "Haneda Airport", lng: 139.7798, lat: 35.5494 },
};

function matchKnownPlace(q: string): GeocodeResult | null {
  const lower = q.toLowerCase();
  // Longer keys first so "fushimi inari" wins over "fushimi"
  const keys = Object.keys(PLACES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) return { ...PLACES[key]! };
  }
  return null;
}

/**
 * Build a Mapbox/geocoder query that matches the planner's intended place,
 * not a generic title like "Dinner" or "Morning anchor experience".
 */
export function buildGeocodeQuery(
  item: { kind: string; title: string; location?: string | null },
  destination: string,
): string {
  const dest = destination.trim();
  const destCity = dest.split(",")[0]?.trim() || dest;

  if (item.location && item.location.trim().length > 1) {
    const loc = item.location.trim();
    if (loc.toLowerCase().includes(destCity.toLowerCase())) return loc;
    return `${loc}, ${dest}`;
  }

  let place = item.title
    .replace(/^(compact|local|easy pace|indoor backup|upgrade)\s*[·:—-]\s*/i, "")
    .replace(/^(dinner|lunch|breakfast|brunch)\s*[·:—-]\s*/i, "")
    .replace(/^(check in|check out|airport\s*[→\->]+\s*hotel|hotel\s*[→\->]+\s*airport)\s*/i, "")
    .trim();

  if (item.kind === "FLIGHT") {
    const codes = item.title.match(/\b[A-Z]{3}\b/g);
    if (codes && codes.length >= 2) return `${codes[codes.length - 1]} Airport`;
    if (codes && codes.length === 1) return `${codes[0]} Airport`;
    if (/return/i.test(item.title)) return `${destCity} Airport`;
    return `${destCity} Airport`;
  }

  if (/^(morning|afternoon|evening|neighborhood|local|anchor|exploration|experience)/i.test(place)) {
    place = destCity;
  }

  return `${place}, ${dest}`;
}

export async function geocode(query: string, near?: { lng: number; lat: number }): Promise<GeocodeResult> {
  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const known = matchKnownPlace(query);
  // Prefer exact known landmark when the query clearly names it (avoids Mapbox picking a random POI)
  if (known && query.split(/[,\s]/).filter(Boolean).length <= 6) {
    // Still try Mapbox for full "Place, City" queries — but if known key is strong, use it
    const strong = Object.keys(PLACES).some((k) => k.length >= 4 && query.toLowerCase().includes(k));
    if (strong && known) {
      // Use Mapbox only to refine; if it fails, return known exact coords (no jitter)
      if (token) {
        try {
          const prox = near ? `&proximity=${near.lng},${near.lat}` : "";
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&types=poi,place,locality,neighborhood,address${prox}`;
          const res = await fetch(url, { next: { revalidate: 86400 } });
          if (res.ok) {
            const data = await res.json();
            const f = data.features?.[0];
            if (f) {
              const [lng, lat] = f.center as [number, number];
              // Reject far-away results (wrong country / wrong city)
              if (near) {
                const dlat = Math.abs(lat - near.lat);
                const dlng = Math.abs(lng - near.lng);
                if (dlat > 2.5 || dlng > 2.5) return { ...known, name: known.name };
              }
              return {
                name: f.place_name ?? known.name,
                lng,
                lat,
                placeType: f.place_type?.[0],
              };
            }
          }
        } catch {
          /* use known */
        }
      }
      return { ...known, name: known.name };
    }
  }

  if (token) {
    try {
      const prox = near ? `&proximity=${near.lng},${near.lat}` : "";
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&types=poi,place,locality,neighborhood,address${prox}`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (res.ok) {
        const data = await res.json();
        const f = data.features?.[0];
        if (f) {
          const [lng, lat] = f.center as [number, number];
          if (near) {
            const dlat = Math.abs(lat - near.lat);
            const dlng = Math.abs(lng - near.lng);
            if (dlat > 3 || dlng > 3) {
              // Wrong hemisphere / city — fall back to known or near
              if (known) return { ...known };
              return { name: query, lng: near.lng, lat: near.lat };
            }
          }
          return {
            name: f.place_name ?? query,
            lng,
            lat,
            placeType: f.place_type?.[0],
          };
        }
      }
    } catch {
      /* fall through */
    }
  }

  if (known) return { ...known, name: known.name };

  const base = near ?? PLACES.kyoto!;
  // Deterministic offset from query so the same planner stop always lands in the same spot
  let h = 0;
  for (let i = 0; i < query.length; i++) h = (h * 31 + query.charCodeAt(i)) | 0;
  const jx = ((h % 1000) / 1000 - 0.5) * 0.025;
  const jy = ((((h >> 8) % 1000) / 1000) - 0.5) * 0.025;
  return { name: query, lng: base.lng + jx, lat: base.lat + jy };
}

export function destinationCenter(destination: string): GeocodeResult {
  return matchKnownPlace(destination) ?? PLACES.kyoto!;
}

/** Resolve lat/lng for a trip item so the map matches the planner. */
export async function resolveItemCoords(
  item: { kind: string; title: string; location?: string | null; payload?: Record<string, unknown> | null },
  destination: string,
): Promise<{ lat: number; lng: number; geocodedName: string; query: string }> {
  const payload = (item.payload ?? {}) as Record<string, unknown>;
  if (typeof payload.lat === "number" && typeof payload.lng === "number") {
    return {
      lat: payload.lat,
      lng: payload.lng,
      geocodedName: typeof payload.geocodedName === "string" ? payload.geocodedName : item.location || item.title,
      query: "payload",
    };
  }
  const center = destinationCenter(destination);
  const query = buildGeocodeQuery(item, destination);
  const g = await geocode(query, center);
  return { lat: g.lat, lng: g.lng, geocodedName: g.name, query };
}
