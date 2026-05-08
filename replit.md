# Endless Arena

A neon cyberpunk top-down survival arena with hero classes, real-time multiplayer lobbies, a reality-bending Fracture system, PayMongo hero purchases, and a 10-phase cinematic God Mode boss gauntlet.

## Run & Operate

- `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/store run dev` — run the game frontend (port 3000)
- `pnpm --filter @workspace/api-server run dev` — run the API + Colyseus multiplayer server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `PAYMONGO_SECRET_KEY` — PayMongo secret key for hero purchases

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, served at `/`
- Game: Vanilla JS canvas game at `/game/index.html`
- API: Express 5 + Colyseus (multiplayer WebSockets)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)
- Payments: PayMongo (hero unlocks, ₱29/hero)

## Where things live

- `artifacts/store/` — React Vite app (store/payment pages) + game files
- `artifacts/store/public/game/` — The actual game (index.html, game.js, heroes-dlc.js, config.js)
- `artifacts/store/public/game/config.js` — Set `BACKEND_URL` here when hosting frontend externally
- `artifacts/api-server/` — Express + Colyseus backend
- `artifacts/api-server/src/routes/` — API routes (profile, heroes, leaderboard, sp)
- `artifacts/api-server/src/multiplayer/BattleRoom.ts` — Colyseus multiplayer room
- `lib/db/src/schema/index.ts` — Database schema (profiles, hero_unlocks, pending_payments, leaderboard)

## Architecture decisions

- Frontend game is served as static files from `public/game/` — no bundling needed for the game itself
- Colyseus multiplayer runs on the same HTTP server as Express (shared port 8080)
- PayMongo payment flow: checkout creates a payment link → player pays → `/api/heroes/unlock` verifies via PayMongo API
- Hero unlocks are server-side per profile (name + PIN auth) — not just localStorage
- `window.BACKEND_URL = ''` in config.js means everything is on Replit (no external backend needed)

## Product

- 16 heroes total: 10 free (JSquad), 6 paid CPK heroes (₱29 each via PayMongo)
- Modes: Classic (solo), God Mode (boss gauntlet), Multiplayer (Colyseus rooms, up to 8 players)
- Username "Jem" gets all heroes unlocked automatically on login
- Mobile-first with touch controls: auto-aim, manual aim, drag-fire modes

## User preferences

- Mobile fullscreen via Fullscreen API + screen.orientation.lock('landscape') on first touch
- Aim settings icon moved to left side (top: 52px, left: 14px) so it never covers LEAVE button
- Action buttons (SKILL, Q, DASH, FIRE) stack upward from bottom-right

## Gotchas

- API server must be running for hero purchases and multiplayer to work
- After any backend change: `pnpm --filter @workspace/api-server run dev` rebuilds + restarts
- `PAYMONGO_SECRET_KEY` must be set for checkout/unlock to work
- The game's `<base href="/game/">` means all asset paths are relative to /game/

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
