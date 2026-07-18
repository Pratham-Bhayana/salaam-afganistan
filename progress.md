# Salaam Afghanistan — Progress Log

**Last updated:** 18 July 2026 (admin + embassy panels now show both footer brand logos — Salaam Afghanistan + Raizing Global)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API + visa preview/issue + QR verify) |
| Embassy backend (PRD §9) | Done (+ decide from docs_required + visa draft/preview/issue) |
| Website applicant APIs (Firebase auth) | Done |
| **Admin Panel frontend** | **Dashboard + Applications + Records + Receptionist desk + Embassies + Chat + Settings + Audit + Embassy Activity + Visa Templates + Staff (live)** |
| **Embassy Panel frontend** | **Login + Dashboard + Applications (generate visa modal) + Chat + Records + Staff (RBAC) + Activity Logs live** |
| Website frontend | **Home + About + Apply (live submit) + Profile (live) + notifications toast** |
| Live payment gateway / OCR / WebSockets | Not started |

---

## Completed (latest)

### Real client IP in activity/audit logs
- Backend `getClientIp(req)` helper (`backend/src/utils/helpers.js`): reads `X-Forwarded-For`/`req.ip`, normalizes IPv6-mapped IPv4 + loopback, and falls back to a client-provided `X-Client-IP` only when the server otherwise sees a loopback/private address (so real IPs appear in local/dev, true network IPs in prod)
- Wired into `auditService.auditFromReq`, `embassyActivityService.activityFromReq`, and embassy login/refresh (`embassy/authController`)
- Frontends detect the public IP once via `api.ipify.org` (no permission needed) and attach `X-Client-IP` on every request + login/refresh (`embassy` + `admin-panel` `api/client.ts`)
- Activity/audit detail modals now show **IP address** and **Device / browser** (user agent) — embassy Activity Logs + admin Embassy Activity

### Embassy Staff system reworked to mirror the admin panel
- Replaced the simple embassy staff table with the **same UX as the admin Staff page**: stat cards (Total / Active / Admins / Avg Access), search + role filter + grid/list toggle, bulk select, staff cards with section-access progress, 2-step **Add wizard** (account → section access), **Manage Access** modal with per-section toggles, Edit and Delete modals
- Ported components: `embassy/src/components/StaffOverview.tsx`, `StaffDirectory.tsx`, `StaffModals.tsx`; page `embassy/src/pages/Staff.tsx`; metadata `embassy/src/data/staffMeta.ts`; styles `embassy/src/pages/Staff.css`
- Embassy sections for access control: Dashboard, Applications, Records, Chat, Reports, Staff, Activity Logs (roles: Embassy Admin / Embassy Staff)
- Backend: added `designation` + `sectionOverrides` (Map) to `EmbassyStaff` model; embassy `staffController.updatePermissions` + route `PATCH /api/v1/embassy/staff/:id/permissions` (guarded by `embassy.staff:manage`); create/update now accept `designation`
- `embassy/src/api/staff.ts` rewritten to mirror admin (`transformStaff`, role mapping, `getAllStaffAPI`/`createStaffAPI`/`updateStaffAPI`/`deleteStaffAPI`/`updateStaffPermissionsAPI`)

### Embassy Staff RBAC + Activity Logs (embassy panel) + admin Embassy Activity view
- **Embassy Staff (RBAC):** `embassy/src/pages/Staff.tsx` + `api/staff.ts` — list/create/edit/deactivate/reactivate embassy staff (roles: Embassy Admin / Embassy Staff, case access all/assigned). Gated by `embassy.staff:manage`
- **Embassy Activity Logs:** `embassy/src/pages/ActivityLogs.tsx` + `api/activity.ts` — every recorded embassy action (login, view/decide/assign/note/delete application, issue visa, view document, chat, staff changes) with action filter, staff/reference search, detail modal. Gated by `embassy.activity:read`
- **Permission-based nav:** `embassyHasPermission()` helper in `embassy/src/api/client.ts`; sidebar hides items the role lacks (embassy_staff sees Activity but not Staff)
- **Admin view (separate section):** `GET /api/v1/admin/embassy-activity` (+ `/embassies` for filter) → `backend/src/controllers/admin/embassyActivityController.js`, guarded by `audit:read`; reads `EmbassyActivityLog` populated with embassy + staff + application
- **Admin UI:** `admin-panel/src/pages/EmbassyActivity.tsx` + `api/embassyActivity.ts`, nav item "Embassy Activity", route `/embassy-activity`, new `embassy-activity` RBAC section key
- Backend already records all embassy-panel actions via `embassyActivityService.activityFromReq` across embassy controllers — no gaps
- Seed: added `embassy.staff@salaam.local` (role `embassy_staff`) for RBAC testing

### Application delete with confirmation (admin + embassy)
- Cascade delete service `backend/src/services/applicationDeletionService.js`: removes application + documents (files on disk), payments, issued visa PDF, chat rooms/messages, notifications
- `DELETE /api/v1/admin/applications/:id` (`applications:write` — hidden from receptionist) with audit log
- `DELETE /api/v1/embassy/applications/:id` (embassy-scoped, `applications:decide`) with activity log
- Trash button on Applications tables + Delete button on Application Detail in both panels
- Shared `ConfirmDialog` component (danger styling, busy state) in both panels — "Delete permanently" confirmation before any delete

### Admin dashboard — live data
- `GET /api/v1/admin/dashboard` — platform KPIs, status mix, visa/embassy breakdown, 7-month trends, revenue
- `admin-panel/src/pages/Dashboard.tsx` wired to live API (period: month / quarter / year); auto-refresh every 15s
- Replaces `mockDashboard.ts` usage on the dashboard page

### Receptionist desk panel (admin)
- Live **Reception Desk** page (`admin-panel/src/pages/Receptionist.tsx`): search/track by reference/name/email/phone/passport; new walk-in intake; today’s walk-ins list
- Walk-in actions: create draft or submit to pending; submit draft → pending; record counter payment; scan/upload documents; print reference slip
- Role-aware sidebar — receptionist users see Dashboard, Applications, Receptionist only; login redirects to `/receptionist`
- Backend: intake role can PATCH draft apps, deliver documents, record counter payments; lookup includes phone; seed user `reception@salaam.local`
- API client: `admin-panel/src/api/receptionist.ts`

### Merge: teammate Staff section + our decision records
- Pulled `origin/main` (`integrate staff section`) and merged with local work — no removals
- Teammate added: live Admin Staff API/UI (`admin-panel/src/api/staff.ts`, Staff page/modals), `sectionOverrides` on Staff model, `PATCH /admin/staff/:id/permissions`
- Our work kept: decision records, visa generate/QR, website apply/profile/notifications, embassy Records, etc.
- Auto-merged `backend/src/routes/admin/index.js` (staff + records routes both present)

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
Receptionist: `reception@salaam.local` / `ChangeMeNow!123`  
DXB: `embassy.admin@salaam.local` · KBL: `embassy.kabul@salaam.local` · password `ChangeMeNow!123` (or env seed passwords)  
Admin: `admin@salaam.local` / `ChangeMeNow!123`

---

## Next up

1. Contact / General Information pages  
2. Embassy Reports page (Staff + Activity Logs now live)  
3. Continue admin sections (Finance, Fees & Content, Issued Visas list page, …)  
4. Production `PUBLIC_API_URL` for QR scans outside localhost  
5. Admin Records export permission UX (`RECORDS_EXPORT`) if needed

---

## Changelog

| Date | Update |
|------|--------|
| 18 Jul 2026 | Embassy panel brand pairs Salaam Afghanistan logo with the Afghanistan flag (`/Flag-Afghanistan.webp`) instead of the Raizing logo (sidebar + login); admin keeps Salaam + Raizing |
| 18 Jul 2026 | Admin + embassy panels now render both website-footer brand logos (`/salaam-logo.png` + `/raizing-logo.png`) in a white logo box on the sidebar brand and login hero (replacing the CSS gradient mark tile); copied assets into both `public/` dirs |
| 18 Jul 2026 | Activity/audit logs now show the real client IP: backend `getClientIp()` (X-Forwarded-For/req.ip, normalized, trusts `X-Client-IP` only when server sees a private IP); panels detect public IP via ipify and send it; IP + device/browser shown in detail modals |
| 18 Jul 2026 | Embassy Staff page reworked to match admin Staff UX (stat cards, grid/list, add wizard, Manage Access section toggles); added `designation` + `sectionOverrides` to EmbassyStaff + `PATCH /embassy/staff/:id/permissions` |
| 18 Jul 2026 | Embassy Staff (RBAC CRUD) + Activity Logs pages live; permission-based embassy nav; admin `GET /admin/embassy-activity` + Embassy Activity page (separate section); seed embassy_staff user |
| 18 Jul 2026 | Website home: framer-motion scroll reveals (fade/slide/blur/skew + staggered cards) + Lenis butter-smooth inertia scrolling |
| 18 Jul 2026 | Website header: added external nav links Raizing Sim + Travel Insurance (open new tab); tightened nav spacing for alignment |
| 18 Jul 2026 | Website: made tourist invitation letter + itinerary optional; removed "Visa application form" (`application_form`) document from all visa types in apply flow |
| 17 Jul 2026 | Delete application (cascade + confirmation modal) in admin and embassy panels; audit/activity logged |
| 17 Jul 2026 | Admin dashboard live: `GET /admin/dashboard` + charts/KPIs from MongoDB (applications, payments, embassies) |
| 17 Jul 2026 | Receptionist desk panel: walk-in intake, track/search, counter payment, doc scan, print slip; role-scoped nav; seed reception user |
| 17 Jul 2026 | Merged teammate Staff section into main; kept all local decision-records / visa / website work |
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
