# Teardown — stop the AWS meter after the demo

Everything is tagged `project=orvyn`. Run these with the `medguard` profile
(`export AWS_PROFILE=medguard AWS_REGION=ap-southeast-2`).

> Order matters: delete CloudFront first, then the bucket (a non-empty bucket will not delete), then compute, then the rest.

## 1. Stop the expensive one immediately

```bash
# Stop EC2 (keeps disk, ~$0.80/mo) — do this the moment the demo ends
aws ec2 stop-instances --instance-ids i-06e36941391bca86f

# Or terminate it entirely (deletes the 12 GB gp3 volume too)
aws ec2 terminate-instances --instance-ids i-06e36941391bca86f
```

## 2. CloudFront

```bash
# disable, wait for Deployed, then delete
aws cloudfront get-distribution-config --id E2YJH7CFDMIHN1 > /tmp/cf.json
# set "Enabled": false in /tmp/cf.json (keeping the ETag), then:
aws cloudfront update-distribution --id E2YJH7CFDMIHN1 \
  --distribution-config file:///tmp/cf-disabled.json --if-match <ETag>
aws cloudfront delete-distribution --id E2YJH7CFDMIHN1 --if-match <ETag>
```

## 3. S3 (drain, then delete)

```bash
aws s3 rm s3://orvyn-artifacts-367722595624 --recursive
aws s3api delete-bucket --bucket orvyn-artifacts-367722595624 --region ap-southeast-2
```

## 4. Lambda + EventBridge

```bash
aws events remove-targets --rule orvyn-nightly-integrity --ids integrity-lambda
aws events delete-rule --name orvyn-nightly-integrity
aws lambda delete-function --function-name orvyn-ledger-integrity
```

## 5. Observability + alerting

```bash
aws cloudwatch delete-dashboards --dashboard-names ORVYN-Demo
aws cloudwatch delete-alarms --alarm-names ORVYN-CounterfeitDetected
aws sns delete-topic --topic-arn arn:aws:sns:ap-southeast-2:367722595624:orvyn-alerts
```

## 6. Data + secrets

```bash
aws dynamodb delete-table --table-name orvyn-scan-events
aws secretsmanager delete-secret --secret-id orvyn/jwt-secret --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id orvyn/qr-hmac-secret --force-delete-without-recovery
aws kms schedule-key-deletion --key-id alias/orvyn-pack-signer --pending-window-in-days 7
```

## 7. Networking + IAM

```bash
aws ec2 release-address --allocation-id eipalloc-028d163b653412a4a
aws ec2 delete-security-group --group-name orvyn-web
aws ec2 delete-key-pair --key-name orvyn-demo

aws iam remove-role-from-instance-profile --instance-profile-name orvyn-ec2-profile --role-name orvyn-ec2-role
aws iam delete-instance-profile --instance-profile-name orvyn-ec2-profile
aws iam delete-role-policy --role-name orvyn-ec2-role --policy-name orvyn-app-policy
aws iam delete-role --role-name orvyn-ec2-role

aws iam delete-role-policy --role-name orvyn-integrity-lambda-role --policy-name orvyn-integrity-policy
aws iam detach-role-policy --role-name orvyn-integrity-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name orvyn-integrity-lambda-role
```

## Before deleting: keep the evidence

If you want the demo data afterwards, export it first:

```bash
aws s3 sync s3://orvyn-artifacts-367722595624 ./orvyn-s3-backup
aws dynamodb scan --table-name orvyn-scan-events > scan-events.json
scp ubuntu@13.239.160.213:/opt/orvyn/backend/prisma/dev.db ./dev.db
```

`backend/keys/mfr-ed25519.json` lives only on the EC2 box — copy it if you want
previously minted packs to keep verifying after teardown.
