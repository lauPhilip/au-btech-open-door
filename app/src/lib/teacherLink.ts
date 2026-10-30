// The teacher link lets the teacher continue a session from another device.
// The key sits after the "#", which browsers never send to a server, so it stays out of logs.

import { normaliseCode } from "@open-door/shared";

const KEY_SHAPE = /^[A-Za-z0-9_-]{16,64}$/;

export function isTeacherKey(value: string): boolean {
  return KEY_SHAPE.test(value);
}

export function teacherLink(origin: string, code: string, key: string): string {
  return `${origin}/teacher?code=${code}#key=${key}`;
}

/** The key in a URL fragment such as "#key=abc", or null. */
export function keyFromHash(hash: string): string | null {
  const key = new URLSearchParams(hash.replace(/^#/, "")).get("key");
  return key && isTeacherKey(key) ? key : null;
}

/** Reads a pasted teacher link. Returns the session code and key, or null if it is not one. */
export function parseTeacherLink(text: string): { code: string; key: string } | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (url.pathname !== "/teacher") return null;
  const code = normaliseCode(url.searchParams.get("code") ?? "");
  const key = keyFromHash(url.hash);
  return code && key ? { code, key } : null;
}
