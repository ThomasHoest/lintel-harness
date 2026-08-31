# Backend deploy — AWS Lambda + CDK

A deliberately small CDK app: **one stack, one Lambda, one Function URL**.
Enough to deploy a reachable, verifiable HTTP endpoint on the first run,
and no more than that.

This scaffold was **authored for this pack**, not extracted from a running
service. Read §*What is deliberately not decided* before you build on it —
the gaps there are honest gaps, not omissions.

---

## What this scaffold provisions

- **One Lambda function** `{{PROJECT_NAME}}-{{SERVICE_NAME}}-<environment>`
  — Node 22, ARM64, 512 MB, 30 s timeout, source maps on, logs retained
  for one month.
- **One Lambda Function URL**, auth type `NONE` — i.e. **public**. It is
  the smallest thing that makes the function reachable. See §*Auth*.
- **One CloudFormation stack** per environment, named
  `{{PROJECT_NAME}}-{{SERVICE_NAME}}-<environment>`, tagged with project,
  service and environment.
- **Two stack outputs** — the function URL and the function name.

It provisions **no database, no domain, no VPC, no CDN, no CI pipeline**.

Everything is idempotent. Re-running `deploy.sh` deploys the diff.

---

## Files

| File | Purpose |
|---|---|
| `app.ts` | CDK app entry — defines `BackendStack` and instantiates it |
| `handler.ts` | The Lambda handler. Implements `GET /health` and nothing else |
| `cdk.json` | CDK app configuration — how `cdk` invokes `app.ts` |
| `deploy.sh` | Preflight checks, then `cdk deploy`, then print the URL — executable |

---

## What you must supply

**This scaffold cannot ship a `package.json`, and that is a hard
constraint rather than an oversight.** `package.json` is a reserved
destination for every pack: it carries `scripts.postinstall`, which is a
code-execution route, so nothing a pack applies may write one. Create it
yourself, in this directory:

```json
{
  "name": "{{PROJECT_NAME}}-{{SERVICE_NAME}}-infra",
  "private": true,
  "devDependencies": {
    "aws-cdk": "^2",
    "aws-cdk-lib": "^2",
    "constructs": "^10",
    "esbuild": "^0.25",
    "ts-node": "^10",
    "typescript": "^5",
    "@types/aws-lambda": "^8",
    "@types/node": "^22"
  },
  "dependencies": {
    "source-map-support": "^0.5"
  }
}
```

Then `npm install`. Pin the versions your project actually resolves —
the ranges above are a starting point, not a lockfile.

You also need:

- **AWS credentials** on the shell — `aws sts get-caller-identity` must
  succeed with permission to create Lambda, IAM, CloudWatch Logs and
  CloudFormation resources.
- **A bootstrapped account/region** — `npx cdk bootstrap` once per pair.
- **`AWS_REGION`** exported, or `CDK_DEFAULT_REGION` set.

`cdk.json` ships with an **empty `context` block**. A `cdk init` app
normally carries a long list of CDK feature flags there, and those flags
change what gets synthesised. An empty block means "this app takes your
CDK version's defaults" — which is correct and stable, but if you later
run `cdk init` elsewhere and compare, expect a difference. Adopt your CDK
version's flag block deliberately rather than by copying one from here.

---

## Provisioning order

1. **Replace the placeholders** — `{{PROJECT_NAME}}` and
   `{{SERVICE_NAME}}` appear in `app.ts`, `handler.ts` and `deploy.sh`.
2. **Create `package.json`** as above and `npm install`.
3. **Bootstrap**, once per account/region: `npx cdk bootstrap`.
4. **Deploy**:
   ```
   AWS_REGION=eu-west-1 DATABASE_URL=<...> ./deploy.sh production
   ```
5. **Verify** — the script prints the function URL; `curl "<url>health"`
   should return `{"status":"ok",…}`.

For a second environment, pass its name: `./deploy.sh staging`. It is a
separate stack with separate resources — no shared state, no promotion
mechanism.

Windows has no `.ps1` here. Run steps 3–4 directly:
`npx cdk bootstrap` then `npx cdk deploy <stack> --context environment=production`.

---

## Auth

**The Function URL is created with `authType: NONE`, which is public.**
That is the right default for a health check and the wrong default for
almost anything else. Before you add a route that reads or writes real
data, pick one:

- **`FunctionUrlAuthType.AWS_IAM`** — callers sign with SigV4. Change the
  one line in `app.ts`. Right for service-to-service.
- **An API key checked in `handler.ts`** — a header compared against a
  value from Secrets Manager. Right for a small number of known clients.
- **An HTTP API Gateway with an authorizer in front**, replacing the
  Function URL entirely. Right for JWT-bearing end users. This is a
  larger change: the event shape stays the same, but the construct,
  the outputs and the deploy script's URL extraction all move.

The scaffold does not choose for you because the right answer depends on
who calls the service, and nothing in this pack knows that.

---

## What is deliberately not decided

Each of these is a real decision this scaffold does **not** make. Listed
so an absence reads as a choice rather than as a bug:

| Not decided | Where it attaches | Why not decided here |
|---|---|---|
| **Auth** | `app.ts`, the `addFunctionUrl` call | Depends on the caller. See §*Auth* — the public default is documented, not hidden |
| **Database** | `DATABASE_URL` is threaded through to the handler and nothing more | The Azure scaffold pairs with Neon; nothing establishes that AWS deployments in this pack should. RDS, Aurora Serverless, Neon and DynamoDB are all defensible and cost wildly different amounts |
| **VPC placement** | `NodejsFunction` props | A Lambda in a VPC needs subnets, a NAT or VPC endpoints, and a security group — none of which exist until someone decides the network topology. Outside a VPC is the cheaper, simpler default and is stated as such |
| **Custom domain + TLS** | A `HttpApi` + ACM certificate, replacing the Function URL | Needs a hosted zone this pack cannot assume |
| **CI/CD pipeline** | Your CI provider's own directory | **A pack may not write a pipeline file** — it is a reserved destination, because a pipeline runs pack-authored code on your next push. Write your own and have it run `cdk deploy` |
| **Environment promotion** | Between the per-environment stacks | `./deploy.sh staging` and `./deploy.sh production` are independent stacks. There is no artefact promotion, no approval gate and no drift check between them |
| **Observability beyond logs** | `app.ts` | CloudWatch Logs with one-month retention is what you get. No alarms, no dashboard, no tracing — X-Ray is one prop away, and which spans matter is a per-project question |
| **Concurrency and cost controls** | `NodejsFunction` props | No reserved or provisioned concurrency is set, so a traffic spike scales to the account limit. Set `reservedConcurrentExecutions` once you know the shape of your load |

---

## Relationship to `backend-azure`

The two backend scaffolds are **alternatives, not peers**. Both land at
`infrastructure/backend-deploy/`, so selecting both is a conflict rather
than a merge. Pick the one matching your cloud.

The reusable part across both is the runbook order — provision the data
store → provision the app → wire secrets → migrate → first deploy — and
the contract that a deploy script's job is to provision, then print the
values a human or a pipeline needs next.
