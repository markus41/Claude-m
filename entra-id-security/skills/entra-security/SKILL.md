---
name: Entra ID Security & Identity
description: >
  Deep expertise in Microsoft Entra ID (Azure AD) via Graph API — app registrations,
  service principals, conditional access policies, sign-in log analysis, risky user detection,
  permission grants auditing, and identity governance workflows.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - entra id
  - azure ad
  - app registration
  - service principal
  - conditional access
  - sign-in log
  - risky user
  - identity governance
  - permission audit
  - oauth consent
  - managed identity
  - certificate credential
  - conditional access wizard
  - plain language policy
  - ca what-if
  - mfa policy
  - block legacy auth
  - identity data risk review
---

# Entra ID Security & Identity

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#identitydata-risk-review-entra-id-security--purview-compliance--sharing-auditor).
- Apply the trigger phrases, handoff contracts, auth prerequisites, validation checkpoints, and stop conditions before escalating to the next plugin.


## Microsoft Entra ID Overview

Microsoft Entra ID (formerly Azure Active Directory) is the identity and access management service at the center of the Microsoft cloud ecosystem. It handles authentication, authorization, single sign-on, conditional access, and identity governance for Microsoft 365, Azure, and thousands of SaaS applications.

**Key concepts**:
- **Tenant**: A dedicated Entra ID instance for an organization, identified by a tenant ID (GUID) and one or more verified domains.
- **Users**: Human identities (employees, guests, B2B collaborators).
- **Groups**: Security groups and Microsoft 365 groups for access management.
- **App Registrations**: Define applications that use Entra ID for authentication.
- **Service Principals**: The local representation of an app registration in a tenant. Created automatically when an app is consented to.
- **Managed Identities**: System-assigned or user-assigned identities for Azure resources (VMs, App Services, Functions) — no credentials to manage.

## Microsoft Graph API — Identity Endpoints

Base URL: `https://graph.microsoft.com/v1.0`

### App Registrations

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List apps | GET | `/applications` |
| Create app | POST | `/applications` |
| Get app | GET | `/applications/{appId}` |
| Update app | PATCH | `/applications/{appId}` |
| Delete app | DELETE | `/applications/{appId}` |
| Add password credential | POST | `/applications/{appId}/addPassword` |
| Remove password credential | POST | `/applications/{appId}/removePassword` |
| Add key credential (certificate) | PATCH | `/applications/{appId}` with `keyCredentials` |

**Create app registration body**:
```json
{
  "displayName": "My API Backend",
  "signInAudience": "AzureADMyOrg",
  "requiredResourceAccess": [
    {
      "resourceAppId": "00000003-0000-0000-c000-000000000000",
      "resourceAccess": [
        {
          "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
          "type": "Scope"
        }
      ]
    }
  ],
  "web": {
    "redirectUris": ["https://myapp.com/auth/callback"],
    "implicitGrantSettings": {
      "enableIdTokenIssuance": false,
      "enableAccessTokenIssuance": false
    }
  }
}
```

**Sign-in audiences**: `AzureADMyOrg` (single tenant), `AzureADMultipleOrgs` (multi-tenant), `AzureADandPersonalMicrosoftAccount` (multi-tenant + consumer), `PersonalMicrosoftAccount` (consumer only).

### Service Principals

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List service principals | GET | `/servicePrincipals` |
| Create service principal | POST | `/servicePrincipals` |
| Get service principal | GET | `/servicePrincipals/{id}` |
| List app role assignments | GET | `/servicePrincipals/{id}/appRoleAssignments` |
| Grant app role | POST | `/servicePrincipals/{id}/appRoleAssignments` |

### Conditional Access Policies

Conditional access policies enforce access controls based on conditions like user, location, device, and risk level.

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List policies | GET | `/identity/conditionalAccess/policies` |
| Create policy | POST | `/identity/conditionalAccess/policies` |
| Get policy | GET | `/identity/conditionalAccess/policies/{policyId}` |
| Update policy | PATCH | `/identity/conditionalAccess/policies/{policyId}` |
| Delete policy | DELETE | `/identity/conditionalAccess/policies/{policyId}` |
| List named locations | GET | `/identity/conditionalAccess/namedLocations` |

**Create conditional access policy body**:
```json
{
  "displayName": "Require MFA for all users",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": {
      "includeUsers": ["All"]
    },
    "applications": {
      "includeApplications": ["All"]
    },
    "clientAppTypes": ["browser", "mobileAppsAndDesktopClients"]
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}
```

**Policy states**: `enabled`, `disabled`, `enabledForReportingButNotEnforced` (report-only mode — always start here).

**Common grant controls**: `mfa`, `compliantDevice`, `domainJoinedDevice`, `passwordChange`, `approvedApplication`.

**Session controls**: Sign-in frequency, persistent browser sessions, app-enforced restrictions, continuous access evaluation.

### Sign-In Logs

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List sign-in logs | GET | `/auditLogs/signIns` |
| Get sign-in | GET | `/auditLogs/signIns/{id}` |

**Useful filters**:
```
GET /auditLogs/signIns?$filter=createdDateTime ge 2026-02-01T00:00:00Z
  and status/errorCode ne 0
  &$top=50
  &$orderby=createdDateTime desc
```

Key sign-in log fields: `userPrincipalName`, `appDisplayName`, `ipAddress`, `location`, `status.errorCode`, `status.failureReason`, `conditionalAccessStatus`, `riskDetail`, `riskLevelAggregated`.

### Risk Detection

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List risky users | GET | `/identityProtection/riskyUsers` |
| Get risky user | GET | `/identityProtection/riskyUsers/{userId}` |
| Dismiss risk | POST | `/identityProtection/riskyUsers/dismiss` |
| Confirm compromised | POST | `/identityProtection/riskyUsers/confirmCompromised` |
| List risk detections | GET | `/identityProtection/riskDetections` |

**Risk levels**: `none`, `low`, `medium`, `high`, `hidden`.

**Risk detection types**: `anonymizedIPAddress`, `maliciousIPAddress`, `unfamiliarFeatures`, `malwareInfectedIPAddress`, `suspiciousIPAddress`, `leakedCredentials`, `passwordSpray`, `impossibleTravel`.

### OAuth2 Permission Grants

Audit and manage delegated permission grants (admin consent and user consent):

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List grants | GET | `/oauth2PermissionGrants` |
| Create grant | POST | `/oauth2PermissionGrants` |
| Delete grant | DELETE | `/oauth2PermissionGrants/{id}` |

### Directory Audit Logs

```
GET /auditLogs/directoryAudits?$filter=activityDisplayName eq 'Add application'
  and activityDateTime ge 2026-02-01T00:00:00Z
```

Track changes to apps, users, groups, policies, and roles.

## Authentication & Scopes

| Scope | Description |
|-------|-------------|
| `Application.ReadWrite.All` | Manage app registrations |
| `Policy.ReadWrite.ConditionalAccess` | Manage conditional access policies |
| `AuditLog.Read.All` | Read sign-in and audit logs |
| `IdentityRiskyUser.ReadWrite.All` | Read and manage risky users |
| `Directory.ReadWrite.All` | Read and write directory data |
| `DelegatedPermissionGrant.ReadWrite.All` | Manage OAuth2 permission grants |

Most of these require **application permissions** with admin consent for automation scenarios.

## Security Best Practices

- **App registrations**: Prefer certificate credentials over client secrets. Rotate secrets before expiry. Never grant `Directory.ReadWrite.All` unless absolutely necessary.
- **Conditional access**: Always deploy new policies in report-only mode first. Use named locations for trusted networks. Require MFA for all admin roles.
- **Service principals**: Follow least-privilege — grant only the specific API permissions needed. Audit `appRoleAssignments` regularly.
- **Sign-in monitoring**: Set up alerts for sign-ins from unusual locations, failed MFA attempts, and legacy auth protocol usage.
- **Risk remediation**: Configure automatic remediation policies (require MFA or password change) for medium and high risk users.
- **Permission audits**: Regularly review `oauth2PermissionGrants` to identify over-permissioned applications and revoke unnecessary grants.

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| App Registration API | `references/app-registration-api.md` | Complete endpoint reference |
| Conditional Access API | `references/conditional-access-api.md` | Policy creation, named locations, templates |
| Sign-In Logs API | `references/signin-logs-api.md` | Filters, fields, common query patterns |
| Risk Detection API | `references/risk-detection-api.md` | Risk types, remediation actions |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| Secure App Setup | `examples/secure-app-setup.md` | App registration with certificate credential and least-privilege |
| CA Policy Suite | `examples/ca-policy-suite.md` | Common conditional access policy configurations |
| Sign-In Audit | `examples/signin-audit.md` | Analyze failed sign-ins and detect anomalies |
| Permission Audit | `examples/permission-audit.md` | Find and revoke over-permissioned OAuth grants |

## Knowledge references

- `references/operational-knowledge.md` — compact API surface map, prerequisite matrix, deterministic failure remediation, limits/quotas and pagination/throttling guidance, and safe-default read-first/apply-second pattern.
