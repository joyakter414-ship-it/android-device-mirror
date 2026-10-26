#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

export PATH="$DIR/bin:$PATH:/Users/akterhossain/.nvm/versions/node/v22.23.2/bin:/usr/local/bin:/opt/homebrew/bin"

clear
echo "============================================================"
echo "   🚀 LAUNCHING DEVICE MIRROR & RESCUE CONTROL CENTER       "
echo "============================================================"
echo "Starting Node.js backend server..."
echo "Opening Dashboard in your web browser..."
echo ""

(sleep 1 && open "http://localhost:3333") &
node server/index.js
