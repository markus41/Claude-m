---
name: entra-setup
description: Set up the Entra ID Security plugin — configure Azure auth with identity and security Graph API permissions
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Entra ID Security Setup

Guide the user through setting up Microsoft Entra ID security and identity management access.

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):
- `tenantId` (always required)
- `subscriptionId` (required for Azure-scope workflows)
- `environmentCloud`
- `principalType`
- `scopesOrRoles`

If validation fails, stop immediately and return a structured error using contract codes (`MissingIntegrationContext`, `InvalidIntegrationContext`, `ContextCloudMismatch`, `InsufficientScopesOrRoles`).
Redact tenant/subscription/object identifiers in setup output using contract redaction rules.

## Step 1: Check Prerequisites

Verify Node.js 18+ is installed.

## Step 2: Install Dependencies

```bash
npm init -y && npm install @azure/identity @azure/msal-node node-fetch
```

## Step 3: Configure Azure App Registration

Register an app in Microsoft Entra ID with these Graph API permissions:
- `Application.ReadWrite.All` (application) — manage app registrations
- `Policy.ReadWrite.ConditionalAccess` (application) — manage CA policies
- `AuditLog.Read.All` (application) — read sign-in and audit logs
- `IdentityRiskyUser.ReadWrite.All` (application) — read/manage risky users
- `Directory.Read.All` (application) — read directory data

**Important**: These are application-level permissions requiring admin consent.

Collect: Tenant ID, Client ID, Client Secret.

## Step 4: Configure Environment

Create `.env`:
```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

## Step 5: Verify Access

- Call `GET /applications?$top=5` to verify app registration access.
- Call `GET /auditLogs/signIns?$top=5` to verify audit log access.
- Display results in a summary table.

If `--minimal` is passed, stop after Step 2.
