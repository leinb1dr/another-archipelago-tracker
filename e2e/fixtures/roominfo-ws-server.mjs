/**
 * HTTP + WebSocket server for e2e: GET /health; first frame RoomInfo; Connect → Connected;
 * GetDataPackage → DataPackage; Get → Retrieved (hints + location groups).
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.ROOMINFO_WS_PORT ?? 53087);

const GAME = "Pick Me Game";

const roomInfoPacket = [
  {
    cmd: "RoomInfo",
    password: false,
    games: [GAME],
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

function dataPackageReply() {
  return {
    cmd: "DataPackage",
    data: {
      games: {
        [GAME]: {
          location_name_to_id: {
            "E2E Location Alpha": 100,
            "E2E Location Beta": 101,
          },
          item_name_to_id: {
            "E2E Item": 200,
            "Shared Trinket": 201,
          },
        },
      },
    },
  };
}

/** Matches Archipelago `Retrieved`: `keys` is a dict of requested key → value. */
function retrievedReply(requestedKeys) {
  const hintsKey = "_read_hints_0_1";
  const groupsKey = `_read_location_name_groups_${GAME}`;
  const keys = {};
  if (requestedKeys.includes(hintsKey)) {
    keys[hintsKey] = [
      {
        receiving_player: 1,
        finding_player: 1,
        location: 100,
        item: 200,
        found: 0,
        item_flags: 1,
        status: 30,
      },
      {
        receiving_player: 1,
        finding_player: 1,
        location: 101,
        item: 201,
        found: true,
        status: 0,
      },
    ];
  }
  if (requestedKeys.includes(groupsKey)) {
    keys[groupsKey] = {
      Dungeon: ["E2E Location Alpha"],
      Field: ["E2E Location Beta"],
    };
  }
  return { cmd: "Retrieved", keys };
}

wss.on("connection", (socket) => {
  socket.send(JSON.stringify(roomInfoPacket));

  socket.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (!Array.isArray(data)) return;
      const reply = [];

      for (const p of data) {
        if (!p || typeof p !== "object") continue;
        if (p.cmd === "Connect") {
          const name = typeof p.name === "string" ? p.name : "Player";
          reply.push({
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
            missing_locations: [100],
            checked_locations: [101],
            hint_points: 3,
            slot_info: {
              1: {
                name,
                game: GAME,
                type: 1,
              },
            },
          });
        }
        if (p.cmd === "GetDataPackage") {
          reply.push(dataPackageReply());
        }
        if (p.cmd === "Get" && Array.isArray(p.keys)) {
          reply.push(retrievedReply(p.keys));
        }
      }

      if (reply.length) {
        socket.send(JSON.stringify(reply));
      }
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
