---
name: inv-setup
description: Verify Microsoft Graph investigation permissions and test connectivity
argument-hint: "[--verbose]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — Setup and Readiness Check

Validates CLI authentication, tenant context, and Graph API scope coverage before running investigation commands.

## Arguments

| Argument | Description |
|---|---|
| `--verbose` | Show raw API responses alongside the readiness table |

## Step 1: Check CLI and Authentication

Verify the `az` CLI is installed and the user is authenticated.

```bash
# Check az CLI version
az version --output json 2>/dev/null || { echo "ERROR: az CLI not found. Install from https://aka.ms/installazurecliwindows"; exit 1; }

# Verify active login
az account show --output json
```

If `az account show` fails, instruct the user to run `az login` or `az login --use-device-code` first.

## Step 2: Verify Tenant Context

Display tenant ID, subscription, and the authenticated principal so the user can confirm they are in the right tenant.

```bash
az account show --output json \
  | jq '{ tenantId: .tenantId, subscriptionId: .id, subscriptionName: .name, user: .user.name, userType: .user.type }'
```

Show the results as a context card before running scope tests.

## Step 3: Test Core Graph Connectivity

Issue a simple Graph call that requires only basic User.Read to confirm Graph is reachable.

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/organization?\$select=id,displayName,verifiedDomains" \
  --output json
```

A `200 OK` with tenant data confirms Graph connectivity. A `401` means the token does not include Graph scopes — instruct the user to re-authenticate with `az login --scope https://graph.microsoft.com/.default`.

## Step 4: Check Required Investigation Scopes

Test each scope by making a minimal API call. Record HTTP status and map to required commands.

```bash
# Test: User.Read.All
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users?\$top=1&\$select=id,displayName" \
  --output json 2>&1 | head -5

# Test: AuditLog.Read.All
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$top=1&\$select=id" \
  --output json 2>&1 | head -5

# Test: GroupMember.Read.All
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/groups?\$top=1&\$select=id,displayName" \
  --output json 2>&1 | head -5

# Test: Mail.Read (delegated — will fail for app-only tokens without Mail.ReadBasic.All)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/me/messages?\$top=1&\$select=id" \
  --output json 2>&1 | head -5

# Test: Sites.Read.All
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/sites/root?\$select=id,displayName" \
  --output json 2>&1 | head -5

# Test: DelegatedPermissionGrant.ReadWrite.All
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$top=1" \
  --output json 2>&1 | head -5
```

## Step 5: Test Premium Endpoints

These require Azure AD P2 or Intune licensing and are optional for some commands.

```bash
# Test: IdentityRiskyUser.Read.All (requires P2)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?\$top=1&\$select=id" \
  --output json 2>&1 | head -5

# Test: DeviceManagementManagedDevices.Read.All (requires Intune)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?\$top=1&\$select=id" \
  --output json 2>&1 | head -5

# Test: ChannelMessage.Read.All (requires special Teams approval)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/teams?\$top=1&\$select=id" \
  --output json 2>&1 | head -5
```

A `403 Forbidden` with `"code": "Authorization_RequestDenied"` indicates a missing scope.
A `403` with `"code": "ComplianceViolation"` or licensing error indicates a missing license.

## Step 6: Report Readiness

Compile and display a readiness table based on the probe results above.

```markdown
## Graph Investigator — Readiness Report

| Scope | Status | Required By |
|---|---|---|
| User.Read.All | ✅ PASS | inv-user, inv-email, inv-signin, inv-devices, inv-audit, inv-files, inv-teams, inv-risk, inv-apps |
| AuditLog.Read.All | ✅ PASS | inv-signin, inv-audit, inv-timeline, inv-risk |
| GroupMember.Read.All | ✅ PASS | inv-user |
| Mail.Read | ✅ PASS | inv-email, inv-timeline |
| Sites.Read.All | ⚠️ FAIL (403) | inv-files |
| DelegatedPermissionGrant.ReadWrite.All | ✅ PASS | inv-apps |
| IdentityRiskyUser.Read.All (P2) | ❌ FAIL — License | inv-risk |
| DeviceManagementManagedDevices.Read.All (Intune) | ✅ PASS | inv-devices |
| ChannelMessage.Read.All | ⚠️ FAIL (403) | inv-teams (--include-messages) |

### Commands with Limited Functionality
- **inv-files**: Sites.Read.All missing — file audit will fall back to PowerShell UAL only
- **inv-risk**: No P2 license — risk detections and Identity Protection data unavailable
- **inv-teams --include-messages**: ChannelMessage.Read.All denied — message content unavailable

### To Resolve Missing Scopes
1. Ensure the user or service principal has the required Graph API permissions granted in Entra
2. For P2 features: confirm Azure AD P2 or M365 E5 license is assigned
3. For Intune: confirm Microsoft Intune license is assigned
4. Re-authenticate after permission changes: `az login --scope https://graph.microsoft.com/.default`
```

## Output Format

Emit the readiness table as the primary output. If `--verbose` is specified, also include the raw JSON responses from each probe call so the user can diagnose unexpected failures.
