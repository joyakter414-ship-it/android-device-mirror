#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/../.." >/dev/null 2>&1 && pwd )"
SCRCPY="$ROOT_DIR/bin/scrcpy"

clear
echo "Starting 60 FPS Scrcpy Screen Mirror with mouse and keyboard control..."
"$SCRCPY" --stay-awake --window-title "Phone Live Screen (60 FPS)"
