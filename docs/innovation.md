# Innovation — what makes this novel

## 1. Signed per-pack QR (clone-proof sticker)
Not a static URL that can be copied. The QR payload is
`MEDG:<serial>:<HMAC(serial+batch)>`. Only the manufacturer's secret produces a
valid HMAC, so:
- copying a sticker to 10,000 boxes → 10,000 boxes with **non-verifying signatures**;
- re-printing needs the secret, which defeats the forgery in the first place.

## 2. Immutable hash-chained custody ledger
Every handoff is an append-only sha256 block with **two pointers**:
`prevHash` (global) + `productPrevHash` (per product). Tamper with one row and both
the global chain and the affected product's journey break. The pharmacist verifies
the *whole journey*, not just "does this serial exist".

## 3. Chain-order state machine
`CREATED → DISTRIBUTED → AT_PHARMACY → SOLD`, enforced server-side. A fake that
bypasses a legitimate node (or a batch smuggled straight to a pharmacy) can never
reach a valid `SOLD` state — the pharmacy dashboard simply can't dispense it.

## 4. Behavioral clone detection (automatic)
The ledger's integrity is necessary but not sufficient — real counterfeiters clone
a *genuine* serial. We catch them with behavior:
- **scanned after sold** → the same pack being "used" twice,
- **route mismatch** → a Delhi batch scanned in Mumbai,
- **scan flood** → one serial scanned 3+ times = many copies in the wild,
- **missing hand-off** → the journey skipped a mandatory node (e.g. a state whose
  chain has no distributor/pharmacist hand-off or no sale record).

All feed the **Alert feed** automatically, with no human in the loop.

## 5. Consumer-grade verification for free
Because verification is a public endpoint, the *end user* — the person most harmed
by counterfeits — can check any pack with any phone. No app install; scan and read.

## Differentiators vs typical solutions
| Typical hackathon solution | MedGuard |
|---|---|
| QR → static DB lookup | QR + cryptographic signature + on-chain journey |
| Centralized DB (editable) | Append-only hash chain (tamper-evident) |
| "Exists" check | Full journey + state + behavior check |
| Trusts the scanner | Verifies signature server-side with a secret |
| One dashboard | Four role flows + public consumer path |

## Upgrade roadmap (if the judges push)
1. Real chain: swap SQLite persistence for a testnet/Hyperledger contract (interface unchanged).
2. Asymmetric QR signing (manufacturer keypair) instead of shared HMAC secret.
3. Photo packaging recognition + OCR batch code vs reference images.
4. SMS/USSD verification for feature-phone users.
5. Regulator portal with batch-level analytics and recall tools.
