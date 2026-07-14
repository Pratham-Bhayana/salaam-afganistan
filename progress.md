# Salaam Afghanistan — Progress Log

**Last updated:** 14 July 2026 (Embassy Chat live)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API) |
| Embassy backend (PRD §9) | Done |
| Website applicant APIs (Firebase auth) | Done |
| Admin Panel frontend | Dashboard + Applications live |
| **Embassy Panel frontend** | **Login + Dashboard + Applications + Chat live** |
| Website frontend | Not started |
| Live payment gateway / OCR / WebSockets | Not started |

---

## Completed (latest)

### Embassy Panel — Chat (live)
- `/chat` split UI: rooms (general + case) + message thread
- APIs: list rooms, ensure case room, list/send messages (optional attachments)
- Poll rooms 12s / messages 4s; deep-link `?application=` and `?room=`
- Application detail **Open chat** → creates/opens case room

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
2. Admin Embassies section  
3. Website scaffold  

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
