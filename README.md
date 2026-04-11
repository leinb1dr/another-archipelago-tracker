# Archipelago Tracker

Web client for connecting to an [Archipelago](https://github.com/ArchipelagoMW/Archipelago) multiworld server as a **tracker**: observe session state (for example checked and remaining locations) without driving in-game automation.

## Stack

- [TypeScript](https://www.typescriptlang.org/)
- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Material UI](https://mui.com/) (Material Design)

## Protocol

Archipelago uses a WebSocket protocol with JSON command packets. The authoritative specification is in the upstream repository:

[Network protocol (Archipelago docs)](https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md)

## Prerequisites

- [Node.js](https://nodejs.org/) (current LTS recommended)

## Scripts

```bash
npm install
npm run dev
```

- `npm run dev` — start the Vite dev server.
- `npm run build` — typecheck and production build.
- `npm run preview` — serve the production build locally.

## Testing

End-to-end tests use [Playwright](https://playwright.dev/). Install browsers once (Chromium is enough for the default project):

```bash
npx playwright install chromium
```

Run the suite (starts the Vite dev server and a small local WebSocket server that sends `RoomInfo`, so connection tests hit a real WebSocket):

```bash
npm run test:e2e
```

Use `npm run test:e2e:ui` for the Playwright UI mode while debugging.

## Current scope

Bootstrap only: Material-themed shell and project layout. WebSocket connection, authentication, and tracker views are planned follow-up work.

## License

To be determined.
