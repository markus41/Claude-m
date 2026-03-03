# Microsoft MCP Servers — Planner Orchestrator Reference

All MCP servers configured in `.mcp.json` at the plugin root. Each server provides
specialized tools automatically available to agents in this plugin.

## Server Catalog

### `azure` — Azure Resource Management
**Package**: `@azure/mcp@latest` (npx, stdio)
**Auth**: DefaultAzureCredential (Azure CLI, managed identity, env vars)

Key tools:
- `azure_management_list_subscriptions` — list all subscriptions
- `azure_management_list_resource_groups` — list resource groups in a subscription
- `azure_management_get_resource` — get details of a specific resource
- `azure_management_list_resources` — list resources in a group

**Use in planner-orchestrator**: Ship workflow — confirm Azure deployment targets,
check resource existence before creating deployment tasks.

---

### `azure-devops` — Azure DevOps Work Items & PRs
**Package**: `@microsoft/azure-devops-mcp@latest` (npx, stdio)
**Env**: `AZURE_DEVOPS_ORG_URL` — e.g., `https://dev.azure.com/myorg`

Key tools:
- `azure_devops_get_work_item` — get work item details
- `azure_devops_create_work_item` — create work item (Bug, Task, User Story)
- `azure_devops_update_work_item` — update title, description, state, assignee
- `azure_devops_list_work_items` — query work items by WIQL
- `azure_devops_get_pull_request` — get PR details
- `azure_devops_create_pull_request` — create a PR in ADO repos
- `azure_devops_list_repositories` — list repos in a project
- `azure_devops_get_pipeline` — get build/release pipeline
- `azure_devops_run_pipeline` — trigger a pipeline run

**Use in planner-orchestrator**: Ship workflow — create linked ADO work item when
shipping a Planner task; sync status back to Planner after ADO state changes.
Also in `cross-plugin-patterns.md` for Planner → ADO sync mapping.

---

### `powerbi-modeling` — Power BI Semantic Model Operations
**Package**: `@microsoft/powerbi-modeling-mcp@latest` (npx, stdio)
**Auth**: DefaultAzureCredential or Power BI service principal

Key tools:
- `powerbi_get_datasets` — list datasets in a workspace
- `powerbi_get_dataset` — get dataset schema and details
- `powerbi_execute_query` — run DAX query against a dataset
- `powerbi_refresh_dataset` — trigger a dataset refresh
- `powerbi_get_reports` — list reports in a workspace
- `powerbi_create_dataset` — create a new dataset with schema
- `powerbi_push_rows` — push rows to a push dataset (for live data)

**Use in planner-orchestrator**: Portfolio manager and deadline monitor — push
Planner task data as a Power BI push dataset for real-time dashboards.

---

### `playwright` — Browser Automation & E2E Testing
**Package**: `@playwright/mcp@latest` (npx, stdio)
**Auth**: None required

Key tools:
- `browser_navigate` — navigate to a URL
- `browser_snapshot` — capture accessibility snapshot of current page
- `browser_click` — click an element
- `browser_type` — type text into an input
- `browser_screenshot` — capture a screenshot
- `browser_select_option` — select from a dropdown
- `browser_wait_for` — wait for a condition or element
- `browser_evaluate` — run JavaScript in the page

**Use in planner-orchestrator**: Ship workflow — run E2E tests against the
implemented feature's UI before creating the PR.

---

### `devbox` — Microsoft Dev Box Management
**Package**: `@microsoft/devbox-mcp@latest` (npx, stdio)
**Auth**: DefaultAzureCredential (WAM on Windows)

Key tools:
- `devbox_list` — list available dev boxes
- `devbox_get` — get dev box details and status
- `devbox_start` — start a dev box
- `devbox_stop` — stop a dev box
- `devbox_create` — create a new dev box from a pool
- `devbox_list_pools` — list available dev box pools

**Use in planner-orchestrator**: Ship workflow — provision a clean Dev Box for
isolated testing of the shipped feature, especially for environment-specific work.

---

### `m365-toolkit` — Microsoft 365 Agents Toolkit
**Package**: `@microsoft/m365agentstoolkit-mcp@latest` (npx, stdio)
**Auth**: M365 account via interactive sign-in

Key tools:
- `m365_list_apps` — list Teams apps in the tenant
- `m365_get_app` — get app manifest and metadata
- `m365_validate_manifest` — validate a Teams app manifest
- `m365_package_app` — package a Teams app for deployment
- `m365_deploy_app` — deploy app to Teams App Catalog
- `m365_provision_resources` — provision M365 resources for an app
- `m365_list_environments` — list development environments

**Use in planner-orchestrator**: Ship workflow when the Planner task involves
building a Teams app or M365 integration — validate the manifest and deploy.

---

### `markitdown` — File Format to Markdown Converter
**Package**: `markitdown[mcp]` (uvx, stdio)
**Auth**: None required. Requires Python + uv installed.

Key tools:
- `markitdown_convert` — convert a file to Markdown (supports PDF, DOCX, XLSX, PPTX, HTML, images, audio)
- `markitdown_convert_url` — convert a URL to Markdown

**Use in planner-orchestrator**: Task triage — convert Planner task attachments
(PDFs, Word docs) to Markdown for LLM analysis before triaging or implementing.

---

### `microsoft-learn` — Official Microsoft Documentation (Remote)
**URL**: `https://learn.microsoft.com/api/mcp` (streamable HTTP, no auth required)

Key tools:
- `microsoft_learn_search` — search Microsoft Learn for documentation
- `microsoft_learn_get_document` — fetch the full content of a Learn article
- `microsoft_learn_search_code_samples` — find code samples for a topic

**Use in planner-orchestrator**: Ship workflow — during the Explore and Plan phases,
look up official Microsoft documentation relevant to the task being implemented.
No API key or authentication required.

---

## Authentication Setup

### DefaultAzureCredential Resolution Order

The Azure, Azure DevOps, Dev Box, and Power BI servers all use DefaultAzureCredential,
which tries these in order:

1. Environment variables (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`)
2. Workload Identity (in Kubernetes/ACI)
3. Managed Identity (on Azure VMs, App Service)
4. Azure Developer CLI (`azd auth login`)
5. **Azure CLI** (`az login`) — most common for local development
6. Azure PowerShell (`Connect-AzAccount`)
7. Interactive browser login

For local development, `az login` is the easiest path.

### Azure DevOps Org URL

Set `AZURE_DEVOPS_ORG_URL` in your environment or `.claude/planner-orchestrator.local.md`:
```
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/myorganization
```

---

## Availability Detection

Before using any MCP tool, the orchestration agents check availability:
```
1. Attempt a lightweight tool call on the MCP server
2. If it succeeds → server is available, proceed
3. If tool not found → server not started (check .mcp.json config)
4. If auth error → credentials not configured (follow auth setup above)
5. Always note unavailability in output with setup instructions
```
