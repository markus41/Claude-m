# Excel Office Scripts & Power Automate Flows Plugin

A Claude Code plugin that provides deep knowledge of Excel Office Scripts and Power Automate cloud flow creation — covering the full stack from writing TypeScript automation scripts to deploying flows programmatically via the Dataverse Web API.

## What This Plugin Does

Equips Claude with expert-level knowledge for:

- **Writing** correct, idiomatic Office Scripts from natural language descriptions
- **Reviewing** scripts for TypeScript compliance, performance, and best practices
- **Creating** Power Automate flow definitions (`clientdata` JSON) programmatically
- **Deploying** flows via the Dataverse Web API (REST and TypeScript)
- **Wiring** Office Scripts to Power Automate triggers (schedule, HTTP, Forms, SharePoint, etc.)
- **CI/CD provisioning** of flows across environments with template resolution

## Installation

```bash
claude --plugin-dir ./excel-office-scripts
```

## Components

### Skill: `office-scripts`

Core knowledge that activates when you mention Office Scripts, Excel automation, `.osts` files, or ask to write TypeScript for Excel. Includes:

- **SKILL.md** — Entry points, object model, TypeScript restrictions, key patterns
- **references/api-patterns.md** — Full API surface (Workbook, Worksheet, Range, Table, Chart, PivotTable, etc.)
- **references/power-automate.md** — Parameter passing, return values, connector usage, limits
- **references/constraints-and-best-practices.md** — TS 4.0.3 restrictions, platform limits, performance tips
- **examples/** — Range operations, table operations, chart operations, and complete real-world scripts

### Skill: `power-automate-flows`

Knowledge for creating and managing Power Automate flows programmatically. Activates on mentions of flow definitions, Dataverse workflows, `clientdata`, or flow provisioning. Includes:

- **SKILL.md** — Core concepts, Dataverse Web API quick reference, `clientdata` structure, trigger/action types
- **references/dataverse-web-api.md** — Full CRUD, OAuth auth, TypeScript client class, error handling
- **references/flow-definition-schema.md** — ARM-style definition: triggers, actions, expressions, connections
- **references/management-connector.md** — PA Management connector, HTTP trigger patterns, security
- **examples/office-script-flows.md** — Complete payloads: scheduled, HTTP-triggered, Forms, button flows
- **examples/ci-cd-provisioning.md** — Template deploy, environment promotion, GitHub Actions, idempotent deploy
- **examples/complete-payloads.md** — Ready-to-use `clientdata` for common scenarios

### Commands

| Command | Description |
|---------|-------------|
| `/create-script` | Generate a new Office Script from a natural language description |
| `/validate-script` | Check an existing script for compliance issues and performance problems |
| `/create-flow` | Generate a Power Automate flow definition JSON from a description |

### Agents

| Agent | Description |
|-------|-------------|
| `office-script-reviewer` | Reviews Office Scripts for TypeScript compliance, performance, and correctness |
| `flow-definition-reviewer` | Reviews flow definition JSON for schema validity, connection references, and best practices |

## Quick Start

```bash
# Write an Office Script
> Write an Office Script that creates a sales summary table with totals

# Generate a script with the command
> /create-script Read all data from Sheet1, group by Region, and create a summary

# Validate an existing script
> /validate-script ./my-report-script.ts

# Generate a flow definition
> /create-flow Run my SalesReport script every weekday at 8 AM and email the team

# Review a flow definition
> Can you review this flow definition JSON?

# Create a flow + script together
> Create an HTTP-triggered flow that accepts order data and writes it to Excel via an Office Script
```

## Key Facts

### Office Scripts
- **Runtime**: TypeScript 4.0.3 (restricted subset)
- **Entry point**: `function main(workbook: ExcelScript.Workbook)`
- **No imports**: Scripts are self-contained — no npm, no modules
- **No `any` type**: All variables must be explicitly or inferably typed
- **Execution limit**: 120 seconds
- **Power Automate**: `fetch` is disabled when called from a flow

### Power Automate Flows (Programmatic)
- **Storage**: Dataverse `workflow` table rows (`category = 5`)
- **API**: `POST /api/data/v9.2/workflows` with `clientdata` JSON
- **Schema**: ARM-style Logic Apps 2016-06-01 definition
- **Auth**: Azure AD OAuth 2.0 (client credentials or delegated)
- **Lifecycle**: Create (draft) → Enable → Update → Disable → Delete
- **Connectors**: Excel Online Business, Office 365, SharePoint, Teams, Forms, Approvals, etc.
