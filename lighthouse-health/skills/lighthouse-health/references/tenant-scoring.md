# Tenant Health Scoring — Microsoft 365 Lighthouse Reference

Tenant health scoring provides MSPs and CSPs with a structured, quantitative view of each customer tenant's security posture, compliance, identity hygiene, collaboration health, and cost efficiency. This reference defines the scoring dimensions, algorithm, and cross-tenant data collection patterns.

---

## Azure Lighthouse — Delegated Resource Management

Azure Lighthouse enables service providers to manage customer Azure resources at scale without requiring per-tenant logins.

### REST API Endpoints (Delegated Access)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/tenants` | `ManagedTenants.Read.All` | `$filter`, `$top` | List all Lighthouse-managed tenants |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/credentialUserRegistrationsSummaries` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | MFA registration per tenant |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/managedDeviceCompliances` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | Device compliance per tenant |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/riskyUsers` | `ManagedTenants.Read.All` | `$filter=tenantId eq '{id}'` | Risky users per tenant |
| GET | `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/managementTemplateStepTenantSummaries` | `ManagedTenants.Read.All` | — | Baseline deployment status |
| GET | `https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships` | `DelegatedAdminRelationship.Read.All` | `$filter=status eq 'active'` | GDAP relationships |
| GET | `https://graph.microsoft.com/v1.0/security/secureScore` | `SecurityEvents.Read.All` | — | Microsoft Secure Score (per-tenant via GDAP) |
| GET | `https://graph.microsoft.com/v1.0/security/secureScores?$top=1` | `SecurityEvents.Read.All` | — | Latest Secure Score |

---

## Health Score Dimensions

### Scoring Architecture

```typescript
interface TenantHealthScore {
  tenantId: string;
  tenantName: string;
  scoreDate: string;

  // Five dimensions, each 0-100
  dimensions: {
    security: DimensionScore;
    compliance: DimensionScore;
    identity: DimensionScore;
    collaboration: DimensionScore;
    cost: DimensionScore;
  };

  // Composite weighted score
  overallScore: number;  // 0-100
  overallRating: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';

  // Trend vs previous month
  trendDelta: number;   // Positive = improved
  previousScore: number;
}

interface DimensionScore {
  score: number;         // 0-100
  weight: number;        // Dimension weight in composite
  metrics: MetricScore[];
  topIssue: string | null;
}

interface MetricScore {
  name: string;
  value: number | string;
  score: number;         // 0-100
  weight: number;        // Metric weight within dimension
  status: 'green' | 'yellow' | 'red';
  details: string;
}
```

---

## Scoring Dimensions and Weights

| Dimension | Weight | Key Metrics |
|-----------|--------|-------------|
| Security | 35% | Secure Score, MFA coverage, admin MFA, legacy auth block, CA policy count, risky users |
| Identity | 25% | Conditional Access coverage, guest access reviews, stale accounts, SSPR registration |
| Compliance | 20% | Purview audit enabled, DLP policies, sensitivity labels, retention policies |
| Collaboration | 10% | External sharing policy, Teams guest access, overshared links count |
| Cost | 10% | License utilization rate, inactive licenses, downgrade opportunities |

---

## Scoring Algorithm (TypeScript)

```typescript
function calculateDimensionScore(metrics: MetricScore[]): number {
  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
  const weightedScore = metrics.reduce(
    (sum, m) => sum + (m.score * m.weight),
    0
  );
  return Math.round(weightedScore / totalWeight);
}

function calculateOverallScore(
  dimensions: Record<string, DimensionScore>
): number {
  const weights = {
    security: 0.35,
    identity: 0.25,
    compliance: 0.20,
    collaboration: 0.10,
    cost: 0.10
  };

  const weightedTotal = Object.entries(dimensions).reduce(
    (sum, [key, dim]) => sum + (dim.score * (weights[key as keyof typeof weights] || 0)),
    0
  );

  return Math.round(weightedTotal);
}

function scoreToRating(
  score: number
): 'critical' | 'poor' | 'fair' | 'good' | 'excellent' {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 30) return 'poor';
  return 'critical';
}
```

---

## Security Dimension Metric Scoring

```typescript
function scoreSecurityDimension(data: SecurityData): DimensionScore {
  const metrics: MetricScore[] = [
    // Secure Score (Microsoft calculated)
    {
      name: 'Microsoft Secure Score',
      value: data.secureScore,
      score: Math.min(100, Math.round((data.secureScore / data.maxScore) * 100)),
      weight: 30,
      status: data.secureScore / data.maxScore >= 0.75 ? 'green'
            : data.secureScore / data.maxScore >= 0.5 ? 'yellow' : 'red',
      details: `${data.secureScore} / ${data.maxScore} points`
    },
    // MFA coverage
    {
      name: 'MFA Coverage (All Users)',
      value: `${data.mfaRegisteredPct}%`,
      score: data.mfaRegisteredPct >= 95 ? 100
           : data.mfaRegisteredPct >= 80 ? 60
           : data.mfaRegisteredPct >= 60 ? 30 : 0,
      weight: 25,
      status: data.mfaRegisteredPct >= 95 ? 'green'
             : data.mfaRegisteredPct >= 80 ? 'yellow' : 'red',
      details: `${data.mfaRegisteredPct}% of users have MFA registered`
    },
    // Admin MFA
    {
      name: 'Admin MFA Coverage',
      value: `${data.adminMfaPct}%`,
      score: data.adminMfaPct === 100 ? 100
           : data.adminMfaPct >= 90 ? 60 : 0,
      weight: 20,
      status: data.adminMfaPct === 100 ? 'green'
             : data.adminMfaPct >= 90 ? 'yellow' : 'red',
      details: `${data.adminMfaPct}% of admins have MFA registered`
    },
    // Legacy auth blocked
    {
      name: 'Legacy Authentication Blocked',
      value: data.legacyAuthBlocked ? 'Yes' : 'No',
      score: data.legacyAuthBlocked ? 100 : 0,
      weight: 15,
      status: data.legacyAuthBlocked ? 'green' : 'red',
      details: data.legacyAuthBlocked
        ? 'CA policy blocking legacy auth is enabled'
        : 'No CA policy blocking legacy authentication protocols'
    },
    // Risky users
    {
      name: 'Active Risky Users',
      value: data.activeRiskyUsers,
      score: data.activeRiskyUsers === 0 ? 100
           : data.activeRiskyUsers <= 3 ? 60
           : data.activeRiskyUsers <= 10 ? 30 : 0,
      weight: 10,
      status: data.activeRiskyUsers === 0 ? 'green'
             : data.activeRiskyUsers <= 3 ? 'yellow' : 'red',
      details: `${data.activeRiskyUsers} users with active risk state`
    }
  ];

  return {
    score: calculateDimensionScore(metrics),
    weight: 35,
    metrics,
    topIssue: metrics.filter(m => m.status === 'red')[0]?.name || null
  };
}
```

---

## Cross-Tenant Data Collection Pattern

```typescript
// Collect health data for all managed tenants in parallel (with throttling)
async function collectAllTenantHealth(
  partnerClient: Client
): Promise<TenantHealthScore[]> {
  // 1. Get all managed tenants
  const tenantsResponse = await partnerClient
    .api('/beta/tenantRelationships/managedTenants/tenants')
    .get();

  const tenants = tenantsResponse.value;

  // 2. Process in batches of 5 to avoid throttling
  const BATCH_SIZE = 5;
  const results: TenantHealthScore[] = [];

  for (let i = 0; i < tenants.length; i += BATCH_SIZE) {
    const batch = tenants.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(tenant => collectTenantHealthData(partnerClient, tenant.tenantId, tenant.displayName))
    );
    results.push(...batchResults);
    // Respect rate limits between batches
    if (i + BATCH_SIZE < tenants.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return results;
}

// Collect data for a single tenant
async function collectTenantHealthData(
  partnerClient: Client,
  tenantId: string,
  tenantName: string
): Promise<any> {
  // Use $filter to get data for specific tenant
  const [mfa, devices, riskyUsers, compliance] = await Promise.all([
    partnerClient
      .api(`/beta/tenantRelationships/managedTenants/credentialUserRegistrationsSummaries`)
      .filter(`tenantId eq '${tenantId}'`)
      .get(),
    partnerClient
      .api(`/beta/tenantRelationships/managedTenants/managedDeviceCompliances`)
      .filter(`tenantId eq '${tenantId}'`)
      .get(),
    partnerClient
      .api(`/beta/tenantRelationships/managedTenants/riskyUsers`)
      .filter(`tenantId eq '${tenantId}'`)
      .get(),
    partnerClient
      .api(`/beta/tenantRelationships/managedTenants/managementTemplateStepTenantSummaries`)
      .filter(`tenantId eq '${tenantId}'`)
      .get()
  ]);

  return { tenantId, tenantName, mfa, devices, riskyUsers, compliance };
}
```

---

## Score History Tracking

```typescript
// Store score history in Azure Table Storage or Cosmos DB
interface ScoreHistoryEntry {
  partitionKey: string;  // tenantId
  rowKey: string;        // ISO date string YYYY-MM-DD
  overallScore: number;
  securityScore: number;
  identityScore: number;
  complianceScore: number;
  collaborationScore: number;
  costScore: number;
  scoreJson: string;     // Full JSON snapshot
  createdAt: string;
}

// Calculate month-over-month trend
function calculateTrend(
  current: TenantHealthScore,
  history: ScoreHistoryEntry[]
): { delta: number; direction: 'up' | 'down' | 'flat' } {
  if (history.length === 0) return { delta: 0, direction: 'flat' };

  // Sort by date descending, get previous month's entry
  const previous = history
    .sort((a, b) => b.rowKey.localeCompare(a.rowKey))
    .find(h => h.rowKey < current.scoreDate);

  if (!previous) return { delta: 0, direction: 'flat' };

  const delta = current.overallScore - previous.overallScore;
  return {
    delta,
    direction: delta > 2 ? 'up' : delta < -2 ? 'down' : 'flat'
  };
}
```

---

## Benchmark Definitions

| Score Range | Rating | Description |
|-------------|--------|-------------|
| 85-100 | Excellent | Industry-leading security posture; all baselines deployed |
| 70-84 | Good | Strong posture with minor gaps; remediation plan in place |
| 50-69 | Fair | Significant gaps; some critical controls missing |
| 30-49 | Poor | Multiple critical issues; immediate action required |
| 0-29 | Critical | Severely exposed; emergency remediation required |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 403 `GDAP Expired` | Delegated admin relationship expired | Renew GDAP relationship and re-assign roles |
| 404 `TenantNotOnboarded` | Tenant not onboarded to Lighthouse | Verify tenant meets eligibility (M365 Business Premium, E3, or E5) |
| 429 `TooManyRequests` | Lighthouse API throttled | Add 2-second delay between tenant queries; reduce batch size |
| 403 `MissingManagedTenantsScope` | Missing `ManagedTenants.Read.All` | Consent scope in partner app registration |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Managed tenants per Lighthouse | 1,000 | — |
| Concurrent GDAP-authenticated calls | Limited by GDAP quotas | Batch and rate-limit appropriately |
| Lighthouse data refresh | Varies by signal | MFA summary: ~4 hours; devices: ~24 hours |
| Score history storage | Depends on storage solution | Azure Table Storage: cheap and scalable |
| Tenant onboarding requirements | E3/E5/Business Premium license | At least one qualifying license in customer tenant |

---

## Common Patterns and Gotchas

1. **Lighthouse data latency** — Lighthouse aggregates data on a schedule (4-24 hour refresh). For real-time scoring of a specific tenant, query the per-tenant API directly via GDAP token rather than the Lighthouse aggregation endpoints.

2. **Score comparison between tenants** — Only compare tenants with similar size and industry profiles. A 50-user SMB and a 10,000-user enterprise have very different risk profiles. Consider normalizing scores by company size tier.

3. **Secure Score varies by products** — Microsoft Secure Score includes controls for all licensed products (MDE, MDO, Entra, Azure). Tenants with E1 licenses will have fewer available controls and a lower maximum score than E5 tenants. Normalize by maxScore, not raw points.

4. **GDAP role scope for scoring** — Scoring data collection requires Security Reader (for Secure Score, risky users) + Reports Reader (for MFA, device compliance) + Global Reader (for CA policies). Request only these roles — not Security Administrator.

5. **Tenant eligibility for Lighthouse** — Not all tenants can be managed via Lighthouse. Tenants must have at least one M365 Business Premium, E3, or E5 user license and be delegated via GDAP. Check `tenantStatusInformation.workloadStatuses` for eligibility.

6. **Score weighting is subjective** — The weights in the scoring algorithm (35% security, 25% identity, etc.) are recommendations. Customize weights based on customer industry (e.g., healthcare: 50% compliance, 30% security) and customer risk appetite.

7. **Historical baseline** — The first month of scoring establishes the baseline. Do not present trend data until you have at least 2 months of history. Communicate this to customers upfront.

8. **Remediation impact modeling** — When presenting the score to customers, show the projected score improvement for each recommended remediation. "Enabling CA MFA policy would increase your score from 52 to 71" is more compelling than an abstract list of recommendations.

9. **Tenant tags for grouping** — Use Lighthouse tenant tags to group tenants by tier (Gold/Silver/Bronze) or industry (Healthcare/Finance/Government). This allows filtering the comparison matrix to peer groups.

10. **Automated scoring runbook** — Deploy the scoring collection as an Azure Automation runbook on a monthly schedule. Store results in Azure Table Storage. Send email summaries via Graph to the partner team and to customer-facing reports.
