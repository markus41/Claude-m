---
name: azure-dotnet-webapp
description: >
  Deep expertise in building ASP.NET Core Web API and Blazor applications on Azure —
  Minimal API, MVC controllers, Microsoft.Identity.Web OIDC/JWT auth, EF Core with
  Managed Identity, SignalR hubs, OpenAPI/Swagger, rate limiting, health checks,
  Blazor Server/WASM/Auto render modes, App Service deployment with Bicep, and
  Microsoft Graph API integration patterns for web apps.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - aspnetcore
  - asp.net core
  - minimal api
  - blazor server
  - blazor wasm
  - web api dotnet
  - csharp web app
  - microsoft.identity.web
  - efcore azure
  - signalr dotnet
  - dotnet openapi
  - dotnet app service
  - scaffold webapi
  - scaffold blazor
  - csharp controllers
  - dotnet jwt auth
  - azure web app dotnet
  - dotnet deploy app service
  - aspnetcore middleware
  - blazor auto render
  - dotnet rate limiting
  - aspnetcore health checks
  - efcore migrations
  - dotnet swagger
  - microsoft identity platform dotnet
---

# Azure .NET Web App

This skill provides comprehensive patterns for building ASP.NET Core Web API and Blazor
applications, hosted on Azure App Service. It covers the full development lifecycle: project
scaffolding, authentication with Microsoft Identity Platform, EF Core with Azure SQL and Managed
Identity, real-time features with SignalR, OpenAPI documentation, and production deployment with
Bicep + CI/CD pipelines.

## NuGet Package Versions (as of 2025)

| Package | Version | Purpose |
|---------|---------|---------|
| `Microsoft.AspNetCore.OpenApi` | 8.x | OpenAPI endpoint metadata |
| `Swashbuckle.AspNetCore` | 6.x | Swagger UI |
| `Microsoft.Identity.Web` | 2.x | Azure AD / Entra OIDC + JWT bearer |
| `Microsoft.Identity.Web.GraphServiceClient` | 2.x | Graph client DI for web apps |
| `Microsoft.EntityFrameworkCore.SqlServer` | 8.x | EF Core for Azure SQL |
| `Microsoft.EntityFrameworkCore.Tools` | 8.x | Migrations CLI |
| `Microsoft.AspNetCore.SignalR` | 8.x | Real-time hubs (included in framework) |
| `Azure.Identity` | 1.x | Managed Identity for DB connections |
| `Microsoft.Extensions.Diagnostics.HealthChecks` | 8.x | `/health` endpoint |
| `Microsoft.AspNetCore.RateLimiting` | 8.x | Rate limiting middleware (in framework) |

---

## 1. Program.cs — Minimal Host

Service registration order and middleware pipeline order both matter in ASP.NET Core.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// ── Services ─────────────────────────────────────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization();

// EF Core with DefaultAzureCredential (no password in config)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AzureSQL")));

builder.Services.AddControllers();          // MVC controllers
// -or-
builder.Services.AddEndpointsApiExplorer(); // Minimal API

builder.Services.AddOpenApi();              // .NET 8+ built-in OpenAPI
builder.Services.AddSwaggerGen();           // Swagger UI (Swashbuckle)

builder.Services.AddSignalR();

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("fixed", o =>
    {
        o.Window = TimeSpan.FromMinutes(1);
        o.PermitLimit = 100;
    });
});

// Register domain services
builder.Services.AddScoped<IFileInventoryService, FileInventoryService>();

var app = builder.Build();

// ── Middleware pipeline (ORDER MATTERS) ──────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();               // Must precede Auth
app.UseAuthentication();        // Must precede Authorization
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHealthChecks("/health");

await app.RunAsync();
```

---

## 2. Minimal API vs. Controllers

| Use Minimal API when | Use Controllers when |
|---------------------|---------------------|
| ≤ 10 endpoints, simple CRUD | Many endpoints, complex routing |
| Microservice / function-like | Traditional MVC structure |
| Prototype / PoC | Teams familiar with MVC |
| Endpoint filters suffice | Action filters, model binding needed |

### Minimal API endpoint group

```csharp
// Features/FileInventory/FileInventoryEndpoints.cs
public static class FileInventoryEndpoints
{
    public static IEndpointRouteBuilder MapFileInventory(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/files")
            .WithTags("FileInventory")
            .RequireAuthorization()
            .RequireRateLimiting("fixed");

        group.MapGet("/", GetAll)
            .WithName("GetFiles")
            .Produces<IEnumerable<FileInventoryDto>>();

        group.MapGet("/{id}", GetById)
            .WithName("GetFileById")
            .Produces<FileInventoryDto>()
            .ProducesProblem(404);

        group.MapPost("/", Create)
            .WithName("CreateFile")
            .Accepts<CreateFileRequest>("application/json")
            .Produces<FileInventoryDto>(201)
            .ProducesValidationProblem();

        return app;
    }

    static async Task<IResult> GetAll(IFileInventoryService svc, CancellationToken ct) =>
        Results.Ok(await svc.GetAllAsync(ct));

    static async Task<IResult> GetById(string id, IFileInventoryService svc, CancellationToken ct)
    {
        var item = await svc.GetByIdAsync(id, ct);
        return item is null ? Results.NotFound() : Results.Ok(item);
    }

    static async Task<IResult> Create(
        CreateFileRequest req, IFileInventoryService svc, CancellationToken ct)
    {
        var created = await svc.CreateAsync(req, ct);
        return Results.CreatedAtRoute("GetFileById", new { id = created.Id }, created);
    }
}

// Program.cs — wire it up
app.MapFileInventory();
```

---

## 3. Microsoft.Identity.Web — Authentication

See deep-dive: [`references/auth-identity-web.md`](./references/auth-identity-web.md)

### Web API (JWT Bearer — machine-to-machine or SPA)

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

// appsettings.json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "<tenant-id>",
    "ClientId": "<client-id>",
    "Audience": "api://<client-id>"
  }
}
```

### Scope validation in controllers/endpoints

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController(
    IFileInventoryService svc,
    IHttpContextAccessor httpContextAccessor) : ControllerBase
{
    private const string ReadScope = "Files.Read";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FileInventoryDto>>> GetAll(CancellationToken ct)
    {
        // Validate scope from the JWT token
        HttpContext.VerifyUserHasAnyAcceptedScope(ReadScope);
        return Ok(await svc.GetAllAsync(ct));
    }
}
```

---

## 4. Graph API Integration Pattern

Inject `GraphServiceClient` from `Microsoft.Identity.Web.GraphServiceClient` for OBO flow
(web app calls Graph on behalf of the signed-in user):

```csharp
// Program.cs — for Blazor or MVC with user OBO flow
builder.Services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"))
    .EnableTokenAcquisitionToCallDownstreamApi(["Files.Read.All"])
    .AddMicrosoftGraph(builder.Configuration.GetSection("MicrosoftGraph"))
    .AddInMemoryTokenCaches();

// appsettings.json
{
  "MicrosoftGraph": {
    "BaseUrl": "https://graph.microsoft.com/v1.0",
    "Scopes": "Files.Read.All"
  }
}

// In controller / service — GraphServiceClient is injected via DI
public class GraphFilesController(GraphServiceClient graphClient) : ControllerBase
{
    [HttpGet("drives")]
    public async Task<IActionResult> GetDrives([FromQuery] string siteId, CancellationToken ct)
    {
        var drives = await graphClient.Sites[siteId].Drives
            .GetAsync(config =>
                config.QueryParameters.Select = ["id", "name", "driveType"],
                cancellationToken: ct);
        return Ok(drives?.Value);
    }
}
```

---

## 5. EF Core with DefaultAzureCredential

See deep-dive: [`references/efcore-azure-sql.md`](./references/efcore-azure-sql.md)

```csharp
// No password — use Managed Identity / DefaultAzureCredential
// Connection string in appsettings.json:
// "Server=tcp:<server>.database.windows.net;Database=<db>;Authentication=Active Directory Default"

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<FileInventoryItem> FileInventory => Set<FileInventoryItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FileInventoryItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.HasIndex(e => e.DriveId);
        });
    }
}
```

---

## 6. Blazor Architecture

See deep-dive: [`references/blazor-patterns.md`](./references/blazor-patterns.md)

### Render mode selection

```csharp
// Program.cs — .NET 8 Blazor Web App (supports all render modes)
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddInteractiveWebAssemblyComponents();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(Client._Imports).Assembly);
```

### Component with auth guard

```razor
@page "/files"
@attribute [Authorize]
@rendermode InteractiveServer
@inject IFileInventoryService FileService

<PageTitle>File Inventory</PageTitle>

<AuthorizeView>
    <Authorized>
        @if (files is null)
        {
            <p>Loading...</p>
        }
        else
        {
            <QuickGrid Items="@files.AsQueryable()">
                <PropertyColumn Property="@(f => f.Name)" Sortable="true" />
                <PropertyColumn Property="@(f => f.SizeMb)" Title="Size (MB)" />
            </QuickGrid>
        }
    </Authorized>
    <NotAuthorized>
        <p>Please sign in to view files.</p>
    </NotAuthorized>
</AuthorizeView>

@code {
    private List<FileInventoryDto>? files;

    protected override async Task OnInitializedAsync()
    {
        files = await FileService.GetAllAsync();
    }
}
```

---

## 7. Progressive Disclosure — Reference Files

| Topic | File |
|-------|------|
| Program.cs, middleware pipeline, DI, configuration | [`references/aspnetcore-patterns.md`](./references/aspnetcore-patterns.md) |
| Microsoft.Identity.Web, JWT, OIDC, MSAL | [`references/auth-identity-web.md`](./references/auth-identity-web.md) |
| Blazor Server, WASM, Auto render modes | [`references/blazor-patterns.md`](./references/blazor-patterns.md) |
| EF Core, Azure SQL, Managed Identity, migrations | [`references/efcore-azure-sql.md`](./references/efcore-azure-sql.md) |
| Swagger/NSwag, SignalR hubs, health checks, rate limiting | [`references/openapi-signalr.md`](./references/openapi-signalr.md) |
| Bicep (App Service Plan), GH Actions, ADO, slots | [`references/webapp-cicd.md`](./references/webapp-cicd.md) |
