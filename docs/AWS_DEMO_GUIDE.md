# Faculty Demo Guide — showing the AWS integration

Two ways to present it. Use **A** for a live demo (8 minutes), hand out **B**.

- **A. Console walkthrough** — open each service, point at the real resource. Everything is prefixed `orvyn-`, so it is easy to find.
- **B. Written evidence** — [`AWS_INTEGRATION.md`](./AWS_INTEGRATION.md) (service table, architecture, verification log).

Account: **Future Unicorn** · `367722595624`
Region: **Asia Pacific (Sydney) `ap-southeast-2`**
Live app: **https://d1bxeh2lzuam2u.cloudfront.net**

> First: sign in at [console.aws.amazon.com](https://console.aws.amazon.com), pick the **Future Unicorn** project, and set the region selector (top-right) to **Asia Pacific (Sydney)**. If a deep link below lands on the wrong region, switch it manually — the resource IDs are exact.

---

## The 8-minute order

Open these in sequence. Each row: what to click, what to point at, what to say.

### 1. CloudFront — the public entry point (30s)

Open: [CloudFront → distribution E2YJH7CFDMIHN1](https://us-east-1.console.aws.amazon.com/cloudfront/v4/home#/distributions/E2YJH7CFDMIHN1)

- **Point at:** status `Deployed`, domain `d1bxeh2lzuam2u.cloudfront.net`, two origins.
- **Say:** "One HTTPS domain. `/` is served from a private S3 bucket, `/api/*` proxies to our EC2 backend. No CORS, no mixed content."
- **Show:** open the live URL in another tab.

### 2. EC2 — where the app runs (40s)

Open: [EC2 → instances](https://ap-southeast-2.console.aws.amazon.com/ec2/home?region=ap-southeast-2#Instances:)

- **Point at:** `orvyn-demo-api`, `t4g.small` (Graviton/ARM), running, Elastic IP `13.239.160.213`.
- **Say:** "The app is stateful — SQLite plus the manufacturer's signing key need a real disk, which is why we chose an instance over Lambda for the core API."
- **Show:** **Security** tab → the instance profile `orvyn-ec2-profile`. "No access keys on the box; it assumes an IAM role."

### 3. S3 — the artifact store (60s)

Open: [S3 → orvyn-artifacts-367722595624](https://ap-southeast-2.console.aws.amazon.com/s3/buckets/orvyn-artifacts-367722595624?region=ap-southeast-2&tab=objects)

- **Point at:** folders `qr/`, `manifests/`, `ledger/`, `site/`.
- **Click:** `qr/B-DEMO-.../` → a `.png` → **Open** (presigned download).
- **Say:** "Every pack gets a QR artifact in S3 — not just a database string. The bucket is private, encrypted, and versioned; the only reader is CloudFront, enforced by a bucket policy tied to the distribution ARN."
- **Show:** **Properties** tab → Versioning **Enabled**, Default encryption **SSE-S3**.

### 4. KMS — the signing authority (60s)

Open: [KMS → alias/orvyn-pack-signer](https://ap-southeast-2.console.aws.amazon.com/kms/home?region=ap-southeast-2#/kms/keys)

- **Point at:** key spec `ECC_NIST_P256`, usage `SIGN_VERIFY`, state `Enabled`.
- **Then in S3:** open `manifests/B-DEMO-.../` → `manifest.sig` and `public-key.pem`.
- **Say:** "The manufacturer's signing key lives in an HSM. Our code only ever sends a SHA-256 digest; it never holds the private key. Anyone can verify with the published public key."

### 5. DynamoDB — the out-of-band scan log (60s)

Open: [DynamoDB → orvyn-scan-events → Explore items](https://ap-southeast-2.console.aws.amazon.com/dynamodbv2/home?region=ap-southeast-2#table?name=orvyn-scan-events)

- **Point at:** items with `serial`, `verdict`, `flags`, `location`, `ts`.
- **Say:** "Every scan is mirrored here, outside SQLite. If someone tampers with the app database, the cloud-side scan history still tells the real story."

### 6. Lambda + EventBridge — the independent auditor (60s)

Open: [Lambda → orvyn-ledger-integrity](https://ap-southeast-2.console.aws.amazon.com/lambda/home?region=ap-southeast-2#/functions/orvyn-ledger-integrity)

- **Show:** **Test** tab → run with `{}` → response `{"ok": true, "blockCount": 8, "errors": []}`.
- **Say:** "It re-walks the entire hash chain from the S3 snapshot and recomputes every block hash. It runs outside our application, so a compromised server cannot fake a pass."
- **Then:** [EventBridge → orvyn-nightly-integrity](https://ap-southeast-2.console.aws.amazon.com/events/home?region=ap-southeast-2#/rule/orvyn-nightly-integrity) — "and it runs automatically every night."

### 7. CloudWatch — observability + the counterfeit alarm (60s)

Open: [CloudWatch → ORVYN-Demo dashboard](https://ap-southeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-southeast-2#dashboards:name=ORVYN-Demo)

- **Point at:** `Scans`, `CounterfeitScans`, `VerifyLatencyMs`, `LedgerIntegrity`, `LedgerBlocks`.
- **Say:** "Our alarm is a business event, not CPU: one counterfeit scan in five minutes."
- **Show:** [Alarms → ORVYN-CounterfeitDetected](https://ap-southeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-southeast-2#alarmsV2:alarm/ORVYN-CounterfeitDetected) — it is currently in **ALARM** from a live test.

### 8. SNS — alert fan-out (30s)

Open: [SNS → orvyn-alerts](https://ap-southeast-2.console.aws.amazon.com/sns/v3/home?region=ap-southeast-2#/topics)

- **Say:** "Counterfeit and recall alerts publish here, independent of our SMTP path."
- **Important:** the subscription must show **Confirmed**, not PendingConfirmation. If it is pending, click the link in the AWS email sent to `tanaymitra9@gmail.com` **before** the demo.

### 9. Secrets Manager + IAM — no secrets in the repo (45s)

- [Secrets Manager](https://ap-southeast-2.console.aws.amazon.com/secretsmanager/listsecrets?region=ap-southeast-2): `orvyn/jwt-secret`, `orvyn/qr-hmac-secret`.
- [IAM → orvyn-ec2-role](https://console.aws.amazon.com/iam/home#/roles/details/orvyn-ec2-role): open `orvyn-app-policy`.
- **Say:** "The server pulls its secrets at boot using its instance role. The policy touches exactly one bucket, one table, one topic — nothing else."

### 10. CloudTrail — the audit trail (20s)

Open: [CloudTrail → Event history](https://ap-southeast-2.console.aws.amazon.com/cloudtrail/home?region=ap-southeast-2#/events)

- **Say:** "Every action I just showed you is recorded here. That is the compliance story."

---

## The live moment that wins marks

Do this **during** the demo, not before:

1. Open the app: **https://d1bxeh2lzuam2u.cloudfront.net** (login password `demo1234`).
2. Scan a **genuine** pack at its declared location → verdict **GENUINE**, `flags: []`.
3. Switch to DynamoDB → refresh → the new scan item appears.
4. Scan a **counterfeit** QR → verdict **COUNTERFEIT**.
5. Switch to CloudWatch → within ~60–90 s the alarm goes **ALARM**.
6. The SNS email lands on your phone (only if the subscription is confirmed).

That sequence proves five services working together, live, in under two minutes.

---

## If the console is slow or the wifi fails

Everything can be proven from a terminal. All commands use the project profile:

```bash
export AWS_PROFILE=medguard AWS_REGION=ap-southeast-2

aws s3 ls s3://orvyn-artifacts-367722595624/qr/ --recursive | head
aws dynamodb scan --table-name orvyn-scan-events --max-items 5
aws kms describe-key --key-id alias/orvyn-pack-signer --query 'KeyMetadata.[KeySpec,KeyUsage,KeyState]'
aws lambda invoke --function-name orvyn-ledger-integrity --payload '{}' /dev/stdout
aws cloudwatch describe-alarms --alarm-names ORVYN-CounterfeitDetected --query 'MetricAlarms[0].[AlarmName,StateValue]'
aws cloudfront get-distribution --id E2YJH7CFDMIHN1 --query 'Distribution.[Status,DomainName]'
curl -s https://d1bxeh2lzuam2u.cloudfront.net/api/aws/status
```

That last one is the best single artifact: it returns the live status of S3, DynamoDB, SNS, KMS, Lambda and CloudWatch in one JSON document.

---

## Handout

Print or attach [`AWS_INTEGRATION.md`](./AWS_INTEGRATION.md). It contains the architecture diagram, the per-service innovation table, the verification log with actual counts and states, and the cost model.
