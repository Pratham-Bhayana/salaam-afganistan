const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const EMBASSY_PREFIX = `${API_BASE}/api/v1/embassy`;

const ACCESS_KEY = 'salaam_embassy_access';
const REFRESH_KEY = 'salaam_embassy_refresh';
const STAFF_KEY = 'salaam_embassy_staff';
const EMBASSY_KEY = 'salaam_embassy_meta';

export type EmbassyInfo = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
};

export type EmbassyStaffSession = {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accessMode?: string;
  embassy?: EmbassyInfo | string;
  permissions?: string[];
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredStaff(): EmbassyStaffSession | null {
  const raw = localStorage.getItem(STAFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EmbassyStaffSession;
  } catch {
    return null;
  }
}

export function getStoredEmbassy(): EmbassyInfo | null {
  const raw = localStorage.getItem(EMBASSY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EmbassyInfo;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(STAFF_KEY);
  localStorage.removeItem(EMBASSY_KEY);
}

export function persistSession(payload: {
  accessToken: string;
  refreshToken: string;
  staff: EmbassyStaffSession;
  embassy?: EmbassyInfo | null;
}) {
  localStorage.setItem(ACCESS_KEY, payload.accessToken);
  localStorage.setItem(REFRESH_KEY, payload.refreshToken);
  localStorage.setItem(STAFF_KEY, JSON.stringify(payload.staff));
  if (payload.embassy) {
    localStorage.setItem(EMBASSY_KEY, JSON.stringify(payload.embassy));
  }
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${EMBASSY_PREFIX}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    return false;
  }

  const json = (await res.json()) as {
    success?: boolean;
    data?: {
      accessToken: string;
      refreshToken?: string;
      staff?: EmbassyStaffSession;
    };
  };

  if (!json.success || !json.data?.accessToken) {
    clearSession();
    return false;
  }

  localStorage.setItem(ACCESS_KEY, json.data.accessToken);
  if (json.data.refreshToken) localStorage.setItem(REFRESH_KEY, json.data.refreshToken);
  if (json.data.staff) {
    localStorage.setItem(STAFF_KEY, JSON.stringify(json.data.staff));
    const emb = typeof json.data.staff.embassy === 'object' ? json.data.staff.embassy : null;
    if (emb) localStorage.setItem(EMBASSY_KEY, JSON.stringify(emb));
  }
  return true;
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

  const res = await fetch(`${EMBASSY_PREFIX}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(path, options, false);
    clearSession();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: T;
    meta?: Record<string, unknown>;
    details?: unknown;
  } | null;

  if (!res.ok || !json || json.success === false) {
    throw new ApiError(
      res.status,
      json?.message || `Request failed (${res.status})`,
      json?.details
    );
  }

  return { data: json.data as T, meta: json.meta };
}

export async function loginEmbassy(email: string, password: string) {
  const res = await fetch(`${EMBASSY_PREFIX}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const json = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: {
      accessToken: string;
      refreshToken: string;
      staff: EmbassyStaffSession;
      permissions?: string[];
    };
  };

  if (!res.ok || !json.success || !json.data) {
    throw new ApiError(res.status, json.message || 'Login failed');
  }

  const staff: EmbassyStaffSession = {
    ...json.data.staff,
    permissions: json.data.permissions || json.data.staff.permissions,
  };

  const embassy =
    typeof staff.embassy === 'object' && staff.embassy ? staff.embassy : null;

  persistSession({
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    staff,
    embassy,
  });

  return { staff, embassy };
}

export { getAccessToken, EMBASSY_PREFIX, API_BASE };
