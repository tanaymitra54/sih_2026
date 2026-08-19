# MedGuard — Pitch Script (Speaker-wise)

Counterfeit Medicine Detection · SIH 2026, PS #59

Six speakers. Plain, everyday language — no blockchain jargon unless it's explained in
the same breath. Read the **bold** lines out loud; everything else is a cue.

| # | Speaker | Section | What they cover |
|---|---|---|---|
| 1 | **Arshit** | The problem | Current issues in the market — why fakes slip through |
| 2 | **Soumya + Tanay** | The innovations | What we're proposing, in plain English |
| 3 | **Adithyan** | Tech stack | What the system is built from, simply |
| 4 | **Tanay + Adithyan** | The demo | The live 60-second walkthrough |
| 5 | **Sagnik** | Who it's for + honesty | Value for each player, and our honest limits |
| 6 | **Amishi** | The close | Why it scales, and the final line |

---

## Speaker 1 — Arshit · The problem

> **"Let me start with a number that's hard to ignore: fake medicine kills about a
> million people every year. That's more than malaria. More than many wars. And it's
> getting worse — because for a counterfeiter, faking medicine is easier than catching it."**

> **"Why? Three reasons."**

> **"First — the barcodes we use today are stored in a normal computer database, and a
> database can be edited. One person with the right access can change one record, and a
> whole shipment of fake boxes suddenly looks genuine."**

> **"Second — the QR codes on boxes today are just stickers. They can be photocopied.
> Print one real code onto a hundred thousand fake boxes, and every single scan says
> 'valid'."**

> **"Third — and this is the cruel part — the person standing at the pharmacy counter,
> the one who needs the medicine most, has no way to tell the real box from the fake.
> The box, the color, the logo — counterfeiters have gotten very, very good at all of
> it."**

> **"One real example: in 2012, fake versions of the cancer drug Avastin were found in
> America — vials with no medicine in them at all. They looked right. The paperwork
> looked right. Thousands of patients got them before anyone noticed. The only reason
> they were caught was a single misplaced decimal in a batch number."**

> **"So the weakest link in this whole chain is the last one — the pharmacy counter.
> And that is exactly where we attack. My colleague Soumya will tell you how."**

---

## Speaker 2 — Soumya + Tanay · The innovations

> **Soumya: "Before I talk about our solution, imagine two everyday things. A
> fingerprint — the one thing that can't be photocopied. And a diary — written in pen,
> where every page is glued to the page before it, so nobody can quietly tear one out."**

> **Soumya: "We put a fingerprint and a diary on every single medicine box."**

> **Soumya: "Here's the idea in one sentence: every box gets a code that cannot be
> copied, and a history of everywhere it has been that no one can erase. The factory
> writes the first page when it makes the box. The distributor signs when it passes
> through their hands. The pharmacy signs when it reaches the shelf. And when you, the
> patient, buy it — you can read the whole story with your phone in two seconds and know
> it's real."**

> **Soumya: "No special app. No lab equipment. Just your phone camera and a QR code."**

> **Soumya: "Now, what makes this different from what's already out there? Four things."**

> **Soumya: "One — a code that can't be copied. A normal QR is a name tag; you can
> photocopy a name tag. Ours is a fingerprint — the copy won't match the hand it's
> attached to."**

> **Soumya: "Two — a diary that can't be rewritten. Every hand-off is glued to the one
> before it. Rip out one page and every page after it comes loose."**

> **Tanay: "Three — a box can only move forward, one step at a time: factory, then
> distributor, then pharmacy, then sold. It can't skip a step. A box smuggled straight
> from the factory to a pharmacy shelf simply cannot be sold — the pharmacy's computer
> has no button to sell it."**

> **Tanay: "And four — the system doesn't just check the box, it watches the behavior. A
> box that was already sold, but suddenly appears in another city? That's impossible —
> and we catch it automatically. It's the same idea as your bank flagging your card when
> it sees a purchase in London at 2pm and New York at 2:05pm."**

> **Tanay: "One more thing — when we say a box is fake, we don't just say 'bad'. We say
> why: this code was never created, or this signature doesn't match, or this box skipped
> a step. It's the difference between a doctor saying 'you're sick' and 'you have strep
> throat, here's the medicine'."**

> **Soumya: "The result: we make the pharmacy unable to hand out a fake. Not just able
> to check one — unable. That's the whole point. Adithyan will now show you what it's
> made of."**

---

## Speaker 3 — Adithyan · The tech stack (plain English)

> **"How does this actually work under the hood? Let me explain it without a single
> technical word — because honestly, the idea is simple."**

> **"There are two halves. The front — what each person sees on their screen. And the
> back — the shared diary that remembers everything."**

> **"Every player gets their own screen. The factory has a button that creates a batch of
> boxes. The distributor has a box where they scan packages in. The pharmacy has a button
> to check and sell. And the customer — you — just opens a web page, no app to install."**

> **"Behind all of them is one shared diary. Every time a box changes hands, a new line
> is written. And here's the key part: each new line is locked to the line before it
> using a kind of digital glue. Change even one letter anywhere in the past, and every
> line after it visibly breaks."**

> **"And the code on each box? It's made with a secret key that only the factory holds.
> So a box can be checked against the factory's signature — and a copied sticker will
> never match."**

> **"One question we get a lot: is this a real blockchain? The answer — the important
> part, the diary that can't be rewritten and the signature that can't be copied — yes,
> that's real. We store the diary in a simple file today so the demo runs smoothly even
> with no internet. But swapping in a full-scale network later is a plug-and-play change
> — the design doesn't change, only the storage underneath."**

> **"Everything runs on a single command, and it works offline in this room. Tanay and I
> will now make it real in sixty seconds."**

---

## Speaker 4 — Tanay + Adithyan · The live demo

> **Tanay: "Watch this."**

**Step 1 — The factory mints a batch.** *(Tanay narrates, Adithyan clicks)*
> "The manufacturer logs in, creates a batch of paracetamol, and mints it. Each box now
> has its own signed QR — a unique fingerprint, not a URL."

**Step 2 — The distributor receives it.** *(Adithyan narrates, Tanay clicks)*
> "The distributor scans a box on arrival. The diary now reads: received. And watch — if
> they try to scan the same box twice, the system refuses. The diary is strict."

**Step 3 — The pharmacist checks and sells.** *(Tanay narrates, Adithyan clicks)*
> "The pharmacist scans it into stock, then checks it — the screen shows the box's whole
> journey, and says GENUINE. They dispense it. The diary is now closed at this pharmacy."

**Step 4 — The customer scans with a phone.** *(Adithyan narrates, Tanay clicks)*
> "Now the customer — no app — points their phone camera at the QR. They see the full
> story and a green GENUINE. They tap Buy, and that box is now permanently sold to them."

**Step 5 — The kill shot.** *(Tanay narrates, Adithyan clicks)*
> "Now the part I like best. I've changed just one character in that QR code. Let's scan
> it — COUNTERFEIT. Reason: signature doesn't match. Copy a sticker, and the copy fails."

> **Adithyan: "Every alert you just saw — the tampered code, the double scan — was
> raised automatically. Nobody typed them. The system detected the behavior itself."**

> **Tanay: "That's the whole product in sixty seconds. Sagnik will tell you who it's
> for."**

---

## Speaker 5 — Sagnik · Who it's for + our honesty

> **"So who actually benefits?"**

> **"The patient gets a two-second, free check that their medicine is real. The
> pharmacist gets protection — they can prove they never sold a fake. The manufacturer
> gets their brand back — every fake that fails is a real box that sells. The
> distributor gets an unbreakable record, so there are no more 'it got lost in transit'
> arguments. And the regulator gets one shared, tamper-proof view of the whole industry."**

> **"Why this wins over what exists today: right now, everyone keeps their own separate
> records, and none of them talk to each other. We give them one shared truth — which is
> what a supply chain actually needs."**

> **"And here's the part most teams skip — we'll be honest about what we did not do. Our
> diary runs on a simple file today, not a full-scale network. We use one shared secret
> rather than individual keys. We haven't added photo-matching or an SMS option for
> basic phones. We'd rather promise six things that genuinely work than twenty that are
> smoke and mirrors."**

> **"The jump from what we have to the full version is a swap of the storage layer — not
> a redesign. Amishi will close it out."**

---

## Speaker 6 — Amishi · The close

> **"Let me leave you with the bigger picture."**

> **"This isn't one company's private system. It's one protocol — any manufacturer, any
> distributor, any pharmacy can plug in. And the alert feed gives a regulator a live view
> of every anomaly in the market. Recalls and investigations become instant, not months."**

> **"And it doesn't stop at medicine. The same logic protects anything where a fake is
> dangerous: luxury watches, electronics, seeds, vaccines, even spare aircraft parts."**

> **"We started with a hard truth — a million people die every year from fake medicine.
> We're ending with a simple one: a fake medicine can't hurt you if it can never reach
> you. MedGuard makes sure it never does."**

> **"Thank you. We'd love your questions."**

---

## Quick Q&A cheat sheet (any speaker)

- **"Is the blockchain real?"** → The parts that matter — the diary that can't be
  rewritten and the signature that can't be copied — are real. We store it in a file
  for a smooth, offline-safe demo; swapping in a full network is a plug-and-play change.
- **"Can't someone just print fake QRs?"** → Only the factory's secret key makes a valid
  code. A copied sticker fails the check, and our behavior-watcher flags the same box
  being scanned in many places.
- **"Why the one-way path?"** → A box that skips a legitimate step can never be sold, so
  a pharmacy physically cannot dispense it.
- **"Will people actually use it?"** → Checking needs no app — just a phone camera. We've
  also documented an SMS fallback for basic phones.
- **"Won't this slow pharmacies down?"** → One scan adds milliseconds, and it's the same
  scan they already do — now it also proves the box is real.
