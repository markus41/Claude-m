# Identity Protection — Microsoft Entra ID Reference

Microsoft Entra ID Protection detects and responds to identity risks using machine learning signals. It provides risk-based CA policies, risky user/sign-in reports, and automated remediation (MFA challenge, password reset, account block).

**License requirement:** Entra ID Premium P2 (included in M365 E5 or EMS E5)

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/identityProtection/riskyUsers` | `IdentityRiskyUser.Read.All` | `$filter=riskLevel eq 'high'`, `$top`, `$orderby` | List risky users |
| GET | `/identityProtection/riskyUsers/{userId}` | `IdentityRiskyUser.Read.All` | — | Single risky user |
| GET | `/identityProtection/riskyUsers/{userId}/history` | `IdentityRiskyUser.Read.All` | — | Risk state change history |
| POST | `/identityProtection/riskyUsers/dismiss` | `IdentityRiskyUser.ReadWrite.All` | Body: `{ "userIds": ["id1", "id2"] }` | Dismiss risk for users |
| POST | `/identityProtection/riskyUsers/confirmCompromised` | `IdentityRiskyUser.ReadWrite.All` | Body: `{ "userIds": ["id1"] }` | Confirm compromised (sets to High) |
| GET | `/identityProtection/riskyServicePrincipals` | `IdentityRiskyServicePrincipal.Read.All` | `$filter`, `$orderby` | Risky service principals (P2) |
| POST | `/identityProtection/riskyServicePrincipals/dismiss` | `IdentityRiskyServicePrincipal.ReadWrite.All` | Body: `{ "servicePrincipalIds": [...] }` | Dismiss SP risk |
| GET | `/identityProtection/riskDetections` | `IdentityRiskEvent.Read.All` | `$filter=riskLevel eq 'high'`, `$orderby=detectedDateTime desc` | Risk detection events |
| GET | `/identityProtection/riskDetections/{id}` | `IdentityRiskEvent.Read.All` | — | Single detection |
| GET | `/identityProtection/servicePrincipalRiskDetections` | `IdentityRiskEvent.Read.All` | — | SP risk detections (P2) |

**Base URL:** `https://graph.microsoft.com/v1.0`

---

## Risk Level Values

| Level | Description | Recommended Action |
|-------|-------------|-------------------|
| `none` | No detected risk | No action needed |
| `low` | Low-confidence signals | Monitor; apply MFA challenge via CA |
| `medium` | Moderate signals with context | MFA challenge + review |
| `high` | Strong signals — likely compromised | Block + force password reset |
| `hidden` | Risk evaluated but hidden from view | Requires Entra ID P2 to view |
| `unknownFutureValue` | Future API value | Treat as `hidden` |

---

## Risk State Values

| State | Description |
|-------|-------------|
| `atRisk` | Active risk — not remediated |
| `confirmedSafe` | Analyst determined sign-in was safe |
| `remediated` | User completed MFA or password change |
| `dismissed` | Risk dismissed by administrator |
| `atRisk` | Active risk (returned for new detections) |
| `confirmedCompromised` | Admin confirmed user is compromised |

---

## Risk Detection Types

| Detection Type | Description | Typical Risk Level |
|---------------|-------------|-------------------|
| `anonymizedIPAddress` | Sign-in from Tor or known anonymizer | Medium |
| `maliciousIPAddress` | Sign-in from IP with malware activity | High |
| `unfamiliarFeatures` | Sign-in properties unusual for this user | Low-Medium |
| `impossibleTravel` | Sign-ins from two locations impossible to travel between | Medium-High |
| `leakedCredentials` | Credentials found in dark web dumps | High |
| `passwordSpray` | Password spray attack pattern | High |
| `newCountry` | Sign-in from a country never seen for this user | Low |
| `suspiciousIPAddress` | IP flagged in threat intelligence | Medium |
| `malwareLinkedIPAddress` | Sign-in from malware-infected network | Medium |
| `investigationsThreatIntelligence` | Microsoft Threat Intel match | High |
| `generic` | Other ML-based detections | Variable |
| `adminConfirmedSigninCompromised` | Admin manually confirmed | High |
| `mcasSuspiciousInboxManipulationRules` | MCAS: suspicious forwarding rule | Medium-High |

---

## Query Risky Users (TypeScript)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

// Get all high-risk users
async function getHighRiskUsers(client: Client) {
  const result = await client
    .api('/identityProtection/riskyUsers')
    .filter("riskLevel eq 'high' and riskState eq 'atRisk'")
    .select('id,userPrincipalName,riskLevel,riskState,riskLastUpdatedDateTime,riskDetail')
    .orderby('riskLastUpdatedDateTime desc')
    .top(100)
    .get();

  return result.value;
}

// Get risk history for a specific user
async function getUserRiskHistory(client: Client, userId: string) {
  const history = await client
    .api(`/identityProtection/riskyUsers/${userId}/history`)
    .orderby('activity/eventDateTime desc')
    .get();

  return history.value.map((h: any) => ({
    date: h.activity?.eventDateTime,
    riskLevel: h.riskLevel,
    riskState: h.riskState,
    detectionType: h.activity?.riskEventType,
    initiatedBy: h.initiatedBy
  }));
}

// Dismiss risk for false positives
async function dismissRisk(client: Client, userIds: string[]) {
  await client
    .api('/identityProtection/riskyUsers/dismiss')
    .post({ userIds });
}

// Confirm users as compromised (escalates to High risk)
async function confirmCompromised(client: Client, userIds: string[]) {
  await client
    .api('/identityProtection/riskyUsers/confirmCompromised')
    .post({ userIds });
}
```

---

## Query Risk Detections (TypeScript)

```typescript
// Get recent high-risk detections
async function getRecentRiskDetections(client: Client, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const result = await client
    .api('/identityProtection/riskDetections')
    .filter(`riskLevel eq 'high' and detectedDateTime ge ${since}`)
    .select('id,userPrincipalName,riskType,riskLevel,detectedDateTime,ipAddress,location,additionalInfo')
    .orderby('detectedDateTime desc')
    .top(200)
    .get();

  return result.value;
}

// Paginate through all detections
async function getAllRiskDetections(client: Client): Promise<any[]> {
  const allDetections: any[] = [];
  let url = '/identityProtection/riskDetections?$top=500&$orderby=detectedDateTime desc';

  while (url) {
    const page = await client.api(url).get();
    allDetections.push(...page.value);
    url = page['@odata.nextLink'] || null;
  }

  return allDetections;
}
```

---

## Identity Protection in Log Analytics (KQL)

Sign-in risk data flows into Log Analytics via the `SigninLogs` table when the Entra diagnostic settings are configured.

```kql
// High-risk sign-ins in last 7 days
SigninLogs
| where TimeGenerated > ago(7d)
| where RiskLevelAggregated == "high"
| where ResultType == 0  // successful sign-ins
| project TimeGenerated, UserPrincipalName, IPAddress, Location, AppDisplayName, RiskDetail, RiskLevelAggregated
| order by TimeGenerated desc

// Sign-ins blocked by Identity Protection risk policy
SigninLogs
| where TimeGenerated > ago(24h)
| where ConditionalAccessStatus == "failure"
| where RiskLevelAggregated in ("medium", "high")
| summarize Count=count(), Apps=make_set(AppDisplayName) by UserPrincipalName, RiskDetail
| order by Count desc

// Impossible travel detections
SigninLogs
| where TimeGenerated > ago(7d)
| extend RiskEvents = todynamic(RiskEventTypes_V2)
| where RiskEvents has "impossibleTravel"
| project TimeGenerated, UserPrincipalName, IPAddress, Location, RiskEvents

// Password spray pattern detection
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType == 50126  // Invalid username or password
| summarize FailCount=count(), DistinctUsers=dcount(UserPrincipalName) by IPAddress, bin(TimeGenerated, 5m)
| where DistinctUsers > 10  // Many unique users from same IP = spray
| order by FailCount desc
```

---

## Risky Sign-In Report (PowerShell)

```powershell
Connect-MgGraph -Scopes "IdentityRiskyUser.Read.All","IdentityRiskEvent.Read.All","AuditLog.Read.All"

# Get all current risky users with risk details
$riskyUsers = Get-MgRiskyUser -Filter "riskState eq 'atRisk'" -All
$report = $riskyUsers | Select-Object UserPrincipalName, RiskLevel, RiskState, RiskLastUpdatedDateTime, RiskDetail

# Export to CSV
$report | Export-Csv -Path ".\risky-users-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation

# Get risk detections for last 30 days
$startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-ddTHH:mm:ssZ")
$detections = Get-MgRiskDetection -Filter "detectedDateTime ge $startDate and riskLevel eq 'high'" -All
$detections | Select-Object UserPrincipalName, RiskType, RiskLevel, DetectedDateTime, IPAddress |
    Sort-Object DetectedDateTime -Descending |
    Format-Table -AutoSize

# Bulk dismiss false positives (list of UPNs)
$upnsToSafe = @("user1@contoso.com", "user2@contoso.com")
foreach ($upn in $upnsToSafe) {
    $user = Get-MgRiskyUser -Filter "userPrincipalName eq '$upn'"
    if ($user) {
        Invoke-MgDismissRiskyUser -UserIds @($user.Id)
        Write-Host "Dismissed risk for: $upn"
    }
}
```

---

## Risk Remediation Policies via Conditional Access

Risk-based CA policies automate remediation at sign-in time:

```typescript
// Sign-in risk policy: MFA required for medium/high sign-in risk
const signInRiskPolicy = {
  displayName: 'IDP — Require MFA for Medium/High Sign-In Risk',
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

// User risk policy: block high-risk users until password changed
const userRiskPolicy = {
  displayName: 'IDP — Block High User Risk (require password change)',
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

---

## Trusted Locations to Reduce False Positives

```typescript
// Mark corporate office IPs as trusted to reduce impossible travel false positives
const trustedLocation = await client
  .api('/identity/conditionalAccess/namedLocations')
  .post({
    '@odata.type': '#microsoft.graph.ipNamedLocation',
    displayName: 'Corporate HQ — Trusted',
    isTrusted: true,
    ipRanges: [
      { '@odata.type': '#microsoft.graph.iPv4CidrRange', cidrAddress: '203.0.113.0/24' }
    ]
  });

// Exclude trusted locations from sign-in risk policy
// to avoid prompting employees on-premises
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidUserId` | User ID not found in risky users | Verify user exists and has risk state != 'none' |
| 401 `Unauthorized` | Missing or expired token | Re-authenticate with P2-enabled account |
| 403 `Forbidden` | Missing P2 license or permission | Ensure tenant has Entra ID P2 and permission is granted |
| 404 `RiskyUserNotFound` | User not in risky users list | User may have been remediated or risk level is 'none' |
| 429 `TooManyRequests` | Graph throttled | Implement exponential backoff |
| `InsufficientLicense` | Tenant lacks Entra ID P2 | Upgrade to P2 or EMS E5 |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Risk detection retention | 90 days (standard) / 30 days (free) | Risk detections older than retention are purged |
| Risky user report retention | 30 days for users with `none` risk | Active risky users retained until remediated |
| RiskDetections query max | 500 records per page | Paginate with `@odata.nextLink` |
| Dismiss operation batch | 60 users per call | Batch large dismissals |
| Risk detection types | 22+ types | New types added without API version change |
| Log Analytics export | Requires diagnostic settings | Configure `SigninLogs` export in Entra |

---

## Common Patterns and Gotchas

1. **P2 license required** — Identity Protection is exclusively a Entra ID P2 feature. Tenants with only P1 can read risk data from sign-in logs but cannot use the `/identityProtection/` API endpoints or risk-based CA policies.

2. **Risk detection latency** — Detections are not real-time. Offline risk detections (e.g., leaked credentials) may appear hours or days after the actual event. Real-time detections (e.g., atypical travel) appear within minutes.

3. **Dismiss vs confirm safe** — `dismiss` removes the risk without commenting on whether it was a true or false positive. `confirmSafe` explicitly marks the sign-in as safe and improves the model. Use `confirmSafe` when a sign-in is verified legitimate.

4. **confirmCompromised escalates** — Calling `confirmCompromised` sets the user's risk to `high` and forces password reset on next sign-in. Use only after confirming a breach — this may disrupt the user immediately.

5. **Risk state after password change** — When a user with `userRiskLevel: high` completes SSPR (self-service password reset), their risk state transitions to `remediated` automatically. No admin action needed.

6. **Legacy auth and risk** — Legacy authentication clients (Basic Auth EAS, POP, IMAP) do not support risk signals. These clients bypass Identity Protection. Block legacy auth with CA to ensure all sign-ins are risk-evaluated.

7. **Exported logs vs API** — The `/identityProtection/riskDetections` API is the authoritative source. Log Analytics `SigninLogs` has a 5-30 minute ingestion delay. Use the API for current state; Log Analytics for historical KQL hunting.

8. **Workload Identity Protection** — `riskyServicePrincipals` and `servicePrincipalRiskDetections` are separate from user risk and require additional configuration. Workload Identity Protection is a separate Entra add-on.

9. **Risk in non-interactive sign-ins** — Non-interactive sign-ins (service-to-service tokens, refresh tokens) also generate risk signals. Monitor `NonInteractiveSigninLogs` in Log Analytics alongside `SigninLogs`.

10. **Feedback loop** — Admin confirmations (safe/compromised) feed back into the ML model and improve detection accuracy over time. Establish a process for analysts to confirm all true/false positives.
