#!/usr/bin/env bash

INSTALL_DIR="/usr/local/bin"
SERVICE_NAME="klic-leaderboard"
BIN_NAME="klic-leaderboard"
INSTALL_URL="https://use.klic.co.kr/cli/klic-leaderboard"
LOG_DIR="$HOME/.klic/leaderboard"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { printf "%b\n" "$1"; }

log ""
log "========================================"
log "  KLIC Leaderboard CLI Installer"
log "========================================"
log ""

# Check Claude Code is installed
CLAUDE_PROJECTS=""
for d in "$HOME/.claude/projects" "$HOME/.config/claude/projects" "$APPDATA/claude/projects" "$APPDATA/Claude/projects"; do
  [ -d "$d" ] && CLAUDE_PROJECTS="$d" && break
done
if [ -z "$CLAUDE_PROJECTS" ]; then
  log "${RED}⚠ Claude Code가 설치되어 있지 않습니다.${NC}"
  log ""
  log "  KLIC Leaderboard는 Claude Code 사용 데이터를 수집합니다."
  log "  Claude Code를 먼저 설치한 후 이 스크립트를 다시 실행하세요."
  log ""
  log "  Claude Code 설치: ${CYAN}https://claude.ai/download${NC}"
  log ""
  exit 1
fi

# Check node, install if missing
if ! command -v node >/dev/null 2>&1; then
  log "${YELLOW}Node.js가 설치되어 있지 않습니다. 자동 설치합니다...${NC}"
  OS="$(uname -s)"
  if [ "$OS" = "Linux" ]; then
    if command -v apt-get >/dev/null 2>&1; then
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >/dev/null 2>&1
      sudo apt-get install -y nodejs >/dev/null 2>&1
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y nodejs >/dev/null 2>&1
    elif command -v apk >/dev/null 2>&1; then
      sudo apk add nodejs >/dev/null 2>&1
    else
      log "${RED}지원되는 패키지 매니저를 찾을 수 없습니다.${NC}"
      log "수동 설치: https://nodejs.org"
      exit 1
    fi
  elif [ "$OS" = "Darwin" ]; then
    if command -v brew >/dev/null 2>&1; then
      brew install node >/dev/null 2>&1
    else
      log "${RED}Homebrew가 필요합니다.${NC}"
      log "설치: https://brew.sh"
      exit 1
    fi
  else
    log "${RED}지원하지 않는 OS: $OS${NC}"
    log "수동 설치: https://nodejs.org"
    exit 1
  fi
  if ! command -v node >/dev/null 2>&1; then
    log "${RED}Node.js 설치에 실패했습니다.${NC}"
    log "수동 설치: https://nodejs.org"
    exit 1
  fi
fi
log "${GREEN}Node.js:${NC} $(node --version)"
NODE_PATH="$(command -v node)"

# Detect platform
IS_WSL=false
if grep -qi microsoft /proc/version 2>/dev/null; then
  IS_WSL=true
fi
OS="$(uname -s)"

# 1. Download
log "${GREEN}[1/5]${NC} CLI 다운로드 중..."
TMPFILE="$(mktemp)"
trap 'rm -f "$TMPFILE"' EXIT
if ! curl -fsSL "$INSTALL_URL" -o "$TMPFILE"; then
  log "${RED}다운로드 실패${NC}"
  exit 1
fi
chmod +x "$TMPFILE"
log "   -> 완료"

# 2. Install
log "${GREEN}[2/5]${NC} $INSTALL_DIR 에 설치 중..."
# Rewrite shebang to absolute node path so launchd/systemd don't need PATH
sed -i.bak "1s|#!/usr/bin/env node|#!$NODE_PATH|" "$TMPFILE" 2>/dev/null || \
  sed -i '' "1s|#!/usr/bin/env node|#!$NODE_PATH|" "$TMPFILE"
if [ -w "$INSTALL_DIR" ]; then
  mv "$TMPFILE" "$INSTALL_DIR/$BIN_NAME"
else
  sudo mv "$TMPFILE" "$INSTALL_DIR/$BIN_NAME"
fi
hash -r 2>/dev/null || true
log "   -> $INSTALL_DIR/$BIN_NAME (node: $NODE_PATH)"

# 3. Register service
log "${GREEN}[3/5]${NC} 서비스 등록 중..."
mkdir -p "$LOG_DIR"

if [ "$IS_WSL" = true ]; then
  # WSL: use cron (systemd may not be available)
  (crontab -l 2>/dev/null | grep -v "$BIN_NAME"; echo "*/30 * * * * $INSTALL_DIR/$BIN_NAME >> $LOG_DIR/daemon.log 2>&1") | crontab -
  log "   -> WSL cron 등록 완료 (30분마다 실행)"
elif [ "$OS" = "Darwin" ]; then
  PLIST="$HOME/Library/LaunchAgents/co.klic.leaderboard.plist"
  NODE_DIR="$(dirname "$NODE_PATH")"
  cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$SERVICE_NAME</string>
  <key>ProgramArguments</key>
  <array>
    <string>$INSTALL_DIR/$BIN_NAME</string>
    <string>daemon</string>
    <string>--foreground</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$NODE_DIR:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/daemon.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/daemon.log</string>
</dict>
</plist>
PLIST_EOF
  launchctl bootout "gui/$(id -u)/$SERVICE_NAME" 2>/dev/null || true
  sleep 1
  launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl load "$PLIST"
  log "   -> macOS launchd 서비스 등록 완료"
elif [ "$OS" = "Linux" ]; then
  mkdir -p "$HOME/.config/systemd/user"
  SERVICE_FILE="$HOME/.config/systemd/user/$SERVICE_NAME.service"
  NODE_DIR="$(dirname "$NODE_PATH")"
  cat > "$SERVICE_FILE" <<SERVICE_EOF
[Unit]
Description=KLIC Leaderboard Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment=PATH=$NODE_DIR:/usr/local/bin:/usr/bin:/bin
ExecStart=$INSTALL_DIR/$BIN_NAME daemon --foreground
Restart=on-failure
RestartSec=60

[Install]
WantedBy=default.target
SERVICE_EOF
  systemctl --user daemon-reload 2>/dev/null || true
  systemctl --user enable "$SERVICE_NAME" 2>/dev/null || true
  log "   -> systemd 유저 서비스 등록 완료"
else
  log "   ${YELLOW}지원하지 않는 OS: 수동 실행 필요${NC}"
fi

# 4. Login
log ""
log "${GREEN}[4/5]${NC} 로그인이 필요합니다."
log ""
log "  1. 브라우저에서 API 키 발급:"
log "     ${CYAN}https://use.klic.co.kr/ko/settings${NC}"
log ""
log "  2. 아래 명령어로 로그인:"
log "     ${CYAN}$INSTALL_DIR/$BIN_NAME login${NC}"
log ""

LOGIN_OK=false
if "$INSTALL_DIR/$BIN_NAME" login < /dev/tty; then
  LOGIN_OK=true
fi

# 5. Start daemon
if [ "$LOGIN_OK" = true ]; then
  log ""
  log "${GREEN}[5/5]${NC} 데몬 시작!"
  if [ "$IS_WSL" = true ]; then
    "$INSTALL_DIR/$BIN_NAME" daemon
  elif [ "$OS" = "Darwin" ]; then
    launchctl kickstart "gui/$(id -u)/$SERVICE_NAME" 2>/dev/null
  elif [ "$OS" = "Linux" ]; then
    systemctl --user start "$SERVICE_NAME" 2>/dev/null
  fi
  log "   30분마다 Claude Code 사용량이 자동 제출됩니다."
else
  log ""
  log "${YELLOW}[5/5]${NC} 로그인을 건너뛰셨습니다."
  log "   나중에 로그인 후 데몬을 시작하세요:"
  log "     ${CYAN}$INSTALL_DIR/$BIN_NAME daemon${NC}"
fi

log ""
log "========================================"
log "  서비스 관리"
log "========================================"
log "  로그:    tail -f $LOG_DIR/daemon.log"
log "  중지:    $INSTALL_DIR/$BIN_NAME stop"
log "  수동:    $INSTALL_DIR/$BIN_NAME daemon"
if [ "$IS_WSL" = true ]; then
  log "  cron:    crontab -e  (항목 삭제로 cron 해제)"
elif [ "$OS" = "Darwin" ]; then
  log "  서비스:  launchctl bootout gui/\$(id -u)/$SERVICE_NAME"
elif [ "$OS" = "Linux" ]; then
  log "  서비스:  systemctl --user stop $SERVICE_NAME"
fi
