#!/bin/bash
set -euo pipefail

# KLIC Leaderboard - 배포 스크립트
# .env 없이 깔끔하게 다른 서버에 배포

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
ENV_FILE="$SCRIPT_DIR/.env.production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== KLIC Leaderboard 배포 ===${NC}"
echo ""

# Check .env.production
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}⚠ .env.production 파일이 없습니다.${NC}"
  echo -e "${YELLOW}  다음 형식으로 생성하세요:${NC}"
  echo ""
  cat <<'EOF'
AUTH_SECRET=your_auth_secret_min_32_chars
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
AUTH_GOOGLE_DOMAIN=klic.co.kr
DB_PASSWORD=your_db_password
GOOGLE_ADMIN_EMAIL=admin@klic.co.kr
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
NEXT_PUBLIC_APP_URL=https://your-domain.com
TZ=Asia/Seoul
WEB_PORT=3000
EOF
  exit 1
fi

echo "1. Docker 이미지 빌드 중..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" build --no-cache 2>&1 | tail -5

echo ""
echo -e "${GREEN}2. 배포 시작${NC}"
echo -e "   .env.production 파일을 사용합니다"
echo ""

docker compose \
  --env-file "$ENV_FILE" \
  -f "$SCRIPT_DIR/docker-compose.yml" \
  up -d 2>&1

echo ""
echo -e "${GREEN}3. 마이그레이션 실행 중...${NC}"
sleep 3
docker compose \
  --env-file "$ENV_FILE" \
  -f "$SCRIPT_DIR/docker-compose.yml" \
  exec web sh -c "cd packages/db && npx drizzle-kit migrate" 2>&1

echo ""
echo -e "${GREEN}=== 배포 완료 ===${NC}"
echo -e "  Web: http://localhost:${WEB_PORT:-3000}"
echo -e "  .env.production 파일을 서버에 보관하세요"
