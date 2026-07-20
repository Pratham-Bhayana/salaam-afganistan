/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API origin, without trailing slash (e.g. https://api.example.com). */
  readonly VITE_API_BASE_URL?: string;
  /** Optional — prefill login form in local dev only. Do not set in production. */
  readonly VITE_EMBASSY_EMAIL?: string;
  readonly VITE_EMBASSY_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
