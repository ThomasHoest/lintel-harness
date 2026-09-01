# Backend deploy — Azure Static Web Apps + Neon Postgres

A provisioning kit for a Next.js (or any Node) backend deployed to Azure
Static Web Apps, with a Neon serverless Postgres database on the data
side. Two named environments (production + staging) backed by two Neon
branches.

Adopted from the Voxio telemetry backend. The shape is generic; only
the resource names need editing for a new project.

## What this scaffold provisions

- **Azure resource group** `rg-{{project}}-{{service}}`
- **Azure Static Web App** `swa-{{project}}-{{service}}` (Standard tier)
- **Neon project** `{{project}}-{{service}}` with `main` and `staging`
  branches in `aws-eu-central-1`
- **GitHub secrets** wired up after deploy:
  `AZURE_STATIC_WEB_APPS_API_TOKEN`, `DATABASE_URL`, `STAGING_DATABASE_URL`,
  optionally `TELEMETRY_API_KEY` / `TELEMETRY_API_KEY_PREVIOUS` for
  key-rotation flows

Everything is idempotent. Re-running the scripts is safe and just
updates whatever drifted.

---

## Files

| File | Purpose |
|---|---|
| `main.bicep` | Bicep template — the SWA + appsettings resource graph |
| `production.bicepparam` | Bicep param file that reads secrets from env vars |
| `deploy.sh` | Bash provisioning script (macOS / Linux) — executable |
| `deploy.ps1` | PowerShell provisioning script (Windows) — executable |
| `setup-neon.sh` | Bash script that creates the Neon project + branches via REST — executable |
| `setup-neon.ps1` | PowerShell version using the `neonctl` CLI — executable |

---

## One-time setup

You need:

- **Azure CLI**, logged in: `az login` (with Contributor on the target subscription)
- **`jq`** (for the bash deploy script's output parsing)
- **`curl`** (used by `setup-neon.sh`)
- **`neonctl`** (used by `setup-neon.ps1`) — `npm install -g neonctl`
- A **Neon API key** — generate at neon.tech → Account → API Keys
- Your **Neon org ID** — neon.tech → Settings → General
- A **GitHub repo** for the backend, with secrets-write access

---

## Provisioning order

1. **Replace the placeholders.** The `{{...}}` tokens in these files are
   meant to be edited. Most common ones:
   - `{{PROJECT_NAME}}` — short slug (e.g. `voxio`)
   - `{{SERVICE_NAME}}` — short slug (e.g. `telemetry`)
   - `{{AZURE_REGION}}` — default `westeurope`
   - `{{NEON_REGION}}` — default `aws-eu-central-1`
2. **Provision Neon** to get the connection strings:
   ```
   NEON_API_KEY=<key> NEON_ORG_ID=<org-id> ./setup-neon.sh
   ```
   The script prints `DATABASE_URL` and `STAGING_DATABASE_URL`. Set
   them as GitHub Actions secrets and as local env vars for the next
   step.
3. **Provision the Azure SWA**:
   ```
   DATABASE_URL=<...> TELEMETRY_API_KEY=<...> ./deploy.sh
   ```
   The script prints the SWA hostname and the
   `AZURE_STATIC_WEB_APPS_API_TOKEN`. Set the token as a GitHub Actions
   secret.
4. **Run database migrations** on both branches:
   ```
   DATABASE_URL=<prod-url> pnpm migrate:up
   DATABASE_URL=<staging-url> pnpm migrate:up
   ```
5. **Push to `main`** to trigger the first CI deploy.

**This scaffold ships no CI pipeline, deliberately.** A pack may not write
a pipeline file into your repository — that is a reserved destination,
because a pipeline runs pack-authored code on your next push. Write your
own workflow, in your CI provider's own directory, and have it deploy the
built app to the SWA using `AZURE_STATIC_WEB_APPS_API_TOKEN`.

---

## Staging environment

Azure SWA's **named environments** are created automatically by the
CI/CD workflow when you deploy from a non-default branch (typically
`develop`). The Bicep template provisions only the production
environment; staging gets its own row in the SWA the first time the
workflow runs against `develop`.

To point the staging named environment at the Neon staging branch:

> Azure portal → `swa-{{PROJECT}}-{{SERVICE}}` → Configuration →
> (select the staging environment) → Application settings →
> add `DATABASE_URL = <STAGING_DATABASE_URL>`

This is the one manual step that can't be done in Bicep — named
environments inherit from production by default and must be diverged
through the portal or the SWA REST API.

---

## Personal dev branches on Neon

For local development, each developer can create their own Neon branch
off `main`:

```bash
BRANCH_NAME=dev/<your-username>
curl -sf -X POST \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"branch\":{\"name\":\"$BRANCH_NAME\",\"parent_id\":\"<MAIN_BRANCH_ID>\"},\"endpoints\":[{\"type\":\"read_write\"}]}" \
  https://console.neon.tech/api/v2/projects/<PROJECT_ID>/branches \
  | jq -r '.connection_uris[0].connection_uri'
```

(`setup-neon.sh` prints the exact command with your project's IDs
filled in.) The PowerShell equivalent uses `neonctl branches create`.

---

## Swapping cloud or database

The structure of the kit is independent of Azure + Neon. To adapt:

- **AWS** — the `backend-aws` scaffold in this pack is the Lambda + CDK
  alternative; the two are alternatives, not peers, because both land
  here. **GCP** — replace `main.bicep` with a Terraform / Pulumi template
  that produces equivalent resources (an HTTPS-fronted Node runtime + a
  secrets-friendly app-settings layer). The deploy script shape
  (provision → print secrets → instruct CI secret setup) stays the
  same.
- **Different Postgres provider** (Supabase, PlanetScale PG, RDS) —
  replace `setup-neon.sh` with the provider's branch-or-project
  bootstrap. The contract you preserve is: hand back
  `DATABASE_URL` and `STAGING_DATABASE_URL`.

Keep the README's runbook order — provision database → provision app
→ wire secrets → migrate → first deploy — even if the components
change. That order is the bit that's actually reusable.
