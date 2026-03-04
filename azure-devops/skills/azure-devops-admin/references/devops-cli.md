# Azure DevOps — CLI Reference

## Overview

The Azure DevOps CLI extension (`az devops`) provides command-line access to Azure DevOps services including repos, pipelines, boards, artifacts, and project administration. It integrates with the `az` CLI and supports PAT-based and Azure AD authentication, multiple output formats, and JMESPath queries for filtering results. This reference covers installation, authentication, all major command groups, `az devops invoke` for arbitrary REST API calls, and common one-liner recipes.

---

## Installation

```bash
# Install the Azure DevOps extension
az extension add --name azure-devops

# Verify installation
az devops --version

# Update to latest version
az extension update --name azure-devops
```

---

## Authentication

### Azure AD Login (Interactive)

```bash
az login
```

### PAT-Based Login

```bash
# Set PAT via environment variable
export AZURE_DEVOPS_EXT_PAT=your-pat-token

# Or login interactively with PAT
az devops login --org https://dev.azure.com/myorg
# (paste PAT when prompted)
```

### Service Principal Login (CI/CD)

```bash
az login --service-principal \
  -u <client-id> \
  -p <client-secret> \
  --tenant <tenant-id>
```

---

## Configuration Defaults

Set defaults to avoid passing `--org` and `--project` on every command:

```bash
az devops configure --defaults \
  organization=https://dev.azure.com/myorg \
  project=MyProject

# Verify defaults
az devops configure --list
```

---

## Command Groups

### Repos (`az repos`)

```bash
# List repos
az repos list -o table

# Show repo details
az repos show --repository MyRepo

# Create a repo
az repos create --name NewRepo

# Delete a repo (requires confirmation)
az repos delete --id <repo-guid> --yes

# Import from external Git URL
az repos import create --git-source-url https://github.com/org/repo.git \
  --repository MyRepo

# List branch policies
az repos policy list --repository-id <repo-guid> --branch main

# Create a branch policy (require minimum reviewers)
az repos policy approver-count create \
  --repository-id <repo-guid> \
  --branch main \
  --minimum-approver-count 2 \
  --creator-vote-counts false \
  --allow-downvotes false \
  --reset-on-source-push true \
  --blocking true \
  --enabled true

# Set build validation policy
az repos policy build create \
  --repository-id <repo-guid> \
  --branch main \
  --build-definition-id 42 \
  --display-name "CI Build" \
  --valid-duration 720 \
  --queue-on-source-update-only true \
  --blocking true \
  --enabled true
```

### Pull Requests (`az repos pr`)

```bash
# Create a PR
az repos pr create \
  --repository MyRepo \
  --source-branch feature/login \
  --target-branch main \
  --title "Implement OAuth login" \
  --description "Adds PKCE-based OAuth 2.0 login flow" \
  --reviewers user@company.com \
  --work-items 42 43 \
  --draft false

# List open PRs
az repos pr list --repository MyRepo --status active -o table

# Show PR details
az repos pr show --id 123

# Set vote (approve/reject)
az repos pr set-vote --id 123 --vote approve     # approve, approve-with-suggestions, reject, reset, wait-for-author

# Add a reviewer
az repos pr reviewer add --id 123 --reviewers user2@company.com

# Complete (merge) a PR
az repos pr update --id 123 --status completed \
  --merge-commit-message "Merge feature/login to main" \
  --delete-source-branch true \
  --squash true

# Abandon a PR
az repos pr update --id 123 --status abandoned

# List PR comments
az repos pr list --id 123 --include-links
```

### Pipelines (`az pipelines`)

```bash
# List pipelines
az pipelines list -o table

# Show pipeline details
az pipelines show --id 42

# Create a YAML pipeline
az pipelines create \
  --name "CI-Build" \
  --repository MyRepo \
  --repository-type tfsgit \
  --branch main \
  --yml-path azure-pipelines.yml

# Run a pipeline
az pipelines run --id 42 --branch main

# Run with parameters
az pipelines run --id 42 --branch main \
  --parameters "environment=staging" "skipTests=true"

# Delete a pipeline
az pipelines delete --id 42 --yes

# List pipeline runs
az pipelines runs list --pipeline-ids 42 --top 10 -o table

# Show run details
az pipelines runs show --id 789

# Manage variables
az pipelines variable create --name MY_VAR --value "my-value" --pipeline-id 42
az pipelines variable update --name MY_VAR --value "new-value" --pipeline-id 42
az pipelines variable delete --name MY_VAR --pipeline-id 42 --yes
az pipelines variable list --pipeline-id 42 -o table

# Variable groups
az pipelines variable-group create --name "Production Vars" \
  --variables KEY1=value1 KEY2=value2
az pipelines variable-group list -o table
az pipelines variable-group variable create --group-id 1 --name NEW_VAR --value "val"
az pipelines variable-group variable update --group-id 1 --name NEW_VAR --value "new-val"
```

### Boards (`az boards`)

```bash
# Create a work item
az boards work-item create \
  --type "User Story" \
  --title "Implement user preferences page" \
  --assigned-to user@company.com \
  --area "MyProject\\Frontend" \
  --iteration "MyProject\\Sprint 14" \
  --fields "Microsoft.VSTS.Scheduling.StoryPoints=5" \
  --discussion "Initial spike completed, ready for implementation"

# Show a work item
az boards work-item show --id 42

# Update a work item
az boards work-item update --id 42 \
  --state Active \
  --fields "System.Tags=auth; sprint-14"

# Delete a work item (to recycle bin)
az boards work-item delete --id 42 --yes

# Permanently delete
az boards work-item delete --id 42 --yes --destroy

# Query work items (WIQL)
az boards query --wiql "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Active' ORDER BY [Microsoft.VSTS.Common.Priority]"

# Add a relation (link)
az boards work-item relation add --id 42 \
  --relation-type "System.LinkTypes.Hierarchy-Forward" \
  --target-id 43

# Area paths
az boards area project list
az boards area project create --name "Backend"
az boards area project create --name "Auth" --path "\\Backend"
az boards area team add --team "Backend Team" --path "MyProject\\Backend"

# Iteration paths
az boards iteration project list
az boards iteration project create --name "Sprint 15" \
  --start-date 2026-03-23 --finish-date 2026-04-05
az boards iteration team add --id <iteration-guid> --team "Backend Team"
```

### Artifacts (`az artifacts`)

```bash
# List feeds
az artifacts feed list -o table

# Create a feed
az artifacts feed create --name "internal-packages" \
  --description "Internal NuGet and npm packages"

# Publish a universal package
az artifacts universal publish \
  --feed internal-packages \
  --name my-tool \
  --version 1.0.0 \
  --path ./dist/ \
  --description "CLI tool distribution"

# Download a universal package
az artifacts universal download \
  --feed internal-packages \
  --name my-tool \
  --version 1.0.0 \
  --path ./download/
```

### DevOps Administration (`az devops`)

```bash
# List projects
az devops project list -o table

# Show project details
az devops project show --project MyProject

# Create a project
az devops project create \
  --name NewProject \
  --description "New engineering project" \
  --source-control git \
  --process Agile \
  --visibility private

# Service connections
az devops service-endpoint list -o table
az devops service-endpoint create --service-endpoint-configuration config.json

# Teams
az devops team list --project MyProject -o table
az devops team create --name "Platform Team" --project MyProject
az devops team list-member --team "Platform Team" --project MyProject

# Wiki
az devops wiki list -o table
az devops wiki create --name "Engineering Wiki" --type projectWiki
az devops wiki page create --wiki Engineering.wiki --path "/Onboarding" \
  --content "# Onboarding Guide"
az devops wiki page show --wiki Engineering.wiki --path "/Onboarding" --include-content
```

---

## `az devops invoke` — Escape Hatch

For any REST API endpoint without a dedicated CLI command, use `az devops invoke`:

```bash
# Generic GET
az devops invoke --area wit --resource workitems \
  --route-parameters id=42 \
  --api-version 7.1

# GET with query parameters
az devops invoke --area git --resource repositories \
  --route-parameters project=MyProject \
  --query-parameters includeLinks=true \
  --api-version 7.1

# POST with body
az devops invoke --area wit --resource workitems \
  --route-parameters project=MyProject type=Bug \
  --http-method POST \
  --in-file body.json \
  --api-version 7.1

# Process API (organization-level, no project)
az devops invoke --area processes --resource processes \
  --api-version 7.1 \
  --org https://dev.azure.com/myorg
```

### Key Parameters

| Parameter | Description |
|-----------|-------------|
| `--area` | API resource area (e.g., `wit`, `git`, `build`, `test`, `hooks`, `dashboard`) |
| `--resource` | API resource name (e.g., `workitems`, `repositories`, `builds`) |
| `--route-parameters` | URL path parameters as `key=value` pairs |
| `--query-parameters` | URL query parameters as `key=value` pairs |
| `--http-method` | HTTP method (GET, POST, PUT, PATCH, DELETE) |
| `--in-file` | Path to JSON file for request body |
| `--api-version` | API version string |

---

## Output Formats

```bash
# Table (human-readable)
az repos list -o table

# JSON (default, full detail)
az repos list -o json

# YAML
az repos list -o yaml

# TSV (tab-separated, great for scripting)
az repos list -o tsv

# JMESPath query for specific fields
az repos list --query "[].{Name:name, DefaultBranch:defaultBranch, Size:size}" -o table
```

---

## JMESPath Query Examples

```bash
# Get repo ID by name
az repos show --repository MyRepo --query id -o tsv

# List PR titles and IDs
az repos pr list --repository MyRepo \
  --query "[].{ID:pullRequestId, Title:title, Author:createdBy.displayName}" -o table

# Get failed builds
az pipelines runs list --pipeline-ids 42 \
  --query "[?result=='failed'].{ID:id, FinishTime:finishTime}" -o table

# Active bugs assigned to a user
az boards query \
  --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.AssignedTo] = 'user@company.com' AND [System.WorkItemType] = 'Bug' AND [System.State] = 'Active'" \
  --query "[].fields.{ID:\"System.Id\", Title:\"System.Title\"}" -o table
```

---

## Common Recipes

### Clone All Repos in a Project

```bash
az repos list --query "[].sshUrl" -o tsv | while read url; do
  git clone "$url"
done
```

### Bulk-Create Work Items from CSV

```bash
while IFS=, read -r title type priority; do
  az boards work-item create \
    --type "$type" \
    --title "$title" \
    --fields "Microsoft.VSTS.Common.Priority=$priority"
done < work-items.csv
```

### Find Stale PRs (Open > 30 Days)

```bash
CUTOFF=$(date -d "-30 days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -v-30d +%Y-%m-%dT%H:%M:%SZ)
az repos pr list --status active \
  --query "[?creationDate < '$CUTOFF'].{ID:pullRequestId, Title:title, Author:createdBy.displayName, Created:creationDate}" \
  -o table
```

### Export Pipeline Variables

```bash
az pipelines variable list --pipeline-id 42 -o json | jq -r '.[] | "\(.name)=\(.value)"'
```

### Trigger Pipeline and Wait for Completion

```bash
RUN_ID=$(az pipelines run --id 42 --branch main --query id -o tsv)
echo "Started run $RUN_ID"

while true; do
  STATUS=$(az pipelines runs show --id $RUN_ID --query status -o tsv)
  if [ "$STATUS" = "completed" ]; then
    RESULT=$(az pipelines runs show --id $RUN_ID --query result -o tsv)
    echo "Run $RUN_ID completed with result: $RESULT"
    break
  fi
  sleep 15
done
```

### Audit Service Connections

```bash
az devops service-endpoint list \
  --query "[].{Name:name, Type:type, Owner:createdBy.displayName, Created:authorization.parameters.tenantid}" \
  -o table
```

---

## Limits and Gotchas

- **Extension scope**: `az devops` is an extension, not built-in. It must be installed separately and updated independently.
- **PAT vs Azure AD**: PAT tokens are simpler but expire and cannot be federated. Azure AD tokens are preferred for CI/CD.
- **`--org` required**: if not set via defaults, every command needs `--org https://dev.azure.com/myorg`.
- **JSON Patch for work items**: `az boards work-item create/update` handles most fields via `--fields`, but complex operations (adding links, attachments) may require `az devops invoke` with a JSON Patch body.
- **Output encoding**: TSV output on Windows may have encoding issues. Use `--output json` and pipe through `jq` for reliable parsing.
- **Rate limiting**: CLI commands are subject to the same ADO REST API rate limits. Batch operations should include delays for large volumes.
- **Parallel execution**: the CLI is not designed for parallel execution. Running multiple `az devops` commands simultaneously may cause token refresh conflicts.
- **`az devops invoke`**: the `--area` and `--resource` values must match the API documentation exactly. Use `az devops invoke --query-parameters` (not `--route-parameters`) for query string parameters.
- **Boolean fields**: use `--fields "Custom.IsApproved=true"` — the CLI accepts string representations of booleans.
- **Work item links**: the `--relation-type` for `az boards work-item relation add` uses the link type reference name (e.g., `System.LinkTypes.Hierarchy-Forward`), not the display name.
