# Role Flows

Four dashboards. Log in at `/login` — the demo chips pre-fill each account.

| Role | Email | Home route | Password |
|---|---|---|---|
| Manufacturer | mfr@medguard.in | /manufacturer | demo1234 |
| Distributor | dist@medguard.in | /distributor | demo1234 |
| Pharmacist | pharma@medguard.in | /pharmacist | demo1234 |
| Consumer | consumer@medguard.in | /consumer | demo1234 |

## 1. Manufacturer — mints authenticity
1. Fill the *Create & mint batch* form (name, quantity, declared route) and hit **Mint batch**.
2. Each pack gets a unique `serial` + HMAC `signature`; a `MINT` block is appended to the ledger.
3. Open a batch → grid of **signed QRs**, downloadable as PNGs (print on pack labels).

## 2. Distributor — takes custody
1. Scan (camera) or paste a pack's `MEDG:...` text.
2. Backend checks the pack is `CREATED` and minted by a legit chain → state `DISTRIBUTED`,
   a `RECEIVE` block is appended.
3. Pack now shows in *In my custody*. Scanning the same pack again is rejected.

## 3. Pharmacist — verify before sale
1. Scan/paste the pack → the **Verify** result shows `GENUINE`, its flags, and the full
   ledger journey (MINT → RECEIVE → ...).
2. Only a `GENUINE` pack in state `AT_PHARMACY` gets the **Dispense** button.
3. Dispensing sets state `SOLD` and closes the chain — the same QR scanned again later
   is flagged `scanned_after_sold` (clone alarm).

## 4. Consumer — verify after purchase
1. Any visitor (no login needed) scans the pack QR at `/consumer/verify`.
2. See the verdict + the complete on-chain journey. A counterfeit shows
   `COUNTERFEIT` with the reason (`not_minted`, `bad_signature`, `chain_broken`).

## Shared: Alert feed (/alerts)
Logged-in users watch auto-generated anomalies: forged signatures, route mismatches,
scan-after-sold, scan floods. Good for the regulator story in the pitch.
