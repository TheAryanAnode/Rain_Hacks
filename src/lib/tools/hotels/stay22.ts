/**
 * Stay22 hotel tool — live availability/pricing + affiliate booking links.
 * Falls back to deterministic mock when the live call fails or key is absent.
 */

export interface Stay22Hotel {
  id: string;
  name: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  starRating?: number;
  pricePerNight: number;
  currency: string;
  bookingUrl: string;
  suppliers: { name: string; price: number; url: string }[];
  amenities?: string[];
  noiseScore?: number;
  walkability?: number;
  safetyScore?: number;
  live?: boolean;
}

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  maxPriceUsd?: number;
  neighborhood?: string;
}

export async function searchHotels(params: HotelSearchParams): Promise<Stay22Hotel[]> {
  const key = process.env.STAY22_API_KEY;
  try {
    const qs = new URLSearchParams({
      address: params.destination,
      checkin: params.checkIn,
      checkout: params.checkOut,
      adults: String(params.guests ?? 2),
      currency: "USD",
      pageSize: "12",
    });
    if (params.maxPriceUsd) qs.set("max", String(params.maxPriceUsd));
    if (process.env.STAY22_AID) qs.set("aid", process.env.STAY22_AID);

    const headers: HeadersInit = { Accept: "application/json" };
    if (key) headers["X-API-KEY"] = key;

    const res = await fetch(`https://api.stay22.com/v2/accommodations?${qs}`, {
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return mockHotels(params);
    const data = await res.json();
    const results = (data.results ?? data.data ?? []) as any[];
    if (!results.length) return mockHotels(params);

    return results.slice(0, 12).map((r, i) => normalizeStay22(r, params, i));
  } catch {
    return mockHotels(params);
  }
}

function normalizeStay22(r: any, p: HotelSearchParams, i: number): Stay22Hotel {
  const suppliersObj = r.suppliers ?? {};
  const suppliers = Object.entries(suppliersObj).map(([name, v]: [string, any]) => ({
    name,
    price: Number(v?.price ?? v?.total ?? r.price ?? 200 + i * 20),
    url: String(v?.link ?? r.url ?? "#"),
  }));
  const price =
    suppliers.reduce((min, s) => Math.min(min, s.price || Infinity), Infinity) ||
    Number(r.price ?? r.minPrice ?? 220 + i * 15);

  return {
    id: String(r.id ?? `${p.destination}-${i}`),
    name: String(r.name ?? r.title ?? `Stay ${i + 1}`),
    neighborhood: r.neighborhood ?? r.area ?? p.neighborhood ?? p.destination,
    lat: r.lat ?? r.latitude ?? r.location?.lat,
    lng: r.lng ?? r.longitude ?? r.location?.lng,
    starRating: Number(r.stars ?? r.starRating ?? r.rating ?? 4),
    pricePerNight: Number.isFinite(price) ? price : 220 + i * 15,
    currency: String(r.currency ?? "USD"),
    bookingUrl: String(r.url ?? suppliers[0]?.url ?? `https://stay22.com/allez?aid=${process.env.STAY22_AID ?? "wayport"}`),
    suppliers: suppliers.length
      ? suppliers
      : [{ name: "Stay22", price: 220 + i * 15, url: String(r.url ?? "#") }],
    amenities: r.amenities ?? ["wifi"],
    noiseScore: 0.25,
    walkability: Number(r.walkability ?? 80 + (i % 15)),
    safetyScore: 0.9,
    live: true,
  };
}

export function wayportMatchScore(
  hotel: Stay22Hotel,
  prefs: Partial<{ food: number; nightlife: number; walking: number; budgetSensitivity: number }>,
): number {
  let score = 70;
  if (prefs.walking && hotel.walkability) score += (hotel.walkability - 70) * 0.4;
  if (prefs.budgetSensitivity) score += Math.max(0, 100 - hotel.pricePerNight * 0.3) * prefs.budgetSensitivity;
  if (prefs.nightlife && hotel.neighborhood) score += 6;
  if (hotel.live) score += 4;
  return Math.max(0, Math.min(99, Math.round(score)));
}

function mockHotels(p: HotelSearchParams): Stay22Hotel[] {
  const mk = (name: string, price: number, star: number, walk: number): Stay22Hotel => ({
    id: `${p.destination}-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    neighborhood: p.neighborhood ?? "Central",
    starRating: star,
    pricePerNight: price,
    currency: "USD",
    bookingUrl: `https://stay22.com/allez?aid=${process.env.STAY22_AID ?? "wayport"}`,
    suppliers: [
      { name: "Booking.com", price: price + 15, url: "#" },
      { name: "Hotels.com", price: price + 12, url: "#" },
      { name: "Expedia", price: price + 18, url: "#" },
      { name: "VRBO", price: price + 8, url: "#" },
    ],
    amenities: ["wifi", "breakfast"],
    noiseScore: 0.22,
    walkability: walk,
    safetyScore: 0.94,
    live: false,
  });
  return [
    mk("The Meridian", 242, 4.2, 92),
    mk("Solstice House", 198, 4.1, 88),
    mk("Ember Lofts", 267, 4.6, 85),
  ];
}
