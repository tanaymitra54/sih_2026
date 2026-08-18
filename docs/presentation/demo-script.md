# Demo Script (timed, ~8 minutes)

Setup: `npm run setup && npm run dev`. Two browser tabs ready: one logged-out.

## 0:30 — Hook
> 1M people die a year from fake meds. The weakest link is the last mile — the
> pharmacy counter. MedGuard makes the pharmacy unable to sell a fake.

## 1:00 — Manufacture (mfr@medguard.in)
1. Create batch "Paracetamol 500mg", qty 5, route **Delhi**, **Mint batch**.
2. Open the batch → signed QRs. Point out: each pack is a *unique signed token*, not a URL.

## 2:00 — Distributor (log out → dist@medguard.in)
1. Paste one `MEDG:...` string into the receive box.
2. Shows `Received ... state DISTRIBUTED`. Say: "a custody block just went on the chain."
3. Paste the **same** string again → rejected. "The chain is strict — no double-handling."

## 3:30 — Pharmacist (log out → pharma@medguard.in)
1. Receive the pack (now `AT_PHARMACY`).
2. **Verify** → `GENUINE`, timeline shows MINT → RECEIVE → RECEIVE.
3. **Dispense** → `SOLD`. "The chain is now closed at this pharmacy."

## 4:30 — Consumer (logged-out tab → /consumer/verify)
1. Paste the same QR → `GENUINE`, full journey visible. "Any phone, no app."
2. **The kill shot:** paste a QR with a tampered HMAC (edit one char) →
   `COUNTERFEIT`, flag `bad_signature`. "Copy a sticker — the signature won't verify."
3. Paste a made-up serial → `COUNTERFEIT`, `not_minted`.

## 6:00 — Alert feed (/alerts, any login)
Show auto-raised alerts: `bad_signature`, `route_mismatch`, `sold_then_scanned`.
> Nobody wrote these — the ledger detected the behavior itself.

## 7:00 — Wrap
- Innovations recap (signed QR, immutable chain, state machine, behavioral clone detection).
- Answer common judge questions (below).

## Likely judge questions
- **"Is the blockchain real?"** — Semantics are identical (append-only, hash-linked,
  signed); persistence is SQLite so the demo is offline-safe. Swapping in a real
  contract is an interface change, not a redesign. (docs/blockchain-design.md)
- **"Can't someone print fake QRs?"** — Only the holder of the signing secret can mint
  a valid signature; copied stickers fail verification, and scan-flood flags real serials.
- **"Why the state machine?"** — A pack that skips a legit node can never reach `SOLD`,
  so a pharmacy can't dispense it.
- **"Consumer adoption?"** — Verify endpoint is public, no app needed; SMS/USSD is the
  documented offline fallback.

## Fallbacks if demo glitches
- Camera blocked → use the paste field.
- Can't reach backend → `curl localhost:4000/health`; restart with `npm run dev`.
- Ledger empty → re-run `npm run setup`.
