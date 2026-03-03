# Azure Functions — .NET 8 Isolated Worker

Reference for building Azure Functions with the .NET 8 isolated worker model for Graph API workloads.

---

## Project Setup

### .csproj

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <AzureFunctionsVersion>v4</AzureFunctionsVersion>
    <OutputType>Exe</OutputType>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <RootNamespace>GraphWorker</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.*" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="1.*" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.*" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Timer" Version="4.*" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.ApplicationInsights" Version="1.*" />
    <PackageReference Include="Microsoft.Graph" Version="5.*" />
    <PackageReference Include="Azure.Identity" Version="1.*" />
    <PackageReference Include="Microsoft.Extensions.Azure" Version="1.*" />
    <PackageReference Include="Microsoft.Extensions.Http.Resilience" Version="8.*" />
    <PackageReference Include="CsvHelper" Version="33.*" />
  </ItemGroup>

  <ItemGroup>
    <None Update="host.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Update="local.settings.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
  </ItemGroup>
</Project>
```

### host.json

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20,
        "excludedTypes": "Request"
      },
      "enableLiveDashboardFilters": true
    }
  },
  "functionTimeout": "00:30:00"
}
```

### local.settings.json (never commit)

```json
{
  "IsEncryptedIsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "AZURE_TENANT_ID": "",
    "AZURE_CLIENT_ID": "",
    "AZURE_CLIENT_SECRET": "",
    "GRAPH_TENANT_ROOT_URL": "https://contoso.sharepoint.com",
    "SCAN_OUTPUT_CONTAINER": "sp-reports",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": ""
  }
}
```

---

## Trigger Types

### Timer Trigger — scheduled scan

```csharp
[Function("DailyScan")]
public async Task RunTimer(
    [TimerTrigger("0 0 2 * * *")] TimerInfo timerInfo,
    CancellationToken ct)
{
    if (timerInfo.IsPastDue)
        logger.LogWarning("Timer is running late");

    await scanService.ScanAllDrivesAsync(ct);
}
```

CRON format: `{second} {minute} {hour} {day} {month} {day-of-week}`

| Schedule | CRON expression |
|----------|----------------|
| Daily at 02:00 UTC | `0 0 2 * * *` |
| Every 6 hours | `0 0 */6 * * *` |
| Weekdays at 08:00 | `0 0 8 * * 1-5` |
| Every 15 minutes | `0 */15 * * * *` |

### HTTP Trigger — on-demand scan

```csharp
[Function("TriggerScan")]
public async Task<HttpResponseData> RunHttp(
    [HttpTrigger(AuthorizationLevel.Function, "post", Route = "scan/{siteId}")] HttpRequestData req,
    string siteId,
    CancellationToken ct)
{
    logger.LogInformation("Manual scan triggered for site {siteId}", siteId);

    var result = await scanService.ScanSiteAsync(siteId, ct);

    var response = req.CreateResponse(HttpStatusCode.OK);
    await response.WriteAsJsonAsync(result, ct);
    return response;
}
```

### Durable — orchestrated long-running scan

```csharp
// Orchestrator
[Function("ScanOrchestrator")]
public async Task<ScanSummary> RunOrchestrator(
    [OrchestrationTrigger] TaskOrchestrationContext context)
{
    var sites = await context.CallActivityAsync<List<string>>("GetAllSites");

    // Fan-out: scan each site in parallel
    var tasks = sites.Select(siteId =>
        context.CallActivityAsync<SiteResult>("ScanSite", siteId));

    var results = await Task.WhenAll(tasks);
    return new ScanSummary(results);
}

// Activity
[Function("ScanSite")]
public async Task<SiteResult> ScanSite(
    [ActivityTrigger] string siteId,
    FunctionContext context)
{
    return await scanService.ScanSiteAsync(siteId);
}
```

---

## Configuration and Secrets

### Reading from environment / App Settings

```csharp
// Inject IConfiguration
private readonly string _tenantRootUrl;

public MyService(IConfiguration config)
{
    _tenantRootUrl = config["GRAPH_TENANT_ROOT_URL"]
        ?? throw new InvalidOperationException("GRAPH_TENANT_ROOT_URL not configured");
}
```

### Azure Key Vault integration

Add Key Vault as a configuration source in `Program.cs`:

```csharp
.ConfigureAppConfiguration((context, config) =>
{
    var builtConfig = config.Build();
    var keyVaultUri = builtConfig["KEY_VAULT_URI"];

    if (!string.IsNullOrEmpty(keyVaultUri))
    {
        config.AddAzureKeyVault(
            new Uri(keyVaultUri),
            new DefaultAzureCredential());
    }
})
```

In Azure Portal: add Key Vault references in Function App config as `@Microsoft.KeyVault(SecretUri=https://vault.azure.net/secrets/ClientSecret/)`.

---

## Dependency Injection Patterns

### Scoped vs Singleton

| Service | Lifetime | Why |
|---------|----------|-----|
| `GraphServiceClient` | Singleton | Token cache reuse, connection pooling |
| `IDeltaScanService` | Scoped | Per-invocation state isolation |
| `IDuplicateDetectionService` | Transient | Pure computation, no state |
| `ResiliencePipeline` | Singleton | Pipeline is stateless after build |

### Output binding to Azure Blob Storage

```csharp
[Function("InventoryScan")]
[BlobOutput("sp-reports/{DateTime}-inventory.csv", Connection = "AzureWebJobsStorage")]
public async Task<string> RunTimer(
    [TimerTrigger("0 0 2 * * *")] TimerInfo timer,
    CancellationToken ct)
{
    var items = await scanService.ScanAllAsync(ct);
    return await csvWriter.SerializeAsync(items);
}
```

---

## Local Development

### Prerequisites

```bash
# Azure Functions Core Tools v4
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Azurite (local storage emulator)
npm install -g azurite

# Start Azurite
azurite --silent --location .azurite --debug .azurite/debug.log &

# Run function locally
func start
```

### Using Azure CLI credentials locally

```bash
az login
az account set --subscription <id>
# DefaultAzureCredential will use AzureCLI credential automatically
```

---

## Deployment

See [`cicd-deployment.md`](./cicd-deployment.md) for full GitHub Actions / Azure DevOps pipelines.

Quick manual deploy:

```bash
# Publish
dotnet publish -c Release -o ./publish

# Deploy to Azure
func azure functionapp publish <function-app-name> --dotnet-isolated
```
