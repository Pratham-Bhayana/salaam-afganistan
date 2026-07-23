# Salaam Afghanistan — Frontend API Guide

**Audience:** Frontend developers (Admin Panel, Embassy Panel, Website)  
**Base URL (local):** `http://localhost:5000`  
**API prefix:** `/api/v1`  
**Last updated:** 13 July 2026  

> Read this top-to-bottom once. Then use the **Screen → API map** when building pages.  
> Admin / Embassy / Website use **different** login endpoints and tokens — do not mix them.  
> **Website auth = Firebase on the client** (Google / Email / Phone), then exchange ID token with our backend.

---

## Table of contents

1. [Quick start](#1-quick-start)
2. [Response format (always the same)](#2-response-format-always-the-same)
3. [Auth for Admin Panel](#3-auth-for-admin-panel)
4. [Roles & permissions (what buttons to show)](#4-roles--permissions-what-buttons-to-show)
5. [Application status workflow](#5-application-status-workflow)
6. [Public APIs (Website)](#6-public-apis-website)
7. [Admin APIs by screen](#7-admin-apis-by-screen)
8. [Embassy Panel APIs](#8-embassy-panel-apis)
9. [Website applicant APIs (Firebase)](#9-website-applicant-apis-firebase)
10. [File uploads & downloads](#10-file-uploads--downloads)
11. [Common query params](#11-common-query-params)
12. [Error codes cheat sheet](#12-error-codes-cheat-sheet)
13. [Screen → API map](#13-screen--api-map)

---

## 1. Quick start

```bash
# 1) Start backend
cd backend && npm run seed && npm run dev

# 2a) Login (Admin)
POST /api/v1/admin/auth/login
{ "email": "admin@salaam.local", "password": "ChangeMeNow!123" }

# 2b) Login (Embassy)
POST /api/v1/embassy/auth/login
{ "email": "embassy.admin@salaam.local", "password": "ChangeMeNow!123" }

# 2c) Website (Firebase on client, then):
POST /api/v1/website/auth/firebase
{ "idToken": "<firebaseIdToken>" }

# 3) Use the matching token
Authorization: Bearer <accessToken>
```

| Client | Uses which APIs? | Auth? |
|--------|------------------|-------|
| **Website** (applicant) | §6 public + **§9 website** | Firebase → our JWT |
| **Admin Panel** | Section 7 — Admin | `/admin/auth/*` JWT |
| **Embassy Panel** | Section 8 — Embassy | `/embassy/auth/*` JWT |

---

## 2. Response format (always the same)

### Success
```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```
- `data` — the payload (object or array)
- `meta` — optional pagination / counts (not always present)

### Error
```json
{
  "success": false,
  "message": "Human readable error",
  "details": [ { "field": "email", "message": "Valid email required" } ]
}
```

**Frontend rule:** always check `success`. Never assume `data` exists on failure.

---

## 3. Auth for Admin Panel

### Why these endpoints exist
Staff must log in. Access tokens are short-lived. Refresh tokens renew the session without asking for password again.

| Method | Path | When to call |
|--------|------|--------------|
| `POST` | `/api/v1/admin/auth/login` | Login screen submit |
| `POST` | `/api/v1/admin/auth/refresh` | Access token expired (401) |
| `POST` | `/api/v1/admin/auth/logout` | Logout button |
| `GET` | `/api/v1/admin/auth/me` | App boot — restore session / menus |
| `POST` | `/api/v1/admin/auth/forgot-password` | Forgot password form |
| `POST` | `/api/v1/admin/auth/reset-password` | Reset password form (with token) |

### Login body
```json
{ "email": "admin@salaam.local", "password": "ChangeMeNow!123" }
```

### Login response (important fields)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": "15m",
    "staff": {
      "_id": "...",
      "firstName": "Super",
      "lastName": "Admin",
      "email": "admin@salaam.local",
      "role": "super_admin"
    },
    "permissions": ["applications:read", "staff:manage", "..."]
  }
}
```

### Frontend storage recommendation
| Store | What |
|-------|------|
| Memory or secure storage | `accessToken` |
| Secure storage | `refreshToken` |
| App state | `staff` + `permissions` |

### Header on every protected admin call
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Suggested auth flow
1. Login → save tokens + permissions  
2. On `401` with message about expired token → call refresh → retry original request  
3. If refresh fails → redirect to login  

---

## 4. Roles & permissions (what buttons to show)

Use `data.permissions` from login/`/me` to show/hide UI. Do **not** hardcode screens by role alone — check permission strings.

### Roles
| Role value | Meaning |
|------------|---------|
| `super_admin` | Full access |
| `case_manager` | Applications, chat, visas, limited finance view |
| `finance` | Payments & reports |
| `receptionist` | Lookup + basic intake only |

### Permission → UI feature map

| Permission | Show this in UI |
|------------|-----------------|
| `applications:read` | Applications inbox, detail view |
| `applications:write` | Edit application, create (ops) |
| `applications:status` | Change status buttons |
| `applications:intake` | Receptionist create/intake |
| `fees_content:manage` | Visa types, fees, docs, FAQs |
| `finance:read` | Finance dashboard / payment list |
| `finance:write` | Record / update payments |
| `reports:export` | Export finance CSV |
| `staff:manage` | Staff management page |
| `embassy:setup` | Embassy CRUD |
| `chat:access` | Embassy chat |
| `settings:manage` | Settings + email templates |
| `templates:manage` | Visa template designer |
| `documents:deliver` | “Send document to applicant” |
| `visas_issued:manage` | Issued visas + issue action |
| `records:export` | Export applications / visas CSV |
| `audit:read` | Audit log page |

**Example:**
```js
const canChangeStatus = permissions.includes('applications:status');
```

---

## 5. Application status workflow

Statuses are **snake_case strings**. Only certain transitions are allowed. Illegal transitions return `400`.

### Status values
| Status | Meaning for UI badge |
|--------|----------------------|
| `draft` | Not submitted yet |
| `pending` | Awaiting admin review |
| `documents_required` | Waiting for applicant docs |
| `sent_to_embassy` | Forwarded to embassy |
| `under_embassy_review` | Embassy reviewing |
| `approved` | Approved (visa may auto-generate) |
| `rejected` | Declined |
| `visa_issued` | Visa PDF ready |
| `closed` | Closed |
| `archived` | Archived |

### Allowed transitions (admin / case manager)
```
draft → pending
pending → documents_required | sent_to_embassy | rejected
documents_required → pending | rejected
sent_to_embassy → under_embassy_review
under_embassy_review → approved | rejected | documents_required
approved → visa_issued   (often automatic on approve)
rejected → closed
visa_issued → closed | archived
closed → archived
```

### How to change status
```http
POST /api/v1/admin/applications/:id/status
Authorization: Bearer <token>

{
  "toStatus": "sent_to_embassy",
  "note": "Forwarded to Dubai",
  "embassy": "<embassyObjectId>"   // required when sending to embassy if not already set
}
```

### Detail response helper
`GET /applications/:id` returns `allowedNextStatuses: string[]` — **use this to render status action buttons**. Don’t guess.

---

## 6. Public APIs (Website)

No auth. Use these to build the applicant visa wizard.

### 6.1 List visa types
`GET /api/v1/visa-types`

| Query | Purpose |
|-------|---------|
| `channel=evisa` or `embassy` | Filter by channel |
| `includeInactive=true` | Include inactive (normally don’t) |

**Use for:** Visa type selection step.

### 6.2 Full visa type bundle
`GET /api/v1/visa-types/:code`

Example: `/api/v1/visa-types/evisa_tourist`

Returns one object with:
- visa type info
- `eligibility`
- `documents` (what files to ask for)
- `formFields` (what inputs to render)
- `fees`

**Use for:** Building the whole application form dynamically from backend config.

### 6.3 Pieces separately (if you prefer)
| Method | Path | Use for |
|--------|------|---------|
| `GET` | `/visa-types/:code/documents` | Upload checklist only |
| `GET` | `/visa-types/:code/form-fields` | Form fields only |
| `GET` | `/visa-types/:code/fees?nationality=US&processing=standard` | Fee display |

### 6.4 Eligibility check
`POST /api/v1/eligibility/check`

```json
{
  "nationality": "FR",
  "residence": "FR",
  "visaTypeCode": "evisa_tourist"
}
```
- `nationality` / `residence` = ISO country codes (`FR`, `IN`, `US`…)
- Omit `visaTypeCode` to check all active types

**Use for:** Before starting eVisa — show eligible / blocked message.

---

## 7. Admin APIs by screen

All paths below are under `/api/v1/admin` and need Bearer token (except login/forgot/reset).

---

### A) Staff management
**Screen:** Settings → Staff  
**Permission:** `staff:manage`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/staff` | List staff (`?q=&role=&isActive=&page=`) |
| `GET` | `/staff/:id` | Staff detail |
| `POST` | `/staff` | Create staff |
| `PATCH` | `/staff/:id` | Update staff / password / role |
| `DELETE` | `/staff/:id` | Soft deactivate |

**Create body example:**
```json
{
  "firstName": "Amina",
  "lastName": "Khan",
  "email": "amina@salaam.local",
  "password": "TempPass!123",
  "role": "case_manager",
  "phone": "+971..."
}
```

Valid roles: `super_admin` | `case_manager` | `finance` | `receptionist`

---

### B) Applications inbox & detail
**Screen:** Applications  
**Permissions:** `applications:read` / `write` / `status` / `intake`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/applications` | Inbox list + filters |
| `GET` | `/applications/:id` | Full detail (docs, payments, activity, allowedNextStatuses) |
| `POST` | `/applications` | Manual / walk-in / phone create |
| `PATCH` | `/applications/:id` | Edit personal/passport/travel |
| `POST` | `/applications/:id/status` | Change status |
| `POST` | `/applications/:id/notes` | Add internal note |

**List filters (query):**
`status`, `visaTypeCode`, `embassy`, `channel`, `paymentStatus`, `source`, `q`, `from`, `to`, `period=monthly|quarterly|yearly`, `page`, `limit`

**Manual create body (minimum):**
```json
{
  "visaTypeCode": "embassy_tourist",
  "source": "admin_manual",
  "personal": {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "nationality": "GB",
    "countryOfResidence": "AE",
    "phone": "+971..."
  },
  "passport": { "passportNumber": "GB1234567", "expiryDate": "2030-01-01" },
  "travel": {
    "purpose": "Tourism",
    "intendedEntryDate": "2026-08-01",
    "intendedExitDate": "2026-08-20",
    "stayDurationDays": 19,
    "addressInAfghanistan": "Kabul"
  },
  "embassy": "<optionalEmbassyId>"
}
```

---

### C) Documents (deliver to applicant)
**Screen:** Application detail → Documents  
**Permission:** `documents:deliver` (deliver), `applications:read` (list/download)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/applications/:id/documents` | List docs on application |
| `POST` | `/applications/:id/documents/deliver` | Upload + send to applicant profile (+ email) |
| `POST` | `/applications/:id/documents/request` | Request document(s) by name → status `documents_required` + pending `requestedDocuments` |
| `GET` | `/documents/:documentId/download` | Download file binary |

**Deliver = multipart form-data** (not JSON):
| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `file` | file | yes | The document |
| `label` | text | no | Display name |
| `key` | text | no | Internal key (default `admin_delivery`) |
| `note` | text | no | Message to applicant |
| `category` | text | no | `admin_delivery` / `correspondence` / `visa_document` |
| `visibleToApplicant` | text | no | `"false"` to hide from applicant |

```js 
const form = new FormData();
form.append('file', fileInput.files[0]);
form.append('label', 'Request letter');
form.append('note', 'Please review and respond');

await fetch(`${BASE}/api/v1/admin/applications/${id}/documents/deliver`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }, // do NOT set Content-Type manually
  body: form,   
});
```

---

### D) Receptionist
**Screen:** Receptionist quick lookup  
**Permission:** `applications:intake` or `applications:read`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/receptionist/lookup?q=SA-2026-...` | Search by reference / name / email / passport |

Also use `POST /applications` for walk-in intake.

---

### E) Records & exports
**Screen:** Reports / Records  
**Permissions:** `records:export`, `applications:read`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/records/summary` | Counts by status / visa type |
| `GET` | `/records/export` | Download applications CSV |

Query: `period`, `from`, `to`, `embassy`, `visaTypeCode`, `status`

CSV endpoints return raw `text/csv` (not JSON wrapper).

---

### F) Finance
**Screen:** Finance  
**Permissions:** `finance:read` / `finance:write` / `reports:export`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/finance/dashboard` | Revenue charts data |
| `GET` | `/finance/payments` | Payment list / reconciliation |
| `POST` | `/finance/payments` | Manually record a payment |
| `PATCH` | `/finance/payments/:id/status` | Mark paid / failed / refunded |
| `GET` | `/finance/payments/export` | Payments CSV |

**Record payment:**
```json
{
  "applicationId": "...",
  "amount": 80,
  "currency": "USD",
  "status": "successful",
  "stage": "flat",
  "notes": "Cash at counter"
}
```

Payment statuses: `pending` | `successful` | `failed` | `refunded` | `cancelled`

---

### G) Embassies
**Screen:** Embassies  
**Permission:** `embassy:setup` (write), read also allowed with `applications:read`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/embassies` | List embassies |
| `GET` | `/embassies/:id` | Detail + status counts of routed apps |
| `POST` | `/embassies` | Create embassy (+ auto general chat room) |
| `PATCH` | `/embassies/:id` | Update embassy |
| `GET` | `/embassies/:id/applications` | Apps sent to this embassy |

**Create example:**
```json
{
  "code": "DXB",
  "name": "Dubai Consulate",
  "contact": { "email": "dubai@mfa.local", "city": "Dubai", "country": "AE" },
  "jurisdictionCountries": ["AE", "SA"],
  "supportedVisaTypeCodes": ["embassy_tourist", "embassy_business"]
}
```

---

### H) Chat with embassy
**Screen:** Chat / case coordination  
**Permission:** `chat:access`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/chat/rooms?embassy=&type=&application=` | List rooms |
| `POST` | `/chat/rooms/application` | Ensure a case-specific room exists |
| `GET` | `/chat/rooms/:roomId/messages` | Message history (paginated) |
| `POST` | `/chat/rooms/:roomId/messages` | Send message (+ optional files) |

**Open/create case room:**
```json
{
  "embassyId": "...",
  "applicationId": "...",
  "title": "Case SA-2026-ABC"
}
```

**Send message:** `multipart/form-data`  
- `body` (text, required)  
- `attachments` (files, optional, up to 5)

---

### I) Website content (CMS)
**Screen:** Content / FAQs / Banners  
**Permission:** `fees_content:manage`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/content?type=faq` | List content |
| `POST` | `/content` | Create |
| `PATCH` | `/content/:id` | Update |
| `DELETE` | `/content/:id` | Delete |

`type`: `announcement` | `banner` | `faq` | `page`

---

### J) Visa config (fees, docs, fields)
**Screen:** Visa configuration  
**Permission:** `fees_content:manage`

These drive the **Website** application form. Edit here → website reflects without redeploy.

| Resource | Base path | Purpose |
|----------|-----------|---------|
| Visa types | `/visa-types` | Types, stay, channel, active flag |
| Eligibility | `/eligibility-rules` | Blocked nationalities / residences |
| Documents | `/document-requirements` | Required uploads per visa type |
| Form fields | `/form-fields` | Form inputs per visa type |
| Fee rules | `/fee-rules` | Amounts by nationality / processing |

Each resource supports:
- `GET /` list (`?visaTypeCode=` where relevant)
- `GET /:id`
- `POST /` create
- `POST /upsert` upsert by unique keys
- `PATCH|PUT /:id` update
- `DELETE /:id`

---

### K) Issued visas & templates
**Screen:** Issued Visas / Template Designer  
**Permissions:** `visas_issued:manage`, `templates:manage`, `records:export`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/issued-visas` | Search issued visas |
| `GET` | `/issued-visas/:id` | Detail |
| `GET` | `/issued-visas/:id/download` | Download PDF |
| `POST` | `/issued-visas/preview` | Generate PDF preview (no save / email / status change) |
| `POST` | `/issued-visas/issue` | Persist visa PDF to application documents (+ optional email) |
| `GET` | `/issued-visas/export` | CSV export |
| `GET` | `/visa-templates` | List active templates (expect one: `evisa_default`) |
| `GET` | `/visa-templates/default` | Get the single production eVISA template |
| `GET` | `/visa-templates/:id` | Template detail (`id`, `default`, or `evisa_default`) |
| `PUT` | `/visa-templates` | Upsert the eVISA template (by `code`; deactivates others) |

**Product rule:** There is **one** active template (`code: evisa_default`). Layout is shared; body fields are stored per visa type under `fieldsByVisaType` (`tourist` \| `business` \| `student` \| `transit`). Approving/issuing a visa maps `application.visaTypeCode` → that key and draws only those fields on the PDF.

**Admin approve flow (preview → save & send):**
1. `POST /issued-visas/preview` `{ "applicationId": "..." }` → PDF bytes (inline)
2. `POST /applications/:id/status` `{ "toStatus": "approved", "autoIssueVisa": false }` (skip auto-issue)
3. `POST /issued-visas/issue` `{ "applicationId": "...", "sendEmail": true }` → saves `ApplicationDocument` (`key: issued_visa`, visible to applicant), upserts `IssuedVisa`, status → `visa_issued`, optional email

**Preview** (no DB write beyond reading the app/template):
```json
{ "applicationId": "..." }
```

**Issue:**
```json
{ "applicationId": "...", "force": false, "sendEmail": true }
```

**Upsert body (admin Template Designer):**
```json
{
  "code": "evisa_default",
  "name": "Salaam eVISA Template",
  "activeVisaType": "tourist",
  "placeholders": [{ "key": "applicant_name", "label": "Full Name" }],
  "fieldsByVisaType": {
    "tourist": [{ "key": "applicant_name", "label": "Full Name" }],
    "business": [{ "key": "applicant_name", "label": "Full Name" }],
    "student": [{ "key": "applicant_name", "label": "Full Name" }],
    "transit": [{ "key": "applicant_name", "label": "Full Name" }]
  },
  "layout": {
    "govLine": "ISLAMIC EMIRATE OF AFGHANISTAN",
    "ministryLine": "Ministry of Foreign Affairs",
    "systemLine": "Salaam Afghanistan — Electronic Visa System",
    "sectionTitle": "eVISA Holder Information",
    "accentColor": "#1B4D45",
    "fontSize": 11,
    "salaamLogoUrl": "/Logo.png",
    "embassyLogoUrl": "/taliban-flag.png",
    "disclaimer": "...",
    "showPhoto": true,
    "showPageNumbers": false
  },
  "includeQr": true,
  "includeBarcode": true,
  "isDefault": true,
  "isActive": true
}
```

**Manual issue:**
```json
{ "applicationId": "...", "force": false, "sendEmail": true }
```

Note: Embassy approve still auto-generates when `autoGenerateVisaOnApprove` is true. Admin Application Detail uses preview-first with `autoIssueVisa: false`.

---

### L) Settings, email templates, audit
**Screen:** Settings / Audit  
**Permissions:** `settings:manage`, `audit:read`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/settings` | Platform branding, notifications, system flags |
| `PATCH` | `/settings` | Update settings sections |
| `GET` | `/email-templates` | List email templates |
| `PUT` | `/email-templates` | Upsert template by `code` |
| `GET` | `/audit-logs` | Who did what (paginated) |

**Settings PATCH** — send only sections you change:
```json
{
  "branding": { "platformName": "Salaam Afghanistan", "primaryColor": "#0B3D2E" },
  "notifications": { "emailEnabled": true },
  "system": { "autoGenerateVisaOnApprove": true }
}
```

---

## 8. Embassy Panel APIs

All paths below are under `/api/v1/embassy`.  
Use **embassy** login tokens only. Admin tokens are rejected (`Invalid embassy access token`).

### 8.1 Why a separate module?
Embassy staff only see applications **routed to their embassy**. They cannot access admin finance, settings, or other embassies.

### 8.2 Auth
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/login` | Embassy login |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/auth/me` | Current embassy staff + embassy + permissions |
| `POST` | `/auth/forgot-password` | Forgot password |
| `POST` | `/auth/reset-password` | Reset with token |

**Seeded embassy admin:**  
`embassy.admin@salaam.local` / `ChangeMeNow!123` (embassy `DXB`)

### 8.3 Embassy roles & permissions

| Role | Meaning |
|------|---------|
| `embassy_admin` | Full embassy scope (staff, reports, assign, decide) |
| `embassy_staff` | Review/decide + chat (no staff manage / no reports unless granted via admin role) |

| Permission | UI feature |
|------------|------------|
| `embassy.applications:read` | Inbox + detail |
| `embassy.applications:decide` | Approve / reject / documents required / start review |
| `embassy.applications:assign` | Assign case to staff |
| `embassy.chat:access` | Chat with Raizing Global |
| `embassy.reports:read` | Reports dashboard (embassy_admin) |
| `embassy.staff:manage` | Manage embassy staff (embassy_admin) |
| `embassy.activity:read` | Activity logs |
| `embassy.documents:view` | View/download application documents |

`accessMode` on staff:
- `all` — see every app for this embassy  
- `assigned` — see only apps assigned to them  

### 8.4 Embassy status decisions (PRD 9.2)

Only these transitions are allowed from the Embassy panel:

```
sent_to_embassy → under_embassy_review | approved | rejected | documents_required
under_embassy_review → approved | rejected | documents_required
approved → visa_issued   (auto after approve when settings allow)
```

Use `allowedNextStatuses` from application detail to render buttons.

**Decide:**
```http
POST /api/v1/embassy/applications/:id/decide
Authorization: Bearer <embassyToken>

{ "toStatus": "approved", "note": "Approved by DXB" }
```

On `approved`, visa PDF is usually auto-generated → status becomes `visa_issued`.

### 8.5 Applications (scoped)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/applications` | Embassy inbox |
| `GET` | `/applications/:id` | Full detail + docs + allowedNextStatuses |
| `POST` | `/applications/:id/decide` | Decisioning |
| `POST` | `/applications/:id/assign` | Assign to embassy staff |
| `POST` | `/applications/:id/notes` | Internal note |
| `GET` | `/applications/:id/documents/:documentId` | View/download document (logged) |

**Useful list queries:**
- `inbox=active` — awaiting embassy action  
- `status=`, `q=`, `page=`, `from=`, `to=`

**Assign body:**
```json
{ "embassyStaffId": "<id>" }
```
Send `null` / omit to unassign (use `embassyStaffId: null`).

### 8.6 Chat with Raizing Global + other embassies
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/chat/peer-embassies` | Other active embassies (`name`, `code`) for coordination picker |
| `GET` | `/chat/unread` | `{ totalUnread }` for nav badge |
| `GET` | `/chat/rooms` | Rooms where this embassy is `embassy` or `peerEmbassy`; each includes `unreadCount` |
| `POST` | `/chat/rooms/application` | Ensure case room exists |
| `POST` | `/chat/rooms/inter-embassy` | Ensure coordination room with another embassy |
| `GET` | `/chat/rooms/:roomId/messages` | History (marks room read by default; `?markRead=false` to skip) |
| `POST` | `/chat/rooms/:roomId/read` | Explicitly mark room messages as read |
| `POST` | `/chat/rooms/:roomId/messages` | Send message (`body` + optional `attachments`) |

```json
{ "applicationId": "...", "title": "Case SA-2026-..." }
```

**Start / open mission-to-mission chat:**
```json
{ "peerEmbassyId": "<otherEmbassyObjectId>", "title": "optional" }
```

Room `type`: `general` | `application` | `inter_embassy`.  
Inter-embassy rooms include `peerEmbassy` and a unique `pairKey`. Both embassies share the same thread.

**Unread / read receipts:** messages store `readBy[{ readerType, readerId, readAt }]`. Opening a thread marks others’ messages as read. Senders see **Sent** until a peer has read (**Seen**).

### 8.7 Reports (embassy-scoped)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/reports` | Volumes, approval/rejection rates, turnaround hours |
| `GET` | `/reports/payments` | Payment totals for this embassy |

### 8.8 Activity logs (PRD 9.5)
`GET /activity-logs` — logins, views, decisions, chat, document views.

### 8.9 Staff management (PRD 9.6)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/staff` | List staff in **this** embassy only |
| `POST` | `/staff` | Create embassy staff |
| `PATCH` | `/staff/:id` | Update |
| `DELETE` | `/staff/:id` | Deactivate |

```json
{
  "firstName": "Sara",
  "lastName": "Nazari",
  "email": "sara.embassy@salaam.local",
  "password": "TempPass!123",
  "role": "embassy_staff",
  "accessMode": "all"
}
```

---

## 9. Website applicant APIs (Firebase)

All paths under `/api/v1/website` (except public visa-config in §6).

### 9.1 Auth model (important)

**Client (Next.js website) uses Firebase Auth for signup/login:**
- Google Sign-In
- Email + password
- Phone OTP (mobile number)

**Backend does not store Firebase passwords.** Flow:

1. User signs in with Firebase (Google / Email / Phone)  
2. Client gets `idToken = await user.getIdToken()`  
3. Client calls `POST /api/v1/website/auth/firebase` with that token  
4. Backend verifies token (Firebase Admin in production)  
5. Backend upserts `Applicant` (name, email, phone, providers)  
6. Backend returns **our** `accessToken` + `refreshToken`  
7. All other website APIs use `Authorization: Bearer <accessToken>`

### 9.2 Firebase exchange
`POST /api/v1/website/auth/firebase`

```json
{
  "idToken": "<firebase_id_token>",
  "profile": {
    "firstName": "Jane",
    "lastName": "Doe",
    "displayName": "Jane Doe"
  }
}
```

Optional `profile` fills name if Firebase token doesn’t include it.

**Response includes:** `accessToken`, `refreshToken`, `applicant`, `auth.provider` (`google.com` | `password` | `phone`).

Also:
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/refresh` | Refresh our JWT |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/auth/me` | Current applicant |

**Local/dev without Firebase project:** set `FIREBASE_AUTH_MODE=dev` and send:
```json
{ "idToken": "dev:{\"uid\":\"user_1\",\"email\":\"a@b.com\",\"name\":\"Jane\",\"firebase\":{\"sign_in_provider\":\"google.com\"}}" }
```

**Production:** `FIREBASE_AUTH_MODE=live` + `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`.

### 9.3 Profile & dashboard
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/dashboard` | Profile + applications list + unread notifications |
| `GET` | `/profile` | Full profile |
| `PATCH` | `/profile` | Update name, nationality, residence, address, DOB, sex |

Email/phone are primarily owned by Firebase. Profile can set them only if currently empty (e.g. complete profile after phone signup).

### 9.4 Applications (collect from website)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/applications` | My applications |
| `POST` | `/applications` | Create **draft** |
| `GET` | `/applications/:id` | Detail: status, activity, docs, payments, visa, updates |
| `PATCH` | `/applications/:id` | Save-and-resume (draft only) |
| `POST` | `/applications/:id/submit` | Submit draft → `pending` |

**Create draft example:**
```json
{
  "visaTypeCode": "evisa_tourist",
  "personal": {
    "fullName": "Jane Website",
    "nationality": "GB",
    "countryOfResidence": "AE",
    "email": "jane@example.com"
  },
  "travel": {
    "purpose": "Tourism",
    "intendedEntryDate": "2026-12-01",
    "intendedExitDate": "2026-12-20",
    "stayDurationDays": 19,
    "addressInAfghanistan": "Kabul",
    "processingSpeed": "standard"
  }
}
```

**Detail `updates` object** (for profile status UI):
```json
{
  "status": "pending",
  "documentRequestNote": null,
  "rejectionReason": null,
  "lastUpdatedAt": "..."
}
```

> Admin can still create applications via `POST /admin/applications` (manual/walk-in). If that applicant later logs in with the same email/phone via Firebase, accounts can link.

### 9.5 Documents
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/applications/:id/documents` | List visible docs |
| `POST` | `/applications/:id/documents` | Upload (`multipart`: `file` + `key` + optional `label`) |
| `GET` | `/applications/:id/documents/:documentId/download` | Download |
| `GET` | `/applications/:id/visa/download` | Download issued visa PDF |

Uploads allowed in: `draft`, `pending`, `documents_required`.

### 9.6 Notifications
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/notifications` | List (`unreadOnly=true` optional) |
| `POST` | `/notifications/:id/read` | Mark one read |
| `POST` | `/notifications/read-all` | Mark all read |

Created on submit and when admin/embassy changes status / delivers docs (existing notification pipeline).

### 9.7 Payments (stub)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/applications/:id/fees` | Fee quote from fee rules |
| `POST` | `/applications/:id/payments` | Initiate stub payment |
| `POST` | `/applications/:id/payments/:paymentId/confirm` | Confirm success/fail |

Replace stub with Stripe/local gateway later; FE contract stays similar.

### 9.8 Realtime status
Phase 1: poll `GET /applications/:id` or `/dashboard` / `/notifications`.  
WebSocket push can be Phase 2.

---

## 10. File uploads & downloads

| Action | Content-Type | Notes |
|--------|--------------|-------|
| JSON APIs | `application/json` | Normal |
| Deliver document | `multipart/form-data` | Field name: `file` |
| Chat send with files | `multipart/form-data` | Field name: `attachments` |
| Downloads (docs/visa PDF/CSV) | binary / `text/csv` | Not JSON — handle as blob |

Allowed upload types: `jpg`, `png`, `webp`, `pdf` (max ~10–15MB depending on endpoint).

---

## 11. Common query params

| Param | Used on | Meaning |
|-------|---------|---------|
| `page`, `limit` | Most lists | Pagination (default limit 20) |
| `q` | Search lists | Free-text search |
| `from`, `to` | Records/finance | ISO date range |
| `period` | Records/finance | `monthly` \| `quarterly` \| `yearly` |
| `status` | Applications/payments | Filter by status |
| `visaTypeCode` | Many | e.g. `evisa_tourist` |
| `embassy` | Apps/finance | Embassy ObjectId |

---

## 12. Error codes cheat sheet

| HTTP | Meaning | Frontend action |
|------|---------|-----------------|
| `400` | Bad request / illegal status transition | Show `message` (+ `details.allowed` if present) |
| `401` | Missing/expired/invalid token | Refresh or redirect to login |
| `403` | No permission for this action | Hide button / show “not allowed” |
| `404` | Not found | Empty state |
| `409` | Duplicate (email, etc.) | Show field error |
| `422` | Validation failed | Map `details[]` to form fields |
| `429` | Rate limited | Retry later |

---

## 13. Screen → API map

| Admin screen | Primary APIs |
|--------------|--------------|
| Login | `POST /admin/auth/login` |
| App shell / sidebar | `GET /admin/auth/me` + `permissions` |
| Applications inbox | `GET /admin/applications` |
| Application detail | `GET /admin/applications/:id` |
| Change status | `POST /admin/applications/:id/status` |
| Send doc to applicant | `POST /admin/applications/:id/documents/deliver` |
| Manual intake | `POST /admin/applications` |
| Receptionist search | `GET /admin/receptionist/lookup` |
| Finance dashboard | `GET /admin/finance/dashboard` |
| Payments list | `GET /admin/finance/payments` |
| Embassies | `GET/POST/PATCH /admin/embassies` |
| Chat | `/admin/chat/rooms*` |
| Visa config | `/admin/visa-types`, `fee-rules`, `form-fields`, `document-requirements` |
| Content / FAQ | `/admin/content` |
| Issued visas | `/admin/issued-visas` |
| Template designer | `/admin/visa-templates` |
| Staff | `/admin/staff` |
| Settings | `/admin/settings` |
| Audit | `/admin/audit-logs` |

| Embassy screen | Primary APIs |
|----------------|--------------|
| Login | `POST /embassy/auth/login` |
| App shell | `GET /embassy/auth/me` |
| Active inbox | `GET /embassy/applications?inbox=active` |
| Case detail | `GET /embassy/applications/:id` |
| Decide | `POST /embassy/applications/:id/decide` |
| Assign case | `POST /embassy/applications/:id/assign` |
| Chat | `/embassy/chat/rooms*` |
| Reports | `GET /embassy/reports` |
| Activity logs | `GET /embassy/activity-logs` |
| Staff management | `/embassy/staff` |

| Website screen | Primary APIs |
|----------------|--------------|
| Firebase login (Google/Email/Phone) | Client Firebase → `POST /website/auth/firebase` |
| Profile / home | `GET /website/dashboard`, `GET/PATCH /website/profile` |
| Choose visa type | `GET /visa-types` |
| Eligibility gate | `POST /eligibility/check` |
| Dynamic form checklist | `GET /visa-types/:code` |
| Create / save draft | `POST/PATCH /website/applications` |
| Submit application | `POST /website/applications/:id/submit` |
| Track status / updates | `GET /website/applications/:id` |
| Upload docs | `POST /website/applications/:id/documents` |
| Download visa | `GET /website/applications/:id/visa/download` |
| Notifications | `GET /website/notifications` |
| Fees / pay (stub) | `/website/applications/:id/fees`, `/payments` |

---

## Health check

`GET /health` → `{ success: true, status: "ok" }`  
Use for frontend “API reachable” checks during local setup.

---

## Notes for FE team

1. **IDs** in paths are Mongo ObjectIds (`24` hex chars), except visa type `code` like `evisa_tourist`.  
2. **Country codes** are ISO-2 uppercase (`US`, `IN`, `AE`).  
3. **Permissions drive UI** — don’t show actions the role can’t call.  
4. **Status buttons** come from `allowedNextStatuses` on application detail.  
5. **Admin / Embassy / Website tokens are separate** — never mix route prefixes.  
6. **Website signup/login is Firebase-first** (Google, email, phone); backend only verifies ID tokens.  
7. Admin can still create applications manually (`POST /admin/applications`).

Questions / gaps → update this file when new modules land.
