---
name: msp-tenant-provisioning:tenant-configure
description: Apply the initial Microsoft 365 security baseline to a newly provisioned tenant — create break-glass accounts, disable security defaults, deploy Conditional Access policies (MFA, block legacy auth, block high-risk sign-ins), configure PIM eligible role assignments, set authentication methods, enable audit logging, and verify the configuration.
argument-hint: "[--tenant-id <id>] [--domain <prefix>] [--skip-pim] [--report-only]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Initial M365 Security Baseline

Apply a security baseline to a new Microsoft 365 tenant: break-glass accounts, Conditional Access policies, PIM, authentication methods, and audit logging.

## Configuration Flow

### Step 1: Connect to Tenant

Ask for tenant ID or domain if not provided. Acquire tokens:

```bash
# Graph token scoped to the customer tenant via GDAP
TENANT_ID="{customer-tenant-id}"
GRAPH_TOKEN=$(az account get-access-token \
  --resource https://graph.microsoft.com \
  --tenant "${TENANT_ID}" \
  --query accessToken -o tsv)

BASE="https://graph.microsoft.com/v1.0"
BETA="https://graph.microsoft.com/beta"
```

### Step 2: Create Break-Glass Accounts

**This must be done BEFORE disabling security defaults.**

```bash
# Create break-glass account 1 — cloud-only, excluded from all CA policies
BG1=$(az rest --method POST \
  --url "${BASE}/users" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "displayName": "Break Glass Account 1",
    "userPrincipalName": "breakglass1@{domain}.onmicrosoft.com",
    "accountEnabled": true,
    "passwordProfile": {
      "password": "{secure-random-password-64char}",
      "forceChangePasswordNextSignIn": false
    },
    "passwordPolicies": "DisablePasswordExpiration"
  }')

BG1_ID=$(echo $BG1 | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Create break-glass account 2 (backup)
BG2=$(az rest --method POST \
  --url "${BASE}/users" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "displayName": "Break Glass Account 2",
    "userPrincipalName": "breakglass2@{domain}.onmicrosoft.com",
    "accountEnabled": true,
    "passwordProfile": {
      "password": "{secure-random-password-64char}",
      "forceChangePasswordNextSignIn": false
    },
    "passwordPolicies": "DisablePasswordExpiration"
  }')

BG2_ID=$(echo $BG2 | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Assign Global Administrator to both break-glass accounts
GLOBAL_ADMIN_ROLE="62e90394-69f5-4237-9190-012177145e10"
for BG_ID in $BG1_ID $BG2_ID; do
  az rest --method POST \
    --url "${BASE}/directoryRoles/roleTemplateId=${GLOBAL_ADMIN_ROLE}/members/\$ref" \
    --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
    --body "{\"@odata.id\": \"${BASE}/directoryObjects/${BG_ID}\"}"
done
```

Generate and save break-glass passwords to `tenant-{domain}-breakglass.md` (mark for secure storage).

### Step 3: Disable Security Defaults

```bash
az rest --method PATCH \
  --url "${BETA}/policies/identitySecurityDefaultsEnforcementPolicy" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{"isEnabled": false}'
```

Confirm: returns 204 No Content.

### Step 4: Deploy Conditional Access Policies

Deploy four standard CA policies. For each policy, ask: "Deploy in **Report-Only** (safe, no enforcement) or **Enabled** (enforce immediately)?" — default is Report-Only.

**CA001 — Require MFA for All Users (except break-glass)**

```bash
az rest --method POST \
  --url "${BASE}/identity/conditionalAccess/policies" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "displayName": "CA001 — Require MFA for All Users",
    "state": "enabledForReportingButNotEnforcing",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeUsers": ["'$BG1_ID'", "'$BG2_ID'"]
      },
      "applications": { "includeApplications": ["All"] }
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["mfa"]
    }
  }'
```

**CA002 — Require MFA + Compliant Device for Admins**

```bash
az rest --method POST \
  --url "${BASE}/identity/conditionalAccess/policies" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "displayName": "CA002 — Require MFA + Compliant Device for Admins",
    "state": "enabledForReportingButNotEnforcing",
    "conditions": {
      "users": {
        "includeRoles": [
          "62e90394-69f5-4237-9190-012177145e10",
          "194ae4cb-b126-40b2-bd5b-6091b380977d",
          "f28a1f50-f6e7-4571-818b-6a12f2af6b6c"
        ],
        "excludeUsers": ["'$BG1_ID'", "'$BG2_ID'"]
      },
      "applications": { "includeApplications": ["All"] }
    },
    "grantControls": {
      "operator": "AND",
      "builtInControls": ["mfa", "compliantDevice"]
    }
  }'
```

**CA003 — Block Legacy Authentication**

```bash
az rest --method POST \
  --url "${BASE}/identity/conditionalAccess/policies" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "displayName": "CA003 — Block Legacy Authentication",
    "state": "enabled",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeUsers": ["'$BG1_ID'", "'$BG2_ID'"]
      },
      "applications": { "includeApplications": ["All"] },
      "clientAppTypes": ["exchangeActiveSync", "other"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'
```

**CA004 — Block High-Risk Sign-Ins (requires Entra P2 / Business Premium)**

```bash
az rest --method POST \
  --url "${BASE}/identity/conditionalAccess/policies" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "displayName": "CA004 — Block High-Risk Sign-Ins",
    "state": "enabledForReportingButNotEnforcing",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeUsers": ["'$BG1_ID'", "'$BG2_ID'"]
      },
      "applications": { "includeApplications": ["All"] },
      "signInRiskLevels": ["high", "medium"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'
```

### Step 5: Configure PIM Eligible Assignments (skip if --skip-pim)

Assign privileged roles as PIM-eligible (not permanently active) for the MSP admin group:

```bash
# Global Admin — eligible (not active) for break-glass situations
az rest --method POST \
  --url "${BETA}/roleManagement/directory/roleEligibilityScheduleRequests" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "action": "adminAssign",
    "justification": "PIM eligible assignment — MSP managed",
    "roleDefinitionId": "62e90394-69f5-4237-9190-012177145e10",
    "directoryScopeId": "/",
    "principalId": "{msp-gdap-security-group-id}",
    "scheduleInfo": {
      "startDateTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
      "expiration": { "type": "noExpiration" }
    }
  }'
```

Also configure role settings for activation requirements:
```bash
# Require MFA + justification for Global Admin activation
az rest --method PATCH \
  --url "${BETA}/policies/roleManagementPolicies/{policy-id}/rules/{rule-id}" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "@odata.type": "#microsoft.graph.unifiedRoleManagementPolicyAuthenticationContextRule",
    "isEnabled": true,
    "claimValue": "c1"
  }'
```

### Step 6: Set Authentication Methods Policy

Enable number matching for authenticator app and disable SMS OTP:

```bash
az rest --method PATCH \
  --url "${BETA}/policies/authenticationMethodsPolicy" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{
    "registrationEnforcement": {
      "authenticationMethodsRegistrationCampaign": {
        "state": "enabled",
        "includeTargets": [{"id": "all_users", "targetType": "group"}]
      }
    }
  }'
```

### Step 7: Enable Audit Logging

```bash
# Verify audit log is enabled (it is by default for M365 — confirm)
az rest --method GET \
  --url "${BASE}/security/informationProtection/sensitivityLabels" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"

# Enable Microsoft 365 unified audit log if needed
# (done via Exchange Online PowerShell — provide instructions)
```

Provide PowerShell instructions for enabling unified audit log:
```powershell
# Run in Exchange Online PowerShell as admin
Connect-ExchangeOnline -UserPrincipalName admin@{domain}.onmicrosoft.com
Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true
Get-AdminAuditLogConfig | Select-Object UnifiedAuditLogIngestionEnabled
```

### Step 8: Generate Configuration Report

Write to `tenant-{domain}-baseline-report.md`:

```
## Security Baseline Configuration Report
Tenant: {domain}.onmicrosoft.com ({tenant-id})
Date: {timestamp}
Configured by: MSP — {partner-name}

### Break-Glass Accounts
  ✅ breakglass1@{domain}.onmicrosoft.com — Global Admin
  ✅ breakglass2@{domain}.onmicrosoft.com — Global Admin
  ⚠️  Passwords stored in: [specify secure vault location]

### Security Defaults
  ✅ Disabled (CA policies applied instead)

### Conditional Access Policies
  ✅ CA001 — Require MFA for All Users [Report-Only → enable after 7 days]
  ✅ CA002 — Require MFA + Compliant Device for Admins [Report-Only]
  ✅ CA003 — Block Legacy Authentication [Enabled]
  ✅ CA004 — Block High-Risk Sign-Ins [Report-Only]

### PIM
  ✅ Global Administrator — eligible (no standing access)
  ✅ Activation requires MFA + justification

### Authentication Methods
  ✅ Number matching enforced
  ✅ Authenticator app registration campaign enabled

### Audit Logging
  ✅ Unified audit log enabled

### Action Required (7 days after report-only)
  → Promote CA001 from Report-Only to Enabled
  → Promote CA002 from Report-Only to Enabled
  → Review CA004 sign-in risk report before enabling
```

## Arguments

- `--tenant-id <id>`: Customer tenant ID
- `--domain <prefix>`: Customer domain prefix (e.g., `contoso`)
- `--skip-pim`: Skip PIM eligible assignment step
- `--report-only`: Show what would be configured without making changes
