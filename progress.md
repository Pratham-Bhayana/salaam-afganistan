# Salaam Afghanistan — Progress Log

**Last updated:** 13 July 2026 (Applications live + reject / doc request)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API) |
| Embassy backend (PRD §9) | Done |
| Website applicant APIs (Firebase auth) | Done |
| **Admin Panel frontend** | **Dashboard + Applications live (list/detail/reject/request docs)** |
| Embassy / Website frontends | Not started |
| Live payment gateway / OCR / WebSockets | Not started |

---

## Completed (latest)

### Admin Applications — live backend wiring
- Admin login (`/login`) + JWT session (refresh on 401)
- Applications table + profile load from `/api/v1/admin/applications*`
- Polling refresh (list ~8s, detail ~5s)
- **Reject visa** → `POST .../status` with `rejected` + reason
- **Request documents** → modal asks document name → `POST .../documents/request`
  - Creates `requestedDocuments[]` with status `pending` / “Request sent”
  - Moves application to `documents_required` + notifies applicant
- Applicant upload matching key marks request as `uploaded`

Run: backend `npm run dev` + `cd admin-panel && npm run dev`  
Login: `admin@salaam.local` / `ChangeMeNow!123`

---

## Next up

1. Wire chat on application profile to real chat APIs  
2. Continue section-wise (Finance, Embassies, …)  
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
