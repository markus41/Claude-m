---
name: lighthouse-operations:baseline-deploy
description: Scan M365 Lighthouse management template compliance across all managed tenants, identify non-compliant tenants, generate remediation plans with GDAP role requirements, and apply supported management actions via the Lighthouse API.
argument-hint: "[--tenant-id <id>] [--template-id <id>] [--report-only]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Baseline Deployment

Scan Lighthouse management template compliance, identify gaps, and apply remediation across managed tenants.

## Deployment Flow

### Step 1: Acquire Token

```bash
TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
BASE="https://graph.microsoft.com/beta/tenantRelationships/managedTenants"
```

### Step 2: List Available Management Templates

```bash
az rest --method GET \
  --url "${BASE}/managementTemplates?\$select=id,displayName,description,category&\$orderby=category asc" \
  --headers "Authorization=Bearer ${TOKEN}"
```

Present organized list by category. Ask user:
- **All templates** — scan everything
- **Specific template** — select from list
- **Category** — e.g., identity, device, data

### Step 3: Scan Deployment Status

For the selected templates, check compliance across all managed tenants:

```bash
# For each selected template step
az rest --method GET \
  --url "${BASE}/managementTemplateStepTenantSummaries?\$filter=managementTemplateStepId eq '${STEP_ID}'&\$select=tenantId,tenantDisplayName,assignedToTenantCount,deployedToTenantCount,notDeployedToTenantCount" \
  --headers "Authorization=Bearer ${TOKEN}"
```

Build compliance matrix:

```
Template                          | Compliant | Not Compliant | Error | Not Licensed
----------------------------------|-----------|---------------|-------|-------------
MFA for Admins                    | 38        | 3             | 1     | 0
Block Legacy Auth                 | 36        | 5             | 1     | 0
Device Compliance Policy          | 25        | 15            | 2     | 2
Windows Defender AV               | 40        | 2             | 0     | 0
```

### Step 4: Generate Non-Compliance Detail

For tenants with `notDeployedToTenantCount > 0`:

```bash
az rest --method GET \
  --url "${BASE}/managementActionTenantDeploymentStatuses?\$filter=tenantId eq '${TENANT_ID}'&\$expand=statuses" \
  --headers "Authorization=Bearer ${TOKEN}"
```

### Step 5: Build Remediation Plan

For each non-compliant tenant × template combination, generate:

```
## Remediation Plan — {Tenant}

### 🔴 MFA for Admins — Not Deployed
**What**: Conditional Access policy requiring MFA for all admin roles not configured
**Risk**: Admin accounts accessible without MFA — HIGH severity
**GDAP Role Required**: Security Administrator
**Effort**: Quick Fix (< 15 min)
**Action**:
  1. Sign in to Entra ID admin center with GDAP Security Admin role
  2. Navigate to Security → Conditional Access → New Policy
  3. Apply "Require MFA for admins" template or create manually (see CA002 in initial-m365-config.md)
  4. Enable in Report-Only mode for 7 days, then enforce

### 🟡 Device Compliance Policy — Not Deployed
**What**: No Intune device compliance policy configured
**Risk**: Non-compliant devices accessing company data — MEDIUM severity
**GDAP Role Required**: Intune Administrator
**Effort**: Moderate (30–60 min)
**Action**: Create compliance policy in Endpoint Manager for Windows devices
```

If `--report-only`, stop here and output the plan as a markdown file.

### Step 6: Apply Management Actions (if not report-only)

For supported actions that Lighthouse can apply directly:

```bash
# Ask user to confirm each action before applying
az rest --method POST \
  --url "${BASE}/managementActions/${ACTION_ID}/apply" \
  --headers "Authorization=Bearer ${TOKEN}" \
  --body "{\"tenantId\": \"${TENANT_ID}\", \"tenantGroupId\": \"${GROUP_ID}\", \"managementTemplateId\": \"${TEMPLATE_ID}\"}"
```

Report: Applied / Failed / Requires manual action.

### Step 7: Compliance Summary Report

```
## Baseline Compliance Report — {Date}

Total managed tenants: 42
Fully compliant (all templates): 28 (67%)
Partially compliant: 11 (26%)
Needs attention: 3 (7%)

Critical gaps:
- MFA for Admins: 3 tenants not configured
- Legacy auth not blocked: 5 tenants
- Device compliance: 15 tenants

Remediation items generated: 23
Estimated effort: 6.5 hours

Report saved to: lighthouse-compliance-{date}.md
```

Write the report to `lighthouse-compliance-{YYYY-MM-DD}.md`.

## Arguments

- `--tenant-id <id>`: Scan only a specific tenant (skip multi-tenant scan)
- `--template-id <id>`: Check only a specific template step
- `--report-only`: Generate remediation plan without applying any actions
