# Power BI & Fabric Analytics Plugin

A Claude Code knowledge plugin for Power BI development, DAX authoring, Power Query M transformations, workspace management, PBIP project scaffolding, Power BI Embedded, deployment pipeline automation, performance optimization, and Microsoft Fabric integration.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in the Power BI and Fabric ecosystem so it can generate correct code, scripts, and architectural advice. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure authentication and verify Power BI access:

```
/setup                        # Full guided setup
/setup --minimal              # Node.js dependencies only
/setup --with-fabric          # Include Fabric/Lakehouse configuration
/setup --with-desktop-check   # Verify Power BI Desktop installation
```

## Capabilities

| Area | What Claude Can Do |
|------|-------------------|
| **DAX Measures** | Generate, review, and optimize DAX measures with correct filter context, time intelligence, and KPI patterns |
| **Power Query M** | Generate M code for data source connections, transformations, pagination, and custom functions |
| **PBIP Projects** | Scaffold complete Power BI Project structures with TMDL files, model definitions, and report layouts |
| **REST API** | Generate TypeScript code for workspace management, dataset refresh, report export, embedding, and deployment pipelines |
| **Fabric** | Generate PySpark notebooks for Lakehouse data pipelines, Direct Lake models, Dataflow Gen2, and medallion architecture |
| **Embedded** | Generate server-side embed token services and client-side powerbi-client SDK code with React component support |
| **Performance** | Diagnose VertiPaq memory issues, SE/FE bottlenecks, Direct Lake fallback, and composite model inefficiencies |
| **Review** | Analyze existing DAX, M code, and PBIP structures for correctness, performance, and best practices |

## Output Formats

- **PBIP (Power BI Project)** -- Git-friendly text-based project files with TMDL or model.bim
- **Classic .pbix** -- guidance for direct upload via Power BI Service REST API
- **DAX** -- header-comment format with measure name, description, and dependencies
- **Power Query M** -- complete let/in queries with typed columns and step comments
- **TypeScript** -- REST API client code with MSAL authentication and error handling
- **PySpark** -- Fabric notebook cells with Delta table read/write patterns

## Commands

| Command | Description |
|---------|-------------|
| `/pbi-measure` | Generate a DAX measure from natural language description |
| `/pbi-query` | Generate Power Query M code for data transformation |
| `/pbi-workspace-create` | Generate REST API code to create and configure a workspace |
| `/pbi-dataset-refresh` | Generate code to trigger and monitor a dataset refresh |
| `/pbi-scaffold` | Generate a complete PBIP project structure |
| `/pbi-fabric-notebook` | Generate a Fabric PySpark notebook for data pipelines |
| `/pbi-embed` | Generate Power BI Embedded token service and client-side SDK code (App/User Owns Data, optional React wrapper) |
| `/pbi-deploy-pipeline` | Generate TypeScript to automate deployment pipeline stages (Dev→Test or Test→Prod) with polling |
| `/setup` | Set up Azure auth, verify workspace access, and optionally configure Fabric |

## Agents

| Agent | Description |
|-------|-------------|
| **DAX & Power BI Reviewer** | Reviews DAX measures, M code, PBIP structure, semantic model design, and REST API usage |
| **PBI Performance Advisor** | Diagnoses slow reports, VertiPaq memory bloat, Direct Lake fallback, and DAX Formula Engine bottlenecks |

## Plugin Structure

```
powerbi-fabric/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── powerbi-analytics/
│       ├── SKILL.md                              # Core knowledge (triggers on DAX, Power Query, PBIP, etc.)
│       ├── references/
│       │   ├── dax-patterns.md                   # DAX functions, time intelligence, KPI patterns
│       │   ├── power-query-m.md                  # M language, source connections, transforms, folding
│       │   ├── pbi-rest-api.md                   # REST API endpoints with TypeScript examples
│       │   ├── pbip-format.md                    # PBIP structure, TMDL, model.bim, Git workflow
│       │   ├── fabric-integration.md             # Lakehouse, notebooks, Direct Lake, pipelines
│       │   ├── performance-optimization.md       # VertiPaq, SE/FE, aggregations, Direct Lake framing
│       │   └── troubleshooting.md                # DAX errors, refresh failures, Direct Lake, M errors, REST API
│       └── examples/
│           ├── dax-measures.md                   # 10+ complete DAX measures
│           ├── power-query-transformations.md    # 6 complete M code examples
│           ├── workspace-management.md           # 5 TypeScript REST API examples
│           ├── pbip-scaffolding.md               # 3 complete PBIP project examples
│           └── dataflow-gen2.md                  # SQL folding, REST pagination, incremental refresh M code
├── commands/
│   ├── pbi-measure.md
│   ├── pbi-query.md
│   ├── pbi-workspace-create.md
│   ├── pbi-dataset-refresh.md
│   ├── pbi-scaffold.md
│   ├── pbi-fabric-notebook.md
│   ├── pbi-fabric-pipeline.md
│   ├── pbi-direct-lake-model.md
│   ├── pbi-embed.md
│   ├── pbi-deploy-pipeline.md
│   └── pbi-setup.md
├── agents/
│   ├── dax-reviewer.md
│   └── pbi-performance-advisor.md
└── README.md
```

## Trigger Keywords

The skill activates automatically when conversations mention: `dax`, `DAX measure`, `power query`, `M code`, `power bi`, `pbip`, `pbix`, `semantic model`, `fabric`, `lakehouse`, `pbi workspace`, `dataset refresh`, `power query M`, `calculated column`, `measure`, `embed token`, `deployment pipeline`, `performance`, `VertiPaq`, `direct lake fallback`, `dataflow gen2`.

## Author

Markus Ahling
