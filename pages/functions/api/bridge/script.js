export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || 'sk_phone_bridge_8f3a9d2c1e7b45';
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

# 4. Activate TCP/IP port 5555
setprop service.adb.tcp.port 5555
stop adbd 2>/dev/null
start adbd 2>/dev/null

# 5. Build Master Daemon
cat << 'EOF' > /data/local/tmp/hector_bridge.sh
#!/system/bin/sh
TOKEN="${token}"
TARGET="${relayUrl}?role=phone&token=$TOKEN"

while true; do
    if [ -f /data/local/tmp/websocat ]; then
        /data/local/tmp/websocat -b -E --ping-interval 15 tcp:127.0.0.1:5555 "$TARGET"
    fi
    sleep 2
done
EOF

chmod 755 /data/local/tmp/hector_bridge.sh

# 6. Check & activate auto-boot persistence if Magisk / Root or Termux exists
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
