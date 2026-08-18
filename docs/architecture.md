# Architecture

## Folder map

```
SIH_2026_final/
├── docs/                     # this documentation
├── frontend/                 # React (Vite) + TS
│   └── src/
│       ├── pages/            # one per role: Login, Manufacturer, Distributor, Pharmacist, Consumer, Alerts
│       ├── components/       # ScanInput (camera+paste), Timeline, StatusBadge
│       ├── api.ts            # axios client w/ JWT interceptor
│       ├── store.ts          # zustand auth store
│       └── utils/useQrScanner.ts
└── backend/                  # Express + TS
    ├── prisma/               # schema.prisma + seed.ts
    └── src/
        ├── blockchain/       # ledger-core.ts (pure hash-chain) + ledger.ts (DB persistence)
        ├── services/         # auth, batches (mint), custody (receive/sell), verify, reports
        ├── routes/           # auth, batches, custody, verify, reports
        ├── middleware/       # auth JWT + role guard + error handler
        └── app.ts / server.ts / config.ts
```

## Data flow

```
  MANUFACTURER                      DISTRIBUTOR                       PHARMACIST                     CONSUMER
  mint batch ──signed QRs──▶  scan → RECEIVE ──▶   scan → RECEIVE ──▶ verify → SELL ──▶  scan QR → full journey
       │  (MINT block)         (state DISTRIBUTED)  (state AT_PHARMACY) (state SOLD)        + GENUINE verdict
       └──────────────►  immutable hash-chained ledger (SQLite)  ◄──────────────────────────────────┘
                              every block: sha256(prevHash + productPrevHash + action + payload + signer + ts)
```

## State machine

```
CREATED ──(distributor receive)──▶ DISTRIBUTED ──(pharmacist receive)──▶ AT_PHARMACY ──(pharmacist sell)──▶ SOLD
   ▲                                   ▲                                     ▲
   └─ MINT (manufacturer)              └─ RECEIVE block                      └─ SELL block
```

- A distributor can only receive `CREATED`; a pharmacist only `DISTRIBUTED`.
- `SOLD` is only reachable from `AT_PHARMACY`. A pack that never passed through a
  legitimate node can never be sold.

## Verification rules (in order, first match wins)

| Check | Fails when | Verdict |
|---|---|---|
| Parsed? | QR text isn't `MEDG:...` | COUNTERFEIT |
| Minted? | serial not in DB | COUNTERFEIT |
| Signature? | HMAC doesn't match serial+batch | COUNTERFEIT |
| Chain? | any block re-hash or link fails | COUNTERFEIT |
| Sold-then-scanned? | scanned after state=SOLD | SUSPICIOUS |
| Route mismatch? | scan location ≠ batch route | SUSPICIOUS |
| Scan flood? | ≥3 prior scans of same serial | SUSPICIOUS |
| else | — | GENUINE |

Every verify also appends a VERIFY block and a ScanEvent — the whole audit trail is immutable.

## Key decisions
- **Two hash pointers per block** (`prevHash` = global tip, `productPrevHash` = this
  product's tip): tampering anywhere breaks the global chain AND the product chain.
- **QR = `MEDG:<serial>:<hmac>:<batchCode>`**: copying a sticker gives a non-verifying
  hmac; only the holder of `QR_HMAC_SECRET` can mint valid QRs.
- **Block timestamps stored in seconds** — SQLite `Int` is 32-bit.
