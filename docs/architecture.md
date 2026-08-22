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
  MANUFACTURER                ADMIN                    DISTRIBUTOR                       PHARMACIST                     CONSUMER
  submit mint request ──▶ approve ──▶ signed QRs ──▶ scan → RECEIVE ──▶   scan → RECEIVE ──▶ verify → SELL ──▶  scan QR → full journey
  (batch = PENDING)       (ACTIVE)   (MINT blocks,     (state DISTRIBUTED) (state AT_PHARMACY) (state SOLD)      + GENUINE verdict
                                     payload embeds
                                     approvedBy)
       └──────────────►  immutable hash-chained ledger (SQLite)  ◄──────────────────────────────────┘
                               every block: sha256(prevHash + productPrevHash + action + payload + signer + ts)
```

**Admin gate:** a batch request stays `PENDING` until an admin approves it. No
products, serials, QRs or ledger blocks exist before approval — a fraudulent
manufacturer's request never produces anything verifiable. Rejection is terminal.

## State machine

```
Batch request:  PENDING ──(admin approve)──▶ ACTIVE ──(admin recall n/a; mfr recall)──▶ RECALLED
                   └──(admin reject, terminal)──▶ REJECTED

Pack:  CREATED ──(distributor receive)──▶ DISTRIBUTED ──(pharmacist receive)──▶ AT_PHARMACY ──(pharmacist sell / consumer buy)──▶ SOLD
          ▲                                   ▲                                     ▲
          └─ MINT block (created only         └─ RECEIVE block                      └─ SELL/BUY block
             after admin approval;
             payload embeds approvedBy)
```

- A distributor can only receive `CREATED`; a pharmacist only `DISTRIBUTED`.
- `SOLD` is only reachable from `AT_PHARMACY`. A pack that never passed through a
  legitimate node can never be sold.
- Packs of batches whose `status ≠ ACTIVE` are refused at custody and flagged at verify.

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
