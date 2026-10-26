// App State
let currentState = {
  status: 'WAITING_FOR_USB',
  authorizedSerial: null,
  unauthorizedSerial: null,
  wifiIp: null,
  pcBridgeRunning: false
};

let prevStatus = null;
const audioSuccess = document.getElementById('audio-success');

// Initialize Server-Sent Events (SSE)
function initEventStream() {
  const evtSource = new EventSource('/api/events');

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'drive_progress') {
        updateDriveProgress(data.item);
        return;
      }
      if (data.type === 'drive_complete') {
        finishDriveBackup(data.folder);
        return;
      }
      updateUI(data);
    } catch (e) {
      console.error('Error parsing event data:', e);
    }
  };

  evtSource.onerror = (err) => {
    console.warn('SSE connection lost, reconnecting...', err);
  };
}

function updateUI(state) {
  currentState = state;

  // Banner elements
  const banner = document.getElementById('device-banner');
  const icon = document.getElementById('banner-status-icon');
  const title = document.getElementById('banner-title');
  const badge = document.getElementById('banner-badge');
  const desc = document.getElementById('banner-desc');
  const wifiBadge = document.getElementById('wifi-ip-badge');

  // Check for transition to AUTHORIZED_READY to play audio
  if (state.status === 'AUTHORIZED_READY' && prevStatus !== 'AUTHORIZED_READY') {
    if (audioSuccess) {
      audioSuccess.play().catch(() => {});
    }
  }
  prevStatus = state.status;

  if (state.status === 'AUTHORIZED_READY') {
    banner.className = 'bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-6 transition-all duration-300 shadow-xl shadow-emerald-950/20 flex flex-col md:flex-row items-center justify-between gap-4';
    icon.className = 'w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-2xl';
    icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    title.innerText = `Phone Connected (${state.authorizedSerial})`;
    badge.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    badge.innerText = 'ONLINE & READY';
    desc.innerText = 'USB Debugging is fully authorized! You can now launch screen mirror or switch to Wi-Fi.';
  } else if (state.status === 'UNAUTHORIZED_PROMPT_ACTIVE') {
    banner.className = 'bg-amber-950/40 border border-amber-500/40 rounded-2xl p-6 transition-all duration-300 shadow-xl shadow-amber-950/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse';
    icon.className = 'w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 text-2xl';
    icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    title.innerText = 'Authorization Dialog Active!';
    badge.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40';
    badge.innerText = 'TAP SCREEN NOW';
    desc.innerText = 'Phone detected in unauthorized state. Tap 3-4 times in the lower-middle right quadrant on the black screen!';
  } else {
    banner.className = 'bg-gray-900/60 border border-gray-800 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4';
    icon.className = 'w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 text-2xl';
    icon.innerHTML = '<i class="fa-solid fa-mobile-screen"></i>';
    title.innerText = 'Searching for Android Phone...';
    badge.className = 'px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-800 text-gray-400 border border-gray-700';
    badge.innerText = 'DISCONNECTED';
    desc.innerText = 'Connect your phone using a USB cable. Make sure the phone is powered on.';
  }

  // Update Wi-Fi IP
  if (state.wifiIp) {
    wifiBadge.innerText = `IP: ${state.wifiIp}:5555`;
    wifiBadge.className = 'font-mono text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-1 rounded-md';
  } else if (state.authorizedSerial && state.authorizedSerial.includes(':5555')) {
    wifiBadge.innerText = `Connected: ${state.authorizedSerial}`;
    wifiBadge.className = 'font-mono text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-1 rounded-md';
  } else {
    wifiBadge.innerText = 'IP: Not Connected';
    wifiBadge.className = 'font-mono text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-md';
  }

  // Update PC Bridge Button Text
  const pcBridgeBtn = document.getElementById('txt-pc-bridge-btn');
  if (pcBridgeBtn) {
    pcBridgeBtn.innerText = state.pcBridgeRunning ? 'Stop PC Bridge' : 'Connect PC Bridge';
  }
}

// Button Listeners
document.getElementById('btn-wake-phone').addEventListener('click', async () => {
  const res = await fetch('/api/wake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  const data = await res.json();
  alert('Sent Wake Screen keyevent to phone.');
});

document.getElementById('btn-recheck-devices').addEventListener('click', async () => {
  const res = await fetch('/api/status');
  const data = await res.json();
  updateUI(data);
});

// Wireless Mode Switch
document.getElementById('btn-switch-wireless').addEventListener('click', async () => {
  if (currentState.status !== 'AUTHORIZED_READY') {
    alert('Please authorize USB Debugging first before switching to Wireless mode!');
    return;
  }
  const btn = document.getElementById('btn-switch-wireless');
  btn.classList.add('opacity-50', 'pointer-events-none');

  try {
    const res = await fetch('/api/wireless', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial: currentState.authorizedSerial })
    });
    const data = await res.json();

    if (data.success) {
      alert(`Success! Switched to Wireless ADB on ${data.endpoint}.\nYou can now safely unplug the USB cable!`);
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (e) {
    alert('Network error switching to wireless mode: ' + e.message);
  } finally {
    btn.classList.remove('opacity-50', 'pointer-events-none');
  }
});

// Launch Screen Mirror (Scrcpy)
document.getElementById('btn-launch-mirror').addEventListener('click', async () => {
  const fps = document.getElementById('sel-fps').value;
  const stayAwake = document.getElementById('chk-stay-awake').checked;

  const res = await fetch('/api/scrcpy/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target: currentState.authorizedSerial,
      maxFps: parseInt(fps),
      stayAwake
    })
  });
  const data = await res.json();
  if (!data.success) {
    alert('Failed to launch mirror: ' + (data.error || 'Unknown error'));
  }
});

// Local Storage Backup
document.getElementById('btn-backup-local').addEventListener('click', async () => {
  if (currentState.status !== 'AUTHORIZED_READY') {
    alert('Please connect and authorize your phone first!');
    return;
  }

  const box = document.getElementById('backup-progress-box');
  const log = document.getElementById('backup-log');
  box.classList.remove('hidden');
  log.innerText = 'Starting offline backup of /sdcard/...';

  const res = await fetch('/api/backup/local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial: currentState.authorizedSerial })
  });
  const data = await res.json();

  if (data.success) {
    log.innerText = `Pulling files to: ${data.targetDir}`;
  } else {
    alert('Backup error: ' + data.error);
  }
});

// Google Drive Sync
document.getElementById('btn-backup-drive').addEventListener('click', async () => {
  const box = document.getElementById('backup-progress-box');
  const log = document.getElementById('backup-log');
  const statusText = document.getElementById('backup-status-text');
  box.classList.remove('hidden');
  statusText.innerText = 'Uploading rescued files to Google Drive...';
  log.innerText = 'Creating Google Drive folder for joyakter414@gmail.com...';

  try {
    const res = await fetch('/api/backup/drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();

    if (data.success) {
      log.innerHTML = `Created Drive folder: <a href="${data.link}" target="_blank" class="text-cyan-400 underline font-bold">${data.folderName}</a>`;
    } else {
      alert('Google Drive backup error: ' + data.error);
    }
  } catch (e) {
    alert('Error syncing to Drive: ' + e.message);
  }
});

function updateDriveProgress(item) {
  const log = document.getElementById('backup-log');
  if (log) {
    log.innerText = `Uploaded: ${item.name} (${item.type})`;
  }
}

function finishDriveBackup(folder) {
  const log = document.getElementById('backup-log');
  const statusText = document.getElementById('backup-status-text');
  if (statusText) statusText.innerText = 'Google Drive Backup Complete!';
  if (log && folder) {
    log.innerHTML = `All files synced! Open in Drive: <a href="${folder.webViewLink}" target="_blank" class="text-emerald-400 font-bold underline">${folder.name}</a>`;
  }
}

// Zero-App Cloudflare Bridge: Step 1 (Setup Phone)
document.getElementById('btn-bridge-setup-phone').addEventListener('click', async () => {
  if (currentState.status !== 'AUTHORIZED_READY') {
    alert('Phone must be authorized over USB first to inject the bridge binary!');
    return;
  }

  const workerUrl = document.getElementById('cfg-worker-url').value;
  const token = document.getElementById('cfg-token').value;

  const res = await fetch('/api/bridge/setup-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serial: currentState.authorizedSerial,
      workerUrl,
      token
    })
  });
  const data = await res.json();

  if (data.success) {
    alert('SUCCESS!\nWebsocat pushed and bridge daemon launched on phone.\nThe phone is now connected to Cloudflare Worker relay!');
  } else {
    alert('Error: ' + data.error);
  }
});

// Zero-App Cloudflare Bridge: Step 2 (Connect PC)
document.getElementById('btn-bridge-start-pc').addEventListener('click', async () => {
  const workerUrl = document.getElementById('cfg-worker-url').value;
  const token = document.getElementById('cfg-token').value;

  if (currentState.pcBridgeRunning) {
    await fetch('/api/bridge/stop-pc', { method: 'POST' });
    alert('PC Bridge stopped.');
    return;
  }

  const res = await fetch('/api/bridge/start-pc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workerUrl, token })
  });
  const data = await res.json();

  if (data.success) {
    alert(`Local Bridge started on 127.0.0.1:5556 and connected to Cloudflare Worker relay!`);
  } else {
    alert('Error starting PC bridge');
  }
});

// Zero-App Cloudflare Bridge: Step 3 (Launch Remote Mirror)
document.getElementById('btn-bridge-launch-mirror').addEventListener('click', async () => {
  const res = await fetch('/api/scrcpy/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target: '127.0.0.1:5556',
      maxFps: 60,
      title: 'Phone (Remote Internet Bridge via Cloudflare)'
    })
  });
  const data = await res.json();
  if (!data.success) {
    alert('Could not launch remote mirror: ' + (data.error || 'Unknown error'));
  }
});

// Generate Token
document.getElementById('btn-new-token').addEventListener('click', () => {
  const rand = 'sk_bridge_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  document.getElementById('cfg-token').value = rand;
});

// Start listening immediately
initEventStream();
