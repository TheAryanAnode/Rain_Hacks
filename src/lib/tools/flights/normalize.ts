import type { FlightProvider, FlightOffer } from "./provider";
import { AmadeusProvider } from "./providers/amadeus";
import { MockFlightProvider } from "./providers/mock";

let current: FlightProvider | null = null;

export function getFlightProvider(): FlightProvider {
  if (current) return current;
  current = process.env.AMADEUS_CLIENT_ID ? new AmadeusProvider() : new MockFlightProvider();
  return current;
}

export function setFlightProvider(provider: FlightProvider) {
  current = provider;
}

export async function searchFlights(params: Parameters<FlightProvider["search"]>[0]): Promise<FlightOffer[]> {
  return getFlightProvider().search(params);
}
