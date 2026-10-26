const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BUNDLED_SCRCPY = path.join(__dirname, '..', 'bin', 'scrcpy');
const SCRCPY_PATH = fs.existsSync(BUNDLED_SCRCPY) ? BUNDLED_SCRCPY : 'scrcpy';

let runningInstances = new Map();

function launchScrcpy(options = {}) {
  const {
    target = null,
    stayAwake = true,
    maxFps = 60,
    maxSize = 1920,
    bitrate = '12M',
    title = 'Device Mirror (60 FPS)',
    recordPath = null,
    turnScreenOff = false
  } = options;

  const args = [];

  if (target) {
    args.push('-s', target);
  }

  if (stayAwake) {
    args.push('--stay-awake');
  }

  if (maxFps) {
    args.push(`--max-fps=${maxFps}`);
  }

  if (maxSize) {
    args.push(`--max-size=${maxSize}`);
  }

  if (bitrate) {
    args.push(`-b=${bitrate}`);
  }

  if (title) {
    args.push(`--window-title=${title}`);
  }

  if (turnScreenOff) {
    args.push('--turn-screen-off');
  }

  if (recordPath) {
    args.push(`--record=${recordPath}`);
  }

  console.log(`[Scrcpy] Launching: ${SCRCPY_PATH} ${args.join(' ')}`);

  const child = spawn(SCRCPY_PATH, args, {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();

  const id = Date.now().toString();
  runningInstances.set(id, { child, target, startTime: new Date() });

  child.on('close', () => {
    runningInstances.delete(id);
  });

  return { success: true, id, target, args };
}

module.exports = {
  SCRCPY_PATH,
  launchScrcpy
};
