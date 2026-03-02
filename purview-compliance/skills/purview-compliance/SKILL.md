---
name: purview-compliance
description: >
  Deep expertise in Microsoft Purview compliance workflows — DLP policies, retention labels,
  sensitivity labels, eDiscovery, audit log queries, and guided compliance playbooks
  with risk-ranked recommendations, audit trails, and legal dependency flags.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - purview
  - compliance
  - dlp
  - data loss prevention
  - retention policy
  - retention label
  - sensitivity label
  - ediscovery
  - legal hold
  - compliance playbook
  - records management
  - information protection
  - audit log
  - content search
---

# Microsoft Purview Compliance

This skill provides comprehensive knowledge for managing Microsoft Purview compliance features via Graph API and Security & Compliance PowerShell. All guidance is risk-ranked, auditable, and explicit about assumptions and legal dependencies.

## Core Principles

1. **Risk-ranked** — Prioritize recommendations by impact and likelihood
2. **Auditable** — Every change produces a timestamped log with before/after states
3. **Legally aware** — Flag when legal counsel should be involved
4. **Non-destructive** — Prefer test mode, dry runs, and gradual rollouts

## Base URLs

```
Graph API:     https://graph.microsoft.com/v1.0
Graph Beta:    https://graph.microsoft.com/beta
Compliance PS: Connect-IPPSSession
```

## API Endpoints

### eDiscovery (Graph API)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/security/cases/ediscoveryCases` | Create eDiscovery case |
| GET | `/security/cases/ediscoveryCases` | List all cases |
| GET | `/security/cases/ediscoveryCases/{id}` | Get case details |
| PATCH | `/security/cases/ediscoveryCases/{id}` | Update case |
| POST | `/security/cases/ediscoveryCases/{id}/close` | Close case |
| POST | `/security/cases/ediscoveryCases/{id}/reopen` | Reopen case |
| POST | `/security/cases/ediscoveryCases/{id}/custodians` | Add custodian |
| GET | `/security/cases/ediscoveryCases/{id}/custodians` | List custodians |
| POST | `/security/cases/ediscoveryCases/{id}/legalHolds` | Create legal hold |
| POST | `/security/cases/ediscoveryCases/{id}/searches` | Create search |
| POST | `/security/cases/ediscoveryCases/{id}/searches/{id}/estimate` | Estimate search results |
| POST | `/security/cases/ediscoveryCases/{id}/reviewSets/{id}/export` | Export review set |

**Create eDiscovery case body:**
```json
{
  "displayName": "HR Investigation 2026-Q1",
  "description": "Investigation into data handling compliance",
  "externalId": "CASE-2026-0042"
}
```

**Add custodian body:**
```json
{
  "email": "user@contoso.com",
  "applyHoldToSources": true
}
```

**Create legal hold body:**
```json
{
  "displayName": "Litigation Hold - HR Case",
  "description": "Preserve all mailbox and OneDrive content for custodians",
  "isEnabled": true,
  "contentQuery": "subject:'Project Alpha' OR from:user@contoso.com"
}
```

### Sensitivity Labels (Graph API)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/security/informationProtection/sensitivityLabels` | List sensitivity labels |
| GET | `/security/informationProtection/sensitivityLabels/{id}` | Get label details |

### Audit Log (Graph API — Beta)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/security/auditLog/queries` | Create audit log query |
| GET | `/security/auditLog/queries/{id}` | Get query status |
| GET | `/security/auditLog/queries/{id}/records` | Get query results |

**Create audit log query body:**
```json
{
  "displayName": "DLP policy matches last 7 days",
  "filterStartDateTime": "2026-02-22T00:00:00Z",
  "filterEndDateTime": "2026-03-01T00:00:00Z",
  "operationFilters": [
    "DlpRuleMatch",
    "DlpRuleUndo",
    "DlpInfo"
  ],
  "recordTypeFilters": [
    "complianceDLPSharePoint",
    "complianceDLPExchange"
  ]
}
```

The audit log query is asynchronous. Poll `GET /security/auditLog/queries/{id}` until `status` is `succeeded`, then fetch records.

**Audit log query statuses:** `notStarted`, `running`, `succeeded`, `failed`.

## DLP Policy Management (PowerShell)

| Cmdlet | Purpose |
|--------|---------|
| `Get-DlpCompliancePolicy` | List DLP policies |
| `New-DlpCompliancePolicy` | Create DLP policy |
| `Set-DlpCompliancePolicy` | Update DLP policy |
| `Remove-DlpCompliancePolicy` | Delete DLP policy |
| `New-DlpComplianceRule` | Add rules to a policy |
| `Set-DlpComplianceRule` | Update rule conditions/actions |
| `Set-DlpCompliancePolicy -Mode Enable` | Promote from test to enforcement |
| `Get-DlpSensitiveInformationType` | List available sensitive info types |
| `Get-DlpDetailReport` | Get DLP incident details |

### DLP Policy Mode Values

| Mode | Description |
|------|-------------|
| `Enable` | Policy actively enforces rules |
| `TestWithNotifications` | Matches are detected, tips shown, but not blocked |
| `TestWithoutNotifications` | Matches detected silently — for initial testing |
| `Disable` | Policy is off |

### DLP Confidence Levels

Use confidence levels to reduce false positives:
- **High** (85-100%): Strong pattern match — block or notify
- **Medium** (75-84%): Moderate match — notify only
- **Low** (65-74%): Possible match — log for review

## Retention Labels & Policies (PowerShell)

| Cmdlet | Purpose |
|--------|---------|
| `Get-ComplianceTag` | List retention labels |
| `New-ComplianceTag` | Create retention label |
| `Get-RetentionCompliancePolicy` | Check policy status and scope |
| `New-RetentionCompliancePolicy` | Create retention policy |
| `New-RetentionComplianceRule` | Publish label via policy |

### Retention Actions

| Action | Description |
|--------|-------------|
| `Delete` | Delete content after retention period |
| `Keep` | Keep content indefinitely (no delete) |
| `KeepAndDelete` | Keep for period, then delete |

**Best practices:**
- Use adaptive scopes for dynamic user/site targeting
- Preservation lock is irreversible — require explicit confirmation
- Retain always wins over delete when policies conflict
- Auto-apply labels based on sensitive info types or keywords

## Sensitivity Labels (PowerShell)

| Cmdlet | Purpose |
|--------|---------|
| `Get-Label` | List sensitivity labels |
| `New-Label` | Create sensitivity label |
| `New-LabelPolicy` | Publish labels to users |
| `Set-Label` | Update label configuration |

**Best practices:**
- Order labels from least to most restrictive
- Test encryption settings with a small group before broad deployment
- Auto-labeling can take 7+ days to process existing content
- Default labels should be intentional — avoid accidentally broad defaults

## Required Permissions

| Operation | Permission / Role |
|-----------|-------------------|
| DLP policy management | Compliance Administrator |
| Retention policy management | Compliance Administrator or Records Management |
| Sensitivity label management | Compliance Administrator or Information Protection Admin |
| eDiscovery (standard) | eDiscovery Manager |
| eDiscovery (premium) | eDiscovery Administrator |
| Retention labels with record declaration | Records Management role |
| Audit log queries | `AuditLog.Read.All` (Graph) or Audit Logs role |
| Sensitivity label reading (Graph) | `InformationProtectionPolicy.Read` |
| eDiscovery case management (Graph) | `eDiscovery.Read.All` / `eDiscovery.ReadWrite.All` |

### PowerShell Authentication

```bash
# Connect to Security & Compliance PowerShell
pwsh -Command "Import-Module ExchangeOnlineManagement; Connect-IPPSSession -UserPrincipalName 'admin@contoso.com'"
```

## Error Handling

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 Bad Request | Malformed query or filter | Invalid operationFilters, bad date format in audit query |
| 401 Unauthorized | Authentication failure | Expired token, missing scope consent |
| 403 Forbidden | Insufficient permissions | Missing eDiscovery or compliance role |
| 404 Not Found | Resource not found | Wrong case ID, deleted search |
| 409 Conflict | Operation conflict | Legal hold prevents deletion; case is closed |
| 429 Too Many Requests | Throttled | Implement exponential backoff with `Retry-After` header |

### eDiscovery-Specific Errors

- **409 Legal Hold Conflict**: Cannot delete content under legal hold — remove hold first or get legal approval
- **400 Custodian Already Exists**: Custodian already added to case — use `GET` to verify before `POST`
- **Async Polling**: Export and estimate operations are asynchronous — poll until `status` is `succeeded`

### Audit Log Query Limits

- Maximum query date range: 180 days
- Results are paginated — follow `@odata.nextLink` for additional pages
- Queries expire after 24 hours — download results before expiry

## Common Compliance Workflows

### Pattern 1: DLP Policy Rollout

1. `Get-DlpSensitiveInformationType` — identify target sensitive info types
2. `New-DlpCompliancePolicy -Mode TestWithNotifications` — create policy in test mode
3. `New-DlpComplianceRule` — add detection rules with confidence levels
4. Monitor matches for 2-4 weeks via `Get-DlpDetailReport`
5. `Set-DlpCompliancePolicy -Mode Enable` — promote to enforcement
6. Configure policy tips for end-user awareness

### Pattern 2: eDiscovery Investigation

1. `POST /security/cases/ediscoveryCases` — create case with external ID
2. `POST .../custodians` — add custodians with `applyHoldToSources: true`
3. `POST .../legalHolds` — create targeted legal hold with content query
4. `POST .../searches` — create search with date range and keyword filters
5. `POST .../searches/{id}/estimate` — estimate result volume before export
6. `POST .../reviewSets/{id}/export` — export for legal review
7. Document chain-of-custody for all exports

### Pattern 3: Retention Policy Lifecycle

1. `New-ComplianceTag` — create retention label (e.g., 7-year keep-and-delete)
2. `New-RetentionCompliancePolicy` — create policy with adaptive scope
3. `New-RetentionComplianceRule` — publish label via policy
4. Monitor label application via audit log queries
5. Review expiring content before deletion triggers
6. Apply preservation lock only after legal review (irreversible)

### Pattern 4: Compliance Posture Audit

1. `Get-DlpCompliancePolicy` — inventory all DLP policies and their modes
2. `Get-RetentionCompliancePolicy` — inventory retention policies and scopes
3. `Get-Label` — inventory sensitivity labels and their protection settings
4. `POST /security/auditLog/queries` — query for policy match events in last 30 days
5. Produce compliance gap report with coverage percentages per workload
6. Recommend missing policies based on regulatory framework (GDPR, HIPAA, SOX)

## Compliance Playbook Pattern

Every compliance workflow should follow:

1. **Scope** — Define what is being configured and why
2. **Dry run** — Preview changes before applying
3. **Apply** — Execute with test mode where available
4. **Verify** — Confirm deployment and propagation
5. **Log** — Produce timestamped change log with regulatory context
6. **Sign-off** — Request owner acknowledgment

## OData Filter Reference (Audit Log)

Common filters for audit log queries:

| Filter | Example |
|--------|---------|
| By operation | `"operationFilters": ["DlpRuleMatch"]` |
| By record type | `"recordTypeFilters": ["complianceDLPSharePoint"]` |
| By user | `"userPrincipalNameFilters": ["user@contoso.com"]` |
| By date range | `"filterStartDateTime"` / `"filterEndDateTime"` |

### Common Audit Record Types

| Record Type | Description |
|-------------|-------------|
| `complianceDLPSharePoint` | DLP matches in SharePoint/OneDrive |
| `complianceDLPExchange` | DLP matches in Exchange |
| `microsoftTeams` | Teams activity |
| `sharePointFileOperation` | File operations in SharePoint |
| `exchangeAdmin` | Exchange admin operations |
| `azureActiveDirectory` | Entra ID operations |

## Minimal References

- `purview-compliance/commands/setup.md`
- `purview-compliance/commands/dlp-audit.md`
- `purview-compliance/commands/retention-review.md`
- `purview-compliance/commands/sensitivity-check.md`
- `purview-compliance/commands/ediscovery-workflow.md`
- `purview-compliance/README.md`
