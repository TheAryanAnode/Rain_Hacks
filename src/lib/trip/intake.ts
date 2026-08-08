/**
 * Trip intake — the contract for what WAYPORT must know before it can plan.
 *
 * Planning silently produced garbage when origin or dates were absent: you
 * cannot price a flight without an origin, and "day 3" is meaningless without a
 * start date. This module names the required fields, extracts what it can from
 * free text, and reports what is still missing so the UI can ask instead of
 * guessing.
 */

export interface TripIntake {
  origin: string;
  destination: string;
  /** ISO yyyy-mm-dd. */
  startDate: string;
  endDate?: string;
  travelers: number;
  budgetUsd?: number;
  purpose?: string;
  notes?: string;
}

export type IntakeField = "origin" | "destination" | "startDate";

/** Fields planning cannot proceed without. */
export const REQUIRED_FIELDS: IntakeField[] = ["origin", "destination", "startDate"];

export const FIELD_PROMPT: Record<IntakeField, string> = {
  origin: "Where are you departing from? A city or airport code works.",
  destination: "Where are you going?",
  startDate: "What date does the trip start?",
};

export interface ParsedIntake {
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  /** Head-count mentioned in the text. A hint only — the picker owns the party. */
  travelers?: number;
  budgetUsd?: number;
  purpose?: string;
  /** Required fields still unknown, in the order they should be asked. */
  missing: IntakeField[];
}

// Common origin airports, so "from SFO" and "from San Francisco" both resolve.
const AIRPORTS: Record<string, string> = {
  "new york": "JFK", nyc: "JFK", brooklyn: "JFK", manhattan: "JFK",
  "san francisco": "SFO", "bay area": "SFO", "silicon valley": "SFO",
  "los angeles": "LAX", la: "LAX", chicago: "ORD", boston: "BOS",
  seattle: "SEA", austin: "AUS", denver: "DEN", atlanta: "ATL",
  miami: "MIA", dallas: "DFW", houston: "IAH", "washington": "IAD",
  london: "LHR", paris: "CDG", amsterdam: "AMS", berlin: "BER",
  madrid: "MAD", barcelona: "BCN", lisbon: "LIS", dublin: "DUB",
  rome: "FCO", milan: "MXP", zurich: "ZRH", munich: "MUC",
  tokyo: "HND", osaka: "KIX", kyoto: "KIX", seoul: "ICN",
  singapore: "SIN", bangkok: "BKK", "hong kong": "HKG", dubai: "DXB",
  sydney: "SYD", melbourne: "MEL", toronto: "YYZ", vancouver: "YVR",
  bangalore: "BLR", bengaluru: "BLR", mumbai: "BOM", delhi: "DEL",
  "mexico city": "MEX", "sao paulo": "GRU", indianapolis: "IND",
};

/** Resolves a free-text place to an IATA code when we recognize it. */
export function toAirportCode(place: string): string | undefined {
  const p = place.trim().toLowerCase();
  if (/^[a-z]{3}$/.test(p)) return p.toUpperCase();
  for (const [name, code] of Object.entries(AIRPORTS)) {
    if (p.includes(name)) return code;
  }
  return undefined;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Best-effort date extraction. Only returns a date it is confident about —
 * a wrong date is worse than asking, because everything downstream is priced
 * and sequenced against it.
 */
export function parseStartDate(text: string, now = new Date()): string | undefined {
  const lower = text.toLowerCase();

  // 2026-03-14 or 2026/03/14
  const isoMatch = lower.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return iso(new Date(Date.UTC(+y, +m - 1, +d)));
  }

  // "March 14" / "14 March" / "Mar 14, 2026"
  const monthName = MONTHS.findIndex((m) =>
    new RegExp(`\\b${m.slice(0, 3)}[a-z]*\\b`).test(lower),
  );
  if (monthName >= 0) {
    const dayMatch = lower.match(
      new RegExp(`\\b${MONTHS[monthName].slice(0, 3)}[a-z]*\\.?\\s+(\\d{1,2})\\b`),
    ) ?? lower.match(
      new RegExp(`\\b(\\d{1,2})\\s+${MONTHS[monthName].slice(0, 3)}[a-z]*\\b`),
    );
    if (dayMatch) {
      const yearMatch = lower.match(/\b(20\d{2})\b/);
      const year = yearMatch ? +yearMatch[1] : now.getUTCFullYear();
      const candidate = new Date(Date.UTC(year, monthName, +dayMatch[1]));
      // A bare month/day in the past almost always means next year.
      if (!yearMatch && candidate.getTime() < now.getTime() - 86_400_000) {
        candidate.setUTCFullYear(year + 1);
      }
      return iso(candidate);
    }
  }

  // Relative: "in 3 weeks", "next monday", "tomorrow"
  const rel = lower.match(/\bin\s+(\d+)\s+(day|week|month)s?\b/);
  if (rel) {
    const n = +rel[1];
    const d = new Date(now);
    if (rel[2] === "day") d.setUTCDate(d.getUTCDate() + n);
    if (rel[2] === "week") d.setUTCDate(d.getUTCDate() + n * 7);
    if (rel[2] === "month") d.setUTCMonth(d.getUTCMonth() + n);
    return iso(d);
  }
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 1);
    return iso(d);
  }
  return undefined;
}

/** Words that end a place name — everything after them belongs to another clause. */
const CLAUSE_END =
  "from|leaving|departing|out of|on|for|with|next|starting|beginning|budget|\\$";

/**
 * Pulls the destination out of "offsite in Lisbon", "trip to Tokyo".
 *
 * `originSpan` is the slice already claimed by the origin, so "from SFO to
 * Lisbon" cannot read SFO as the destination.
 */
export function parseDestination(text: string, originSpan?: string): string | undefined {
  // Remove the origin clause outright — it is the main source of false matches.
  const cleaned = originSpan
    ? text.replace(
        new RegExp(`\\b(from|leaving|departing|out of)\\s+${escapeRe(originSpan)}\\b`, "i"),
        " ",
      )
    : text;

  const patterns = [
    new RegExp(`\\b(?:to|in|at)\\s+([A-Za-z][A-Za-z\\s'’.-]{1,30}?)(?=\\s+(?:${CLAUSE_END})\\b|[,.]|$)`, "i"),
  ];

  for (const re of patterns) {
    const m = cleaned.match(re);
    const raw = m?.[1]?.trim();
    // "in 3 weeks" is a date, not a place.
    if (raw && !/^\d/.test(raw) && !/^(the|a|an)$/i.test(raw)) {
      return titleCase(raw);
    }
  }

  // Fall back to any city we recognize that isn't the origin.
  const lower = cleaned.toLowerCase();
  for (const name of Object.keys(AIRPORTS).sort((a, b) => b.length - a.length)) {
    if (new RegExp(`(^|[^a-z])${escapeRe(name)}([^a-z]|$)`, "i").test(lower)) {
      return titleCase(name);
    }
  }
  return undefined;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const PURPOSE_WORDS: [RegExp, string][] = [
  [/\boff-?site\b/i, "OFFSITE"],
  [/\bconferenc/i, "CONFERENCE"],
  [/\bclient\s+(visit|meeting)\b/i, "CLIENT_VISIT"],
  [/\bcustomer\s+visit\b/i, "CLIENT_VISIT"],
  [/\btraining\b/i, "TRAINING"],
  [/\brecruit/i, "RECRUITING"],
  [/\bonsite\b/i, "OFFSITE"],
  [/\bsummit\b/i, "CONFERENCE"],
];

/** Detects trip purpose so the policy tier and approval routing start right. */
export function parsePurpose(text: string): string | undefined {
  for (const [re, purpose] of PURPOSE_WORDS) {
    if (re.test(text)) return purpose;
  }
  return undefined;
}

/** Pulls an origin out of phrasing like "from SFO" or "leaving San Francisco". */
export function parseOrigin(text: string): string | undefined {
  const patterns = [
    /\bfrom\s+([A-Za-z][A-Za-z\s]{1,24}?)(?=\s+to\b|\s+on\b|\s+for\b|[,.]|$)/i,
    /\bleaving\s+([A-Za-z][A-Za-z\s]{1,24}?)(?=\s+on\b|[,.]|$)/i,
    /\bdeparting\s+(?:from\s+)?([A-Za-z][A-Za-z\s]{1,24}?)(?=\s+on\b|[,.]|$)/i,
    /\bout\s+of\s+([A-Za-z][A-Za-z\s]{1,24}?)(?=[,.]|$)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const raw = m[1].trim();
      return toAirportCode(raw) ?? raw.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  // A bare IATA code anywhere ("SFO -> LIS").
  const bare = text.match(/\b([A-Z]{3})\s*(?:->|→|to)\s*[A-Z]{3}\b/);
  if (bare) return bare[1];
  return undefined;
}

/**
 * Extracts everything it can and reports what still has to be asked.
 * `known` lets the caller fold in answers already collected.
 */
export function parseIntake(
  text: string,
  known: Partial<TripIntake> = {},
  now = new Date(),
): ParsedIntake {
  const origin = known.origin ?? parseOrigin(text);
  const startDate = known.startDate ?? parseStartDate(text, now);

  const durationMatch = text.toLowerCase().match(/(\d+)\s*(day|night|week)s?/);
  const durationDays = durationMatch
    ? +durationMatch[1] * (durationMatch[2] === "week" ? 7 : 1)
    : undefined;

  const budgetMatch = text.match(/\$\s*([0-9][0-9,]*)\s*(k)?/i);
  const budgetUsd =
    known.budgetUsd ??
    (budgetMatch
      ? parseFloat(budgetMatch[1].replace(/,/g, "")) * (budgetMatch[2] ? 1000 : 1)
      : undefined);

  const peopleMatch = text.match(/\b(\d+)\s*(?:people|travelers|travellers|attendees|of us)\b/i);
  const travelers = known.travelers ?? (peopleMatch ? +peopleMatch[1] : undefined);

  let endDate = known.endDate;
  if (!endDate && startDate && durationDays) {
    const d = new Date(`${startDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + durationDays);
    endDate = iso(d);
  }

  // Pass the matched origin so it can't also be read as the destination.
  const destination = known.destination ?? parseDestination(text, origin);
  const purpose = known.purpose ?? parsePurpose(text);

  const missing = REQUIRED_FIELDS.filter((f) =>
    f === "origin" ? !origin : f === "startDate" ? !startDate : !destination,
  );

  return {
    origin,
    destination,
    startDate,
    endDate,
    durationDays,
    travelers,
    budgetUsd,
    purpose,
    missing,
  };
}

/** The next question to ask, or null when intake is complete. */
export function nextPrompt(missing: IntakeField[]): string | null {
  return missing.length ? FIELD_PROMPT[missing[0]] : null;
}
