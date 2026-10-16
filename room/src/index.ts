import { routePartykitRequest } from "partyserver";
import { HelloRoom } from "./hello-room";

export { HelloRoom };

export interface Env {
  HelloRoom: DurableObjectNamespace<HelloRoom>;
}

/** Room names: lower-case letters, digits and dashes, up to 32 characters. */
const ROOM_NAME = /^[a-z0-9-]{1,32}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const routed = await routePartykitRequest(request, env as unknown as Record<string, unknown>, {
      onBeforeConnect: (_req, { name }) => {
        if (!ROOM_NAME.test(name)) return new Response("Unknown room", { status: 404 });
        return undefined;
      },
    });
    return routed ?? new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
