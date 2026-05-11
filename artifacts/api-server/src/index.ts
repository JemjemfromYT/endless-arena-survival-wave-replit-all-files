import http from "node:http";
import { matchMaker, Server as ColyseusServer } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import app from "./app";
import { logger } from "./lib/logger";
import { BattleRoom } from "./multiplayer/BattleRoom";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = http.createServer(app);

httpServer.on("upgrade", (req) => {
  if (typeof req.url === "string" && req.url.startsWith("/api")) {
    const stripped = req.url.slice(4);
    req.url = stripped.length === 0 ? "/" : stripped;
  }
});

const transport = new WebSocketTransport({ server: httpServer });
const gameServer = new ColyseusServer({ transport });
gameServer.define("battle_room", BattleRoom);
gameServer.define("battle_room_god", BattleRoom);

app.post("/api/matchmake/:method/:roomName", async (req, res) => {
  try {
    const { method, roomName } = req.params;
    const clientOptions = req.body || {};
    const reservation = (await matchMaker.controller.invokeMethod(
      method,
      roomName,
      clientOptions,
    )) as {
      name?: string;
      roomId?: string;
      processId?: string;
      sessionId?: string;
      room?: unknown;
    };

    const response = reservation.room
      ? reservation
      : {
          room: {
            name: reservation.name,
            roomId: reservation.roomId,
            processId: reservation.processId,
          },
          sessionId: reservation.sessionId,
        };
    res.json(response);
  } catch (e) {
    const err = e as { code?: number; message?: string };
    res
      .status(typeof err.code === "number" ? err.code : 500)
      .json({ code: err.code, error: err.message ?? "matchmaking error" });
  }
});

app.get("/api/matchmake/", (_req, res) => {
  res.json([]);
});

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening (HTTP + Colyseus)");
});
