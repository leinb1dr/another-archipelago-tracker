# Agent notes — Archipelago Tracker

Context for contributors and automated coding agents working in this repository.

## Product

This app is a **tracker** client for Archipelago multiworld sessions: it connects to the same WebSocket server as gameplay clients to observe and display state (for example which locations are checked or remaining). It is not required to hook into a specific game console or emulator.

## Protocol (summary)

Full packet and field documentation lives in the upstream spec:

[Network protocol](https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md)

Notable points:

- Transport is **WebSocket**. Messages are JSON **arrays** of objects; each object has a `cmd` field naming the packet type.
- Typical handshake: connect → server sends `RoomInfo` → client may send `GetDataPackage` → server may send `DataPackage` → client sends `Connect` → server responds with `Connected` or `ConnectionRefused`. The server may retry `Connect` after `ConnectionRefused`.
- **Tracker-oriented server → client packets**: `Connected` includes `missing_locations` and `checked_locations`. `RoomUpdate` may send partial updates to `checked_locations`. `PrintJSON` carries human-readable log/chat-style messages; rendering `data` is enough for display.
- Prefer **per-message compression** for WebSocket messages as described upstream; uncompressed connections are deprecated.

When implementing networking, prefer **typed** packet shapes in dedicated modules and avoid `any` on public APIs.

## UI

Use **Material UI** with the existing `ThemeProvider` and patterns in `src/`. Keep spacing, typography, and components consistent with Material Design unless the product direction changes.

## Third-party libraries

The ecosystem lists [archipelago.js](https://www.npmjs.com/package/archipelago.js) (JavaScript/TypeScript) as a community client for the protocol. Evaluate it when adding a real connection versus a small custom WebSocket layer; either approach is acceptable if the behavior matches the official protocol.

## Connection UI and WebSocket

[`buildArchipelagoWsUrl`](src/connection/buildWsUrl.ts) uses **`wss://`** for non-loopback hosts (public Archipelago servers) and **`ws://`** for loopback (`localhost`, `127.0.0.1`, …) so local tooling can use a plain WebSocket server without TLS. The client opens a browser `WebSocket` and enforces **`CONNECT_TIMEOUT_MS`** (see [`src/connection/connectArchipelago.ts`](src/connection/connectArchipelago.ts)) for the initial handshake—long enough for real TLS to complete. The first text frame must parse as a JSON array containing **`RoomInfo`**. A failed open, transport error, or invalid first message surfaces as **“Could not connect.”**

Playwright starts [`e2e/fixtures/roominfo-ws-server.mjs`](e2e/fixtures/roominfo-ws-server.mjs) alongside Vite; [`e2e/connection.spec.ts`](e2e/connection.spec.ts) connects to **`ws://127.0.0.1:53087`** and asserts the real `RoomInfo` payload (no `routeWebSocket` mock on that path). A separate test uses an unused port to assert the error state.
