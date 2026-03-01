---
name: ediscovery-plan
description: Create an eDiscovery readiness plan with custodians, data sources, legal hold approach, search strategy, and escalation paths.
argument-hint: "<case-name> [--custodians <upn-list>] [--date-range <start..end>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# eDiscovery Readiness Plan

Create a comprehensive eDiscovery plan covering custodian identification, data source mapping, legal hold strategy, search methodology, and escalation paths.

## Planning Steps

1. **Define case scope** — Ask for case name, description, and investigation type (internal review, regulatory response, litigation)
2. **Identify custodians** — List of users (UPNs) whose data must be preserved and searched
3. **Map data sources** — For each custodian: mailbox, OneDrive, Teams chats, SharePoint sites, other
4. **Design legal hold** — Scope of hold (all content vs. date-range vs. keyword-filtered), notification strategy
5. **Plan search strategy** — KQL queries, date ranges, content types, deduplication approach
6. **Define export requirements** — Format (PST, EML, native), dedup settings, review platform
7. **Document escalation** — Legal counsel contacts, approval authority for hold/search/export

## Output Format

```markdown
# eDiscovery Plan — [Case Name]

## Case Overview
| Field | Value |
|---|---|
| Case name | |
| Type | Internal review / Regulatory / Litigation |
| Created | [date] |
| Compliance owner | [name] |
| Legal counsel | [name / firm] |

## Custodians & Data Sources
| Custodian | Mailbox | OneDrive | Teams | SharePoint | Other |
|---|---|---|---|---|---|

## Legal Hold Strategy
- Scope: [all content / date-filtered / keyword-filtered]
- Hold query: [KQL if applicable]
- Notification: [yes/no, template reference]

## Search Strategy
- KQL: [query]
- Date range: [start..end]
- Content types: [email, documents, chat, etc.]
- Deduplication: [yes/no]

## Escalation Path
1. [First contact]
2. [Legal counsel]
3. [Executive sponsor]
```

## Important Notes

- Legal holds are immediately effective — place holds before running searches
- Custodian notification may be legally required depending on jurisdiction
- Always involve legal counsel before starting eDiscovery for litigation
- Reference: `skills/purview-compliance/references/playbook-patterns.md` for Graph API patterns
