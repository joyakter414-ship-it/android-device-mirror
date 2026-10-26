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

// Universal Command & Script Studio
const studioData = {
  stealth: {
    desc: "Launch stealth mirror session with remote mobile screen 100% powered off & asleep",
    mac: `#!/bin/bash\n# Hector Stealth Remote Control (Screen OFF)\nscrcpy -s 127.0.0.1:5556 --turn-screen-off --stay-awake --power-off-on-close --window-title "Remote Phone (Stealth Mode)"`,
    win: `@echo off\n:: Hector Stealth Remote Control (Screen OFF)\nscrcpy.exe -s 127.0.0.1:5556 --turn-screen-off --stay-awake --power-off-on-close --window-title "Remote Phone (Stealth Mode)"\npause`,
    android: `adb shell "curl -sL https://hector-drt.pages.dev/api/bridge/script | sh"`,
    linux: `scrcpy -s 127.0.0.1:5556 --turn-screen-off --stay-awake --power-off-on-close`
  },
  spectator: {
    desc: "Silent spectator live view when kids or others use phone with auto-recording",
    mac: `#!/bin/bash\n# Hector Silent Spectator (Kids Live View)\nscrcpy -s 127.0.0.1:5556 --no-control --record="KidsActivity_$(date +%s).mp4" --window-title "Live Monitoring (Silent Spectator)"`,
    win: `@echo off\n:: Hector Silent Spectator (Kids Live View)\nscrcpy.exe -s 127.0.0.1:5556 --no-control --record=KidsActivity.mp4 --window-title "Live Monitoring (Silent Spectator)"\npause`,
    android: `adb shell "curl -sL https://hector-drt.pages.dev/api/bridge/script | sh"`,
    linux: `scrcpy -s 127.0.0.1:5556 --no-control`
  },
  full: {
    desc: "Full interactive 60 FPS screen mirror with mouse clicks & keyboard typing",
    mac: `#!/bin/bash\n# Full Interactive Mirror\nscrcpy -s 127.0.0.1:5556 --stay-awake --window-title "Hector Live Phone"`,
    win: `@echo off\n:: Full Interactive Mirror\nscrcpy.exe -s 127.0.0.1:5556 --stay-awake --window-title "Hector Live Phone"\npause`,
    android: `adb shell "curl -sL https://hector-drt.pages.dev/api/bridge/script | sh"`,
    linux: `scrcpy -s 127.0.0.1:5556 --stay-awake`
  },
  wireless: {
    desc: "Switch from USB cable to Wireless Wi-Fi mode on port 5555",
    mac: `#!/bin/bash\n# Switch to Wireless Wi-Fi\nadb tcpip 5555 && echo "Unplug USB cable now!"`,
    win: `@echo off\n:: Switch to Wireless Wi-Fi\nadb.exe tcpip 5555\necho Unplug USB cable now!\npause`,
    android: `setprop service.adb.tcp.port 5555 && stop adbd && start adbd`,
    linux: `adb tcpip 5555`
  },
  autoboot: {
    desc: "Configure auto-boot persistence so phone connects automatically on reboot",
    mac: `adb shell "dumpsys deviceidle whitelist +com.termux && dumpsys deviceidle whitelist +com.termux.boot"`,
    win: `adb.exe shell "dumpsys deviceidle whitelist +com.termux && dumpsys deviceidle whitelist +com.termux.boot"`,
    android: `dumpsys deviceidle whitelist +com.termux && dumpsys deviceidle whitelist +com.termux.boot`,
    linux: `adb shell "dumpsys deviceidle whitelist +com.termux"`
  },
  drive: {
    desc: "Selectively pull photos & media and sync to Google Drive",
    mac: `#!/bin/bash\n# Pull DCIM Camera Photos to Mac\nadb pull /sdcard/DCIM ~/Desktop/PhoneBackup && open ~/Desktop/PhoneBackup`,
    win: `@echo off\n:: Pull DCIM Camera Photos\nmkdir C:\\PhoneBackup 2>nul\nadb.exe pull /sdcard/DCIM C:\\PhoneBackup\npause`,
    android: `tar -czf /sdcard/backup.tar.gz /sdcard/DCIM`,
    linux: `adb pull /sdcard/DCIM ~/PhoneBackup`
  }
};

function updateStudioScript() {
  const mode = document.getElementById('studio-mode-select').value;
  const os = document.getElementById('studio-os-select').value;
  const codeEl = document.getElementById('studio-code');
  const descEl = document.getElementById('studio-desc');
  const langEl = document.getElementById('studio-lang');

  const selectedMode = studioData[mode] || studioData.stealth;
  const script = selectedMode[os] || selectedMode.mac;

  descEl.innerText = selectedMode.desc;
  codeEl.innerText = script;
  langEl.innerText = os === 'win' ? 'batch' : (os === 'android' ? 'android shell' : 'bash');
}

function copyStudioCommand() {
  const code = document.getElementById('studio-code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('studio-copy-text');
    btn.innerText = 'Copied!';
    setTimeout(() => { btn.innerText = 'Copy Command'; }, 2000);
  });
}

function downloadStudioScript() {
  const mode = document.getElementById('studio-mode-select').value;
  const os = document.getElementById('studio-os-select').value;
  const selectedMode = studioData[mode] || studioData.stealth;
  const script = selectedMode[os] || selectedMode.mac;

  const ext = os === 'win' ? '.bat' : (os === 'mac' ? '.command' : '.sh');
  const fileName = `hector_${mode}_${os}${ext}`;

  const blob = new Blob([script], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyMasterCommand() {
  const code = document.getElementById('master-phone-cmd').innerText;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('master-copy-text');
    btn.innerText = 'Copied!';
    setTimeout(() => { btn.innerText = 'Copy'; }, 2000);
  });
}

// Init
loadEdgeStatus();
loadDriveInfo();
updateStudioScript();
