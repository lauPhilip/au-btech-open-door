/** Plain-language label for a round-trip time, always shown with the number. */
export function latencyLabel(rtt: number | null): { text: string; tone: "good" | "ok" | "slow" | "none" } {
  if (rtt === null) return { text: "Measuring…", tone: "none" };
  if (rtt < 150) return { text: `Fast · ${rtt} ms`, tone: "good" };
  if (rtt < 400) return { text: `Good · ${rtt} ms`, tone: "ok" };
  return { text: `Slow · ${rtt} ms`, tone: "slow" };
}

/** Room name from the address bar, e.g. ?room=herning-1. Defaults to "hello". */
export function roomFromUrl(url: URL): string {
  const room = (url.searchParams.get("room") ?? "hello").toLowerCase();
  return /^[a-z0-9-]{1,32}$/.test(room) ? room : "hello";
}
