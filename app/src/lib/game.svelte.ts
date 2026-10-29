import { PartySocket } from "partysocket";
import type { Game, GameClientMessage, Note, NoteInput, GameServerMessage, Phase, Role, TeamId } from "@open-door/shared";
import type { Status } from "./room.svelte";

/** How the connection identifies itself: a player with a stable id, the teacher with a key, or the projector. */
export type Who = { as: "player"; id: string } | { as: "teacher"; key: string } | { as: "screen" };

/**
 * One live connection to a game room.
 * Keeps the latest game state, applies batched moves, and remembers the last error.
 */
export class GameConnection {
  status = $state<Status>("connecting");
  game = $state<Game | null>(null);
  role = $state<Role | null>(null);
  you = $state<string | null>(null);
  /** The last error from the room, in plain language. Cleared after a few seconds. */
  error = $state<string | null>(null);
  /** Your own sticky notes plus the notes your team shared, as the room last sent them. */
  notes = $state<Note[]>([]);
  /** True when the room closed the connection for good (no session, or it ended). */
  ended = $state(false);

  private socket: PartySocket;
  private openedOnce = false;
  private errorTimer: ReturnType<typeof setTimeout> | undefined;
  /** Sent again after every reconnect, so a player who drops comes back as themselves. */
  private onOpenMessage: GameClientMessage | null = null;

  constructor(code: string, who: Who) {
    const query: Record<string, string> = who.as === "teacher" ? { key: who.key } : who.as === "screen" ? { role: "screen" } : {};
    this.socket = new PartySocket({
      host: window.location.host,
      party: "game-room",
      room: code,
      query,
      ...(who.as === "player" ? { id: who.id } : {}),
    });
    this.socket.addEventListener("open", this.handleOpen);
    this.socket.addEventListener("close", this.handleClose);
    this.socket.addEventListener("message", this.handleMessage);
  }

  /** Join (or re-join) as a player. Repeated automatically after reconnects. */
  join(name: string, face: number): void {
    this.onOpenMessage = { t: "join", name, face };
    this.send(this.onOpenMessage);
  }

  chooseTeam(team: TeamId): void {
    this.send({ t: "team", team });
  }

  move(x: number, y: number): void {
    this.send({ t: "move", x: Math.round(x), y: Math.round(y) });
  }

  /** Ask a person one of their questions; the room records which assets the team has found. */
  ask(person: string, topic: number): void {
    this.send({ t: "ask", person, topic });
  }

  addNote(input: NoteInput): void {
    this.send({ t: "note", ...input });
  }

  /** Show your note to your team (or take it back). */
  shareNote(id: string, shared: boolean): void {
    this.send({ t: "share", id, shared });
  }

  /** Merge two shared team notes into the first one. */
  mergeNotes(keep: string, drop: string): void {
    this.send({ t: "merge", keep, drop });
  }

  removeNote(id: string): void {
    this.send({ t: "unnote", id });
  }

  setPhase(phase: Phase): void {
    this.send({ t: "phase", phase });
  }

  close(): void {
    clearTimeout(this.errorTimer);
    this.socket.close();
  }

  private handleOpen = () => {
    this.openedOnce = true;
    this.status = "connected";
    if (this.onOpenMessage) this.send(this.onOpenMessage);
  };

  private handleClose = (event: CloseEvent) => {
    // 4404: no such session. 4410: the session ended and was deleted. Stop retrying.
    if (event.code === 4404 || event.code === 4410) {
      this.ended = true;
      this.socket.close();
      return;
    }
    this.status = this.openedOnce ? "reconnecting" : "connecting";
  };

  private handleMessage = (event: MessageEvent) => {
    let message: GameServerMessage;
    try {
      message = JSON.parse(String(event.data)) as GameServerMessage;
    } catch {
      return;
    }
    switch (message.t) {
      case "you":
        this.you = message.id;
        this.role = message.role;
        break;
      case "state":
        this.game = message.game;
        break;
      case "notes":
        this.notes = message.notes;
        break;
      case "moves": {
        if (!this.game) return;
        const byId = new Map(message.m.map((entry) => [entry[0], entry]));
        for (const p of this.game.players) {
          const entry = byId.get(p.id);
          if (entry) {
            p.x = entry[1];
            p.y = entry[2];
            p.room = entry[3];
          }
        }
        break;
      }
      case "error":
        this.error = message.text;
        clearTimeout(this.errorTimer);
        this.errorTimer = setTimeout(() => (this.error = null), 4000);
        break;
    }
  };

  private send(message: GameClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }
}
