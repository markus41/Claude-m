# azure-graph-dotnet

Scaffold and build Microsoft Graph C# / .NET solutions on Azure — Azure Functions, Container
Jobs, Azure Identity, Polly resilience, and complete SharePoint file intelligence implementations.

## What This Plugin Does

Provides everything needed to build production-grade C# / .NET applications that call Microsoft
Graph on Azure:

1. **Setup** — checks toolchain, scaffolds project, configures auth
2. **Scaffold Functions** — timer/HTTP/Durable Azure Function classes with full DI wiring
3. **Scaffold Container Job** — batch console app with Dockerfile and ACA Job Bicep
4. **Add Graph Operations** — drop-in service classes for delta scan, dedup, metadata, file moves
5. **Deploy** — Bicep infra, Managed Identity Graph permissions, GitHub Actions / Azure DevOps CI/CD
6. **Review** — AI code review agent checks auth, resilience, SDK usage, and security

## Install

```bash
/plugin install azure-graph-dotnet@claude-m-microsoft-marketplace
```

## Quick Start

```bash
# 1. Set up a new project
/azure-graph-dotnet:dotnet-setup --functions

# 2. Scaffold the delta scan function
/azure-graph-dotnet:scaffold-function delta-scan --trigger timer

# 3. Add duplicate detection
/azure-graph-dotnet:add-graph-operation duplicate-detection

# 4. Deploy to Azure
/azure-graph-dotnet:deploy-azure --resource-group rg-graph-intelligence

# 5. Review code quality
"review my Azure Graph C# code in ./GraphFileIntelligence"
```

## Commands

| Command | Description |
|---------|-------------|
| `dotnet-setup` | Interactive setup — toolchain check, project scaffold, credentials, build verify |
| `scaffold-function` | Generate Azure Function class (timer/HTTP/Durable) for a Graph operation |
| `scaffold-console` | Generate Console App / ACA Container Job with Dockerfile and Bicep |
| `add-graph-operation` | Add service + interface + models for a specific Graph operation |
| `deploy-azure` | Provision infra, deploy, assign Managed Identity permissions, generate CI/CD |

## Agent

**`dotnet-graph-reviewer`** — triggered by "review my Graph C# code". Checks:
- `DefaultAzureCredential` / `GraphServiceClient` as Singleton
- `PageIterator` for pagination (not manual `nextLink` loops)
- Polly v8 `ResiliencePipeline` with exponential backoff + jitter
- Batch requests for bulk operations
- Missing `CancellationToken` propagation
- Hardcoded credentials, over-permissioned scopes, log data leaks

## Settings

Create `.claude/azure-graph-dotnet.local.md` to configure defaults:

```yaml
---
dotnet_version: net8.0
hosting_model: functions    # functions | container-job
default_namespace: MyCompany.GraphIntelligence
resource_group: rg-graph-intelligence
location: eastus
acr_name: ""
cicd: github-actions        # github-actions | azure-devops | both
---
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | C# 12 / .NET 8 |
| Graph SDK | `Microsoft.Graph` v5 |
| Authentication | `Azure.Identity` — `DefaultAzureCredential` |
| Hosting | Azure Functions v4 (isolated worker) or Azure Container Apps Jobs |
| Resilience | `Polly` v8 — `ResiliencePipeline` with exponential backoff |
| Observability | Application Insights + `ILogger<T>` |
| Secrets | Azure Key Vault via config provider |
| Storage | Azure Blob Storage for inventory output + delta state |
| IaC | Bicep |
| CI/CD | GitHub Actions (OIDC) or Azure DevOps |

## Related Plugins

- `sharepoint-file-intelligence` — the Node.js / Graph pattern reference this plugin implements in C#
- `azure-functions` — general Azure Functions guidance
- `azure-key-vault` — Key Vault secrets and rotation
- `azure-monitor` — Application Insights and KQL queries
