"""Structured output for `travel_agent`.

This is the shape the manager-facing frontend renders: a trip summary, a
"who's coming from where" map, per-traveler flights, the hotel booking, and
a price breakdown checked against budget. The travel agent's job is to
propose bookable options, not to invent numbers it doesn't have, so most
price/availability fields are optional and paired with a `PriceStatus` so
the frontend can show "estimated" or "pending confirmation" instead of a
fabricated dollar amount.
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

PriceStatus = Literal["confirmed", "estimated", "unavailable"]
"""How reliable a price figure is.

- confirmed: a live quote from a sub-agent (bookable price/inventory).
- estimated: a rough figure (e.g. typical fare/rate), not yet quoted.
- unavailable: no pricing could be found; `amount_usd` must be null.
"""

FlagSeverity = Literal["info", "warning", "critical"]

PlanStatus = Literal[
    "gathering_requirements",
    "researching",
    "awaiting_budget_approval",
    "ready_to_book",
    "booked",
]


class Price(BaseModel):
    """A single dollar figure with a confidence/status flag.

    Never fabricate `amount_usd` — if a real quote isn't available, set
    `status="unavailable"` and leave `amount_usd` null rather than guessing.
    """

    amount_usd: float | None = Field(
        default=None,
        description="Dollar amount in USD. Must be null when status is 'unavailable'.",
    )
    status: PriceStatus = Field(
        default="unavailable",
        description="Whether this figure is a confirmed quote, a rough estimate, or unavailable.",
    )
    notes: str | None = Field(
        default=None,
        description="Short caveat, e.g. 'excludes baggage fees' or 'no live inventory returned'.",
    )


class TravelerOrigin(BaseModel):
    """One entry per traveler, used to render a 'who's coming from where' map."""

    traveler_name: str
    home_city: str
    home_airport: str = Field(description="IATA code of the traveler's departure airport.")
    latitude: float | None = Field(
        default=None,
        description="Approximate latitude of home_airport, only if confidently known; else null.",
    )
    longitude: float | None = Field(
        default=None,
        description="Approximate longitude of home_airport, only if confidently known; else null.",
    )


class FlightLeg(BaseModel):
    """One flown segment (a nonstop hop; a connection is multiple legs)."""

    flight_number: str | None = None
    airline: str | None = None
    origin_airport: str = Field(description="IATA code.")
    destination_airport: str = Field(description="IATA code.")
    departure_local_time: str | None = Field(
        default=None, description="Local departure date/time, e.g. '2026-10-12 08:15'."
    )
    arrival_local_time: str | None = Field(
        default=None, description="Local arrival date/time, e.g. '2026-10-12 12:40'."
    )


class TravelerFlightPlan(BaseModel):
    """Outbound + return flights proposed for a single traveler."""

    traveler_name: str
    home_airport: str = Field(description="IATA code.")
    destination_airport: str = Field(description="IATA code.")

    outbound_legs: list[FlightLeg] = Field(default_factory=list)
    return_legs: list[FlightLeg] = Field(default_factory=list)

    destination_arrival_local_time: str | None = Field(
        default=None,
        description="When this traveler lands at the destination, for checking against event deadlines.",
    )
    origin_departure_local_time: str | None = Field(
        default=None, description="When this traveler departs the destination on the return leg."
    )

    airline_preference_honored: bool | None = None
    seat_preference: str | None = None
    special_requests: list[str] = Field(
        default_factory=list,
        description="Meal requests, loyalty numbers, KTN, accessibility assistance, etc.",
    )

    price: Price = Field(default_factory=Price)
    risk_flags: list[str] = Field(
        default_factory=list,
        description="e.g. 'only 40 min connection buffer before the welcome dinner'.",
    )


class HotelRoomAssignment(BaseModel):
    """One room within the hotel booking, assigned to a specific traveler."""

    traveler_name: str
    room_type: str = Field(description="e.g. 'single king, standard' or 'accessible, roll-in shower'.")
    accessible: bool = Field(
        default=False, description="True if this room fulfills a stated accessibility requirement."
    )
    accessibility_notes: str | None = None
    price: Price = Field(default_factory=Price)


class HotelPlan(BaseModel):
    """The proposed (not necessarily booked) hotel for the whole group."""

    hotel_name: str
    address: str | None = None
    star_rating: float | None = None
    walking_distance_to_office: str | None = Field(
        default=None, description="e.g. '8-10 minute walk to 525 Market St'."
    )
    check_in: date
    check_out: date
    rooms: list[HotelRoomAssignment] = Field(default_factory=list)
    total_price: Price = Field(default_factory=Price)
    alternatives_considered: list[str] = Field(
        default_factory=list,
        description="Other candidate hotels and why they were not chosen, for transparency.",
    )


class GroundTransportItem(BaseModel):
    """A ground-transport line item (airport transfer, rideshare, etc.)."""

    description: str
    traveler_names: list[str] = Field(default_factory=list)
    price: Price = Field(default_factory=Price)


class BudgetLine(BaseModel):
    """One row in the price-breakdown table shown to the manager."""

    category: Literal["flights", "hotel", "ground_transportation", "other"]
    price: Price = Field(default_factory=Price)


class BudgetSummary(BaseModel):
    """Cost vs. budget, for the single go/no-go decision the manager makes."""

    total_budget_usd: float
    per_person_limit_usd: float | None = None
    currency: str = "USD"

    breakdown: list[BudgetLine] = Field(default_factory=list)
    estimated_total_cost: Price = Field(
        default_factory=Price,
        description="Sum of all breakdown lines with known prices; status reflects the least-confident line.",
    )
    per_traveler_cost_usd: dict[str, float] = Field(
        default_factory=dict, description="Traveler name -> their share of flights + hotel, where known.",
    )
    over_budget: bool | None = Field(
        default=None,
        description="True/false only if estimated_total_cost is confirmed or estimated; null if unavailable.",
    )
    approval_status: Literal["approved", "pending", "rejected"]
    approver: str | None = None


class PlanFlag(BaseModel):
    """A caveat, risk, or open item the manager should see before approving."""

    severity: FlagSeverity
    message: str


class TravelPlan(BaseModel):
    """The complete trip plan `travel_agent` presents to the manager.

    Rendered by the frontend as: a summary header, a map of traveler
    origins -> destination, per-traveler flight cards, the hotel card, a
    price-breakdown table against budget, and a flags/next-steps list.
    """

    request_id: str
    trip_purpose: str | None = None

    destination_city: str
    destination_address: str | None = None
    start_date: date
    end_date: date

    summary: str = Field(
        description="A few-sentence, manager-readable summary of the plan and its status."
    )
    status: PlanStatus

    travel_map: list[TravelerOrigin] = Field(
        default_factory=list,
        description="One entry per traveler, for a map of who is coming from where.",
    )
    flights: list[TravelerFlightPlan] = Field(default_factory=list)
    hotel: HotelPlan | None = None
    ground_transportation: list[GroundTransportItem] = Field(default_factory=list)

    budget: BudgetSummary

    flags: list[PlanFlag] = Field(
        default_factory=list,
        description="Risks, missing info, or things that don't fit (budget overage, missing "
        "accessible room, tight connections, etc.) — never silently drop these.",
    )
    next_steps: list[str] = Field(
        default_factory=list,
        description="What must happen before this plan can move to the next status, e.g. "
        "'awaiting budget approval from Markus Weber', 'confirm live hotel inventory'.",
    )
