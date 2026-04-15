#!/bin/bash
set -euo pipefail

# KLIC Leaderboard - 소스 압축 (다른 서버로 전송용)
# .env 포함하지 않음

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_NAME="klic-leaderboard.tar.gz"

echo "=== KLIC Leaderboard 소스 압축 ==="
echo ""

# .env 파일들 제외하고 압축
tar czf "$DIST_NAME" \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.env.production' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.turbo' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='backup' \
  --exclude='.claude' \
  --exclude='dist' \
  --exclude='*.tar.gz' \
  -C "$SCRIPT_DIR" \
  .

SIZE=$(du -h "$DIST_NAME" | cut -f1)
echo -e "완료: ${DIST_NAME} (${SIZE})"
echo ""
echo "다른 서버로 전송 후:"
echo "  scp ${DIST_NAME} user@server:/opt/klic/"
echo "  ssh user@server 'cd /opt/klic && tar xzf ${DIST_NAME}'"
echo "  cd /opt/klic && cp .env.example .env.production && vi .env.production"
echo "  cd /opt/klic && bash deploy.sh"
