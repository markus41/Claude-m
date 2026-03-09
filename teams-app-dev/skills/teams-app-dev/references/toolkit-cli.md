# M365 Agents Toolkit CLI Reference

## Overview

M365 Agents Toolkit CLI (`m365agents`) is the official command-line tool for Microsoft Teams and Microsoft 365 app development. It replaces the legacy Teams Toolkit CLI (`teamsapp`). It provides commands for scaffolding new projects, local debugging with Agents Playground, provisioning Azure/M365 resources, deploying apps, and publishing to the Teams App Store.

> **Migration note**: The package changed from `@microsoft/teamsapp-cli` to `@microsoft/m365agentstoolkit-cli`. The config file changed from `teamsapp.yml` to `m365agents.yml`. The previous `teamsapp` command is replaced by `m365agents`. TeamsFx SDK is in deprecation mode (community-only GitHub support until September 2026) — new projects must not use TeamsFx.

---

## Installation

```bash
# Install globally via npm
npm install -g @microsoft/m365agentstoolkit-cli

# Verify installation
m365agents --version

# Remove legacy CLI if installed
npm uninstall -g @microsoft/teamsapp-cli

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

# Non-interactive: create a TypeScript bot project
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

# Create a Custom Engine Agent
m365agents new \
  --interactive false \
  --capabilities custom-engine-agent \
  --programming-language typescript \
  --app-name MyAgent \
  --folder ./projects

# Create an API-based message extension (no bot registration needed)
m365agents new \
  --interactive false \
  --capabilities api-message-extension \
  --programming-language typescript \
  --app-name MyApiExtension \
  --folder ./projects
```

**Available capability values:**
| Capability | Description |
|------------|-------------|
| `tab` | Static or configurable tab |
| `bot` | Teams bot (single-tenant) |
| `message-extension` | Bot-based search or action message extension |
| `api-message-extension` | API-based message extension (OpenAPI, no bot needed) |
| `notification` | Notification-only bot (webhook triggered) |
| `command-bot` | Bot with command pattern |
| `workflow-bot` | Bot with adaptive card workflow |
| `dashboard-tab` | Dashboard tab with widgets |
| `sso-tab` | Tab with SSO + NAA pre-configured |
| `custom-engine-agent` | Custom Engine Agent with AI capabilities |
| `declarative-agent` | Declarative agent (Agent 365) |

---

## Local Development

### `m365agents preview`

```bash
# Start local debug session with Agents Playground (no registration needed)
m365agents preview --local

# Preview with a specific environment
m365agents preview --env local

# Preview a remote environment (already deployed)
m365agents preview --env dev

# Open in specific browser
m365agents preview --local --browser chrome
```

### Agents Playground

Agents Playground replaces the need for Dev Tunnels and ngrok during local development:
- Opens at `http://localhost:56150` by default
- Simulates Teams client environment without Azure Bot registration
- Supports Adaptive Card rendering, invoke activities, and meeting context simulation
- No bot registration or tunnel setup required

### Local dev prerequisites

M365 Agents Toolkit local debug expects:
1. A running local server (e.g., `node index.js` on port 3978)
2. `m365agents.local.yml` configured with local environment settings

```yaml
# m365agents.local.yml
version: v1.6

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

# Provision with specific subscription
m365agents provision --env dev --subscription <subscription-id>

# Skip confirmation prompts (for CI/CD)
m365agents provision --env dev --no-interactive
```

---

## Deployment

### `m365agents deploy`

```bash
# Deploy to dev
m365agents deploy --env dev

# Deploy specific components only
m365agents deploy --env dev --component bot
m365agents deploy --env dev --component tab

# Deploy without asking for confirmation
m365agents deploy --env dev --no-interactive
```

---

## Publishing

### `m365agents publish`

```bash
# Publish to organization's Teams App Catalog
m365agents publish --env dev

# Package the app zip (without publishing)
m365agents package --env dev
# Output: ./appPackage/build/appPackage.dev.zip
```

**After `m365agents publish`, an admin must approve the app in the Teams Admin Center.**

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
# .env.dev — auto-generated; commit to source control (no secrets)
TEAMS_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BOT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
APP_TENANTID=zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz
TAB_DOMAIN=myapp.azurewebsites.net

# .env.dev.user — local overrides; NEVER commit (in .gitignore)
SECRET_BOT_PASSWORD=<actual-secret>
SECRET_AAD_APP_CLIENT_SECRET=<actual-secret>
```

---

## Bicep Templates for Teams Resources

```bicep
// infra/botservice.bicep — Single-tenant bot registration
@description('Bot Service name')
param botServiceName string
param botEndpoint string
param botAadAppClientId string
param appTenantId string

resource botService 'Microsoft.BotService/botServices@2022-09-15' = {
  name: botServiceName
  location: 'global'
  sku: { name: 'F0' }
  kind: 'azurebot'
  properties: {
    displayName: botServiceName
    endpoint: botEndpoint
    msaAppId: botAadAppClientId
    msaAppType: 'SingleTenant'
    msaAppTenantId: appTenantId
  }
}

resource teamsChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
  parent: botService
  name: 'MsTeamsChannel'
  location: 'global'
  properties: {
    channelName: 'MsTeamsChannel'
    properties: {
      isEnabled: true
      deploymentEnvironment: 'CommercialDeployment'
    }
  }
}
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
          node-version: '20'

      - name: Install M365 Agents Toolkit CLI
        run: npm install -g @microsoft/m365agentstoolkit-cli

      - name: Install dependencies
        run: npm ci

      - name: Login to M365
        run: |
          m365agents auth login m365 \
            --service-principal \
            --tenant-id ${{ secrets.M365_TENANT_ID }} \
            --client-id ${{ secrets.M365_CLIENT_ID }} \
            --client-secret ${{ secrets.M365_CLIENT_SECRET }}

      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Provision and Deploy
        run: |
          m365agents provision --env production --no-interactive
          m365agents deploy --env production --no-interactive
          m365agents publish --env production --no-interactive
        env:
          TEAMS_APP_ID: ${{ vars.TEAMS_APP_ID }}
          BOT_ID: ${{ vars.BOT_ID }}
          APP_TENANTID: ${{ secrets.APP_TENANTID }}
          SECRET_BOT_PASSWORD: ${{ secrets.BOT_PASSWORD }}
```

---

## App Validation

```bash
# Validate the app manifest
m365agents validate --manifest-path ./appPackage/manifest.json

# Validate a packaged zip
m365agents validate --app-package-file ./appPackage/build/appPackage.dev.zip
```

### Known Validation Issues (v1.25)

| Issue | Description | Workaround |
|-------|-------------|-----------|
| Regex validation bug | Schema validator rejects valid regex patterns (`.xll` regex error) | Skip `teamsApp/validateManifest` step; use manual packaging |
| Dev Portal field persistence | Dev Portal may drop `nestedAppAuthInfo` and `agenticUserTemplates` on save | Always author manifests in codebase; upload zip directly |
| `supportsChannelFeatures` dropped | Dev Portal may remove `supportsChannelFeatures` after editing | Edit manifest in code, not in portal |

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `ERR_M365_NOT_SIGNED_IN` | CLI not authenticated | Run `m365agents auth login m365` |
| `ERR_AZURE_NOT_SIGNED_IN` | Not authenticated to Azure | Run `m365agents auth login azure` |
| `ERR_PROVISION_FAILED` | Bicep deployment failed | Check resource quotas and templates |
| `ERR_DEPLOY_FAILED` | Deployment failed | Check App Service logs |
| Manifest validation error | Schema violation | Run `m365agents validate`; check v1.25 bug list |
| `ERR_BOT_NOT_REGISTERED` | Bot ID not found | Re-run `m365agents provision` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| App package size (zip) | 1 MB | Manifest + icons only |
| Manifest `validDomains` | 16 entries | Wildcards supported |
| Bot Service free tier | F0 (1,000 messages/month) | Use S1 for production |
| App Service free tier (F1) | 60 CPU minutes/day | Use at least B1 for bots |
