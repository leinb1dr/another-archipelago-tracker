/**
 * HTTP + WebSocket server for e2e: GET /health; first frame RoomInfo; Connect → Connected;
 * GetDataPackage → DataPackage; Get → Retrieved (hints + location groups).
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.ROOMINFO_WS_PORT ?? 53087);

const GAME_A = "Pick Me Game";
const GAME_B = "Second Quest";

const roomInfoPacket = [
  {
    cmd: "RoomInfo",
    password: false,
    games: [GAME_A, GAME_B],
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
        [GAME_A]: {
          location_name_to_id: {
            "E2E Location Alpha": 100,
            "E2E Location Beta": 101,
            "E2E Scout Target": 102,
          },
          item_name_to_id: {
            "E2E Item": 200,
            "Shared Trinket": 201,
          },
        },
        [GAME_B]: {
          location_name_to_id: {
            "SQ Location One": 300,
            "SQ Location Two": 301,
          },
          item_name_to_id: {
            "SQ Item": 400,
          },
        },
      },
    },
  };
}

/** Matches Archipelago `Retrieved`: `keys` is a dict of requested key → value. */
function retrievedReply(requestedKeys) {
  const keys = {};
  if (requestedKeys.includes("_read_hints_0_1")) {
    keys["_read_hints_0_1"] = [
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
  if (requestedKeys.includes("_read_hints_0_2")) {
    keys["_read_hints_0_2"] = [
      {
        receiving_player: 2,
        finding_player: 2,
        location: 300,
        item: 400,
        found: 0,
        item_flags: 1,
        status: 20,
      },
    ];
  }
  if (requestedKeys.includes(`_read_location_name_groups_${GAME_A}`)) {
    keys[`_read_location_name_groups_${GAME_A}`] = {
      Dungeon: ["E2E Location Alpha", "E2E Scout Target"],
      Field: ["E2E Location Beta"],
    };
  }
  if (requestedKeys.includes(`_read_location_name_groups_${GAME_B}`)) {
    keys[`_read_location_name_groups_${GAME_B}`] = {
      Area: ["SQ Location One", "SQ Location Two"],
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

      let connectJustHandled = false;
      for (const p of data) {
        if (!p || typeof p !== "object") continue;
        if (p.cmd === "Connect") {
          connectJustHandled = true;
          const name = typeof p.name === "string" ? p.name : "Player";
          const slot = p.game === GAME_B ? 2 : 1;
          const game = slot === 2 ? GAME_B : GAME_A;
          const missing_locations = slot === 2 ? [300] : [100, 102];
          const checked_locations = slot === 2 ? [301] : [101];
          reply.push({
            cmd: "Connected",
            team: 0,
            slot,
            players: [
              {
                team: 0,
                slot: 1,
                alias: "Dandoku",
                name: "Dandoku",
                class: "NetworkPlayer",
              },
              {
                team: 0,
                slot: 2,
                alias: "Ranger",
                name: "Ranger",
                class: "NetworkPlayer",
              },
            ],
            missing_locations,
            checked_locations,
            hint_points: 3,
            slot_info: {
              1: {
                name: "Dandoku",
                game: GAME_A,
                type: 1,
              },
              2: { name: "Ranger", game: GAME_B, type: 1 },
            },
          });
        }
        if (p.cmd === "GetDataPackage") {
          reply.push(dataPackageReply());
        }
        if (p.cmd === "Get" && Array.isArray(p.keys)) {
          reply.push(retrievedReply(p.keys));
        }
        if (p.cmd === "LocationScouts" && Array.isArray(p.locations)) {
          reply.push({
            cmd: "LocationInfo",
            locations: p.locations.map((locId) => ({
              item: 200,
              location: locId,
              player: 1,
              flags: 1,
            })),
          });
        }
      }

      if (reply.length) {
        socket.send(JSON.stringify(reply));
      }
      if (connectJustHandled) {
        const receivedItemsPacket = [
          {
            cmd: "ReceivedItems",
            index: 0,
            items: [
              {
                item: data.some((p) => p?.game === GAME_B) ? 400 : 201,
                location: data.some((p) => p?.game === GAME_B) ? 300 : 100,
                player: data.some((p) => p?.game === GAME_B) ? 2 : 1,
                flags: 0,
              },
            ],
          },
        ];
        setTimeout(() => {
          try {
            socket.send(JSON.stringify(receivedItemsPacket));
          } catch {
            /* ignore */
          }
        }, 50);
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
