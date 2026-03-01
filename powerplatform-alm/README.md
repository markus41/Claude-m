# Power Platform ALM Plugin

A Claude Code knowledge plugin for Power Platform Application Lifecycle Management. Provides deep expertise in environment provisioning, solution transport, CI/CD pipeline automation, connection reference management, environment variables, and PCF control development.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude expertise to generate correct code, scripts, pipeline YAML, and advice for Power Platform ALM. It does not contain runtime code, MCP servers, or executable scripts.

## Skills

### ALM Lifecycle (`skills/alm-lifecycle/SKILL.md`)

Core knowledge covering the full Power Platform ALM cycle:

- **Environment Management** — Create, copy, reset, delete environments via Admin API and PAC CLI
- **Solution Transport** — Export/import managed and unmanaged solutions, versioning, dependency management
- **CI/CD Pipelines** — Azure DevOps Build Tools and GitHub Actions templates for automated deployment
- **Connection References** — Map logical connection names to physical connections per environment
- **Environment Variables** — Configure per-environment values for URLs, feature flags, and settings
- **PCF Development** — Scaffold, build, test, and deploy custom controls (field, dataset, React)

## Commands

| Command | Description |
|---------|-------------|
| `alm-env-create` | Create and configure a Power Platform environment |
| `alm-env-list` | List environments with status and capacity |
| `alm-solution-export` | Export solution as managed or unmanaged zip |
| `alm-solution-import` | Import solution with connection/variable mapping |
| `alm-solution-diff` | Compare solutions across environments or versions |
| `alm-pipeline-generate` | Generate CI/CD pipeline YAML (Azure DevOps or GitHub Actions) |
| `alm-pcf-init` | Scaffold a new PCF control from template |
| `alm-pcf-build` | Build and optionally deploy a PCF control |
| `alm-envvar-set` | Set environment variable values per environment |

## Agents

### ALM Reviewer (`agents/alm-reviewer.md`)

Reviews Power Platform ALM artifacts for correctness and best practices:

- Solution structure and managed/unmanaged choices
- Pipeline YAML task names, secret handling, gate configuration
- PCF control manifests, lifecycle implementation, React patterns
- Connection reference mapping completeness
- Environment variable coverage across deployment settings
- Deployment settings file correctness

## Reference Files

| File | Content |
|------|---------|
| `references/environment-management.md` | Admin API, PAC CLI, capacity, roles, settings |
| `references/solution-transport.md` | Export/import, versioning, upgrade, unpack/pack, checker |
| `references/cicd-pipelines.md` | Azure DevOps and GitHub Actions YAML, Build Tools, gates |
| `references/connection-references.md` | Logical mapping, deployment settings, programmatic creation |
| `references/environment-variables.md` | Types, definition vs value, usage in flows/apps/plugins |
| `references/pcf-development.md` | Scaffold, manifest, lifecycle, React, dataset, build/deploy |

## Examples

| File | Content |
|------|---------|
| `examples/environment-promotion.md` | Full dev-to-test-to-prod scripts (TypeScript + Bash) |
| `examples/pipeline-templates.md` | Complete Azure DevOps and GitHub Actions YAML templates |
| `examples/pcf-scaffolding.md` | Star rating, card gallery, and rich text editor controls |
| `examples/solution-diff.md` | Solution comparison scripts and report generation |

## Key Technologies

- **PAC CLI** — `pac auth`, `pac solution`, `pac pcf`, `pac env`
- **Power Platform Build Tools** — Azure DevOps extension for solution management
- **GitHub Actions** — `microsoft/powerplatform-actions` marketplace actions
- **Dataverse Web API** — REST API for environment and solution operations
- **PCF** — PowerApps Component Framework for custom controls
- **Fluent UI v9** — Microsoft's design system for React-based PCF controls
