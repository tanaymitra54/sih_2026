# AGENTS.md — shared context for all agents in this repo

> Written 2026-10-21 so every agent session (any pane/tool) starts with the same picture.
> If you are an agent reading this: read it fully before proposing infra work.

## Project

**ORVYN / MedGuard** — SIH 2026, PS #59. Counterfeit medicine detection via signed QR
codes + append-only hash-chained custody ledger. Team: Tanay Mitra (24BCE1287),
Rishav Kumar, Aditya Arora.

## Actual stack (not the aspirational one)

- `backend/` — Express 4 + TypeScript, **Prisma + SQLite** (`file:./dev.db`), JWT auth,
  bcrypt, nodemailer (Gmail app password today), Ed25519 pack keys persisted to `backend/keys/`
- `frontend/` — Vite + React + TS
- No Dockerfile, no CI, no IaC. `docker` binary exists but **daemon is not running**.
  `aws` CLI is **not installed**. No `~/.aws`.
- Node v22.17.0 / npm 10.9.2

## The ask from the user

Connect an AWS account for a college project, plus "every other free service" where useful.
User is an **AWS beginner** and will ask both agents questions. Assume no prior knowledge;
explain clicks, not just concepts.

## AWS free-tier reality (verified from aws.amazon.com/free, Oct 2026)

- **Free plan**: $100 credits at signup, up to $100 more via activities = **$200**.
  ~90 select services. **No charges possible.** Account **auto-closes 6 months after opening**
  or when credits run out.
- **Paid plan**: same $200 credits for new customers, full service catalog, pay-as-you-go after.
- **Always free (both plans)**: Lambda 1M req/mo, DynamoDB 25GB, SNS, CloudFront 1TB/mo,
  SQS, Cognito 50k MAU, CodeBuild, CloudWatch basics.
- The old "12 months free" tier is **gone for new accounts**. Do not quote it.
- Cost traps: NAT Gateway, RDS, unattached Elastic IPs, load balancers, EBS snapshots,
  idle EC2.

## Constraint that drives the architecture

SQLite + `backend/keys/` need a **persistent disk**. Serverless (Lambda) is a poor fit
without a migration to Postgres + KMS/Secrets Manager.

The AWS deck (`docs/presentation/`) already frames AWS as a *planned target*:
Amplify, App Runner/ECS, RDS, KMS, Cognito, WAF. That is a **migration story**, not the
current state. Do not describe it as already built.

## Chosen options (pending user confirmation)

- **A** — Build all deploy artifacts now with no AWS account: Dockerfile, compose, Nginx,
  systemd/pm2, deploy script, GitHub Actions, S3/SES integration code, Terraform skeleton.
  Verify locally. *(Recommended starting point.)*
- **B** — User creates account + runs `aws configure`; agent then provisions via CLI.
- **C** — Architecture story only; audit the deck against real code and fix mismatches.

## Ground rules for any agent working here

1. **Do not commit or revert the user's uncommitted work.** Clean tree is NOT assumed:
   modified `backend/src/routes/verify.ts`, `services/notify.ts`, `services/verify.ts`,
   `frontend/src/api.ts`, `LedgerTicker.tsx`, `Consumer.tsx`, `Distributor.tsx`,
   `Manufacturer.tsx`, `Pharmacist.tsx`, `types.ts`, `docs/api-spec.md`;
   untracked `.tmp/`, `backend/src/services/riskEngine.ts`, `backend/prisma/rl-table.json`,
   `reference.mp4`, `docs/presentation/*`.
2. **Never ask for or accept AWS secret keys in chat.** Credentials go through
   `aws configure` on the user's disk. Prefer a scoped IAM user, not root.
3. **No chargeable AWS action without explicit approval.** Default to free-tier-only.
4. Budget alarms ($1 / $5) before any resource creation — non-negotiable.
5. Region: `ap-south-1` (Mumbai) unless there is a reason.

## Free-service shortlist (for the "other free services" part of the ask)

GitHub Student Developer Pack ($200 DigitalOcean, $100 Azure, Namecheap domain),
Vercel/Netlify (frontend), Fly.io/Railway (backend + volume for SQLite), Neon/Supabase
(Postgres), Cloudflare (DNS/R2/Tunnel), Resend/Brevo (email), Sentry, PostHog, UptimeRobot,
Upstash, Google Cloud $300.


<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. Questions about SCPs/RCPs: https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### This project's values

- profile: `medguard`
- project: Future Unicorn
- AWS account ID: 367722595624
- selected Region: `ap-southeast-2` (Asia Pacific / Sydney)
- plan: FREE, $100 credits, expires 2027-04-21
- help_level: LOW

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and CloudWatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. Do not use these for any other reason. When you need an inventory of resources, look in both the selected Region and us-east-1 for CloudWatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1`: Rekognition, Textract, Personalize, App Runner are not available there.
- IAM permissions for human access are managed by AWS. Do not assign roles to team members unless absolutely necessary
- The user may have a spend limit on the paid plan. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves/pays invoices in AWS Settings. Budgets and cost optimization live in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working:
  1. Run `aws freetier get-account-plan-state`
  2. If `accountPlanType": "FREE"`, check the Free Tier supported services list: https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier
  3. If `"PAID"`, check the Paid Tier list: https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan
  4. If neither shows the service, check the Not supported list: https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services
- Before starting a task, check whether a relevant AWS skill is available. Load it with retrieve_skill and prefer its guidance over general knowledge.

### Help level

- help_level (required): LOW, MEDIUM, or HIGH. Saved value: **LOW**.
- The user MAY change this at any time; if they do, update the saved value here.

**LOW:**

- MUST follow all constraints in this context file
- MUST execute the user's request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements
<!-- END AWS Agent Toolkit rules -->
