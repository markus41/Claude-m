# Power BI & Fabric Analytics Plugin

A Claude Code knowledge plugin for Power BI development, DAX authoring, Power Query M transformations, workspace management, PBIP project scaffolding, and Microsoft Fabric integration.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in the Power BI and Fabric ecosystem so it can generate correct code, scripts, and architectural advice. It does not contain runtime code, MCP servers, or executable scripts.

## Capabilities

| Area | What Claude Can Do |
|------|-------------------|
| **DAX Measures** | Generate, review, and optimize DAX measures with correct filter context, time intelligence, and KPI patterns |
| **Power Query M** | Generate M code for data source connections, transformations, pagination, and custom functions |
| **PBIP Projects** | Scaffold complete Power BI Project structures with TMDL files, model definitions, and report layouts |
| **REST API** | Generate TypeScript code for workspace management, dataset refresh, report export, and embedding |
| **Fabric** | Generate PySpark notebooks for Lakehouse data pipelines, Direct Lake models, and medallion architecture |
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

## Agent

| Agent | Description |
|-------|-------------|
| **DAX & Power BI Reviewer** | Reviews DAX measures, M code, PBIP structure, semantic model design, and REST API usage |

## Plugin Structure

```
powerbi-fabric/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── powerbi-analytics/
│       ├── SKILL.md                          # Core knowledge (triggers on DAX, Power Query, PBIP, etc.)
│       ├── references/
│       │   ├── dax-patterns.md               # DAX functions, time intelligence, KPI patterns
│       │   ├── power-query-m.md              # M language, source connections, transforms, folding
│       │   ├── pbi-rest-api.md               # REST API endpoints with TypeScript examples
│       │   ├── pbip-format.md                # PBIP structure, TMDL, model.bim, Git workflow
│       │   └── fabric-integration.md         # Lakehouse, notebooks, Direct Lake, pipelines
│       └── examples/
│           ├── dax-measures.md               # 10+ complete DAX measures
│           ├── power-query-transformations.md # 6 complete M code examples
│           ├── workspace-management.md       # 5 TypeScript REST API examples
│           └── pbip-scaffolding.md           # 3 complete PBIP project examples
├── commands/
│   ├── pbi-measure.md
│   ├── pbi-query.md
│   ├── pbi-workspace-create.md
│   ├── pbi-dataset-refresh.md
│   ├── pbi-scaffold.md
│   └── pbi-fabric-notebook.md
├── agents/
│   └── dax-reviewer.md
└── README.md
```

## Trigger Keywords

The skill activates automatically when conversations mention: `dax`, `DAX measure`, `power query`, `M code`, `power bi`, `pbip`, `pbix`, `semantic model`, `fabric`, `lakehouse`, `pbi workspace`, `dataset refresh`, `power query M`, `calculated column`, `measure`.

## Author

Markus Ahling
