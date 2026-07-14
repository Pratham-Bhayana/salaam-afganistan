# Salaam Afghanistan — Progress Log

**Last updated:** 14 July 2026 (Website Home + About)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API) |
| Embassy backend (PRD §9) | Done |
| Website applicant APIs (Firebase auth) | Done |
| **Admin Panel frontend** | **Dashboard + Applications + Embassies + Chat + Settings + Audit + Visa Templates UI** |
| **Embassy Panel frontend** | **Login + Dashboard + Applications + Chat live** |
| Website frontend | **Home + About scaffolded (Next.js App Router, B&W)** |
| Live payment gateway / OCR / WebSockets | Not started |

---

## Completed (latest)

### Website Home + About (UI scaffold)
- Next.js 15 + TypeScript App Router in `website/` (reference LivMexico HTML/CSS in `website/reference/`)
- Routes: `/` (Home), `/about` (About); shared Header/Footer; black & white theme; logo `public/logo.png`
- Home sections: Hero apply form, Destinations carousel, Platform leadership, Opportunities + stats, About preview, Process steps, FAQ
- About: hero, story/values, opportunities reuse, CTA — Unsplash placeholders for photography

### Admin Visa Templates (UI-only)
- Nav item enabled (removed Soon); routes `/visa-templates`, `/visa-templates/new`, `/visa-templates/:id`
- Feature folder `admin-panel/src/features/visa-templates/`: list grid + A4 template builder with live mock preview
- Mock data only — no backend/PDF yet

### Admin Chat (PRD §8.5)
- Nav + route `/chat` enabled; shell `admin-shell__card--chat` absolute fill (composer flush, messages-only scroll)
- Rooms across embassies: filter by embassy + All/General/Cases; poll rooms ~12s / messages ~4s
- Send text + attachments (FormData, max 5); deep-link `?room=` and `?application=&embassy=`
- Application Detail **Chat with embassy** wires live case room; **Open in Chat** CTA
- Applicant chat tab left as “coming soon” (activity notes only)

### Admin Settings + Audit Logs (PRD §8.10 / NFR)
- `/settings`, `/audit-logs` live against platform settings / email templates / audit APIs

### Admin Embassies + Applications
- Embassies CRUD UI + Send-to-embassy picker; Applications reject / doc request

Demo: backend `npm run dev` + `cd admin-panel && npm run dev`  
Login: `admin@salaam.local` / `ChangeMeNow!123`

---

## Next up

1. Website Firebase auth + apply flow wired to `/api/v1/website`  
2. Contact / General Information pages  
3. Embassy Reports / Staff / Activity Logs  
4. Visa Templates backend + real PDF generation  

---

## Changelog

| Date | Update |
|------|--------|
| 13 Jul 2026 | Research + seed + visa-config / admin / embassy / website APIs |
| 13 Jul 2026 | Admin Panel dashboard + Applications UI |
| 13 Jul 2026 | Admin Applications live (reject + document request) |
| 13 Jul 2026 | Repo pushed to GitHub |
| 13 Jul 2026 | Embassy Panel dashboard shell / login / applications |
| 14 Jul 2026 | Embassy Chat live |
| 14 Jul 2026 | Admin Embassies + Send-to-embassy picker |
| 14 Jul 2026 | Admin Settings + Email templates + Audit Logs |
| 14 Jul 2026 | Admin Chat live (rooms + messages + Application Detail embassy tab) |
| 14 Jul 2026 | Admin Visa Templates module UI (list + builder, mock data) |
| 14 Jul 2026 | Website Home + About pages (Next.js, B&W theme) |
