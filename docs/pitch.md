# MedGuard — Pitch

**Counterfeit Medicine Detection** · SIH 2026, PS #59

> One line: we make the pharmacy **unable to dispense a fake** — not merely able to check one — by gating every hand-off through a tamper-evident, order-enforcing chain the consumer can independently verify and close with a purchase.

---

## Plain English first — what is this, really?

Imagine every medicine box carries a **fingerprint that can't be photocopied**, and a
**diary of everywhere it's been** that nobody can erase or rewrite. The factory writes the
first page when it makes the box. The distributor signs when it passes through their hands.
The pharmacy signs when it reaches the shelf. And when *you* — the patient — buy it, you
can read the whole diary with your phone in two seconds and know it's real.

That's MedGuard. No special app, no lab equipment, just a phone camera and a QR code.

**The insight:** counterfeits don't fail because they *look* fake — they fail because their
**story doesn't add up**. Either they were never born (no record), their signature was
copied (a photocopied fingerprint), they teleported (skipped the distributor), or the same
box appears in two cities at once (cloned). We catch all of those, automatically.

---

## 1. The hook — why this matters

Counterfeit medicines kill an estimated **one million people a year** (WHO). That's more
than malaria, more than many wars. And it's a problem that keeps growing because the
counterfeiter's job is easier than the regulator's:

- **Barcode tracking is centralized and editable.** One person with database access can
  change a record. A whole shipment of fakes becomes "genuine" with an UPDATE query.
- **Static QR stickers can be copied wholesale.** Print a real code onto 100,000 fake boxes
  and every scan says "valid."
- **Consumers and pharmacists have no way to tell real from fake.** The box, the blister,
  the color, the logo — counterfeiters have gotten *very* good at all of it.

**Real-life example:** In 2012, counterfeit versions of the cancer drug Avastin were found
in the US supply chain — vials that contained **no active ingredient at all**. They looked
right. The paperwork looked right. The only reason they were caught is that someone noticed
a single misplaced decimal in a batch number. Thousands of patients had already received
them. A system like MedGuard would have flagged that pack the moment its **custody chain**
couldn't be verified — before it ever reached a patient.

**Real-life example:** Anti-malarial drugs in Southeast Asia are so heavily counterfeited
that some studies estimate **a third of all antimalarials** are fake or substandard. Each
fake pack doesn't just fail to cure — it drives drug-resistant malaria, making the *real*
medicine stop working for everyone. This isn't just a health problem; it's an arms race, and
we're bringing cryptography to it.

The weakest link is the **last mile — the pharmacy counter.** That is exactly where MedGuard attacks.

---

## 2. How it works — the workflow

```
Manufacturer → Distributor → Pharmacist → Consumer → Buy
     MINT          RECEIVE        RECEIVE        VERIFY     BUY
    CREATED → DISTRIBUTED → AT_PHARMACY → SOLD
```

| Step | Role | Action | Chain effect |
|---|---|---|---|
| 1 | Manufacturer | Mints a batch; each pack gets a unique serial + **signed QR** | `MINT` block opens the pack's chain |
| 2 | Distributor | Scans pack on receipt | `RECEIVE` → `DISTRIBUTED` |
| 3 | Pharmacist | Scans pack into stock, verifies before sale | `RECEIVE` → `AT_PHARMACY` |
| 4 | Pharmacist | Dispenses a `GENUINE` pack | `SELL` → `SOLD` |
| 5 | Consumer | Scans QR (any phone, Google Lens, no app) | full journey + verdict |
| 6 | Consumer | Buys a genuine pack | `BUY` → `SOLD` (visible to manufacturer within 5s) |

Every hand-off is an **append-only, hash-linked block**. A fake is caught at the pharmacy
because at least one of these is true:

- it was **never minted** (`not_minted`),
- its QR **signature doesn't verify** (`bad_signature`) — a copied sticker,
- its **custody chain is broken** (`chain_broken`) — it skipped a node or was tampered with,
- its **behavior is anomalous** — `scanned_after_sold`, `route_mismatch`, `scan_flood`, `missing_handoff`.

### A concrete walkthrough (one real pack)

Let's follow **Pack #M-G-1A2B3C** of Paracetamol 500mg through its whole life:

1. **Monday, the factory.** A manufacturer logs in and mints a batch of 500. Pack
   #M-G-1A2B3C gets a serial and a QR signed with a secret key. The ledger's first entry
   for this pack says: *"MINT — by manufacturer — 9:00am."* State: `CREATED`.

2. **Tuesday, the distributor.** A distributor scans the pack when the truck arrives. The
   system checks: *is this pack CREATED, and does its signature match?* Yes → the pack
   becomes `DISTRIBUTED`, and a new line is added: *"RECEIVE — by distributor."* If the
   distributor tried to scan a pack that was already in their custody, the system says no —
   you can't handle the same pack twice.

3. **Wednesday, the pharmacy.** The pharmacist scans it into stock. It becomes
   `AT_PHARMACY`. The pharmacist scans again to **verify** before selling: the system
   replays the pack's whole history (minted → distributed → received) and checks every
   signature. It's `GENUINE`. The pharmacist dispenses it: `SOLD`.

4. **Thursday, you.** You pick the box off the shelf, point your phone camera at the QR
   (Google Lens, no app). You see the full journey — where it was made, who handled it,
   when it reached the pharmacy — and a green **GENUINE** verdict. You tap **Buy**. The
   ledger records *"BUY — by consumer."* That pack is now `SOLD` to you, permanently.

5. **The clone attack.** A counterfeiter bought that same genuine pack, copied its QR, and
   printed it on 100,000 fake boxes. The *first* fake box someone scans triggers an alert:
   *"scanned after sold."* Scan two more and the system cries *"scan flood — many copies in
   circulation."* The genuine serial has become radioactive — every extra scan is evidence.

---

## 3. The innovations — and why they matter

### 3.1 Clone-proof signed QR (not a static code)

- **Plain English:** the QR is a fingerprint, not a name tag. A name tag can be copied; a
  fingerprint can't — the copy won't match the hand it's attached to.
- **How it works:** the QR payload is `MEDG:<serial>:<hmac>`. The `hmac` is a cryptographic
  signature of the serial + batch, computed with a secret key only the manufacturer holds.
  Copy the sticker to 10,000 boxes and all 10,000 have a **non-verifying** signature.
- **Real-life example:** this is the same idea as the hologram on a banknote or the
  signature on a cheque — but cryptography is harder to fake than any printing technique.
  A counterfeiter can spend millions perfecting a hologram; they can't guess a 256-bit key.

### 3.2 Hash-chained ledger with two pointers per block

- **Plain English:** the ledger is a diary written in pen, where each page is glued to the
  previous page. Rip out one page and every page after it comes loose.
- **How it works:** each block stores two hashes — `prevHash` (the previous block *across
  the whole system*) and `productPrevHash` (the previous block *for this one pack*). Change
  any byte of any block and both chains visibly break.
- **Real-life example:** it's why you can't quietly edit a single line in a paper land
  registry without someone noticing the pages don't match. Blockchains (Bitcoin, Ethereum)
  use exactly this mechanism; we built a focused version for medicine custody.

### 3.3 Chain-order state machine

- **Plain English:** the pack can only move forward along one path — factory → distributor →
  pharmacy → sold. It can't jump the queue.
- **How it works:** `CREATED → DISTRIBUTED → AT_PHARMACY → SOLD`, enforced server-side. A
  distributor can only receive a `CREATED` pack; a pharmacist only a `DISTRIBUTED` one. A
  pack smuggled straight from factory to pharmacy shelf **cannot** reach `SOLD` — the
  pharmacy dashboard literally has no button to dispense it.
- **Real-life example:** this is how a supply chain *should* work — like a courier package
  that must be scanned at every hub. If a package appears at your door but the tracking
  shows it never left the warehouse, you know something's wrong. We make the pharmacy
  *incapable* of selling something that didn't arrive legitimately.

### 3.4 Behavioral clone detection (automatic)

- **Plain English:** even a *perfectly copied* genuine serial can't be in two places at
  once, and can't be sold twice. When it appears to be, that's the clone alarm.
- **How it works:** the system watches behavior, not just data —
  - **scanned after sold** → the same pack used twice,
  - **route mismatch** → a Delhi batch scanned in Mumbai,
  - **scan flood** → one serial scanned many times = many copies in the wild,
  - **missing hand-off** → the journey skipped a mandatory node.
- **Real-life example:** credit-card fraud works the same way. Your card number is often
  already "out there"; the bank catches fraud because the *usage pattern* is impossible —
  a purchase in London at 2pm and New York at 2:05pm. We do the same for medicine packs.

### 3.5 Reasoned verdict, not yes/no

- **Plain English:** a fake detector that just says "bad" is useless. We say *why*.
- **How it works:** every scan returns a verdict (`GENUINE` / `SUSPICIOUS` / `COUNTERFEIT`)
  plus the specific reason — `not_minted`, `bad_signature`, `chain_broken`,
  `missing_handoff`, `scanned_after_sold`, `route_mismatch`, `scan_flood`.
- **Real-life example:** it's the difference between a doctor saying "you're sick" and
  "you have strep throat, here's the antibiotic." The reason tells everyone what to do.

### 3.6 Consumer closes the loop (scan → buy)

- **Plain English:** the person who needs the medicine the most is also the one who can
  verify it — and now buy it in the same action.
- **How it works:** the consumer page shows the journey; a `GENUINE` pack at `AT_PHARMACY`
  gets a **Buy** button. Clicking it appends a `BUY` block and marks it `SOLD`, which the
  manufacturer dashboard reflects within seconds.
- **Real-life example:** this turns a "nice-to-have verification" into a **complete
  chain-of-custody close** — the moment a real patient buys a real pack, that serial is
  retired. Any clone printed after that is instantly radioactive.

---

## 4. The economics & who it's for

| Stakeholder | What they get |
|---|---|
| **Patient** | Two-second, free, no-app confidence that their medicine is real. |
| **Pharmacist** | Legal & ethical protection — they can *prove* they never sold a fake. |
| **Manufacturer** | Brand protection. Every fake pack that fails is a real pack that sells. |
| **Distributor** | An auditable chain — no more "it got lost in transit" disputes. |
| **Regulator** | A single, shared, tamper-evident record across the whole industry. |

**Why this wins over status quo:** today's systems are *siloed*. The manufacturer has a
database, the distributor has an ERP, the pharmacy has another system, and none of them
talk. MedGuard gives everyone one shared, tamper-evident truth — which is what a supply
chain actually needs.

---

## 5. What we did *not* do (honest limitations)

| Gap | Status | Path |
|---|---|---|
| Mock blockchain (SQLite, not a real network) | In scope | Swap persistence for Ethereum/Hyperledger — interface unchanged |
| HMAC (shared secret) not asymmetric keys | **Fixed** | New mints are Ed25519-signed by the manufacturer's private key; anyone verifies via `GET /api/verify/public-key`. Pre-upgrade HMAC packs still verify (dual-mode) |
| No physical↔digital binding (photo/OCR/tamper seal) | Out of scope | Image recognition on packaging vs. reference |
| No regulator portal / SMS-USSD / recall tools | Out of scope | Documented upgrade paths |

**Being honest about these is a feature, not a bug.** We'd rather claim six things that
genuinely work than twenty that are smoke and mirrors. The jump from mock-ledger to
real-chain is an *interface* change, not a redesign — the block schema and verification
logic are already written to be storage-agnostic.

---

## 6. Differentiation vs. the rest

| Existing approach | Their gap | MedGuard |
|---|---|---|
| QR / serial lookup | "Does this code exist?" — copyable | Signed QR + clone detection |
| Scratch-off codes | Copyable, no history | Live identity + full journey |
| NFC / RFID tags | Removable / transferable | Chain-order state machine (can't skip a node) |
| Blockchain tracking | Immutable ≠ truthful | Only authorized roles advance events |
| Manufacturer DB | Siloed, no shared history | One shared verification layer |
| Holograms | Visually reproducible | Physical + cryptographic verification |
| Consumer apps | Just "valid / invalid" | Reasoned verdict + journey + buy |
| Proof-of-origin | Doesn't detect clones | Auto-detects duplicates & impossible journeys |

---

## 7. The demo (60 seconds)

1. **Manufacturer** mints a batch → signed QRs.
2. **Distributor** receives → `DISTRIBUTED`.
3. **Pharmacist** scans → `AT_PHARMACY`, verifies → `GENUINE`.
4. **Consumer** Google-Lenses the QR on a phone → journey + verdict → **Buy**.
5. **Manufacturer** dashboard shows `SOLD` within seconds.
6. **Kill shot:** scan a QR with one HMAC character changed → `COUNTERFEIT / bad_signature`.

---

## 8. Likely judge questions

- **"Is the blockchain real?"** — Semantics are identical (append-only, hash-linked, signed);
  persistence is SQLite so the demo is offline-safe. Swapping in a real contract is an
  interface change, not a redesign.
- **"Can't someone print fake QRs?"** — Only the holder of the signing secret can mint a valid
  signature; copied stickers fail verification, and scan-flood flags real serials.
- **"Why the state machine?"** — A pack that skips a legit node can never reach `SOLD`, so a
  pharmacy can't dispense it.
- **"Consumer adoption?"** — Verify is a public endpoint, no app install; SMS/USSD is the
  documented offline fallback.
- **"What about offline pharmacies?"** — Verification needs one online device per pharmacy,
  not per patient. The consumer just needs a phone camera and a network signal (or, later,
  SMS/USSD).
- **"Won't this slow down the pharmacy?"** — One scan adds milliseconds. The pharmacy's
  existing scanning step now also *proves authenticity*, so it's not extra work — it's the
  same scan with a guarantee.

---

## 9. The bigger picture — why this scales

- **One protocol, every manufacturer.** The API is generic — any manufacturer, distributor,
  or pharmacy can plug in. It's not a single-company silo; it's a shared layer.
- **Regulator-ready.** The alert feed gives a regulator a live, auditable view of anomalies
  across the whole market — recalls and investigations become instant.
- **Beyond medicine.** The same chain-of-custody logic applies to any high-stakes physical
  good: luxury watches, electronics, seeds, vaccines, even spare aircraft parts.

---

Full docs: [`architecture.md`](architecture.md) · [`blockchain-design.md`](blockchain-design.md) ·
[`innovation.md`](innovation.md) · [`demo-script.md`](presentation/demo-script.md) ·
[`roles-flow.md`](roles-flow.md) · [`problem-statement.md`](problem-statement.md)
