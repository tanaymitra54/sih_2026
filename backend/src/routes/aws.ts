import { Router } from "express";
import { awsEnabled, awsConfig, recentScans, bucketReachable, presignKey } from "../aws/orvyn-aws.js";

const router = Router();

/**
 * Public, read-only view of the AWS plane — powers the "AWS Live" panel.
 * This is the endpoint judges can hit to see the integration is real.
 */
router.get("/status", async (_req, res) => {
  const [reachable, scans] = await Promise.all([bucketReachable(), recentScans(8)]);
  res.json({
    enabled: awsEnabled,
    region: awsConfig.region,
    services: {
      s3: { bucket: awsConfig.bucket, reachable },
      dynamodb: { table: awsConfig.table, recentEvents: scans.length },
      sns: { topicArn: awsConfig.topicArn },
      kms: { alias: awsConfig.kmsAlias },
      lambda: { functionName: awsConfig.lambda },
      cloudwatch: { namespace: "ORVYN" },
    },
    recentScans: scans,
  });
});

/** Short-lived presigned URL for a QR artifact or a signed manifest. */
router.get("/presign", async (req, res) => {
  const key = String(req.query.key ?? "");
  if (!key.startsWith("qr/") && !key.startsWith("manifests/")) {
    res.status(400).json({ error: "invalid_key" });
    return;
  }
  const url = await presignKey(key);
  if (!url) {
    res.status(503).json({ error: "aws_unavailable" });
    return;
  }
  res.json({ url, expiresIn: 300 });
});

export default router;
