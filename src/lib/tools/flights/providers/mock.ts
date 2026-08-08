import type { FlightProvider, FlightOffer, FlightSearchParams, FlightStatusUpdate } from "../provider";

/** Pure mock for offline development + Sandbox scenarios. */
export class MockFlightProvider implements FlightProvider {
  name = "mock";

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    return [
      {
        provider: "mock",
        offerId: `MOCK-${params.origin}-${params.destination}-1`,
        airline: "AA",
        flightNumber: "AA100",
        origin: params.origin,
        destination: params.destination,
        departureIso: `${params.departureDate}T08:00:00Z`,
        arrivalIso: `${params.departureDate}T11:00:00Z`,
        durationMinutes: 300,
        cabin: params.cabin ?? "economy",
        priceUsd: 245,
        currency: "USD",
        refundable: false,
        seatMapAvailable: false,
        bookingUrl: "#",
      },
    ];
  }

  async price(offerId: string) {
    return {
      provider: "mock",
      offerId,
      airline: "AA",
      flightNumber: "AA100",
      origin: "JFK",
      destination: "LAX",
      departureIso: "2026-08-10T08:00:00Z",
      arrivalIso: "2026-08-10T11:00:00Z",
      durationMinutes: 300,
      cabin: "economy",
      priceUsd: 245,
      currency: "USD",
      refundable: false,
      seatMapAvailable: false,
    };
  }

  async status(flightNumber: string): Promise<FlightStatusUpdate | null> {
    return { flightNumber, airline: "AA", scheduledDeparture: new Date().toISOString(), status: "on_time" };
  }

  async book(offerId: string) {
    return { confirmation: `MOCK-${offerId.slice(0, 8).toUpperCase()}` };
  }
}
