#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/../.." >/dev/null 2>&1 && pwd )"
ADB="$ROOT_DIR/bin/adb"

clear
echo "============================================================"
echo "      📱 BLIND-TAP USB DEBUGGING AUTHORIZATION LISTENER    "
echo "============================================================"
echo "Phone Display: BLACK / BROKEN"
echo "Instructions:"
echo " 1. Wake the screen (press Power or touch fingerprint sensor)."
echo " 2. Unplug and re-insert the USB cable."
echo " 3. Tap 3-4 times in the lower-middle right quadrant"
echo "    (~4-6 cm up from the bottom edge, right half)."
echo "============================================================"
echo ""
echo "⏳ Listening for USB Authorization..."

while true; do
  STATUS=$("$ADB" devices | grep -v "List" | grep -v "^$" | head -n 1)
  
  if echo "$STATUS" | grep -q "device$"; then
    echo ""
    echo "🎉 SUCCESS: PHONE AUTHORIZED & CONNECTED!"
    echo "Device ID: $STATUS"
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null
    say "Phone Authorized" 2>/dev/null
    break
  elif echo "$STATUS" | grep -q "unauthorized"; then
    echo "⚠️  Dialog is active on screen! TAP LOWER-RIGHT NOW... ($STATUS)"
  fi
  sleep 1
done

echo ""
echo "Next step: Run '2-Switch-Wireless-WiFi.command' to ditch the cable."
read -p "Press [Enter] to exit..."
