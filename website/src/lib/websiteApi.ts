const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(
  /\/$/,
  "",
);
const WEBSITE_PREFIX = `${API_BASE}/api/v1/website`;

const ACCESS_KEY = "salaam_website_access";
const REFRESH_KEY = "salaam_website_refresh";

export type WebsiteSession = {
  accessToken: string;
  refreshToken: string;
  applicant?: unknown;
};

export class WebsiteApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "WebsiteApiError";
    this.status = status;
  }
}

export function getWebsiteAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getWebsiteRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearWebsiteSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function persistWebsiteSession(session: {
  accessToken: string;
  refreshToken?: string;
}) {
  localStorage.setItem(ACCESS_KEY, session.accessToken);
  if (session.refreshToken) {
    localStorage.setItem(REFRESH_KEY, session.refreshToken);
  }
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  meta?: unknown;
};

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getWebsiteRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${WEBSITE_PREFIX}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await parseJson<WebsiteSession>(res);
    if (!res.ok || !json?.success || !json.data?.accessToken) {
      clearWebsiteSession();
      return null;
    }
    persistWebsiteSession(json.data);
    return json.data.accessToken;
  } catch {
    clearWebsiteSession();
    return null;
  }
}

/**
 * Authenticated JSON fetch against `/api/v1/website`.
 * Retries once after refresh on 401.
 */
export async function websiteFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<{ data: T; meta?: unknown }> {
  const token = getWebsiteAccessToken();
  if (!token) {
    throw new WebsiteApiError("Please sign in to continue.", 401);
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${WEBSITE_PREFIX}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const next = await refreshAccessToken();
    if (next) {
      headers.set("Authorization", `Bearer ${next}`);
      return websiteFetch<T>(path, { ...options, headers }, false);
    }
  }

  const json = await parseJson<T>(res);
  if (!res.ok || json.success === false) {
    throw new WebsiteApiError(json.message || `Request failed (${res.status})`, res.status);
  }

  return { data: json.data as T, meta: json.meta };
}

/** Multipart upload (do not set Content-Type — browser sets boundary). */
export async function websiteUpload<T>(
  path: string,
  formData: FormData,
  retry = true,
): Promise<{ data: T; meta?: unknown }> {
  const token = getWebsiteAccessToken();
  if (!token) {
    throw new WebsiteApiError("Please sign in to continue.", 401);
  }

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${WEBSITE_PREFIX}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401 && retry) {
    const next = await refreshAccessToken();
    if (next) {
      return websiteUpload<T>(path, formData, false);
    }
  }

  const json = await parseJson<T>(res);
  if (!res.ok || json.success === false) {
    throw new WebsiteApiError(json.message || `Upload failed (${res.status})`, res.status);
  }

  return { data: json.data as T, meta: json.meta };
}

/**
 * Exchange a Firebase ID token for our website JWT session.
 * Soft-fails when the API is offline so Google login still works client-side.
 */
export async function exchangeFirebaseToken(
  idToken: string,
  profile?: { firstName?: string; lastName?: string; displayName?: string },
): Promise<WebsiteSession | null> {
  try {
    const res = await fetch(`${WEBSITE_PREFIX}/auth/firebase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, profile }),
    });

    const json = await parseJson<WebsiteSession>(res);

    if (!res.ok || !json?.success || !json.data?.accessToken) {
      console.warn("[auth] Backend Firebase exchange failed:", json?.message || res.status);
      return null;
    }

    persistWebsiteSession(json.data);
    return json.data;
  } catch (err) {
    console.warn("[auth] Backend Firebase exchange unavailable:", err);
    return null;
  }
}

export async function logoutWebsiteSession() {
  const refreshToken = getWebsiteRefreshToken();
  const accessToken = getWebsiteAccessToken();

  try {
    if (accessToken) {
      await fetch(`${WEBSITE_PREFIX}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    /* ignore offline logout */
  } finally {
    clearWebsiteSession();
  }
}

/* ─── Domain types (subset used by website UI) ─── */

export type ApplicationStatus =
  | "draft"
  | "pending"
  | "documents_required"
  | "sent_to_embassy"
  | "under_embassy_review"
  | "approved"
  | "rejected"
  | "visa_issued"
  | "closed"
  | "archived";

export type WebsiteNotification = {
  _id: string;
  type?: string;
  title?: string;
  message?: string;
  body?: string;
  isRead?: boolean;
  createdAt?: string;
  application?: string;
};

export type WebsiteApplicationSummary = {
  _id: string;
  referenceId: string;
  visaTypeCode: string;
  status: ApplicationStatus;
  paymentStatus?: string;
  submittedAt?: string | null;
  updatedAt?: string;
  issuedAt?: string | null;
};

export type RequestedDocument = {
  name: string;
  key: string;
  status: "pending" | "uploaded" | "cancelled";
  note?: string;
  requestedAt?: string;
};

export type WebsiteApplicationDocument = {
  _id: string;
  key: string;
  label?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  category?: string;
};

export type WebsiteApplicationDetail = WebsiteApplicationSummary & {
  channel?: "evisa" | "embassy";
  personal?: {
    fullName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    sex?: string;
    nationality?: string;
    countryOfResidence?: string;
  };
  passport?: {
    fullName?: string;
    passportNumber?: string;
    nationality?: string;
    dateOfBirth?: string;
    sex?: string;
    issueDate?: string;
    expiryDate?: string;
    issuingCountry?: string;
  };
  travel?: {
    purpose?: string;
    intendedEntryDate?: string;
    intendedExitDate?: string;
    stayDurationDays?: number;
    addressInAfghanistan?: string;
    citiesToVisit?: string;
    processingSpeed?: string;
    extras?: Record<string, unknown>;
  };
  formAnswers?: Record<string, unknown>;
  documentRequestNote?: string;
  rejectionReason?: string;
  requestedDocuments?: RequestedDocument[];
  sentToEmbassyAt?: string | null;
  decidedAt?: string | null;
  activity?: Array<{
    action: string;
    fromStatus?: string;
    toStatus?: string;
    note?: string;
    at?: string;
  }>;
  documents?: WebsiteApplicationDocument[];
  payments?: Array<{
    _id: string;
    status?: string;
    amount?: number;
    currency?: string;
    method?: string;
    createdAt?: string;
  }>;
  issuedVisa?: {
    visaNumber?: string;
    validFrom?: string;
    validUntil?: string;
    issuedAt?: string;
  } | null;
  recentNotifications?: WebsiteNotification[];
  updates?: {
    status?: ApplicationStatus;
    documentRequestNote?: string;
    rejectionReason?: string;
    requestedDocuments?: RequestedDocument[];
    lastUpdatedAt?: string;
  };
};

export type WebsiteDashboard = {
  applicant?: {
    _id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
  };
  applications: WebsiteApplicationSummary[];
  notifications: {
    unreadCount: number;
    latest: WebsiteNotification[];
  };
};

export type CreateApplicationPayload = {
  visaTypeCode: string;
  personal?: Record<string, unknown>;
  passport?: Record<string, unknown>;
  travel?: Record<string, unknown>;
  formAnswers?: Record<string, unknown>;
};

export async function fetchDashboard() {
  return websiteFetch<WebsiteDashboard>("/dashboard");
}

export async function fetchMyApplications() {
  return websiteFetch<WebsiteApplicationSummary[]>("/applications");
}

export async function fetchApplication(id: string) {
  return websiteFetch<WebsiteApplicationDetail>(`/applications/${id}`);
}

export async function createApplication(payload: CreateApplicationPayload) {
  return websiteFetch<WebsiteApplicationDetail>("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateApplication(id: string, payload: Partial<CreateApplicationPayload>) {
  return websiteFetch<WebsiteApplicationDetail>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function submitApplication(id: string) {
  return websiteFetch<WebsiteApplicationDetail>(`/applications/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function uploadApplicationDocument(
  applicationId: string,
  file: File,
  key: string,
  label?: string,
) {
  const form = new FormData();
  form.append("file", file);
  form.append("key", key);
  if (label) form.append("label", label);
  return websiteUpload<WebsiteApplicationDocument>(
    `/applications/${applicationId}/documents`,
    form,
  );
}

export async function fetchNotifications(opts?: { unreadOnly?: boolean }) {
  const q = opts?.unreadOnly ? "?unreadOnly=true" : "";
  return websiteFetch<WebsiteNotification[]>(`/notifications${q}`);
}

export async function markNotificationRead(id: string) {
  return websiteFetch<WebsiteNotification>(`/notifications/${id}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function markAllNotificationsRead() {
  return websiteFetch<{ modified: number }>("/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
