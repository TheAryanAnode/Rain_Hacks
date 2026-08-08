/**
 * Flight Provider Abstraction — the Travel Graph only ever sees FlightOffer.
 * Any airline or OTA provider is normalized through this interface.
 */

export interface FlightOffer {
  provider: string;
  offerId: string;
  airline: string;
  airlineName?: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureIso: string;
  arrivalIso: string;
  durationMinutes: number;
  cabin: string;
  priceUsd: number;
  currency: string;
  baggage?: BaggageAllowance;
  bookingUrl?: string;
  refundable: boolean;
  seatMapAvailable: boolean;
  aircraft?: string;
}

export interface BaggageAllowance {
  carryOnBags: number;
  checkedBags: number;
  checkedBagPriceUsd?: number;
  weightKg?: number;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string; // ISO
  returnDate?: string;
  passengers?: number;
  cabin?: "economy" | "premium" | "business" | "first";
  maxPriceUsd?: number;
  directOnly?: boolean;
}

export interface FlightStatusUpdate {
  flightNumber: string;
  airline: string;
  scheduledDeparture: string;
  estimatedDeparture?: string;
  status: "on_time" | "delayed" | "cancelled" | "boarding" | "departed" | "arrived";
  delayMinutes?: number;
  gate?: string;
  terminal?: string;
}

export interface FlightProvider {
  name: string;
  search(params: FlightSearchParams): Promise<FlightOffer[]>;
  price(offerId: string): Promise<FlightOffer | null>;
  status(flightNumber: string, date: string): Promise<FlightStatusUpdate | null>;
  book(offerId: string, passengers: object[]): Promise<{ confirmation: string; bookingUrl?: string }>;
}
