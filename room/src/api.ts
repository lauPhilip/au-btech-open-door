// Small HTTP API next to the live rooms.
//   POST /api/sessions        { scenario, minutes } -> { code, teacherKey }
//   GET  /api/sessions/CODE   -> { code, scenario, phase } or 404

import { getServerByName } from "partyserver";
import { makeCode, normaliseCode, scenarios, type Minutes } from "@open-door/shared";
import type { GameRoom } from "./game-room";
import { limitRequest, recordMiss, type GuardEnv } from "./guard";

export interface ApiEnv extends GuardEnv {
  GameRoom: DurableObjectNamespace<GameRoom>;
}

/** Tries before giving up on finding a free code (31^4 ≈ 920,000 codes). */
const CODE_TRIES = 8;
const DEFAULT_SCENARIO = "nordknit-black-friday";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/** A random key only the teacher's browser knows. */
export function makeTeacherKey(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_");
}

/** Crypto-quality random numbers in [0, 1) for session codes. */
function secureRandom(): number {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return n[0]! / 2 ** 32;
}

export async function handleApi(request: Request, env: ApiEnv): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/sessions") {
    if (request.method !== "POST") return json({ error: "Use POST" }, 405);
    const refused = await limitRequest(request, "create", env);
    if (refused) return refused;
    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text.length > 1024) return json({ error: "Too large" }, 413);
      if (text) body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return json({ error: "Bad JSON" }, 400);
    }
    const scenario = typeof body.scenario === "string" ? body.scenario : DEFAULT_SCENARIO;
    if (!scenarios[scenario]) return json({ error: "Unknown scenario" }, 400);
    const minutes: Minutes = body.minutes === 45 ? 45 : 90;

    const teacherKey = makeTeacherKey();
    for (let i = 0; i < CODE_TRIES; i++) {
      const code = makeCode(secureRandom);
      const room = await getServerByName(env.GameRoom, code);
      if (await room.setup(scenario, minutes, teacherKey)) return json({ code, teacherKey }, 201);
    }
    return json({ error: "No free code, try again" }, 503);
  }

  const match = /^\/api\/sessions\/([^/]+)$/.exec(url.pathname);
  if (match) {
    if (request.method !== "GET") return json({ error: "Use GET" }, 405);
    const refused = await limitRequest(request, "lookup", env);
    if (refused) return refused;
    const code = normaliseCode(decodeURIComponent(match[1]!));
    if (!code) return recordMiss(request) ?? json({ error: "Not a session code" }, 404);
    const info = await (await getServerByName(env.GameRoom, code)).info();
    if (!info.exists) return recordMiss(request) ?? json({ error: "No such session" }, 404);
    return json({ code, scenario: info.scenario, phase: info.phase });
  }

  return json({ error: "Not found" }, 404);
}
