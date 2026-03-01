# Plugin Prioritization Backlog

This backlog scores candidate plugins for Claude-m using a simple framework:

- **Impact (1-5):** Expected user value / frequency of use.
- **Build Complexity (1-5):** Engineering difficulty (higher = harder).
- **Scope Friction (1-5):** OAuth/admin-consent friction and permission sensitivity (higher = harder).
- **Priority Score:** `Impact*2 - Build Complexity - Scope Friction` (higher = better).

## Scored candidates

| Rank | Plugin idea | Impact | Build Complexity | Scope Friction | Priority Score | Why now |
|---:|---|---:|---:|---:|---:|---|
| 1 | **Planner + To Do MCP** | 5 | 2 | 2 | **6** | Strong day-to-day value; complements Teams + Outlook task coordination. |
| 2 | **Power BI / Fabric MCP** | 5 | 3 | 2 | **5** | Already on roadmap; high analytics value with existing Excel/SharePoint data flows. |
| 3 | **Azure Cost Governance MCP** | 5 | 3 | 2 | **5** | Extends current Azure inventory into direct cost outcomes. |
| 4 | **Microsoft OneDrive MCP** | 4 | 2 | 2 | **4** | Natural extension of SharePoint/Excel file workflows. |
| 5 | **Entra ID (Identity) MCP** | 5 | 3 | 3 | **4** | High enterprise need; identity insights unlock admin/security workflows. |
| 6 | **Power Automate MCP** | 4 | 3 | 2 | **3** | Strong operational automation value; moderate implementation depth. |
| 7 | **Microsoft 365 Admin MCP** | 4 | 3 | 3 | **2** | Useful for tenant ops; broader API surface and permissions. |
| 8 | **Dataverse MCP** | 4 | 4 | 3 | **1** | Valuable for enterprise app teams; heavier schema/platform complexity. |
| 9 | **Purview Compliance MCP** | 4 | 4 | 4 | **0** | Important but governance/compliance scopes increase rollout friction. |
| 10 | **Azure Policy & Security Posture MCP** | 4 | 4 | 4 | **0** | Strong security outcomes but deeper policy surface and permission complexity. |

## Recommended next 3 to build

1. **Planner + To Do MCP**
   - Best speed-to-value ratio with low friction and broad user appeal.
2. **Power BI / Fabric MCP**
   - Matches roadmap and creates a clear data/BI story with existing plugins.
3. **Azure Cost Governance MCP**
   - Converts Azure data collection into actionable savings and governance workflows.

## Suggested MVP tool sets

### 1) Planner + To Do MCP (MVP)
- `planner_list_plans`
- `planner_list_tasks`
- `planner_create_task`
- `planner_update_task`
- `todo_list_lists`
- `todo_list_tasks`

### 2) Power BI / Fabric MCP (MVP)
- `powerbi_list_workspaces`
- `powerbi_list_datasets`
- `powerbi_list_reports`
- `powerbi_get_refresh_history`
- `powerbi_trigger_refresh`

### 3) Azure Cost Governance MCP (MVP)
- `azure_cost_query`
- `azure_list_budgets`
- `azure_get_budget`
- `azure_recommend_idle_resources`

## Re-scoring cadence

Re-score quarterly or after major platform shifts. Adjust weights when GTM priorities change (e.g., enterprise compliance focus vs. SMB productivity focus).
