# Azure DevOps Plugin

A Claude Code knowledge plugin for Azure DevOps — Git repositories, YAML pipelines, work items, pull requests, WIQL queries, and artifact management via the Azure DevOps REST API.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in Azure DevOps so it can generate correct REST API integration code, YAML pipeline definitions, WIQL queries, and work item management workflows. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure authentication and verify Azure DevOps access:

```
/setup                                    # Full guided setup
/setup --minimal                          # Node.js dependencies only
/setup --org myorg --project myproject    # Specify org and project
```

## Capabilities

| Area | What Claude Can Do |
|------|-------------------|
| **Repositories** | Create repos, manage branches, configure branch policies |
| **Pipelines** | Generate multi-stage YAML pipelines for any language/framework |
| **Work Items** | Create, update, and query work items (User Stories, Bugs, Tasks, Features) |
| **Pull Requests** | Create PRs, add reviewers, manage comments and auto-complete |
| **WIQL** | Write and execute Work Item Query Language queries |
| **Artifacts** | Manage package feeds for NuGet, npm, Maven, and Python |
| **Review** | Analyze pipeline YAML, API code, and WIQL for correctness and security |

## Commands

| Command | Description |
|---------|-------------|
| `/ado-repo-create` | Create a Git repository in an Azure DevOps project |
| `/ado-pipeline-create` | Generate a YAML pipeline for Node, .NET, Python, or Docker |
| `/ado-workitem-create` | Create a work item (User Story, Bug, Task, Feature) |
| `/ado-pr-create` | Create a pull request with reviewers |
| `/ado-build-status` | Check recent pipeline build status |
| `/ado-query-workitems` | Query work items with WIQL or preset queries |
| `/setup` | Configure PAT or OAuth and verify project access |

## Agent

| Agent | Description |
|-------|-------------|
| **Azure DevOps Reviewer** | Reviews REST API usage, YAML pipeline syntax, WIQL queries, and credential security |

## Plugin Structure

```
azure-devops/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── azure-devops/
│       └── SKILL.md
├── commands/
│   ├── ado-repo-create.md
│   ├── ado-pipeline-create.md
│   ├── ado-workitem-create.md
│   ├── ado-pr-create.md
│   ├── ado-build-status.md
│   ├── ado-query-workitems.md
│   └── setup.md
├── agents/
│   └── devops-reviewer.md
└── README.md
```

## Trigger Keywords

The skill activates automatically when conversations mention: `azure devops`, `ado`, `devops pipeline`, `work item`, `pull request`, `azure repos`, `yaml pipeline`, `build pipeline`, `release pipeline`, `sprint board`, `devops board`, `artifact feed`.

## Author

Markus Ahling
