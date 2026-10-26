#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/../.." >/dev/null 2>&1 && pwd )"
ADB="$ROOT_DIR/bin/adb"
SCRCPY="$ROOT_DIR/bin/scrcpy"

clear
echo "============================================================"
echo "      📶 SWITCH TO WIRELESS ADB & LAUNCH LIVE SCREEN       "
echo "============================================================"

echo "Detecting phone Wi-Fi IP address..."
PHONE_IP=$("$ADB" shell "ip -f inet addr show wlan0 || ip route" 2>/dev/null | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" | grep -v "255$" | grep -v "0$" | head -n 1)

if [ -z "$PHONE_IP" ]; then
  echo "❌ Error: Could not detect phone IP. Is Wi-Fi turned on the phone?"
  read -p "Enter phone IP manually (e.g. 192.168.1.100): " PHONE_IP
fi

echo "Switching ADB to TCP port 5555..."
"$ADB" tcpip 5555
sleep 2

echo "Connecting to $PHONE_IP:5555..."
"$ADB" connect "$PHONE_IP:5555"

echo "Applying Keep-Awake settings..."
"$ADB" -s "$PHONE_IP:5555" shell settings put global stay_on_while_plugged_in 7
"$ADB" -s "$PHONE_IP:5555" shell settings put system screen_off_timeout 1800000

echo ""
echo "🎉 CONNECTED WIRELESSLY!"
echo "👉 You can now safely UNPLUG the USB cable!"
echo ""
echo "Launching 60 FPS live screen mirror..."
"$SCRCPY" -s "$PHONE_IP:5555" --stay-awake --window-title "Phone (Local Wi-Fi)"
