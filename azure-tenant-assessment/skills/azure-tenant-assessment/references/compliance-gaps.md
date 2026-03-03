# Compliance Gaps

Reference for identifying, categorizing, and prioritizing compliance gaps in an Azure/M365 tenant against CIS Microsoft 365 Foundations Benchmark, NIST CSF, and ISO 27001 controls.

---

## Gap Assessment Overview

A compliance gap is a control that is either absent, misconfigured, or insufficiently enforced relative to an established benchmark. This reference covers:

1. Gap identification via Microsoft Graph and ARM APIs
2. Mapping to CIS, NIST CSF, and ISO 27001 frameworks
3. Priority matrix (impact × effort)
4. Automated assessment script patterns
5. Gap report format

---

## CIS Microsoft 365 Foundations Benchmark — Key Controls

The CIS M365 Benchmark v3.0 defines controls across accounts, application permissions, data management, audit, and storage. The following table maps the most common gaps to Graph API checks.

### Identity and Access Controls (CIS Section 1)

| CIS Control | ID | Graph API Check | Endpoint | Required Scope |
|---|---|---|---|---|
| Ensure MFA is enabled for all users | 1.1.1 | `isMfaRegistered eq false` count | `GET /reports/credentialUserRegistrationDetails` | `Reports.Read.All` |
| Ensure Legacy Auth is blocked | 1.1.4 | CA policy blocking `exchangeActiveSync` and `other` clients | `GET /identity/conditionalAccessPolicies` | `Policy.Read.All` |
| Ensure no service accounts have interactive sign-in | 1.2.2 | Check users with `accountEnabled = true` + no MFA + `jobTitle` contains "svc" | `GET /users?$filter=...` | `User.Read.All` |
| Ensure Global Admin role has fewer than 5 members | 1.3.1 | Member count of role `62e90394-69f5-4237-9190-012177145e10` | `GET /directoryRoles/{id}/members` | `Directory.Read.All` |
| Ensure admin accounts are cloud-only | 1.3.3 | Check `onPremisesSyncEnabled` for role members | `GET /directoryRoles/{id}/members?$select=id,onPremisesSyncEnabled` | `Directory.Read.All` |
| Ensure password expiration is disabled | 1.4.1 | `passwordPolicies eq 'DisablePasswordExpiration'` | `GET /domains/{id}` | `Domain.Read.All` |

### Data Protection Controls (CIS Section 2)

| CIS Control | ID | Check | Endpoint | Notes |
|---|---|---|---|---|
| Ensure DLP policies are enabled | 2.1.1 | DLP policy count and mode | PowerShell `Get-DlpCompliancePolicy` | `IPPSSession` required |
| Ensure SharePoint external sharing is restricted | 2.1.3 | `SharingCapability` != `ExternalUserAndGuestSharing` | SPO Admin PowerShell | Graph does not expose this |
| Ensure sensitivity labels are applied | 2.1.5 | Label count + publication status | `GET /security/informationProtection/sensitivityLabels` | `InformationProtectionPolicy.Read.All` |
| Ensure OneDrive sync restrictions exist | 2.2.1 | Tenant-wide allowed sync domains | SPO Admin PowerShell `Get-SPOTenantSyncClientRestriction` | — |

### Audit and Logging Controls (CIS Section 3)

| CIS Control | ID | Check | Endpoint | Notes |
|---|---|---|---|---|
| Ensure audit log search is enabled | 3.1.1 | Unified audit log enabled | `Get-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled` | Exchange PowerShell |
| Ensure Microsoft 365 Defender audit retention ≥ 180 days | 3.1.2 | Audit log retention setting | Compliance Center PowerShell | — |
| Ensure sign-in logs are exported to Log Analytics | 3.2.1 | Diagnostic settings on AAD | `GET /subscriptions/{id}/providers/microsoft.aadiam/diagnosticSettings` | ARM Reader |

---

## NIST CSF Mapping

| NIST CSF Function | Category | CIS Control Examples | Gap Signal |
|---|---|---|---|
| Identify (ID) | Asset Management | CIS 1.3.1 — admin role inventory | Too many Global Admins; no AU delegation |
| Identify (ID) | Governance | CIS 2.1.1 — DLP coverage | No DLP policies or report-only mode only |
| Protect (PR) | Access Control | CIS 1.1.1 — MFA | MFA coverage below 80% |
| Protect (PR) | Awareness & Training | — | No security awareness campaigns tracked |
| Protect (PR) | Data Security | CIS 2.1.5 — sensitivity labels | No published labels |
| Detect (DE) | Security Continuous Monitoring | CIS 3.1.1 — audit log | Unified audit log disabled |
| Respond (RS) | Response Planning | Incident runbooks | No SOAR playbooks / Sentinel rules |
| Recover (RC) | Recovery Planning | Backup / retention | No backup policy for M365 data |

---

## ISO 27001:2022 Control Mapping

| ISO 27001 Control | Control Name | Graph Gap Check | Example Finding |
|---|---|---|---|
| A.5.15 | Access control | CA policy coverage, MFA | No CA policy enforcing MFA |
| A.5.16 | Identity management | Stale accounts, guest lifecycle | Users inactive >90 days still enabled |
| A.5.17 | Authentication information | Password policy | Password expiry enabled (weak) |
| A.5.18 | Access rights | Admin role over-assignment | 8 Global Admins (CIS recommends ≤ 5) |
| A.8.15 | Logging | Unified audit log | Audit log search disabled |
| A.8.24 | Cryptography | Key Vault adoption | Secrets in app config, not Key Vault |
| A.8.25 | Secure development | — | No Dev/Test isolation from Production |

---

## Graph API Gap Assessment Queries

### Check 1: Legacy Authentication Not Blocked

```http
GET https://graph.microsoft.com/v1.0/identity/conditionalAccessPolicies
    ?$select=id,displayName,state,conditions,grantControls
    &$filter=state eq 'enabled'
```

Post-process: find policies where `conditions.clientAppTypes` includes `exchangeActiveSync` or `other` with block grant. If none found → gap.

### Check 2: Guest Invite Setting

```http
GET https://graph.microsoft.com/v1.0/policies/authorizationPolicy
    ?$select=allowInvitesFrom,guestUserRoleId
```

Gap if `allowInvitesFrom` is `everyone` or `adminsAndGuestInviters` (CIS requires `adminsGuestInvitersAndAllMemberUsers` or stricter).

### Check 3: Active Users Without MFA

```http
GET https://graph.microsoft.com/v1.0/reports/credentialUserRegistrationDetails
    ?$filter=isMfaRegistered eq false and isMfaCapable eq false
    &$select=userPrincipalName,isMfaRegistered,isMfaCapable,isAdmin
```

### Check 4: Stale Guest Users (inactive >90 days)

```http
GET https://graph.microsoft.com/v1.0/users
    ?$filter=userType eq 'Guest' and signInActivity/lastSignInDateTime le 2025-11-25T00:00:00Z
    &$select=id,displayName,mail,userPrincipalName,signInActivity,externalUserState
    &$count=true
```

Header: `ConsistencyLevel: eventual` required.

### Check 5: No Group Expiration Policy

```http
GET https://graph.microsoft.com/v1.0/groupLifecyclePolicies
    ?$select=id,groupLifetimeInDays,managedGroupTypes
```

Gap if response is empty array `{"value": []}`.

### Check 6: Risky Sign-ins (last 7 days)

```http
GET https://graph.microsoft.com/v1.0/identityProtection/riskyUsers
    ?$filter=riskLevel eq 'high' or riskLevel eq 'medium'
    &$select=id,userPrincipalName,riskLevel,riskState,riskLastUpdatedDateTime
    &$top=50
```

---

## Automated Assessment Script Pattern

```typescript
interface GapCheck {
  id: string;
  name: string;
  cisId: string;
  severity: "critical" | "high" | "medium" | "low";
  check: (client: Client) => Promise<boolean>; // true = gap found
  remediation: string;
}

async function runGapAssessment(client: Client, checks: GapCheck[]): Promise<GapResult[]> {
  const results: GapResult[] = [];

  for (const check of checks) {
    try {
      const gapFound = await check.check(client);
      results.push({
        id: check.id,
        name: check.name,
        cisId: check.cisId,
        severity: check.severity,
        gapFound,
        remediation: gapFound ? check.remediation : undefined,
      });
    } catch (err) {
      results.push({
        id: check.id,
        name: check.name,
        cisId: check.cisId,
        severity: check.severity,
        gapFound: false,
        error: String(err),
      });
    }
  }

  return results;
}
```

---

## Priority Matrix

Prioritize remediation by multiplying Impact × Effort (lower effort = higher priority for same impact):

| Gap | Impact (1–5) | Effort (1–5) | Priority Score | Action |
|---|---|---|---|---|
| MFA not enforced | 5 | 2 | 10 | Quick win — enforce CA policy |
| Legacy auth not blocked | 5 | 1 | 5 | Quick win — add CA block rule |
| Audit log disabled | 5 | 1 | 5 | Quick win — 1 PowerShell command |
| DLP policies missing | 4 | 3 | 12 | Medium — requires policy design |
| No sensitivity labels | 4 | 3 | 12 | Medium — requires label taxonomy |
| Group expiration missing | 3 | 1 | 3 | Quick win — 1 API call |
| Guest invite too permissive | 4 | 1 | 4 | Quick win — 1 PATCH call |
| Excess Global Admins | 5 | 2 | 10 | Medium — requires stakeholder coordination |
| No Key Vault adoption | 4 | 4 | 16 | Long-term — requires app changes |
| No CA for risky sign-ins | 5 | 2 | 10 | Quick win — template available |

**Priority Score** = Impact × Effort (lower = address first for quick wins; use Impact alone to prioritize high-impact regardless of effort)

---

## Gap Report Format

```markdown
# Compliance Gap Assessment
**Date**: YYYY-MM-DD
**Tenant**: xxxx...yyyy
**Benchmarks**: CIS M365 v3.0, NIST CSF 2.0, ISO 27001:2022

## Executive Summary

| Severity | Gap Count |
|---|---|
| Critical | 2 |
| High | 5 |
| Medium | 4 |
| Low | 3 |
| **Total** | **14** |

## Gap Detail

| # | Control | CIS ID | Severity | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | Legacy auth not blocked | 1.1.4 | Critical | CA policy missing client app type block | Add CA policy blocking exchangeActiveSync + other |
| 2 | Audit log disabled | 3.1.1 | Critical | Unified audit log search is off | Run `Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true` |
| 3 | MFA coverage 74% | 1.1.1 | High | 26% of licensed users lack MFA | Enable per-user MFA or CA policy |
```

---

## Error Codes and Limits

| Code | Meaning | Remediation |
|---|---|---|
| 403 | `Authorization_RequestDenied` | Missing admin consent for scope |
| 404 | Endpoint/feature not available | Tenant may lack required license (e.g., AAD P2 for PIM) |
| 429 | `TooManyRequests` | Batch checks; respect `Retry-After` |
| 400 | Invalid `$filter` for `$count` | Add `ConsistencyLevel: eventual` header for advanced filter queries |

| Resource | Limit | Notes |
|---|---|---|
| Audit log search API | 30-day default retention (free) | AAD P1/P2 extends to 30 days; use Log Analytics for longer |
| `credentialUserRegistrationDetails` | Requires AAD P1 | 404 on free tier |
| `riskyUsers` | Requires Identity Protection (AAD P2) | 404 on P1 or free |
| `conditionalAccessPolicies` | No throttle limit documented | Use `$select` to reduce payload size |

---

## Common Gotchas

- **Report-only CA policies**: A policy in `enabledForReportingButNotEnforced` state does not block anything. Count these as partial controls and flag in the gap report.
- **`$count` with `$filter`**: Graph advanced filter queries (e.g., filtering on `signInActivity`) require the `ConsistencyLevel: eventual` request header plus `$count=true` in the URL or it returns a 400 error.
- **Guest invite policy vs B2B settings**: `authorizationPolicy.allowInvitesFrom` controls who can send invitations. The cross-tenant access policy (`/policies/crossTenantAccessPolicy`) controls inbound collaboration trust separately — both must be checked.
- **Unified audit log vs Defender audit**: The unified audit log (Exchange compliance) and Microsoft 365 Defender advanced hunting are separate systems with separate retention. Check both.
- **ISO 27001 applicability**: Not all ISO 27001 controls are technically assessable via API. Document non-technical controls (A.6 — people, A.7 — physical) as "out of scope for automated assessment."
