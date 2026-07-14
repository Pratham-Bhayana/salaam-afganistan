# Prompt: Build Admin Panel — Chat (production frontend)

Copy everything below the line into Cursor / another AI coding agent.

---

## Role

You are a senior frontend engineer. Implement the **Admin Panel Chat section** end-to-end at production quality in one pass. Wire **real backend APIs only** — no mock chat data. Match existing Admin Panel patterns, auth, design tokens, and shell layout.

## Project context

- Workspace: Salaam Afghanistan
- Admin app: `admin-panel/` (Vite + React + TypeScript)
- Shared API: `backend/` Express + Mongo
- Admin base URL from env: `VITE_API_BASE_URL` → calls go to `{base}/api/v1/admin`
- Auth already works via `admin-panel/src/api/client.ts` + `AuthContext` + `RequireAuth` (JWT bearer + refresh). Reuse `apiFetch` (must support `FormData` without forcing `Content-Type: application/json`).
- Design language: teal `#0B3D2E` + gold accent, cream canvas, white main card — `admin-panel/src/styles/tokens.css`
- Live sections to mirror for polish: Applications, Embassies, Application Detail
- **Reference implementation (layout + UX):** Embassy Panel Chat at `embassy/src/pages/Chat.tsx` + `Chat.css` + shell `card--chat` — Admin Chat should follow the same **product UX** and **height/fill rules**, but use **admin teal/gold tokens** (not embassy purple)
- Docs: `API_FRONTEND_GUIDE.md` § H (Chat with embassy), `progress.md`
- PRD: **§8.5** Chat coordination with embassies
- Nav already has: `{ id: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare, enabled: false, badge: 2 }`

## Goal

Ship a complete Admin Chat UI so staff with `chat:access` can:

1. List **all active chat rooms** across embassies (general mission channels + per-application case rooms)
2. Filter / jump to rooms by embassy (admin ↔ each mission — **not** embassy-to-embassy; that lives in the Embassy Panel — see `prompts/EMBASSY_INTER_EMBASSY_CHAT.md`)
3. Open a thread, read history, send messages (optional file attachments, up to 5)
4. Deep-link into a room (`?room=`) or open/create a **case room** (`?application=&embassy=` or from Application Detail)
5. Wire Application Detail **“Chat with embassy”** tab to live embassy case chat (stop using mock `messages`)

Admin is the Raizing Global side. Messages from admin use `senderType: 'staff'`. Embassy replies appear as `embassy_staff`.

Each embassy has a **general** coordination room (created when the embassy is created). Case rooms are per application.

---

## Hard constraints

### Layout (critical — do not regress)

The Embassy Chat section previously failed because of **height collapse** and **page scroll**. Admin Chat **must fit the shell viewport** with composer flush to the bottom of the white card — no floating panel, no cream gap under Chat, no whole-page auto-scroll.

**Required layout contract (match embassy fix):**

1. In `AdminShell.tsx`, treat `/chat` like a special full-bleed card (same idea as Application Detail):
   - Add `admin-shell__card--chat` when `pathname === '/chat'`
2. In `AdminShell.css`:
   ```css
   .admin-shell__main { position: relative; overflow: hidden; /* keep flex fill */ }
   .admin-shell__card--chat {
     position: absolute;
     inset: 0;
     flex: none;
     padding: 0;
     overflow: hidden;
     border-radius: var(--radius-xl) var(--radius-xl) 0 0;
     /* keep white surface + shadow so theme matches Applications card */
   }
   ```
3. Chat root (`.admin-chat` or `.chat`) must be:
   ```css
   position: absolute;
   inset: 0;
   width: 100%;
   height: 100%;
   display: grid;
   grid-template-columns: 300px minmax(0, 1fr);
   grid-template-rows: auto minmax(0, 1fr);
   overflow: hidden;
   ```
4. **Only** the messages list scrolls (`overflow: auto` on the messages pane).
5. **Never** use `element.scrollIntoView()` for new messages — that scrolls ancestors/page and looks like “floating / auto-scrolling”. Instead:
   ```ts
   messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
   ```
6. Preserve shell frame padding top/right (`var(--shell-pad) … 0 0`) and theme washes — do **not** strip the admin theme to “edge-to-edge browser chrome”.

### Product / code quality

- Production quality: loading, empty, error, disabled send states
- No mock room/message arrays for the Chat page
- TypeScript strict; no `any` unless unavoidable
- Update `App.tsx` routes + enable nav Chat (`enabled: true`; remove stale `badge: 2` or replace with live unread count only if API supports it — **default: no badge**)
- Update `progress.md` when done
- Admin tokens only — never call `/api/v1/embassy/*`
- Permission: UI should handle 403 if staff lacks `chat:access`

---

## Backend API contracts (use exactly)

Base: `/api/v1/admin`  
Permission: `chat:access`

### List rooms
`GET /chat/rooms?embassy=&type=&application=`

- Returns active rooms (`isActive: true`)
- Optional filters: `embassy` (ObjectId), `type` (`general` | `application`), `application` (ObjectId)
- Sorted by `lastMessageAt` / `updatedAt` desc
- Populated: `embassy` → `{ name, code }`, `application` → `{ referenceId, status }`

Response:
```json
{ "success": true, "data": [ChatRoom], "meta": { "count": N } }
```

### Ensure / open case room
`POST /chat/rooms/application`
```json
{
  "embassyId": "<EmbassyObjectId>",
  "applicationId": "<ApplicationObjectId>",
  "title": "Case SA-SEED-…"
}
```
- Creates room if missing (`type: 'application'`)
- Returns room (201)

### List messages
`GET /chat/rooms/:roomId/messages?page=&limit=`

- Default limit ~50
- Server returns messages in **chronological order** (oldest → newest) for the page
- Meta: `{ page, limit, total, pages }`

### Send message
`POST /chat/rooms/:roomId/messages`  
`multipart/form-data`:
- `body` (string, required)
- `attachments` (files, optional, max 5)

Updates room `lastMessageAt`.

---

## Domain types (FE)

```ts
type ChatRoomType = 'general' | 'application';

type ChatRoom = {
  _id: string;
  title: string;
  type: ChatRoomType;
  isActive?: boolean;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
  embassy?: { _id: string; name?: string; code?: string } | string | null;
  application?: { _id: string; referenceId?: string; status?: string } | string | null;
};

type ChatMessage = {
  _id: string;
  room: string;
  body: string;
  senderType: 'staff' | 'embassy_staff' | 'system';
  senderId: string;
  senderName: string;
  senderRole?: string;
  attachments?: {
    originalName?: string;
    mimeType?: string;
    storagePath?: string;
    size?: number;
  }[];
  createdAt: string;
};
```

Bubble ownership: message is “mine” when `senderType === 'staff'` and `senderId` matches logged-in admin staff id.

---

## Screens & UX

### 1) `/chat` — Main Chat workspace

**Layout (inside flushed chat card):**

| Area | Content |
|------|---------|
| Top header (full width) | Title “Chat”, subtitle “Coordinate with embassies”, plus **Chat with embassy** control |
| Left column (~300px) | Active embassy context + type tabs All / General / Cases + scrollable room list |
| Right column | Active thread: room title + meta (which embassy), messages, composer |

**Room list row:** icon (general vs case), title (`room.title` or application `referenceId`), subtitle (embassy code/name + status), relative time (`lastMessageAt`)

---

#### Chat with another embassy (required UX)

Admin must be able to leave the current embassy thread and talk to a **different** embassy without hunting through a mixed room list.

**Control placement (pick one primary; both allowed):**

1. **Header CTA — “Chat with embassy”** (required)  
   - Button opens a searchable embassy picker (modal, popover, or combobox)
   - Source: `GET /embassies?isActive=true&limit=100` (reuse `api/embassies.ts`)
   - Show name + code (e.g. `Dubai — DXB`)
   - Optional search/filter by name or code when list is long

2. **Left rail embassy selector** (recommended companion)  
   - Compact select: `All embassies` | specific embassy  
   - Stay in sync with the header picker

**On selecting an embassy:**

1. Set embassy filter to that embassy (`GET /chat/rooms?embassy=<id>`)
2. Prefer opening that embassy’s **general** room (`type === 'general'`)
   - If rooms already loaded for that embassy, select the general one immediately
   - Else fetch `GET /chat/rooms?embassy=<id>&type=general` and open the first result
3. Update URL: `/chat?embassy=<id>&room=<generalRoomId>` (or at least `?room=`)
4. Refresh left list to that embassy’s rooms (general + cases)
5. Clear message pane and load that room’s messages

**Empty / edge states:**

- No embassies in system → “Create an embassy first” (link to `/embassies` if nav enables it)
- Embassy selected but no general room found → show clear empty state: “No general chat room for this embassy yet.” Do **not** invent a create-general API unless backend already supports it (general rooms are created on embassy create)
- While picker is open, focus trap / Esc to close; don’t break chat layout height

**Context indicator in thread header:**  
When a room is open, show embassy name/code next to the room title so it’s obvious which mission you’re talking to (e.g. `General Coordination · DXB`).

**“All embassies” mode:**  
Default on first load can be All (rooms from every embassy, sorted by `lastMessageAt`). The “Chat with embassy” action is still the fastest way to jump into another mission’s general channel.

---

**Thread:**
- Empty state when no room selected — prompt: “Select a room, or use **Chat with embassy** to open a mission channel”
- Messages with mine / embassy / system styling (teal tint for mine; gold accent border optional for embassy)
- Attachment chips on bubbles (filename; download link optional if storage URL helper exists — otherwise show name only)
- Composer: attach + text + Send
- Poll rooms ~12s; poll messages ~4s while a room is open
- Deep links:
  - `?room=<id>` select room
  - `?embassy=<id>` → filter + open that embassy’s general room
  - `?application=<id>&embassy=<id>` → `POST /chat/rooms/application` then select + replace URL with `?room=`

**Embassy scope:** Admin sees **all embassies’** rooms — this is the key difference vs Embassy Chat (scoped). Default “All embassies”; “Chat with embassy” switches into a specific mission.

### 2) Application Detail — wire “Chat with embassy”

Current UI has tabs **Chat with applicant** / **Chat with embassy** using mock `app.messages`.

For **embassy tab**:
- Resolve `app.embassy` id (object or string). If missing, show: “Assign / send to an embassy first” (no composer)
- On tab select / mount: `POST /chat/rooms/application` with `{ embassyId, applicationId, title }`
- Load messages for that room; send via live API
- CTA: **Open in Chat** → `/chat?room=<id>`

**Applicant tab:** leave as-is for this pass (mock or note “coming soon”) — do **not** invent a new applicant chat API.

Optional: add header action **Open embassy chat** → `/chat?application=&embassy=` when embassy assigned.

---

## Frontend file plan (suggested)

```
admin-panel/src/api/chat.ts
admin-panel/src/pages/Chat.tsx
admin-panel/src/pages/Chat.css
```

Also edit:
- `admin-panel/src/layout/AdminShell.tsx` — detect `/chat` → `admin-shell__card--chat`
- `admin-panel/src/layout/AdminShell.css` — absolute fill rules (see Hard constraints)
- `admin-panel/src/App.tsx` — `<Route path="chat" element={<Chat />} />`
- `admin-panel/src/nav/adminNav.ts` — `enabled: true`, remove fake badge
- `admin-panel/src/pages/ApplicationDetail.tsx` (+ CSS as needed) — live embassy chat tab
- Reuse `GET /embassies` from `api/embassies.ts` for filters / ensure room

---

## Acceptance checklist

1. Login admin with `chat:access` (super admin seed OK)
2. Nav **Chat** opens `/chat` — panel fills shell card flush to bottom (no float gap, no page scroll jump)
3. Room list shows seeded/general rooms after embassies exist; filter by embassy works
4. **“Chat with embassy”** lists active embassies; picking one opens that embassy’s general room and filters the room list
5. Switch from embassy A’s thread to embassy B via the same control — messages/context update correctly
6. Thread header shows which embassy you’re in
7. Select general room → messages load → send text → appears as mine; embassy messages (if any) render correctly
8. Attach a small file → send succeeds
9. From Application Detail with embassy set → “Chat with embassy” loads live thread → send works
10. “Open in Chat” deep-links to full Chat page on that room
11. Missing embassy on application → clear empty guidance, no broken API spam
12. Message polling does **not** scroll the entire admin page
13. `npm run build` passes for admin-panel
14. `progress.md` updated

---

## Design / UX notes

- Admin teal/gold — not embassy purple
- One composition: room list + thread, not a dashboard of cards
- “Chat with embassy” should feel like a primary action in the header (not buried)
- Composer always visible at bottom of thread column when a room is selected
- Accessible labels on attach/send/picker; disabled while sending
- Mobile: stack rooms above thread (`grid-template-rows: auto minmax(140px, 28%) minmax(0,1fr)`); embassy picker still usable on small screens

---

## Out of scope (do not build now)

- WebSockets / realtime push (polling is enough)
- Unread badges / read receipts UI (`readBy` exists on model but unused for v1)
- Applicant ↔ admin consumer chat API
- Embassy-to-embassy chat (admin coordinates with each embassy separately)
- Creating a new general room via Chat UI (rooms are created when embassies are created)
- Deleting / archiving rooms
- Rich text / reactions
- Changing admin shell global theme from branding settings

---

## Implementation order

1. Confirm `apiFetch` FormData behavior in `admin-panel/src/api/client.ts` (fix if needed)  
2. `api/chat.ts` types + listRooms / ensureApplicationRoom / listMessages / sendMessage helpers  
3. AdminShell `card--chat` absolute fill CSS (copy spirit of embassy shell chat fix)  
4. `/chat` page UI + polling + deep links + **Chat with embassy** picker + embassy filter  
5. Wire Application Detail embassy chat tab to live APIs  
6. Enable nav + route  
7. Build + smoke against running backend (include switching between two embassies)  
8. Update `progress.md`

Execute all of the above in one session. Prefer a working full-height Chat over partial stubs. If unsure about layout, open `embassy/src/pages/Chat.css` and port the **structure** (absolute fill + grid + messages-only scroll) onto admin tokens.
