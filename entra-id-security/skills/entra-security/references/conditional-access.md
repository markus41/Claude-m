# Conditional Access — Microsoft Entra ID Reference

Conditional Access (CA) policies enforce access controls based on signals: user identity, device compliance, location, application, sign-in risk, and user risk. Every new policy should start in report-only mode.

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/identity/conditionalAccess/policies` | `Policy.Read.All` | `$filter`, `$select`, `$top` | List all CA policies |
| GET | `/identity/conditionalAccess/policies/{policyId}` | `Policy.Read.All` | — | Single policy detail |
| POST | `/identity/conditionalAccess/policies` | `Policy.ReadWrite.ConditionalAccess` | Body: policy object | Create policy |
| PATCH | `/identity/conditionalAccess/policies/{policyId}` | `Policy.ReadWrite.ConditionalAccess` | Partial update body | Update policy state or conditions |
| DELETE | `/identity/conditionalAccess/policies/{policyId}` | `Policy.ReadWrite.ConditionalAccess` | — | Delete policy |
| GET | `/identity/conditionalAccess/namedLocations` | `Policy.Read.All` | — | List named locations |
| POST | `/identity/conditionalAccess/namedLocations` | `Policy.ReadWrite.ConditionalAccess` | Body: location object | Create named location |
| PATCH | `/identity/conditionalAccess/namedLocations/{id}` | `Policy.ReadWrite.ConditionalAccess` | Partial update | Update named location |
| DELETE | `/identity/conditionalAccess/namedLocations/{id}` | `Policy.ReadWrite.ConditionalAccess` | — | Delete named location |
| POST | `/identity/conditionalAccess/policies/{id}/evaluate` | `Policy.ReadWrite.ConditionalAccess` | Body: what-if parameters | What If tool (beta) |

**Base URL:** `https://graph.microsoft.com/v1.0`

---

## Policy State Values

| State | Behavior | When to Use |
|-------|----------|-------------|
| `enabled` | Policy is fully enforced | After report-only validation |
| `disabled` | Policy is turned off | Draft, paused, or retired policies |
| `enabledForReportingButNotEnforced` | Report-only mode — matches logged, not blocked | **Always start here for new policies** |

---

## Policy Structure Reference

```typescript
interface ConditionalAccessPolicy {
  displayName: string;
  state: 'enabled' | 'disabled' | 'enabledForReportingButNotEnforced';
  conditions: {
    users?: {
      includeUsers?: string[];      // 'All' | ['userId', ...]
      excludeUsers?: string[];
      includeGroups?: string[];
      excludeGroups?: string[];
      includeRoles?: string[];      // role template IDs
      excludeRoles?: string[];
      includeGuestsOrExternalUsers?: { guestOrExternalUserTypes: string; b2bDirectConnectOutbound?: object };
    };
    applications?: {
      includeApplications?: string[];  // 'All' | ['appId', ...]
      excludeApplications?: string[];
      includeUserActions?: string[];   // e.g. 'urn:user:registersecurityinfo'
      includeAuthenticationContextClassReferences?: string[];
    };
    platforms?: {
      includePlatforms?: string[];  // 'all' | 'android' | 'iOS' | 'windows' | 'macOS' | 'linux'
      excludePlatforms?: string[];
    };
    locations?: {
      includeLocations?: string[];   // 'All' | 'AllTrusted' | namedLocationId
      excludeLocations?: string[];
    };
    signInRiskLevels?: string[];      // 'low' | 'medium' | 'high' | 'none'
    userRiskLevels?: string[];        // 'low' | 'medium' | 'high' | 'none'
    clientAppTypes?: string[];        // 'browser' | 'mobileAppsAndDesktopClients' | 'exchangeActiveSync' | 'easSupported' | 'other'
    devices?: {
      filters?: { mode: 'include' | 'exclude'; rule: string };
    };
    servicePrincipalRiskLevels?: string[];
  };
  grantControls?: {
    operator: 'AND' | 'OR';
    builtInControls?: string[];  // see built-in controls table
    customAuthenticationFactors?: string[];
    termsOfUse?: string[];
    authenticationStrength?: { id: string };
  };
  sessionControls?: {
    signInFrequency?: { isEnabled: boolean; type: 'hours' | 'days'; value: number };
    persistentBrowser?: { isEnabled: boolean; mode: 'always' | 'never' };
    cloudAppSecurity?: { isEnabled: boolean; cloudAppSecurityType: string };
    applicationEnforcedRestrictions?: { isEnabled: boolean };
    continuousAccessEvaluation?: { mode: 'strictEnforcement' | 'disabled' };
    secureSignInSession?: { isEnabled: boolean };
  };
}
```

---

## Grant Controls (builtInControls)

| Control | Description | Use Case |
|---------|-------------|----------|
| `mfa` | Require MFA | All users, all apps |
| `compliantDevice` | Require Intune-compliant device | Corporate device enforcement |
| `domainJoinedDevice` | Require Hybrid Azure AD joined device | On-prem hybrid environments |
| `approvedApplication` | Require approved client app (MAM policy) | BYOD scenarios |
| `compliantApplication` | Require app protection policy | MAM without enrollment |
| `passwordChange` | Require password change | High-risk user remediation |
| `block` | Block access entirely | Legacy auth, high-risk locations |

---

## Named Locations

### IP Range Named Location

```json
{
  "@odata.type": "#microsoft.graph.ipNamedLocation",
  "displayName": "Contoso HQ - Trusted IP Range",
  "isTrusted": true,
  "ipRanges": [
    {
      "@odata.type": "#microsoft.graph.iPv4CidrRange",
      "cidrAddress": "203.0.113.0/24"
    },
    {
      "@odata.type": "#microsoft.graph.iPv6CidrRange",
      "cidrAddress": "2001:db8::/32"
    }
  ]
}
```

### Country Named Location

```json
{
  "@odata.type": "#microsoft.graph.countryNamedLocation",
  "displayName": "Blocked Countries",
  "isTrusted": false,
  "includeUnknownCountriesAndRegions": true,
  "countriesAndRegions": ["RU", "CN", "KP", "IR"]
}
```

---

## Common CA Policy Templates (TypeScript)

### Require MFA for All Users

```typescript
const requireMfaAllUsers = {
  displayName: 'CA001 — Require MFA for All Users',
  state: 'enabledForReportingButNotEnforced',
  conditions: {
    users: { includeUsers: ['All'], excludeRoles: ['62e90394-69f5-4237-9190-012177145e10'] }, // exclude Global Admin (managed separately)
    applications: { includeApplications: ['All'] },
    clientAppTypes: ['browser', 'mobileAppsAndDesktopClients']
  },
  grantControls: {
    operator: 'OR',
    builtInControls: ['mfa']
  }
};
```

### Block Legacy Authentication

```typescript
const blockLegacyAuth = {
  displayName: 'CA002 — Block Legacy Authentication Protocols',
  state: 'enabledForReportingButNotEnforced',
  conditions: {
    users: { includeUsers: ['All'] },
    applications: { includeApplications: ['All'] },
    clientAppTypes: ['exchangeActiveSync', 'other']
  },
  grantControls: {
    operator: 'OR',
    builtInControls: ['block']
  }
};
```

### Require Compliant Device for Corporate Apps

```typescript
const requireCompliantDevice = {
  displayName: 'CA003 — Require Compliant Device for M365',
  state: 'enabledForReportingButNotEnforced',
  conditions: {
    users: {
      includeUsers: ['All'],
      excludeGroups: ['break-glass-group-id']
    },
    applications: {
      includeApplications: [
        '00000002-0000-0ff1-ce00-000000000000', // Exchange Online
        '00000003-0000-0ff1-ce00-000000000000'  // SharePoint Online
      ]
    },
    clientAppTypes: ['mobileAppsAndDesktopClients']
  },
  grantControls: {
    operator: 'AND',
    builtInControls: ['mfa', 'compliantDevice']
  }
};
```

### Sign-In Risk Policy — Require MFA for Medium+ Risk

```typescript
const signInRiskMfa = {
  displayName: 'CA004 — Require MFA for Medium/High Sign-In Risk',
  state: 'enabledForReportingButNotEnforced',
  conditions: {
    users: { includeUsers: ['All'] },
    applications: { includeApplications: ['All'] },
    signInRiskLevels: ['medium', 'high']
  },
  grantControls: {
    operator: 'OR',
    builtInControls: ['mfa']
  }
};
```

### User Risk Policy — Require Password Change for High Risk

```typescript
const userRiskPasswordChange = {
  displayName: 'CA005 — Require Password Change for High User Risk',
  state: 'enabledForReportingButNotEnforced',
  conditions: {
    users: { includeUsers: ['All'] },
    applications: { includeApplications: ['All'] },
    userRiskLevels: ['high']
  },
  grantControls: {
    operator: 'AND',
    builtInControls: ['mfa', 'passwordChange']
  }
};
```

### Admin MFA — Require MFA for All Admin Roles

```typescript
// Global Admin, Privileged Role Admin, Security Admin, etc.
const adminRoleIds = [
  '62e90394-69f5-4237-9190-012177145e10', // Global Administrator
  'e8611ab8-c189-46e8-94e1-60213ab1f814', // Privileged Role Administrator
  '194ae4cb-b126-40b2-bd5b-6091b380977d', // Security Administrator
  'b1be1c3e-b65d-4f19-8427-f6fa0d97feb9', // Conditional Access Administrator
  'f28a1f50-f6e7-4571-818b-6a12f2af6b6c', // SharePoint Administrator
];

const adminMfa = {
  displayName: 'CA006 — Require MFA for All Admin Roles',
  state: 'enabled', // Can be enforced immediately — critical policy
  conditions: {
    users: { includeRoles: adminRoleIds },
    applications: { includeApplications: ['All'] }
  },
  grantControls: {
    operator: 'OR',
    builtInControls: ['mfa']
  }
};
```

---

## What If Tool (Programmatic)

```typescript
// Evaluate which policies would apply to a specific sign-in scenario
const whatIfResult = await client
  .api('/identity/conditionalAccess/policies/{policyId}/evaluate')
  .version('beta')
  .post({
    conditionalAccessWhatIfSubject: {
      '@odata.type': '#microsoft.graph.userSubject',
      userId: 'user-object-id'
    },
    conditionalAccessWhatIfConditions: {
      servicePrincipalId: null,
      ipAddress: '203.0.113.42',
      userAction: null,
      country: null,
      devicePlatform: 'windows',
      clientAppType: 'browser',
      trustedIp: false,
      signInRiskLevel: 'none',
      userRiskLevel: 'none',
      applicationId: '00000002-0000-0ff1-ce00-000000000000'
    }
  });
```

---

## CA Gaps Analysis (PowerShell)

```powershell
Connect-MgGraph -Scopes "Policy.Read.All"

# List all CA policies with their states
$policies = Get-MgIdentityConditionalAccessPolicy
$policies | Select DisplayName, State, @{
    N='IncludeUsers'; E={$_.Conditions.Users.IncludeUsers -join ','}
}, @{
    N='GrantControls'; E={$_.GrantControls.BuiltInControls -join ','}
} | Format-Table -AutoSize

# Check for enabled policies (not report-only)
$enabled = $policies | Where-Object { $_.State -eq 'enabled' }
Write-Host "Enabled policies: $($enabled.Count) / $($policies.Count)"

# Check for MFA coverage
$mfaPolicies = $policies | Where-Object {
    $_.GrantControls.BuiltInControls -contains 'mfa' -and
    $_.State -eq 'enabled'
}
Write-Host "Policies enforcing MFA: $($mfaPolicies.Count)"

# Check legacy auth block
$legacyBlock = $policies | Where-Object {
    $_.Conditions.ClientAppTypes -contains 'exchangeActiveSync' -and
    $_.GrantControls.BuiltInControls -contains 'block' -and
    $_.State -eq 'enabled'
}
Write-Host "Legacy auth blocked: $($legacyBlock.Count -gt 0)"
```

---

## Session Controls Reference

| Control | Description | Recommended Value |
|---------|-------------|------------------|
| Sign-in frequency | Force re-authentication after X hours | 8-24 hours for standard users |
| Persistent browser session | Browser session cookie duration | `never` for unmanaged devices |
| App-enforced restrictions | SharePoint/Exchange enforce their own restrictions | Enable for unmanaged devices |
| Cloud App Security | MCAS session proxy | Enable for sensitive data access |
| Continuous access evaluation (CAE) | Real-time token revocation | `strictEnforcement` for high-security |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidPolicyConditions` | Conflicting or missing conditions | Review `conditions` object for null required fields |
| 403 `Forbidden` | Missing `Policy.ReadWrite.ConditionalAccess` | Consent the permission in Entra app registration |
| 404 `PolicyNotFound` | Policy ID not found | Use GET to list all policies and confirm ID |
| 409 `PolicyConflict` | Policy name already exists | Use unique display names |
| 429 `TooManyRequests` | Graph API throttled | Implement exponential backoff |
| `BreakGlassExcluded` (logical) | Break-glass accounts not excluded | Always exclude emergency access accounts |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| CA policies per tenant | 195 | Includes disabled policies |
| Named locations per tenant | 195 | IP range + country locations combined |
| IP ranges per named location | 2,000 CIDR entries | — |
| Countries per named location | All countries | ISO 3166-1 alpha-2 codes |
| Users excluded per policy | 2,000 direct + groups | Use groups for large exclusion lists |
| Policies evaluated per sign-in | All enabled + report-only | Large policy sets can slow sign-in |

---

## Common Patterns and Gotchas

1. **Break-glass accounts** — Always exclude emergency access accounts (break-glass) from ALL CA policies. Failure to do so risks complete lockout. Break-glass accounts should use strong passwords, not FIDO2 (no CA enforced on MFA method).

2. **Report-only first** — Never deploy a new CA policy directly to `enabled` state. Monitor `Sign-ins` workbook in Entra for 5-7 days to identify users who would be blocked (look for `conditionalAccessStatus = 'reportOnlyFailure'`).

3. **Policy evaluation order** — CA policies have no priority order — ALL matching policies are evaluated. A grant control from one policy cannot override a block from another. Block always wins.

4. **Guest user scoping** — `includeUsers: 'All'` includes guests. If you want guest-specific policies, use `includeGuestsOrExternalUsers` with `guestOrExternalUserTypes: 'internalGuest,b2bCollaborationGuest'`.

5. **Service principal CA** — CA policies do not apply to service principals by default. Use Workload Identity Conditional Access (Entra ID Premium P2) for service principal policies.

6. **Device filter vs platform condition** — Use device filters for granular device attribute matching (trust type, extension attributes, compliant status). Device platform condition only filters by OS type.

7. **Authentication strength vs MFA** — `authenticationStrength` (requires Entra ID P1+) is more granular than `mfa` — it specifies which authentication methods are acceptable (e.g., FIDO2 only, no SMS).

8. **Exchange ActiveSync scope** — EAS clients that do not support modern authentication match `clientAppTypes: 'exchangeActiveSync'`. Always create a dedicated block policy for this app type.

9. **Token binding (CAE)** — Continuous Access Evaluation provides real-time session revocation for CAE-capable clients (Outlook, Teams, Edge). Non-CAE clients use standard 1-hour token lifetime.

10. **Licensing** — Basic CA requires Entra ID P1 (included in M365 E3/Business Premium). Risk-based CA (sign-in risk, user risk conditions) requires Entra ID P2 (included in M365 E5).
