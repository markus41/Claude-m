---
dotnet_version: net8.0
project_type: api
auth_mode: azure-ad
database: none
app_service_sku: B1
resource_group: rg-webapp
location: eastus
cicd: github-actions
graph_integration: false
---

# azure-dotnet-webapp — Local Settings

Edit the YAML frontmatter above to set your project defaults.
Commands will use these values when you don't provide flags explicitly.

## Fields

| Field | Values | Default | Description |
|-------|--------|---------|-------------|
| `dotnet_version` | `net8.0` | `net8.0` | Target framework moniker |
| `project_type` | `api`, `blazor`, `both` | `api` | Project type for scaffolding |
| `auth_mode` | `none`, `azure-ad`, `jwt` | `azure-ad` | Authentication model |
| `database` | `none`, `sql` | `none` | Database type |
| `app_service_sku` | `B1`, `B2`, `P1v3`, `P2v3` | `B1` | App Service Plan SKU |
| `resource_group` | any string | `rg-webapp` | Azure resource group |
| `location` | Azure region | `eastus` | Deployment region |
| `cicd` | `github-actions`, `azure-devops`, `both`, `none` | `github-actions` | CI/CD pipeline type |
| `graph_integration` | `true`, `false` | `false` | Wire azure-graph-dotnet services |
