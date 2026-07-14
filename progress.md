# Salaam Afghanistan — Progress Log

**Last updated:** 14 July 2026 (admin visa issue preview + website Home/About)  
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
| Website frontend | **Home + About scaffolded (Next.js App Router, B&W)** |
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

### Website Home + About (UI scaffold)
- Next.js 15 + TypeScript App Router in `website/` (reference LivMexico HTML/CSS in `website/reference/`)
- Routes: `/` (Home), `/about` (About); shared Header/Footer; black & white theme; logo `public/logo.png`
- Home sections: Hero apply form, Destinations carousel, Platform leadership, Opportunities + stats, About preview, Process steps, FAQ
- About: hero, story/values, opportunities reuse, CTA — Unsplash placeholders for photography

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

1. Website Firebase auth + apply flow wired to `/api/v1/website`  
2. Contact / General Information pages  
3. Embassy Reports / Staff / Activity Logs  
4. Continue admin sections (Finance, Fees & Content, Issued Visas list page, …)  

---

## Changelog

| Date | Update |
|------|--------|
| 14 Jul 2026 | Admin visa issue: preview PDF → save to documents → optional email |
| 14 Jul 2026 | Single eVISA template in DB + `fieldsByVisaType`; admin save/load; PDF uses type fields |
| 14 Jul 2026 | Website Home + About pages (Next.js, B&W theme) |
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
