# Salaam Afghanistan

Digital visa & consular services platform for Raizing Global — public website, admin panel, embassy panel, and shared Node/Express + MongoDB backend.

## Monorepo layout

| Folder | Stack | Purpose |
|--------|--------|---------|
| `backend/` | Node.js, Express, MongoDB | Shared API (`/api/v1/admin`, `/embassy`, `/website`) |
| `admin-panel/` | Vite + React + TypeScript | Operations admin UI |
| `embassy/` | (planned) | Embassy staff panel |
| `website/` | Next.js (planned) | Applicant portal |

## Quick start (backend)

```bash
cd backend
cp .env.example .env   # fill Mongo, JWT, Firebase
npm install
npm run seed           # optional seed data
npm run dev            # http://localhost:5000
```

## Quick start (admin panel)

```bash
cd admin-panel
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:5000
npm install
npm run dev            # http://localhost:5173
```

Seeded admin (local): see `backend/.env.example` / seed docs — change passwords before production.

## Docs

- `API_FRONTEND_GUIDE.md` — frontend integration guide
- `progress.md` — development log
- `RESEARCH_Afghanistan_Visa_Requirements.md` — visa research notes

## Security

Never commit `.env` files, Firebase Admin private keys, or upload binaries. See root `.gitignore`.
