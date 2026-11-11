import { AppState } from '../types';

const BACKUP_FILE_NAME = 'myanmar_household_ledger_backup.json';

interface DriveFileItem {
  id: string;
  name: string;
  modifiedTime: string;
}

export async function findDriveBackupFile(accessToken: string): Promise<DriveFileItem | null> {
  const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&spaces=drive`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to query Google Drive: ${errorText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

export async function uploadBackupToDrive(
  state: AppState,
  accessToken: string
): Promise<{ fileId: string; modifiedTime: string }> {
  const existing = await findDriveBackupFile(accessToken);
  const backupPayload = JSON.stringify(
    {
      version: 1,
      appName: 'အိမ်စရင်း (Myanmar Home Ledger)',
      exportedAt: new Date().toISOString(),
      data: state,
    },
    null,
    2
  );

  if (existing) {
    // Update existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: backupPayload,
    });

    if (!res.ok) {
      throw new Error(`Drive update failed: ${await res.text()}`);
    }
    const result = await res.json();
    return {
      fileId: result.id,
      modifiedTime: result.modifiedTime || new Date().toISOString(),
    };
  } else {
    // Create new multipart file
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      description: 'Myanmar Home Ledger (အိမ်စရင်း) Auto-Backup',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      backupPayload +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      throw new Error(`Drive create file failed: ${await res.text()}`);
    }
    const result = await res.json();
    return {
      fileId: result.id,
      modifiedTime: result.modifiedTime || new Date().toISOString(),
    };
  }
}

export async function downloadBackupFromDrive(
  fileId: string,
  accessToken: string
): Promise<{ state: AppState; modifiedTime: string }> {
  // Fetch file metadata for modified time
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  let modifiedTime = new Date().toISOString();
  if (metaRes.ok) {
    const meta = await metaRes.json();
    if (meta.modifiedTime) modifiedTime = meta.modifiedTime;
  }

  // Fetch file content
  const contentRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!contentRes.ok) {
    throw new Error(`Drive download failed: ${await contentRes.text()}`);
  }

  const raw = await contentRes.json();
  const state: AppState = raw.data || raw;

  return { state, modifiedTime };
}
