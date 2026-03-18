---
name: workspace-manage
description: "Manage Fabric workspace lifecycle — create with standards, assign roles, configure Git integration, and set up deployment pipelines"
argument-hint: "<action> --workspace <name> [--domain <domain>] [--environment <dev|test|prod>] [--capacity <capacity-id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Fabric Workspace

Create, configure, and manage Fabric workspaces with standardized naming, role assignments, Git integration, and deployment pipeline setup.

## Instructions

### 1. Validate Inputs

- `<action>` — Operation to perform:
  - `create` — Create a new workspace with full configuration
  - `scaffold` — Create a complete domain workspace set (dev + test + prod)
  - `audit` — Review workspace for governance compliance
  - `roles` — Manage role assignments
  - `git-connect` — Set up Git integration
  - `pipeline-setup` — Create deployment pipeline across environments
- `--workspace` — Workspace name (or domain name for scaffold). Ask if not provided.
- `--domain` — Data domain (sales, finance, hr, etc.). Used for naming conventions.
- `--environment` — Target environment: `dev`, `test`, `prod`.
- `--capacity` — Fabric capacity ID. Ask if not provided for create/scaffold.

### 2. Action: create

Create a single workspace with full configuration:

1. **Apply naming convention**: `ws-<domain>-<environment>` (e.g., `ws-sales-prod`)
2. **Create workspace** via Fabric REST API
3. **Assign to capacity**
4. **Create standard lakehouses** (bronze, silver, gold for the domain)
5. **Assign default roles**:
   - Data Engineers group → Member
   - Data Analysts group → Viewer (prod only)
   - CI/CD Service Principal → Contributor
6. **Set workspace description** with domain, environment, and owner info
7. **Apply sensitivity label** if tenant-level labels are configured

Ask the user for:
- Domain name and environment
- Capacity ID
- Data engineer group ID and data analyst group ID
- Whether to create standard lakehouses

### 3. Action: scaffold

Create a complete domain workspace set:
- `ws-<domain>-dev` — Development (Engineers: Admin)
- `ws-<domain>-test` — Testing (Engineers: Member, QA: Contributor)
- `ws-<domain>-prod` — Production (Engineers: Member, Analysts: Viewer, SP: Contributor)

Then automatically:
1. Create deployment pipeline: `dp-<domain>`
2. Assign workspaces to pipeline stages (dev→0, test→1, prod→2)
3. Connect dev workspace to Git repository (ask for repo details)
4. Create standard lakehouses in each workspace

### 4. Action: audit

Scan workspace for governance compliance:
- Naming convention compliance
- Minimum 2 admins
- Service principal configured for CI/CD
- Capacity assigned
- Git integration connected (for non-sandbox)
- No stale items (> 90 days without modification)
- No overprivileged roles (excessive admins)
- Sensitivity labels applied (if required by policy)

Output structured audit report with severity levels.

### 5. Action: roles

Manage workspace role assignments:

```
/workspace-manage roles --workspace ws-sales-prod --add user@domain.com:Member
/workspace-manage roles --workspace ws-sales-prod --remove user@domain.com
/workspace-manage roles --workspace ws-sales-prod --list
```

- `--add <principal>:<role>` — Add a role assignment
- `--remove <principal>` — Remove a role assignment
- `--list` — List current role assignments

Validate before adding:
- User/group exists in Entra ID
- Role is valid (Admin, Member, Contributor, Viewer)
- Warn if granting Admin to more than 5 principals

### 6. Action: git-connect

Set up Git integration for a workspace:
1. Ask for Git provider: Azure DevOps or GitHub
2. Ask for repository details (org, project, repo, branch)
3. Ask for directory path within repo
4. Connect workspace to Git
5. Perform initial sync
6. Show conflict resolution guidance

### 7. Action: pipeline-setup

Create a deployment pipeline:
1. Ask for pipeline name and description
2. Create the pipeline via API
3. Ask for workspace assignments per stage (dev, test, prod)
4. Assign workspaces to stages
5. Configure deployment rules (if applicable)
6. Show how to trigger first deployment

### 8. Display Summary

Show:
- Workspace(s) created with IDs and URLs
- Role assignments configured
- Lakehouses created
- Git integration status
- Deployment pipeline configuration
- OneLake paths for each lakehouse
- Next steps: load data, create notebooks, configure pipelines
