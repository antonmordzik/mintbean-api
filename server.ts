import {
  WebSocket,
  WebSocketServer,
} from "https://deno.land/x/websocket/mod.ts";
import {
  Application,
} from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { parseMessage } from "./src/services/messages/parser.ts";
import Body from "./src/interfaces/Body.ts";
import config from "./src/config.ts";
import router from "./src/router.ts";
import { handleMessage } from "./src/services/handler.ts";
import { Online } from "./src/services/online.ts";

const online = new Online();
const wss = new WebSocketServer(parseInt(config.WS_PORT));
console.log("Web Socket server start on port " + config.WS_PORT);

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", async (message: string) => {
    const [type, user, body] = await parseMessage<Body>(message);
    handleMessage(type, body, {
      user,
      ws,
      online
    });
  });
});

const app = new Application();
app.use(oakCors({ credentials: true, origin: true }));
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Deno server start on port " + config.API_PORT);
await app.listen(`0.0.0.0:${config.API_PORT}`);
