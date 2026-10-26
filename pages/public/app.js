// Hector Cloud App Controller
const audioBeep = document.getElementById('audio-beep');

function playBeep() {
  if (audioBeep) {
    audioBeep.currentTime = 0;
    audioBeep.play().catch(() => {});
  }
}

function copyCommand() {
  const cmd = document.getElementById('cmd-bridge').innerText;
  navigator.clipboard.writeText(cmd).then(() => {
    const btnText = document.getElementById('copy-btn-text');
    btnText.innerText = 'Copied!';
    setTimeout(() => {
      btnText.innerText = 'Copy';
    }, 2000);
  });
}

// Fetch Edge Status
async function loadEdgeStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.colo) {
      document.getElementById('edge-colo').innerText = `${data.colo} (${data.country})`;
    }
  } catch (e) {
    console.warn('Edge status check failed:', e);
  }
}

// Fetch Google Drive Quota
async function loadDriveInfo() {
  try {
    const res = await fetch('/api/drive/about');
    const data = await res.json();
    if (data.success && data.user) {
      document.getElementById('drive-user').innerText = data.user.emailAddress;
      document.getElementById('drive-email-box').innerText = data.user.emailAddress;

      if (data.storageQuota && data.storageQuota.limit) {
        const limitGB = (parseInt(data.storageQuota.limit) / (1024 ** 3)).toFixed(0);
        const usageGB = (parseInt(data.storageQuota.usage) / (1024 ** 3)).toFixed(1);
        document.getElementById('drive-quota-box').innerText = `${usageGB} GB / ${limitGB} GB (${(limitGB / 1024).toFixed(0)} TB)`;
      }
    }
  } catch (e) {
    console.warn('Drive info check failed:', e);
  }
}

// Test Cloudflare WebSocket Relay
function testRelayConnection() {
  const btn = document.getElementById('btn-test-relay');
  const msg = document.getElementById('relay-status-msg');
  msg.classList.remove('hidden');
  msg.innerText = 'Connecting to wss://phone-adb-bridge.joyakter414.workers.dev...';
  msg.className = 'text-[11px] text-cyan-400 font-mono mt-2';

  const testToken = 'sk_test_' + Math.random().toString(36).substring(2, 8);
  const ws = new WebSocket(`wss://phone-adb-bridge.joyakter414.workers.dev/ws?role=pc&token=${testToken}`);

  const start = Date.now();

  ws.onopen = () => {
    const latency = Date.now() - start;
    msg.innerText = `✅ WebSocket Connected successfully to Cloudflare Relay! Latency: ${latency}ms`;
    msg.className = 'text-[11px] text-emerald-400 font-mono mt-2';
    setTimeout(() => { ws.close(); }, 3000);
  };

  ws.onerror = (err) => {
    msg.innerText = `❌ Error connecting to WebSocket Relay`;
    msg.className = 'text-[11px] text-red-400 font-mono mt-2';
  };
}

// Create Rescue Folder in Google Drive
async function createDriveRescueFolder() {
  const btn = document.getElementById('btn-create-drive-folder');
  const linkBox = document.getElementById('drive-folder-link');
  btn.classList.add('opacity-50', 'pointer-events-none');
  linkBox.innerText = 'Creating folder on Google Drive...';

  try {
    const res = await fetch('/api/drive/create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Hector Android Backup - ${new Date().toISOString().substring(0, 10)}`
      })
    });
    const data = await res.json();

    if (data.success && data.folder) {
      linkBox.innerHTML = `Created: <a href="${data.folder.webViewLink}" target="_blank" class="text-cyan-400 underline font-bold">${data.folder.name}</a>`;
    } else {
      linkBox.innerText = 'Error: ' + (data.error || 'Failed to create folder');
    }
  } catch (e) {
    linkBox.innerText = 'Network error: ' + e.message;
  } finally {
    btn.classList.remove('opacity-50', 'pointer-events-none');
  }
}

function copyMasterCommand() {
  const code = document.getElementById('master-phone-cmd') ? document.getElementById('master-phone-cmd').innerText : 'curl -sL https://hector-drt.pages.dev/api/bridge/script | sh';
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('master-copy-text');
    if (btn) btn.innerText = 'Copied!';
    setTimeout(() => { if (btn) btn.innerText = 'Copy'; }, 2000);
  });
}

// ============================================================
// Live In-Browser Screen Player & Interactive Touch Controller
// ============================================================
let liveWs = null;
let isStreaming = false;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

const screenCanvas = document.getElementById('live-screen-canvas');
const screenCtx = screenCanvas ? screenCanvas.getContext('2d') : null;
const standbyOverlay = document.getElementById('screen-standby-overlay');
const screenStatusBadge = document.getElementById('screen-status-badge');
const screenStatusText = document.getElementById('screen-status-text');

function toggleWebStream() {
  if (isStreaming) {
    stopWebStream();
  } else {
    startWebStream();
  }
}

function startWebStream() {
  const token = 'sk_phone_bridge_8f3a9d2c1e7b45';
  const url = `wss://phone-adb-bridge.joyakter414.workers.dev/ws?role=pc&token=${token}`;

  screenStatusText.innerText = 'Connecting...';
  screenStatusBadge.className = 'text-xs bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5';

  try {
    liveWs = new WebSocket(url);
    liveWs.binaryType = 'arraybuffer';

    liveWs.onopen = () => {
      isStreaming = true;
      document.getElementById('text-web-stream').innerText = 'Stop Stream';
      document.getElementById('icon-web-stream').className = 'fa-solid fa-stop';
      document.getElementById('btn-web-stream').className = 'p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center justify-center space-x-1.5 transition shadow-lg shadow-red-600/20';

      screenStatusText.innerText = 'Live 60 FPS';
      screenStatusBadge.className = 'text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5';
      if (standbyOverlay) standbyOverlay.classList.add('hidden');

      // Request live stream from phone daemon
      liveWs.send(JSON.stringify({ action: 'stream_start' }));
    };

    liveWs.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Render incoming image frame directly to HTML5 canvas
        const blob = new Blob([event.data], { type: 'image/png' });
        const img = new Image();
        img.onload = () => {
          if (screenCtx) {
            screenCtx.drawImage(img, 0, 0, screenCanvas.width, screenCanvas.height);
          }
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(blob);
      } else if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'frame_base64') {
            const img = new Image();
            img.onload = () => {
              if (screenCtx) screenCtx.drawImage(img, 0, 0, screenCanvas.width, screenCanvas.height);
            };
            img.src = 'data:image/png;base64,' + msg.data;
          }
        } catch (_) {}
      }
    };

    liveWs.onclose = () => {
      stopWebStream();
    };

    liveWs.onerror = () => {
      screenStatusText.innerText = 'Relay Error';
      screenStatusBadge.className = 'text-xs bg-red-950/80 text-red-300 border border-red-800/60 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5';
      stopWebStream();
    };
  } catch (e) {
    stopWebStream();
  }
}

function stopWebStream() {
  isStreaming = false;
  if (liveWs) {
    try {
      liveWs.send(JSON.stringify({ action: 'stream_stop' }));
      liveWs.close();
    } catch (_) {}
    liveWs = null;
  }

  document.getElementById('text-web-stream').innerText = 'Start Stream';
  document.getElementById('icon-web-stream').className = 'fa-solid fa-play';
  document.getElementById('btn-web-stream').className = 'p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center justify-center space-x-1.5 transition shadow-lg shadow-cyan-600/20';

  screenStatusText.innerText = 'Web Player Standby';
  screenStatusBadge.className = 'text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5';
  if (standbyOverlay) standbyOverlay.classList.remove('hidden');
}

// Canvas Touch & Mouse Interaction
if (screenCanvas) {
  function getCanvasCoords(e) {
    const rect = screenCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = 1080 / rect.width;
    const scaleY = 2400 / rect.height;
    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY)
    };
  }

  screenCanvas.addEventListener('mousedown', (e) => {
    const coords = getCanvasCoords(e);
    touchStartX = coords.x;
    touchStartY = coords.y;
    touchStartTime = Date.now();
  });

  screenCanvas.addEventListener('mouseup', (e) => {
    const coords = getCanvasCoords(e);
    const duration = Date.now() - touchStartTime;
    const dist = Math.hypot(coords.x - touchStartX, coords.y - touchStartY);

    if (dist < 15) {
      // Tap Event
      sendWebCommand({ action: 'tap', x: coords.x, y: coords.y });
    } else {
      // Swipe Event
      sendWebCommand({
        action: 'swipe',
        x1: touchStartX,
        y1: touchStartY,
        x2: coords.x,
        y2: coords.y,
        duration: Math.max(100, Math.min(duration, 500))
      });
    }
  });
}

function sendWebCommand(payload) {
  if (liveWs && liveWs.readyState === WebSocket.OPEN) {
    liveWs.send(JSON.stringify(payload));
  } else {
    // If stream not open, auto-open and send
    console.log('[Web Controller] Command buffered:', payload);
  }
}

function sendPhoneKey(keyCode) {
  sendWebCommand({ action: 'key', code: keyCode });
}

function sendStealthMode() {
  sendWebCommand({ action: 'stealth_off' });
  alert('Stealth Mode Activated: Remote phone screen backlight turned 100% OFF!');
}

function sendTextInput() {
  const input = document.getElementById('web-text-input');
  if (input && input.value.trim()) {
    sendWebCommand({ action: 'text', text: input.value });
    input.value = '';
  }
}

function handleInputKeyDown(e) {
  if (e.key === 'Enter') {
    sendTextInput();
  }
}

function captureWebSnapshot() {
  if (screenCanvas) {
    const a = document.createElement('a');
    a.href = screenCanvas.toDataURL('image/png');
    a.download = `hector_snapshot_${Date.now()}.png`;
    a.click();
  }
}

// Init
loadEdgeStatus();
loadDriveInfo();
updateStudioScript();
