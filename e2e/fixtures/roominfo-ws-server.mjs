/**
 * HTTP + WebSocket server for e2e: GET /health; first frame RoomInfo; on Connect, reply Connected.
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.ROOMINFO_WS_PORT ?? 53087);

const roomInfoPacket = [
  {
    cmd: "RoomInfo",
    password: false,
    games: ["Pick Me Game"],
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

  socket.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (!Array.isArray(data)) return;
      const connect = data.find((p) => p?.cmd === "Connect");
      if (!connect) return;
      const name = typeof connect.name === "string" ? connect.name : "Player";
      const connected = [
        {
          cmd: "Connected",
          team: 0,
          slot: 1,
          players: [
            {
              team: 0,
              slot: 1,
              alias: name,
              name,
              class: "NetworkPlayer",
            },
          ],
          missing_locations: [],
          checked_locations: [],
          hint_points: 0,
        },
      ];
      socket.send(JSON.stringify(connected));
    } catch {
      /* ignore */
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[roominfo-ws-server] http://127.0.0.1:${PORT}/health  ws://127.0.0.1:${PORT}/`,
  );
});
