# Tech Stack

## Frontend — `frontend/`
| Piece | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite 6 + TypeScript | Fast dev, strict types, standard SIH pick |
| Routing | react-router-dom | Role-based routes + guard |
| State | zustand | One tiny store (auth user) |
| API client | axios | Interceptor attaches JWT |
| QR | qrcode.react (render) + html5-qrcode (camera scan) | Render signed QRs; scan with phone camera |
| Styling | hand-written `styles.css` | Zero build step, enough for the demo |

## Backend — `backend/`
| Piece | Choice | Why |
|---|---|---|
| Runtime | Node + Express 4 + TypeScript (tsx) | Standard, zero-config |
| DB | SQLite via Prisma ORM | File-based, no install, offline demo |
| Auth | JWT (jsonwebtoken) + bcryptjs | Role-based access |
| Signing | Node `crypto` HMAC-SHA256 | QR authenticity |
| Ledger | custom hash chain (sha256) | Immutable, append-only, web3-ready |

## Dev tooling
- **npm workspaces** at root — one `npm run dev` boots backend + frontend.
- **Vite proxy** `/api → :4000` — no CORS pain, works in prod build too.
- **Self-check** `backend: selfcheck` — asserts the chain logic (no test framework).

## Why not ...
- **Real blockchain now?** Needs network + wallet in the demo room. The mock ledger
  keeps the identical semantics (append-only, hash-linked, signed); swapping the
  persistence layer for a real chain later is the documented upgrade path.
- **MongoDB/Postgres?** A demo DB needs to survive a reboot-less room; SQLite is one file.
- **React Query / Redux?** The app has ~6 endpoints; zustand + axios is enough.
