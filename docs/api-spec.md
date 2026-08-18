# API Specification

Base URL: `http://localhost:4000/api` (frontend proxies `/api` to it).
All response bodies are JSON. Errors: `{ "error": "<code>" }` with 400/401/403.

## Auth

### POST /auth/register
Body: `{ name, email, password, role, location? }` → `{ token, user }`

### POST /auth/login
Body: `{ email, password }` → `{ token, user }`
`user = { id, name, email, role, location }`

## Batches  (auth: `manufacturer`)

### POST /batches  — mint a batch
Body: `{ name, quantity (1–500), route }` → batch with `products[]`, each
`{ id, serial, hmac, state, qr }` where `qr = MEDG:<serial>:<hmac>:<batchCode>`.

### GET /batches  — list my batches
→ `[{ id, code, name, route, quantity, products: [{... , qr}] }]`

### GET /batches/:id  — one batch with signed QRs

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
→ `{ verdict, flags[], product | null, journey[] }`

- `verdict`: `GENUINE | SUSPICIOUS | COUNTERFEIT`
- `flags`: `unparseable_qr | not_minted | bad_signature | chain_broken |
  scanned_after_sold | route_mismatch | scan_flood`
- `product`: `{ serial, name, batchCode, state }` (null if never minted)
- `journey`: ordered custody blocks `{ action, signer, payload, timestamp }`
  (timestamps in **seconds** — multiply by 1000 client-side).

Each call also appends a VERIFY block + a ScanEvent, and writes Alerts on anomalies.

## Reports  (auth)

### POST /reports  — report a suspicious product
Body: `{ serial, reason }`

### GET /reports/reports  — list reports

### GET /reports/alerts  — list auto-generated anomaly alerts
→ `[{ id, type, message, createdAt, product: { serial } | null }]`

## Other
### GET /health
→ `{ ok: true }`
