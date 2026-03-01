# Microsoft Power Apps Plugin

A Claude Code knowledge plugin for Power Apps development — canvas app Power Fx formulas, model-driven app configuration, custom connector development, component libraries, and solution checker analysis.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in Power Apps so it can generate correct Power Fx formulas, design model-driven forms, build custom connectors, create reusable components, and validate solutions. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure Power Platform environment access:

```
/setup              # Full guided setup
/setup --minimal    # Node.js dependencies only
/setup --with-pcf   # Include PCF control development tools
```

## Capabilities

| Area | What Claude Can Do |
|------|-------------------|
| **Canvas Apps** | Generate screens, galleries, forms with correct Power Fx formulas and delegation handling |
| **Power Fx** | Generate formulas with proper delegation, error handling, and performance patterns |
| **Model-Driven** | Configure forms, views, business rules, business process flows, and site maps |
| **Custom Connectors** | Generate OpenAPI 2.0 definitions with authentication for REST APIs |
| **Components** | Build reusable canvas components with typed input/output properties |
| **Solution Checker** | Static analysis for delegation issues, security, and naming conventions |
| **Review** | Analyze formulas for delegation compliance, performance, and best practices |

## Commands

| Command | Description |
|---------|-------------|
| `/pa-canvas-screen` | Generate a canvas screen (list, detail, form, dashboard, settings) |
| `/pa-formula` | Generate a Power Fx formula from natural language |
| `/pa-connector-create` | Generate a custom connector OpenAPI definition |
| `/pa-component-create` | Generate a reusable canvas component |
| `/pa-model-driven-form` | Generate a model-driven form configuration |
| `/pa-solution-checker` | Run static analysis on Power Apps components |
| `/setup` | Configure Power Platform environment access |

## Agent

| Agent | Description |
|-------|-------------|
| **Power Apps Reviewer** | Reviews Power Fx delegation, model-driven config, connectors, and naming conventions |

## Plugin Structure

```
powerapps/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── powerapps-dev/
│       └── SKILL.md
├── commands/
│   ├── pa-canvas-screen.md
│   ├── pa-formula.md
│   ├── pa-connector-create.md
│   ├── pa-component-create.md
│   ├── pa-model-driven-form.md
│   ├── pa-solution-checker.md
│   └── setup.md
├── agents/
│   └── powerapps-reviewer.md
└── README.md
```

## Trigger Keywords

The skill activates automatically when conversations mention: `power apps`, `powerapps`, `canvas app`, `model-driven`, `power fx`, `custom connector`, `component library`, `pcf control`, `gallery`, `form control`, `app formula`, `delegation`, `patch function`, `collect function`.

## Author

Markus Ahling
