# Microsoft 365 Agents Toolkit CLI Reference

## Overview

The Microsoft 365 Agents Toolkit CLI (`m365agents`, formerly `teamsapp`) is the command-line companion to the VS Code M365 Agents Toolkit extension. It provides commands for scaffolding new projects, local debugging, provisioning Azure/M365 resources, deploying apps, and publishing to the Teams App Store. Config lives in `m365agents.yml` (lifecycle actions, environments).

**Note**: The `@microsoft/teamsapp-cli` package is deprecated. Use `@microsoft/m365agentstoolkit-cli`.

---

## Installation

```bash
# Install globally via npm
npm install -g @microsoft/m365agentstoolkit-cli

# Verify installation
m365agents --version

# Login to M365 (opens browser for consent)
m365agents auth login m365

# Login to Azure
m365agents auth login azure

# Check login status
m365agents auth list
```

---

## Project Scaffolding

### `m365agents new`

```bash
# Interactive project creation
m365agents new

# Non-interactive: create a TypeScript bot project (Teams SDK v2)
m365agents new \
  --interactive false \
  --capabilities bot \
  --programming-language typescript \
  --app-name MyTeamsBot \
  --folder ./projects

# Create a tab app
m365agents new \
  --interactive false \
  --capabilities tab \
  --programming-language typescript \
  --app-name MyTab \
  --folder ./projects

# Create a message extension
m365agents new \
  --interactive false \
  --capabilities message-extension \
  --programming-language typescript \
  --app-name MyExtension \
  --folder ./projects

# Create a Custom Engine Agent (M365 Agents SDK)
m365agents new \
  --interactive false \
  --capabilities custom-engine-agent \
  --programming-language typescript \
  --app-name MyAgent \
  --folder ./projects
```

**Template categories**:

| Category | SDK Path | Description |
|----------|----------|-------------|
| **Teams Agents and Apps** | Teams SDK v2 | Tabs, bots, message extensions, meeting apps |
| **Custom Engine Agent** | M365 Agents SDK | Multi-channel agents |
| **Declarative Agent** | Copilot stack | Declarative manifest for Copilot |

**Available capability values**:

| Capability | Description |
|------------|-------------|
| `tab` | Static or configurable tab |
| `sso-tab` | Tab with SSO pre-configured |
| `bot` | Teams bot (Teams SDK v2) |
| `message-extension` | Search or action message extension |
| `custom-engine-agent` | Multi-channel agent (M365 Agents SDK) |
| `notification` | Notification-only bot |
| `command-bot` | Bot with command pattern |
| `workflow-bot` | Bot with Adaptive Card workflow |
| `dashboard-tab` | Dashboard tab with widgets |
| `ai-bot` | Bot with Azure OpenAI integration |

---

## Local Development

### `m365agents preview`

```bash
# Start local debug session (launches Teams in browser)
m365agents preview --local

# Preview with a specific environment
m365agents preview --env local

# Preview a remote environment (already deployed)
m365agents preview --env dev

# Open in specific browser
m365agents preview --local --browser chrome
```

### Agents Playground

Debug bots locally without a dev tenant, tunneling, or app/bot registration. Built into the Agents Toolkit.

### Local dev prerequisites

1. A running local server (e.g., on port 3978)
2. The Agents Playground OR a public tunnel (Dev Tunnels, ngrok)
3. `m365agents.local.yml` configured with local environment settings

---

## Config File: m365agents.yml

```yaml
# m365agents.yml (replaces teamsapp.yml)
version: 1.0.0

provision:
  - uses: botFramework/create
    with:
      botId: ${{BOT_ID}}
      name: MyBot
      messagingEndpoint: ${{BOT_ENDPOINT}}/api/messages
      channels:
        - name: msteams

deploy:
  - uses: file/createOrUpdateEnvironmentFile
    with:
      target: .env
      envs:
        MicrosoftAppId: ${{BOT_ID}}
        MicrosoftAppPassword: ${{SECRET_BOT_PASSWORD}}
        MicrosoftAppType: SingleTenant
        MicrosoftAppTenantId: ${{APP_TENANTID}}
```

---

## Provisioning

### `m365agents provision`

```bash
# Provision to dev environment
m365agents provision --env dev

# Provision to production
m365agents provision --env production

# Dry run
m365agents provision --env dev --dry-run

# Skip confirmation (for CI/CD)
m365agents provision --env dev --no-interactive
```

---

## Deployment

### `m365agents deploy`

```bash
# Deploy to dev
m365agents deploy --env dev

# Deploy specific components
m365agents deploy --env dev --component bot
m365agents deploy --env dev --component tab

# No confirmation
m365agents deploy --env dev --no-interactive
```

---

## Publishing

### `m365agents publish`

```bash
# Publish to org's Teams App Catalog
m365agents publish --env dev

# Package the app zip (without publishing)
m365agents package --env dev
# Output: ./appPackage/build/appPackage.dev.zip
```

After `m365agents publish`, an admin must approve the app in the Teams Admin Center.

---

## Validation

```bash
# Validate the app manifest
m365agents validate --manifest-path ./appPackage/manifest.json

# Validate a packaged zip
m365agents validate --app-package-file ./appPackage/build/appPackage.dev.zip
```

---

## Environment Management

```bash
# Create a new environment
m365agents env add staging

# List environments
m365agents env list
```

### Environment file structure

```bash
# .env.dev — commit to source control (no secrets)
TEAMS_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BOT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
APP_TENANTID=zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz
TAB_DOMAIN=myapp.azurewebsites.net

# .env.dev.user — local overrides; NEVER commit (in .gitignore)
SECRET_BOT_PASSWORD=<actual-secret>
SECRET_AAD_APP_CLIENT_SECRET=<actual-secret>
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy Teams App

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm install -g @microsoft/m365agentstoolkit-cli
      - run: npm ci
      - name: Login to M365
        run: |
          m365agents auth login m365 \
            --service-principal \
            --tenant-id ${{ secrets.M365_TENANT_ID }} \
            --client-id ${{ secrets.M365_CLIENT_ID }} \
            --client-secret ${{ secrets.M365_CLIENT_SECRET }}
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: m365agents provision --env production --no-interactive
        env:
          SECRET_BOT_PASSWORD: ${{ secrets.BOT_PASSWORD }}
      - run: m365agents deploy --env production --no-interactive
      - run: m365agents publish --env production --no-interactive
```

### Azure Pipelines

```yaml
trigger:
  branches:
    include: [main]

pool:
  vmImage: ubuntu-latest

variables:
  - group: teams-app-secrets

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '22.x'
  - script: npm install -g @microsoft/m365agentstoolkit-cli
    displayName: Install M365 Agents Toolkit CLI
  - script: npm ci
    displayName: Install dependencies
  - script: |
      m365agents auth login m365 \
        --service-principal \
        --tenant-id $(M365_TENANT_ID) \
        --client-id $(M365_CLIENT_ID) \
        --client-secret $(M365_CLIENT_SECRET)
    displayName: Login to M365
  - task: AzureCLI@2
    displayName: Provision and Deploy
    inputs:
      azureSubscription: 'Teams App Service Connection'
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: |
        m365agents provision --env production --no-interactive
        m365agents deploy --env production --no-interactive
    env:
      SECRET_BOT_PASSWORD: $(BOT_PASSWORD)
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `ERR_M365_NOT_SIGNED_IN` | Not authenticated to M365 | Run `m365agents auth login m365` |
| `ERR_AZURE_NOT_SIGNED_IN` | Not authenticated to Azure | Run `m365agents auth login azure` |
| `ERR_PROVISION_FAILED` | Bicep deployment failed | Check Azure resource quotas and templates |
| `ERR_DEPLOY_FAILED` | App deployment failed | Check App Service logs |
| Manifest validation error | Schema violation | Run `m365agents validate --manifest-path` |
| `ERR_BOT_NOT_REGISTERED` | Bot ID not found | Re-run `m365agents provision` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Environments per project | No hard limit | Practical: dev, staging, production |
| App package size (zip) | 1 MB | Manifest + icons only |
| Manifest `validDomains` | 16 entries | Wildcards supported |
| Teams App Store review | 5–7 business days | Resubmission resets queue |
| Bot Service free tier | F0 (1,000 messages/month) | Use S1 for production |
