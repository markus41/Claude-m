# Azure Container Jobs — .NET 8 Console App

For long-running batch scans (full tenant inventory, large OneDrive sweeps) that exceed Azure
Functions' 10-minute execution limit, use Azure Container Apps Jobs or Azure Container Instances.

---

## Project Setup

### .csproj

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <RootNamespace>GraphBatchJob</RootNamespace>
    <DockerDefaultTargetOS>Linux</DockerDefaultTargetOS>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.Hosting" Version="8.*" />
    <PackageReference Include="Microsoft.Graph" Version="5.*" />
    <PackageReference Include="Azure.Identity" Version="1.*" />
    <PackageReference Include="Microsoft.Extensions.Azure" Version="1.*" />
    <PackageReference Include="Microsoft.Extensions.Http.Resilience" Version="8.*" />
    <PackageReference Include="Azure.Storage.Blobs" Version="12.*" />
    <PackageReference Include="CsvHelper" Version="33.*" />
    <PackageReference Include="Microsoft.Extensions.Configuration.AzureKeyVault" Version="3.*" />
  </ItemGroup>
</Project>
```

### Program.cs — generic host pattern

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(args);

// Configuration
builder.Configuration
    .AddEnvironmentVariables()
    .AddJsonFile("appsettings.json", optional: true);

// Azure Key Vault (optional)
var kvUri = builder.Configuration["KEY_VAULT_URI"];
if (!string.IsNullOrEmpty(kvUri))
    builder.Configuration.AddAzureKeyVault(new Uri(kvUri), new DefaultAzureCredential());

// Services
builder.Services.AddSingleton(_ =>
    new GraphServiceClient(new DefaultAzureCredential(),
        ["https://graph.microsoft.com/.default"]));

builder.Services.AddResiliencePipeline("graph", pipeline =>
    pipeline.AddRetry(new RetryStrategyOptions
    {
        MaxRetryAttempts = 6,
        BackoffType = DelayBackoffType.Exponential,
        UseJitter = true,
        Delay = TimeSpan.FromSeconds(2),
        MaxDelay = TimeSpan.FromSeconds(60),
        ShouldHandle = new PredicateBuilder()
            .Handle<ODataError>(e => e.ResponseStatusCode is 429 or 503 or 504)
    }));

builder.Services.AddSingleton<IDeltaStateStore>(sp =>
    new BlobDeltaStateStore(
        new BlobContainerClient(
            builder.Configuration["AZURE_STORAGE_CONNECTION"],
            "sp-reports")));

builder.Services.AddScoped<IDeltaScanService, DeltaScanService>();
builder.Services.AddScoped<IDuplicateDetectionService, DuplicateDetectionService>();
builder.Services.AddHostedService<ScanJobWorker>();

var host = builder.Build();
await host.RunAsync();
```

### ScanJobWorker — IHostedService that runs and exits

```csharp
public class ScanJobWorker(
    IDeltaScanService scanService,
    IDuplicateDetectionService dupService,
    IConfiguration config,
    ILogger<ScanJobWorker> logger,
    IHostApplicationLifetime lifetime) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        try
        {
            logger.LogInformation("Scan job starting at {time}", DateTimeOffset.UtcNow);

            var siteUrl = config["GRAPH_SITE_URL"]
                ?? throw new InvalidOperationException("GRAPH_SITE_URL required");

            // Resolve site ID
            var host = new Uri(siteUrl).Host;
            var sitePath = new Uri(siteUrl).AbsolutePath.TrimStart('/');
            var site = await graphClient.Sites[$"{host}:/{sitePath}"]
                .GetAsync(cancellationToken: ct);

            // Full scan
            var result = await scanService.ScanSiteAsync(site!.Id!, allDrives: true, ct);

            logger.LogInformation(
                "Scan complete: {files} files, {gb} GB, {drives} drives",
                result.TotalFiles, result.TotalSizeGb, result.DrivesScanned);

            // Duplicate analysis
            var dupReport = dupService.Analyze(result.Items);
            logger.LogInformation(
                "Duplicates: {exact} exact groups, {near} near groups, {wasted} GB wasted",
                dupReport.ExactDuplicates.Count,
                dupReport.NearDuplicates.Count,
                dupReport.TotalWastedGb);

            // Write outputs to Blob Storage
            await WriteOutputsAsync(result, dupReport, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Scan job failed");
            Environment.ExitCode = 1;
        }
        finally
        {
            lifetime.StopApplication(); // Signal container to exit
        }
    }
}
```

---

## Dockerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["GraphBatchJob.csproj", "."]
RUN dotnet restore
COPY . .
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "GraphBatchJob.dll"]
```

---

## Azure Container Apps Job — Bicep

```bicep
resource scanJob 'Microsoft.App/jobs@2023-05-01' = {
  name: 'graph-scan-job'
  location: location
  identity: {
    type: 'SystemAssigned'  // ManagedIdentity for DefaultAzureCredential
  }
  properties: {
    environmentId: containerAppsEnvironment.id
    configuration: {
      triggerType: 'Schedule'
      scheduleTriggerConfig: {
        cronExpression: '0 2 * * *'  // daily at 02:00 UTC
        parallelism: 1
        replicaCompletionCount: 1
      }
      replicaTimeout: 1800  // 30 minutes
      replicaRetryLimit: 2
    }
    template: {
      containers: [{
        name: 'scan-job'
        image: '${acrName}.azurecr.io/graph-scan-job:latest'
        resources: {
          cpu: json('0.5')
          memory: '1Gi'
        }
        env: [
          { name: 'GRAPH_SITE_URL', value: graphSiteUrl }
          { name: 'AZURE_STORAGE_CONNECTION', secretRef: 'storage-connection' }
          { name: 'KEY_VAULT_URI', value: keyVaultUri }
        ]
      }]
    }
  }
}
```

---

## Managed Identity — Role Assignments

After deployment, assign Graph app roles to the Container App's Managed Identity:

```bash
# Get the managed identity's object ID
OBJECT_ID=$(az containerapp job show \
  --name graph-scan-job \
  --resource-group rg-graph \
  --query "identity.principalId" -o tsv)

# Assign Sites.Read.All app role
GRAPH_APP_ID="00000003-0000-0000-c000-000000000000"  # Microsoft Graph
ROLE_ID=$(az ad sp show --id $GRAPH_APP_ID \
  --query "appRoles[?value=='Sites.Read.All'].id" -o tsv)

az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$OBJECT_ID/appRoleAssignments" \
  --body "{\"principalId\":\"$OBJECT_ID\",\"resourceId\":\"$(az ad sp show --id $GRAPH_APP_ID --query id -o tsv)\",\"appRoleId\":\"$ROLE_ID\"}"
```

---

## appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning"
    }
  },
  "ApplicationInsights": {
    "ConnectionString": ""
  },
  "GRAPH_SITE_URL": "",
  "KEY_VAULT_URI": "",
  "AZURE_STORAGE_CONNECTION": "UseDevelopmentStorage=true"
}
```
