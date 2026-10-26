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

// Init
loadEdgeStatus();
loadDriveInfo();
