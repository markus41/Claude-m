---
name: onenote-setup
description: Headless-first OneNote setup with non-interactive auth, permission checks, and readiness validation
argument-hint: "[--headless-only] [--tenant <tenant-id>] [--client-id <client-id>] [--client-secret-env <env-var>] [--use-managed-identity]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# OneNote Headless-First Setup

Configure OneNote Graph automation to run headlessly whenever possible.

## Execution Policy

1. Prefer Managed Identity in hosted Azure environments.
2. Otherwise use service principal credentials.
3. Use delegated device code only as fallback if headless credentials are unavailable.
4. If `--headless-only` is set, fail when a non-headless path is required.

## Step 1: Validate Runtime Prerequisites

1. Verify Node.js 18+ (`node --version`).
2. Verify Graph tooling dependencies are available (`@azure/identity`, `@microsoft/microsoft-graph-client`).
3. Verify required environment values exist for selected auth mode.

Required variables for service principal mode:

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET` (or certificate-based equivalent)

## Step 2: Select Headless Auth Mode

Choose exactly one mode in this order:

1. Managed Identity
2. Service principal with certificate
3. Service principal with secret
4. Device code fallback (only when headless is not possible)

If user passes `--use-managed-identity`, force mode 1 and fail if unavailable.

## Step 3: Verify Token Acquisition

1. Acquire a Graph token for `https://graph.microsoft.com/.default`.
2. Fail fast on auth errors; do not proceed to API checks.
3. Record selected mode and token audience (redacted).

## Step 4: Verify OneNote API Reachability

Run read checks in order:

1. `GET /me/onenote/notebooks` for delegated mode.
2. `GET /users/{target-user-id}/onenote/notebooks` for app mode.
3. `GET /me/onenote/sections?$top=5` (or user-scoped equivalent).

If 403 or 401 occurs, stop and report missing scopes:

- Read: `Notes.Read` or `Notes.Read.All`
- Write: `Notes.ReadWrite` or `Notes.ReadWrite.All`

## Step 5: Validate Write Readiness (Dry Probe)

1. Resolve a target section ID without writing.
2. Validate that create-page endpoint path is valid for the chosen principal.
3. Confirm write scopes and notebook permissions before any mutation command is used.

## Step 6: Output Setup Summary

Return a deterministic setup report:

1. Selected auth mode
2. Required scopes present/missing
3. Read checks pass/fail
4. Write readiness pass/fail
5. Recommended next command (`/onenote-create-page` or `/onenote-hierarchy-manage`)

## Safety Rules

- Fail fast on missing context or permissions.
- Redact tenant IDs, client IDs, secrets, and token material in output.
- Never suggest browser auth unless headless options are exhausted.
