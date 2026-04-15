# KLIC Leaderboard Design

**Project:** 케이엘정보통신 (KLIC) 사내 Claude Code 사용량 추적 리더보드
**Date:** 2026-04-15

---

## Overview

KLIC 내부 직원들의 Claude Code 토큰 사용량을 추적하고 시각화하는 사내 전용 리더보드. 온프레미스 Docker 배포.

---

## Tech Stack

| Area | Choice |
|------|--------|
| Runtime | Bun |
| Framework | Next.js 16 App Router (React 19) |
| Auth | Auth.js v5 + Google/GitHub OAuth |
| ORM | Drizzle ORM + postgres.js |
| DB | PostgreSQL 17 (Docker) |
| Style | Tailwind CSS v4 |
| Charts | Recharts 3.x |
| i18n | next-intl (ko primary, en) |
| Lint | Biome 2.x |
| Monorepo | Turborepo 2.x |

---

## Monorepo Structure

```
klic-leaderboard/
├── apps/web/                    # Next.js 16
│   ├── app/[lang]/
│   │   ├── (auth)/login/        # Google/GitHub login
│   │   ├── (main)/
│   │   │   ├── page.tsx         # Leaderboard (main)
│   │   │   ├── mydashboard/     # My dashboard
│   │   │   ├── profile/[username]/
│   │   │   ├── team/[teamName]/
│   │   │   ├── settings/        # CLI API key management
│   │   │   └── docs/            # CLI install guide
│   │   └── admin/               # Admin dashboard
│   ├── app/api/
│   │   ├── submit/              # CLI data submission
│   │   ├── api-keys/            # API key CRUD
│   │   ├── sync-org/            # Batch org sync
│   │   └── admin/               # Admin APIs
│   ├── components/
│   │   ├── leaderboard/         # LeaderboardTable, TeamLeaderboard, PeriodFilter
│   │   ├── dashboard/           # DashboardTabs, DailyBarChart, ModelPieChart,
│   │   │                        # ToolUsageBarChart, TaskCategoryPieChart, ProjectsTable
│   │   └── profile/             # LevelProgress, TokenChart
│   ├── lib/google-directory.ts  # Google Workspace Directory API sync
│   └── auth.ts                  # NextAuth v5 config
├── packages/db/                 # Drizzle schema + migrations
│   └── src/schema/              # users, submissions, userSessions, apiKeys, accounts
├── packages/cli/                # Node.js CLI (esbuild → dist/index.js)
│   └── src/lib/scanner.ts       # JSONL parser + CodeBurn classifier
├── packages/shared/             # Types, level system, task classifier
│   └── src/classifier.ts        # 13-category deterministic task classification
└── docker-compose.yml
```

---

## Data Flow

```
Employee Terminal
  └─ klic-leaderboard (daemon, 30min) ──► POST /api/submit
                                              │
Google Workspace Directory ──(orgUnit sync)───┤
                                              ▼
                                     PostgreSQL 17
                                              │
                          Web UI ◄──── Employee Browser
                          Admin ◄──── Manager Browser
```

---

## Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| name | text | |
| email | text unique | Google email |
| image | text | Profile image |
| githubUsername | text unique nullable | GitHub link |
| department | text nullable | Google Directory (사업본부) |
| team | text nullable | Google Directory (부 > 팀) |
| role | enum(user, admin) | |
| level | int | 1-10, calculated from tokens |
| fiveHourUsedPct | numeric nullable | Rate limit |
| sevenDayUsedPct | numeric nullable | Rate limit |
| rateLimitUpdatedAt | timestamptz nullable | |

### submissions
| Column | Type | Description |
|--------|------|-------------|
| userId | uuid FK | |
| source | uuid | Machine identifier |
| totalTokens | bigint | |
| totalCost | numeric | USD |
| modelsUsed | jsonb | Model list |
| dailyBreakdown | jsonb | Per-day token/cost data |
| dateRangeStart | date | |
| dateRangeEnd | date | |
| submittedAt | timestamptz | |
| lastSubmissionAt | timestamptz | 1-hour rate limit |

### userSessions
| Column | Type | Description |
|--------|------|-------------|
| userId | uuid FK | |
| sessionId | text | |
| projectName | text | |
| totalTokens | bigint | |
| totalCost | numeric | |
| modelsUsed | jsonb | |
| toolCounts | jsonb | `{Read: 45, Edit: 12, Bash: 30}` |
| taskCategories | jsonb | `{coding: 15, debugging: 3}` |
| hostname | text | Machine name |
| startedAt | timestamptz | |
| submittedAt | timestamptz | |
| Primary key | (userId, sessionId) | Upsert |

### apiKeys
| Column | Type | Description |
|--------|------|-------------|
| userId | uuid FK | |
| keyHash | text | SHA-256 hashed |
| createdAt | timestamptz | |

---

## Auth

- **Google OAuth**: Restricted to `AUTH_GOOGLE_DOMAIN` (klic.co.kr)
- **GitHub OAuth**: Links to existing Google account by email match
- **On Google login**: Auto-sync `department`/`team` from Google Directory via service account
- **CLI auth**: API key (SHA-256 hashed), submitted via `klic-leaderboard login`

---

## Org Unit Sync

Google Workspace `orgUnitPath` is parsed into `team` field:

- `/04. R&D 사업본부/01. 개발사업부/02. 개발사업1부/02. 개발2팀` → team: `개발사업1부 > 개발2팀`, department: `R&D 사업본부`
- `/07. SI 2 사업본부/02. SI 2 기술지원2팀` → team: `SI 2 기술지원2팀`
- `/그외모음` → team: null (unassigned)

Sync runs on Google login + batch via `POST /api/sync-org`.

---

## Level System

| Lv | Name | Range |
|----|------|-------|
| 1 | 🐣 응애 나 애기토큰 | ~100K |
| 2 | 🐜 출근하는 개미 | ~500K |
| 3 | 🧐 AI 좀 치나? | ~1M |
| 4 | 🔥 본격 맑눈광 | ~3M |
| 5 | 🤫 님 혹시 AI임? | ~10M |
| 6 | 🦾 인간 GPT | ~30M |
| 7 | 👑 토큰의 왕 | ~100M |
| 8 | 🌌 도파민 대원수 | ~300M |
| 9 | ⚡ 지구 파괴 커스텀 | ~1B |
| 10 | 💀 핵폭탄급 | 1B+ |

---

## Task Classification (CodeBurn-style)

CLI scanner classifies each turn (user + assistant pair) into one of 13 categories using deterministic rules:

| Category | Korean |
|----------|--------|
| coding | 코딩 |
| debugging | 디버깅 |
| feature | 기능 개발 |
| refactoring | 리팩토링 |
| testing | 테스팅 |
| exploration | 탐색 |
| planning | 계획 |
| delegation | 위임 |
| git | Git 작업 |
| build/deploy | 빌드/배포 |
| conversation | 대화 |
| brainstorming | 브레인스토밍 |
| general | 일반 |

**Classification phases:**
1. Tool-based pattern matching (first match wins)
2. Keyword refinement (debug/refactor/feature keywords)
3. Conversation fallback (no tool usage)

---

## Leaderboard Deduplication

Users with multiple PCs submit overlapping `dailyBreakdown` data. The leaderboard query deduplicates at the daily level:

```sql
-- For each (user, date), take MAX tokens across all submissions
-- Then SUM per user for ranking
WITH deduped_daily AS (
  SELECT user_id, (day->>'date')::date,
    MAX((day->>'totalTokens')::bigint),
    MAX((day->>'totalCost')::numeric)
  FROM submissions, jsonb_array_elements(daily_breakdown) AS day
  GROUP BY user_id, (day->>'date')::date
)
```

---

## CLI Distribution

- Built with esbuild → `packages/cli/dist/index.js`
- Copied to `apps/web/public/cli/klic-leaderboard`
- Served at `https://use.klic.co.kr/cli/klic-leaderboard`
- Install scripts: `public/install.sh` (Linux/macOS/WSL), `public/install.ps1` (Windows)
- Daemon: 30-min interval (systemd on Linux, launchd on macOS, cron on WSL, Task Scheduler on Windows)

---

## i18n

- Korean (ko) primary, English (en)
- URL-based: `/ko/`, `/en/`
- Translation files: `apps/web/messages/ko.json`, `en.json`

---

## Deployment

```yaml
# docker-compose.yml
services:
  web:
    build: ./apps/web
    ports: ["5400:3000"]
    env_file: .env
    depends_on: [db]
  db:
    image: postgres:17-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
```

Production runs `drizzle-kit migrate` then `server.js`. `googleapis` manually installed in runner stage.
