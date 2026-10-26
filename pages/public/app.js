// ============================================================
// Hector Authentication & Security Gatekeeper
// ============================================================
const AUTH_KEY = 'hector_sec_token';
const AUTH_EMAIL = 'hector_sec_email';

function checkAuthStatus() {
  const token = localStorage.getItem(AUTH_KEY);
  const authGate = document.getElementById('auth-gate');
  const dashboard = document.getElementById('dashboard-wrapper');
  const btnLogout = document.getElementById('btn-logout');

  if (token) {
    if (authGate) authGate.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.remove('hidden');
    loadEdgeStatus();
    loadDriveInfo();
  } else {
    if (authGate) authGate.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
    if (btnLogout) btnLogout.classList.add('hidden');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const errBox = document.getElementById('auth-error-box');
  const errText = document.getElementById('auth-error-msg');
  const submitBtn = document.getElementById('btn-login-submit');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value.trim() : '';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Verifying...</span>';
  }
  if (errBox) errBox.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      localStorage.setItem(AUTH_KEY, data.token);
      localStorage.setItem(AUTH_EMAIL, data.user ? data.user.email : email);
      checkAuthStatus();
    } else {
      if (errBox) {
        errText.innerText = data.error || 'ভুল ইমেইল বা পাসওয়ার্ড! অ্যাক্সেস ডিনাইড।';
        errBox.classList.remove('hidden');
      }
    }
  } catch (err) {
    if (errBox) {
      errText.innerText = 'সার্ভার যোগাযোগে সমস্যা: ' + err.message;
      errBox.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i><span>Unlock Hector Dashboard</span>';
    }
  }
}

function handleLogout() {
  if (isStreaming) {
    stopWebStream();
  }
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_EMAIL);
  checkAuthStatus();
}

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
let phoneWidth = 1080;
let phoneHeight = 2400;
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
          if (img.naturalWidth && img.naturalHeight) {
            phoneWidth = img.naturalWidth;
            phoneHeight = img.naturalHeight;
            if (screenCanvas.width !== phoneWidth) screenCanvas.width = phoneWidth;
            if (screenCanvas.height !== phoneHeight) screenCanvas.height = phoneHeight;
          }
          if (screenCtx) {
            screenCtx.drawImage(img, 0, 0);
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
              if (img.naturalWidth && img.naturalHeight) {
                phoneWidth = img.naturalWidth;
                phoneHeight = img.naturalHeight;
                if (screenCanvas.width !== phoneWidth) screenCanvas.width = phoneWidth;
                if (screenCanvas.height !== phoneHeight) screenCanvas.height = phoneHeight;
              }
              if (screenCtx) screenCtx.drawImage(img, 0, 0);
            };
            img.src = 'data:image/png;base64,' + msg.data;
          } else if (msg.type === 'audio_chunk') {
            handleIncomingAudioChunk(msg);
          } else if (msg.type === 'cam_frame') {
            handleIncomingCameraFrame(msg);
          } else if (msg.type === 'stealth_status') {
            isStealthActive = !!msg.active;
            updateStealthUI(isStealthActive);
            if (msg.reason === 'power_button_locked' || msg.reason === 'physical_power_press') {
              showStealthAlertBanner('মোবাইলের ফিজিক্যাল পাওয়ার বাটন বা স্ক্রিন ওয়েক সনাক্ত হয়েছে! ফোন স্বয়ংক্রিয়ভাবে লক স্ক্রিন (Lock Screen)-এ চলে গেছে।');
            }
          } else if (msg.type === 'alert') {
            showStealthAlertBanner(msg.message || 'ডিভাইস থেকে সতর্কতা সংকেত এসেছে।');
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
  if (isAudioStreaming) {
    stopLiveAudioStream();
  }
  if (isCamStreaming) {
    stopLiveCameraStream();
  }
  isStreaming = false;
  if (liveWs) {
    try {
      liveWs.send(JSON.stringify({ action: 'stream_stop', reason: 'user_stopped' }));
      liveWs.close();
    } catch (_) {}
    liveWs = null;
  }

  document.getElementById('text-web-stream').innerText = 'Start Stream';
  document.getElementById('icon-web-stream').className = 'fa-solid fa-play';
  document.getElementById('btn-web-stream').className = 'p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center justify-center space-x-1.5 transition shadow-lg shadow-cyan-600/20';

  screenStatusText.innerText = 'Deep Rest (0% Battery)';
  screenStatusBadge.className = 'text-xs bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5';
  if (standbyOverlay) standbyOverlay.classList.remove('hidden');
}

// Auto-sleep phone stream when browser tab is minimized or backgrounded
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isStreaming) {
    stopWebStream();
  }
});

// Auto-sleep when tab/browser is closed
window.addEventListener('beforeunload', () => {
  if (liveWs) {
    try {
      liveWs.send(JSON.stringify({ action: 'stream_stop', reason: 'browser_closed' }));
      liveWs.close();
    } catch (_) {}
  }
});

// 100% Natural Touch, Mouse & Click Handling (Like touching real phone)
if (screenCanvas) {
  function getCanvasCoords(e) {
    const rect = screenCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    const clientY = e.touches ? e.touches[0].clientY : (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
    const scaleX = phoneWidth / rect.width;
    const scaleY = phoneHeight / rect.height;
    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY)
    };
  }

  const handlePointerDown = (e) => {
    const coords = getCanvasCoords(e);
    touchStartX = coords.x;
    touchStartY = coords.y;
    touchStartTime = Date.now();
  };

  const handlePointerUp = (e) => {
    const coords = getCanvasCoords(e);
    const duration = Date.now() - touchStartTime;
    const dist = Math.hypot(coords.x - touchStartX, coords.y - touchStartY);

    if (dist < 15) {
      // Direct Tap anywhere on phone screen (apps, icons, keyboard letters)
      sendWebCommand({ action: 'tap', x: coords.x, y: coords.y });
    } else {
      // Natural Swipe / Scroll
      sendWebCommand({
        action: 'swipe',
        x1: touchStartX,
        y1: touchStartY,
        x2: coords.x,
        y2: coords.y,
        duration: Math.max(100, Math.min(duration, 500))
      });
    }
  };

  screenCanvas.addEventListener('mousedown', handlePointerDown);
  screenCanvas.addEventListener('mouseup', handlePointerUp);
  screenCanvas.addEventListener('touchstart', handlePointerDown, { passive: true });
  screenCanvas.addEventListener('touchend', handlePointerUp, { passive: true });
}

// Seamless Keyboard typing without any input box (press Backspace, Enter, Space, or letters directly!)
window.addEventListener('keydown', (e) => {
  if (!isStreaming) return;
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;

  if (e.key === 'Backspace') {
    sendPhoneKey(67); // KEYCODE_DEL
    e.preventDefault();
  } else if (e.key === 'Enter') {
    sendPhoneKey(66); // KEYCODE_ENTER
    e.preventDefault();
  } else if (e.key === ' ' || e.key === 'Spacebar') {
    sendPhoneKey(62); // KEYCODE_SPACE
    e.preventDefault();
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    sendWebCommand({ action: 'text', text: e.key });
  }
});

function sendWebCommand(payload) {
  if (liveWs && liveWs.readyState === WebSocket.OPEN) {
    liveWs.send(JSON.stringify(payload));
  } else {
    console.log('[Web Controller] Command buffered:', payload);
  }
}

function sendPhoneKey(keyCode) {
  sendWebCommand({ action: 'key', code: keyCode });
}

// ============================================================
// Stealth Mode (100% Black Physical Display) Controller
// ============================================================
let isStealthActive = false;

function toggleStealthMode() {
  isStealthActive = !isStealthActive;
  updateStealthUI(isStealthActive);

  if (isStealthActive) {
    sendWebCommand({ action: 'stealth_enable' });
  } else {
    sendWebCommand({ action: 'stealth_disable' });
  }
}

function updateStealthUI(active) {
  const btn = document.getElementById('btn-stealth-mode');
  const icon = document.getElementById('icon-stealth-mode');
  const text = document.getElementById('text-stealth-mode');
  const badge = document.getElementById('stealth-active-badge');

  if (active) {
    if (btn) {
      btn.className = 'p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 border border-purple-400 text-white font-bold flex items-center justify-center space-x-1.5 transition shadow-lg shadow-purple-600/40';
    }
    if (icon) icon.className = 'fa-solid fa-eye-slash text-xs animate-pulse';
    if (text) text.innerText = 'Stealth ON';
    if (badge) badge.classList.remove('hidden');
  } else {
    if (btn) {
      btn.className = 'p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-medium flex items-center justify-center space-x-1 transition';
    }
    if (icon) icon.className = 'fa-solid fa-eye text-xs text-gray-400';
    if (text) text.innerText = 'Stealth OFF';
    if (badge) badge.classList.add('hidden');
  }
}

function sendStealthMode() {
  toggleStealthMode();
}

function showStealthAlertBanner(message) {
  const alertEl = document.getElementById('stealth-security-alert');
  const alertText = document.getElementById('stealth-security-alert-text');
  if (alertText && message) {
    alertText.innerText = message;
  }
  if (alertEl) {
    alertEl.classList.remove('hidden');
  }
  // Optional audible warning chime
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (_) {}
}

function captureWebSnapshot() {
  if (screenCanvas) {
    const a = document.createElement('a');
    a.href = screenCanvas.toDataURL('image/png');
    a.download = `hector_snapshot_${Date.now()}.png`;
    a.click();
  }
}

// ============================================================
// Continuous Live Audio Stream Engine (Plays Until Clicked OFF)
// ============================================================
let isAudioStreaming = false;
const audioQueue = [];
let isPlayingAudioQueue = false;
let currentPlayingAudio = null;

function toggleLiveAudioStream() {
  if (isAudioStreaming) {
    stopLiveAudioStream();
  } else {
    startLiveAudioStream();
  }
}

function startLiveAudioStream() {
  isAudioStreaming = true;
  if (!isStreaming) {
    startWebStream();
  }

  const btn = document.getElementById('btn-audio-stream');
  const icon = document.getElementById('icon-audio-stream');
  const text = document.getElementById('text-audio-stream');
  const banner = document.getElementById('audio-playback-banner');

  if (btn) {
    btn.className = 'p-2.5 rounded-xl bg-red-950/90 hover:bg-red-900 border border-red-700/80 text-red-200 font-semibold flex items-center justify-center space-x-1.5 transition shadow-lg shadow-red-950/40';
    if (icon) icon.className = 'fa-solid fa-microphone-slash text-red-400 animate-pulse';
    if (text) text.innerText = 'Stop Audio';
  }

  if (banner) banner.classList.remove('hidden');

  // Sync Live Cam Audio toggle if visible
  const btnCam = document.getElementById('btn-cam-audio');
  const iconCam = document.getElementById('icon-cam-audio');
  const textCam = document.getElementById('text-cam-audio');
  if (btnCam) btnCam.className = 'px-2 py-0.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[10px] font-semibold border border-emerald-600/80 transition flex items-center space-x-1 shadow-sm';
  if (iconCam) iconCam.className = 'fa-solid fa-volume-high text-emerald-400 animate-pulse';
  if (textCam) textCam.innerText = 'Audio ON';

  sendWebCommand({ action: 'audio_stream_start' });
}

function stopLiveAudioStream() {
  isAudioStreaming = false;
  audioQueue.length = 0; // Clear queue
  if (currentPlayingAudio) {
    try { currentPlayingAudio.pause(); } catch (_) {}
    currentPlayingAudio = null;
  }
  isPlayingAudioQueue = false;

  const btn = document.getElementById('btn-audio-stream');
  const icon = document.getElementById('icon-audio-stream');
  const text = document.getElementById('text-audio-stream');
  const banner = document.getElementById('audio-playback-banner');

  if (btn) {
    btn.className = 'p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-medium flex items-center justify-center space-x-1.5 transition';
    if (icon) icon.className = 'fa-solid fa-microphone-lines text-emerald-400';
    if (text) text.innerText = 'Live Audio';
  }

  if (banner) banner.classList.add('hidden');

  // Sync Live Cam Audio toggle if visible
  const btnCam = document.getElementById('btn-cam-audio');
  const iconCam = document.getElementById('icon-cam-audio');
  const textCam = document.getElementById('text-cam-audio');
  if (btnCam) btnCam.className = 'px-2 py-0.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 text-[10px] font-semibold border border-gray-800 transition flex items-center space-x-1';
  if (iconCam) iconCam.className = 'fa-solid fa-volume-xmark';
  if (textCam) textCam.innerText = 'Audio OFF';

  sendWebCommand({ action: 'audio_stream_stop' });
}

function handleIncomingAudioChunk(msg) {
  if (!isAudioStreaming || !msg.data) return;

  const audioUrl = `data:${msg.mime || 'audio/wav'};base64,${msg.data}`;
  const chunkAudio = new Audio(audioUrl);

  // Buffer maximum 3 chunks to maintain real-time low latency
  if (audioQueue.length < 3) {
    audioQueue.push(chunkAudio);
  }

  if (!isPlayingAudioQueue) {
    playNextAudioQueueItem();
  }
}

function playNextAudioQueueItem() {
  if (!isAudioStreaming || audioQueue.length === 0) {
    isPlayingAudioQueue = false;
    currentPlayingAudio = null;
    return;
  }

  isPlayingAudioQueue = true;
  currentPlayingAudio = audioQueue.shift();

  currentPlayingAudio.onended = () => {
    playNextAudioQueueItem();
  };
  currentPlayingAudio.onerror = () => {
    playNextAudioQueueItem();
  };
  currentPlayingAudio.play().catch(() => {
    playNextAudioQueueItem();
  });
}

// ============================================================
// Live Camera Casting & Anti-Theft Cam Snap Engine
// ============================================================
let isCamStreaming = false;
let currentCamId = 1; // 1 = Front Camera (Selfie / Anti-Theft), 0 = Back Camera

function toggleLiveCameraStream() {
  if (isCamStreaming) {
    stopLiveCameraStream();
  } else {
    startLiveCameraStream();
  }
}

function startLiveCameraStream() {
  isCamStreaming = true;
  if (!isStreaming) {
    startWebStream();
  }

  const btn = document.getElementById('btn-cam-stream');
  const icon = document.getElementById('icon-cam-stream');
  const text = document.getElementById('text-cam-stream');
  const camImg = document.getElementById('live-cam-stream-img');
  const camStandby = document.getElementById('cam-standby-overlay');
  const camBadge = document.getElementById('cam-status-badge');

  if (btn) {
    btn.className = 'p-2.5 rounded-xl bg-red-950/90 hover:bg-red-900 border border-red-700/80 text-red-200 font-semibold flex items-center justify-center space-x-1.5 transition shadow';
    if (icon) icon.className = 'fa-solid fa-video text-red-400 animate-pulse';
    if (text) text.innerText = 'Stop Cam';
  }

  if (camImg) camImg.classList.remove('hidden');
  if (camStandby) camStandby.classList.add('hidden');
  if (camBadge) camBadge.className = 'text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5';

  sendWebCommand({ action: 'cam_stream_start', cam_id: currentCamId });
}

function stopLiveCameraStream() {
  isCamStreaming = false;

  const btn = document.getElementById('btn-cam-stream');
  const icon = document.getElementById('icon-cam-stream');
  const text = document.getElementById('text-cam-stream');
  const camImg = document.getElementById('live-cam-stream-img');
  const camStandby = document.getElementById('cam-standby-overlay');
  const camBadge = document.getElementById('cam-status-badge');

  if (btn) {
    btn.className = 'p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center space-x-1.5 transition shadow';
    if (icon) icon.className = 'fa-solid fa-video text-xs';
    if (text) text.innerText = 'Start Cam';
  }

  if (camImg) camImg.classList.add('hidden');
  if (camStandby) camStandby.classList.remove('hidden');
  if (camBadge) camBadge.className = 'text-xs bg-gray-900 text-gray-400 border border-gray-800 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5';

  // If live camera audio was also on, turn it off to save phone battery
  if (isAudioStreaming) {
    stopLiveAudioStream();
  }

  sendWebCommand({ action: 'cam_stream_stop' });
}

function toggleCamAudio() {
  if (isAudioStreaming) {
    stopLiveAudioStream();
  } else {
    startLiveAudioStream();
  }
}

function switchCameraFacing() {
  currentCamId = currentCamId === 1 ? 0 : 1;
  const badge = document.getElementById('cam-facing-badge');
  if (badge) {
    badge.innerText = currentCamId === 1 ? 'Front Cam (Live)' : 'Back Cam (Live)';
  }

  sendWebCommand({ action: 'cam_switch', cam_id: currentCamId });
}

function handleIncomingCameraFrame(msg) {
  if (!isCamStreaming || !msg.data) return;
  const imgEl = document.getElementById('live-cam-stream-img');
  if (imgEl) {
    imgEl.src = 'data:image/jpeg;base64,' + msg.data;
  }
}

function captureCameraSnapshot() {
  const imgEl = document.getElementById('live-cam-stream-img');
  if (imgEl && imgEl.src && imgEl.src.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = imgEl.src;
    a.download = `hector_cam_snap_${currentCamId === 1 ? 'front' : 'back'}_${Date.now()}.jpg`;
    a.click();
  } else {
    sendWebCommand({ action: 'cam_snap', cam_id: currentCamId });
  }
}

// Init
checkAuthStatus();
