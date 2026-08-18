# Database Schema

SQLite, via Prisma. File: `backend/prisma/schema.prisma`. Recreate with
`npm run db:push -w backend`.

```
User ──1:N── Batch ──1:N── Product ──1:N── CustodyRecord (ledger blocks)
                                    ├──1:N── ScanEvent
                                    ├──1:N── Report
                                    └──1:N── Alert
```

## User
`id, name, email (unique), password (bcrypt), role, location?, createdAt`
- Roles: `manufacturer | distributor | pharmacist | consumer`.

## Batch
`id, code (unique), name, route, manufacturerId→User, quantity, createdAt`
- `route` is the declared sales region (e.g. "Delhi") used for geo mismatch checks.

## Product  (one row per medicine pack)
`id, serial (unique), hmac, batchId→Batch, state, createdAt`
- `serial` = `M-G-XXXXXXXX`; `hmac` = HMAC-SHA256(serial, batchCode).
- `state`: `CREATED | DISTRIBUTED | AT_PHARMACY | SOLD`.

## CustodyRecord  (the ledger)
`id, index, blockHash (unique), prevHash, productPrevHash, productId→Product,
 action, signer, payload, timestamp`
- `action`: `MINT | RECEIVE | VERIFY | SELL`. Append-only; nothing is ever updated.

## ScanEvent
`id, productId→Product, location?, lat?, lng?, createdAt`
- One row per verification — powers the scan-flood / clone detector.

## Report
`id, productId→Product, reporterId?, reason, createdAt`
- Crowd-sourced suspicious-product reports (stretch: consumer/pharmacist feedback loop).

## Alert
`id, productId?→Product, type, message, createdAt`
- Auto-generated anomalies: `unminted_serial`, `bad_signature`, `route_mismatch`,
  `sold_then_scanned`, `scan_flood`.

## Seed data (`prisma/seed.ts`)
- 4 demo users, password `demo1234` (mfr/dist/pharma/consumer).
- 1 batch "Paracetamol 500mg", route Delhi, 5 packs minted (each with a MINT block).
