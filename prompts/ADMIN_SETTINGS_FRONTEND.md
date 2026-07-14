# Prompt: Build Admin Panel — Settings (production frontend)

Copy everything below the line into Cursor / another AI coding agent.

---

## Role

You are a senior frontend engineer. Implement the **Admin Panel Settings section** end-to-end at production quality in one pass. Wire **real backend APIs only** — no mock data. Match existing Admin Panel patterns, auth, design tokens, and components.

## Project context

- Workspace: Salaam Afghanistan
- Admin app: `admin-panel/` (Vite + React + TypeScript)
- Shared API: `backend/` Express + Mongo
- Admin base URL from env: `VITE_API_BASE_URL` → calls go to `{base}/api/v1/admin`
- Auth already works via `admin-panel/src/api/client.ts` + `AuthContext` + `RequireAuth` (JWT bearer + refresh). Reuse `apiFetch`.
- Design language already exists: teal `#0B3D2E` + gold accent, cream canvas, white main card, sidebar liquid nav — see `admin-panel/src/styles/tokens.css`
- Existing live sections to mirror: Applications, Embassies, Staff (forms, modals, tables, loading/error patterns)
- Docs: `API_FRONTEND_GUIDE.md` § L (Settings, email templates, audit), `progress.md`
- PRD: **§8.10 Settings** (+ email templates under fees/content config; audit under NFR)
- Nav already has disabled items:
  - `{ id: 'settings', path: '/settings', enabled: false }`
  - `{ id: 'audit', path: '/audit-logs', enabled: false }`

## Goal

Ship a complete Admin Settings UI so operators with `settings:manage` / `audit:read` can:

1. View and update **platform settings** (branding, notifications, localization, security, system flags)
2. List and edit **email templates** (upsert by `code`)
3. Browse **audit logs** (paginated, filterable)

Settings control real backend behavior (examples already used by APIs):
- `system.allowManualApplications` — blocks admin create application when `false`
- `system.autoGenerateVisaOnApprove` — whether approve auto-issues visa PDF
- `notifications.*` — gates email / in-app notification sending
- `branding.*` — platform identity for UI + emails/support display

Do **not** rebuild Staff here (already a separate `/staff` section). Do **not** build Visa Templates (`/visa-templates`) or Fees & Content CMS in this pass.

---

## Hard constraints

- Production quality: loading, empty, error, disabled states; forms validated; safe refetch after mutations; dirty-state / save UX
- No mock settings objects; load from live `GET /settings`
- Preserve existing design system — do not introduce purple themes, Inter/Roboto defaults, cluttered “control panel” card spam
- TypeScript strict; no `any` unless unavoidable
- Update `admin-panel/src/App.tsx` routes and enable nav items in `admin-panel/src/nav/adminNav.ts`
- Update `progress.md` when done
- Admin tokens only — never call `/api/v1/embassy/*`
- Permission-aware UI: if staff lacks `settings:manage`, show locked empty state (do not call write APIs). Audit tab/page requires `audit:read`.

---

## Backend API contracts (use exactly)

Base: `/api/v1/admin`

### Platform settings
Permission: `settings:manage`

#### Get
`GET /settings`  
→ `{ "success": true, "data": PlatformSettings }`

Creates a default document if missing (singleton `key: "default"`).

#### Update
`PATCH /settings`  
Send **only sections you change** (partial merge per section):

```json
{
  "branding": {
    "platformName": "Salaam Afghanistan",
    "logoUrl": "https://...",
    "faviconUrl": "https://...",
    "primaryColor": "#0B3D2E",
    "secondaryColor": "#C4A35A",
    "supportEmail": "support@salaam.local",
    "supportPhone": "+93..."
  },
  "notifications": {
    "emailEnabled": true,
    "inAppEnabled": true,
    "statusChangeEmails": true,
    "documentRequestEmails": true,
    "visaIssuedEmails": true
  },
  "localization": {
    "languages": ["en"],
    "defaultLanguage": "en",
    "currencies": ["USD"],
    "defaultCurrency": "USD"
  },
  "security": {
    "sessionTimeoutMinutes": 60,
    "maxLoginAttempts": 5,
    "requireMfaForAdmin": false
  },
  "system": {
    "maintenanceMode": false,
    "allowManualApplications": true,
    "autoGenerateVisaOnApprove": true
  }
}
```

Allowed top-level keys on PATCH: `branding` | `notifications` | `localization` | `security` | `system` only.  
Side effect: writes an audit log `settings.update`.

### Email templates
Permission: `settings:manage`

#### List
`GET /email-templates`  
→ `{ "success": true, "data": EmailTemplate[], "meta": { "count" } }`

#### Upsert
`PUT /email-templates`
```json
{
  "code": "application_status_change",
  "name": "Application status changed",
  "subject": "Your application {{referenceId}} is now {{status}}",
  "htmlBody": "<p>...</p>",
  "textBody": "...",
  "placeholders": ["referenceId", "status", "applicantName"],
  "isActive": true
}
```
- Upserts by `code` (unique)
- `code`, `name`, `subject`, `htmlBody` required

Seeded codes (expect these after `npm run seed`):
- `application_status_change`
- `document_delivery`
- `visa_issued`
(+ any others present in DB)

### Audit logs
Permission: `audit:read`

`GET /audit-logs?page=&limit=&action=&resourceType=&resourceId=&actorId=`

Response:
```json
{
  "success": true,
  "data": [AuditLog],
  "meta": { "page", "limit", "total", "pages" }
}
```

Audit log fields: `action`, `resourceType`, `resourceId`, `actorType`, `actorId`, `actorEmail`, `actorRole`, `ip`, `userAgent`, `before`, `after`, `meta`, `createdAt`

---

## Model → UI mapping

### PlatformSettings sections

| Section | Fields | UI |
|---------|--------|----|
| `branding` | `platformName`, `logoUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`, `supportEmail`, `supportPhone` | Text + URL + color inputs; show live color swatches |
| `notifications` | `emailEnabled`, `inAppEnabled`, `statusChangeEmails`, `documentRequestEmails`, `visaIssuedEmails` | Toggles; disable child email toggles when `emailEnabled` is off |
| `localization` | `languages[]`, `defaultLanguage`, `currencies[]`, `defaultCurrency` | Tag/chip editors for arrays; selects for defaults (must belong to arrays) |
| `security` | `sessionTimeoutMinutes`, `maxLoginAttempts`, `requireMfaForAdmin` | Number inputs (min validation) + toggle. Note in UI: timeout/MFA may not be fully enforced client-side yet — still persist via API |
| `system` | `maintenanceMode`, `allowManualApplications`, `autoGenerateVisaOnApprove` | Toggles with short danger/help copy for maintenance + auto-visa |

Also show read-only meta if present: `updatedAt`, `updatedBy` (id string is fine).

### EmailTemplate

| Field | UI |
|-------|----|
| `code` | Read-only when editing existing; editable only for **new** template |
| `name` | Text |
| `subject` | Text |
| `htmlBody` | Textarea (monospace), tall |
| `textBody` | Textarea optional |
| `placeholders` | Chips / comma list (display only + editable tags) |
| `isActive` | Toggle |

### AuditLog (list)

Columns: When, Action, Resource, Actor (email / role / type), IP, View  
Row expand or modal: JSON `before` / `after` / `meta` (pretty-printed, scrollable)

---

## Screens & UX to implement

### 1) `/settings` — Settings hub
Prefer a **single page with section nav** (tabs or left subnav inside the main card), not a dashboard of tiny cards:

Tabs / sections:
1. **Branding**
2. **Notifications**
3. **Localization**
4. **Security**
5. **System**
6. **Email templates**

Load once with `GET /settings` on mount (and refetch after successful save).  
For Email templates tab: `GET /email-templates` on tab focus (or once if prefetched).

#### Save UX (platform sections)
- Keep local form state per section
- Primary CTA: **Save changes** (gold) — only send dirty section payload(s)
- Secondary: **Reset** to last loaded values
- Success toast/banner; API error banner
- Disable save while loading / if nothing dirty
- Optional: sticky footer actions

#### Email templates UX
- Left list of templates by `code` + active pill
- Right editor for selected template
- Actions: Save (`PUT`), New template (clear form for create upsert)
- Show placeholder helpers if `placeholders` present
- Confirm before creating a new `code` that might overwrite — backend upserts by code

#### System / security warnings
- `maintenanceMode`: amber callout — “Public/applicant flows may be affected”
- `allowManualApplications: false`: note that Admin create application API will 403
- `autoGenerateVisaOnApprove: false`: note that approve will not auto-issue visa PDF

### 2) `/audit-logs` — Audit log browser
(Enable the existing nav item)

- Title “Audit logs”, total count from meta
- Filters: `action` (text), `resourceType` (text or select of common types), optional `resourceId`
- Table + pagination (mirror Applications / Embassies)
- Poll optional (no) — refetch on filter change
- Detail drawer/modal for before/after JSON
- Empty + error states

Optional deep-link from Settings: small link “View audit logs” under Save success for settings updates.

---

## Frontend file plan (suggested)

```
admin-panel/src/api/settings.ts       # PlatformSettings + get/patch
admin-panel/src/api/emailTemplates.ts # list + upsert types
admin-panel/src/api/auditLogs.ts      # list types + query params
admin-panel/src/pages/Settings.tsx
admin-panel/src/pages/Settings.css
admin-panel/src/pages/AuditLogs.tsx
admin-panel/src/pages/AuditLogs.css
admin-panel/src/components/settings/   # optional: SettingsSection, ToggleRow, ColorField
```

Wire routes in `App.tsx`:
- `/settings`
- `/audit-logs`

Enable nav:
- `{ id: 'settings', ... enabled: true }`
- `{ id: 'audit', ... enabled: true }`

Reuse:
- `api/client.ts` → `apiFetch`
- form / modal / page header patterns from Embassies + Staff
- Status pills for Active/Inactive on templates

---

## Create & save acceptance checklist

After implementation, verify manually (backend running + admin logged in with `settings:manage` / `audit:read` — super admin seed has these):

1. Open **Settings** → branding loads (name / colors from DB defaults)
2. Change `platformName` → Save → reload page → value persists
3. Toggle `notifications.emailEnabled` off → Save → persists
4. Toggle `system.autoGenerateVisaOnApprove` → Save
5. Open **Email templates** → see seeded templates → edit subject → Save → list reflects change
6. Create new template with unique `code` → appears in list
7. Open **Audit logs** → see recent `settings.update` / `email_template.upsert` rows
8. Filter audit by `action=settings.update` works
9. Expand a row → before/after visible
10. `npm run build` passes for admin-panel
11. `progress.md` updated

---

## Design / UX notes

- Match Admin shell: cream canvas, teal sidebar, gold primary CTA
- One job per section; clear headings; short helper text under destructive toggles
- Color fields: native `<input type="color">` + hex text field synced
- Prefer denser forms over decorative cards — Settings is operational, not marketing
- Keyboard-usable toggles and tab panels; visible focus
- Do not apply branding colors live to the whole Admin shell in v1 (persist only; applying theme globally is optional polish)

---

## Out of scope (do not build now)

- Staff management (use `/staff`)
- Visa PDF templates (`/visa-templates`)
- Website CMS / Fees & Content pages
- Logo file upload (URL fields only)
- Enforcing `sessionTimeoutMinutes` / MFA in the SPA
- WebSocket live audit stream
- Delete settings document / hard reset beyond form Reset

---

## Implementation order

1. `api/settings.ts` + `api/emailTemplates.ts` + `api/auditLogs.ts` types  
2. `/settings` page shell + Branding section + save  
3. Notifications / Localization / Security / System sections  
4. Email templates list + editor  
5. `/audit-logs` page + filters + detail modal  
6. Enable nav + routes  
7. Build + smoke against running backend  
8. Update `progress.md`

Execute all of the above in one session. Prefer a working Settings + Audit UI over stubs. If permission helpers already exist on the staff session object, use them for hide/disable; otherwise rely on API 403 → clear error banner.
