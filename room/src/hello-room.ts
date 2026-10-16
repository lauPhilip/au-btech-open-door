import { Server, type Connection } from "partyserver";
import { parseClientMessage, sortPeople, type Person, type ServerMessage } from "@open-door/shared";

/** Connections above this number are refused, so one room cannot be flooded. */
const MAX_PEOPLE = 60;

type PersonState = Omit<Person, "id">;

/**
 * The "hello room" for milestone M1: everyone who opens the page sees everyone
 * else connected live, and each device measures its round-trip time.
 * Nothing is stored; the room forgets everything when the last person leaves.
 */
export class HelloRoom extends Server {
  static options = { hibernate: true };

  onConnect(connection: Connection<PersonState>): void {
    if (this.count() > MAX_PEOPLE) {
      connection.close(1013, "Room is full");
      return;
    }
    this.send(connection, { t: "welcome", you: connection.id, room: this.name });
    this.send(connection, { t: "presence", people: this.people() });
  }

  onMessage(connection: Connection<PersonState>, raw: string | ArrayBuffer | ArrayBufferView): void {
    if (typeof raw !== "string") return;
    const message = parseClientMessage(raw);
    if (!message) return;

    switch (message.t) {
      case "hello":
        connection.setState({
          name: message.name,
          device: message.device,
          reconnects: message.reconnects,
          rtt: connection.state?.rtt ?? null,
          joinedAt: connection.state?.joinedAt ?? Date.now(),
        });
        this.broadcastPresence();
        break;
      case "ping":
        this.send(connection, { t: "pong", n: message.n, sent: message.sent });
        break;
      case "report": {
        const state = connection.state;
        if (!state) return;
        connection.setState({ ...state, rtt: message.rtt });
        this.broadcastPresence();
        break;
      }
    }
  }

  onClose(): void {
    this.broadcastPresence();
  }

  onError(): void {
    this.broadcastPresence();
  }

  private count(): number {
    let n = 0;
    for (const _ of this.getConnections()) n++;
    return n;
  }

  private people(): Person[] {
    const people: Person[] = [];
    for (const c of this.getConnections<PersonState>()) {
      if (c.state) people.push({ id: c.id, ...c.state });
    }
    return sortPeople(people);
  }

  private broadcastPresence(): void {
    this.broadcast(JSON.stringify({ t: "presence", people: this.people() } satisfies ServerMessage));
  }

  private send(connection: Connection, message: ServerMessage): void {
    connection.send(JSON.stringify(message));
  }
}
