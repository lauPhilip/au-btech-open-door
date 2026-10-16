// Small helpers for the eduroam test: latency statistics.

/** Value at the given percentile (0–100) of a list of numbers, or null for an empty list. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank] ?? null;
}

export function median(values: number[]): number | null {
  return percentile(values, 50);
}

/** Keeps the most recent round-trip times for one client. */
export class RttWindow {
  private readonly samples: number[] = [];

  constructor(private readonly size = 15) {}

  add(rtt: number): void {
    this.samples.push(rtt);
    if (this.samples.length > this.size) this.samples.shift();
  }

  get median(): number | null {
    return median(this.samples);
  }

  get count(): number {
    return this.samples.length;
  }
}

export interface RoomSummary {
  people: number;
  medianRtt: number | null;
  p95Rtt: number | null;
  maxRtt: number | null;
  under400: number;
  reconnects: number;
}

/** Summarise a room for the test record. */
export function summarise(rtts: Array<number | null>, reconnects: number[]): RoomSummary {
  const measured = rtts.filter((r): r is number => r !== null);
  return {
    people: rtts.length,
    medianRtt: median(measured),
    p95Rtt: percentile(measured, 95),
    maxRtt: measured.length ? Math.max(...measured) : null,
    under400: measured.filter((r) => r < 400).length,
    reconnects: reconnects.reduce((a, b) => a + b, 0),
  };
}
