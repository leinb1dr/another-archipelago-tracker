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

## Bootstrap scope

Initial commits intentionally omit live WebSocket logic and full tracker UI. Add those in focused changes with clear connection and state-management boundaries.
