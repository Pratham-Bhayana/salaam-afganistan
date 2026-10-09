const { Readable } = require('stream');

// Local-dev only: when a file is missing from local disk, stream it from the deployed
// API instead (prod files live on the Railway volume, not in MongoDB).
// Enabled only when all REMOTE_FILES_* vars are set.

let cachedToken = null;

function config() {
  return {
    baseUrl: (process.env.REMOTE_FILES_API_URL || '').replace(/\/$/, ''),
    email: process.env.REMOTE_FILES_ADMIN_EMAIL,
    password: process.env.REMOTE_FILES_ADMIN_PASSWORD,
  };
}

function isRemoteFilesEnabled() {
  const { baseUrl, email, password } = config();
  return Boolean(baseUrl && email && password);
}

async function login() {
  const { baseUrl, email, password } = config();
  const res = await fetch(`${baseUrl}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.data?.accessToken) {
    throw new Error(`Remote files login failed (${res.status}): ${json?.message || 'no token'}`);
  }
  return json.data.accessToken;
}

async function fetchWithAuth(pathname) {
  const url = `${config().baseUrl}${pathname}`;
  if (!cachedToken) cachedToken = await login();
  let res = await fetch(url, { headers: { Authorization: `Bearer ${cachedToken}` } });
  if (res.status === 401) {
    cachedToken = await login();
    res = await fetch(url, { headers: { Authorization: `Bearer ${cachedToken}` } });
  }
  return res;
}

/**
 * Streams `pathname` from the deployed API into `res`.
 * Returns true when the file was piped, false when remote fetching is disabled or failed.
 */
async function pipeRemoteFile(res, pathname) {
  if (!isRemoteFilesEnabled()) return false;
  try {
    const remote = await fetchWithAuth(pathname);
    if (!remote.ok || !remote.body) {
      console.warn(`Remote file fetch failed (${remote.status}): ${pathname}`);
      return false;
    }
    for (const header of ['content-type', 'content-disposition', 'content-length']) {
      const value = remote.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    Readable.fromWeb(remote.body).pipe(res);
    return true;
  } catch (err) {
    console.warn(`Remote file fetch error: ${err.message}`);
    return false;
  }
}

module.exports = { isRemoteFilesEnabled, pipeRemoteFile };
