# Remediation Roadmap

Methodology for converting compliance gap findings into a structured, phased remediation roadmap — including quick wins, 30/60/90-day milestones, rollback procedures, stakeholder communication, and re-assessment cadence.

---

## Roadmap Generation Methodology

A remediation roadmap converts raw gap findings (from `compliance-gaps.md` and `tenant-health-scoring.md`) into an actionable plan ordered by:

1. **Severity** — Critical gaps first
2. **Quick-win ratio** — High impact / low effort items within each severity tier
3. **Dependencies** — Some controls must be sequenced (e.g., audit log before risky sign-in alerting)
4. **Organizational change risk** — Changes that affect end-user experience are staged with communication

---

## Quick Wins vs Long-Term Projects

### Quick Wins (1–4 hours, zero user impact)

| Action | Impact | Time | API / Command |
|---|---|---|---|
| Block legacy authentication | Critical | 30 min | Add CA policy via `POST /identity/conditionalAccessPolicies` |
| Enable Unified Audit Log | Critical | 5 min | `Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true` |
| Set group expiration policy | High | 15 min | `POST /groupLifecyclePolicies` |
| Restrict guest invite to Admins | High | 5 min | `PATCH /policies/authorizationPolicy` |
| Remove excess Global Admins | High | 30 min | `DELETE /directoryRoles/{id}/members/{id}/$ref` |
| Enable Security Defaults (if no CA) | Critical | 5 min | `PATCH /policies/identitySecurityDefaultsEnforcementPolicy` |

### Medium-Term Projects (1–5 days, user communication required)

| Action | Impact | Time | Notes |
|---|---|---|---|
| Enforce MFA for all users via CA | Critical | 1–2 days | Requires communication + exclusion for break-glass accounts |
| Deploy sensitivity labels | High | 3–5 days | Requires label taxonomy design + publishing pipeline |
| Configure DLP policies | High | 3–5 days | Requires policy design, simulation mode first |
| Migrate service account secrets to Key Vault | High | 2–4 days | Per-application effort; requires app owner coordination |

### Long-Term Projects (weeks–months, steering committee involvement)

| Action | Impact | Time | Notes |
|---|---|---|---|
| Implement PIM for all admin roles | Critical | 2–4 weeks | Requires PIM licensing (AAD P2), admin training |
| Deploy Azure Sentinel / Defender XDR | High | 4–8 weeks | Requires workspace design, cost model approval |
| Achieve ISO 27001 certification | Strategic | 6–18 months | Requires formal ISMS documentation + audit |
| Implement GDAP for all partner access | High | 4–6 weeks | Requires partner coordination and re-consent |

---

## Implementation Phases

### Phase 0 — Pre-Work (Before Day 1)

1. Export current tenant health score as baseline (`tenant-health-scoring.md` methodology)
2. Run gap assessment and generate gap report (`compliance-gaps.md` methodology)
3. Identify stakeholders: Security team, IT Operations, Compliance Officer, Executive Sponsor
4. Create change management tickets for each remediation item
5. Schedule communication to affected users for end-user-impacting changes

### Phase 1 — Quick Wins (Days 1–30)

**Goal**: Eliminate all Critical severity gaps with low effort. Target: +15 points on health score.

| Week | Actions | Owner | Rollback |
|---|---|---|---|
| Week 1 | Enable Unified Audit Log | IT Admin | N/A (non-disruptive) |
| Week 1 | Block legacy authentication (report-only first) | Security Team | Disable policy (`state: disabled`) |
| Week 2 | Enforce legacy auth block (production) | Security Team | Revert policy to report-only |
| Week 2 | Set group expiration policy | IT Admin | `DELETE /groupLifecyclePolicies/{id}` |
| Week 3 | Remove excess Global Admins (keep ≤ 5) | Security Team | Re-add via `POST /directoryRoles/{id}/members/$ref` |
| Week 3 | Enable PIM for privileged roles (eligible-only) | Security Team | Revert to permanent assignments |
| Week 4 | Restrict guest invite policy | IT Admin | Revert `allowInvitesFrom` to previous value |

### Phase 2 — Core Controls (Days 31–60)

**Goal**: Close High severity gaps. Target: +15 additional points on health score.

| Week | Actions | Owner | Rollback |
|---|---|---|---|
| Week 5 | Deploy MFA CA policy (report-only mode, 5 days) | Security Team | Delete CA policy |
| Week 6 | Enforce MFA CA policy (enforce mode) | Security Team | Revert to report-only mode |
| Week 6 | Configure cross-tenant access policy defaults | Security Team | Revert to default trust settings |
| Week 7 | Publish sensitivity labels (3 base labels) | Compliance Team | Retract labels from policies |
| Week 8 | Enable DLP policies in simulation mode | Compliance Team | Disable policies |

### Phase 3 — Compliance Hardening (Days 61–90)

**Goal**: Close Medium severity gaps and achieve measurable framework alignment. Target: +10 additional points.

| Week | Actions | Owner | Rollback |
|---|---|---|---|
| Week 9 | Enforce DLP policies (production mode) | Compliance Team | Revert policies to simulation mode |
| Week 10 | Configure retention labels and policies | Compliance Team | Delete retention policies (files retain labels) |
| Week 11 | Deploy Key Vault for top 3 applications | App Team | Revert apps to config-based secrets (short-term) |
| Week 12 | Run re-assessment; update health score | Security Team | N/A |

---

## Rollback Procedures

### Rollback: Conditional Access Policy

```http
# Disable (safest — does not delete)
PATCH https://graph.microsoft.com/v1.0/identity/conditionalAccessPolicies/{policyId}
Content-Type: application/json

{ "state": "disabled" }

# Delete (permanent)
DELETE https://graph.microsoft.com/v1.0/identity/conditionalAccessPolicies/{policyId}
```

**Before enforcing any CA policy**: Export current policies as a backup.

```powershell
# Export CA policies to JSON
$policies = Get-MgIdentityConditionalAccessPolicy -All
$policies | ConvertTo-Json -Depth 10 | Out-File ./ca-policies-backup-$(Get-Date -Format yyyyMMdd).json
```

### Rollback: Group Expiration Policy

```http
# Remove expiration policy entirely
DELETE https://graph.microsoft.com/v1.0/groupLifecyclePolicies/{policyId}
```

Note: Removing the expiration policy does not immediately delete groups; it cancels pending expirations.

### Rollback: Legacy Auth Block

1. Switch CA policy `state` from `enabled` to `enabledForReportingButNotEnforced` (report-only mode)
2. This preserves the policy but removes enforcement while you investigate user impact
3. Communicate the rollback to help desk — users blocked by legacy auth will start working again

### Rollback: MFA Enforcement

1. Set CA policy to `enabledForReportingButNotEnforced` to un-enforce without deleting
2. For per-user MFA: `PATCH /users/{id}` with `strongAuthenticationRequirements = []` (via legacy admin)
3. Document which users were un-enrolled and create a re-enrollment task

---

## Stakeholder Communication Templates

### Pre-Change Communication (1 week before)

```
Subject: Upcoming Security Update — [Change Name] on [Date]

Team,

As part of our ongoing security improvements, we will be implementing [change description]
on [date]. This change will [impact summary — e.g., "require you to complete MFA when signing
in from outside the corporate network"].

What you need to do before [date]:
1. [Action 1 — e.g., "Set up the Microsoft Authenticator app"]
2. [Action 2 — e.g., "Complete the MFA registration at https://aka.ms/mfasetup"]

If you have questions, contact [helpdesk email/link].

IT Security Team
```

### Post-Change Notification

```
Subject: Security Update Complete — [Change Name]

Team,

The [change name] security update was successfully implemented on [date].
Your account is now protected by [brief description of new protection].

If you encounter any issues signing in, contact [helpdesk] with reference [ticket number].

IT Security Team
```

### Executive Summary Update (Monthly)

```
Subject: M365 Security Posture Update — [Month Year]

Executive Summary:
- Current tenant health score: [N]/100 ([band])
- Score change from last month: +[N] points
- Critical gaps resolved this period: [N]
- Remaining high-priority gaps: [N]
- Next milestone: Phase [N] completion by [date]

Top 3 risks still open:
1. [Risk 1]
2. [Risk 2]
3. [Risk 3]
```

---

## Progress Tracking

Track remediation progress in a structured table. Update after each weekly sprint.

```markdown
## Remediation Tracker — Sprint [N]

| # | Gap | Severity | Phase | Status | Owner | Due | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Block legacy auth | Critical | 1 | Completed | SecTeam | Week 2 | Enforced 2025-03-01 |
| 2 | Enable audit log | Critical | 1 | Completed | IT Admin | Week 1 | Enabled 2025-02-24 |
| 3 | MFA enforcement | Critical | 2 | In Progress | SecTeam | Week 6 | Report-only since Week 5 |
| 4 | Sensitivity labels | High | 2 | Not Started | Compliance | Week 7 | Pending label taxonomy |
```

---

## Re-Assessment Schedule

| Assessment Type | Frequency | Trigger | Output |
|---|---|---|---|
| Full gap re-assessment | Quarterly | Calendar | Updated gap report + health score delta |
| Quick pillar check | Monthly | Calendar | Dashboard update only |
| Emergency re-assessment | Ad hoc | Incident or audit | Focused gap report on affected area |
| Post-change validation | After each phase | Phase completion | Confirm controls are effective |

### Re-Assessment Automation Pattern

```typescript
async function reAssessmentDiff(
  previous: GapResult[],
  current: GapResult[]
): Promise<{ resolved: GapResult[]; regressed: GapResult[]; unchanged: GapResult[] }> {
  const prevMap = new Map(previous.map(g => [g.id, g]));
  const resolved = current.filter(g => !g.gapFound && prevMap.get(g.id)?.gapFound);
  const regressed = current.filter(g => g.gapFound && !prevMap.get(g.id)?.gapFound);
  const unchanged = current.filter(g => {
    const prev = prevMap.get(g.id);
    return prev && g.gapFound === prev.gapFound;
  });
  return { resolved, regressed, unchanged };
}
```

---

## Error Codes and Limits

| Code | Meaning | Remediation |
|---|---|---|
| 400 | `Request_BadRequest` on CA PATCH | Verify policy JSON structure; check `conditions.users` references valid group/user IDs |
| 403 | `Authorization_RequestDenied` | Ensure Global Admin or Conditional Access Administrator role |
| 409 | `Conflict` on groupLifecyclePolicy | Only one policy may exist; PATCH the existing one instead of POST |
| 422 | Validation error on CA policy | Check that all referenced named locations or groups exist |
| 429 | `TooManyRequests` | Spread remediation calls across time; use batch requests |

| Resource | Limit | Notes |
|---|---|---|
| CA policies per tenant | 195 | Soft limit; contact support for more |
| Sensitivity labels per tenant | 500 | Practical limit is much lower for usability |
| DLP policies | 10,000 | Hard limit per tenant |
| Group lifecycle policies | 1 per tenant | Only one policy can be active at a time |
| PIM eligible assignments | No documented limit | Practical limit is number of licensed AAD P2 users |

---

## Common Gotchas

- **Change control before enforcement**: Always run CA policies in `enabledForReportingButNotEnforced` (report-only) mode for at least 5 business days before enforcing. Sign-in logs show what would have been blocked.
- **Break-glass accounts**: Before enabling any CA policy, create at least 2 emergency access accounts that are excluded from all CA policies. These should be cloud-only, have no MFA requirement, and be monitored with alerts. See CIS 1.2.1.
- **MFA disruption for service accounts**: Any account used for non-interactive automation (app-only service principals) must use OAuth2 client credentials flow, not delegated MFA. Identify these accounts before enforcing MFA.
- **Group expiration renewal**: After enabling the expiration policy, group owners receive renewal emails. If they do not renew within the configured period, the group is deleted. Pre-communicate and extend the period to 365 days for the first 90 days.
- **Sensitivity label ordering**: Labels in Microsoft Purview are ordered by sensitivity level (0 = lowest). Changing the order after publishing to users can cause confusion. Design the taxonomy before publishing.
- **DLP simulation mode**: Microsoft calls report-only mode for DLP "simulation" or "test" mode. It does not block or notify users but logs policy matches in the compliance portal. Review matches for 1–2 weeks before enforcing.
