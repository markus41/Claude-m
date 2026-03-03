# ASP.NET Core Patterns — Program.cs, Middleware, DI, Configuration

## Program.cs Service Registration Order

Services must be registered before `builder.Build()`. Order within `AddServices` calls
is generally not significant, but DI lifetime choices matter.

```csharp
var builder = WebApplication.CreateBuilder(args);

// 1. Configuration (auto-loaded from appsettings.json, env vars, Key Vault)
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{builder.Configuration["KeyVaultName"]}.vault.azure.net/"),
    new DefaultAzureCredential());

// 2. Auth — always before MVC/controllers
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build(); // all endpoints require auth unless [AllowAnonymous]
});

// 3. MVC / Minimal API
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.DefaultIgnoreCondition =
        JsonIgnoreCondition.WhenWritingNull);
builder.Services.AddEndpointsApiExplorer();

// 4. OpenAPI / Swagger
builder.Services.AddOpenApi();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "My API", Version = "v1" });
    c.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.OAuth2,
        Flows = new OpenApiOAuthFlows
        {
            AuthorizationCode = new OpenApiOAuthFlow
            {
                AuthorizationUrl = new Uri("https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize"),
                TokenUrl = new Uri("https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token")
            }
        }
    });
});

// 5. Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AzureSQL")));

// 6. Caching
builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache(); // swap for Redis in production

// 7. HTTP clients
builder.Services.AddHttpClient<IExternalApiClient, ExternalApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["ExternalApi:BaseUrl"]!));

// 8. Background services
builder.Services.AddHostedService<BackgroundSyncWorker>();

// 9. Domain services (always after framework services)
builder.Services.AddScoped<IFileInventoryService, FileInventoryService>();
builder.Services.AddScoped<IDuplicateDetectionService, DuplicateDetectionService>();
builder.Services.AddSingleton<IHashingService, HashingService>();

// 10. SignalR
builder.Services.AddSignalR();

// 11. Health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database")
    .AddCheck("self", () => HealthCheckResult.Healthy());

// 12. Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("api", o =>
    {
        o.Window = TimeSpan.FromMinutes(1);
        o.PermitLimit = 100;
        o.QueueLimit = 10;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    options.AddSlidingWindowLimiter("burst", o =>
    {
        o.Window = TimeSpan.FromSeconds(10);
        o.SegmentsPerWindow = 5;
        o.PermitLimit = 20;
    });
});

// 13. CORS (before controllers)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(builder.Configuration["AllowedOrigins"]!.Split(','))
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()); // required for SignalR
});

var app = builder.Build();
```

---

## Middleware Pipeline — Correct Order

The order of `Use*` calls defines the request processing pipeline. Wrong order causes
silent bugs (e.g., auth not applied, CORS headers missing).

```csharp
// ── Exception handling FIRST (catches errors from all downstream middleware) ──
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "v1"));
}
else
{
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

// ── Security headers ──
app.UseHttpsRedirection();

// ── Static files (served before routing — no auth check needed) ──
app.UseStaticFiles();

// ── CORS must be before routing ──
app.UseCors("AllowFrontend");

// ── Routing (enables endpoint pattern matching) ──
app.UseRouting();

// ── Rate limiting (after routing, before auth) ──
app.UseRateLimiter();

// ── Auth (UseAuthentication MUST come before UseAuthorization) ──
app.UseAuthentication();
app.UseAuthorization();

// ── Endpoints ──
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHealthChecks("/health").AllowAnonymous();
app.MapGet("/error", () => Results.Problem()).AllowAnonymous();

await app.RunAsync();
```

---

## DI Lifetimes

| Lifetime | Use for | Caution |
|----------|---------|---------|
| `Singleton` | Config, caches, `GraphServiceClient`, `ResiliencePipeline`, `IHttpClientFactory` | Cannot depend on Scoped services |
| `Scoped` | `DbContext`, per-request state, Graph OBO token acquisition | One instance per HTTP request / SignalR connection |
| `Transient` | Lightweight stateless utilities | Creates new instance every injection |

### Captive dependency anti-pattern

```csharp
// WRONG — Singleton captures Scoped service; DbContext is not thread-safe
builder.Services.AddSingleton<IFileService, FileService>(); // FileService has DbContext dep

// CORRECT — Use Scoped or inject IServiceScopeFactory in Singleton
builder.Services.AddScoped<IFileService, FileService>();

// For background service (Singleton) that needs Scoped services:
public class BackgroundWorker(IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<IFileService>();
        await svc.ProcessAsync(ct);
    }
}
```

---

## Configuration — Layered Sources

ASP.NET Core loads configuration in this order (later overrides earlier):
1. `appsettings.json`
2. `appsettings.{Environment}.json`
3. Environment variables (`ASPNETCORE_*`, `AZURE_*`)
4. Command-line args
5. Azure Key Vault (if configured)
6. User secrets (Development only — `dotnet user-secrets`)

```json
// appsettings.json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "<tenant-id>",
    "ClientId": "<client-id>",
    "Audience": "api://<client-id>"
  },
  "ConnectionStrings": {
    "AzureSQL": "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<db>;Authentication=Active Directory Default;"
  },
  "KeyVaultName": "<vault-name>",
  "AllowedOrigins": "https://myapp.azurewebsites.net",
  "ExternalApi": {
    "BaseUrl": "https://api.example.com/"
  }
}
```

### Bind typed options

```csharp
// Options class
public class AzureAdOptions
{
    public string Instance { get; set; } = "";
    public string TenantId { get; set; } = "";
    public string ClientId { get; set; } = "";
}

// Program.cs
builder.Services.Configure<AzureAdOptions>(
    builder.Configuration.GetSection("AzureAd"));

// Injection
public class MyService(IOptions<AzureAdOptions> options)
{
    private readonly AzureAdOptions _config = options.Value;
}
```

---

## Global Exception Handler (ProblemDetails)

```csharp
// Program.cs
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// GlobalExceptionHandler.cs
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken ct)
    {
        logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);

        var problemDetails = new ProblemDetails
        {
            Status = exception switch
            {
                KeyNotFoundException => StatusCodes.Status404NotFound,
                UnauthorizedAccessException => StatusCodes.Status403Forbidden,
                ArgumentException => StatusCodes.Status400BadRequest,
                _ => StatusCodes.Status500InternalServerError
            },
            Title = "An error occurred",
            Detail = exception.Message
        };

        context.Response.StatusCode = problemDetails.Status!.Value;
        await context.Response.WriteAsJsonAsync(problemDetails, ct);
        return true;
    }
}
```
