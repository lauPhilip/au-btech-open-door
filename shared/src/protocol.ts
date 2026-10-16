// Messages between the browser and the session room.
// Shared by the app and the room server so both always agree on the format.

export type Device = "phone" | "tablet" | "laptop";

/** What the room knows about one connected person. */
export interface Person {
  id: string;
  name: string;
  device: Device;
  /** Median round-trip time in milliseconds, or null before the first measurement. */
  rtt: number | null;
  /** How many times this person has reconnected. */
  reconnects: number;
  joinedAt: number;
}

export type ClientMessage =
  | { t: "hello"; name: string; device: Device; reconnects: number }
  | { t: "ping"; n: number; sent: number }
  | { t: "report"; rtt: number };

export type ServerMessage =
  | { t: "welcome"; you: string; room: string }
  | { t: "presence"; people: Person[] }
  | { t: "pong"; n: number; sent: number };

export const NAME_MAX = 24;

/** Trim, collapse spaces and shorten a nickname. Returns "Guest" when empty. */
export function cleanName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
  return name.length > 0 ? name : "Guest";
}

/** Guess the device type from a user agent string. */
export function deviceFromUserAgent(ua: string): Device {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "phone";
  return "laptop";
}

function isDevice(value: unknown): value is Device {
  return value === "phone" || value === "tablet" || value === "laptop";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Parse and validate a message from a client.
 * Anything malformed returns null, so the room never trusts raw input.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > 1024) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const m = data as Record<string, unknown>;
  switch (m.t) {
    case "hello":
      if (typeof m.name !== "string" || !isDevice(m.device)) return null;
      return {
        t: "hello",
        name: cleanName(m.name),
        device: m.device,
        reconnects: isFiniteNumber(m.reconnects) ? Math.max(0, Math.floor(m.reconnects)) : 0,
      };
    case "ping":
      if (!isFiniteNumber(m.n) || !isFiniteNumber(m.sent)) return null;
      return { t: "ping", n: m.n, sent: m.sent };
    case "report":
      if (!isFiniteNumber(m.rtt) || m.rtt < 0 || m.rtt > 60_000) return null;
      return { t: "report", rtt: Math.round(m.rtt) };
    default:
      return null;
  }
}

/** Sort people for display: earliest joiners first, then by name. */
export function sortPeople(people: Person[]): Person[] {
  return [...people].sort((a, b) => a.joinedAt - b.joinedAt || a.name.localeCompare(b.name));
}
