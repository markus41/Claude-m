# Azure DevOps Plugin

A comprehensive Claude Code knowledge plugin for Azure DevOps — covering the entire platform: Git repositories with passwordless authentication, YAML and Classic pipelines, deployment environments, work items and boards, test plans, security and permissions, dashboards, wikis, service hooks, Analytics OData, CLI, and marketplace extensions.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise across all Azure DevOps services so it can generate correct REST API integration code, YAML pipeline definitions, WIQL queries, Git authentication configurations, security policies, and administrative workflows. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/ado-setup` to configure authentication and verify Azure DevOps access:

```
/ado-setup                                    # Full guided setup with GCM, PAT, or OAuth
/ado-setup --minimal                          # Dependencies only
/ado-setup --org myorg --project myproject    # Specify org and project
```

For passwordless Git authentication:
```
/ado-git-auth --method gcm                    # Git Credential Manager with Entra OAuth
/ado-git-auth --method ssh                    # SSH key setup
/ado-git-auth --method wif                    # Workload Identity Federation for CI/CD
```

## Skills (5)

| Skill | Focus Areas |
|-------|-------------|
| **Azure DevOps Repos** | Git repositories, pull requests, branch policies, code search, passwordless Git auth (GCM, SSH, WIF) |
| **Azure DevOps Pipelines** | YAML pipelines, Classic releases, deployment environments, agent pools, variable groups, service connections |
| **Azure DevOps Boards** | Work items, WIQL queries, Kanban boards, sprint planning, process customization, delivery plans |
| **Azure DevOps Testing** | Test plans, test suites, test cases, test runs, test configurations, test analytics |
| **Azure DevOps Admin** | Security namespaces, dashboards, wikis, service hooks, Analytics OData, CLI, extensions, artifact feeds |

## Commands (25)

### Repos & Git
| Command | Description |
|---------|-------------|
| `/ado-setup` | Configure authentication (GCM, PAT, OAuth, SSH) and verify access |
| `/ado-repo-create` | Create a Git repository with init options and branch config |
| `/ado-pr-create` | Create pull requests with auto-complete, draft mode, and merge strategy |
| `/ado-branch-policy` | Configure branch policies (reviewers, build validation, status checks) |
| `/ado-git-auth` | Set up passwordless Git auth — GCM, SSH, WIF, managed identity |

### Pipelines
| Command | Description |
|---------|-------------|
| `/ado-pipeline-create` | Generate YAML pipelines with multi-stage templates and service connections |
| `/ado-build-status` | Check build status with log inspection and failure analysis |
| `/ado-pipeline-run` | Trigger pipeline runs with parameters and variable overrides |
| `/ado-environment-create` | Create deployment environments with approval checks and gates |
| `/ado-variable-group` | Manage variable groups with Key Vault linking |
| `/ado-agent-status` | Check agent pool health and diagnose offline agents |
| `/ado-service-connection` | Create WIF, managed identity, or SP service connections |

### Boards
| Command | Description |
|---------|-------------|
| `/ado-workitem-create` | Create work items with relations, custom fields, and bulk creation |
| `/ado-query-workitems` | Query work items with WIQL, pagination, and tree queries |
| `/ado-sprint-plan` | Manage iterations, assign work, and view sprint burndown |
| `/ado-delivery-plan` | Create cross-team delivery plans with timeline management |

### Testing
| Command | Description |
|---------|-------------|
| `/ado-test-plan` | Create test plans, suites, and test cases with configurations |
| `/ado-test-run` | Execute test runs and view test analytics and trends |

### Administration
| Command | Description |
|---------|-------------|
| `/ado-wiki` | Create and manage project and code wikis |
| `/ado-dashboard` | Create dashboards and configure widgets |
| `/ado-permissions` | View and set security namespace ACLs and permissions |
| `/ado-service-hook` | Create webhook subscriptions for DevOps events |
| `/ado-process` | Manage inherited processes, custom WITs, fields, and rules |
| `/ado-extensions` | Search, install, and manage marketplace extensions |
| `/ado-analytics` | Run OData analytics queries for work items, pipelines, and tests |

## Agents (4)

| Agent | Description |
|-------|-------------|
| **Azure DevOps Reviewer** | Reviews REST API usage, YAML pipeline syntax, WIQL queries, service connection security, and credential handling |
| **Pipeline Debugger** | Diagnoses pipeline failures — analyzes logs, identifies flaky tests, checks agent capabilities, suggests fixes |
| **Security Auditor** | Audits security posture — overprivileged connections, branch policy gaps, credential exposure, permission sprawl |
| **Migration Planner** | Plans Classic-to-YAML migration — maps stages to environments, converts tasks, preserves approval gates |

## Examples (5)

| Example | Content |
|---------|---------|
| `pipeline-templates.md` | 6+ ready-to-use YAML templates: Node.js, .NET, Python, Docker, Terraform, multi-stage |
| `automation-scripts.md` | TypeScript/CLI scripts for bulk work items, pipeline triggers, PR automation |
| `git-auth-recipes.md` | Step-by-step passwordless Git setup for workstations, CI/CD, containers |
| `security-recipes.md` | Branch protection matrix, least-privilege connections, PAT rotation, audit queries |
| `integration-patterns.md` | Service hooks to Teams/Slack, webhooks to Azure Functions, OData to Power BI |

## Plugin Structure

```
azure-devops/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── azure-devops-repos/        # Git repos, PRs, branch policies, auth
│   ├── azure-devops-pipelines/    # YAML, Classic, environments, agents, variables
│   ├── azure-devops-boards/       # Work items, WIQL, sprints, process customization
│   ├── azure-devops-testing/      # Test plans, suites, runs, analytics
│   └── azure-devops-admin/        # Security, dashboards, wiki, hooks, CLI, extensions
├── commands/                      # 25 command files
├── agents/                        # 4 agent files
├── examples/                      # 5 example files
└── README.md
```

## Trigger Keywords

The plugin activates automatically for: `azure devops`, `ado`, `yaml pipeline`, `azure repos`, `pull request`, `branch policy`, `git credential manager`, `passwordless git`, `work item`, `wiql`, `sprint`, `kanban`, `test plan`, `test case`, `ado security`, `ado permissions`, `ado wiki`, `service hook`, `ado dashboard`, `ado analytics`, `az devops cli`, `deployment environment`, `agent pool`, `variable group`, `service connection`, `classic release`.

## Author

Markus Ahling
