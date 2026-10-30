// Calls to the Worker's small HTTP API.

import { TOO_MANY_TEXT, type Minutes, type Phase } from "@open-door/shared";

export interface CreatedSession {
  code: string;
  teacherKey: string;
}

export async function createSession(scenario: string, minutes: Minutes): Promise<CreatedSession> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario, minutes }),
  });
  if (res.status === 429) throw new Error(TOO_MANY_TEXT);
  if (!res.ok) throw new Error(`Could not create a session (${res.status}).`);
  return (await res.json()) as CreatedSession;
}

export interface SessionSummary {
  code: string;
  scenario: string;
  phase: Phase;
}

/** The session behind a code, or null if there is none. Throws on network problems. */
export async function findSession(code: string): Promise<SessionSummary | null> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(code)}`);
  if (res.status === 404) return null;
  if (res.status === 429) throw new Error(TOO_MANY_TEXT);
  if (!res.ok) throw new Error(`Could not check the code (${res.status}).`);
  return (await res.json()) as SessionSummary;
}
