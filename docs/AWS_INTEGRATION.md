# ORVYN — AWS Integration Report

**Project:** ORVYN / MedGuard — Counterfeit Medicine Detection & Context-Aware Pharmaceutical Trust System (SIH 2026, PS #59)

**AWS project:** Future Unicorn · account `367722595624`
**Selected Region:** `ap-southeast-2` (Asia Pacific — Sydney)
**Plan:** FREE · $100 credits · expires **2027-04-21**
**CLI profile:** `medguard`

---

## 1. What we built

ORVYN keeps its **SQLite hash-chained ledger as the system of record**, and uses AWS as a **second, independent trust and observability plane**. If the application database is tampered with, the AWS-side artifacts and the Lambda integrity check still disagree with it — which is exactly the property a counterfeit-detection system needs.

```
                    ┌──────────────────────────────┐
   Manufacturer ───▶│  EC2 t4g.small (Sydney)      │
   Distributor  ───▶│  Express + Prisma + SQLite   │
   Pharmacist   ───▶│  hash-chained custody ledger │
   Consumer     ───▶└───────────┬──────────────────┘
                                │  (fire-and-forget, never blocks a scan)
        ┌───────────────────────┼───────────────────────────┐
        ▼                       ▼                           ▼
   ┌─────────┐            ┌────────────┐              ┌──────────────┐
   │   S3    │            │  DynamoDB  │              │  CloudWatch  │
   │ QR PNGs │            │ scan events│              │ metrics +    │
   │ manifests│           │ (audit log)│              │ dashboard +  │
   │ ledger  │            └────────────┘              │ alarm        │
   │ snapshot│                   │                     └──────┬───────┘
   └────┬────┘                   │                            │
        │                        │                            ▼
        │                        │                     ┌──────────────┐
        │                        │                     │     SNS      │
        │                        │                     │ alerts topic │
        │                        │                     └──────────────┘
        ▼                        ▼
   ┌─────────┐            ┌────────────┐
   │   KMS   │            │  Lambda    │◀── EventBridge (nightly rule)
   │ ECDSA   │            │ integrity  │
   │ signing │            │ checker    │
   └─────────┘            └────────────┘

   CloudFront (HTTPS, single origin)
   ├── /        → S3 static site (private bucket, OAC)
   └── /api/*   → EC2 Express API
```

---

## 2. AWS services used, and why each one matters here

| # | Service | Role in ORVYN | Innovation it demonstrates | Where in code |
|---|---|---|---|---|
| 1 | **Amazon S3** | Stores every pack's QR PNG, the KMS-signed batch manifest, the public key, and the ledger integrity snapshot. Bucket is private, encrypted (SSE-S3), versioned. | The QR is treated as a **first-class artifact**, not a database string. Versioning means a re-issued or tampered artifact is provable. Access is only ever via short-lived presigned URLs — nothing is public. | `backend/src/aws/orvyn-aws.ts` → `uploadQrArtifact`, `presignKey`, `snapshotLedger` |
| 2 | **Amazon DynamoDB** | Append-only `orvyn-scan-events` table. Every verification writes verdict, flags, coordinates, timestamp — outside SQLite. | An **out-of-band scan ledger**: even if the app DB is edited, the cloud-side scan history remains. Also the raw material for clone/flood detection at scale. | `recordScan()` |
| 3 | **AWS KMS** | Asymmetric ECC P-256 signing key (`alias/orvyn-pack-signer`) signs the SHA-256 digest of each batch manifest. Public key is published to S3. | The manufacturer's signing authority lives in an **HSM**, not in a `.env`. The app never sees the private key — it only submits a digest. Third parties can verify authenticity with the published public key. | `signBatchManifest()` |
| 4 | **AWS Lambda** | `orvyn-ledger-integrity` re-walks the entire hash chain from the S3 snapshot and recomputes every `sha256(index|prevHash|productPrevHash|productId|action|signer|payload|timestamp)`. | The integrity check runs **outside the application and outside its database** — a compromised server cannot fake a passing result. | `infra/lambda/handler.py` |
| 5 | **Amazon EventBridge** | `orvyn-nightly-integrity`, `rate(1 day)` → Lambda. | Turns "tamper-evident" into **continuous assurance**: the chain is audited every night without a human. | rule `orvyn-nightly-integrity` |
| 6 | **Amazon CloudWatch** | Custom namespace `ORVYN`: `Scans`, `CounterfeitScans`, `SuspiciousScans`, `VerifyLatencyMs`, `LedgerIntegrity`, `LedgerBlocks`. Dashboard `ORVYN-Demo` + alarm `ORVYN-CounterfeitDetected` (≥1 counterfeit in 5 min → SNS). | Domain-level observability: **the business event (a counterfeit scan) is the alarm**, not just CPU. | `recordScan()`, `handler.py` |
| 7 | **Amazon SNS** | `orvyn-alerts` topic with an email subscription. Every counterfeit/suspicious alert and every recall is published. | **Sub-second multi-channel fan-out** — the pharmacist/distributor alert path does not depend on SMTP. | `publishAlert()` |
| 8 | **AWS IAM** | `orvyn-ec2-role` (instance profile, no long-lived keys) and `orvyn-integrity-lambda-role`, both least-privilege (S3 scoped to one bucket, DynamoDB scoped to one table, SNS scoped to one topic). | **Zero static credentials on the server.** The EC2 box assumes a role; nothing to leak in git. | IAM policies |
| 9 | **AWS Secrets Manager** | `orvyn/jwt-secret`, `orvyn/qr-hmac-secret`, fetched at deploy time by the instance role into a `0600` `.env`. | Signing secrets are **never in the repo, never in user-data, never in an AMI**. Rotation-ready. | `backend/scripts/fetch-secrets.mjs` |
| 10 | **Amazon CloudFront** | One distribution, HTTPS, two origins: default → S3 site, `/api/*` → EC2. Private S3 via Origin Access Control. | **Single-origin architecture**: no CORS configuration and no mixed-content failures; the SPA and API share one secure domain. | distribution `E2YJH7CFDMIHN1` |
| 11 | **Amazon EC2** | `t4g.small` (Graviton/ARM), Ubuntu 24.04, 12 GB gp3, Elastic IP `13.239.160.213`, pm2-managed Express API behind Nginx on port 80. | Runs the stateful SQLite + key material that serverless cannot hold — an honest architectural choice, not a default. Nginx terminates the CloudFront origin hop and keeps the Node process unprivileged on :4000. | instance `i-06e36941391bca86f` |
| 12 | **Amazon S3 static hosting (OAC)** | Serves the Vite build; bucket blocked from public access. | Private-by-default hosting: CloudFront is the only reader, enforced by bucket policy `AWS:SourceArn`. | bucket policy |

**Deliberately not used:** SES (SNS already covers alert email and avoids sandbox verification), WAF (cost/time vs. demo value), RDS (SQLite is sufficient at demo scale and avoids a migration).

---

## 3. Verification — every feature checked live

Checked on 2026-10-21 against the real account (not mocked).

| Feature | Check performed | Result | Demo-ready |
|---|---|---|---|
| S3 artifacts | `ListObjectsV2` | **16 objects** — 5 QR PNGs, 3 manifest files, 6 site files, ledger snapshot | ✅ |
| S3 encryption + versioning | bucket config | SSE-S3, versioning Enabled, public access blocked | ✅ |
| DynamoDB | `Scan` on `orvyn-scan-events` | **7 items**, verdicts + flags + geo present | ✅ |
| SNS topic | `ListSubscriptionsByTopic` | topic exists, 1 subscription — **`PendingConfirmation`** | ⚠️ **click the email** |
| KMS | `DescribeKey` | `ECC_NIST_P256`, `SIGN_VERIFY`, state **Enabled** | ✅ |
| KMS signing | batch backfill | manifest + `.sig` + `public-key.pem` written to S3 | ✅ |
| Lambda | `Invoke` (RequestResponse) | `{"ok": true, "blockCount": 8, "errors": []}` | ✅ |
| EventBridge | `ListRules` | `orvyn-nightly-integrity`, `rate(1 day)`, **ENABLED** | ✅ |
| CloudWatch alarm | `DescribeAlarms` | `ORVYN-CounterfeitDetected`, metric `CounterfeitScans`, **state ALARM** after a live counterfeit scan (threshold crossed at 10:14, evaluated 10:19) | ✅ |
| CloudWatch dashboard | `ListDashboards` | `ORVYN-Demo` (4 widgets) | ✅ |
| CloudFront | `GetDistribution` | `d1bxeh2lzuam2u.cloudfront.net`, status **Deployed**, `/api/*` → EC2, default → S3 `/site` | ✅ |
| Public site | `GET https://d1bxeh2lzuam2u.cloudfront.net/` | **HTTP 200**, title `ORVYN — Counterfeit Medicine Detection` | ✅ |
| API through CDN | `GET /api/aws/status` via CloudFront | `enabled:true`, `s3.reachable:true`, `dynamodb.recentEvents:7` | ✅ |
| Verify through CDN | `POST /api/verify` via CloudFront | **`{"verdict":"GENUINE","flags":[]}`** | ✅ |
| EC2 | `DescribeInstances` | `i-06e36941391bca86f` `t4g.small` running, EIP `13.239.160.213` | ✅ |
| EC2 app | `GET /health` | `{"ok":true}` | ✅ |
| AWS status API | `GET /api/aws/status` | `enabled: true`, `s3.reachable: true`, region `ap-southeast-2` | ✅ |
| Full verify path | `POST /api/verify` (genuine QR, Delhi) | **`{"verdict":"GENUINE","flags":[]}`** | ✅ |
| Counterfeit path | `POST /api/verify` (fake serial) | **`COUNTERFEIT / not_minted`** + DynamoDB event | ✅ |
| IAM | role policies | `orvyn-ec2-role` → `orvyn-app-policy`; Lambda role scoped | ✅ |
| Secrets Manager | `ListSecrets` | `orvyn/jwt-secret`, `orvyn/qr-hmac-secret` | ✅ |

### Bugs found and fixed during the build
1. **Pack verification failed in production** — `keys/mfr-ed25519.json` resolved relative to the compiled file, so `tsx` (seed) and `dist` (server) used *different* keypairs. Now resolved from `process.cwd()`, with `QR_KEY_FILE` override.
2. **`npm start` pointed at a non-existent file** — `tsc` emits `dist/src/server.js` (because `prisma/` is in `include`). Start script corrected.
3. **Seed process exited before fire-and-forget uploads** — added `npm run aws:backfill -w backend` to backfill S3/KMS artifacts deterministically.

---

## 4. Demo script (5 minutes)

1. **CloudWatch → `ORVYN-Demo`** — "every scan you're about to see is instrumented."
2. Mint a batch in the manufacturer UI → open **S3** → `qr/<batch>/` has one PNG per pack → click one (presigned URL downloads).
3. Scan a genuine pack at the correct location → **GENUINE**, `flags: []`.
4. Open **DynamoDB → orvyn-scan-events** → the scan item is there, with verdict and coordinates.
5. Scan a cloned/unknown pack → **COUNTERFEIT** → **SNS email arrives** → **CloudWatch alarm flips**.
6. **EventBridge → `orvyn-nightly-integrity` → Run now** → **Lambda** returns `ok: true, blockCount: 8`.
7. **KMS** → key is `ECC_NIST_P256 / SIGN_VERIFY` → show `manifests/<batch>/manifest.sig` + `public-key.pem` in S3.
8. **IAM** → the EC2 role can only touch one bucket, one table, one topic.
9. Close on **CloudTrail** — every action above is audited.

Judge-facing URL: **`https://d1bxeh2lzuam2u.cloudfront.net`** (API: `/api/aws/status`).

Verified live: site returns HTTP 200, `/api/aws/status` reports 7 recent DynamoDB events, and a genuine scan through CloudFront returns `GENUINE` with zero flags.

---

## 5. Cost

| Item | Monthly at demo scale |
|---|---|
| EC2 t4g.small + 12 GB gp3 | ~$14.80 |
| KMS key | ~$1.00 |
| Secrets Manager (2) | ~$0.80 |
| CloudWatch | ~$1–3 |
| S3 / DynamoDB / SNS / Lambda / EventBridge / CloudFront | < $1 |
| **Total** | **~$18–20/month** |

Against $100 credits, that is **≈5 months** of continuous running — longer if EC2 is stopped between demos.

---

## 6. Pending / manual steps

1. **Confirm the SNS subscription** (the only blocker) — AWS emailed `tanaymitra9@gmail.com`; click *Confirm subscription*. Until then, alert emails will not deliver (the topic still records publishes, and the CloudWatch alarm still fires).
2. **Teardown after the demo** — see `infra/teardown.md`.
3. **Keep the EC2 key** — `~/.ssh/orvyn-demo` on the admin machine is the only way to SSH in; `backend/keys/mfr-ed25519.json` on the instance is the only copy of the manufacturer signing key.
