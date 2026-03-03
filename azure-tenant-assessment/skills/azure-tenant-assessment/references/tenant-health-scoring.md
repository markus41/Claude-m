# Tenant Health Scoring

Composite methodology for producing a 0–100 health score across the five pillars of Azure/M365 tenant governance: identity, security, compliance, collaboration, and governance.

---

## Scoring Pillars and Weights

| Pillar | Weight | Max Points | Description |
|---|---|---|---|
| Identity | 25% | 25 | MFA coverage, CA policies, admin account hygiene |
| Security | 25% | 25 | Secure Score delta, Defender coverage, key vault adoption |
| Compliance | 20% | 20 | DLP policies, retention labels, sensitivity labels |
| Collaboration | 15% | 15 | Guest access controls, external sharing policies |
| Governance | 15% | 15 | Naming policies, group expiration, AU delegation |

**Final Score** = sum of pillar scores (0–100)

---

## Score Benchmark Thresholds

| Score Range | Band | Interpretation |
|---|---|---|
| 85–100 | Green — Healthy | Tenant meets best-practice baseline across all pillars |
| 70–84 | Yellow — Needs Attention | Minor gaps in 1–2 pillars; remediate within 90 days |
| 50–69 | Orange — At Risk | Significant gaps; remediate within 30 days |
| 0–49 | Red — Critical | Foundational controls missing; immediate action required |

---

## Pillar 1 — Identity (25 points)

### Scoring Checklist

| Check | Points | Graph Endpoint | Notes |
|---|---|---|---|
| MFA coverage ≥ 90% of licensed users | 8 | `GET /reports/credentialUserRegistrationDetails` | Count users with `isMfaRegistered = true` |
| No emergency-access accounts excluded from CA | 4 | `GET /identity/conditionalAccessPolicies` | Verify break-glass accounts exist but CA excludes them correctly |
| At least 1 CA policy enforcing MFA for all users | 5 | `GET /identity/conditionalAccessPolicies` | Check `grantControls.builtInControls` contains `mfa` |
| Privileged roles have ≤ 5 permanent Global Admins | 4 | `GET /directoryRoles/{role}/members` | Role template ID: `62e90394-69f5-4237-9190-012177145e10` |
| No users with stale MFA methods (>180 days unused) | 4 | `GET /reports/authenticationMethods/userRegistrationDetails` | Filter `lastUpdatedDateTime` |

### Graph API Queries

```http
# MFA registration details (requires Reports.Read.All)
GET https://graph.microsoft.com/v1.0/reports/credentialUserRegistrationDetails
    ?$filter=isMfaRegistered eq false&$select=userPrincipalName,isMfaRegistered

# Conditional access policies
GET https://graph.microsoft.com/v1.0/identity/conditionalAccessPolicies
    ?$select=id,displayName,state,conditions,grantControls

# Global Admin members
GET https://graph.microsoft.com/v1.0/directoryRoles
    ?$filter=roleTemplateId eq '62e90394-69f5-4237-9190-012177145e10'
# Then:
GET https://graph.microsoft.com/v1.0/directoryRoles/{roleId}/members
    ?$select=id,displayName,userPrincipalName,userType
```

### PowerShell

```powershell
# Get all users without MFA registered
Connect-MgGraph -Scopes "Reports.Read.All"
$mfaReport = Get-MgReportCredentialUserRegistrationDetail |
    Where-Object { -not $_.IsMfaRegistered }
$mfaReport | Select-Object UserPrincipalName, IsMfaRegistered |
    Export-Csv ./no-mfa-users.csv -NoTypeInformation

# Count Global Admins
$globalAdminRole = Get-MgDirectoryRole -Filter "roleTemplateId eq '62e90394-69f5-4237-9190-012177145e10'"
$globalAdmins = Get-MgDirectoryRoleMember -DirectoryRoleId $globalAdminRole.Id
Write-Host "Global Admin count: $($globalAdmins.Count)"
```

---

## Pillar 2 — Security (25 points)

### Scoring Checklist

| Check | Points | API/Tool | Notes |
|---|---|---|---|
| Microsoft Secure Score ≥ 70 | 8 | `GET /security/secureScores` | Use `currentScore / maxScore` ratio if absolute not applicable |
| Defender for Cloud enabled on ≥ 80% of subscriptions | 5 | ARM `GET /subscriptions/{id}/providers/Microsoft.Security/pricings` | Check `pricingTier` = `Standard` |
| Key Vault exists in each subscription with resources | 4 | ARM `GET /subscriptions/{id}/resources?$filter=resourceType eq 'Microsoft.KeyVault/vaults'` | At least one KV per subscription |
| No public-access storage accounts | 4 | ARM + Storage API | `allowBlobPublicAccess = false` on all storage accounts |
| Azure Security Center/Defender recommendations below 10 high-severity | 4 | `GET /security/secureScores` + recommendations | Filter `severity = high` |

### Graph API Queries

```http
# Secure Score (requires SecurityEvents.Read.All or SecurityActions.Read.All)
GET https://graph.microsoft.com/v1.0/security/secureScores?$top=1&$select=currentScore,maxScore,azureTenantId,createdDateTime

# Secure Score improvement actions
GET https://graph.microsoft.com/v1.0/security/secureScoreControlProfiles
    ?$select=id,title,implementationStatus,maxScore,rank,category
    &$filter=implementationStatus ne 'Ignored'
    &$orderby=maxScore desc
```

### ARM REST Queries

```http
# Defender for Cloud pricing tiers (per subscription)
GET https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.Security/pricings?api-version=2023-01-01

# Storage account public access check
GET https://management.azure.com/subscriptions/{subscriptionId}/resources
    ?$filter=resourceType eq 'Microsoft.Storage/storageAccounts'
    &api-version=2021-04-01
# Then per-account:
GET https://management.azure.com/{resourceId}?api-version=2023-01-01
    # Check properties.allowBlobPublicAccess
```

---

## Pillar 3 — Compliance (20 points)

### Scoring Checklist

| Check | Points | API | Notes |
|---|---|---|---|
| DLP policies active for Exchange, SharePoint, Teams | 6 | Compliance Center API / PowerShell | Use `Get-DlpCompliancePolicy` |
| Retention labels published to ≥ 3 locations | 6 | `GET /security/labels/retentionLabels` | Requires Compliance scope |
| Sensitivity labels defined and published | 4 | `GET /security/informationProtection/sensitivityLabels` | At least 3 labels (Public/Internal/Confidential) |
| Communication compliance policy exists | 4 | PowerShell `Get-CommunicationCompliancePolicy` | Optional but scored |

### Graph API Queries

```http
# Retention labels (requires InformationProtectionPolicy.Read.All)
GET https://graph.microsoft.com/v1.0/security/labels/retentionLabels
    ?$select=id,displayName,behaviorDuringRetentionPeriod,actionAfterRetentionPeriod,isInUse

# Sensitivity labels
GET https://graph.microsoft.com/v1.0/security/informationProtection/sensitivityLabels
    ?$select=id,name,description,isEnabled,sensitivity,applicableTo
```

### PowerShell

```powershell
# DLP compliance policies
Connect-IPPSSession
Get-DlpCompliancePolicy | Select-Object Name, Mode, Enabled, Workload |
    Format-Table -AutoSize

# Retention policies
Get-RetentionCompliancePolicy | Select-Object Name, Enabled, Mode, SharePointLocation |
    Format-Table -AutoSize
```

---

## Pillar 4 — Collaboration (15 points)

### Scoring Checklist

| Check | Points | API | Notes |
|---|---|---|---|
| Guest invite policy not set to "Anyone" | 4 | `GET /policies/authorizationPolicy` | `allowInvitesFrom` should not be `everyone` |
| External sharing for SharePoint not set to "Anyone" | 4 | SharePoint Admin PowerShell | `Get-SPOTenant | Select SharingCapability` — should not be `ExternalUserAndGuestSharing` |
| Guest access review scheduled (quarterly or more frequent) | 3 | `GET /identityGovernance/accessReviews/definitions` | Filter for guest user reviews |
| Cross-tenant access settings restrict inbound by default | 4 | `GET /policies/crossTenantAccessPolicy` | `inboundTrust` defaults should not allow all |

### Graph API Queries

```http
# Authorization policy (guest invite settings)
GET https://graph.microsoft.com/v1.0/policies/authorizationPolicy
    ?$select=allowInvitesFrom,guestUserRoleId,allowedToSignUpEmailBasedSubscriptions

# Cross-tenant access policy
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy
    ?$select=id,allowedCloudEndpoints,default

# Access reviews (guests)
GET https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions
    ?$filter=contains(displayName,'guest')
    &$select=id,displayName,status,settings
```

### PowerShell

```powershell
# SharePoint external sharing level
Connect-SPOService -Url https://contoso-admin.sharepoint.com
(Get-SPOTenant).SharingCapability
# Values: Disabled, ExistingExternalUserSharingOnly, ExternalUserSharingOnly, ExternalUserAndGuestSharing
```

---

## Pillar 5 — Governance (15 points)

### Scoring Checklist

| Check | Points | API | Notes |
|---|---|---|---|
| Microsoft 365 group naming policy configured | 3 | `GET /groupSettings` | Look for `Group.Unified` settings with `PrefixSuffixNamingRequirement` |
| Group expiration policy set (≤ 365 days) | 4 | `GET /groupLifecyclePolicies` | `managedGroupTypes` should include `All` or `Selected` |
| Administrative units used for departmental delegation | 4 | `GET /administrativeUnits` | More than 0 AUs indicates delegation maturity |
| Conditional Access named locations defined | 4 | `GET /identity/namedLocations` | At least corporate IP range defined |

### Graph API Queries

```http
# Group naming policy (tenant-wide settings)
GET https://graph.microsoft.com/v1.0/groupSettings
    ?$select=id,displayName,values

# Group lifecycle/expiration
GET https://graph.microsoft.com/v1.0/groupLifecyclePolicies
    ?$select=id,groupLifetimeInDays,managedGroupTypes,alternateNotificationEmails

# Named locations
GET https://graph.microsoft.com/v1.0/identity/namedLocations
    ?$select=id,displayName,createdDateTime
    &$orderby=displayName
```

---

## Composite Score Calculation

```typescript
interface PillarScore {
  name: string;
  score: number;
  maxScore: number;
  pct: number;
}

function computeCompositeScore(pillars: PillarScore[]): number {
  return Math.round(pillars.reduce((sum, p) => sum + p.score, 0));
}

function healthBand(score: number): string {
  if (score >= 85) return "Green — Healthy";
  if (score >= 70) return "Yellow — Needs Attention";
  if (score >= 50) return "Orange — At Risk";
  return "Red — Critical";
}

// Example output
const pillars: PillarScore[] = [
  { name: "Identity",      score: 20, maxScore: 25, pct: 80 },
  { name: "Security",      score: 18, maxScore: 25, pct: 72 },
  { name: "Compliance",    score: 14, maxScore: 20, pct: 70 },
  { name: "Collaboration", score: 10, maxScore: 15, pct: 67 },
  { name: "Governance",    score:  9, maxScore: 15, pct: 60 },
];

const total = computeCompositeScore(pillars); // 71
console.log(`Score: ${total}/100 — ${healthBand(total)}`);
```

---

## Scoring Report Format

```markdown
# Azure Tenant Health Score
**Date**: YYYY-MM-DD
**Tenant**: xxxx...yyyy
**Overall Score**: 71/100 — Yellow (Needs Attention)

## Pillar Breakdown

| Pillar | Score | Max | % | Band |
|---|---|---|---|---|
| Identity | 20 | 25 | 80% | Yellow |
| Security | 18 | 25 | 72% | Yellow |
| Compliance | 14 | 20 | 70% | Yellow |
| Collaboration | 10 | 15 | 67% | Orange |
| Governance | 9 | 15 | 60% | Orange |
| **Total** | **71** | **100** | **71%** | **Yellow** |

## Top 3 Quick Wins

1. Enable group expiration policy (adds 4 pts to Governance)
2. Restrict guest invite to "Admins only" (adds 4 pts to Collaboration)
3. Publish sensitivity labels to Exchange + SharePoint (adds 4 pts to Compliance)
```

---

## Error Codes and Throttling

| HTTP Code | Graph Code | Meaning | Remediation |
|---|---|---|---|
| 403 | `Authorization_RequestDenied` | Missing scope for endpoint | Add required scope and re-consent |
| 404 | `Request_ResourceNotFound` | Endpoint not available in tenant license tier | Skip check, assign 0 pts, note in report |
| 429 | `TooManyRequests` | Rate limited | Honor `Retry-After` header, exponential backoff |
| 503 | `ServiceNotAvailable` | Transient | Retry with backoff up to 3 times |

| Resource | Limit | Notes |
|---|---|---|
| Reports API | 2 requests/sec per app | Use paging; avoid tight polling loops |
| `secureScores` | 1 score per day | Cache the result; no need to poll repeatedly |
| Batch requests | 20 sub-requests per `$batch` call | Combine pillar checks into batch requests |
| Graph global throttle | 10,000 req / 10 min per app per tenant | Track request count in assessment loop |

---

## Common Gotchas

- **Secure Score latency**: Microsoft Secure Score is computed asynchronously. The `GET /security/secureScores?$top=1` may return a score from the previous day. Always note the `createdDateTime` in the report.
- **MFA report requires AAD Premium P1 or P2**: The `credentialUserRegistrationDetails` report is not available on free AAD tenants. If 404 is returned, assign partial credit and note the license gap.
- **CA policy state**: A policy with `state = disabled` does not contribute to protection. Only count `state = enabled` or `state = enabledForReportingButNotEnforced` (report-only mode) policies, and flag report-only as partial.
- **SharePoint sharing level via Graph**: SharePoint tenant-level sharing policy is not exposed via Graph v1.0. Use SharePoint Admin PowerShell (`Connect-SPOService`) or the SharePoint REST API at `/_api/site` as a fallback.
- **Guest user count bloat**: Tenants with many legacy B2B guests may have `userType = Guest` users who have never activated their accounts. Check `externalUserState = PendingAcceptance` and flag as stale.
