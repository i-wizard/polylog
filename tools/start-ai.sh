#!/usr/bin/env bash
#
# Makes Ollama on this Mac reachable from the Polylog app on your phone.
#
# The app is served over https, and iOS blocks https pages from calling plain
# http addresses, so this opens a temporary Cloudflare "quick tunnel" that gives
# Ollama an https://….trycloudflare.com address. The address is new every time
# this script starts; it is printed and copied to the clipboard so it can be
# pasted in the app (Settings → AI tutor → Paste). Stop with Ctrl+C.

set -euo pipefail

APP_ORIGINS="https://i-wizard.github.io,http://localhost:5173"
OLLAMA_LOCAL_URL="http://localhost:11434"
TUNNEL_URL_PATTERN='https://[a-z0-9-]+\.trycloudflare\.com'

log() { printf '\033[1m%s\033[0m\n' "$*"; }

find_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    command -v cloudflared
  elif [ -x "$HOME/.local/bin/cloudflared" ]; then
    echo "$HOME/.local/bin/cloudflared"
  else
    return 1
  fi
}

wait_for_ollama() {
  for _ in $(seq 1 30); do
    if curl -fs "$OLLAMA_LOCAL_URL/api/tags" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# True when the running Ollama accepts browser requests from the app, checked
# with the same CORS preflight the browser sends.
ollama_allows_app() {
  local status
  status="$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS \
    -H 'Origin: https://i-wizard.github.io' \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type' \
    "$OLLAMA_LOCAL_URL/api/chat" || true)"
  [ "$status" = "204" ] || [ "$status" = "200" ]
}

# Ollama only accepts browser requests from origins listed in OLLAMA_ORIGINS,
# and the macOS app reads it only when it starts. launchctl forgets the value
# on reboot, so it is set here and Ollama restarted whenever the running
# instance doesn't allow the app yet.
allow_app_origin() {
  if wait_for_ollama && ollama_allows_app; then
    return 0
  fi
  log "Allowing the Polylog app to use Ollama and restarting Ollama…"
  launchctl setenv OLLAMA_ORIGINS "$APP_ORIGINS"
  # AppleScript "quit" is silently ignored when run without Automation
  # permission, so the app and its server are stopped with signals instead.
  killall Ollama 2>/dev/null || true
  pkill -f 'Ollama.app/Contents/Resources/ollama serve' 2>/dev/null || true
  for _ in $(seq 1 15); do
    pgrep -x Ollama >/dev/null || break
    sleep 1
  done
  # Reopening fails (LaunchServices error -609) while the old app is still
  # shutting down, so retry for a few seconds.
  for _ in $(seq 1 10); do
    open -a Ollama 2>/dev/null && break
    sleep 1
  done
  if ! wait_for_ollama; then
    log "Ollama didn't start. Open the Ollama app and run this script again."
    exit 1
  fi
  if ! ollama_allows_app; then
    log "Ollama still refuses the app. Quit Ollama from its menu-bar icon and run this script again."
    exit 1
  fi
}

CLOUDFLARED="$(find_cloudflared)" || {
  log "cloudflared is not installed. See docs/ai-setup.md (one-time setup)."
  exit 1
}

allow_app_origin

TUNNEL_LOG="$(mktemp -t polylog-tunnel)"
# Ollama rejects requests addressed to anything but localhost, so the tunnel
# rewrites the Host header instead of passing the trycloudflare name through.
"$CLOUDFLARED" tunnel --no-autoupdate --url "$OLLAMA_LOCAL_URL" --http-host-header localhost:11434 >"$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
trap 'kill "$TUNNEL_PID" 2>/dev/null || true; rm -f "$TUNNEL_LOG"; echo; log "Tunnel stopped."' EXIT
trap 'exit 130' INT TERM HUP

log "Starting the tunnel…"
TUNNEL_URL=""
for _ in $(seq 1 60); do
  TUNNEL_URL="$(grep -Eo "$TUNNEL_URL_PATTERN" "$TUNNEL_LOG" | head -n 1 || true)"
  [ -n "$TUNNEL_URL" ] && break
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    log "The tunnel failed to start:"
    cat "$TUNNEL_LOG"
    exit 1
  fi
  sleep 1
done
if [ -z "$TUNNEL_URL" ]; then
  log "No tunnel address after 60 seconds. Check your internet connection and try again."
  exit 1
fi

# True once a request through the tunnel reaches Ollama. The name is looked
# up via Cloudflare's DNS rather than the home router: asking the router before
# the name exists makes it remember "not found" for a while, and the phone on
# the same Wi-Fi would then fail too.
tunnel_answers() {
  local host ip
  host="${TUNNEL_URL#https://}"
  ip="$(dig +short @1.1.1.1 "$host" A 2>/dev/null | grep -E '^[0-9.]+$' | head -n 1 || true)"
  [ -n "$ip" ] && curl -fs -o /dev/null --resolve "$host:443:$ip" "$TUNNEL_URL/api/tags"
}

# The address is printed a few seconds before Cloudflare routes it (error
# 1033 until then), so only announce it once a request actually gets through.
log "Waiting for $TUNNEL_URL to come online…"
TUNNEL_READY=false
for _ in $(seq 1 45); do
  if tunnel_answers; then
    TUNNEL_READY=true
    break
  fi
  sleep 1
done
if [ "$TUNNEL_READY" != true ]; then
  log "The tunnel didn't come online. Press Ctrl+C and run this script again."
fi

printf '%s' "$TUNNEL_URL" | pbcopy
echo
echo "  ┌──────────────────────────────────────────────────────────────┐"
echo "    AI address (copied to the clipboard):"
echo
echo "    $TUNNEL_URL"
echo
echo "    In the app: Settings → AI tutor → Paste"
echo "  └──────────────────────────────────────────────────────────────┘"
echo
log "Keep this window open while you practise. Press Ctrl+C to stop."

wait "$TUNNEL_PID"
