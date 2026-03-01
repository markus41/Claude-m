---
name: license-setup
description: Set up the License Optimizer plugin — configure Graph access for license reporting and usage analytics
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

# License Optimizer Setup

Guided setup for M365 license scanning and optimization.

## Step 1: Check Prerequisites

- Graph API access with `User.Read.All`, `Directory.Read.All`, `Reports.Read.All`
- Azure AD Premium P1 (required for `signInActivity` data)
- For MSPs: Active GDAP relationships with License Administrator or Global Reader roles

## Step 2: Verify Access

```
GET https://graph.microsoft.com/v1.0/subscribedSkus
```

Should return the tenant's license inventory.

```
GET https://graph.microsoft.com/v1.0/reports/getOffice365ActiveUserDetail(period='D7')
```

Should return usage report data.

## Step 3: Configure Context

Ask the user:
- Single tenant or multi-tenant (MSP/CSP)?
- Do you have CSP pricing or list pricing?
- Which license tiers are in scope for optimization?

## Step 4: Output Summary

```markdown
# License Optimizer Setup Report

| Setting | Value |
|---|---|
| Tenant mode | [Single / Multi-tenant] |
| SKUs found | [count] |
| Total licenses | [count] |
| Usage reports | [Available / Not available] |
| Sign-in activity | [Available / Requires P1] |
```
