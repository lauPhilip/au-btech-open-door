import { routePartykitRequest } from "partyserver";
import { isCode } from "@open-door/shared";
import { HelloRoom } from "./hello-room";
import { GameRoom, PLAYER_ID } from "./game-room";
import { handleApi } from "./api";
import { limitRequest, originAllowed, withSecurityHeaders, type GuardEnv } from "./guard";

export { HelloRoom, GameRoom };

export interface Env extends GuardEnv {
  HelloRoom: DurableObjectNamespace<HelloRoom>;
  GameRoom: DurableObjectNamespace<GameRoom>;
}

/** Network-test rooms: lower-case letters, digits and dashes, up to 32 characters. */
const HELLO_ROOM_NAME = /^[a-z0-9-]{1,32}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return withSecurityHeaders(await handleApi(request, env));

    // Live rooms: only pages on this site may open a connection, and no one may flood the door.
    if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      if (!originAllowed(request)) return new Response("Forbidden", { status: 403 });
      const refused = await limitRequest(request, "connect", env);
      if (refused) return refused;
    }

    const routed = await routePartykitRequest(request, env as unknown as Record<string, unknown>, {
      onBeforeConnect: (req, { className, name }) => {
        if (className !== "GameRoom") return HELLO_ROOM_NAME.test(name) ? undefined : new Response("Unknown room", { status: 404 });
        // Game rooms only exist for real session codes; the room itself refuses codes nobody created.
        if (!isCode(name)) return new Response("Unknown room", { status: 404 });
        const params = new URL(req.url).searchParams;
        // Players bring their own stable id (the "_pk" parameter); teachers and projectors get a random one.
        const isPlayer = !params.has("key") && params.get("role") !== "screen";
        if (isPlayer && !PLAYER_ID.test(params.get("_pk") ?? "")) return new Response("Bad player id", { status: 400 });
        return undefined;
      },
      // Game rooms are only reached by WebSocket or by the Worker's own RPC calls.
      onBeforeRequest: (_req, { className }) => (className === "GameRoom" ? new Response("Not found", { status: 404 }) : undefined),
    });
    return routed ? withSecurityHeaders(routed) : withSecurityHeaders(new Response("Not found", { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
