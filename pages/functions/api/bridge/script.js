export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || 'sk_phone_bridge_8f3a9d2c1e7b45';
  const relayUrl = 'wss://phone-adb-bridge.joyakter414.workers.dev/ws';

  const script = `#!/system/bin/sh
# ============================================================
#  Hector Device Mirror - Zero-App Cloudflare Bridge Injector
#  Cloud Host: hector-drt.pages.dev
# ============================================================
echo ">>> Initializing Hector Zero-App Cloud Bridge on Device..."

# 1. Detect Architecture
ABI=$(getprop ro.product.cpu.abi)
echo "Phone CPU ABI: $ABI"

if [ "$ABI" = "arm64-v8a" ]; then
    BINARY_URL="https://github.com/vi/websocat/releases/download/v1.13.0/websocat.aarch64-linux-android"
else
    BINARY_URL="https://github.com/vi/websocat/releases/download/v1.13.0/websocat.armv7-linux-androideabi"
fi

# 2. Download precompiled static websocat if missing
if [ ! -f /data/local/tmp/websocat ] || [ ! -s /data/local/tmp/websocat ]; then
    echo "Downloading static websocat binary to /data/local/tmp/websocat..."
    curl -k -L -o /data/local/tmp/websocat "$BINARY_URL" 2>/dev/null || wget -q -O /data/local/tmp/websocat "$BINARY_URL"
    chmod 755 /data/local/tmp/websocat
fi

# 3. Apply Keep-Awake Settings
echo "Applying Keep-Awake settings..."
settings put global stay_on_while_plugged_in 7 2>/dev/null
settings put system screen_off_timeout 1800000 2>/dev/null

# 4. Ensure ADB listens on TCP port 5555
setprop service.adb.tcp.port 5555
stop adbd 2>/dev/null
start adbd 2>/dev/null

# 5. Create Bridge Daemon
cat << 'EOF' > /data/local/tmp/hector_bridge.sh
#!/system/bin/sh
TOKEN="${token}"
TARGET="${relayUrl}?role=phone&token=$TOKEN"

while true; do
    /data/local/tmp/websocat -b -E --ping-interval 15 tcp:127.0.0.1:5555 "$TARGET"
    sleep 2
done
EOF

chmod 755 /data/local/tmp/hector_bridge.sh

# 6. Launch detached background runner
setsid /data/local/tmp/hector_bridge.sh </dev/null >/dev/null 2>&1 &

echo ""
echo "🎉 HECTOR CLOUD BRIDGE IS ACTIVE!"
echo "Connected to: ${relayUrl}?role=phone"
echo "Security Token: ${token}"
echo "You can now control this phone from https://hector-drt.pages.dev"
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
