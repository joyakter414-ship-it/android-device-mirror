const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Use bundled ADB if available, fallback to system adb
const BUNDLED_ADB = path.join(__dirname, '..', 'bin', 'adb');
const ADB_PATH = fs.existsSync(BUNDLED_ADB) ? BUNDLED_ADB : 'adb';

function runAdb(args, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const cmd = `"${ADB_PATH}" ${args}`;
    exec(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        return resolve({ success: false, error: error.message, stderr, stdout });
      }
      resolve({ success: true, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function getDevices() {
  const res = await runAdb('devices -l');
  if (!res.success) {
    return { error: res.error, devices: [] };
  }

  const lines = res.stdout.split('\n').map(l => l.trim()).filter(Boolean);
  const devices = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\S+)\s+(\S+)(.*)$/);
    if (match) {
      const serial = match[1];
      const state = match[2]; // 'device', 'unauthorized', 'offline'
      const info = match[3].trim();
      devices.push({ serial, state, info });
    }
  }

  return { devices, raw: res.stdout };
}

async function getDeviceIp(serial) {
  const prefix = serial ? `-s ${serial}` : '';
  // Try wlan0 first
  const res = await runAdb(`${prefix} shell "ip -f inet addr show wlan0 || ip route"`);
  if (!res.success) return null;

  const match = res.stdout.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
  if (match) return match[1];

  // Fallback: look for 192.168.x.x or 10.x.x.x
  const ipMatch = res.stdout.match(/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)/);
  return ipMatch ? ipMatch[1] : null;
}

async function getDeviceAbi(serial) {
  const prefix = serial ? `-s ${serial}` : '';
  const res = await runAdb(`${prefix} shell getprop ro.product.cpu.abi`);
  if (res.success && res.stdout) {
    return res.stdout.trim();
  }
  return 'arm64-v8a'; // default modern Android
}

async function enableWirelessMode(serial) {
  const ip = await getDeviceIp(serial);
  if (!ip) {
    return { success: false, error: 'Could not detect phone Wi-Fi IP address. Ensure phone is connected to Wi-Fi.' };
  }

  const prefix = serial ? `-s ${serial}` : '';
  const tcpRes = await runAdb(`${prefix} tcpip 5555`);
  if (!tcpRes.success) {
    return { success: false, error: 'Failed to switch ADB to TCP/IP 5555: ' + tcpRes.error };
  }

  // Wait 1.5 seconds for port to open
  await new Promise(r => setTimeout(r, 1500));

  // Connect via IP
  const connRes = await runAdb(`connect ${ip}:5555`);

  // Apply Keep-Awake Settings
  await runAdb(`-s ${ip}:5555 shell settings put global stay_on_while_plugged_in 7`);
  await runAdb(`-s ${ip}:5555 shell settings put system screen_off_timeout 1800000`);

  return {
    success: true,
    ip,
    port: 5555,
    endpoint: `${ip}:5555`,
    output: connRes.stdout
  };
}

async function wakeScreen(serial) {
  const prefix = serial ? `-s ${serial}` : '';
  // Press Power and Menu keys to wake & unlock
  await runAdb(`${prefix} shell input keyevent 26`);
  await runAdb(`${prefix} shell input keyevent 82`);
  return { success: true };
}

function pullFiles(serial, remotePath, localDir, onData, onDone) {
  const prefix = serial ? ['-s', serial] : [];
  const args = [...prefix, 'pull', remotePath, localDir];

  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const child = spawn(ADB_PATH, args);

  child.stdout.on('data', (d) => {
    if (onData) onData(d.toString());
  });

  child.stderr.on('data', (d) => {
    if (onData) onData(d.toString());
  });

  child.on('close', (code) => {
    if (onDone) onDone(code === 0);
  });

  return child;
}

module.exports = {
  ADB_PATH,
  runAdb,
  getDevices,
  getDeviceIp,
  getDeviceAbi,
  enableWirelessMode,
  wakeScreen,
  pullFiles
};
