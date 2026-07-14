# Salaam Afghanistan — Progress Log

**Last updated:** 14 July 2026 (Admin Embassies section live)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API) |
| Embassy backend (PRD §9) | Done |
| Website applicant APIs (Firebase auth) | Done |
| **Admin Panel frontend** | **Dashboard + Applications + Embassies live** |
| Embassy / Website frontends | Not started |
| Live payment gateway / OCR / WebSockets | Not started |

---

## Completed (latest)

### Admin Embassies — live backend wiring (PRD §8.5)
- Nav + routes: `/embassies`, `/embassies/new`, `/embassies/:id`, `/embassies/:id/edit`
- List with search (350ms debounce), Active/Inactive filter, pagination, polling
- Create / edit forms (identity, contact, coverage, branding, notes) via `POST/PATCH /embassies`
- Detail: contact + jurisdictions + visa types, pipeline `statusCounts`, routed applications table
- Application Detail **Send to embassy** requires embassy selection when unset; confirms when already assigned; passes `embassy` on status POST
- Visa type picker uses admin `/visa-types?channel=embassy` with public API fallback

### Admin Applications — live backend wiring
- Admin login (`/login`) + JWT session (refresh on 401)
- Applications table + profile load from `/api/v1/admin/applications*`
- Polling refresh (list ~8s, detail ~5s)
- **Reject visa** → `POST .../status` with `rejected` + reason
- **Request documents** → modal asks document name → `POST .../documents/request`

Run: backend `npm run dev` + `cd admin-panel && npm run dev`  
Login: `admin@salaam.local` / `ChangeMeNow!123`

---

## Next up

1. Wire chat on application profile to real chat APIs  
2. Continue section-wise (Finance, Fees & Content, Issued Visas, …)  
3. Scaffold website with Firebase client  

---

## Changelog

| Date | Update |
|------|--------|
| 13 Jul 2026 | Research + seed + visa-config APIs |
| 13 Jul 2026 | Admin backend (PRD §8) |
| 13 Jul 2026 | API frontend guide |
| 13 Jul 2026 | Embassy backend (PRD §9) |
| 13 Jul 2026 | Website applicant APIs with Firebase Google/Email/Phone login exchange |
| 13 Jul 2026 | Stored Firebase web config in `website/.env`; Firebase Admin SDK in backend `.env` |
| 13 Jul 2026 | Admin Panel dashboard + Applications UI (mock) |
| 13 Jul 2026 | Applications live API + reject visa + document request (pending status) |
| 14 Jul 2026 | Admin Embassies section (list/create/detail/edit) + Send-to-embassy picker on Application Detail |
