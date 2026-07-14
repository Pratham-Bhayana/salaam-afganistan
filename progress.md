# Salaam Afghanistan — Progress Log

**Last updated:** 14 July 2026 (Admin Embassies + Embassy Chat)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API) |
| Embassy backend (PRD §9) | Done |
| Website applicant APIs (Firebase auth) | Done |
| **Admin Panel frontend** | **Dashboard + Applications + Embassies (+ Records/Staff UI) live** |
| **Embassy Panel frontend** | **Login + Dashboard + Applications + Chat live** |
| Website frontend | Not started |
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

### Admin Records / Staff — UI scaffold
- Records + Staff sections added in admin panel (directory, overview, modals)

### Admin Applications — live backend wiring
- Admin login (`/login`) + JWT session (refresh on 401)
- Applications table + profile load from `/api/v1/admin/applications*`
- Polling refresh (list ~8s, detail ~5s)
- **Reject visa** → `POST .../status` with `rejected` + reason
- **Request documents** → modal asks document name → `POST .../documents/request`

### Embassy Panel — Chat (live)
- `/chat` split UI: rooms (general + case) + message thread
- APIs: list rooms, ensure case room, list/send messages (optional attachments)
- Poll rooms 12s / messages 4s; deep-link `?application=` and `?room=`
- Application detail **Open chat** → creates/opens case room
- Shell card bottom pad flush (no lift gap under Chat)

### Embassy Panel — Applications (live)
- `/applications` list: `inbox=active` default, search, status filters, 8s poll
- `/applications/:id` detail: applicant / passport / travel, documents view, case notes
- Decisions via `POST .../decide`: start review, approve, reject, request documents
- Notes via `POST .../notes`; document open via authenticated blob stream
- Bloggr theme; nav Applications enabled

### Embassy Panel — Dashboard (live)
- `GET /api/v1/embassy/dashboard` — KPIs, status mix, visa types, 7-month trend, staff load
- Period filter: this month / last 3 months / this year; 15s refresh
- Mock dashboard data removed

Demo data: `npm run seed:application` → `SA-SEED-EMBASSY-REVIEW`  
Embassy: login → Dashboard / Applications / Chat

---

## Next up

1. Embassy Reports / Staff / Activity Logs  
2. Continue admin sections (Finance, Fees & Content, Issued Visas, …)  
3. Website scaffold with Firebase client  

---

## Changelog

| Date | Update |
|------|--------|
| 13 Jul 2026 | Research + seed + visa-config / admin / embassy / website APIs |
| 13 Jul 2026 | Admin Panel dashboard + Applications UI |
| 13 Jul 2026 | Admin Applications live (reject + document request) |
| 13 Jul 2026 | Repo pushed to GitHub |
| 13 Jul 2026 | Embassy Panel dashboard shell (sapphire/copper theme, mock) |
| 13 Jul 2026 | Embassy login live + DXB seed; JWT embassyId fix |
| 13 Jul 2026 | Embassy Applications list + detail live (decide/notes) |
| 14 Jul 2026 | Embassy Chat live (rooms + messages + case deep-link) |
| 14 Jul 2026 | Admin Embassies section (list/create/detail/edit) + Send-to-embassy picker on Application Detail |
| 14 Jul 2026 | Merged admin-panel Embassies/Records/Staff work with embassy panel Chat |
