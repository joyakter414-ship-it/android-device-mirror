#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/../.." >/dev/null 2>&1 && pwd )"

bash "$ROOT_DIR/bin/setup_persistence.sh"
read -p "Press [Enter] to exit..."
