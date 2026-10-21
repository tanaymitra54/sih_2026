#!/usr/bin/env python3
"""Generate MedGuard AWS presentation (PPTX)."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

BG = RGBColor(0x0A, 0x0E, 0x0C)
SURFACE = RGBColor(0x12, 0x1A, 0x16)
CARD = RGBColor(0x17, 0x21, 0x1C)
INK = RGBColor(0xE8, 0xF0, 0xEA)
MUTED = RGBColor(0x8F, 0xA3, 0x99)
GREEN = RGBColor(0x3D, 0xD6, 0x8C)
DIM = RGBColor(0x5C, 0x6F, 0x64)
LINE = RGBColor(0x24, 0x30, 0x2A)

W, H = Inches(13.333), Inches(7.5)
prs = Presentation()
prs.slide_width = W
prs.slide_height = H


def set_run(run, size=18, bold=False, color=INK, name="Calibri"):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name


def fill_bg(slide, color=BG):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    # send to back
    spTree = slide.shapes._spTree
    sp = shape._element
    spTree.remove(sp)
    spTree.insert(2, sp)


def add_text(slide, left, top, width, height, text, size=18, bold=False, color=INK, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    set_run(run, size=size, bold=bold, color=color)
    return box


def add_bullets(slide, left, top, width, height, items, size=15, color=MUTED):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.level = 0
        p.space_after = Pt(8)
        run = p.add_run()
        run.text = "▸  " + item
        set_run(run, size=size, color=color)
    return box


def card(slide, left, top, width, height, title, body):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = CARD
    shape.line.color.rgb = LINE
    add_text(slide, left + Inches(0.2), top + Inches(0.15), width - Inches(0.4), Inches(0.35), title, size=14, bold=True, color=INK)
    add_text(slide, left + Inches(0.2), top + Inches(0.5), width - Inches(0.4), height - Inches(0.65), body, size=12, color=MUTED)


def kicker_title(slide, kicker, title):
    add_text(slide, Inches(0.7), Inches(0.35), Inches(12), Inches(0.3), kicker, size=11, bold=True, color=GREEN)
    add_text(slide, Inches(0.7), Inches(0.65), Inches(12), Inches(0.6), title, size=28, bold=True, color=INK)


def blank():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    fill_bg(slide)
    return slide


# 1 Title
s = blank()
add_text(s, Inches(0.7), Inches(1.8), Inches(12), Inches(0.35), "MEDGUARD  ·  AWS CLOUD ARCHITECTURE", size=12, bold=True, color=GREEN)
add_text(s, Inches(0.7), Inches(2.3), Inches(12), Inches(1.4), "Counterfeit medicine detection,\nbuilt for the cloud.", size=36, bold=True, color=INK)
add_text(s, Inches(0.7), Inches(4.0), Inches(10), Inches(0.8), "Signed pack identities · tamper-evident custody ledger · behavioral clone detection — designed to run on AWS at production scale.", size=15, color=MUTED)
add_text(s, Inches(0.7), Inches(5.3), Inches(12), Inches(0.9), "Tanay Mitra · 24BCE1287\nRishav Kumar · 24BCE1666\nAditya · 24BCE1213", size=14, color=MUTED)

# 2 Problem
s = blank()
kicker_title(s, "01  ·  PROBLEM", "Fake medicine is a supply-chain failure.")
card(s, Inches(0.7), Inches(1.6), Inches(3.8), Inches(2.2), "~1M deaths / year", "WHO estimate. Counterfeits kill more than many better-known diseases.")
card(s, Inches(4.75), Inches(1.6), Inches(3.8), Inches(2.2), "Editable databases", "Central barcode systems can be quietly changed.")
card(s, Inches(8.8), Inches(1.6), Inches(3.8), Inches(2.2), "Copyable stickers", "Static QR codes can be photocopied onto fake packs.")
card(s, Inches(0.7), Inches(4.1), Inches(5.9), Inches(2.2), "What patients face", "At the pharmacy counter, packaging and paperwork give no cryptographic proof that a pack is real.")
card(s, Inches(6.9), Inches(4.1), Inches(5.7), Inches(2.2), "Where systems fail", "Most checks only ask “does this code exist?” — not whether signature, journey, and behaviour agree.")

# 3 Gaps
s = blank()
kicker_title(s, "02  ·  GAPS TODAY", "Existing tracking leaves dangerous holes.")
add_bullets(s, Inches(0.7), Inches(1.6), Inches(5.8), Inches(5), [
    "Central DBs can be quietly edited",
    "Static QRs can be photocopied at scale",
    "“Exists” checks ignore custody history",
    "No enforced factory → distributor → pharmacy order",
], size=16)
add_bullets(s, Inches(7), Inches(1.6), Inches(5.8), Inches(5), [
    "Cloned genuine serials go undetected",
    "Consumers rarely get a free verify path",
    "Alerts are manual, late, or missing",
    "Keys and audit logs lack cloud-grade controls",
], size=16)

# 4 Market
s = blank()
kicker_title(s, "03  ·  WHAT ALREADY EXISTS", "Track-and-trace is not new — trust still is.")
rows = [
    ("Barcode / GS1", "Inventory & logistics IDs", "Central records can be altered"),
    ("Static QR + portal", "Lookup serial in a database", "Sticker clones still “valid”"),
    ("Serialization mandates", "Unique IDs per pack", "ID alone ≠ authenticity proof"),
    ("Permissioned chain pilots", "Shared ledger among firms", "Heavy ops; weak consumer UX"),
]
y = Inches(1.55)
for a, b, c in rows:
    card(s, Inches(0.7), y, Inches(12), Inches(1.15), a, f"{b}  ·  Limit: {c}")
    y += Inches(1.3)

# 5 Uniqueness
s = blank()
kicker_title(s, "04  ·  UNIQUENESS", "What MedGuard adds beyond “track & trace”.")
card(s, Inches(0.7), Inches(1.6), Inches(5.9), Inches(2.2), "Cryptographic pack identity", "Ed25519 / signed QR — copies fail signature checks.")
card(s, Inches(6.9), Inches(1.6), Inches(5.7), Inches(2.2), "Dual hash-chain ledger", "Global + per-product pointers; tamper is evident.")
card(s, Inches(0.7), Inches(4.1), Inches(5.9), Inches(2.2), "Order-enforcing state machine", "CREATED → DISTRIBUTED → AT_PHARMACY → SOLD.")
card(s, Inches(6.9), Inches(4.1), Inches(5.7), Inches(2.2), "Behavioral clone detection", "After-sold scans, route mismatch, scan floods.")

# 6 Solution
s = blank()
kicker_title(s, "05  ·  SOLUTION", "Three trust layers on every scan.")
card(s, Inches(0.7), Inches(1.7), Inches(3.8), Inches(3), "1 · Identity", "Was this pack minted? Does the signature verify?")
card(s, Inches(4.75), Inches(1.7), Inches(3.8), Inches(3), "2 · History", "Is the custody chain intact and in valid order?")
card(s, Inches(8.8), Inches(1.7), Inches(3.8), Inches(3), "3 · Behaviour", "Do location, timing, and scan volume look real?")
add_text(s, Inches(0.7), Inches(5.2), Inches(12), Inches(1.2), "Thesis: a medicine is not genuine because a QR exists — it is genuine when identity, history, and behaviour all agree.", size=15, color=MUTED)

# 7 Flow
s = blank()
kicker_title(s, "06  ·  END-TO-END FLOW", "From mint to patient verify.")
add_text(s, Inches(0.7), Inches(2.2), Inches(12), Inches(3.5),
         "Manufacturer → Admin approve → Signed QR + MINT\n"
         "→ Distributor RECEIVE → Pharmacist RECEIVE / VERIFY / SELL\n"
         "→ Consumer scan + BUY\n\n"
         "Every step appends to the hash-chained ledger.",
         size=20, color=MUTED)
add_text(s, Inches(0.7), Inches(6.2), Inches(12), Inches(0.4), "See HTML deck for interactive Mermaid diagram.", size=12, color=DIM)

# 8 QR
s = blank()
kicker_title(s, "07  ·  CRYPTOGRAPHIC IDENTITY", "Signed QR — fingerprint, not a name tag.")
card(s, Inches(0.7), Inches(1.7), Inches(5.9), Inches(4), "Payload", "MEDG:<serial>:<sig>:<batch>\n\nSignature over serial|batch. Only the manufacturer key can mint valid packs.")
card(s, Inches(6.9), Inches(1.7), Inches(5.7), Inches(4), "Why clones fail", "• Photocopy keeps the same sticker text\n• Without the private key, new packs cannot be forged\n• Verify endpoint rejects bad signatures")

# 9 Ledger
s = blank()
kicker_title(s, "08  ·  LEDGER", "Append-only blocks with two previous hashes.")
add_bullets(s, Inches(0.7), Inches(1.8), Inches(12), Inches(4.5), [
    "prevHash links every block globally — edit any block, the rest break",
    "productPrevHash links one pack’s journey for pharmacy/consumer verify",
    "blockHash = sha256(index | prevHash | productPrevHash | productId | action | signer | payload | timestamp)",
    "Interface is storage-agnostic — swap SQLite for RDS or a chain later",
], size=16)

# 10 State
s = blank()
kicker_title(s, "09  ·  STATE MACHINE", "Packs cannot skip legitimate nodes.")
add_text(s, Inches(0.7), Inches(2.5), Inches(12), Inches(2),
         "CREATED  →  DISTRIBUTED  →  AT_PHARMACY  →  SOLD\n\n"
         "Distributor only receives CREATED · Pharmacist only DISTRIBUTED · SOLD only from AT_PHARMACY",
         size=22, color=MUTED, align=PP_ALIGN.CENTER)

# 11 Verify
s = blank()
kicker_title(s, "10  ·  VERIFICATION", "First failing check wins.")
add_bullets(s, Inches(0.7), Inches(1.7), Inches(12), Inches(5), [
    "Parse / mint fail → COUNTERFEIT",
    "Signature fail → COUNTERFEIT",
    "Chain integrity fail → COUNTERFEIT",
    "After sold / flood / route anomaly → SUSPICIOUS",
    "Else → GENUINE",
], size=18)

# 12 Behaviour
s = blank()
kicker_title(s, "11  ·  CLONE DETECTION", "Even a perfect sticker copy leaves a trail.")
card(s, Inches(0.7), Inches(1.8), Inches(2.9), Inches(3.5), "After sold", "Same serial used twice")
card(s, Inches(3.85), Inches(1.8), Inches(2.9), Inches(3.5), "Route mismatch", "Scan outside declared path")
card(s, Inches(7.0), Inches(1.8), Inches(2.9), Inches(3.5), "Scan flood", "Many copies in the wild")
card(s, Inches(10.15), Inches(1.8), Inches(2.5), Inches(3.5), "Missing handoff", "Skipped mandatory node")

# 13 Roles
s = blank()
kicker_title(s, "12  ·  ROLES", "One system, five workspaces.")
roles = [
    ("Manufacturer", "Request mint · recall · QR grid"),
    ("Admin", "Approve / reject before QRs exist"),
    ("Distributor", "Scan receive · custody transfer"),
    ("Pharmacist", "Stock · verify · sell"),
    ("Consumer", "Public verify · buy · journey"),
    ("Alerts", "Shared anomaly console"),
]
positions = [
    (0.7, 1.6), (4.75, 1.6), (8.8, 1.6),
    (0.7, 4.1), (4.75, 4.1), (8.8, 4.1),
]
for (title, body), (x, y) in zip(roles, positions):
    card(s, Inches(x), Inches(y), Inches(3.8), Inches(2.1), title, body)

# 14 Why AWS
s = blank()
kicker_title(s, "13  ·  WHY AWS", "Local demo proves the idea. AWS makes it durable.")
card(s, Inches(0.7), Inches(1.7), Inches(5.9), Inches(4.5), "Today (lab)", "• Node / Express + SQLite\n• Vite React SPA\n• Keys on local disk\n• Single-machine demo")
card(s, Inches(6.9), Inches(1.7), Inches(5.7), Inches(4.5), "Why move to AWS", "• Managed scale & multi-AZ\n• KMS for signing secrets\n• Global CDN for verify UX\n• Observability + WAF + IAM")

# 15 Architecture
s = blank()
kicker_title(s, "14  ·  TARGET ARCHITECTURE  ·  PLANNED", "MedGuard on AWS.")
add_bullets(s, Inches(0.7), Inches(1.7), Inches(12), Inches(5), [
    "Users / phones → CloudFront → Amplify (SPA)",
    "API Gateway → App Runner / ECS Fargate (API)",
    "RDS PostgreSQL · ElastiCache Redis · S3 assets",
    "KMS signing keys · Cognito roles · WAF",
    "CloudWatch · SNS / SES alerts",
], size=18)
add_text(s, Inches(0.7), Inches(6.3), Inches(12), Inches(0.4), "Interactive architecture diagram: open medguard-aws.html", size=12, color=DIM)

# 16 Services
s = blank()
kicker_title(s, "15  ·  AWS SERVICES", "Mapped to MedGuard workloads.")
svcs = [
    ("CloudFront + Amplify", "SPA delivery, TLS, edge cache"),
    ("API Gateway", "HTTP API, throttle, JWT"),
    ("App Runner / ECS", "Container API, autoscaling"),
    ("RDS PostgreSQL", "Replace SQLite; Multi-AZ"),
    ("ElastiCache Redis", "Flood windows, rate limits"),
    ("S3", "QR exports, assets"),
    ("KMS", "Signing keys, envelope crypto"),
    ("Cognito", "Role-based users"),
    ("WAF", "Protect verify & login"),
    ("CloudWatch + X-Ray", "Logs, metrics, traces"),
    ("SNS / SES", "Recall & SUSPICIOUS alerts"),
    ("IAM + Secrets Manager", "Least privilege"),
]
cols, rows_n = 3, 4
idx = 0
for r in range(rows_n):
    for c in range(cols):
        if idx >= len(svcs):
            break
        title, body = svcs[idx]
        card(s, Inches(0.55 + c * 4.2), Inches(1.45 + r * 1.4), Inches(4.0), Inches(1.25), title, body)
        idx += 1

# 17 Security
s = blank()
kicker_title(s, "16  ·  SECURITY ON AWS", "Trust the chain — protect the keys.")
card(s, Inches(0.7), Inches(1.7), Inches(3.8), Inches(3.2), "KMS", "Private signing material stays in HSM-backed keys; API signs via grants.")
card(s, Inches(4.75), Inches(1.7), Inches(3.8), Inches(3.2), "Cognito + IAM", "Role claims map to manufacturer / admin / distributor / pharmacist.")
card(s, Inches(8.8), Inches(1.7), Inches(3.8), Inches(3.2), "WAF + API GW", "Throttle public verify; block floods that mimic clone attacks.")
add_text(s, Inches(0.7), Inches(5.3), Inches(12), Inches(1.2), "Well-Architected · Security: TLS in transit, encryption at rest (RDS / S3 / KMS), CloudTrail audit, separate prod accounts.", size=14, color=MUTED)

# 18 Data
s = blank()
kicker_title(s, "17  ·  DATA & SCALE", "From one SQLite file to Multi-AZ data plane.")
card(s, Inches(0.7), Inches(1.7), Inches(5.9), Inches(4.5), "RDS PostgreSQL", "• Products, batches, custody blocks\n• Point-in-time recovery\n• Read replica for verify-heavy load")
card(s, Inches(6.9), Inches(1.7), Inches(5.7), Inches(4.5), "ElastiCache + S3", "• Sliding windows for scan-flood rules\n• Session / rate-limit counters\n• S3 for QR PDF/PNG batch exports")

# 19 Ops
s = blank()
kicker_title(s, "18  ·  OPS & ALERTS", "Detect → notify → act.")
add_text(s, Inches(0.7), Inches(2.4), Inches(12), Inches(3),
         "Verify API  →  CloudWatch metrics & anomaly logs\n"
         "→  Alarms on SUSPICIOUS / scan flood\n"
         "→  SNS / SES  →  Ops & manufacturer",
         size=22, color=MUTED, align=PP_ALIGN.CENTER)

# 20 Advancements
s = blank()
kicker_title(s, "19  ·  ADVANCEMENTS", "What we bring to the problem space.")
card(s, Inches(0.7), Inches(1.6), Inches(5.9), Inches(2.2), "Product", "Signature + ledger + behaviour in one verify path. Admin-gated minting. Consumer-grade public check.")
card(s, Inches(6.9), Inches(1.6), Inches(5.7), Inches(2.2), "Engineering", "Storage-agnostic ledger interface. Ready to swap SQLite → RDS and local keys → KMS.")
card(s, Inches(0.7), Inches(4.1), Inches(5.9), Inches(2.2), "Cloud", "Target architecture uses managed AWS primitives for scale, key custody, edge delivery, and alerting.")
card(s, Inches(6.9), Inches(4.1), Inches(5.7), Inches(2.2), "Ops model", "Automatic alerts instead of after-the-fact audits alone.")

# 21 Roadmap
s = blank()
kicker_title(s, "20  ·  ROADMAP", "Today → AWS → future.")
add_text(s, Inches(0.7), Inches(2.3), Inches(12), Inches(3.5),
         "Today · local demo\n"
         "→ Phase 1 · Amplify + App Runner + RDS\n"
         "→ Phase 2 · KMS + Cognito + WAF\n"
         "→ Phase 3 · Redis floods + SNS recalls\n"
         "→ Future · permissioned chain / Bedrock assist\n\n"
         "AWS stages are planned production targets — not current runtime.",
         size=18, color=MUTED)

# 22 Close
s = blank()
add_text(s, Inches(0.7), Inches(2.0), Inches(12), Inches(0.35), "MEDGUARD", size=12, bold=True, color=GREEN)
add_text(s, Inches(0.7), Inches(2.5), Inches(12), Inches(1.5), "Make the fake fail\nbefore it reaches a patient.", size=34, bold=True, color=INK)
add_text(s, Inches(0.7), Inches(4.3), Inches(11), Inches(0.7), "Identity · history · behaviour — verified at the counter, scaled on AWS.", size=16, color=MUTED)
add_text(s, Inches(0.7), Inches(5.5), Inches(12), Inches(1), "Tanay Mitra · 24BCE1287\nRishav Kumar · Aditya Arora", size=14, color=MUTED)

out = "/Users/tanaymitra/Documents/SIH_2026_final/docs/presentation/MedGuard_AWS.pptx"
prs.save(out)
print("Wrote", out)
