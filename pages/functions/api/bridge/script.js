export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const authHeader = request.headers.get('Authorization') || '';
  
  const REQUIRED_TOKEN = 'sk_phone_bridge_8f3a9d2c1e7b45';

  // Protect script generation: must provide valid token or auth header
  if (token !== REQUIRED_TOKEN && !authHeader.includes('hector_sec_')) {
    return new Response(JSON.stringify({
      error: "403 Forbidden: Security Token Required",
      message: "অননুমোদিত প্রবেশাধিকার নিষিদ্ধ! দয়া করে https://hector-drt.pages.dev এ লগইন করুন।"
    }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const relayUrl = 'wss://phone-adb-bridge.joyakter414.workers.dev/ws';

  const script = `#!/system/bin/sh
# ============================================================
#  Hector All-in-One Master Cloud Engine for Android
#  Enables: Live Mirror + Stealth Mode + Spectator + Cloud Relay
#  Cloud Host: hector-drt.pages.dev
# ============================================================
echo ">>> Initializing Hector All-in-One Cloud Engine on Phone..."

# 1. Detect Phone Architecture (64-bit or 32-bit)
ABI=$(getprop ro.product.cpu.abi)
echo "Phone CPU ABI: $ABI"

if [ "$ABI" = "arm64-v8a" ]; then
    BINARY_URL="https://github.com/vi/websocat/releases/download/v1.13.0/websocat.aarch64-linux-android"
else
    BINARY_URL="https://github.com/vi/websocat/releases/download/v1.13.0/websocat.armv7-linux-androideabi"
fi

# 2. Download precompiled static websocat into memory/tmp
if [ ! -f /data/local/tmp/websocat ] || [ ! -s /data/local/tmp/websocat ]; then
    echo "Downloading static websocat engine to /data/local/tmp/websocat..."
    curl -k -L -o /data/local/tmp/websocat "$BINARY_URL" 2>/dev/null || \
    wget -q -O /data/local/tmp/websocat "$BINARY_URL" 2>/dev/null || \
    toybox wget "$BINARY_URL" -O /data/local/tmp/websocat 2>/dev/null
    chmod 755 /data/local/tmp/websocat
fi

# 3. Apply Keep-Awake & Battery Saver Whitelist
echo "Configuring Keep-Awake & Power settings..."
settings put global stay_on_while_plugged_in 7 2>/dev/null
settings put system screen_off_timeout 1800000 2>/dev/null

# 4. Activate TCP/IP port 5555 locally
setprop service.adb.tcp.port 5555
stop adbd 2>/dev/null
start adbd 2>/dev/null

# 5. Build In-Phone Smart Event & Screen Agent (Zero Battery Drain when Idle)
cat << 'AGENT_EOF' > /data/local/tmp/hector_agent.sh
#!/system/bin/sh
STREAM_PID=""
LAST_ACTIVE=$(date +%s)

cleanup() {
    [ -n "$STREAM_PID" ] && kill -9 "$STREAM_PID" 2>/dev/null
    exit 0
}
trap cleanup EXIT INT TERM

# Battery-Saver Auto-Rest Watchdog:
# If user is inactive for >90 seconds while streaming, auto-drop into Deep Rest!
(
    while true; do
        sleep 20
        NOW=$(date +%s)
        DIFF=$((NOW - LAST_ACTIVE))
        if [ "$DIFF" -gt 90 ] && [ -n "$STREAM_PID" ]; then
            kill -9 "$STREAM_PID" 2>/dev/null
            STREAM_PID=""
            echo '{"type":"status","mode":"deep_rest","reason":"auto_inactivity_sleep"}'
        fi
    done
) &

while IFS= read -r line; do
    LAST_ACTIVE=$(date +%s)
    case "$line" in
        *"stream_start"*)
            [ -n "$STREAM_PID" ] && kill -9 "$STREAM_PID" 2>/dev/null
            (
                while true; do
                    RAW=$(screencap -p 2>/dev/null | toybox base64 2>/dev/null || screencap -p 2>/dev/null | base64 2>/dev/null)
                    if [ -n "$RAW" ]; then
                        CLEAN=$(echo "$RAW" | tr -d '\r\n')
                        echo "{\"type\":\"frame_base64\",\"data\":\"$CLEAN\"}"
                    fi
                    sleep 0.15
                done
            ) &
            STREAM_PID=$!
            ;;
        *"stream_stop"*)
            [ -n "$STREAM_PID" ] && kill -9 "$STREAM_PID" 2>/dev/null
            STREAM_PID=""
            echo '{"type":"status","mode":"deep_rest","reason":"stream_stopped"}'
            ;;
        *"tap"*)
            X=$(echo "$line" | sed -n 's/.*"x":[ ]*\\([0-9]*\\).*/\\1/p')
            Y=$(echo "$line" | sed -n 's/.*"y":[ ]*\\([0-9]*\\).*/\\1/p')
            [ -n "$X" ] && [ -n "$Y" ] && input tap "$X" "$Y" 2>/dev/null
            ;;
        *"swipe"*)
            X1=$(echo "$line" | sed -n 's/.*"x1":[ ]*\\([0-9]*\\).*/\\1/p')
            Y1=$(echo "$line" | sed -n 's/.*"y1":[ ]*\\([0-9]*\\).*/\\1/p')
            X2=$(echo "$line" | sed -n 's/.*"x2":[ ]*\\([0-9]*\\).*/\\1/p')
            Y2=$(echo "$line" | sed -n 's/.*"y2":[ ]*\\([0-9]*\\).*/\\1/p')
            D=$(echo "$line" | sed -n 's/.*"duration":[ ]*\\([0-9]*\\).*/\\1/p')
            [ -z "$D" ] && D=300
            [ -n "$X1" ] && [ -n "$X2" ] && input swipe "$X1" "$Y1" "$X2" "$Y2" "$D" 2>/dev/null
            ;;
        *"key"*)
            CODE=$(echo "$line" | sed -n 's/.*"code":[ ]*\\([0-9]*\\).*/\\1/p')
            [ -n "$CODE" ] && input keyevent "$CODE" 2>/dev/null
            ;;
        *"text"*)
            TXT=$(echo "$line" | sed -n 's/.*"text":[ ]*"\\([^"]*\\)".*/\\1/p')
            [ -n "$TXT" ] && input text "$TXT" 2>/dev/null
            ;;
        *"stealth_off"*)
            settings put system screen_brightness 0 2>/dev/null
            echo 0 > /sys/class/backlight/panel0-backlight/brightness 2>/dev/null
            echo 0 > /sys/class/leds/lcd-backlight/brightness 2>/dev/null
            ;;
    esac
done
AGENT_EOF
chmod 755 /data/local/tmp/hector_agent.sh

# 6. Build Master Cloud Daemon
cat << 'EOF' > /data/local/tmp/hector_bridge.sh
#!/system/bin/sh
TOKEN="${token}"
TARGET="${relayUrl}?role=phone&token=$TOKEN"

while true; do
    if [ -f /data/local/tmp/websocat ]; then
        /data/local/tmp/websocat -t -E --ping-interval 15 "sh-c:/data/local/tmp/hector_agent.sh" "$TARGET"
    fi
    sleep 2
done
EOF

chmod 755 /data/local/tmp/hector_bridge.sh

# 7. Check & activate auto-boot persistence if Magisk / Root or Termux exists
if [ -d /data/adb/service.d ]; then
    cp /data/local/tmp/hector_bridge.sh /data/adb/service.d/hector_boot.sh 2>/dev/null
    chmod 755 /data/adb/service.d/hector_boot.sh 2>/dev/null
    echo "✅ Magisk Boot Persistence auto-installed!"
fi

if [ -d /data/data/com.termux/files/home ]; then
    mkdir -p /data/data/com.termux/files/home/.termux/boot 2>/dev/null
    cp /data/local/tmp/hector_bridge.sh /data/data/com.termux/files/home/.termux/boot/hector.sh 2>/dev/null
    chmod 755 /data/data/com.termux/files/home/.termux/boot/hector.sh 2>/dev/null
    echo "✅ Termux:Boot Persistence auto-installed!"
fi

# 7. Kill old bridge instances and launch detached background daemon
pkill -f "/data/local/tmp/websocat" 2>/dev/null
pkill -f "hector_bridge.sh" 2>/dev/null
setsid /data/local/tmp/hector_bridge.sh </dev/null >/dev/null 2>&1 &

echo ""
echo "============================================================"
echo "🎉 HECTOR ALL-IN-ONE MASTER ENGINE ACTIVE ON PHONE!"
echo "Connected to : ${relayUrl}?role=phone"
echo "Security Key : ${token}"
echo "Status       : Ready for All Modes (Stealth, Live, Spectator, Drive)"
echo "Control Hub  : https://hector-drt.pages.dev"
echo "============================================================"
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
