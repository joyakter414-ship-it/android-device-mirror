#!/bin/bash
# ============================================================
#  Hector Non-Root Permanent Auto-Boot Setup
#  Allows phone to auto-connect to Cloudflare even after reboot
#  NO ROOT REQUIRED!
# ============================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/.." >/dev/null 2>&1 && pwd )"
ADB="$ROOT_DIR/bin/adb"

clear
echo "============================================================"
echo "   🛡️ HECTOR NON-ROOT PERMANENT AUTO-BOOT SETUP           "
echo "============================================================"
echo "Goal: Phone reboots (kids restart it / power cut / off-on)"
echo "Result: Automatically reconnects to Cloudflare WITHOUT ROOT!"
echo "============================================================"
echo ""

# Check device
DEVICE=$("$ADB" devices | grep -v "List" | grep "device$" | head -n 1 | awk '{print $1}')
if [ -z "$DEVICE" ]; then
    echo "❌ No authorized Android device connected over USB/ADB."
    echo "Please connect the phone with USB cable first to install."
    exit 1
fi

echo "✅ Device Connected: $DEVICE"
echo ""

# Whitelist Termux & Termux:Boot from battery optimization (No Doze / No Kill)
echo "1. Whitelisting background execution and disabling battery optimization..."
"$ADB" shell "dumpsys deviceidle whitelist +com.termux" 2>/dev/null
"$ADB" shell "dumpsys deviceidle whitelist +com.termux.boot" 2>/dev/null
"$ADB" shell "appops set com.termux RUN_IN_BACKGROUND allow" 2>/dev/null
"$ADB" shell "appops set com.termux.boot RUN_IN_BACKGROUND allow" 2>/dev/null

# Ensure websocat binary exists in /data/local/tmp
echo "2. Checking static websocat binary on device..."
ABI=$("$ADB" shell getprop ro.product.cpu.abi | tr -d '\r')
if [ "$ABI" = "arm64-v8a" ]; then
    LOCAL_BIN="$ROOT_DIR/bin/websocat-android-aarch64"
else
    LOCAL_BIN="$ROOT_DIR/bin/websocat-android-armv7"
fi

"$ADB" push "$LOCAL_BIN" /data/local/tmp/websocat
"$ADB" shell chmod 755 /data/local/tmp/websocat

# Create the boot runner script in /data/local/tmp
echo "3. Creating permanent boot runner script..."
cat << 'EOF' > /tmp/hector_boot_runner.sh
#!/system/bin/sh
TOKEN="sk_phone_bridge_8f3a9d2c1e7b45"
TARGET="wss://phone-adb-bridge.joyakter414.workers.dev/ws?role=phone&token=$TOKEN"

# Wait 15s after reboot for Wi-Fi or 4G data to come online
sleep 15

# Set Keep Awake
settings put global stay_on_while_plugged_in 7 2>/dev/null
settings put system screen_off_timeout 1800000 2>/dev/null

while true; do
    if [ -f /data/local/tmp/websocat ]; then
        /data/local/tmp/websocat -b -E --ping-interval 15 tcp:127.0.0.1:5555 "$TARGET"
    fi
    sleep 3
done
EOF

"$ADB" push /tmp/hector_boot_runner.sh /data/local/tmp/hector_boot_runner.sh
"$ADB" shell chmod 755 /data/local/tmp/hector_boot_runner.sh
rm /tmp/hector_boot_runner.sh

echo ""
echo "============================================================"
echo "🎉 AUTO-BOOT RUNNER PREPARED ON PHONE!"
echo "============================================================"
echo ""
echo "How to complete the 1-time Permanent Auto-Start:"
echo "Option A (Recommended):"
echo "  Install Termux & Termux:Boot (free from F-Droid)."
echo "  Create folder: mkdir -p ~/.termux/boot"
echo "  Add line: /data/local/tmp/hector_boot_runner.sh &"
echo ""
echo "Option B (Native Android 11+ Wireless Debugging):"
echo "  Developer Options -> Enable 'Wireless Debugging'."
echo "  Phone stays paired even if restarted by kids!"
echo "============================================================"
