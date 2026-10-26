# Control Broken Android Display from PC (Zero-App & Confidential)

A comprehensive guide and automated architecture to mirror, control, and rescue data from an Android smartphone with a **broken or completely black display**, without installing any third-party closed-source remote-desktop apps (no AnyDesk, TeamViewer, AirDroid, etc.).

---

## 📌 Problem Scenario & Constraints

* **Condition:** Phone display is completely dead/black, but the phone is powered on, unlocked, and the touch digitizer still registers taps.
* **Hardware Limit:** The USB port may be loose, making sustained physical cable transfers unstable.
* **Confidentiality:** Data in storage is private — no external APK or closed-source third-party cloud service may be installed on the device.
* **Objective:**
  1. Authorize ADB blindly without visual feedback.
  2. Switch immediately from physical USB to reliable wireless ADB over Wi-Fi.
  3. Mirror the screen at 60 FPS with full mouse and keyboard input on PC.
  4. Perform a 100% offline, local backup of all internal storage.
  5. Establish an outbound "Zero-App" remote bridge via Cloudflare Workers to control the phone over 4G/5G mobile data from outside the home network.

---

## 🏗 System Architecture

### 1. Local Network Mode (Home Wi-Fi)
```
[ Phone ] <--- TCP Port 5555 ---> [ PC (scrcpy.exe) ] ===> [ 60 FPS Display + Mouse Control ]
```

### 2. Global Internet Mode (Zero-App via Cloudflare Worker)
```
[ Phone (4G/5G/Any Wi-Fi) ]
     │ (Outbound WebSocket via static /data/local/tmp/websocat)
     ▼
[ Private Cloudflare Worker (Durable Object WebSocket Relay) ]
     ▲
     │ (Outbound WebSocket via PC websocat.exe)
[ PC (scrcpy.exe on 127.0.0.1:5556) ] ===> [ 60 FPS Display + Mouse Control ]
```

---

## 🚀 Step-by-Step Execution Guide

### Step 1: Install PC Tooling (`scrcpy` & `adb`)
1. Download the latest 64-bit Windows release of **[scrcpy](https://github.com/Genymobile/scrcpy/releases)** (e.g., `scrcpy-win64-v5.0.1.zip`).
2. Extract the archive into a dedicated directory (e.g., `i:\SAKIB PEROSNAL\phone-bridge`). This folder already contains `adb.exe`.
3. Connect the phone to your PC with a USB cable.

---

### Step 2: The "Blind Tap" USB Debugging Authorization
When you run `adb devices`, the phone initially appears as:
```text
List of devices attached
PT99651BA1AA2403397    unauthorized
```
Android is displaying the security prompt: *"Allow USB debugging from this computer?"*. Because the screen is black, use this technique:

1. **Wake the Screen:** Press the **Power button** once or touch the fingerprint sensor (touches do not register if the screen is asleep).
2. **Re-plug USB:** Unplug and re-insert the USB cable. This forces Android to re-trigger the authorization prompt to the very top of the window stack.
3. **Where to Tap:**
   * **Do not tap the bottom edge** (that is the navigation/gesture bar).
   * Tap in the **lower-middle right quadrant** — approximately **1.5 to 2.5 inches (4–6 cm) up from the bottom edge**, on the **right half** of the screen.
   * Tap around that area 3–4 times.
4. **Active Polling Loop:** Run this PowerShell listener on your PC to catch the tap instantly:
   ```powershell
   $adb = ".\adb.exe"
   while ($true) {
       $out = & $adb devices
       if ($out -match "\s+device$") {
           Write-Host ">>> SUCCESS: PHONE AUTHORIZED! <<<" -ForegroundColor Green
           break
       }
       Start-Sleep -Milliseconds 500
   }
   ```

---

### Step 3: Switch to Wireless Mode & Ditch the Loose Cable
1. Discover the phone's local IP address:
   ```cmd
   adb shell ip addr show wlan0
   ```
   *(Look for `inet 192.168.x.x/24`)*.
2. Switch ADB to TCP/IP listening mode on port `5555`:
   ```cmd
   adb tcpip 5555
   ```
3. **Unplug the USB cable.** You no longer need it.
4. Connect wirelessly over your home network:
   ```cmd
   adb connect 192.168.x.x:5555
   ```
5. Apply keep-awake settings so the phone never sleeps while plugged into a wall charger:
   ```cmd
   adb shell settings put global stay_on_while_plugged_in 7
   adb shell settings put system screen_off_timeout 1800000
   ```
6. Launch live screen mirroring:
   ```cmd
   scrcpy.exe -s 192.168.x.x:5555 --stay-awake
   ```
   A smooth 60 FPS window appears on your PC. You can interact using your PC mouse and keyboard.

---

### Step 4: 100% Offline Storage Backup
Pull the phone's entire user directory across the local Wi-Fi network directly into your PC without any internet traffic:
```cmd
adb -s 192.168.x.x:5555 pull /sdcard/ "C:\PhoneBackup"
```
* Safely extracts Photos (`DCIM`), Documents, Downloads, and WhatsApp media.
* Can be interrupted and resumed at any time.

---

### Step 5: "Zero-App" Remote Internet Bridge (Cloudflare + `websocat`)
To access and control the phone over 4G/5G mobile data or outside Wi-Fi networks without installing an APK:

#### 1. Cloudflare Worker Setup (`worker.js`)
Deploy a Cloudflare Worker equipped with a Durable Object (`BridgeRoom`). It pairs two WebSockets using an authentication token:
* Device stream: `wss://<worker-domain>/ws?role=phone&token=<TOKEN>`
* PC client stream: `wss://<worker-domain>/ws?role=pc&token=<TOKEN>`

#### 2. Phone Configuration (Injected via ADB, No APKs)
1. Push a precompiled static binary of `websocat` for your phone's CPU architecture (`armeabi-v7a` or `aarch64`) into `/data/local/tmp/`:
   ```cmd
   adb push websocat-armv7 /data/local/tmp/websocat
   adb shell chmod +x /data/local/tmp/websocat
   ```
2. Create `/data/local/tmp/bridge.sh` on the phone:
   ```sh
   #!/system/bin/sh
   TOKEN="sk_phone_bridge_8f3a9d2c1e7b45"
   WORKER_URL="wss://phone-adb-bridge.<subdomain>.workers.dev/ws?role=phone&token=$TOKEN"

   while true; do
       /data/local/tmp/websocat -b -E --ping-interval 15 tcp:127.0.0.1:5555 "$WORKER_URL"
       sleep 2
   done
   ```
3. Run the bridge script in a detached session that persists when the shell closes:
   ```cmd
   adb shell "setsid /data/local/tmp/bridge.sh </dev/null >/dev/null 2>&1 &"
   ```

#### 3. PC Execution Script (`start-remote-internet.bat`)
```bat
@echo off
title Phone - Remote Internet (Cloudflare)
cd /d "%~dp0"

:: Start local proxy listening on port 5556
start /b "" websocat.exe -b -E --ping-interval 15 tcp-l:127.0.0.1:5556 "wss://phone-adb-bridge.<subdomain>.workers.dev/ws?role=pc&token=sk_phone_bridge_8f3a9d2c1e7b45"
timeout /t 2 >nul

:: Connect ADB to the local bridge endpoint
adb.exe connect 127.0.0.1:5556

:: Launch Scrcpy GUI
scrcpy.exe -s 127.0.0.1:5556 --stay-awake --window-title "Phone (Remote Internet)"
```

---

## ⚡ 1-Click Desktop Shortcuts

| Script | Purpose |
| :--- | :--- |
| `start-local-wifi.bat` | Instantly connects to the phone over local Wi-Fi and launches `scrcpy`. |
| `start-remote-internet.bat` | Bridges through Cloudflare Worker over any 4G/5G/Wi-Fi connection. |
| `backup-all-files.bat` | Backs up all `/sdcard/` content to `C:\PhoneBackup`. |

---

## 📋 Master Prompt for Another Antigravity Instance

Give the prompt below to another Antigravity instance to automate this process for another phone:

````markdown
I have an Android smartphone whose display screen is broken / completely black, but the phone is powered on, unlocked, and the touch digitizer still works. 

I need you to help me regain full control of the phone from my PC, back up all my data, and set up a remote-access system so I can control it from anywhere.

CRITICAL REQUIREMENTS:
1. Confidentiality: My internal data is confidential. DO NOT recommend or install any third-party closed-source remote-desktop apps (no AnyDesk, TeamViewer, AirDroid, etc.).
2. Zero Apps on Phone: We will use native Android shell tools, scrcpy, and ADB.

Please guide and execute the following steps for me automatically:

Step 1: Environment & Tooling Setup
- Check if `adb` or `scrcpy` exist on my PC. If not, download and extract the latest 64-bit Windows release of `scrcpy` (from github.com/Genymobile/scrcpy/releases) into a dedicated folder like `C:\phone-bridge`.

Step 2: Blind USB Debugging Authorization
- Check `adb devices`. If the phone is listed as `unauthorized`:
  - Run an active PowerShell polling loop checking `adb devices` every 1 second.
  - Instruct me clearly on where to blind-tap on the dark phone screen (re-plugging the USB cable, waking the screen with power/fingerprint, and tapping in the lower-middle right quadrant ~2 inches above the bottom edge).
  - Automatically detect the exact second authorization succeeds.

Step 3: Switch to Wireless ADB & Live Screen
- Query the phone's Wi-Fi IP address via `adb shell ip addr show wlan0`.
- Enable TCP mode on port 5555 (`adb tcpip 5555`) and connect via `adb connect <phone-ip>:5555`.
- Apply keep-awake Android settings so the screen does not sleep while charging:
  `settings put global stay_on_while_plugged_in 7`
  `settings put system screen_off_timeout 1800000`
- Launch `scrcpy` over Wi-Fi so I can immediately view and interact with my phone using my PC mouse and keyboard.

Step 4: Full Local Backup
- Create a local backup folder (e.g. `C:\PhoneBackup`) and pull all internal user storage over the local Wi-Fi connection using `adb pull /sdcard/`.

Step 5: Setup Remote Internet Control (Optional Zero-App Cloudflare Bridge)
- Explain or set up a zero-app remote bridge using a static `websocat` binary in `/data/local/tmp` and a Cloudflare Worker WebSocket relay (or local tunnel), allowing me to control the phone over 4G/5G mobile data from outside the house.
- Create ready-to-use desktop batch shortcuts:
  - `Phone - Live Screen (Local WiFi).bat`
  - `Phone - Remote Internet.bat`
  - `Phone - Backup All Files.bat`

Let's start with Step 1 and checking my connected USB device!
````
