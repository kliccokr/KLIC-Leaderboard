#!/bin/bash
# klic-statusline.sh — KLIC Leaderboard + Claude Code Status Line
# 기존 statusline 표시 + Rate Limit 데이터를 ~/.claude/rate-limits.json에 저장
#
# 설치: https://use.klic.co.kr/docs#rate-limit-setup

# ── ANSI helpers ──────────────────────────────────────────────────────────────
RESET='\033[0m'
BOLD_CYAN='\033[1;36m'
GREEN='\033[0;32m'
DIM_GRAY='\033[2;37m'
BOLD_YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
WHITE='\033[0;37m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
PIPE="${DIM_GRAY} | ${RESET}"

# ── Parse JSON from stdin ──────────────────────────────────────────────────────
input=$(cat)

model_display=$(echo "$input" | jq -r '
  if (.model | type) == "object" then (.model.display_name // empty)
  else empty
  end')
model_id=$(echo "$input" | jq -r '
  if (.model | type) == "string" then .model
  elif (.model | type) == "object" then (.model.id // empty)
  else empty
  end')
used_pct=$(echo "$input"   | jq -r '.context_window.used_percentage // empty')
session_id=$(echo "$input" | jq -r '.session_id          // empty')
cwd=$(echo "$input"        | jq -r '.workspace.current_dir // .cwd // empty')
agent_name=$(echo "$input" | jq -r '.agent.name // empty')
effort_raw=$(jq -r '.effortLevel // empty' "$HOME/.claude/settings.json" 2>/dev/null)

# ── KLIC: Rate Limit → ~/.claude/rate-limits.json ────────────────────────────
echo "$input" | jq -c '{rate_limits: (.rate_limits // {}), timestamp: (now | todate)}' \
  > "$HOME/.claude/rate-limits.json" 2>/dev/null || true

# ── Segment 1: [Model] ────────────────────────────────────────────────────────
short_model="Claude"
if [ -n "$model_display" ]; then
  short_model=$(echo "$model_display" | sed 's/^Claude //' | sed 's/ *(\([^)]*\) context)/(\1)/')
elif [ -n "$model_id" ]; then
  mid_lc=$(echo "$model_id" | tr '[:upper:]' '[:lower:]')
  family=""
  if echo "$mid_lc" | grep -q "opus";     then family="Opus"
  elif echo "$mid_lc" | grep -q "sonnet"; then family="Sonnet"
  elif echo "$mid_lc" | grep -q "haiku";  then family="Haiku"
  fi

  if [ -n "$family" ]; then
    remainder=$(echo "$mid_lc" \
      | sed 's/^claude-//' \
      | sed "s/^$(echo "$family" | tr '[:upper:]' '[:lower:]')-//")
    major=$(echo "$remainder" | cut -d'-' -f1)
    minor=$(echo "$remainder" | cut -d'-' -f2)
    if echo "$major" | grep -qE '^[0-9]+$' && echo "$minor" | grep -qE '^[0-9]+$'; then
      short_model="${family} ${major}.${minor}"
    else
      short_model="$family"
    fi
  elif [ -n "$model_id" ]; then
    short_model=$(echo "$model_id" | sed 's/^claude-//')
  fi
fi

case "$effort_raw" in
  low)     effort_circle="${DIM_GRAY}○${BOLD_CYAN}" ;;
  medium)  effort_circle="${GREEN}●${BOLD_CYAN}"    ;;
  high)    effort_circle="${YELLOW}●${BOLD_CYAN}"   ;;
  highest) effort_circle="${RED}●${BOLD_CYAN}"      ;;
  *)       effort_circle=""                         ;;
esac
seg_model="${BOLD_CYAN}[${short_model}]${RESET}"
if [ -n "$effort_circle" ]; then :; fi

# ── Segment 2: context progress bar ──────────────────────────────────────────
seg_ctx=""
if [ -n "$used_pct" ]; then
  pct=$(printf "%.0f" "$used_pct")
  filled=$(( pct / 10 ))
  empty=$(( 10 - filled ))
  bar=""
  for (( i=0; i<filled; i++ )); do bar+="${GREEN}█${RESET}"; done
  for (( i=0; i<empty;  i++ )); do bar+="${DIM_GRAY}░${RESET}"; done
  seg_ctx="${DIM_GRAY}Context ${RESET}${bar} ${WHITE}${pct}%${RESET}"
fi

# ── Segment 3: project git:(branch) ──────────────────────────────────────────
project_name=""
[ -n "$cwd" ] && project_name=$(basename "$cwd" | sed 's/^[Kk][Ll][Ii][Cc]-//')

git_part=""
if [ -n "$cwd" ] && git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null \
           || git -C "$cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null)
  [ -n "$branch" ] && git_part=" ${DIM_GRAY}git:(${MAGENTA}${branch}${DIM_GRAY})${RESET}"
fi

seg_project="${git_part:+${git_part} }${BOLD_YELLOW}${project_name}${RESET}"

# ── Segment 4: Agent name ─────────────────────────────────────────────────────
seg_agent=""
if [ -n "$agent_name" ]; then
  seg_agent="${DIM_GRAY}${MAGENTA}${agent_name}${RESET}"
fi

# ── Segment 5: Rate limits — 5h time + 7d bar ────────────────────────────────
seg_usage=""
five_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
seven_pct=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
five_resets=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
seven_resets=$(echo "$input" | jq -r '.rate_limits.seven_day.resets_at // empty')

part_5h=""
if [ -n "$five_pct" ]; then
  pct5=$(printf "%.0f" "$five_pct")
  filled5=$(( pct5 / 10 ))
  empty5=$(( 10 - filled5 ))
  bar5=""
  for (( i=0; i<filled5; i++ )); do bar5+="${GREEN}█${RESET}"; done
  for (( i=0; i<empty5;  i++ )); do bar5+="${DIM_GRAY}░${RESET}"; done
  used_secs=$(( pct5 * 18000 / 100 ))
  used_h=$(( used_secs / 3600 ))
  used_m=$(( (used_secs % 3600) / 60 ))
  if [ "$used_h" -gt 0 ]; then
    time_5h="${used_h}h${used_m}m/5h"
  else
    time_5h="${used_m}m/5h"
  fi

  # Show reset countdown from resets_at if available
  reset_label=""
  if [ -n "$five_resets" ] && [ "$five_resets" != "null" ]; then
    now_ts=$(date +%s)
    rem_secs=$(( five_resets - now_ts ))
    if [ "$rem_secs" -gt 0 ]; then
      rem_h=$(( rem_secs / 3600 ))
      rem_m=$(( (rem_secs % 3600) / 60 ))
      if [ "$rem_h" -gt 0 ]; then
        reset_label=" →${rem_h}h${rem_m}m"
      else
        reset_label=" →${rem_m}m"
      fi
    fi
  fi

  part_5h="${bar5} ${WHITE}${pct5}%${RESET} ${DIM_GRAY}(${time_5h}${reset_label})${RESET}"
fi

part_7d=""
if [ -n "$seven_pct" ]; then
  pct7=$(printf "%.0f" "$seven_pct")
  filled7=$(( pct7 / 10 ))
  empty7=$(( 10 - filled7 ))
  bar7=""
  for (( i=0; i<filled7; i++ )); do bar7+="${GREEN}█${RESET}"; done
  for (( i=0; i<empty7;  i++ )); do bar7+="${DIM_GRAY}░${RESET}"; done
  used_days=$(( pct7 * 7 / 100 ))
  part_7d="${bar7} ${WHITE}${pct7}%${RESET} ${DIM_GRAY}(${used_days}d/7d)${RESET}"
fi

if [ -n "$part_5h" ] && [ -n "$part_7d" ]; then
  seg_usage="${part_5h} ${DIM_GRAY}|${RESET} ${part_7d}"
elif [ -n "$part_5h" ]; then
  seg_usage="${part_5h}"
elif [ -n "$part_7d" ]; then
  seg_usage="${part_7d}"
fi

# ── Segment 6: Session uptime ─────────────────────────────────────────────────
seg_session=""
if [ -n "$session_id" ]; then
  start_file="/tmp/claude-session-start-${session_id}"

  if [ ! -f "$start_file" ]; then
    date +%s > "$start_file" 2>/dev/null
  fi

  if [ -f "$start_file" ]; then
    start_ts=$(cat "$start_file" 2>/dev/null)
    now_ts=$(date +%s)
    if echo "$start_ts" | grep -qE '^[0-9]+$'; then
      elapsed=$(( now_ts - start_ts ))
      minutes=$(( elapsed / 60 ))
      hours=$(( minutes / 60 ))
      mins_rem=$(( minutes % 60 ))

      if [ "$hours" -gt 0 ]; then
        uptime_str=$(printf "%dh%02dm" "$hours" "$mins_rem")
      else
        uptime_str="${minutes}m"
      fi
      seg_session="${DIM}⏱️ ${uptime_str}${RESET}"
    fi
  fi
fi

# ── Assemble ───────────────────────────────────────────────────────────────────
parts=()
parts+=("$(printf '%b' "$seg_model")")
[ -n "$seg_ctx" ]     && parts+=("$(printf '%b' "$seg_ctx")")
[ -n "$seg_usage" ]   && parts+=("$(printf '%b' "$seg_usage")")
[ -n "$seg_project" ] && parts+=("$(printf '%b' "$seg_project")")
[ -n "$seg_agent" ]   && parts+=("$(printf '%b' "$seg_agent")")
[ -n "$seg_session" ] && parts+=("$(printf '%b' "$seg_session")")

sep="$(printf '%b' "${PIPE}")"
out=""
for part in "${parts[@]}"; do
  [ -n "$out" ] && out+="$sep"
  out+="$part"
done

printf '%b' "$out"
