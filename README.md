# KLIC Leaderboard

KLIC 조직 내 Claude Code 사용량을 추적하고 랭킹을 제공하는 내부 플랫폼입니다.

## 기능

- **리더보드** — 토큰 사용량 기준 개인/팀 랭킹 (일별 중복 제거)
- **대시보드** — 개인 사용량 분석 (일별 트렌드, 작업 유형, 도구 사용량, 모델 비중)
- **레벨 시스템** — 누적 토큰에 따른 13단계 레벨
- **CLI 데몬** — 30분마다 Claude Code 사용 데이터 자동 제출
- **조직 연동** — Google Workspace에서 부서/팀 자동 동기화

## 아키텍처

```
apps/web          Next.js 16 (App Router, React 19, Tailwind v4)
packages/db       Drizzle ORM + PostgreSQL
packages/shared   공통 타입, 레벨 시스템, 작업 분류기
packages/cli      Claude Code JSONL 스캐너 + 제출 CLI
```

## 시작하기

```bash
# 의존성 설치
bun install

# 환경변수 설정 (apps/web/.env)
cp apps/web/.env.example apps/web/.env

# 데이터베이스 마이그레이션
cd packages/db && bun run db:migrate

# 개발 서버
bun run dev
```

## CLI 설치

```bash
curl -fsSL https://use.klic.co.kr/cli/install.sh | bash
klic-leaderboard login
klic-leaderboard daemon    # 백그라운드 실행
```

## 배포

```bash
docker compose up --build -d web
```

## 라이선스

Internal use only. KLIC.
