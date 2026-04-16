# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build all
bun run build

# Dev (web app on :3000)
bun run dev

# Test all
bun run test

# Lint + fix
bun run lint:fix

# Single test (run from the package directory)
cd packages/cli && bun vitest run src/lib/scanner.test.ts
cd apps/web && bun vitest run path/to/test.test.ts

# Database migrations
cd packages/db && bun run db:generate    # create migration
cd packages/db && bun run db:migrate      # run migrations
cd packages/db && bun run db:studio       # GUI viewer

# CLI build (produces dist/index.js)
cd packages/cli && bun run build

# Docker
docker compose up --build -d web
docker compose logs web -f
```

## Architecture

Turborepo monorepo with Bun workspaces. 4 packages:

- **`apps/web`** — Next.js 16 App Router (React 19, Tailwind v4)
- **`packages/db`** — Drizzle ORM schema + postgres.js client
- **`packages/shared`** — Shared types (`LeaderboardEntry`, `DailyBreakdown`), constants, level system, task classifier
- **`packages/cli`** — Node.js CLI for scanning Claude Code usage and submitting to the server

### Web App Route Structure

Routes live under `app/[lang]/(main)/` and `app/[lang]/(auth)/`. Next.js 16 uses `proxy.ts` (not `middleware.ts`) — the `proxy` export from `auth.ts` provides auth checks via NextAuth's `authorized` callback.

Locale routing: `next-intl` with `createIntlProxy` in `proxy.ts` redirects paths without `/ko/` or `/en/` prefix to `/ko/...`.

Public paths (no auth required): login, `/profile/[username]`, `/team/[teamName]`, `/cli/*`, static assets.

### Auth (auth.ts)

NextAuth v5 with DrizzleAdapter. Google OAuth restricts to `AUTH_GOOGLE_DOMAIN`. On Google login, auto-syncs `department`/`team` from Google Directory via service account (`GOOGLE_SERVICE_ACCOUNT_KEY`). GitHub login links accounts by email.

### Database (packages/db)

Schema files in `packages/db/src/schema/`. Key tables:
- `users` — includes role, level, rate limit fields (fiveHourUsedPct, sevenDayUsedPct)
- `submissions` — aggregated token usage with `dailyBreakdown` JSONB
- `userSessions` — per-session granularity, upserted on `(userId, sessionId)`, includes `toolCounts` and `taskCategories` JSONB
- `apiKeys` — SHA-256 hashed keys for CLI auth

### Leaderboard Aggregation

Users with multiple PCs each submit their own `dailyBreakdown` data. Each PC scans only its local `~/.claude/projects/`, so different PCs have genuinely different sessions. The leaderboard query sums all daily tokens across all submissions per user — no dedup needed.

### Org Unit Sync

Google Workspace `orgUnitPath` is parsed into `team` field as `부 > 팀` format (e.g., `개발사업1부 > 개발2팀`). `department` = 1st segment (사업본부). `그외모음` is treated as null (unassigned). Sync runs on Google login.

### CLI (packages/cli)

Built with esbuild → `dist/index.js`. The scanner (`lib/scanner.ts`) reads `.jsonl` files from `~/.claude/projects/`, parses both `tool_use` and `server_tool_use` (MCP) blocks, classifies turns via CodeBurn-style 13-category classifier, and submits to `/api/submit`. The daemon runs on a 30-min interval.

CLI is distributed as a static file at `public/cli/klic-leaderboard`, served at `/cli/klic-leaderboard`. Install scripts at `public/install.sh` and `public/install.ps1`.

### Submit API Rate Limit

1-hour throttle per user (`lastSubmissionAt` column). Returns 429 if within window.

## Code Style

- Biome: double quotes, semicolons, 2-space indent
- Formatters/linters: `biome check .`
- i18n: Korean (`ko`) is primary locale. All user-facing strings go in `messages/ko.json` and `messages/en.json`
- Server components by default; mark `"use client"` only when needed

## Docker

Production image runs `drizzle-kit migrate` then `server.js`. The `googleapis` package is manually installed in the runner stage because it's dynamically imported and not traced by Next.js standalone output. Runner also manually installs `drizzle-kit`, `drizzle-orm`, and `postgres`.
