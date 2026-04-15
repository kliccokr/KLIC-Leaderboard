# KLIC Leaderboard Implementation

**Status:** Completed
**Last updated:** 2026-04-15

---

## Completed Features

### Phase 1: Core Platform (2026-04-09)

- [x] Turborepo monorepo setup (apps/web, packages/db, packages/cli, packages/shared)
- [x] Next.js 16 App Router with `[lang]` locale routing
- [x] Auth.js v5 with Google OAuth (domain-restricted) + GitHub OAuth (email-based linking)
- [x] Drizzle ORM schema: users, submissions, accounts, apiKeys
- [x] Google Workspace Directory sync (department, team from orgUnitPath)
- [x] Leaderboard page with period filter (1d/3d/5d/7d/30d/all)
- [x] Individual + Team ranking tabs
- [x] Level system (10 tiers, token-based progression)
- [x] User profile page with daily token chart, model pie chart
- [x] Settings page for CLI API key management
- [x] CLI scanner: JSONL parsing from `~/.claude/projects/`
- [x] CLI daemon mode (30-min interval)
- [x] Submit API with 1-hour rate limit per user
- [x] Docker Compose deployment (PostgreSQL 17 + Next.js)
- [x] Install scripts (Linux/macOS/WSL/Windows)

### Phase 2: Dashboard & Sessions (2026-04-10~12)

- [x] userSessions table with per-session granularity
- [x] Session upsert on (userId, sessionId)
- [x] My Dashboard page with daily chart, model breakdown, project breakdown
- [x] Team profile page (`/team/[teamName]`) with aggregated stats
- [x] DashboardTabs component (개요, 세션, 프로젝트)
- [x] Period filter for dashboard pages
- [x] Leaderboard deduplication (daily-level MAX across submissions)

### Phase 3: Tool Usage Analytics (2026-04-15)

- [x] CodeBurn-style 13-category task classifier (`packages/shared/src/classifier.ts`)
- [x] CLI scanner: all tool_use + server_tool_use counting
- [x] Turn-level task classification (tool pattern + keyword refinement + conversation fallback)
- [x] DB: toolCounts, taskCategories jsonb columns on userSessions
- [x] Migration: 0009_tool_usage_analytics.sql
- [x] ToolUsageBarChart component (top 10 tools, vertical bar)
- [x] TaskCategoryPieChart component (13 categories, donut chart)
- [x] Integrated into DashboardTabs overview tab
- [x] Aggregation from sessionRows on mydashboard, profile, team pages

---

## Database Migrations

| # | File | Description |
|---|------|-------------|
| 0000 | furry_gertrude_yorkes | Initial schema (users, submissions, accounts) |
| 0001 | wakeful_leader | API keys table |
| 0002 | steady_key_hash_uniqueness | Key hash uniqueness |
| 0003 | user_submission_cooldown | lastSubmissionAt column |
| 0004 | activity_metrics | Commits, PRs, lines added/removed |
| 0005 | user_sessions | Per-session tracking table |
| 0006 | context_metrics | Session context fields |
| 0007 | user_sessions_hostname | Hostname column |
| 0008 | api_key_value | API key value storage |
| 0009 | tool_usage_analytics | toolCounts, taskCategories jsonb columns |

---

## Key Architecture Decisions

1. **dailyBreakdown JSONB** — Per-day token/cost stored as JSON array in submissions. Period filtering done via PostgreSQL JSONB subquery.

2. **Session-level tool/category data** — toolCounts and taskCategories stored on userSessions (not dailyBreakdown). Dashboard aggregates from sessionRows.

3. **Leaderboard deduplication** — Users with multiple PCs create overlapping submissions. Daily-level MAX dedup prevents inflated totals.

4. **Org unit parsing** — Google orgUnitPath parsed to `부 > 팀` format. Department = 1st segment (사업본부). Unassigned users (그외모음) get null.

5. **CLI distribution** — esbuild bundle served as static file at `/cli/klic-leaderboard`. Install scripts auto-detect OS and register daemon.

6. **Next.js 16 proxy.ts** — Uses `createIntlProxy` instead of middleware.ts for auth + i18n routing.

---

## Environment Variables

```env
# Auth
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GOOGLE_DOMAIN=klic.co.kr
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# Database
DATABASE_URL=postgresql://...

# Google Directory
GOOGLE_ADMIN_EMAIL=
GOOGLE_SERVICE_ACCOUNT_KEY=

# App
NEXT_PUBLIC_APP_URL=https://use.klic.co.kr
```
