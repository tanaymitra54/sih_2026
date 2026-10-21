"""
ORVYN ledger integrity checker.

Runs nightly via EventBridge (and on demand for the demo). It re-walks the
hash chain snapshot the API writes to S3 after every append, independently of
the application database — so tampering inside SQLite cannot hide.

Chain rule (mirrors backend/src/blockchain/ledger-core.ts):
  canonical = index|prevHash|productPrevHash|productId|action|signer|payload|timestamp
  blockHash = sha256(canonical)
"""
import hashlib
import json
import os

import boto3

s3 = boto3.client("s3")
sns = boto3.client("sns")
cw = boto3.client("cloudwatch")

BUCKET = os.environ["BUCKET"]
TOPIC = os.environ["TOPIC_ARN"]
GENESIS = "0" * 64


def canon(block):
    return "|".join(
        [
            str(block["index"]),
            block["prevHash"],
            block["productPrevHash"],
            block["productId"],
            block["action"],
            block["signer"],
            block["payload"],
            str(block["timestamp"]),
        ]
    )


def lambda_handler(event, context):
    snapshot = json.loads(
        s3.get_object(Bucket=BUCKET, Key="ledger/snapshot.json")["Body"].read()
    )
    blocks = snapshot["blocks"]

    errors = []
    prev = GENESIS
    product_prev = {}

    for block in blocks:
        if block["prevHash"] != prev:
            errors.append(f"block {block['index']}: global link broken")

        expected_product_prev = product_prev.get(block["productId"], GENESIS)
        if block["productPrevHash"] != expected_product_prev:
            errors.append(f"block {block['index']}: product link broken")

        recomputed = hashlib.sha256(canon(block).encode()).hexdigest()
        if recomputed != block["blockHash"]:
            errors.append(f"block {block['index']}: hash mismatch")

        prev = block["blockHash"]
        product_prev[block["productId"]] = block["blockHash"]

    if blocks and blocks[-1]["blockHash"] != snapshot["headHash"]:
        errors.append("head hash mismatch")
    if not blocks and snapshot["headHash"] != GENESIS:
        errors.append("empty chain with non-genesis head")

    ok = not errors

    cw.put_metric_data(
        Namespace="ORVYN",
        MetricData=[
            {"MetricName": "LedgerIntegrity", "Value": 1 if ok else 0, "Unit": "Count"},
            {"MetricName": "LedgerBlocks", "Value": len(blocks), "Unit": "Count"},
        ],
    )

    if not ok:
        sns.publish(
            TopicArn=TOPIC,
            Subject="[ORVYN] Ledger integrity FAILED",
            Message=json.dumps(
                {"errors": errors[:20], "blockCount": len(blocks)}, indent=2
            ),
        )

    result = {
        "ok": ok,
        "blockCount": len(blocks),
        "errors": errors[:10],
        "headHash": snapshot["headHash"],
        "checkedAt": snapshot["generatedAt"],
    }
    print(json.dumps(result))
    return result
