// A tiny router for the four entry points:
//   /                 student: type a code
//   /j/CODE           student: join this session (the QR code points here)
//   /teacher          teacher: create and run a session
//   /screen/CODE      projector for the class
//   /network-test     the hello room from milestone M1

import { normaliseCode } from "@open-door/shared";

export type Route =
  | { view: "student"; code: string | null }
  | { view: "teacher"; code: string | null }
  | { view: "screen"; code: string }
  | { view: "network-test" }
  | { view: "not-found" };

export function parseRoute(url: URL): Route {
  const parts = url.pathname.split("/").filter(Boolean);
  const [first, second] = parts;
  if (parts.length === 0) return { view: "student", code: null };
  if (first === "j" && second && parts.length === 2) return { view: "student", code: normaliseCode(second) };
  if (first === "teacher" && parts.length === 1) return { view: "teacher", code: normaliseCode(url.searchParams.get("code") ?? "") };
  if (first === "screen" && second && parts.length === 2) {
    const code = normaliseCode(second);
    return code ? { view: "screen", code } : { view: "not-found" };
  }
  if (first === "network-test" && parts.length === 1) return { view: "network-test" };
  return { view: "not-found" };
}

class Router {
  route = $state<Route>(parseRoute(new URL(window.location.href)));

  constructor() {
    window.addEventListener("popstate", () => (this.route = parseRoute(new URL(window.location.href))));
  }

  /** Go to a path inside the app without reloading. */
  go(path: string, replace = false): void {
    if (replace) history.replaceState(null, "", path);
    else history.pushState(null, "", path);
    this.route = parseRoute(new URL(window.location.href));
  }
}

export const router = new Router();
