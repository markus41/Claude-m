# dynamics-365-project-ops

Dynamics 365 Project Operations plugin for Claude Code. Covers the full project management and billing layer on top of Dataverse — project creation, work breakdown structures, task and milestone management, time and expense tracking, resource assignments, project contracts, invoice proposals, and billing actuals.

## What it covers

- **Project lifecycle** — create/manage projects through Quote → Plan → Manage → Close stages
- **WBS and tasks** — add tasks, milestones, subtasks; update progress; query WBS structure
- **Team members** — assign bookable resources with roles; manage project team composition
- **Time entries** — submit, approve, reject, recall time entries; query pending approvals
- **Expense reports** — submit expenses by category; approval workflows
- **Resource assignments** — assign resources to tasks; detect over-allocation; view utilization
- **Project contracts** — create contracts and contract lines (Time & Material or Fixed Price)
- **Invoice proposals** — generate invoice proposals via `msdyn_CreateInvoice`; confirm via `msdyn_ConfirmInvoice`
- **Actuals** — query Cost, Unbilled Sales, and Billed Sales actuals; revenue summary by task
- **Billing milestones** — fixed-price milestone management and invoice inclusion

Builds on top of the `dataverse-schema` plugin which covers the underlying Dataverse schema layer.

## Install

```bash
/plugin install dynamics-365-project-ops@claude-m-microsoft-marketplace
```

## Required permissions

| Workload | Role |
|---|---|
| Project create/manage (WBS, team) | `Project Manager` |
| Time and expense entry/submission | `Project Team Member` |
| Resource scheduling and booking | `Resource Manager` |
| Invoice creation and billing | `Project Billing Admin` |
| Read-only reporting | `Project Viewer` |

The service principal must have a `systemuser` record in the Dynamics 365 organization with the appropriate Project Operations security roles.

## Setup

```
/proj-setup
```

Verifies the organization URL, confirms Project Operations is provisioned (via `msdyn_projectparameters`), validates security roles, and tests connectivity to project, time entry, and billing entities.

## Commands

| Command | Description |
|---|---|
| `/proj-setup` | Validate auth, org URL, Project Operations provisioning, and security roles |
| `/proj-manage` | Create projects, add WBS tasks/milestones, manage team members, update progress |
| `/proj-time-expense` | Submit, approve, reject, and recall time entries and expense reports |
| `/proj-resources` | Assign resources to tasks, view utilization, detect over-allocation |
| `/proj-billing` | Create contracts, generate invoice proposals, confirm invoices, review actuals |

## Example prompts

- "Use `dynamics-365-project-ops` to create a project for customer Contoso — ERP Migration Phase 1, starting April 2026"
- "Add tasks to project {id}: Infrastructure Assessment (80h), Data Migration (160h), UAT (40h)"
- "Submit 8 hours of time for project {id}, task {task-id} on 2026-04-07 — infrastructure assessment"
- "List all pending time entry approvals for project {id} and approve them"
- "Generate an invoice proposal for project {id} dated 2026-05-31"
- "Show unbilled actuals for project {id} and total revenue to date"
- "Detect over-allocated resources on project {id} between April and June 2026"

## Auth pattern

Uses the integration context contract (`docs/integration-context.md`). Required context:

```
tenantId + D365_ORG_URL (e.g., https://contoso.crm.dynamics.com)
```

Token audience must be the exact org URL. The service principal needs a `systemuser` record with Project Operations security roles. Project Operations must be provisioned in the environment — confirmed via presence of `msdyn_projectparameters` records.
