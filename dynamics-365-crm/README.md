# dynamics-365-crm

Dynamics 365 Sales and Customer Service plugin for Claude Code. Covers the full CRM business application layer on top of Dataverse — leads, opportunities, accounts, contacts, cases, queues, SLAs, pipeline reporting, and CRM workflow automation.

## What it covers

- **Dynamics 365 Sales** — lead qualification (`QualifyLead` action), opportunity lifecycle (`WinOpportunity`, `LoseOpportunity`), accounts, contacts, quotes, orders, pipeline forecasting
- **Dynamics 365 Customer Service** — case management (`ResolveIncident` action), queue routing, SLA KPI monitoring, knowledge base, entitlements, case escalation
- **Activity logging** — tasks, phone calls, emails, appointments against CRM records
- **Business rules** — rollup field calculation, duplicate detection, process flows
- **Power Automate** — Dataverse trigger patterns for CRM automation

Builds on top of the `dataverse-schema` plugin which covers the underlying Dataverse schema layer.

## Install

```bash
/plugin install dynamics-365-crm@claude-m-microsoft-marketplace
```

## Required permissions

| Workload | Role |
|---|---|
| Dynamics 365 Sales | `Salesperson` or `Sales Manager` security role in the org |
| Dynamics 365 Customer Service | `Customer Service Representative` or `Customer Service Manager` |
| Read-only / reporting | Minimum: `Dataverse User` + app-specific read roles |
| Bulk data operations | `System Administrator` |

The service principal must also have a `systemuser` record in the Dynamics 365 organization (created via Power Platform Admin Center > Application Users).

## Setup

```
/dynamics-365-crm-setup
```

Discovers the organization URL, validates the `systemuser` record, checks security roles, and tests connectivity to Sales and Customer Service entities.

## Commands

| Command | Description |
|---|---|
| `/dynamics-365-crm-setup` | Validate auth, org URL, systemuser record, and entity access |
| `/d365-lead-qualify` | Qualify a lead — create account, contact, and opportunity via `QualifyLead` |
| `/d365-case-manage` | Create, update, escalate, route, or resolve a customer service case |
| `/d365-pipeline-report` | Generate pipeline forecast by owner, stage, and close date |

## Example prompts

- "Use `dynamics-365-crm` to qualify lead {lead-id} and assign the opportunity to user {owner-id}"
- "Create a High priority case for account Contoso about a VPN outage"
- "Generate a Q2 2026 pipeline report for all sales reps"
- "Show me all cases in the Tier 1 queue that are approaching SLA breach"
- "Resolve case CAS-01234 with resolution: firmware upgrade resolved the connectivity issue"

## Auth pattern

Uses the integration context contract (`docs/integration-context.md`). Required context:

```
tenantId + D365_ORG_URL (e.g., https://contoso.crm.dynamics.com)
```

Token audience must be the exact org URL. The service principal needs a `systemuser` record with the appropriate security roles.
