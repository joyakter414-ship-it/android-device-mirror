const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ADB_PATH, getDeviceAbi, runAdb } = require('./adbManager');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const WEBSOCAT_BIN = path.join(BIN_DIR, 'websocat');
const WEBSOCAT_WIN = path.join(BIN_DIR, 'websocat-win.exe');
const WEBSOCAT_ARM64 = path.join(BIN_DIR, 'websocat-android-aarch64');
const WEBSOCAT_ARMV7 = path.join(BIN_DIR, 'websocat-android-armv7');

let pcBridgeProcess = null;

async function setupPhoneBridge(serial, workerUrl = 'wss://phone-adb-bridge.joyakter414.workers.dev', token = 'sk_phone_bridge_8f3a9d2c1e7b45') {
  const prefix = serial ? `-s ${serial}` : '';
  const abi = await getDeviceAbi(serial);

  console.log(`[Bridge] Phone ABI detected: ${abi}`);
  const localBinary = abi.includes('64') ? WEBSOCAT_ARM64 : WEBSOCAT_ARMV7;

  if (!fs.existsSync(localBinary)) {
    return { success: false, error: `Static websocat binary not found at ${localBinary}` };
  }

  // 1. Push websocat binary to /data/local/tmp/websocat
  const pushRes = await runAdb(`${prefix} push "${localBinary}" /data/local/tmp/websocat`);
  if (!pushRes.success) {
    return { success: false, error: 'Failed to push websocat to phone: ' + pushRes.error };
  }

  // 2. Chmod +x
  await runAdb(`${prefix} shell chmod +x /data/local/tmp/websocat`);

  // 3. Make sure local adb TCP listening on port 5555 is enabled
  await runAdb(`${prefix} tcpip 5555`);

  // 4. Create bridge.sh script on phone
  const scriptContent = `#!/system/bin/sh
TOKEN="${token}"
WORKER_URL="${workerUrl.replace(/^http/, 'ws')}/ws?role=phone&token=$TOKEN"

while true; do
    /data/local/tmp/websocat -b -E --ping-interval 15 tcp:127.0.0.1:5555 "$WORKER_URL"
    sleep 2
done
`;

  const tmpScript = path.join(BIN_DIR, 'bridge_temp.sh');
  fs.writeFileSync(tmpScript, scriptContent, { mode: 0o755 });
  await runAdb(`${prefix} push "${tmpScript}" /data/local/tmp/bridge.sh`);
  await runAdb(`${prefix} shell chmod +x /data/local/tmp/bridge.sh`);
  try { fs.unlinkSync(tmpScript); } catch (_) {}

  // 5. Start background daemon
  const launchRes = await runAdb(`${prefix} shell "setsid /data/local/tmp/bridge.sh </dev/null >/dev/null 2>&1 &"`);

  return {
    success: true,
    message: 'Zero-App Cloudflare Bridge successfully activated on phone!',
    workerUrl,
    token
  };
}

function startPcBridge(workerUrl = 'wss://phone-adb-bridge.joyakter414.workers.dev', token = 'sk_phone_bridge_8f3a9d2c1e7b45', localPort = 5556) {
  if (pcBridgeProcess) {
    try { pcBridgeProcess.kill(); } catch (_) {}
    pcBridgeProcess = null;
  }

  const wsUrl = `${workerUrl.replace(/^http/, 'ws')}/ws?role=pc&token=${token}`;
  const bin = process.platform === 'win32' ? WEBSOCAT_WIN : WEBSOCAT_BIN;

  console.log(`[PC Bridge] Starting local bridge: ${bin} listening on port ${localPort}`);

  pcBridgeProcess = spawn(bin, [
    '-b',
    '-E',
    '--ping-interval', '15',
    `tcp-l:127.0.0.1:${localPort}`,
    wsUrl
  ]);

  pcBridgeProcess.stdout.on('data', d => console.log(`[PC Bridge] ${d}`));
  pcBridgeProcess.stderr.on('data', d => console.error(`[PC Bridge] ${d}`));

  pcBridgeProcess.on('close', code => {
    console.log(`[PC Bridge] Exited with code ${code}`);
    pcBridgeProcess = null;
  });

  return {
    success: true,
    localPort,
    endpoint: `127.0.0.1:${localPort}`,
    wsUrl
  };
}

function stopPcBridge() {
  if (pcBridgeProcess) {
    try { pcBridgeProcess.kill(); } catch (_) {}
    pcBridgeProcess = null;
    return true;
  }
  return false;
}

function isPcBridgeRunning() {
  return pcBridgeProcess !== null;
}

module.exports = {
  setupPhoneBridge,
  startPcBridge,
  stopPcBridge,
  isPcBridgeRunning
};
