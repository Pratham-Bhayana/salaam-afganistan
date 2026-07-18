const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
export const ADMIN_PREFIX = `${API_BASE}/api/v1/admin`;

const ACCESS_KEY = 'salaam_admin_access';
const REFRESH_KEY = 'salaam_admin_refresh';
const STAFF_KEY = 'salaam_admin_staff';

export type StaffSession = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions?: string[];
};

export function staffHasPermission(staff: StaffSession | null | undefined, permission: string) {
  if (!staff) return false;
  if (staff.role === 'super_admin') return true;
  const perms = staff.permissions || [];
  return perms.includes('*') || perms.includes(permission);
}

type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
};

type ApiFailure = {
  success: false;
  message?: string;
  details?: unknown;
};

const CLIENT_IP_KEY = 'salaam_admin_client_ip';
let cachedClientIp = ((): string => {
  try {
    return localStorage.getItem(CLIENT_IP_KEY) || '';
  } catch {
    return '';
  }
})();

/**
 * Detect the machine's public IP so audit logs show a real address instead of
 * the server's loopback in local/proxied setups. No browser permission needed —
 * sent via `X-Client-IP` (backend only trusts it when it sees a private IP).
 */
export async function detectClientIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (!res.ok) return cachedClientIp;
    const json = (await res.json()) as { ip?: string };
    if (json?.ip) {
      cachedClientIp = json.ip;
      try {
        localStorage.setItem(CLIENT_IP_KEY, json.ip);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* offline / blocked */
  }
  return cachedClientIp;
}

function withClientIp(headers: Headers): Headers {
  if (cachedClientIp) headers.set('X-Client-IP', cachedClientIp);
  return headers;
}

if (typeof window !== 'undefined') {
  void detectClientIp();
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredStaff(): StaffSession | null {
  const raw = localStorage.getItem(STAFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(STAFF_KEY);
}

export function persistSession(payload: {
  accessToken: string;
  refreshToken: string;
  staff: StaffSession;
}) {
  localStorage.setItem(ACCESS_KEY, payload.accessToken);
  localStorage.setItem(REFRESH_KEY, payload.refreshToken);
  localStorage.setItem(STAFF_KEY, JSON.stringify(payload.staff));
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${ADMIN_PREFIX}/auth/refresh`, {
    method: 'POST',
    headers: withClientIp(new Headers({ 'Content-Type': 'application/json' })),
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    return false;
  }

  const json = (await res.json()) as ApiSuccess<{
    accessToken: string;
    refreshToken?: string;
    staff?: StaffSession;
  }>;

  if (!json.success || !json.data?.accessToken) {
    clearSession();
    return false;
  }

  localStorage.setItem(ACCESS_KEY, json.data.accessToken);
  if (json.data.refreshToken) localStorage.setItem(REFRESH_KEY, json.data.refreshToken);
  if (json.data.staff) localStorage.setItem(STAFF_KEY, JSON.stringify(json.data.staff));
  return true;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  withClientIp(headers);

  const res = await fetch(`${ADMIN_PREFIX}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(path, options, false);
    clearSession();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  const json = (await res.json().catch(() => null)) as (ApiSuccess<T> | ApiFailure) | null;

  if (!res.ok || !json || json.success === false) {
    throw new ApiError(
      res.status,
      (json && 'message' in json && json.message) || `Request failed (${res.status})`,
      json && 'details' in json ? json.details : undefined
    );
  }

  return { data: json.data, meta: json.meta };
}

/** Fetch binary responses (PDF downloads / previews). */
export async function apiFetchBlob(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<{ blob: Blob; headers: Headers }> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  withClientIp(headers);

  const res = await fetch(`${ADMIN_PREFIX}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetchBlob(path, options, false);
    clearSession();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as ApiFailure | null;
    throw new ApiError(res.status, json?.message || `Request failed (${res.status})`, json?.details);
  }

  return { blob: await res.blob(), headers: res.headers };
}

export async function loginAdmin(email: string, password: string) {
  if (!cachedClientIp) await detectClientIp();

  const res = await fetch(`${ADMIN_PREFIX}/auth/login`, {
    method: 'POST',
    headers: withClientIp(new Headers({ 'Content-Type': 'application/json' })),
    body: JSON.stringify({ email, password }),
  });

  const json = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: {
      accessToken: string;
      refreshToken: string;
      staff: StaffSession;
    };
  };

  if (!res.ok || !json.success || !json.data) {
    throw new ApiError(res.status, json.message || 'Login failed');
  }

  persistSession({
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    staff: json.data.staff,
  });

  return json.data.staff;
}
