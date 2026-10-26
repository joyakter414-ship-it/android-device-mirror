#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/../.." >/dev/null 2>&1 && pwd )"
ADB="$ROOT_DIR/bin/adb"
BACKUP_DIR="$HOME/Desktop/PhoneBackup"

clear
echo "============================================================"
echo "      💾 100% OFFLINE LOCAL PHONE STORAGE BACKUP           "
echo "============================================================"
echo "Target directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "Pulling DCIM (Photos & Camera Videos)..."
"$ADB" pull /sdcard/DCIM "$BACKUP_DIR/"

echo "Pulling WhatsApp Media..."
"$ADB" pull /sdcard/Android/media/com.whatsapp "$BACKUP_DIR/" 2>/dev/null
"$ADB" pull /sdcard/WhatsApp "$BACKUP_DIR/" 2>/dev/null

echo "Pulling Pictures & Documents & Downloads..."
"$ADB" pull /sdcard/Pictures "$BACKUP_DIR/" 2>/dev/null
"$ADB" pull /sdcard/Documents "$BACKUP_DIR/" 2>/dev/null
"$ADB" pull /sdcard/Download "$BACKUP_DIR/" 2>/dev/null

echo ""
echo "🎉 BACKUP COMPLETE! Files saved in: $BACKUP_DIR"
open "$BACKUP_DIR"
read -p "Press [Enter] to exit..."
