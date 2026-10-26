const fs = require('fs');
const path = require('path');

const DRIVE_TOKEN_PATH = '/Users/akterhossain/Desktop/drive/token.json';
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  if (!fs.existsSync(DRIVE_TOKEN_PATH)) {
    throw new Error('Google Drive token file not found at: ' + DRIVE_TOKEN_PATH);
  }

  const tokenData = JSON.parse(fs.readFileSync(DRIVE_TOKEN_PATH, 'utf8'));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: tokenData.client_id,
      client_secret: tokenData.client_secret,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token'
    })
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to refresh Google Drive token: ' + JSON.stringify(data));
  }

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

async function getDriveUserInfo() {
  try {
    const token = await getAccessToken();
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function createDriveFolder(folderName, parentFolderId = null) {
  const token = await getAccessToken();
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  return await res.json();
}

async function uploadFileToDrive(filePath, parentFolderId = null) {
  const token = await getAccessToken();
  const fileName = path.basename(filePath);
  const fileStats = fs.statSync(filePath);
  const fileStream = fs.readFileSync(filePath);

  const metadata = {
    name: fileName
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const mimeType = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg'
    : fileName.endsWith('.png') ? 'image/png'
    : fileName.endsWith('.mp4') ? 'video/mp4'
    : fileName.endsWith('.pdf') ? 'application/pdf'
    : 'application/octet-stream';

  const multipartRequestBody = Buffer.concat([
    Buffer.from(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n`
    ),
    fileStream,
    Buffer.from(closeDelimiter)
  ]);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': multipartRequestBody.length.toString()
    },
    body: multipartRequestBody
  });

  return await res.json();
}

async function uploadDirectoryRecursive(localDir, parentFolderId, onFileProgress) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(localDir, entry.name);
    if (entry.isDirectory()) {
      const folderRes = await createDriveFolder(entry.name, parentFolderId);
      if (folderRes.id) {
        if (onFileProgress) onFileProgress({ type: 'folder', name: entry.name, path: fullPath });
        const subResults = await uploadDirectoryRecursive(fullPath, folderRes.id, onFileProgress);
        results.push(...subResults);
      }
    } else if (entry.isFile()) {
      if (entry.name.startsWith('.')) continue; // skip hidden files
      try {
        const uploadRes = await uploadFileToDrive(fullPath, parentFolderId);
        if (onFileProgress) onFileProgress({ type: 'file', name: entry.name, path: fullPath, link: uploadRes.webViewLink });
        results.push(uploadRes);
      } catch (err) {
        if (onFileProgress) onFileProgress({ type: 'error', name: entry.name, error: err.message });
      }
    }
  }

  return results;
}

module.exports = {
  getAccessToken,
  getDriveUserInfo,
  createDriveFolder,
  uploadFileToDrive,
  uploadDirectoryRecursive
};
