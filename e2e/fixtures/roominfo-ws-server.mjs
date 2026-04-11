/**
 * Minimal HTTP + WebSocket server for e2e: GET /health, WebSocket sends one RoomInfo frame.
 * Playwright starts this alongside Vite so tests exercise a real WebSocket (no routeWebSocket mock).
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.ROOMINFO_WS_PORT ?? 53087);

const roomInfoPacket = [
  {
    cmd: "RoomInfo",
    password: false,
    games: ["Integration WS"],
    tags: ["E2E"],
    version: { major: 0, minor: 6, build: 7, class: "Version" },
    generator_version: { major: 0, minor: 6, build: 7, class: "Version" },
    permissions: { release: 6, remaining: 2, collect: 6 },
    hint_cost: 10,
    location_check_points: 1,
    seed_name: "integration-ws-seed",
    time: 1775913966.8457608,
  },
];

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify(roomInfoPacket));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[roominfo-ws-server] http://127.0.0.1:${PORT}/health  ws://127.0.0.1:${PORT}/`,
  );
});
