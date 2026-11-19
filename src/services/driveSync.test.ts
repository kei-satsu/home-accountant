import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppState } from '../types';
import {
  downloadBackupFromDrive,
  findDriveBackupFile,
  uploadBackupToDrive,
} from './driveSync';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const state: AppState = {
  accounts: [],
  categories: [],
  transactions: [],
  darkMode: false,
  myanmarNumerals: false,
  geminiApiKey: 'sensitive-api-key',
};

test('creates a new backup in appDataFolder without including the API key', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes('/drive/v3/files?q=')) {
      return Response.json({ files: [] });
    }
    return Response.json({ id: 'backup-id', modifiedTime: '2026-11-18T00:00:00.000Z' });
  };

  const result = await uploadBackupToDrive(state, 'access-token');

  assert.equal(result.fileId, 'backup-id');
  assert.match(requests[0].url, /spaces=appDataFolder/);
  assert.equal(requests[1].init?.method, 'POST');
  assert.match(String(requests[1].init?.body), /"parents":\["appDataFolder"\]/);
  assert.doesNotMatch(String(requests[1].init?.body), /sensitive-api-key|geminiApiKey/);
});

test('finds existing backups only in appDataFolder', async () => {
  let requestUrl = '';
  globalThis.fetch = async (input) => {
    requestUrl = String(input);
    return Response.json({
      files: [
        {
          id: 'existing-id',
          name: 'myanmar_household_ledger_backup.json',
          modifiedTime: '2026-11-18T00:00:00.000Z',
        },
      ],
    });
  };

  const file = await findDriveBackupFile('access-token');

  assert.equal(file?.id, 'existing-id');
  assert.match(requestUrl, /spaces=appDataFolder/);
});

test('overwrites an existing backup with sanitized state', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes('/drive/v3/files?q=')) {
      return Response.json({
        files: [
          {
            id: 'existing-id',
            name: 'myanmar_household_ledger_backup.json',
            modifiedTime: '2026-11-18T00:00:00.000Z',
          },
        ],
      });
    }
    return Response.json({ id: 'existing-id', modifiedTime: '2026-11-18T01:00:00.000Z' });
  };

  const result = await uploadBackupToDrive(state, 'access-token');

  assert.equal(result.fileId, 'existing-id');
  assert.equal(requests[1].init?.method, 'PATCH');
  assert.match(requests[1].url, /uploadType=media/);
  assert.doesNotMatch(String(requests[1].init?.body), /sensitive-api-key|geminiApiKey/);
});

test('reports quota and network errors clearly', async (t) => {
  await t.test('expired access token', async () => {
    globalThis.fetch = async () =>
      Response.json({ error: { message: 'Invalid Credentials' } }, { status: 401 });
    await assert.rejects(findDriveBackupFile('access-token'), /access expired or was revoked/);
  });

  await t.test('quota response', async () => {
    globalThis.fetch = async () =>
      Response.json(
        { error: { errors: [{ reason: 'rateLimitExceeded' }] } },
        { status: 429 }
      );
    await assert.rejects(findDriveBackupFile('access-token'), /quota or rate limit/);
  });

  await t.test('offline request', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await assert.rejects(findDriveBackupFile('access-token'), /internet connection/);
  });
});

test('rejects malformed or incomplete downloaded backups', async (t) => {
  await t.test('invalid JSON', async () => {
    globalThis.fetch = async () =>
      new Response('not json', { headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(downloadBackupFromDrive('file-id', 'access-token'), /invalid JSON/);
  });

  await t.test('missing required data', async () => {
    globalThis.fetch = async (input) =>
      String(input).includes('alt=media')
        ? Response.json({ data: { accounts: [] } })
        : Response.json({ modifiedTime: '2026-11-18T00:00:00.000Z' });
    await assert.rejects(
      downloadBackupFromDrive('file-id', 'access-token'),
      /missing required expense data/
    );
  });
});

test('does not restore API keys from older backups', async () => {
  globalThis.fetch = async (input) =>
    String(input).includes('alt=media')
      ? Response.json({ data: state })
      : Response.json({ modifiedTime: '2026-11-18T00:00:00.000Z' });

  const { state: restored } = await downloadBackupFromDrive('file-id', 'access-token');

  assert.equal(restored.geminiApiKey, undefined);
});
