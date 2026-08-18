# Problem Statement — SIH 2026, PS #59

**Statement: Counterfeit Medicine Detection**

**Folds in as:** QR / on-chain verification at the pharmacy level.

## The problem

Counterfeit medicines kill an estimated one million people per year (WHO). They
reach patients because there is **no tamper-proof way to prove a pack's journey**
from factory to pharmacy shelf. Barcode tracking is centralized and editable;
static QR stickers can be copied wholesale; consumers and pharmacists have no way
to tell a real pack from a fake one.

## Our fold-in

We attack the **last mile** — the pharmacy counter — with a tamper-evident,
cryptographically verifiable chain of custody:

1. A manufacturer **mints** each medicine pack with a unique serial + HMAC-signed QR.
2. Every handoff (**distributor → pharmacist**) is written to an **immutable hash-chained ledger**.
3. The pharmacist **verifies the full journey before sale**; the consumer verifies it after.

A fake is caught at the pharmacy because at least one of these is true:
- it was **never minted** (serial unknown),
- its QR **signature doesn't verify** (a copied/forged sticker),
- its **custody chain is broken** (it skipped a legitimate node, or the chain was tampered with),
- its **behavior is anomalous** (scanned after sale, scanned in a city outside its declared route, scanned hundreds of times).

## Scope

In-scope for the hackathon build:
- Role dashboards for all 4 participants (manufacturer, distributor, pharmacist, consumer).
- Mock blockchain ledger (append-only, hash-linked, web3-ready interface) so the demo is fully offline.
- Automatic anomaly/clone detection feeding an alert feed.
- Signed QR generation, camera scanning, and journey timeline.

Out of scope (documented upgrade paths only): real Ethereum/Hyperledger network,
SMS/USSD verification, image-based packaging recognition, regulatory portal.
