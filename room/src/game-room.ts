import { Server, type Connection, type ConnectionContext } from "partyserver";
import {
  addNote,
  adjustTimer,
  assignTeam,
  removePlayer,
  renamePlayer,
  castVote,
  sendHint,
  setReady,
  gradeAll,
  setPrompt,
  TEAMS,
  ask,
  mergeNotes,
  removeNote,
  setShared,
  shareAll,
  visibleNotes,
  type Note,
  ERROR_TEXT,
  findPlayer,
  isCode,
  LIMITS,
  RateLimiter,
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

/** Messages per connection per second; extra ones are dropped, and a connection that keeps flooding is closed. */
const messageRate = new RateLimiter(LIMITS.messagesPerSecond, 1000);
const floodDrops = new Map<string, number>();

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
  /** All sticky notes. Each goes only to its author's connections until sharing exists (issue #23). */
  private notes: Note[] = [];
  private teacherKey: string | null = null;
  private pending = new Map<string, MoveEntry>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private positionsDirty = false;
  private lastPositionSave = 0;

  async onStart(): Promise<void> {
    this.game = (await this.ctx.storage.get<Game>("game")) ?? null;
    this.teacherKey = (await this.ctx.storage.get<string>("teacherKey")) ?? null;
    // Sessions saved before milestone M2 slice 2 have no revealed list.
    if (this.game) {
      this.game.revealed ??= {};
      this.game.votes ??= {};
      this.game.results ??= {};
      this.game.noteCounts ??= {};
      this.game.hints ??= {};
      this.game.ready ??= {};
      this.game.removed ??= [];
      this.game.prompt ??= 0;
      this.game.clues ??= {};
      this.game.timer ??= null;
    }
    this.notes = (await this.ctx.storage.get<Note[]>("notes")) ?? [];
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
    if (role === "player" && this.game.removed.includes(connection.id)) {
      connection.close(4403, "Removed");
      return;
    }
    connection.setState({ role });
    this.send(connection, { t: "you", id: connection.id, role });
    if (role === "player") this.send(connection, { t: "notes", notes: visibleNotes(this.notes, this.game, connection.id) });
    // A player who comes back is online again straight away; new players appear when they send "join".
    if (role === "player" && findPlayer(this.game, connection.id)) {
      this.game = setOnline(this.game, connection.id, true);
      this.broadcastState();
    } else {
      this.send(connection, { t: "state", game: this.game, now: Date.now() });
    }
  }

  async onMessage(connection: Connection<ConnState>, raw: string | ArrayBuffer | ArrayBufferView): Promise<void> {
    const game = this.game;
    const role = connection.state?.role;
    if (!game || !role || typeof raw !== "string") return;
    if (!messageRate.hit(`${this.name}:${connection.id}`, Date.now()).ok) {
      const drops = (floodDrops.get(connection.id) ?? 0) + 1;
      floodDrops.set(connection.id, drops);
      if (drops > LIMITS.floodDropsBeforeClose) connection.close(1008, "Too many messages");
      return;
    }
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
      case "note": {
        const { t: _t, ...input } = message;
        const result = addNote(this.notes, game, scenario, connection.id, input, crypto.randomUUID().slice(0, 8), Date.now());
        await this.applyNotes(connection, result);
        break;
      }
      case "unnote":
        await this.applyNotes(connection, removeNote(this.notes, connection.id, message.id));
        break;
      case "share":
        await this.applyNotes(connection, setShared(this.notes, connection.id, message.id, message.shared));
        break;
      case "merge":
        await this.applyNotes(connection, mergeNotes(this.notes, game, connection.id, message.keep, message.drop));
        break;
      case "phase": {
        const result = setPhase(game, message.phase, { scenario, now: Date.now() });
        // The debrief grades every team's notes against the answer key once, so the projector can show the table.
        if (result.ok && message.phase === "debrief") {
          const results: Game["results"] = {};
          for (const t of TEAMS) if (result.value.players.some((p) => p.team === t.id)) results[t.id] = gradeAll(scenario, this.notes, t.id);
          result.value = { ...result.value, results, prompt: 0 };
        }
        await this.apply(connection, result);
        // Everything written so far becomes the team's, when the day starts (concept book, board 04).
        if (result.ok && (message.phase === "day" || message.phase === "vote" || message.phase === "debrief")) {
          this.notes = shareAll(this.notes);
          await this.ctx.storage.put("notes", this.notes);
          this.sendNotesToPlayers();
        }
        break;
      }
      case "summary":
        this.send(connection, { t: "summary", notes: this.notes });
        break;
      case "close":
        // The teacher ends the session now: delete everything and tell every screen.
        await this.onAlarm();
        break;
      case "assign":
        await this.apply(connection, assignTeam(game, message.player, message.team));
        break;
      case "remove": {
        const result = removePlayer(game, message.player);
        await this.apply(connection, result);
        if (!result.ok) break;
        // Their notes go with them, and every screen of theirs is told why.
        this.notes = this.notes.filter((n) => n.author !== message.player);
        await this.ctx.storage.put("notes", this.notes);
        this.sendNotesToPlayers();
        await this.countNotes();
        for (const c of this.getConnections<ConnState>()) if (c.id === message.player) c.close(4403, "Removed");
        break;
      }
      case "rename":
        await this.apply(connection, renamePlayer(game, message.player, message.name));
        break;
      case "hint":
        await this.apply(connection, sendHint(game, message.team, message.text, Date.now()));
        break;
      case "prompt":
        await this.apply(connection, setPrompt(game, scenario, message.index));
        break;
      case "vote":
        await this.apply(connection, castVote(game, scenario, connection.id, message.option));
        break;
      case "ready":
        await this.apply(connection, setReady(game, connection.id, message.ready, Date.now()));
        break;
      case "timer":
        await this.apply(connection, adjustTimer(game, message.action, Date.now()));
        break;
      case "move": {
        const result = move(game, scenario, connection.id, message.x, message.y);
        // Moves arrive many times a second; a refused move is simply dropped.
        if (!result.ok) return;
        const { player, firstVisit, newClue } = result.value;
        this.game = result.value.game;
        this.positionsDirty = true;
        if (firstVisit || newClue) {
          // A new room or a new clue changes what the team sees, so everyone gets the full state.
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
    floodDrops.delete(connection.id);
    messageRate.forget(`${this.name}:${connection.id}`);
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
    this.notes = [];
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

  /** Keep the new notes, save them and show each player their own and their team's shared notes. */
  private async applyNotes(connection: Connection, result: { ok: true; value: Note[] } | { ok: false; error: GameError }): Promise<void> {
    if (!result.ok) {
      this.sendError(connection, result.error);
      return;
    }
    this.notes = result.value;
    await this.ctx.storage.put("notes", this.notes);
    this.sendNotesToPlayers();
    await this.countNotes();
  }

  /** Keep a count of notes per team in the game, so the teacher's overview can show who is working. */
  private async countNotes(): Promise<void> {
    if (!this.game) return;
    const counts: Game["noteCounts"] = {};
    for (const n of this.notes) counts[n.team] = (counts[n.team] ?? 0) + 1;
    if (JSON.stringify(counts) === JSON.stringify(this.game.noteCounts)) return;
    this.game = { ...this.game, noteCounts: counts };
    this.broadcastState();
    await this.ctx.storage.put("game", this.game);
  }

  private sendNotesToPlayers(): void {
    if (!this.game) return;
    for (const c of this.getConnections<ConnState>()) {
      if (c.state?.role === "player") this.send(c, { t: "notes", notes: visibleNotes(this.notes, this.game, c.id) });
    }
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
    this.broadcast(JSON.stringify({ t: "state", game: this.game, now: Date.now() } satisfies GameServerMessage));
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
