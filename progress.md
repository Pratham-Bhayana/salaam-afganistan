# Salaam Afghanistan — Progress Log

**Last updated:** 14 July 2026 (admin approve → preview → save & send visa)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API + visa preview/issue) |
| Embassy backend (PRD §9) | Done (+ inter-embassy chat) |
| Website applicant APIs (Firebase auth) | Done |
| **Admin Panel frontend** | **Dashboard + Applications (approve/issue preview) + Embassies + Chat + Settings + Audit + Visa Templates (+ Records/Staff)** |
| **Embassy Panel frontend** | **Login + Dashboard + Applications + Chat (peer embassies, unread/Seen) live** |
| Website frontend | Not started |
| Live payment gateway / OCR / WebSockets | Not started |

---

## Completed (latest)

### Admin approve / issue visa (preview → save & send)
- `POST /admin/issued-visas/preview` — PDF preview only (no DB commit)
- `POST /admin/issued-visas/issue` — saves PDF to application documents (`issued_visa`), IssuedVisa record, status `visa_issued`, optional email (`sendEmail`)
- Status change accepts `autoIssueVisa: false` so admin can preview first
- Application Detail: **Approve & issue visa** / **Issue visa** modal with iframe preview + Send email checkbox + Save & send
- Documents panel: download issued visa PDF

### Visa Templates — single eVISA sheet (backend + admin UI)
- One production template: `code: evisa_default` (seed deactivates others)
- Shared layout + `fieldsByVisaType` for tourist / business / student / transit
- Admin load/save via templates API; PDF generation uses type fields

### Embassy ↔ embassy chat
- Inter-embassy rooms, unread badges, Sent/Seen receipts
- Seed peer: `KBL` / `embassy.kabul@salaam.local`

### Admin Chat / Settings / Audit / Embassies
- Live against backend APIs

### Embassy Panel — Chat / Applications / Dashboard (live)
- Decide/notes/docs; Dashboard live KPIs

Demo data: `npm run seed:application` → `SA-SEED-EMBASSY-REVIEW`  
DXB: `embassy.admin@salaam.local` · KBL: `embassy.kabul@salaam.local` · password `ChangeMeNow!123` (or env seed passwords)  
Admin: `admin@salaam.local` / `ChangeMeNow!123`

---

## Next up

1. Embassy Reports / Staff / Activity Logs  
2. Continue admin sections (Finance, Fees & Content, Issued Visas list page, …)  
3. Website scaffold with Firebase client  

---

## Changelog

| Date | Update |
|------|--------|
| 14 Jul 2026 | Admin visa issue: preview PDF → save to documents → optional email |
| 14 Jul 2026 | Single eVISA template in DB + `fieldsByVisaType`; admin save/load; PDF uses type fields |
| 14 Jul 2026 | Admin Visa Templates eVISA sheet rework (logos, fields, photo/barcode, disclaimer) |
| 14 Jul 2026 | Chat unread badges (rooms + nav) + read receipts (Sent/Seen) |
| 14 Jul 2026 | Embassy ↔ embassy inter_embassy chat (API + Chat UI + KBL seed) |
| 14 Jul 2026 | Admin Visa Templates module UI (list + builder, mock data) |
| 14 Jul 2026 | Admin Chat live (rooms + messages + Application Detail embassy tab) |
| 14 Jul 2026 | Admin Settings + Email templates + Audit Logs |
| 14 Jul 2026 | Admin Embassies + Send-to-embassy picker |
| 14 Jul 2026 | Embassy Chat live / rebuilt |
| 13 Jul 2026 | Research + seed + visa-config / admin / embassy / website APIs |
| 13 Jul 2026 | Admin Panel dashboard + Applications UI |
| 13 Jul 2026 | Admin Applications live (reject + document request) |
| 13 Jul 2026 | Embassy Panel dashboard shell / login / applications |
| 13 Jul 2026 | Repo pushed to GitHub |
