# Salaam Afghanistan — Progress Log

**Last updated:** 14 July 2026 (Chat unread + read receipts)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API) |
| Embassy backend (PRD §9) | Done (+ inter-embassy chat) |
| Website applicant APIs (Firebase auth) | Done |
| **Admin Panel frontend** | **Dashboard + Applications + Embassies (+ Records/Staff UI) live** |
| **Embassy Panel frontend** | **Login + Dashboard + Applications + Chat (peer embassies) live** |
| Website frontend | Not started |
| Live payment gateway / OCR / WebSockets | Not started |

---

## Completed (latest)

### Embassy ↔ embassy chat
- `ChatRoom.type` + `inter_embassy`; `peerEmbassy` + unique `pairKey`
- `GET /embassy/chat/peer-embassies`, `POST /embassy/chat/rooms/inter-embassy`
- Rooms/messages accessible when embassy is either side of the pair
- Chat UI: **Chat with embassy** picker + Embassies filter; deep-link `?peerEmbassy=`
- Unread badges: per-room counts + nav Chat badge (`GET /chat/unread`); open thread marks read
- Read receipts: own messages show **Sent** / **Seen** via `readBy`
- Seed peer: `KBL` / `embassy.kabul@salaam.local` (same default password as DXB)

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
- `/chat` rooms list + thread; general + case rooms via embassy chat APIs
- Poll rooms 12s / messages 4s; deep-link `?application=` / `?room=`
- Application Detail **Open chat** opens/creates case room
- Layout: shell `card--chat` + absolute fill grid (same flush model as Application Detail)

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
DXB: `embassy.admin@salaam.local` · KBL: `embassy.kabul@salaam.local` · password `ChangeMeNow!123` (or env seed passwords)

---

## Next up

1. Embassy Reports / Staff / Activity Logs  
2. Continue admin sections (Finance, Fees & Content, Issued Visas, Chat, Settings)  
3. Website scaffold with Firebase client  

---

## Changelog

| Date | Update |
|------|--------|
| 14 Jul 2026 | Chat unread badges (rooms + nav) + read receipts (Sent/Seen) |
| 14 Jul 2026 | Embassy ↔ embassy inter_embassy chat (API + Chat UI + KBL seed) |
| 13 Jul 2026 | Research + seed + visa-config / admin / embassy / website APIs |
| 13 Jul 2026 | Admin Panel dashboard + Applications UI |
| 13 Jul 2026 | Admin Applications live (reject + document request) |
| 13 Jul 2026 | Repo pushed to GitHub |
| 13 Jul 2026 | Embassy Panel dashboard shell (sapphire/copper theme, mock) |
| 13 Jul 2026 | Embassy login live + DXB seed; JWT embassyId fix |
| 13 Jul 2026 | Embassy Applications list + detail live (decide/notes) |
| 14 Jul 2026 | Embassy Chat UI removed (files + routes); backend APIs kept |
| 14 Jul 2026 | Embassy Chat rebuilt (rooms + messages + case deep-link, detail-style fill layout) |
| 14 Jul 2026 | Admin Embassies section (list/create/detail/edit) + Send-to-embassy picker on Application Detail |
| 14 Jul 2026 | Merged admin-panel Embassies/Records/Staff work with embassy panel Chat |
