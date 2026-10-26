#!/bin/bash
# ============================================================
#  Hector Anti-Theft & Auto-Boot Persistence Setup
#  Ensures phone auto-connects to Cloudflare after reboot
# ============================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/.." >/dev/null 2>&1 && pwd )"
ADB="$ROOT_DIR/bin/adb"

clear
echo "============================================================"
echo "    🛡️ HECTOR ANTI-THEFT & REBOOT AUTO-CONNECT SETUP       "
echo "============================================================"
echo "Scenario: Phone is lost, stolen, or rebooted away from you."
echo "Goal    : Automatically reconnect to Cloudflare on boot."
echo "============================================================"
echo ""

# Check device connection
DEVICE=$("$ADB" devices | grep -v "List" | grep "device$" | head -n 1 | awk '{print $1}')
if [ -z "$DEVICE" ]; then
    echo "❌ No authorized Android device connected over USB/ADB."
    echo "Please connect the phone first to install persistence."
    exit 1
fi

echo "Connected Device: $DEVICE"
echo ""
echo "Select device configuration:"
echo "1) ROOTED Device (Magisk / KernelSU / APatch) -> 100% Silent Root Boot Service"
echo "2) NON-ROOTED Device (Termux:Boot / Background Service)"
read -p "Enter choice [1 or 2]: " CHOICE

TOKEN="sk_phone_bridge_8f3a9d2c1e7b45"
RELAY="wss://phone-adb-bridge.joyakter414.workers.dev/ws?role=phone&token=$TOKEN"

if [ "$CHOICE" = "1" ]; then
    echo ""
    echo "Configuring Magisk / KernelSU boot persistence..."
    
    BOOT_SCRIPT="/data/adb/service.d/hector_boot.sh"
    
    "$ADB" shell "su -c 'mkdir -p /data/adb/service.d/'"
    
    # Push boot daemon
    cat << EOF > /tmp/hector_boot.sh
#!/system/bin/sh
# Wait 30 seconds for Wi-Fi or 4G/5G mobile data to initialize
sleep 30

# Enable TCP ADB port 5555
setprop service.adb.tcp.port 5555
stop adbd 2>/dev/null
start adbd 2>/dev/null

# Apply Keep-Awake
settings put global stay_on_while_plugged_in 7 2>/dev/null
settings put system screen_off_timeout 1800000 2>/dev/null

# Run Cloudflare Websocat Bridge in infinite auto-reconnect loop
while true; do
    if [ -f /data/local/tmp/websocat ]; then
        /data/local/tmp/websocat -b -E --ping-interval 15 tcp:127.0.0.1:5555 "$RELAY"
    fi
    sleep 3
done
EOF

    "$ADB" push /tmp/hector_boot.sh /data/local/tmp/hector_boot.sh
    "$ADB" shell "su -c 'cp /data/local/tmp/hector_boot.sh $BOOT_SCRIPT && chmod 755 $BOOT_SCRIPT'"
    rm /tmp/hector_boot.sh
    
    echo "✅ SUCCESS! Boot service installed at $BOOT_SCRIPT"
    echo "Even if a thief turns the phone OFF and back ON:"
    echo "As soon as the phone powers on, it will silently connect to Cloudflare!"

elif [ "$CHOICE" = "2" ]; then
    echo ""
    echo "For non-rooted phones, Android blocks running background daemons on boot"
    echo "unless a boot receiver or service is registered."
    echo ""
    echo "Recommended setup for Non-Rooted phones:"
    echo "1. Install Termux + Termux:Boot (Free from F-Droid)."
    echo "2. Place bridge script in '~/.termux/boot/hector.sh'."
    echo "3. Termux:Boot launches the Cloudflare relay silently on every phone restart!"
fi

echo ""
echo "Anti-theft commands available in your Cloud Dashboard:"
echo "- 📍 Locate GPS coordinates"
echo "- 📸 Stealth camera capture"
echo "- 🔊 Ring loud emergency siren"
echo "- 🔒 Remote lock screen"
