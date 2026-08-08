import type { GeocodeResult } from "./types";

/** City / landmark anchors for demo + Mapbox fallback */
const PLACES: Record<string, GeocodeResult> = {
  kyoto: { name: "Kyoto", lng: 135.7681, lat: 35.0116 },
  gion: { name: "Gion", lng: 135.7751, lat: 35.0037 },
  fushimi: { name: "Fushimi Inari", lng: 135.7727, lat: 34.9671 },
  nishiki: { name: "Nishiki Market", lng: 135.7648, lat: 35.005 },
  pontocho: { name: "Pontocho", lng: 135.7715, lat: 35.0045 },
  higashiyama: { name: "Higashiyama", lng: 135.782, lat: 35.002 },
  "kansai airport": { name: "Kansai Airport", lng: 135.244, lat: 34.434 },
  lisbon: { name: "Lisbon", lng: -9.1393, lat: 38.7223 },
  baixa: { name: "Baixa", lng: -9.139, lat: 38.7139 },
  alfama: { name: "Alfama", lng: -9.131, lat: 38.7129 },
  belem: { name: "Belém", lng: -9.2057, lat: 38.6979 },
  tokyo: { name: "Tokyo", lng: 139.6917, lat: 35.6895 },
  paris: { name: "Paris", lng: 2.3522, lat: 48.8566 },
  nyc: { name: "New York", lng: -73.9857, lat: 40.7484 },
  "new york": { name: "New York", lng: -73.9857, lat: 40.7484 },
  portugal: { name: "Lisbon", lng: -9.1393, lat: 38.7223 },
  japan: { name: "Kyoto", lng: 135.7681, lat: 35.0116 },
  jfk: { name: "JFK", lng: -73.7781, lat: 40.6413 },
  terminal: { name: "JFK T4", lng: -73.783, lat: 40.644 },
};

function jitter(seed: string, amp = 0.012): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = ((h % 1000) / 1000 - 0.5) * amp;
  const b = (((h >> 8) % 1000) / 1000 - 0.5) * amp;
  return [a, b];
}

export async function geocode(query: string, near?: { lng: number; lat: number }): Promise<GeocodeResult> {
  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const q = query.toLowerCase();

  if (token) {
    try {
      const prox = near ? `&proximity=${near.lng},${near.lat}` : "";
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1${prox}`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (res.ok) {
        const data = await res.json();
        const f = data.features?.[0];
        if (f) {
          return {
            name: f.place_name ?? query,
            lng: f.center[0],
            lat: f.center[1],
            placeType: f.place_type?.[0],
          };
        }
      }
    } catch {
      /* fall through */
    }
  }

  for (const [key, place] of Object.entries(PLACES)) {
    if (q.includes(key)) {
      const [jx, jy] = jitter(query);
      return { ...place, name: query, lng: place.lng + jx, lat: place.lat + jy };
    }
  }

  const base = near ?? PLACES.kyoto;
  const [jx, jy] = jitter(query, 0.04);
  return { name: query, lng: base.lng + jx, lat: base.lat + jy };
}

export function destinationCenter(destination: string): GeocodeResult {
  const q = destination.toLowerCase();
  for (const [key, place] of Object.entries(PLACES)) {
    if (q.includes(key)) return place;
  }
  return PLACES.kyoto;
}
