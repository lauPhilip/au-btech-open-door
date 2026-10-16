import { PartySocket } from "partysocket";
import { deviceFromUserAgent, RttWindow, type ClientMessage, type Person, type ServerMessage } from "@open-door/shared";

export type Status = "connecting" | "connected" | "reconnecting";

const PING_EVERY_MS = 2000;
const REPORT_EVERY_PINGS = 3;

/**
 * One live connection to a session room.
 * A student connection says hello and appears in the room;
 * a projector connection only watches.
 */
export class RoomConnection {
  status = $state<Status>("connecting");
  people = $state<Person[]>([]);
  you = $state<string | null>(null);
  rtt = $state<number | null>(null);
  reconnects = $state(0);

  private socket: PartySocket;
  private window = new RttWindow();
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private pingCount = 0;
  private openedOnce = false;

  constructor(
    room: string,
    private readonly name: string | null,
  ) {
    // Same host as the page: in production one Worker serves both the app and the rooms,
    // in development Vite proxies /parties to wrangler.
    this.socket = new PartySocket({ host: window.location.host, party: "hello-room", room });
    this.socket.addEventListener("open", this.onOpen);
    this.socket.addEventListener("close", this.onClose);
    this.socket.addEventListener("message", this.onMessage);
  }

  private onOpen = () => {
    if (this.openedOnce) this.reconnects++;
    this.openedOnce = true;
    this.status = "connected";
    if (this.name !== null) {
      this.send({ t: "hello", name: this.name, device: deviceFromUserAgent(navigator.userAgent), reconnects: this.reconnects });
    }
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(this.ping, PING_EVERY_MS);
    this.ping();
  };

  private onClose = () => {
    this.status = this.openedOnce ? "reconnecting" : "connecting";
    clearInterval(this.pingTimer);
  };

  private onMessage = (event: MessageEvent) => {
    let message: ServerMessage;
    try {
      message = JSON.parse(String(event.data)) as ServerMessage;
    } catch {
      return;
    }
    switch (message.t) {
      case "welcome":
        this.you = message.you;
        break;
      case "presence":
        this.people = message.people;
        break;
      case "pong": {
        this.window.add(performance.now() - message.sent);
        this.rtt = this.window.median === null ? null : Math.round(this.window.median);
        if (this.name !== null && this.rtt !== null && message.n % REPORT_EVERY_PINGS === 0) {
          this.send({ t: "report", rtt: this.rtt });
        }
        break;
      }
    }
  };

  private ping = () => {
    this.send({ t: "ping", n: ++this.pingCount, sent: performance.now() });
  };

  private send(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  close(): void {
    clearInterval(this.pingTimer);
    this.socket.close();
  }
}

/** Read a value from localStorage, which can be unavailable in private windows. */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the name is just not remembered */
  }
}
