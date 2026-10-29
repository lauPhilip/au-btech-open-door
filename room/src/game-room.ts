import { Server, type Connection, type ConnectionContext } from "partyserver";
import {
  ask,
  ERROR_TEXT,
  findPlayer,
  isCode,
  join,
  mayRoleSend,
  move,
  newGame,
  parseGameMessage,
  scenarios,
  setOnline,
  setPhase,
  chooseTeam,
  type Game,
  type GameError,
  type GameServerMessage,
  type Minutes,
  type MoveEntry,
  type Result,
  type Role,
} from "@open-door/shared";

/** How long a session lives. After this, everything about it is deleted (issue #7). */
export const SESSION_LIFETIME_MS = 6 * 60 * 60 * 1000;
/** Moves are collected and sent to everyone this often. */
const MOVE_BATCH_MS = 100;
/** Positions are saved at most this often; joins, teams and phases are saved at once. */
const SAVE_POSITIONS_MS = 5000;
/** Connections above this number are refused, so one room cannot be flooded. */
const MAX_CONNECTIONS = 60;
/** Player ids come from the browser: a random id kept per session code. */
export const PLAYER_ID = /^[A-Za-z0-9_-]{8,64}$/;

interface ConnState {
  role: Role;
}

/** What the Worker learns about a session without connecting. */
export interface SessionInfo {
  exists: boolean;
  scenario?: string;
  phase?: Game["phase"];
}

/**
 * One live class session, named by its four-character code.
 * Holds the Game, applies the rules from @open-door/shared and tells everyone what changed.
 * Only the game itself and the teacher key are stored, and an alarm deletes both
 * six hours after the session was created.
 */
export class GameRoom extends Server {
  static options = { hibernate: true };

  private game: Game | null = null;
  private teacherKey: string | null = null;
  private pending = new Map<string, MoveEntry>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private positionsDirty = false;
  private lastPositionSave = 0;

  async onStart(): Promise<void> {
    this.game = (await this.ctx.storage.get<Game>("game")) ?? null;
    this.teacherKey = (await this.ctx.storage.get<string>("teacherKey")) ?? null;
    // Sessions saved before milestone M2 slice 2 have no revealed list.
    if (this.game) this.game.revealed ??= {};
  }

  /** Called by the Worker when a teacher creates a session. False if the code is taken. */
  async setup(scenario: string, minutes: Minutes, teacherKey: string): Promise<boolean> {
    if (this.game || !isCode(this.name) || !scenarios[scenario]) return false;
    const game = newGame(this.name, scenario, minutes, Date.now());
    this.game = game;
    this.teacherKey = teacherKey;
    await this.ctx.storage.put({ game, teacherKey });
    await this.ctx.storage.setAlarm(game.createdAt + SESSION_LIFETIME_MS);
    return true;
  }

  async info(): Promise<SessionInfo> {
    return this.game ? { exists: true, scenario: this.game.scenario, phase: this.game.phase } : { exists: false };
  }

  onConnect(connection: Connection<ConnState>, ctx: ConnectionContext): void {
    if (!this.game) {
      connection.close(4404, "No such session");
      return;
    }
    if (this.connectionCount() > MAX_CONNECTIONS) {
      connection.close(1013, "Session is full");
      return;
    }
    const url = new URL(ctx.request.url);
    const key = url.searchParams.get("key");
    const role: Role =
      key && this.teacherKey && key === this.teacherKey ? "teacher" : url.searchParams.get("role") === "screen" ? "screen" : "player";
    if (role === "player" && !PLAYER_ID.test(connection.id)) {
      connection.close(4400, "Bad player id");
      return;
    }
    connection.setState({ role });
    this.send(connection, { t: "you", id: connection.id, role });
    // A player who comes back is online again straight away; new players appear when they send "join".
    if (role === "player" && findPlayer(this.game, connection.id)) {
      this.game = setOnline(this.game, connection.id, true);
      this.broadcastState();
    } else {
      this.send(connection, { t: "state", game: this.game });
    }
  }

  async onMessage(connection: Connection<ConnState>, raw: string | ArrayBuffer | ArrayBufferView): Promise<void> {
    const game = this.game;
    const role = connection.state?.role;
    if (!game || !role || typeof raw !== "string") return;
    const message = parseGameMessage(raw);
    if (!message) return;
    if (!mayRoleSend(role, message)) {
      this.sendError(connection, "not-allowed");
      return;
    }
    const scenario = scenarios[game.scenario];
    if (!scenario) return;

    switch (message.t) {
      case "join":
        await this.apply(connection, join(game, scenario, connection.id, message.name, message.face, Date.now()));
        break;
      case "team":
        await this.apply(connection, chooseTeam(game, connection.id, message.team));
        break;
      case "ask":
        await this.apply(connection, ask(game, scenario, connection.id, message.person, message.topic));
        break;
      case "phase":
        await this.apply(connection, setPhase(game, message.phase));
        break;
      case "move": {
        const result = move(game, scenario, connection.id, message.x, message.y);
        // Moves arrive many times a second; a refused move is simply dropped.
        if (!result.ok) return;
        const { player, firstVisit } = result.value;
        this.game = result.value.game;
        this.positionsDirty = true;
        if (firstVisit) {
          // A new room changes the team's checklist, so everyone gets the full state.
          this.pending.delete(player.id);
          this.broadcastState();
          await this.savePositions(true);
        } else {
          this.pending.set(player.id, [player.id, player.x, player.y, player.room]);
          this.scheduleFlush();
        }
        break;
      }
    }
  }

  onClose(connection: Connection<ConnState>): void {
    this.leave(connection);
  }

  onError(connection: Connection<ConnState>): void {
    this.leave(connection);
  }

  async onAlarm(): Promise<void> {
    for (const c of this.getConnections()) c.close(4410, "Session ended");
    this.game = null;
    this.teacherKey = null;
    this.pending.clear();
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  private leave(connection: Connection<ConnState>): void {
    if (!this.game || connection.state?.role !== "player") return;
    for (const c of this.getConnections<ConnState>()) {
      if (c !== connection && c.id === connection.id) return; // still open in another tab
    }
    if (!findPlayer(this.game, connection.id)) return;
    this.game = setOnline(this.game, connection.id, false);
    this.broadcastState();
    void this.savePositions(true);
  }

  /** Keep the new game, save it and tell everyone; or tell the sender what went wrong. */
  private async apply(connection: Connection, result: Result<Game>): Promise<void> {
    if (!result.ok) {
      this.sendError(connection, result.error);
      return;
    }
    if (result.value === this.game) return;
    this.game = result.value;
    this.pending.clear();
    this.broadcastState();
    await this.ctx.storage.put("game", this.game);
    this.positionsDirty = false;
    this.lastPositionSave = Date.now();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      if (this.pending.size > 0) {
        this.broadcast(JSON.stringify({ t: "moves", m: [...this.pending.values()] } satisfies GameServerMessage));
        this.pending.clear();
      }
      void this.savePositions(false);
    }, MOVE_BATCH_MS);
  }

  private async savePositions(force: boolean): Promise<void> {
    if (!this.game || !this.positionsDirty) return;
    if (!force && Date.now() - this.lastPositionSave < SAVE_POSITIONS_MS) return;
    this.positionsDirty = false;
    this.lastPositionSave = Date.now();
    await this.ctx.storage.put("game", this.game);
  }

  private broadcastState(): void {
    if (!this.game) return;
    this.broadcast(JSON.stringify({ t: "state", game: this.game } satisfies GameServerMessage));
  }

  private connectionCount(): number {
    let n = 0;
    for (const _ of this.getConnections()) n++;
    return n;
  }

  private sendError(connection: Connection, code: GameError): void {
    this.send(connection, { t: "error", code, text: ERROR_TEXT[code] });
  }

  private send(connection: Connection, message: GameServerMessage): void {
    connection.send(JSON.stringify(message));
  }
}
