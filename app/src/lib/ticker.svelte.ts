/** A value that follows the room's clock, updated twice a second, for countdowns and the game clock. */
export class Ticker {
  now = $state(0);
  private handle: ReturnType<typeof setInterval>;

  constructor(private readonly read: () => number, everyMs = 500) {
    this.now = read();
    this.handle = setInterval(() => (this.now = this.read()), everyMs);
  }

  stop(): void {
    clearInterval(this.handle);
  }
}
