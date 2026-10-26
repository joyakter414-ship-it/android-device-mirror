#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/../.." >/dev/null 2>&1 && pwd )"
export PATH=$PATH:/Users/akterhossain/.nvm/versions/node/v22.23.2/bin

clear
echo "============================================================"
echo "      ☁️ SYNC RESCUED PHONE FILES TO GOOGLE DRIVE          "
echo "============================================================"
echo "Target Account: joyakter414@gmail.com"
echo "Source Directory: $HOME/Desktop/PhoneBackup"
echo ""

node -e "
const { getDriveUserInfo, createDriveFolder, uploadDirectoryRecursive } = require('$ROOT_DIR/server/driveManager.js');
const path = require('path');
const fs = require('fs');

async function run() {
  const user = await getDriveUserInfo();
  if (user.error) {
    console.error('Error connecting to Drive:', user.error);
    return;
  }
  console.log('✅ Authenticated as:', user.user.emailAddress);

  const localDir = path.join(require('os').homedir(), 'Desktop', 'PhoneBackup');
  if (!fs.existsSync(localDir)) {
    console.error('Local backup directory does not exist yet. Run local backup first!');
    return;
  }

  const folderName = 'Android Rescue Backup - ' + new Date().toISOString().substring(0, 10);
  console.log('Creating Drive folder:', folderName);
  const folder = await createDriveFolder(folderName);
  console.log('Folder link:', folder.webViewLink);
  console.log('Uploading files recursively (this may take a few minutes)...');

  await uploadDirectoryRecursive(localDir, folder.id, (prog) => {
    console.log('->', prog.type, prog.name);
  });

  console.log('\n🎉 ALL FILES SUCCESSFULLY SYNCED TO GOOGLE DRIVE!');
  console.log('Open Drive Folder:', folder.webViewLink);
}

run();
"

read -p "Press [Enter] to exit..."
