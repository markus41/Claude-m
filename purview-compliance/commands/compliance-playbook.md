---
name: compliance-playbook
description: Guided compliance automation — choose a scenario like "Set up retention for HR documents" and walk through configuration step-by-step. Produces an audit-ready change log and owner sign-off summary.
argument-hint: "<scenario> [--dry-run] [--owner <email>] [--regulatory-framework <name>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Compliance Playbook Runner

Run a guided compliance workflow by choosing a common scenario. Each playbook walks through configuration step-by-step using plain language, produces an audit-ready change log, and generates an owner sign-off summary.

## Available Playbooks

### 1. Set Up Retention for HR Documents
**Scenario**: "I need to keep HR files for 7 years, then auto-delete"

Steps:
1. **Identify scope** — Ask which SharePoint sites, mailboxes, or OneDrive locations contain HR content
2. **Create retention label** — POST to Security & Compliance PowerShell or Graph beta: label name, retention period, action after period (delete/review/nothing)
3. **Create label policy** — Publish the label to specified locations with auto-apply conditions (optional: keyword or sensitive info type matching)
4. **Verify deployment** — Check label policy status and confirm locations are targeted
5. **Generate change log** — Timestamped record of what was created, where it applies, and why

### 2. Enable DLP for Credit Card Numbers
**Scenario**: "Block sharing credit card numbers outside the org"

Steps:
1. **Confirm workloads** — Ask which workloads to protect (Exchange, SharePoint, OneDrive, Teams, Endpoints)
2. **Choose sensitivity** — Low (policy tips only), Medium (block with override), High (block without override)
3. **Create DLP policy** — Configure rule with built-in "Credit Card Number" sensitive info type, set actions based on chosen sensitivity level
4. **Set notifications** — Configure policy tips, admin alerts, and incident report recipients
5. **Deploy in test mode** — Apply policy in simulation mode first
6. **Generate change log** — Document policy settings, scope, and test mode status

### 3. Apply Sensitivity Labels to Confidential Projects
**Scenario**: "Label project documents as Confidential with encryption"

Steps:
1. **Define label** — Ask for label name, description, and intended audience
2. **Configure protection** — Set encryption (internal-only, specific people, or custom), content marking (header/footer/watermark)
3. **Create label policy** — Target specific groups or entire organization, set default label behavior
4. **Enable auto-labeling** (optional) — Configure conditions based on sensitive info types or keywords
5. **Generate change log** — Document label configuration and policy scope

### 4. Set Up Legal Hold for Investigation
**Scenario**: "Place a legal hold on specific employees' mailboxes and OneDrive"

Steps:
1. **Identify custodians** — Ask for user list (UPNs) and case name
2. **Create eDiscovery case** — Set up standard or premium case in Purview
3. **Add custodians** — Associate users and their data sources (mailbox, OneDrive, Teams)
4. **Place hold** — Configure hold with optional KQL conditions or date range
5. **Notify custodians** (optional) — Generate hold notification with acknowledgment tracking
6. **Generate change log** — Document case details, custodians, hold scope, and notification status

## Arguments

- `<scenario>`: Playbook name or description (e.g., "retention for HR", "DLP credit cards", "sensitivity labels", "legal hold")
- `--dry-run`: Show what would be configured without making changes
- `--owner <email>`: Email of the compliance owner for the sign-off summary
- `--regulatory-framework <name>`: Context for the change (e.g., "GDPR", "HIPAA", "SOX", "internal policy")

## Change Log Format

Every playbook produces a markdown change log:

```markdown
# Compliance Change Log

| # | Timestamp | Action | Detail | Status |
|---|-----------|--------|--------|--------|
| 1 | 2026-03-01T10:00:00Z | Created retention label | "HR-7Year-Delete", 7-year retain then delete | Success |
| 2 | 2026-03-01T10:01:00Z | Created label policy | Published to HR SharePoint sites | Success |

## Regulatory Context
- Framework: [GDPR / HIPAA / SOX / internal policy]
- Requirement: [specific requirement reference]
- Justification: [business reason]

## Owner Sign-Off
- Owner: [name / email]
- Date: [pending sign-off]
- Status: Awaiting review
```

## Important Notes

- All playbooks support `--dry-run` for previewing changes before applying
- Change logs should be saved to a designated compliance documentation location
- Sensitivity label and DLP changes can take up to 24 hours to propagate across all workloads
- Legal holds are immediately effective but notification delivery depends on mail flow
- Always involve legal counsel for eDiscovery and legal hold scenarios
- Reference: `skills/purview-compliance/SKILL.md` for Purview API guidance
- Reference: `skills/purview-compliance/references/playbook-patterns.md` for API patterns
