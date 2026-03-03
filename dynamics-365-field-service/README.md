# dynamics-365-field-service

Dynamics 365 Field Service plugin for Claude Code. Covers the full Field Service operational layer on top of Dataverse — work orders, booking and scheduling, resource management, service accounts, customer assets, incident types, and IoT-triggered service automation via Connected Field Service.

## What it covers

- **Work order lifecycle** — create/update/complete work orders; apply incident type templates; add service tasks, products, and services
- **Booking and scheduling** — find available resources via Schedule Assistant API, create/reassign bookings, update booking status (Scheduled → Traveling → In Progress → Completed)
- **Resource management** — bookable resources, skills/certifications, service territories, organizational units, time off requests
- **Service accounts and assets** — customer assets, functional location hierarchy, asset service history
- **Incident types** — service task templates, product templates, incident type libraries
- **IoT / Connected Field Service** — IoT alerts, device management, alert-to-work-order automation, device commands
- **Agreements** — recurring work order (preventive maintenance) agreement setup
- **Reporting** — MTTR, First-Time Fix Rate, resource utilization, SLA compliance, incident type distribution

Builds on top of the `dataverse-schema` plugin which covers the underlying Dataverse schema layer.

## Install

```bash
/plugin install dynamics-365-field-service@claude-m-microsoft-marketplace
```

## Required permissions

| Workload | Role |
|---|---|
| Work order create/update | `Field Service - Dispatcher` |
| Resource scheduling (URS) | `Field Service - Dispatcher` + `Field Service - Resource` |
| Read-only / reporting | `Field Service - Read Only` |
| IoT / Connected Field Service | `IoT - Administrator` + `Field Service - Administrator` |

The service principal must have a `systemuser` record in the Dynamics 365 organization (created via Power Platform Admin Center > Application Users).

## Setup

```
/fs-setup
```

Discovers the organization URL, validates the `systemuser` record, confirms Field Service is installed, checks security roles, and tests connectivity to work order and booking entities.

## Commands

| Command | Description |
|---|---|
| `/fs-setup` | Validate auth, org URL, Field Service installation, and entity access |
| `/fs-work-order` | Create, update, add tasks/products, and complete work orders |
| `/fs-schedule` | Find available resources, create bookings, reassign, update booking status |
| `/fs-service-account` | Manage service accounts, customer assets, and functional locations |
| `/fs-reporting` | MTTR, first-time fix rate, resource utilization, SLA compliance reports |

## Example prompts

- "Use `dynamics-365-field-service` to create a work order for account Contoso — HVAC compressor failure, High priority"
- "Find available technicians for work order {id} in the North territory and book the best slot"
- "Show all customer assets for account {account-id} and their service history"
- "Generate a Q1 2026 Field Service report: MTTR, first-time fix rate, and resource utilization for all territories"
- "Create an IoT-triggered work order from alert {alert-id}"
- "Update booking {id} status to Traveling and set estimated travel time to 25 minutes"

## Auth pattern

Uses the integration context contract (`docs/integration-context.md`). Required context:

```
tenantId + D365_ORG_URL (e.g., https://contoso.crm.dynamics.com)
```

Token audience must be the exact org URL. The service principal needs a `systemuser` record with Field Service security roles.
