# powerbi-paginated-reports

Comprehensive knowledge plugin for Power BI paginated reports through Microsoft Fabric — from RDL authoring to SSRS migration. This is a knowledge plugin (no runtime dependencies).

## Setup

```bash
/pr-setup
# or with flags:
/pr-setup --minimal
/pr-setup --skip-desktop
```

## Capabilities

| Area | What Claude Can Do |
|------|-------------------|
| RDL Authoring | Generate and modify RDL XML, data regions, report items, page layout |
| Expressions | Write VB.NET expressions, custom code, conditional formatting |
| Data Sources | Configure Fabric Lakehouse, Warehouse, Semantic Model, Azure SQL, Dataverse |
| Rendering | Configure PDF, Excel, Word, CSV, XML export with device info settings |
| REST API | Generate TypeScript for import, export, parameters, subscriptions |
| Deployment | Upload .rdl to Fabric workspace, bind gateway, set credentials |
| Migration | Assess SSRS reports for Fabric compatibility, auto-fix common issues |
| Performance | Diagnose query, rendering, and capacity bottlenecks |
| Troubleshooting | Resolve data source errors, expression errors, rendering issues |

## Commands

| Command | Description |
|---------|-------------|
| `/pr-setup` | Interactive setup — Report Builder, workspace, data source, auth |
| `/pr-scaffold` | Generate RDL template (invoice, table, matrix, list, subreport) |
| `/pr-validate` | Analyze RDL for issues, Fabric compatibility, best practices |
| `/pr-deploy` | Deploy .rdl to Fabric workspace via REST API |
| `/pr-migrate` | SSRS-to-Fabric compatibility scan with auto-fix |
| `/pr-datasource` | Configure data source and dataset for any Fabric source |
| `/pr-subscription` | Create/manage email subscriptions via REST API |
| `/pr-expression` | Generate VB.NET expressions from natural language |

## Agents

| Agent | Description |
|-------|-------------|
| RDL Reviewer | Reviews RDL files for correctness, compatibility, and best practices |
| Performance Advisor | Diagnoses performance bottlenecks with optimization roadmap |

## Plugin Structure

```
powerbi-paginated-reports/
├── .claude-plugin/plugin.json
├── .mcp.json
├── README.md
├── skills/paginated-reports/
│   ├── SKILL.md
│   ├── references/
│   │   ├── rdl-structure.md
│   │   ├── expressions-code.md
│   │   ├── data-sources-datasets.md
│   │   ├── rendering-export.md
│   │   ├── rest-api.md
│   │   ├── performance-tuning.md
│   │   ├── ssrs-migration.md
│   │   └── troubleshooting.md
│   └── examples/
│       ├── rdl-templates.md
│       ├── expression-patterns.md
│       ├── api-automation.md
│       └── migration-checklist.md
├── commands/
│   ├── pr-setup.md
│   ├── pr-scaffold.md
│   ├── pr-validate.md
│   ├── pr-deploy.md
│   ├── pr-migrate.md
│   ├── pr-datasource.md
│   ├── pr-subscription.md
│   └── pr-expression.md
└── agents/
    ├── rdl-reviewer.md
    └── paginated-performance-advisor.md
```

## Trigger Keywords

paginated report, rdl, report definition language, report builder, ssrs, sql server reporting services, tablix, data region, report parameter, subreport, drillthrough, report rendering, report export, report subscription, paginated deploy, report data source, pixel-perfect report, print-ready report, ssrs migration, paginated performance, report expression, custom code report

## Author

Markus Ahling
