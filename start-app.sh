#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

export PATH="$DIR/bin:$PATH:/Users/akterhossain/.nvm/versions/node/v22.23.2/bin:/usr/local/bin:/opt/homebrew/bin"
node server/index.js
