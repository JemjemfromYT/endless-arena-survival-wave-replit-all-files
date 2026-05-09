# Endless Arena Survival Wave

A browser-based wave-survival game with single/multiplayer, hero unlocks via PayMongo, leaderboards, and an SP (score-point) system.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/store run dev` — run the game frontend (port 3000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `PAYMONGO_SECRET_KEY` — PayMongo secret key for hero purchases
- Required env: `SESSION_SECRET` — Express session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Colyseus (multiplayer WebSockets)
- DB: PostgreSQL + Drizzle ORM
- Frontend: Vite (static HTML/JS game, no React framework)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)
- Payments: PayMongo Links API

## Where things live

- `artifacts/store/public/game/` — all game files (index.html, game.js, heroes-dlc.js, config.js, images/, sounds/)
- `artifacts/api-server/src/routes/` — API routes: profile, heroes, leaderboard, sp
- `artifacts/api-server/src/multiplayer/BattleRoom.ts` — Colyseus multiplayer room
- `lib/db/src/schema/index.ts` — DB schema (profiles, hero_unlocks, pending_payments, leaderboard)
- `www.tar.gz` — packaged game files for APK/Capacitor builds (regenerate by copying `artifacts/store/public/game/` → `www/` and archiving)

## Architecture decisions

- Game is a static HTML5 canvas app served by Vite — no React, no bundler for game code itself.
- API server runs on port 8080 (`/api/*`), game frontend on port 3000 (`/`), reverse-proxied at root.
- PayMongo payment flow: checkout creates a PayMongo Link, `/api/heroes/unlock` polls PayMongo to verify payment before granting the hero.
- Colyseus runs inside the same Express server on `/colyseus` path.
- Admin accounts (array in `profile.ts`) auto-receive all CPK hero unlocks on every login — no purchase needed.

## Product

- Single-player wave survival with 5+ heroes (some free, some purchasable via PayMongo)
- Multiplayer co-op rooms via Colyseus WebSockets
- Leaderboard persisted in Postgres
- SP (score points) accumulated across runs
- Mobile-friendly controls: drag-fire joystick, auto-aim mode, tap-attack button

## User preferences

- Username "Jem" is an admin account — auto-unlocks all CPK heroes on login.
- `www.tar.gz` at workspace root should be kept up to date for Capacitor APK conversion.

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes before restarting the API server.
- `www.tar.gz` must be regenerated manually after game file edits (`cp -r artifacts/store/public/game www && tar -czf www.tar.gz www && rm -rf www`).
- Colyseus port is shared with Express — do NOT add a separate Colyseus workflow.
- Auto-aim mode sets `touch.attack = true` automatically when an enemy is in range (game.js ~line 1884).
- Login/Create buttons are inside `#menu .ns-menu-icons` — never add `display:none` to that class inside the landscape media query.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
