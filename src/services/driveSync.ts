import { AppState } from '../types';

const BACKUP_FILE_NAME = 'myanmar_household_ledger_backup.json';

interface DriveFileItem {
  id: string;
  name: string;
  modifiedTime: string;
}

interface DriveApiErrorBody {
  error?: {
    message?: string;
    errors?: Array<{ reason?: string }>;
  };
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to reach Google Drive. Check your internet connection and try again.');
    }
    throw error;
  }

  if (!response.ok) {
    const body = await response.text();
    let details: DriveApiErrorBody = {};
    try {
      details = JSON.parse(body) as DriveApiErrorBody;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }

    const reason = details.error?.errors?.[0]?.reason;
    if (response.status === 401) {
      throw new Error('Google Drive access expired or was revoked. Reconnect your Google account to continue.');
    }
    if (
      response.status === 429 ||
      (response.status === 403 &&
        ['quotaExceeded', 'rateLimitExceeded', 'userRateLimitExceeded'].includes(reason || ''))
    ) {
      throw new Error('Google Drive API quota or rate limit reached. Wait a while before trying again.');
    }
    if (response.status === 403) {
      throw new Error('Google Drive denied access. Reconnect your account and confirm Drive app-data access.');
    }
    throw new Error(
      details.error?.message
        ? `Google Drive request failed (${response.status}): ${details.error.message}`
        : `Google Drive request failed (${response.status}).`
    );
  }

  return response;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Google Drive returned invalid JSON. Check the backup format and try again.');
    }
    throw error;
  }
}

function readFileResult(result: unknown): { fileId: string; modifiedTime: string } {
  if (
    !result ||
    typeof result !== 'object' ||
    !('id' in result) ||
    typeof result.id !== 'string' ||
    !result.id
  ) {
    throw new Error('Google Drive returned an invalid file response.');
  }
  const modifiedTime =
    'modifiedTime' in result && typeof result.modifiedTime === 'string'
      ? result.modifiedTime
      : new Date().toISOString();
  return { fileId: result.id, modifiedTime };
}

export async function findDriveBackupFile(accessToken: string): Promise<DriveFileItem | null> {
  const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&spaces=appDataFolder&orderBy=modifiedTime%20desc&pageSize=100`;
  const res = await driveFetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await readJsonResponse<{ files?: DriveFileItem[] } | null>(res);
  if (!data || !Array.isArray(data.files)) {
    throw new Error('Google Drive returned an invalid file list.');
  }
  const file = data.files.find(
    (item) => item && typeof item.id === 'string' && typeof item.name === 'string'
  );
  return file
    ? {
        id: file.id,
        name: file.name,
        modifiedTime:
          typeof file.modifiedTime === 'string' ? file.modifiedTime : new Date().toISOString(),
      }
    : null;
}

export async function uploadBackupToDrive(
  state: AppState,
  accessToken: string
): Promise<{ fileId: string; modifiedTime: string }> {
  const existing = await findDriveBackupFile(accessToken);
  const backupData = { ...state };
  delete backupData.geminiApiKey;
  const backupPayload = JSON.stringify(
    {
      version: 1,
      appName: 'အိမ်စရင်း (Myanmar Home Ledger)',
      exportedAt: new Date().toISOString(),
      data: backupData,
    },
    null,
    2
  );

  if (existing) {
    // Update existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing.id)}?uploadType=media&fields=id,modifiedTime`;
    const res = await driveFetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: backupPayload,
    });

    return readFileResult(await readJsonResponse<unknown>(res));
  } else {
    // Create new multipart file
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      description: 'Myanmar Home Ledger (အိမ်စရင်း) Auto-Backup',
      parents: ['appDataFolder'],
    };

    const boundary = `----home-accountant-${crypto.randomUUID()}`;
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

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime';
    const res = await driveFetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    return readFileResult(await readJsonResponse<unknown>(res));
  }
}

export async function downloadBackupFromDrive(
  fileId: string,
  accessToken: string
): Promise<{ state: AppState; modifiedTime: string }> {
  // Fetch file metadata for modified time
  const metaRes = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=modifiedTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const metadata = await readJsonResponse<{ modifiedTime?: string }>(metaRes);
  const modifiedTime = metadata.modifiedTime || new Date().toISOString();

  // Fetch file content
  const contentRes = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const raw = await readJsonResponse<unknown>(contentRes);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('The Google Drive backup has an invalid format.');
  }

  const backup = raw as { data?: unknown } & Record<string, unknown>;
  const stateData = backup.data ?? raw;
  if (
    !stateData ||
    typeof stateData !== 'object' ||
    Array.isArray(stateData) ||
    !Array.isArray((stateData as AppState).accounts) ||
    !Array.isArray((stateData as AppState).categories) ||
    !Array.isArray((stateData as AppState).transactions) ||
    !(stateData as AppState).accounts.every(
      (item) => item && typeof item === 'object' && typeof item.id === 'string'
    ) ||
    !(stateData as AppState).categories.every(
      (item) => item && typeof item === 'object' && typeof item.id === 'string'
    ) ||
    !(stateData as AppState).transactions.every(
      (item) => item && typeof item === 'object' && typeof item.id === 'string'
    )
  ) {
    throw new Error('The Google Drive backup is missing required expense data.');
  }

  const state = { ...(stateData as AppState) };
  delete state.geminiApiKey;

  return { state, modifiedTime };
}
