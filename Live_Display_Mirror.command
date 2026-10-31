#!/bin/bash
cd "$(dirname "$0")"
echo ">>> Connecting to OPPO A38 Live Screen Display via High-Speed Engine..."
./bin/scrcpy-macos-aarch64-v5.0.1/scrcpy -s 192.168.0.100:5555 --window-title="OPPO A38 - Live Display Mirror (60 FPS)"
