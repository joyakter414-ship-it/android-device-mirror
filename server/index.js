const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

const {
  getDevices,
  getDeviceIp,
  enableWirelessMode,
  wakeScreen,
  pullFiles,
  runAdb
} = require('./adbManager');

const {
  getDriveUserInfo,
  createDriveFolder,
  uploadDirectoryRecursive
} = require('./driveManager');

const {
  setupPhoneBridge,
  startPcBridge,
  stopPcBridge,
  isPcBridgeRunning
} = require('./cloudflareBridge');

const { launchScrcpy } = require('./scrcpyRunner');

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'web')));

// Real-time Event Clients
let sseClients = [];
let lastDeviceState = { devices: [], status: 'WAITING_FOR_USB' };

// SSE Endpoint for real-time status streaming
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  // Send initial state immediately
  res.write(`data: ${JSON.stringify(lastDeviceState)}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

function broadcastState(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

// Background poller for ADB devices & status (runs every 1 second)
setInterval(async () => {
  try {
    const devRes = await getDevices();
    const devices = devRes.devices || [];

    let status = 'WAITING_FOR_USB';
    let authorizedDevice = null;
    let unauthorizedDevice = null;

    for (const d of devices) {
      if (d.state === 'device') {
        authorizedDevice = d;
      } else if (d.state === 'unauthorized') {
        unauthorizedDevice = d;
      }
    }

    if (authorizedDevice) {
      status = 'AUTHORIZED_READY';
    } else if (unauthorizedDevice) {
      status = 'UNAUTHORIZED_PROMPT_ACTIVE';
    }

    let wifiIp = null;
    if (authorizedDevice && !authorizedDevice.serial.includes(':5555')) {
      wifiIp = await getDeviceIp(authorizedDevice.serial);
    }

    lastDeviceState = {
      devices,
      status,
      authorizedSerial: authorizedDevice ? authorizedDevice.serial : null,
      unauthorizedSerial: unauthorizedDevice ? unauthorizedDevice.serial : null,
      wifiIp,
      pcBridgeRunning: isPcBridgeRunning(),
      timestamp: Date.now()
    };

    broadcastState(lastDeviceState);
  } catch (err) {
    // ignore polling error
  }
}, 1000);

// API: Get current status
app.get('/api/status', async (req, res) => {
  const driveUser = await getDriveUserInfo();
  res.json({
    ...lastDeviceState,
    driveUser: driveUser.user ? driveUser.user.emailAddress : null,
    driveQuota: driveUser.storageQuota || null
  });
});

// API: Wake phone screen
app.post('/api/wake', async (req, res) => {
  const { serial } = req.body;
  const result = await wakeScreen(serial);
  res.json(result);
});

// API: Switch to Wireless ADB (Wi-Fi)
app.post('/api/wireless', async (req, res) => {
  const { serial } = req.body;
  const targetSerial = serial || lastDeviceState.authorizedSerial;
  if (!targetSerial) {
    return res.status(400).json({ error: 'No authorized device connected' });
  }

  const result = await enableWirelessMode(targetSerial);
  res.json(result);
});

// API: Launch Scrcpy Screen Mirror
app.post('/api/scrcpy/launch', (req, res) => {
  const { target, maxFps, maxSize, bitrate, title, stayAwake } = req.body;
  const finalTarget = target || lastDeviceState.authorizedSerial;
  const result = launchScrcpy({
    target: finalTarget,
    maxFps: maxFps || 60,
    maxSize: maxSize || 1920,
    bitrate: bitrate || '12M',
    stayAwake: stayAwake !== false,
    title: title || 'Device Mirror (60 FPS)'
  });
  res.json(result);
});

// Active backup tracker
let activeBackup = null;

// API: Start Local Storage Backup
app.post('/api/backup/local', (req, res) => {
  const { serial, remotePath = '/sdcard/', targetDir } = req.body;
  const finalTarget = serial || lastDeviceState.authorizedSerial;
  if (!finalTarget) {
    return res.status(400).json({ error: 'No authorized device connected' });
  }

  const backupDir = targetDir || path.join(os.homedir(), 'Desktop', 'PhoneBackup', `backup_${Date.now()}`);

  activeBackup = {
    status: 'RUNNING',
    targetDir: backupDir,
    log: []
  };

  pullFiles(
    finalTarget,
    remotePath,
    backupDir,
    (data) => {
      if (activeBackup) {
        activeBackup.log.push(data.trim());
        if (activeBackup.log.length > 50) activeBackup.log.shift();
      }
    },
    (success) => {
      if (activeBackup) {
        activeBackup.status = success ? 'COMPLETED' : 'FAILED';
      }
    }
  );

  res.json({ success: true, targetDir: backupDir });
});

// API: Get Local Backup Status
app.get('/api/backup/status', (req, res) => {
  res.json(activeBackup || { status: 'IDLE' });
});

// API: Sync Local Backup to Google Drive
app.post('/api/backup/drive', async (req, res) => {
  const { localFolder } = req.body;
  const targetDir = localFolder || (activeBackup ? activeBackup.targetDir : null);

  if (!targetDir || !fs.existsSync(targetDir)) {
    return res.status(400).json({ error: 'Local backup directory not found or does not exist.' });
  }

  try {
    const folderName = `Phone Backup - ${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const driveFolder = await createDriveFolder(folderName);

    // Run upload in background
    (async () => {
      try {
        await uploadDirectoryRecursive(targetDir, driveFolder.id, (prog) => {
          broadcastState({ type: 'drive_progress', item: prog });
        });
        broadcastState({ type: 'drive_complete', folder: driveFolder });
      } catch (e) {
        broadcastState({ type: 'drive_error', error: e.message });
      }
    })();

    res.json({
      success: true,
      folderName,
      folderId: driveFolder.id,
      link: driveFolder.webViewLink
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Setup Phone Zero-App Bridge (Push websocat & start bridge)
app.post('/api/bridge/setup-phone', async (req, res) => {
  const { serial, workerUrl, token } = req.body;
  const targetSerial = serial || lastDeviceState.authorizedSerial;
  if (!targetSerial) {
    return res.status(400).json({ error: 'No authorized device connected via USB' });
  }

  const result = await setupPhoneBridge(targetSerial, workerUrl, token);
  res.json(result);
});

// API: Start Local PC/Mac Bridge
app.post('/api/bridge/start-pc', async (req, res) => {
  const { workerUrl, token, localPort = 5556 } = req.body;
  const result = startPcBridge(workerUrl, token, localPort);

  // Wait 1 second then attempt ADB connect
  setTimeout(async () => {
    await runAdb(`connect 127.0.0.1:${localPort}`);
  }, 1200);

  res.json(result);
});

// API: Stop Local PC/Mac Bridge
app.post('/api/bridge/stop-pc', (req, res) => {
  const stopped = stopPcBridge();
  res.json({ success: true, stopped });
});

// API: Deploy Cloudflare Worker
app.post('/api/bridge/deploy-worker', (req, res) => {
  const workerDir = path.join(__dirname, '..', 'worker');
  exec('export PATH=$PATH:/Users/akterhossain/.nvm/versions/node/v22.23.2/bin && npx wrangler deploy', { cwd: workerDir }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message, stderr });
    }
    res.json({ success: true, stdout });
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Device Mirror & Rescue Control Center is running!`);
  console.log(`👉 Open http://localhost:${PORT} in your browser`);
  console.log(`======================================================\n`);
});
