# API Specification

Base URL: `http://localhost:4000/api` (frontend proxies `/api` to it).
All response bodies are JSON. Errors: `{ "error": "<code>" }` with 400/401/403.

## Auth

### POST /auth/register
Body: `{ name, email, password, role, location? }` → `{ token, user }`

### POST /auth/login
Body: `{ email, password }` → `{ token, user }`
`user = { id, name, email, role, location }`

## Batches

### POST /batches  (auth: `manufacturer`) — submit a mint request
Body: `{ name, quantity (1–500), route }`
Creates a batch with `status = PENDING`. **No products, QRs or ledger blocks
exist yet** — they are only generated when an admin approves.

### GET /batches  (auth: `manufacturer`) — list my batches
→ `[{ id, code, name, route, quantity, status, products: [{..., qr}] }]`
`products` is empty until the batch is approved and minted.

### GET /batches/:id  (auth: `manufacturer`, owner only) — one batch with signed QRs

### GET /batches/pending  (auth: `admin`) — mint requests awaiting approval
→ `[{ id, code, name, quantity, route, createdAt, manufacturer: { name } }]`

### GET /batches/all  (auth: `admin`) — every request + outcome (recent first)

### POST /batches/:id/approve  (auth: `admin`)
Flips `PENDING → ACTIVE`, then mints: per pack a serial is generated,
Ed25519-signed, a Product row and a MINT ledger block are created. The MINT
payload embeds `approvedBy: <admin id>` for tamper-evident attribution.
→ `{ ..., status: "ACTIVE", productsMinted: n }`
Second approve → 400 `batch_already_processed`.

### POST /batches/:id/reject  (auth: `admin`) — terminal; nothing is ever minted

### POST /batches/:id/recall  (auth: `manufacturer`, ACTIVE batches only)
Recalling a PENDING/REJECTED batch → 400 `batch_not_approved`.

## Custody  (auth)

### POST /custody/receive  — distributor / pharmacist takes custody
Body: `{ qr }` (full `MEDG:...` text)
Enforces state order:
- distributor receiving `CREATED` → `DISTRIBUTED`
- pharmacist receiving `DISTRIBUTED` → `AT_PHARMACY`
- otherwise → 400 `cannot_receive_from_state_X_as_Y`

### POST /custody/sell  — pharmacist dispenses
Body: `{ serial }` → requires `AT_PHARMACY`, sets `SOLD`.

### GET /custody/products?state=  — any logged-in role
→ `[{ id, serial, state, batch: { code, name, route } }]`

## Verify  (public — no auth)

### POST /verify
Body: `{ qr, scan?: { location?, lat?, lng? } }`
→ `{ verdict, flags[], product | null, journey[], risk? }`

- `verdict`: `GENUINE | SUSPICIOUS | COUNTERFEIT`
- `flags`: `unparseable_qr | not_minted | bad_signature | chain_broken |
  batch_not_approved | scanned_after_sold | route_mismatch | scan_flood |
  batch_recalled | missing_handoff | impossible_travel | ml_high_risk`
- `product`: `{ serial, name, batchCode, state }` (null if never minted)
- `journey`: ordered custody blocks `{ action, signer, payload, timestamp }`
  (timestamps in **seconds** — multiply by 1000 client-side).
- `risk` (RL bandit): `{ score: 0..100, level: low|medium|high, reasons[], state: 0..2, action: 0..2, threshold }`

Each call also appends a VERIFY block + a ScanEvent, writes Alerts on anomalies, and runs the RL risk engine (see below).

### GET /verify/rl-stats  (public) — bandit Q-table + epsilon
→ `{ qTable: number[3][3], epsilon, totalUpdates, thresholds, states, actions }`

### POST /verify/feedback  (public) — reward the bandit
Body: `{ productId? | serial?, reward: -1..1 }` or `{ serial, correct: boolean }`
→ `{ ok, reward, state, action, qOld, qNew }`
Reward `+1` = true fraud caught, `-1` = false alarm. Uses the last bandit decision for that product.

### POST /verify/rl-reset  (auth: admin) — reset Q-table

## Reports  (auth)

### POST /reports  — report a suspicious product
Body: `{ serial, reason }`

### GET /reports/reports  — list reports

### GET /reports/alerts  — list auto-generated anomaly alerts
→ `[{ id, type, message, createdAt, product: { serial } | null }]`

## Other
### GET /health
→ `{ ok: true }`
