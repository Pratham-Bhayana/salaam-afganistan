# Salaam Afghanistan — Progress Log

**Last updated:** 17 July 2026 (decision records — admin + embassy)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API + visa preview/issue + QR verify) |
| Embassy backend (PRD §9) | Done (+ decide from docs_required + visa draft/preview/issue) |
| Website applicant APIs (Firebase auth) | Done |
| **Admin Panel frontend** | **Dashboard + Applications (approve/issue preview) + Embassies + Chat + Settings + Audit + Visa Templates + Records (live decisions)** |
| **Embassy Panel frontend** | **Login + Dashboard + Applications (generate visa modal) + Chat + Records (embassy decisions) live** |
| Website frontend | **Home + About + Apply (live submit) + Profile (live) + notifications toast** |
| Live payment gateway / OCR / WebSockets | Not started |

---

## Completed (latest)

### Decision records — admin + embassy
- Shared service `backend/src/services/decisionRecordsService.js`: approved/rejected/visa_issued only; `decidedByTitle` from activity (`Embassy — Name` vs `Raizing Global — Name`); period filters (monthly/quarterly/yearly/custom); CSV export with full applicant/travel/visa fields
- Admin: `GET /api/v1/admin/records`, `GET /api/v1/admin/records/export` — all decisions
- Embassy: `GET /api/v1/embassy/records`, `GET /api/v1/embassy/records/export` — scoped to `req.embassyId` + embassy-only decisions (excludes Raizing Global)
- Admin UI: `admin-panel/src/pages/Records.tsx` — live table, period/decision/search filters, CSV export, link to application
- Embassy UI: `embassy/src/pages/Records.tsx` — same filters; sidebar nav enabled; embassy-scoped copy

### Embassy Application Detail — layout + actions + generate visa
- Fixed overlapping cards / docs scroll (`embassy/src/pages/ApplicationDetail.css`)
- `EMBASSY_STATUS_TRANSITIONS.documents_required` → approve / reject / continue review / re-request docs
- Approve no longer auto-issues PDF; **Generate visa** opens preview + editable autofill → Save & send
- Endpoints: `GET …/visa-draft`, `POST …/visa-preview`, `POST …/visa-issue`
- PDF embeds scannable QR → `GET /api/v1/visas/verify/:token` opens issued PDF (inline)
- Issued visa still lands as `issued_visa` document + `IssuedVisa` row (admin + applicant profile)

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

1. Contact / General Information pages  
2. Embassy Reports / Staff / Activity Logs  
3. Continue admin sections (Finance, Fees & Content, Issued Visas list page, …)  
4. Production `PUBLIC_API_URL` for QR scans outside localhost  
5. Admin Records export permission UX (`RECORDS_EXPORT`) if needed

---

## Changelog

| Date | Update |
|------|--------|
| 17 Jul 2026 | Decision records: shared backend service + admin/embassy list/export APIs; live Records pages (filters, attribution, CSV); embassy nav enabled |
| 17 Jul 2026 | Embassy Applications default to All cases; rename Active inbox → Active application; profile Download Visa CTA (green) next to status |
| 17 Jul 2026 | Visa PDF: preserve logo aspect ratio (no stretch); aligned label/value columns + disclaimer padding |
| 17 Jul 2026 | Homepage congrats popup modal (animated emoji); approval notifs green+🎉; fix visa PDF logos/watermark (`/Logo.png` path bug); embed `photos`/`photo_45x35` on PDF |
| 17 Jul 2026 | Embassy: fix detail overlap; keep Approve/Reject after docs request; Generate visa (edit+preview+QR verify URL); no auto-issue on approve |
| 17 Jul 2026 | Tab title unread badge `(N)`, notification chime sound, mark-read / mark-all-read in header bell |
| 17 Jul 2026 | Admin chat: sender right / receiver left; fix detail layout overlap; browser push notifications on new updates |
| 17 Jul 2026 | UX fixes: residential address field; admin doc download+scroll; chat L/R; send-to-embassy from docs_required; status animated borders; congrats+visa DL; header notifications |
| 17 Jul 2026 | Fix Firebase Admin init for modular SDK (`getApps`/`cert`/`getAuth`) — website auth exchange was 500 |
| 17 Jul 2026 | Website live apply submit → MongoDB; profile from dashboard API; requested-doc upload; notifications + home floating toast |
| 17 Jul 2026 | Documents step: grid upload cards, multi-file per requirement, animated progress + remove |
| 17 Jul 2026 | Apply personal info: email prefilled from login account (editable) |
| 17 Jul 2026 | Passport OCR: accept PDF bio pages (bundled pdf.js worker), infer issue date from printed page (expiry − 10/5y match), strip MRZ filler noise from names |
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
