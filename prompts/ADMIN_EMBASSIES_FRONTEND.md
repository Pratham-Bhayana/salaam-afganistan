# Prompt: Build Admin Panel — Embassies (production frontend, full section)

Copy everything below the line into Cursor / another AI coding agent.

---

## Role

You are a senior frontend engineer. Implement the **Admin Panel Embassies section** end-to-end at production quality in one pass. Wire **real backend APIs only** — no mock data. Match existing Admin Panel patterns, auth, design tokens, and components.

## Project context

- Workspace: Salaam Afghanistan
- Admin app: `admin-panel/` (Vite + React + TypeScript)
- Shared API: `backend/` Express + Mongo
- Admin base URL from env: `VITE_API_BASE_URL` → calls go to `{base}/api/v1/admin`
- Auth already works via `admin-panel/src/api/client.ts` + `AuthContext` + `RequireAuth` (JWT bearer + refresh). Reuse `apiFetch`.
- Design language already exists: teal `#0B3D2E` + gold accent, cream canvas, white main card, sidebar liquid nav — see `admin-panel/src/styles/tokens.css`
- Existing live sections to mirror: Applications list + ApplicationDetail
- Docs: `API_FRONTEND_GUIDE.md`, `progress.md`
- PRD: section **8.5 Embassy setup**

## Goal

Ship a complete Admin Embassies UI so operators can:

1. List / search / filter embassies
2. Create a new embassy
3. View embassy detail (profile + status pipeline counts + routed applications)
4. Edit an embassy
5. Connect applications to an embassy (assign + **Send to embassy**)

Also fix Application Detail so “Send to embassy” **requires selecting an embassy** when one is not already set (backend returns 400 otherwise).

Do **not** build embassy staff CRUD in the admin panel (staff is managed on embassy panel). Do **not** build chat UI unless needed for create side-effect messaging — backend auto-creates general chat room on embassy create.

---

## Hard constraints

- Production quality: loading, empty, error, disabled states; forms validated; optimistic-safe refetch after mutations
- No mock arrays; all data from live APIs
- Preserve existing design system — do not introduce purple themes, Inter/Roboto defaults, dashboard-clutter in forms
- Reuse `PageHeader`, `Modal`, `StatusPill`, `DataTable`-style patterns where sensible; create embassy-specific components if cleaner
- TypeScript strict; no `any` unless unavoidable
- Update `admin-panel/src/App.tsx` routes and enable nav item in `admin-panel/src/nav/adminNav.ts`
- Update `progress.md` when done
- Admin tokens only — never call `/api/v1/embassy/*` from admin panel

---

## Backend API contracts (use exactly)

Base: `/api/v1/admin`  
Permission write: `embassy:setup`  
Permission read: `embassy:setup` **or** `applications:read`

### List
`GET /embassies?page=&limit=&q=&isActive=true|false`

Response envelope:
```json
{ "success": true, "data": [Embassy], "meta": { "page", "limit", "total", "pages" } }
```

### Detail
`GET /embassies/:id`  
→ `{ embassy, statusCounts: [{ _id: status, count }] }`

### Create
`POST /embassies`
```json
{
  "code": "DXB",
  "name": "Dubai Consulate",
  "logoUrl": "https://...",
  "branding": { "primaryColor": "#0B3D2E", "secondaryColor": "#C4A35A" },
  "contact": {
    "email": "dubai@mfa.local",
    "phone": "+971...",
    "address": "...",
    "city": "Dubai",
    "country": "AE"
  },
  "jurisdictionCountries": ["AE", "SA", "QA"],
  "supportedVisaTypeCodes": ["embassy_tourist", "embassy_business"],
  "isActive": true,
  "notes": "optional"
}
```
- `code` and `name` are required
- `code` is uppercased + unique
- Side effect: creates general ChatRoom — no FE chat call required

### Update
`PATCH /embassies/:id`  
Updatable: `name`, `logoUrl`, `branding`, `contact`, `jurisdictionCountries`, `supportedVisaTypeCodes`, `isActive`, `notes`  
**Do not send `code` on update** (not editable)

### Routed applications for embassy
`GET /embassies/:id/applications?page=&limit=&status=`

### Visa types (for multi-select)
Use existing public/admin visa-types list if available in admin client; otherwise `GET /visa-types` under admin config routes. Prefer filtering `channel === 'embassy'` or show all with clear labels.

### Connect application → embassy
`POST /applications/:id/status`
```json
{
  "toStatus": "sent_to_embassy",
  "embassy": "<embassyObjectId>",
  "note": "Forwarded for consular review"
}
```
- Backend requires `embassy` on the application OR in this body
- Current ApplicationDetail already has a Send button but does **not** pass `embassy` — **fix this**

Optional pre-assign without status change:
`PATCH /applications/:id` with `{ "embassy": "<id>" }` if that endpoint accepts it (admin update does).

---

## Embassy model fields (UI mapping)

| Field | Required on create | UI |
|-------|--------------------|----|
| `code` | Yes | Short text, force uppercase display, hint “e.g. DXB” |
| `name` | Yes | Text |
| `contact.email` | Recommended | Email |
| `contact.phone` | Optional | Tel |
| `contact.address` | Optional | Textarea |
| `contact.city` | Recommended | Text |
| `contact.country` | Recommended | ISO country (text or select) |
| `jurisdictionCountries` | Recommended | Multi-select tags / chips (ISO uppercase) |
| `supportedVisaTypeCodes` | Recommended | Multi-select from visa types |
| `isActive` | Default true | Toggle |
| `notes` | Optional | Textarea |
| `logoUrl` | Optional | URL input (upload not required for v1) |
| `branding.primaryColor` | Optional | Color input |
| `branding.secondaryColor` | Optional | Color input |

---

## Screens & UX to implement

### 1) `/embassies` — List
- Page title “Embassies”, item count
- Search (`q`) debounced ~350ms
- Filter: All / Active / Inactive
- Table columns: Code, Name, City/Country, Supported visa types (count or chips), Active pill, Updated, Actions (View)
- Pagination (reuse Applications pagination UX)
- Primary CTA: **Create embassy**
- Empty state with CTA
- Poll optional (8–15s) or refetch on focus

### 2) `/embassies/new` — Create (or modal — prefer dedicated page for production forms)
Multi-section single form (one composition, not a card dashboard):

1. Identity — code, name, active
2. Contact — email, phone, address, city, country
3. Coverage — jurisdiction countries, supported visa types
4. Branding — logo URL, colors (collapsible / secondary)
5. Notes

Actions: Cancel → list; Save → `POST` → navigate to detail  
Inline field errors + API error banner  
Disable submit while loading  

### 3) `/embassies/:id` — Detail
Top: name, code badge, active status, Edit button  
Sections:
- Contact / jurisdictions / supported visas / notes
- **Pipeline snapshot** from `statusCounts` (simple stat row or mini bars — not dense)
- **Routed applications** table from `/embassies/:id/applications` (reference, applicant, visa type, status pill, sent date) → click opens `/applications/:id`

### 4) `/embassies/:id/edit` — Edit
Same fields as create **except code is read-only**  
`PATCH` then return to detail  

### 5) Application Detail — Send to embassy (fix + connect)
When `allowedNextStatuses` includes `sent_to_embassy`:
- If `app.embassy` already set: confirm dialog → status change with that id
- If missing: open Modal:
  - Select embassy from `GET /embassies?isActive=true&limit=100`
  - Optional note
  - Confirm → `POST .../status` with `{ toStatus: 'sent_to_embassy', embassy, note }`
- Show selected embassy on Travel & embassy card
- On success refetch application

---

## Frontend file plan (suggested)

```
admin-panel/src/api/embassies.ts          # types + list/get/create/update/applications
admin-panel/src/pages/Embassies.tsx
admin-panel/src/pages/Embassies.css
admin-panel/src/pages/EmbassyDetail.tsx
admin-panel/src/pages/EmbassyDetail.css
admin-panel/src/pages/EmbassyForm.tsx     # shared create/edit form
admin-panel/src/pages/EmbassyForm.css
```

Wire routes in `App.tsx`:
- `/embassies`
- `/embassies/new`
- `/embassies/:id`
- `/embassies/:id/edit`

Enable nav: `{ id: 'embassies', ... enabled: true }`

Reuse existing:
- `api/client.ts` → `apiFetch`
- `components/Modal`, `StatusPill`, `PageHeader` patterns
- Application detail action button styles

---

## Create & connect end-to-end acceptance checklist

After implementation, verify manually:

1. Login admin (`admin@salaam.local` / seeded password)
2. Embassies nav opens live list (seeded `DXB` visible)
3. Create embassy with code+name+contact+jurisdictions+visa types → appears in list
4. Open detail → status counts + applications table load
5. Edit name/contact → PATCH succeeds; code unchanged
6. On a **pending** application, click Send to embassy → pick embassy if needed → status becomes `sent_to_embassy`
7. Same application appears under that embassy’s applications table and in Embassy Panel active inbox
8. Inactive embassies do not appear in the Send-to-embassy picker
9. `npm run build` passes for admin-panel
10. `progress.md` updated

---

## Design / UX notes

- Match Admin shell: cream canvas, teal sidebar, gold CTA accents
- Forms: clear section headings, one job per section, no decorative card spam
- Buttons: gold for primary create; brand teal for secondary; danger only for destructive (none required here)
- Status pills already exist — reuse
- Country codes and visa type codes always uppercase / canonical codes from API
- Accessible labels, keyboard-usable modals

---

## Out of scope (do not build now)

- Embassy staff invite/create from admin
- File upload for logos (URL field only)
- Chat UI
- Delete embassy
- Map / geo
- Bulk import embassies

---

## Implementation order

1. `api/embassies.ts` + types  
2. List page + nav + routes  
3. Create form  
4. Detail + routed apps  
5. Edit form  
6. Fix ApplicationDetail send-to-embassy with embassy picker  
7. Build + smoke against running backend  
8. Update `progress.md`

Execute all of the above in one session. Prefer working UI over partial stubs. If a visa-types endpoint path is uncertain, search `admin-panel` and `backend/src/routes/admin` and wire the real one.
