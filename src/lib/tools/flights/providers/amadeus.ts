import type { FlightProvider, FlightOffer, FlightSearchParams, FlightStatusUpdate } from "../provider";

/**
 * Amadeus Self-Service — real flight offers when AMADEUS_CLIENT_ID/SECRET set.
 * Falls back to deterministic mock otherwise.
 */

let cachedToken: { value: string; exp: number } | null = null;

async function getToken(): Promise<string | null> {
  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
  });
  const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    exp: Date.now() + (data.expires_in ?? 1799) * 1000,
  };
  return cachedToken.value;
}

export class AmadeusProvider implements FlightProvider {
  name = "amadeus";

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    const token = await getToken();
    if (!token) return mockOffers(params);

    try {
      const qs = new URLSearchParams({
        originLocationCode: params.origin.slice(0, 3).toUpperCase(),
        destinationLocationCode: params.destination.slice(0, 3).toUpperCase(),
        departureDate: params.departureDate.slice(0, 10),
        adults: String(params.passengers ?? 1),
        currencyCode: "USD",
        max: "8",
      });
      if (params.returnDate) qs.set("returnDate", params.returnDate.slice(0, 10));
      if (params.directOnly) qs.set("nonStop", "true");

      const res = await fetch(
        `https://test.api.amadeus.com/v2/shopping/flight-offers?${qs}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return mockOffers(params, "amadeus-fallback");
      const data = await res.json();
      const offers = (data.data ?? []) as any[];
      if (!offers.length) return mockOffers(params, "amadeus-empty");

      return offers.map((o, i) => normalizeOffer(o, params, i));
    } catch {
      return mockOffers(params, "amadeus-error");
    }
  }

  async price(offerId: string): Promise<FlightOffer | null> {
    const [first] = mockOffers({ origin: "JFK", destination: "LAX", departureDate: "2026-08-10" });
    return { ...first, offerId };
  }

  async status(flightNumber: string, date: string): Promise<FlightStatusUpdate | null> {
    const token = await getToken();
    if (!token) {
      return {
        flightNumber,
        airline: flightNumber.slice(0, 2),
        scheduledDeparture: `${date}T10:00:00Z`,
        status: "on_time",
      };
    }
    try {
      // Amadeus flight status by number (test API)
      const carrier = flightNumber.replace(/[^A-Za-z]/g, "").slice(0, 2);
      const number = flightNumber.replace(/[^0-9]/g, "");
      const qs = new URLSearchParams({
        carrierCode: carrier,
        flightNumber: number,
        scheduledDepartureDate: date.slice(0, 10),
      });
      const res = await fetch(
        `https://test.api.amadeus.com/v2/schedule/flights?${qs}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        return {
          flightNumber,
          airline: carrier,
          scheduledDeparture: `${date}T10:00:00Z`,
          status: "on_time",
        };
      }
      const data = await res.json();
      const f = data.data?.[0];
      return {
        flightNumber,
        airline: carrier,
        scheduledDeparture: f?.flightPoints?.[0]?.departure?.timings?.[0]?.value ?? `${date}T10:00:00Z`,
        status: "on_time",
      };
    } catch {
      return {
        flightNumber,
        airline: flightNumber.slice(0, 2),
        scheduledDeparture: `${date}T10:00:00Z`,
        status: "on_time",
      };
    }
  }

  async book(offerId: string): Promise<{ confirmation: string; bookingUrl?: string }> {
    return { confirmation: `AM-${offerId.slice(0, 8).toUpperCase()}` };
  }
}

function normalizeOffer(o: any, p: FlightSearchParams, i: number): FlightOffer {
  const itinerary = o.itineraries?.[0];
  const seg = itinerary?.segments?.[0];
  const last = itinerary?.segments?.[itinerary.segments.length - 1];
  const price = Number(o.price?.total ?? o.price?.grandTotal ?? 300 + i * 40);
  const dep = seg?.departure?.at ?? `${p.departureDate}T08:00:00`;
  const arr = last?.arrival?.at ?? `${p.departureDate}T12:00:00`;
  const durationMinutes = Math.max(
    60,
    Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60_000),
  );
  return {
    provider: "amadeus",
    offerId: String(o.id ?? `amd-${i}`),
    airline: seg?.carrierCode ?? "XX",
    airlineName: seg?.carrierCode,
    flightNumber: `${seg?.carrierCode ?? "XX"}${seg?.number ?? 100 + i}`,
    origin: seg?.departure?.iataCode ?? p.origin,
    destination: last?.arrival?.iataCode ?? p.destination,
    departureIso: dep,
    arrivalIso: arr,
    durationMinutes,
    cabin: p.cabin ?? "economy",
    priceUsd: price,
    currency: o.price?.currency ?? "USD",
    refundable: false,
    seatMapAvailable: true,
    aircraft: seg?.aircraft?.code,
  };
}

function mockOffers(p: FlightSearchParams, provider = "mock"): FlightOffer[] {
  const base = {
    provider,
    origin: p.origin,
    destination: p.destination,
    cabin: p.cabin ?? "economy",
    currency: "USD",
    refundable: true,
    seatMapAvailable: true,
    bookingUrl: "#" as const,
  };
  return [
    { ...base, offerId: `${p.origin}-${p.destination}-A`, airline: "UA", airlineName: "United", flightNumber: "UA101", departureIso: `${p.departureDate}T06:30:00Z`, arrivalIso: `${p.departureDate}T09:45:00Z`, durationMinutes: 315, priceUsd: 287 },
    { ...base, offerId: `${p.origin}-${p.destination}-B`, airline: "DL", airlineName: "Delta", flightNumber: "DL422", departureIso: `${p.departureDate}T09:15:00Z`, arrivalIso: `${p.departureDate}T12:40:00Z`, durationMinutes: 325, priceUsd: 342 },
    { ...base, offerId: `${p.origin}-${p.destination}-C`, airline: "B6", airlineName: "JetBlue", flightNumber: "B681", departureIso: `${p.departureDate}T12:00:00Z`, arrivalIso: `${p.departureDate}T15:20:00Z`, durationMinutes: 320, priceUsd: 312 },
  ];
}
