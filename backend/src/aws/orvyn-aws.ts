/**
 * ORVYN ⇄ AWS integration layer.
 *
 * Design rule: every export here is best-effort. AWS latency or an outage must
 * never fail a verification or a mint — the SQLite ledger stays the source of
 * truth, AWS is the durable audit/mirror/observability plane.
 *
 * Enabled only when ORVYN_AWS_ENABLED=1, so local dev without credentials
 * silently no-ops instead of logging 50 credential errors.
 */
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { KMSClient, SignCommand, GetPublicKeyCommand } from "@aws-sdk/client-kms";
import QRCode from "qrcode";
import { createHash, randomUUID } from "node:crypto";
import { db } from "../config.js";
import type { Block } from "../blockchain/ledger-core.js";

const REGION = process.env.AWS_REGION ?? "ap-southeast-2";
export const ORVYN_BUCKET = process.env.ORVYN_BUCKET ?? "";
export const ORVYN_TABLE = process.env.ORVYN_TABLE ?? "orvyn-scan-events";
export const ORVYN_TOPIC_ARN = process.env.ORVYN_TOPIC_ARN ?? "";
export const ORVYN_KMS_ALIAS = process.env.ORVYN_KMS_ALIAS ?? "alias/orvyn-pack-signer";
export const ORVYN_LAMBDA = process.env.ORVYN_LAMBDA ?? "orvyn-ledger-integrity";

export const awsEnabled = process.env.ORVYN_AWS_ENABLED === "1" && Boolean(ORVYN_BUCKET);

let _s3: S3Client | undefined;
let _ddb: DynamoDBDocumentClient | undefined;
let _sns: SNSClient | undefined;
let _cw: CloudWatchClient | undefined;
let _kms: KMSClient | undefined;

const s3 = () => (_s3 ??= new S3Client({ region: REGION }));
const ddb = () =>
  (_ddb ??= DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
    marshallOptions: { removeUndefinedValues: true },
  }));
const sns = () => (_sns ??= new SNSClient({ region: REGION }));
const cw = () => (_cw ??= new CloudWatchClient({ region: REGION }));
const kms = () => (_kms ??= new KMSClient({ region: REGION }));

function warn(scope: string, err: unknown) {
  console.warn(`[aws:${scope}]`, err instanceof Error ? err.message : err);
}

export interface ScanAudit {
  serial: string;
  verdict: "GENUINE" | "SUSPICIOUS" | "COUNTERFEIT";
  flags: string[];
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  latencyMs: number;
}

/**
 * Mirrors one verification into DynamoDB (the durable, queryable scan log)
 * and emits CloudWatch metrics for the dashboard + counterfeit alarm.
 */
export async function recordScan(e: ScanAudit): Promise<void> {
  if (!awsEnabled) return;
  const scanId = randomUUID();
  const ts = new Date().toISOString();

  const put = ddb()
    .send(
      new PutCommand({
        TableName: ORVYN_TABLE,
        Item: {
          scanId,
          serial: e.serial,
          verdict: e.verdict,
          flags: e.flags,
          location: e.location ?? null,
          lat: e.lat ?? null,
          lng: e.lng ?? null,
          ts,
          region: REGION,
          source: "orvyn-api",
        },
      }),
    )
    .catch((err) => warn("dynamodb", err));

  const metrics = cw()
    .send(
      new PutMetricDataCommand({
        Namespace: "ORVYN",
        MetricData: [
          { MetricName: "Scans", Value: 1, Unit: "Count" },
          { MetricName: "CounterfeitScans", Value: e.verdict === "COUNTERFEIT" ? 1 : 0, Unit: "Count" },
          { MetricName: "SuspiciousScans", Value: e.verdict === "SUSPICIOUS" ? 1 : 0, Unit: "Count" },
          { MetricName: "VerifyLatencyMs", Value: e.latencyMs, Unit: "Milliseconds" },
        ],
      }),
    )
    .catch((err) => warn("cloudwatch", err));

  await Promise.allSettled([put, metrics]);
}

/** Publishes a counterfeit/suspicious alert to SNS (email subscribers). */
export async function publishAlert(a: {
  type: string;
  message: string;
  location?: string | null;
  productId?: string | null;
}): Promise<void> {
  if (!awsEnabled || !ORVYN_TOPIC_ARN) return;
  const critical = ["unminted_serial", "bad_signature", "unparseable_qr", "batch_recalled"].includes(a.type);
  try {
    await sns().send(
      new PublishCommand({
        TopicArn: ORVYN_TOPIC_ARN,
        Subject: `[ORVYN ${critical ? "CRITICAL" : "ALERT"}] ${a.type}`.slice(0, 100),
        Message: JSON.stringify(
          {
            type: a.type,
            severity: critical ? "CRITICAL" : "SUSPICIOUS",
            message: a.message,
            location: a.location ?? "unknown",
            productId: a.productId ?? null,
            time: new Date().toISOString(),
            system: "ORVYN",
          },
          null,
          2,
        ),
        MessageAttributes: {
          severity: { DataType: "String", StringValue: critical ? "CRITICAL" : "SUSPICIOUS" },
        },
      }),
    );
  } catch (err) {
    warn("sns", err);
  }
}

/** Renders the QR payload to a PNG and stores it in S3 under qr/<batch>/<serial>.png. */
export async function uploadQrArtifact(p: { serial: string; batchCode: string; qr: string }): Promise<void> {
  if (!awsEnabled) return;
  try {
    const png = await QRCode.toBuffer(p.qr, { width: 512, margin: 1, errorCorrectionLevel: "M" });
    await s3().send(
      new PutObjectCommand({
        Bucket: ORVYN_BUCKET,
        Key: `qr/${p.batchCode}/${p.serial}.png`,
        Body: png,
        ContentType: "image/png",
        ServerSideEncryption: "AES256",
        Metadata: { serial: p.serial, batch: p.batchCode, system: "orvyn" },
      }),
    );
  } catch (err) {
    warn("s3-qr", err);
  }
}

/** Short-lived presigned GET, so the browser can pull a QR straight from S3. */
export async function presignKey(key: string, expiresIn = 300): Promise<string | null> {
  if (!awsEnabled) return null;
  try {
    return await getSignedUrl(s3(), new GetObjectCommand({ Bucket: ORVYN_BUCKET, Key: key }), { expiresIn });
  } catch (err) {
    warn("s3-presign", err);
    return null;
  }
}

/**
 * HSM-backed manifest signature. KMS holds an ECC P-256 key that never leaves
 * the service; the app only ever sends a SHA-256 digest.
 */
export async function signBatchManifest(p: { batchCode: string; serials: string[] }): Promise<{
  manifestKey: string;
  signatureKey: string;
  publicKeyKey: string;
  keyId: string;
  digest: string;
} | null> {
  if (!awsEnabled) return null;
  try {
    const manifest = {
      batchCode: p.batchCode,
      packedAt: new Date().toISOString(),
      count: p.serials.length,
      serials: p.serials,
      system: "ORVYN",
    };
    const body = Buffer.from(JSON.stringify(manifest));
    const digestBuf = createHash("sha256").update(body).digest();

    const sig = await kms().send(
      new SignCommand({
        KeyId: ORVYN_KMS_ALIAS,
        Message: digestBuf,
        MessageType: "DIGEST",
        SigningAlgorithm: "ECDSA_SHA_256",
      }),
    );
    const pub = await kms().send(new GetPublicKeyCommand({ KeyId: ORVYN_KMS_ALIAS }));

    const pem = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(pub.PublicKey ?? new Uint8Array())
      .toString("base64")
      .replace(/(.{64})/g, "$1\n")}\n-----END PUBLIC KEY-----\n`;

    const base = `manifests/${p.batchCode}`;
    await Promise.all([
      s3().send(
        new PutObjectCommand({
          Bucket: ORVYN_BUCKET,
          Key: `${base}/manifest.json`,
          Body: body,
          ContentType: "application/json",
          ServerSideEncryption: "AES256",
        }),
      ),
      s3().send(
        new PutObjectCommand({
          Bucket: ORVYN_BUCKET,
          Key: `${base}/manifest.sig`,
          Body: JSON.stringify({
            keyId: ORVYN_KMS_ALIAS,
            algorithm: "ECDSA_SHA_256",
            digestSha256: digestBuf.toString("hex"),
            signatureBase64: Buffer.from(sig.Signature ?? new Uint8Array()).toString("base64"),
            signedAt: new Date().toISOString(),
          }),
          ContentType: "application/json",
          ServerSideEncryption: "AES256",
        }),
      ),
      s3().send(
        new PutObjectCommand({
          Bucket: ORVYN_BUCKET,
          Key: `${base}/public-key.pem`,
          Body: pem,
          ContentType: "application/x-pem-file",
          ServerSideEncryption: "AES256",
        }),
      ),
    ]);

    return {
      manifestKey: `${base}/manifest.json`,
      signatureKey: `${base}/manifest.sig`,
      publicKeyKey: `${base}/public-key.pem`,
      keyId: ORVYN_KMS_ALIAS,
      digest: digestBuf.toString("hex"),
    };
  } catch (err) {
    warn("kms-sign", err);
    return null;
  }
}

/**
 * Writes the full hash chain to S3 as an integrity snapshot the Lambda can
 * re-walk independently. Throttled so a mint of 50 packs doesn't do 50 writes.
 */
let lastSnapshotAt = 0;
export async function snapshotLedger(force = false): Promise<void> {
  if (!awsEnabled) return;
  const now = Date.now();
  if (!force && now - lastSnapshotAt < 3000) return;
  lastSnapshotAt = now;
  try {
    const rows = await db.custodyRecord.findMany({ orderBy: { index: "asc" } });
    const blocks: Block[] = rows.map((r) => ({
      index: r.index,
      blockHash: r.blockHash,
      prevHash: r.prevHash,
      productPrevHash: r.productPrevHash,
      productId: r.productId,
      action: r.action,
      signer: r.signer,
      payload: r.payload,
      timestamp: r.timestamp,
    }));
    const headHash = blocks.length ? blocks[blocks.length - 1].blockHash : "0".repeat(64);
    await s3().send(
      new PutObjectCommand({
        Bucket: ORVYN_BUCKET,
        Key: "ledger/snapshot.json",
        Body: JSON.stringify({
          generatedAt: new Date().toISOString(),
          headHash,
          blockCount: blocks.length,
          blocks,
        }),
        ContentType: "application/json",
        ServerSideEncryption: "AES256",
      }),
    );
  } catch (err) {
    warn("s3-snapshot", err);
  }
}

/** Recent scan events for the judge-facing status panel. */
export async function recentScans(limit = 10): Promise<Record<string, unknown>[]> {
  if (!awsEnabled) return [];
  try {
    const res = await ddb().send(new ScanCommand({ TableName: ORVYN_TABLE, Limit: 50 }));
    return (res.Items ?? [])
      .sort((a, b) => String(b.ts ?? "").localeCompare(String(a.ts ?? "")))
      .slice(0, limit);
  } catch (err) {
    warn("dynamodb-scan", err);
    return [];
  }
}

export async function bucketReachable(): Promise<boolean> {
  if (!awsEnabled) return false;
  try {
    await s3().send(new HeadBucketCommand({ Bucket: ORVYN_BUCKET }));
    return true;
  } catch {
    return false;
  }
}

export const awsConfig = {
  region: REGION,
  bucket: ORVYN_BUCKET,
  table: ORVYN_TABLE,
  topicArn: ORVYN_TOPIC_ARN,
  kmsAlias: ORVYN_KMS_ALIAS,
  lambda: ORVYN_LAMBDA,
};
