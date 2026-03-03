---
name: lighthouse-operations:lighthouse-report
description: Generate a comprehensive cross-tenant status report across all M365 Lighthouse managed tenants — MFA coverage, device compliance, risky users, GDAP expiry, baseline deployment, and Azure delegation health — formatted for MSP customer reviews or internal QBRs.
argument-hint: "[--format markdown|table|json] [--tenant-id <id>] [--month <YYYY-MM>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Lighthouse Cross-Tenant Report

Generate a comprehensive MSP health and operations report across all managed tenants.

## Report Generation Flow

### Step 1: Configure Report

Ask for:
- **Format**: Markdown report (for customer), Table (for internal review), or both
- **Scope**: All tenants, a specific tenant, or a tag/group
- **Month**: Current month (default) or specify (e.g., `2026-02`)
- **Sections to include**: all (default) or select subset

### Step 2: Gather Data

Run all data collection in sequence:

```bash
TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
BASE="https://graph.microsoft.com/beta/tenantRelationships/managedTenants"

# 1. All managed tenants
TENANTS=$(az rest --method GET \
  --url "${BASE}/tenants?\$select=tenantId,displayName,tenantStatusInformation&\$orderby=displayName asc" \
  --headers "Authorization=Bearer ${TOKEN}")

# 2. MFA registration summaries
MFA=$(az rest --method GET \
  --url "${BASE}/credentialUserRegistrationsSummaries?\$select=tenantId,tenantDisplayName,totalUserCount,mfaRegisteredUserCount,adminsMfaRegisteredCount,adminsCount,mfaConditionalAccessPolicyState" \
  --headers "Authorization=Bearer ${TOKEN}")

# 3. Device compliance
DEVICES=$(az rest --method GET \
  --url "${BASE}/managedDeviceCompliances?\$select=tenantId,tenantDisplayName,totalDeviceCount,compliantDeviceCount,notCompliantDeviceCount" \
  --headers "Authorization=Bearer ${TOKEN}")

# 4. Windows protection / Defender
PROTECTION=$(az rest --method GET \
  --url "${BASE}/windowsProtectionStates?\$select=tenantId,tenantDisplayName,windowsDefenderState,antiMalwareVersion" \
  --headers "Authorization=Bearer ${TOKEN}")

# 5. Risky users
RISKY=$(az rest --method GET \
  --url "${BASE}/riskyUsers?\$filter=riskState ne 'dismissed'&\$select=tenantId,tenantDisplayName,riskState,riskDetail,riskLastUpdatedDateTime" \
  --headers "Authorization=Bearer ${TOKEN}")

# 6. Active alerts
ALERTS=$(az rest --method GET \
  --url "${BASE}/managedTenantAlerts?\$filter=status eq 'active'&\$select=tenantId,tenantDisplayName,severity,displayName,firstSeenDateTime" \
  --headers "Authorization=Bearer ${TOKEN}")

# 7. GDAP relationships
GDAP=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships?\$filter=status eq 'active'&\$select=id,displayName,customer,endDateTime,autoExtendDuration" \
  --headers "Authorization=Bearer ${TOKEN}")

# 8. Azure Lighthouse delegations
DELEGATED_SUBS=$(az account list --query "[?managedByTenants].{id:id,name:name,tenantId:tenantId}" --output json 2>/dev/null)
```

### Step 3: Calculate Health Scores

For each tenant, calculate a composite health score using the scoring criteria from `lighthouse-health` SKILL.md:

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| MFA coverage | > 95% | 80–95% | < 80% |
| Admin MFA | 100% | 90–99% | < 90% |
| Device compliance | > 95% | 80–95% | < 80% |
| Risky users | 0 | 1–3 | > 3 |
| Open critical alerts | 0 | 0 | > 0 |
| GDAP expiry | > 60 days | 30–60 days | < 30 days |

### Step 4: Generate Report

#### Section 1: Executive Summary

```
## MSP Monthly Health Report — {Month} {Year}
Generated: {timestamp}
Partner: Contoso MSP
Tenants managed: 42

### Overall Health
🟢 Green (Healthy):     28 tenants (67%)
🟡 Yellow (Attention):  11 tenants (26%)
🔴 Red (Action Needed):  3 tenants (7%)

### Critical Items (Require immediate action)
- 3 tenants with risky users (unaddressed > 48h)
- 1 critical malware alert (Fabrikam Ltd.)
- 2 GDAP relationships expiring within 30 days
```

#### Section 2: Tenant Health Scorecard

```
| Tenant            | Overall | MFA%  | Devices | Risky | Alerts | GDAP Expiry |
|-------------------|---------|-------|---------|-------|--------|-------------|
| Contoso Customer  | 🟢      | 98%   | 97%     | 0     | 0      | 2027-01-15  |
| Fabrikam Ltd.     | 🔴      | 74%   | 82%     | 2     | 1 crit | 2026-04-20  |
| Woodgrove Bank    | 🟡      | 91%   | 88%     | 0     | 2 med  | 2026-03-28⚠️|
```

#### Section 3: MFA Coverage Detail

```
### MFA Registration Summary

| Tenant             | Total Users | MFA Registered | Coverage | Admin MFA | CA Policy  |
|--------------------|-------------|----------------|----------|-----------|------------|
| Contoso Customer   | 150         | 147            | 98%      | 8/8 100%  | Enabled    |
| Fabrikam Ltd.      | 200         | 148            | 74% 🔴   | 6/8  75%🔴| Not set    |
```

#### Section 4: GDAP Relationship Status

```
### GDAP Relationship Expiry Report

| Relationship                    | Customer        | Expires      | Auto-Extend | Status    |
|---------------------------------|-----------------|--------------|-------------|-----------|
| Contoso MSP — Full Admin        | Contoso         | 2027-01-15   | 180 days    | ✅ Active  |
| Woodgrove MSP                   | Woodgrove Bank  | 2026-03-28   | None        | ⚠️ Expires |
| Fabrikam MSP — Security         | Fabrikam        | 2026-04-20   | None        | ⚠️ Monitor |
```

#### Section 5: Azure Lighthouse Status

```
### Azure Delegation Summary

Delegated subscriptions: 15
  - Production: 8
  - Development: 7
Partner access coverage: 100%
```

#### Section 6: Recommended Actions

```
### Recommended Actions — Priority Order

[P1 — IMMEDIATE]
1. Fabrikam Ltd.: Investigate and remediate 2 risky users and critical malware alert
   GDAP Role: Security Admin | Est. effort: 30 min

[P2 — THIS WEEK]
2. Fabrikam Ltd.: MFA coverage at 74% — initiate MFA enrollment campaign
   GDAP Role: User Admin | Est. effort: 2 hours
3. Woodgrove Bank: GDAP relationship expiring 2026-03-28 — initiate renewal
   Action: /lighthouse-operations:gdap-manage --action renew

[P3 — THIS MONTH]
4. 5 tenants: Block Legacy Authentication policy not configured
   Run: /lighthouse-operations:baseline-deploy --template-id <legacy-auth-template>
```

### Step 5: Write Report File

Write to `lighthouse-report-{YYYY-MM}.md`.

If format includes `table`, also write `lighthouse-report-{YYYY-MM}.csv`.

```
Report saved to:
  lighthouse-report-2026-03.md   (executive summary + detail)
  lighthouse-report-2026-03.csv  (machine-readable data)
```

## Arguments

- `--format markdown|table|json`: Output format (default: markdown)
- `--tenant-id <id>`: Single-tenant report
- `--month <YYYY-MM>`: Report month (default: current)
