// A pausable countdown that every device can read from the same few numbers.
// The room stores the timer; screens work out how much is left from the room's clock.

export interface Timer {
  /** Room clock (ms) when the timer started. */
  startedAt: number;
  /** Room clock when it was paused, or null while it runs. */
  pausedAt: number | null;
  /** Total time spent paused before now. */
  pausedMs: number;
  /** Extra time the teacher added. */
  bonusMs: number;
  durationMs: number;
}

export function newTimer(now: number, durationMs: number): Timer {
  return { startedAt: now, pausedAt: null, pausedMs: 0, bonusMs: 0, durationMs };
}

export const isPaused = (t: Timer): boolean => t.pausedAt !== null;

/** Running time so far, not counting pauses. */
export function elapsedMs(t: Timer, now: number): number {
  return Math.max(0, (t.pausedAt ?? now) - t.startedAt - t.pausedMs);
}

export const totalMs = (t: Timer): number => t.durationMs + t.bonusMs;

export function leftMs(t: Timer, now: number): number {
  return Math.max(0, totalMs(t) - elapsedMs(t, now));
}

export function pauseTimer(t: Timer, now: number): Timer {
  return t.pausedAt === null ? { ...t, pausedAt: now } : t;
}

export function resumeTimer(t: Timer, now: number): Timer {
  return t.pausedAt === null ? t : { ...t, pausedAt: null, pausedMs: t.pausedMs + Math.max(0, now - t.pausedAt) };
}

export function addTime(t: Timer, ms: number): Timer {
  return { ...t, bonusMs: t.bonusMs + ms };
}

/** "12:05" for 725 seconds. Rounds up, so a timer never shows 0:00 while time is left. */
export function formatLeft(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
