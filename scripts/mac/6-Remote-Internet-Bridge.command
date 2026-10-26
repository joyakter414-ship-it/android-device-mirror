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
echo "   🌐 ZERO-APP REMOTE INTERNET BRIDGE (CLOUDFLARE WORKER)   "
echo "============================================================"
echo "Relay: phone-adb-bridge.joyakter414.workers.dev"
echo ""

echo "Starting local websocat bridge on 127.0.0.1:5556..."
"$WEBSOCAT" -b -E --ping-interval 15 tcp-l:127.0.0.1:5556 "$WORKER_URL" &
BRIDGE_PID=$!

sleep 2

echo "Connecting ADB to 127.0.0.1:5556..."
"$ADB" connect 127.0.0.1:5556

echo "Launching Scrcpy over remote internet tunnel..."
"$SCRCPY" -s 127.0.0.1:5556 --stay-awake --window-title "Phone (Remote Internet Bridge)"

kill $BRIDGE_PID 2>/dev/null
