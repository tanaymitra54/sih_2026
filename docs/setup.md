# Setup & Run

## Requirements
- Node.js ≥ 20 (uses `node:crypto` only, no build deps)
- npm ≥ 10

## One-time setup

```bash
npm run setup
```

This runs, at the root:
1. `npm install` (workspaces: frontend + backend)
2. `prisma db push` (creates `backend/prisma/dev.db`)
3. `seed` (demo users + 1 minted batch)

## Run

```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend:   http://localhost:4000  (health: `/health`)

Frontend proxies `/api` → `:4000`, so no CORS config needed.

## Logins
All passwords `demo1234`:
- mfr@medguard.in — manufacturer
- dist@medguard.in — distributor
- pharma@medguard.in — pharmacist
- consumer@medguard.in — consumer

## Checks

```bash
npm run selfcheck   # runs ledger-core hash-chain assertions
```

## Config (.env)
Copied from `.env.example` by setup. Override in backend/.env:
| Var | Default | Purpose |
|---|---|---|
| PORT | 4000 | backend port |
| DATABASE_URL | file:./dev.db | SQLite location |
| JWT_SECRET | …demo… | signs auth tokens |
| QR_HMAC_SECRET | …demo… | signs/verifies QR payloads |

## Resetting
```bash
rm backend/prisma/dev.db && npm run setup
```

## Troubleshooting
- **Camera scan doesn't open** — needs HTTPS or localhost + camera permission; the
  paste field always works.
- **"cannot_receive_from_state..."** — expected: each pack can only advance one state
  per role. Pick a fresh pack from the Manufacturer's batch page.
- **QR download empty** — canvas download blocked on some browsers; screenshot the QR
  instead (demo fallback).
