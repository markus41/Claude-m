---
name: ado-setup
description: Set up the Azure DevOps plugin — configure PAT, OAuth, GCM, SSH, or WIF and verify organization and project access
argument-hint: "[--minimal] [--org <organization>] [--project <project>] [--auth pat|oauth|gcm|ssh|wif]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Azure DevOps Setup

Guide the user through setting up Azure DevOps REST API access and Git authentication.

## Prerequisites

- Node.js 18+ installed
- Azure DevOps organization exists with at least one project
- `az` CLI installed (optional but recommended)

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--org` | No | Azure DevOps organization name |
| `--project` | No | Default project name |
| `--auth` | No | Auth method: `pat`, `oauth`, `gcm`, `ssh`, `wif` (default: `pat`) |
| `--minimal` | No | Stop after dependency installation |

## Instructions

### Step 1 — Check prerequisites

Verify Node.js 18+ is installed with `node --version`. Check if `az` CLI is available with `az version`.

### Step 2 — Install dependencies

```bash
npm init -y && npm install @azure/identity node-fetch
```

### Step 3 — Configure authentication

Ask the user which auth method they prefer (`--auth` flag or interactive prompt):

**Option A — Personal Access Token (PAT)**
1. Guide them to Azure DevOps > User Settings > Personal Access Tokens.
2. Recommend scopes: `Code (Read & Write)`, `Build (Read & Execute)`, `Work Items (Read & Write)`, `Project and Team (Read)`.
3. Set expiry to maximum 1 year; remind to rotate before expiry.

**Option B — Azure AD OAuth (service principal)**
1. Register an app in Entra ID with scope `499b84ac-1321-427f-aa17-267ca6975798/.default`.
2. Collect Tenant ID, Client ID, Client Secret.
3. Grant the service principal access to the ADO organization via Organization Settings > Users.

**Option C — Git Credential Manager (GCM)**
1. Install GCM: `winget install Git.Git` (bundled) or `brew install --cask git-credential-manager` on macOS.
2. Configure: `git config --global credential.helper manager`.
3. First `git clone` will trigger browser-based OAuth login.

**Option D — SSH keys**
1. Generate key: `ssh-keygen -t ed25519 -C "ado" -f ~/.ssh/ado_ed25519`.
2. Add public key: Azure DevOps > User Settings > SSH Public Keys.
3. Configure `~/.ssh/config` with `Host ssh.dev.azure.com` entry.
4. Test: `ssh -T git@ssh.dev.azure.com`.

**Option E — Workload Identity Federation (WIF)**
1. Create a managed identity or app registration in Entra ID.
2. Add a federated credential with the OIDC issuer (e.g., GitHub Actions, Azure Pipelines).
3. Grant the identity access to the ADO organization.
4. Use `@azure/identity` `DefaultAzureCredential` in code.

### Step 4 — Azure CLI setup (recommended)

```bash
az login
az extension add --name azure-devops
az devops configure --defaults organization=https://dev.azure.com/{org} project={project}
```

### Step 5 — Configure environment

Create `.env`:
```
ADO_ORGANIZATION=<org-name>
ADO_PROJECT=<project-name>
ADO_PAT=<personal-access-token>
# OR for OAuth / WIF:
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

### Step 6 — Verify access

Call `GET https://dev.azure.com/{org}/_apis/projects?api-version=7.1` to list projects. Display results in a summary table with project name, ID, and state.

Also run `az devops project list --org https://dev.azure.com/{org}` if CLI is configured.

If `--minimal` is passed, stop after Step 2.

## Error Handling

- **401 Unauthorized**: PAT expired or insufficient scopes — regenerate token with required scopes.
- **403 Forbidden**: Service principal not added to ADO organization — add via Organization Settings > Users.
- **SSH `Permission denied`**: Public key not registered or wrong key file — verify with `ssh -vT git@ssh.dev.azure.com`.
- **GCM credential prompt loop**: Clear cached credentials with `git credential reject` and re-authenticate.
- **`az devops` extension missing**: Install with `az extension add --name azure-devops`.
