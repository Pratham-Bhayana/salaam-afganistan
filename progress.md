# Salaam Afghanistan — Progress Log

**Last updated:** 14 July 2026 (merge: peer chat + admin Visa Templates)  
**Rule:** Keep this file updated after every backend (and later frontend) development chunk.

---

## Overall status

| Area | Status |
|------|--------|
| Research / seed / public visa-config | Done |
| Admin backend (PRD §8) | Done (+ document request API) |
| Embassy backend (PRD §9) | Done (+ inter-embassy chat) |
| Website applicant APIs (Firebase auth) | Done |
| **Admin Panel frontend** | **Dashboard + Applications + Embassies + Chat + Settings + Audit + Visa Templates UI (+ Records/Staff)** |
| **Embassy Panel frontend** | **Login + Dashboard + Applications + Chat (peer embassies, unread/Seen) live** |
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
- Read receipts: own messages show **Sent** / **Seen** via `readBy` (status under bubble)
- Seed peer: `KBL` / `embassy.kabul@salaam.local` (same default password as DXB)

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

### Admin Embassies — live backend wiring (PRD §8.5)
- Nav + routes: `/embassies`, `/embassies/new`, `/embassies/:id`, `/embassies/:id/edit`
- List / create / edit / detail + Send-to-embassy picker on Application Detail

### Embassy Panel — Chat / Applications / Dashboard (live)
- `/chat` rooms + thread; general + case + inter-embassy; layout shell `card--chat`
- Applications decide/notes/docs; Dashboard live KPIs

Demo data: `npm run seed:application` → `SA-SEED-EMBASSY-REVIEW`  
DXB: `embassy.admin@salaam.local` · KBL: `embassy.kabul@salaam.local` · password `ChangeMeNow!123` (or env seed passwords)  
Admin: `admin@salaam.local` / `ChangeMeNow!123`

---

## Next up

1. Embassy Reports / Staff / Activity Logs  
2. Continue admin sections (Finance, Fees & Content, Issued Visas, …)  
3. Website scaffold with Firebase client  
4. Visa Templates backend + real PDF generation  

---

## Changelog

| Date | Update |
|------|--------|
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
