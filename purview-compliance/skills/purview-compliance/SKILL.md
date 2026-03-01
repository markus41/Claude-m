---
name: purview-compliance
description: Deep expertise in Microsoft Purview compliance workflows — DLP policies, retention labels, sensitivity labels, eDiscovery, and guided compliance playbooks with audit trails.
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
---

# Microsoft Purview Compliance

This skill provides comprehensive knowledge for managing Microsoft Purview compliance features. All guidance is risk-ranked, auditable, and explicit about assumptions and legal dependencies.

## Core Principles

1. **Risk-ranked** — Prioritize recommendations by impact and likelihood
2. **Auditable** — Every change produces a timestamped log with before/after states
3. **Legally aware** — Flag when legal counsel should be involved
4. **Non-destructive** — Prefer test mode, dry runs, and gradual rollouts

## Purview Compliance Areas

### Data Loss Prevention (DLP)

DLP policies detect and protect sensitive information across Exchange, SharePoint, OneDrive, Teams, and Endpoints.

**Key PowerShell cmdlets:**
| Cmdlet | Purpose |
|---|---|
| `Get-DlpCompliancePolicy` | List DLP policies |
| `New-DlpCompliancePolicy` | Create DLP policy |
| `New-DlpComplianceRule` | Add rules to a policy |
| `Set-DlpCompliancePolicy -Mode Enable` | Promote from test to enforcement |
| `Get-DlpSensitiveInformationType` | List available sensitive info types |

**Best practices:**
- Always start in `TestWithNotifications` mode
- Use confidence levels (High, Medium, Low) to reduce false positives
- Set instance count thresholds appropriate for the sensitive info type
- Configure policy tips for end-user awareness before blocking

### Retention Labels & Policies

Retention controls how long content is kept and what happens when the period expires.

**Key PowerShell cmdlets:**
| Cmdlet | Purpose |
|---|---|
| `Get-ComplianceTag` | List retention labels |
| `New-ComplianceTag` | Create retention label |
| `New-RetentionCompliancePolicy` | Create retention policy |
| `New-RetentionComplianceRule` | Publish label via policy |
| `Get-RetentionCompliancePolicy` | Check policy status and scope |

**Retention actions:** `Delete`, `Keep`, `KeepAndDelete`

**Best practices:**
- Use adaptive scopes for dynamic user/site targeting
- Preservation lock is irreversible — require explicit confirmation
- Retain always wins over delete when policies conflict
- Auto-apply labels based on sensitive info types or keywords for hands-off compliance

### Sensitivity Labels

Sensitivity labels classify and protect documents and emails with encryption, content marking, and access controls.

**Key PowerShell cmdlets:**
| Cmdlet | Purpose |
|---|---|
| `Get-Label` | List sensitivity labels |
| `New-Label` | Create sensitivity label |
| `New-LabelPolicy` | Publish labels to users |
| `Set-Label` | Update label configuration |

**Best practices:**
- Order labels from least to most restrictive
- Test encryption settings with a small group before broad deployment
- Auto-labeling can take 7+ days to process existing content
- Default labels should be intentional (not accidentally broad)

### eDiscovery

eDiscovery manages legal holds, searches, and exports for investigations.

**Graph API endpoints:**
| Endpoint | Purpose |
|---|---|
| `POST /security/cases/ediscoveryCases` | Create case |
| `POST .../custodians` | Add custodians |
| `POST .../legalHolds` | Place legal hold |
| `POST .../searches` | Create search |
| `POST .../searches/{id}/export` | Export results |

**Best practices:**
- Place holds before running searches
- Scope holds narrowly to avoid over-preservation
- Document chain-of-custody for all exports
- Involve legal counsel for litigation-related cases

## Authentication

All Purview compliance operations require Security & Compliance center access:

```bash
# Connect to Security & Compliance PowerShell
pwsh -Command "Import-Module ExchangeOnlineManagement; Connect-IPPSSession -UserPrincipalName 'admin@contoso.com'"
```

**Required roles:**
- Compliance Administrator (DLP, retention, sensitivity labels)
- eDiscovery Manager (standard eDiscovery)
- eDiscovery Administrator (premium eDiscovery)
- Records Management (retention labels with record declaration)

## Compliance Playbook Pattern

Every compliance workflow should follow:

1. **Scope** — Define what is being configured and why
2. **Dry run** — Preview changes before applying
3. **Apply** — Execute with test mode where available
4. **Verify** — Confirm deployment and propagation
5. **Log** — Produce timestamped change log with regulatory context
6. **Sign-off** — Request owner acknowledgment

Reference: `skills/purview-compliance/references/playbook-patterns.md` for API patterns and code examples.
