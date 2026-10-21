/**
 * Pulls the app's signing secrets from AWS Secrets Manager at deploy/start time
 * using the EC2 instance role. No secret is ever written to the repo or to
 * user-data — only to a 0600 .env on the box.
 *
 * Usage: node scripts/fetch-secrets.mjs
 */
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";

const REGION = process.env.AWS_REGION ?? "ap-southeast-2";
const client = new SecretsManagerClient({ region: REGION });

const SECRETS = {
  JWT_SECRET: "orvyn/jwt-secret",
  QR_HMAC_SECRET: "orvyn/qr-hmac-secret",
};

const resolved = {};
for (const [envKey, secretId] of Object.entries(SECRETS)) {
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!res.SecretString) throw new Error(`secret ${secretId} has no SecretString`);
  resolved[envKey] = res.SecretString;
}

const base = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const kept = base
  .split("\n")
  .filter((line) => line && !line.startsWith("JWT_SECRET=") && !line.startsWith("QR_HMAC_SECRET="));

writeFileSync(".env", [...kept, ...Object.entries(resolved).map(([k, v]) => `${k}="${v}"`)].join("\n") + "\n");
chmodSync(".env", 0o600);

console.log(`[secrets] wrote ${Object.keys(resolved).length} secrets from ${REGION} into .env`);
