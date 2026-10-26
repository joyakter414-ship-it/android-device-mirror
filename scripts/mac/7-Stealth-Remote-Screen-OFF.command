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
echo "   🕵️ HECTOR STEALTH REMOTE CONTROL (PHYSICAL SCREEN OFF)    "
echo "============================================================"
echo "Phone Location : Anywhere in the world (4G/5G / Wi-Fi)"
echo "Physical Screen: 100% OFF / DARK (Backlight off, looks asleep)"
echo "PC Display     : Full 60 FPS Screen Mirror + Mouse & Keyboard"
echo "============================================================"
echo ""

echo "1. Connecting to Cloudflare Durable Object Relay..."
# Kill any previous bridge on 5556
pkill -f "tcp-l:127.0.0.1:5556" 2>/dev/null

"$WEBSOCAT" -b -E --ping-interval 15 tcp-l:127.0.0.1:5556 "$WORKER_URL" &
BRIDGE_PID=$!

sleep 2

echo "2. Linking ADB bridge to remote phone (127.0.0.1:5556)..."
"$ADB" connect 127.0.0.1:5556

echo "3. Launching stealth session (Phone screen remains completely OFF)..."
"$SCRCPY" -s 127.0.0.1:5556 \
  --turn-screen-off \
  --stay-awake \
  --power-off-on-close \
  --window-title "Remote Phone (STEALTH - Physical Screen OFF)"

# Cleanup on exit
kill $BRIDGE_PID 2>/dev/null
echo ""
echo "Session closed. Remote phone screen locked & sleeping."
