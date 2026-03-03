# Health Metrics — Microsoft 365 Lighthouse Reference

This reference covers the individual metric APIs used to populate each dimension of the tenant health score. It focuses on per-metric data collection patterns, threshold calibration, and the Graph API calls required to retrieve Secure Score, MFA coverage, Conditional Access coverage, DLP policy coverage, and license utilization.

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `https://graph.microsoft.com/v1.0/security/secureScore` | `SecurityEvents.Read.All` | — | Current Secure Score (partner tenant context) |
| GET | `https://graph.microsoft.com/v1.0/security/secureScores?$top=1` | `SecurityEvents.Read.All` | `$top=1` | Most recent Secure Score entry |
| GET | `https://graph.microsoft.com/v1.0/security/secureScores?$top=90` | `SecurityEvents.Read.All` | `$top=90` | 90-day score history |
| GET | `https://graph.microsoft.com/v1.0/security/secureScoreControlProfiles` | `SecurityEvents.Read.All` | `$filter`, `$select` | All control definitions with max points |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/credentialUserRegistrationsSummaries` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | MFA coverage per tenant |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/conditionalAccessPolicyCoverages` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | CA policy coverage signal |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/managementTemplateStepTenantSummaries` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | Baseline step status (DLP, retention, etc.) |
| GET | `https://graph.microsoft.com/v1.0/subscribedSkus` | `Organization.Read.All` | — | License inventory for utilization metric (per-tenant via GDAP) |
| GET | `https://graph.microsoft.com/v1.0/users?$select=signInActivity,assignedLicenses,accountEnabled` | `User.Read.All` + `AuditLog.Read.All` | `$filter`, `$count=true` | License utilization vs sign-in activity |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/riskyUsers` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | Active risky users count |
| GET | `https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies` | `Policy.Read.All` | `$filter=state eq 'enabled'` | Enabled CA policies (per-tenant via GDAP) |
| GET | `https://graph.microsoft.com/v1.0/informationProtection/policy/labels` | `InformationProtectionPolicy.Read.All` | — | Sensitivity labels (per-tenant via GDAP) |
| GET | `https://graph.microsoft.com/beta/informationProtection/sensitivityLabels` | `InformationProtectionPolicy.Read.All` | — | Beta: includes auto-labeling settings |

---

## Secure Score Metric

### Secure Score Response Schema

```typescript
interface SecureScore {
  id: string;
  azureTenantId: string;
  activeUserCount: number;
  createdDateTime: string;       // ISO date of the score snapshot
  currentScore: number;          // Current total points earned
  maxScore: number;              // Maximum achievable points
  enabledServices: string[];     // Licensed services included in scoring
  licensedUserCount: number;
  controlScores: Array<{
    controlName: string;         // Control identifier
    controlCategory: string;     // 'Identity' | 'Data' | 'Device' | 'Apps' | 'Infrastructure'
    score: number;               // Points earned for this control (0 or max)
    maxScore: number;            // Maximum points for this control
    description: string;
    implementationStatus: 'Implemented' | 'PartiallyImplemented' | 'PlannedTbd' | 'Default' | 'NotApplicable';
  }>;
}
```

### Retrieve and Normalize Secure Score (TypeScript)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

interface SecureScoreMetric {
  tenantId: string;
  currentScore: number;
  maxScore: number;
  normalizedScore: number;       // 0-100 normalized
  scoreDate: string;
  topWeakControls: Array<{
    controlName: string;
    category: string;
    maxScore: number;
    implementationStatus: string;
  }>;
}

async function getSecureScoreMetric(
  tenantClient: Client,
  tenantId: string
): Promise<SecureScoreMetric> {
  // Get the most recent Secure Score
  const response = await tenantClient
    .api('/security/secureScores')
    .top(1)
    .get();

  if (!response.value || response.value.length === 0) {
    // Secure Score not available (E1 tenants may not have it)
    return {
      tenantId,
      currentScore: 0,
      maxScore: 0,
      normalizedScore: 0,
      scoreDate: new Date().toISOString(),
      topWeakControls: []
    };
  }

  const score = response.value[0] as SecureScore;

  // Find controls with zero score (not implemented) ordered by impact
  const unimplementedControls = score.controlScores
    .filter(c => c.score < c.maxScore && c.implementationStatus !== 'NotApplicable')
    .sort((a, b) => b.maxScore - a.maxScore)
    .slice(0, 5)
    .map(c => ({
      controlName: c.controlName,
      category: c.controlCategory,
      maxScore: c.maxScore,
      implementationStatus: c.implementationStatus
    }));

  return {
    tenantId,
    currentScore: score.currentScore,
    maxScore: score.maxScore,
    normalizedScore: score.maxScore > 0
      ? Math.round((score.currentScore / score.maxScore) * 100)
      : 0,
    scoreDate: score.createdDateTime,
    topWeakControls: unimplementedControls
  };
}
```

---

## MFA Coverage Metric

### MFA Registration Summary Schema

```typescript
interface CredentialUserRegistrationsSummary {
  id: string;
  tenantId: string;
  tenantDisplayName: string;
  totalUserCount: number;
  mfaRegisteredUserCount: number;
  mfaExcludedUserCount: number;           // Users excluded from MFA (break-glass, etc.)
  securityDefaultsEnabled: boolean;
  mfaConditionalAccessPolicyState: 'enabled' | 'enabledForReportingButNotEnforced' | 'disabled';
  adminsMfaRegisteredCount: number;
  adminsMfaNotRegisteredCount: number;
  adminsCount: number;
  lastRefreshedDateTime: string;
}
```

### Calculate MFA Coverage Metrics (TypeScript)

```typescript
interface MFACoverageMetric {
  tenantId: string;
  totalUsers: number;
  mfaRegisteredPct: number;          // All users
  adminMfaRegisteredPct: number;     // Admins only
  mfaEnforcementStatus: 'CA-enforced' | 'security-defaults' | 'report-only' | 'not-configured';
  score: number;                     // 0-100
  status: 'green' | 'yellow' | 'red';
}

async function getMFACoverageMetric(
  partnerClient: Client,
  tenantId: string
): Promise<MFACoverageMetric> {
  const response = await partnerClient
    .api('/beta/tenantRelationships/managedTenants/credentialUserRegistrationsSummaries')
    .filter(`tenantId eq '${tenantId}'`)
    .get();

  const summary = response.value?.[0] as CredentialUserRegistrationsSummary;

  if (!summary) {
    return {
      tenantId,
      totalUsers: 0,
      mfaRegisteredPct: 0,
      adminMfaRegisteredPct: 0,
      mfaEnforcementStatus: 'not-configured',
      score: 0,
      status: 'red'
    };
  }

  const mfaRegisteredPct = summary.totalUserCount > 0
    ? Math.round((summary.mfaRegisteredUserCount / summary.totalUserCount) * 100)
    : 0;

  const adminMfaRegisteredPct = summary.adminsCount > 0
    ? Math.round((summary.adminsMfaRegisteredCount / summary.adminsCount) * 100)
    : 100; // No admins = not applicable

  // Determine enforcement status
  let mfaEnforcementStatus: MFACoverageMetric['mfaEnforcementStatus'];
  if (summary.mfaConditionalAccessPolicyState === 'enabled') {
    mfaEnforcementStatus = 'CA-enforced';
  } else if (summary.securityDefaultsEnabled) {
    mfaEnforcementStatus = 'security-defaults';
  } else if (summary.mfaConditionalAccessPolicyState === 'enabledForReportingButNotEnforced') {
    mfaEnforcementStatus = 'report-only';
  } else {
    mfaEnforcementStatus = 'not-configured';
  }

  // Score: user MFA weighted 60%, admin MFA weighted 40%
  const userScore = mfaRegisteredPct >= 95 ? 100
    : mfaRegisteredPct >= 80 ? 60
    : mfaRegisteredPct >= 60 ? 30 : 0;

  const adminScore = adminMfaRegisteredPct === 100 ? 100
    : adminMfaRegisteredPct >= 90 ? 60 : 0;

  const combinedScore = Math.round((userScore * 0.6) + (adminScore * 0.4));

  return {
    tenantId,
    totalUsers: summary.totalUserCount,
    mfaRegisteredPct,
    adminMfaRegisteredPct,
    mfaEnforcementStatus,
    score: combinedScore,
    status: mfaRegisteredPct >= 95 && adminMfaRegisteredPct === 100 ? 'green'
          : mfaRegisteredPct >= 80 && adminMfaRegisteredPct >= 90 ? 'yellow' : 'red'
  };
}
```

---

## Conditional Access Coverage Metric

### Retrieve CA Coverage via Lighthouse (TypeScript)

```typescript
interface ConditionalAccessCoverage {
  id: string;
  tenantId: string;
  tenantDisplayName: string;
  conditionalAccessPolicyState: string;
  latestPolicySyncDateTime: string;
}

interface CACoverageMetric {
  tenantId: string;
  enabledPoliciesCount: number;
  hasLegacyAuthBlock: boolean;
  hasMFARequirement: boolean;
  hasHighRiskUserBlock: boolean;
  coverageScore: number;       // 0-100 based on core policies present
  status: 'green' | 'yellow' | 'red';
}

async function getCACoverageMetric(
  partnerClient: Client,
  tenantGdapClient: Client,   // Authenticated to customer tenant via GDAP
  tenantId: string
): Promise<CACoverageMetric> {
  // Get CA policies directly from customer tenant via GDAP
  const policies = await tenantGdapClient
    .api('/identity/conditionalAccess/policies')
    .filter("state eq 'enabled'")
    .select('id,displayName,conditions,grantControls,sessionControls,state')
    .get();

  const enabledPolicies = policies.value || [];
  const enabledCount = enabledPolicies.length;

  // Detect core policy patterns by inspecting policy conditions/grants
  let hasLegacyAuthBlock = false;
  let hasMFARequirement = false;
  let hasHighRiskUserBlock = false;

  for (const policy of enabledPolicies) {
    const conditions = policy.conditions || {};
    const grant = policy.grantControls || {};

    // Legacy auth block: targets legacy auth client apps + blocks access
    const clientAppTypes: string[] = conditions.clientAppTypes || [];
    const isBlockPolicy = grant.operator === 'OR' && grant.builtInControls?.includes('block');
    if (isBlockPolicy && (clientAppTypes.includes('exchangeActiveSync') || clientAppTypes.includes('other'))) {
      hasLegacyAuthBlock = true;
    }

    // MFA requirement: grant includes MFA for broad user scope
    const users = conditions.users || {};
    const grantControls: string[] = grant.builtInControls || [];
    const isAllOrLargeGroup = !users.includeUsers?.length || users.includeUsers?.includes('All');
    if (grantControls.includes('mfa') && isAllOrLargeGroup) {
      hasMFARequirement = true;
    }

    // High risk user block: targets high sign-in risk + blocks
    const signInRiskLevels: string[] = conditions.signInRiskLevels || [];
    const userRiskLevels: string[] = conditions.userRiskLevels || [];
    if (isBlockPolicy && (signInRiskLevels.includes('high') || userRiskLevels.includes('high'))) {
      hasHighRiskUserBlock = true;
    }
  }

  // Score based on presence of core policies
  let coverageScore = 0;
  if (enabledCount >= 1) coverageScore += 20;      // Any CA policy
  if (enabledCount >= 3) coverageScore += 20;      // Multiple policies
  if (hasLegacyAuthBlock) coverageScore += 25;     // Legacy auth blocked
  if (hasMFARequirement) coverageScore += 25;      // MFA enforced
  if (hasHighRiskUserBlock) coverageScore += 10;   // Risk-based blocking

  return {
    tenantId,
    enabledPoliciesCount: enabledCount,
    hasLegacyAuthBlock,
    hasMFARequirement,
    hasHighRiskUserBlock,
    coverageScore,
    status: coverageScore >= 80 ? 'green'
           : coverageScore >= 50 ? 'yellow' : 'red'
  };
}
```

---

## DLP Policy Coverage Metric

### DLP Coverage via Lighthouse Baseline Summaries (TypeScript)

Lighthouse management templates include DLP baseline steps. Use the template summary to detect DLP deployment status across tenants without requiring Purview permissions on the customer tenant.

```typescript
interface ManagementTemplateStepTenantSummary {
  id: string;
  tenantId: string;
  tenantDisplayName: string;
  managementTemplateId: string;
  managementTemplateStepId: string;
  managementTemplateStepDisplayName: string;
  assignedToTeamId: string | null;
  endDateTime: string | null;
  completionStatus: 'complete' | 'inProgress' | 'notStarted' | 'failed';
}

interface DLPCoverageMetric {
  tenantId: string;
  dlpBaselineDeployed: boolean;
  dlpStepsCompleted: number;
  dlpStepsTotal: number;
  completionPct: number;
  score: number;
  status: 'green' | 'yellow' | 'red';
}

// Known DLP-related template step display name keywords
const DLP_STEP_KEYWORDS = ['dlp', 'data loss', 'information protection', 'sensitivity label', 'purview'];

async function getDLPCoverageMetric(
  partnerClient: Client,
  tenantId: string
): Promise<DLPCoverageMetric> {
  const response = await partnerClient
    .api('/beta/tenantRelationships/managedTenants/managementTemplateStepTenantSummaries')
    .filter(`tenantId eq '${tenantId}'`)
    .get();

  const steps = (response.value || []) as ManagementTemplateStepTenantSummary[];

  // Filter to DLP-related steps
  const dlpSteps = steps.filter(s =>
    DLP_STEP_KEYWORDS.some(kw =>
      s.managementTemplateStepDisplayName.toLowerCase().includes(kw)
    )
  );

  const completedDLPSteps = dlpSteps.filter(s => s.completionStatus === 'complete').length;
  const dlpStepsTotal = dlpSteps.length;
  const completionPct = dlpStepsTotal > 0
    ? Math.round((completedDLPSteps / dlpStepsTotal) * 100)
    : 0;

  // If no DLP steps found in templates, tenant may not have DLP baselines configured
  const dlpBaselineDeployed = completedDLPSteps > 0;

  const score = completionPct >= 100 ? 100
              : completionPct >= 75 ? 75
              : completionPct >= 50 ? 50
              : dlpBaselineDeployed ? 25 : 0;

  return {
    tenantId,
    dlpBaselineDeployed,
    dlpStepsCompleted: completedDLPSteps,
    dlpStepsTotal,
    completionPct,
    score,
    status: completionPct >= 80 ? 'green'
           : completionPct >= 50 ? 'yellow' : 'red'
  };
}
```

---

## License Utilization Metric

### Calculate License Utilization (TypeScript)

```typescript
interface LicenseUtilizationMetric {
  tenantId: string;
  totalPurchasedSeats: number;
  totalAssignedSeats: number;
  utilizationPct: number;
  unusedSeats: number;
  estimatedMonthlyWaste: number;    // USD
  score: number;
  status: 'green' | 'yellow' | 'red';
  overProvisionedSkus: Array<{
    skuPartNumber: string;
    purchased: number;
    assigned: number;
    unused: number;
    unusedPct: number;
  }>;
}

// Approximate monthly costs per SKU part number (list price)
const SKU_MONTHLY_COST: Record<string, number> = {
  'ENTERPRISEPREMIUM': 57.00,
  'ENTERPRISEPACK': 36.00,
  'STANDARDPACK': 8.00,
  'SPB': 22.00,
  'O365_BUSINESS_PREMIUM': 12.50,
  'O365_BUSINESS_ESSENTIALS': 6.00,
  'SPE_F1': 8.00,
  'M365_F1': 2.25,
  'EXCHANGESTANDARD': 4.00,
  'EXCHANGEENTERPRISE': 8.00,
};

async function getLicenseUtilizationMetric(
  tenantGdapClient: Client,
  tenantId: string
): Promise<LicenseUtilizationMetric> {
  const response = await tenantGdapClient
    .api('/subscribedSkus')
    .select('skuId,skuPartNumber,prepaidUnits,consumedUnits,capabilityStatus')
    .get();

  const skus = (response.value || []).filter(
    (s: any) => s.capabilityStatus === 'Enabled' && s.prepaidUnits?.enabled > 0
  );

  let totalPurchased = 0;
  let totalAssigned = 0;
  let estimatedWaste = 0;
  const overProvisioned: LicenseUtilizationMetric['overProvisionedSkus'] = [];

  for (const sku of skus) {
    const purchased: number = sku.prepaidUnits.enabled;
    const assigned: number = sku.consumedUnits;
    const unused = purchased - assigned;
    const unusedPct = Math.round((unused / purchased) * 100);

    totalPurchased += purchased;
    totalAssigned += assigned;

    if (unusedPct > 5) {
      const monthlyCost = SKU_MONTHLY_COST[sku.skuPartNumber] || 0;
      estimatedWaste += unused * monthlyCost;

      overProvisioned.push({
        skuPartNumber: sku.skuPartNumber,
        purchased,
        assigned,
        unused,
        unusedPct
      });
    }
  }

  const utilizationPct = totalPurchased > 0
    ? Math.round((totalAssigned / totalPurchased) * 100)
    : 100;

  const unusedSeats = totalPurchased - totalAssigned;

  // Score: high utilization = high score (efficient procurement)
  const score = utilizationPct >= 95 ? 100
              : utilizationPct >= 85 ? 75
              : utilizationPct >= 70 ? 50
              : utilizationPct >= 50 ? 25 : 0;

  return {
    tenantId,
    totalPurchasedSeats: totalPurchased,
    totalAssignedSeats: totalAssigned,
    utilizationPct,
    unusedSeats,
    estimatedMonthlyWaste: Math.round(estimatedWaste * 100) / 100,
    score,
    status: utilizationPct >= 90 ? 'green'
           : utilizationPct >= 75 ? 'yellow' : 'red',
    overProvisionedSkus: overProvisioned.sort((a, b) => b.unused - a.unused)
  };
}
```

---

## SLA and Support Volume Metrics

SLA metrics are not available directly through the Lighthouse or Graph API. They must be sourced from the MSP's own ticketing or PSA (Professional Services Automation) system. The following pattern shows how to integrate PSA data with health scores.

```typescript
interface SLAMetric {
  tenantId: string;
  openTickets: number;
  breachedSLAs: number;           // Tickets past SLA threshold
  avgResolutionTimeHours: number;
  criticalOpenCount: number;
  score: number;
  status: 'green' | 'yellow' | 'red';
}

// PSA data is provided externally (ConnectWise, Autotask, Halo PSA, etc.)
interface PSATenantData {
  tenantId: string;
  openTickets: number;
  breachedSLAs: number;
  avgResolutionTimeHours: number;
  criticalOpenCount: number;
}

function calculateSLAMetric(psaData: PSATenantData): SLAMetric {
  // Score based on SLA breach rate and resolution time
  const breachScore = psaData.breachedSLAs === 0 ? 100
    : psaData.breachedSLAs <= 2 ? 70
    : psaData.breachedSLAs <= 5 ? 40 : 0;

  const resolutionScore = psaData.avgResolutionTimeHours <= 4 ? 100
    : psaData.avgResolutionTimeHours <= 8 ? 75
    : psaData.avgResolutionTimeHours <= 24 ? 50
    : psaData.avgResolutionTimeHours <= 48 ? 25 : 0;

  const criticalScore = psaData.criticalOpenCount === 0 ? 100
    : psaData.criticalOpenCount === 1 ? 50 : 0;

  const score = Math.round(
    (breachScore * 0.4) + (resolutionScore * 0.4) + (criticalScore * 0.2)
  );

  return {
    ...psaData,
    score,
    status: score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red'
  };
}
```

---

## Metric Score Thresholds Reference

| Metric | Data Source | Green Threshold | Yellow Threshold | Red Threshold |
|--------|------------|-----------------|------------------|---------------|
| Secure Score (normalized) | `GET /security/secureScores` | >= 75% of max | 50-74% of max | < 50% of max |
| MFA Coverage (all users) | Lighthouse credentialSummaries | >= 95% | 80-94% | < 80% |
| Admin MFA Coverage | Lighthouse credentialSummaries | 100% | 90-99% | < 90% |
| CA Policy Count | `GET /identity/conditionalAccess/policies` | >= 3 enabled | 1-2 enabled | 0 enabled |
| Legacy Auth Blocked | CA policy analysis | Yes | Report-only | No |
| Active Risky Users | Lighthouse riskyUsers | 0 | 1-3 | > 3 |
| Device Compliance Rate | Lighthouse managedDeviceCompliances | >= 95% | 80-94% | < 80% |
| DLP Baseline Deployment | Lighthouse templateStepSummaries | 100% steps complete | 50-99% | < 50% |
| License Utilization | `GET /subscribedSkus` (via GDAP) | >= 90% | 75-89% | < 75% |
| Sensitivity Labels Published | `GET /informationProtection/policy/labels` | >= 1 published | — | None |
| SLA Breach Rate | PSA integration | 0 breaches | 1-2 breaches | >= 3 breaches |

---

## Composite Metric Collection (TypeScript)

```typescript
interface AllMetrics {
  tenantId: string;
  tenantName: string;
  collectedAt: string;
  secureScore: SecureScoreMetric;
  mfaCoverage: MFACoverageMetric;
  caCoverage: CACoverageMetric;
  dlpCoverage: DLPCoverageMetric;
  licenseUtilization: LicenseUtilizationMetric;
  sla?: SLAMetric;
}

async function collectAllMetrics(
  partnerClient: Client,
  tenantGdapClient: Client,
  tenantId: string,
  tenantName: string,
  psaData?: PSATenantData
): Promise<AllMetrics> {
  // Collect metrics in parallel where possible
  const [secureScore, mfaCoverage, caCoverage, dlpCoverage, licenseUtilization] =
    await Promise.all([
      getSecureScoreMetric(tenantGdapClient, tenantId),
      getMFACoverageMetric(partnerClient, tenantId),
      getCACoverageMetric(partnerClient, tenantGdapClient, tenantId),
      getDLPCoverageMetric(partnerClient, tenantId),
      getLicenseUtilizationMetric(tenantGdapClient, tenantId)
    ]);

  return {
    tenantId,
    tenantName,
    collectedAt: new Date().toISOString(),
    secureScore,
    mfaCoverage,
    caCoverage,
    dlpCoverage,
    licenseUtilization,
    sla: psaData ? calculateSLAMetric(psaData) : undefined
  };
}
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 403 `SecurityEvents.Read.All Missing` | Cannot read Secure Score | Consent `SecurityEvents.Read.All` on partner app registration |
| 403 `GDAP Role Missing` | Security Reader GDAP role not assigned | Add Security Reader to GDAP relationship access assignment |
| 403 `ManagedTenants.Read.All Missing` | Cannot access Lighthouse aggregated data | Consent `ManagedTenants.Read.All` on partner app |
| 404 `SecureScore Not Available` | Tenant does not have a Secure Score | Tenant may not have qualifying licenses (requires M365 E3/E5 or Defender) |
| 404 `Tenant Not Found in Lighthouse` | Tenant not onboarded to Lighthouse | Verify GDAP relationship and tenant eligibility (E3/E5/Business Premium) |
| 403 `InsufficientLicense` | `signInActivity` requires Entra P1 | Fall back to Exchange last logon time and report API activity data |
| 429 `TooManyRequests` | Graph throttled on metric collection | Stagger metric collection per tenant; add 1-2 second delay between tenants |
| 500 `Lighthouse Refresh Pending` | Data not yet refreshed for tenant | Retry after 4-hour Lighthouse refresh window; do not fail the entire scan |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Secure Score history | 90 days via `$top=90` | Older snapshots not queryable via API |
| Lighthouse data refresh — MFA summary | ~4 hours | Not real-time |
| Lighthouse data refresh — device compliance | ~24 hours | Plan for eventual consistency |
| Lighthouse data refresh — risky users | Near real-time via sync | Still uses Lighthouse API throttle limits |
| `subscribedSkus` response | All SKUs in one call | No pagination required |
| CA policy `$filter` on customer tenant | Requires GDAP with Policy.Read.All | Partner app must have this scope consented in customer tenant |
| Sensitivity labels per tenant | Returned in single page | No pagination needed for label list |
| `signInActivity` retention | 30 days (Entra ID P1) | Not available if tenant has only Entra ID Free |

---

## Common Patterns and Gotchas

1. **Secure Score varies by licensed services** — A tenant with only Exchange Online Plan 1 will have a much lower max score than an E5 tenant. Always normalize against `maxScore` (percentage), not raw points. Do not compare raw scores across tenants with different license tiers.

2. **Lighthouse credential summary is not real-time** — The `credentialUserRegistrationsSummaries` data is refreshed every ~4 hours by Lighthouse. For same-day MFA changes, use `GET /reports/credentialUserRegistrationDetails` directly on the customer tenant via GDAP.

3. **CA coverage analysis is approximate via Lighthouse** — The `conditionalAccessPolicyCoverages` Lighthouse endpoint provides a high-level signal. For accurate per-policy analysis (does it actually block legacy auth, cover all users, etc.), query the customer tenant's `GET /identity/conditionalAccess/policies` directly via GDAP with Policy.Read.All.

4. **DLP baseline detection via template summaries is conservative** — Not all DLP configurations map to Lighthouse management templates. A customer may have DLP policies configured outside of Lighthouse baselines. For definitive DLP coverage, query `GET /beta/security/dataLossPreventionPolicies` directly on the customer tenant with `InformationProtectionPolicy.Read.All` via GDAP.

5. **License utilization scoring is directional** — The scoring incentivizes high utilization, but 100% utilization can also mean no buffer for growth. Consider flagging tenants at 98-100% utilization separately as "at capacity" rather than rewarding them with the maximum score.

6. **Risky users count includes medium-risk** — The Lighthouse `riskyUsers` endpoint returns all non-dismissed risky users. Filter by `riskLevel eq 'high'` for the most meaningful security metric. Including medium-risk users inflates the count for larger tenants.

7. **No SLA/ticket volume API in M365** — Microsoft does not expose support ticket volume or SLA metrics via the Graph API. These metrics must come from your PSA tool (ConnectWise, Autotask, HaloPSA, etc.) and mapped to tenant IDs. Ensure your PSA has consistent tenant ID tagging before attempting to join data.

8. **Secure Score not available for all tenants** — Tenants without Microsoft 365 Business Premium, E3, or E5 licenses may not have Secure Score calculated. The API returns an empty array. Handle gracefully by returning a null/zero score and flagging the tenant as "score unavailable."

9. **CA policy analysis requires GDAP with Policy.Read.All** — This scope requires explicit consent in the customer tenant's admin portal, not just the partner's delegated admin relationship. Confirm this scope is consented during tenant onboarding.

10. **Batch metric collection for 50+ tenants** — When collecting metrics across many tenants, process in batches of 5-10 with 2-3 second delays between batches. Each tenant requires multiple API calls (Secure Score + MFA + CA + DLP + licensing), and parallel execution across all tenants simultaneously will hit Graph throttle limits quickly.
