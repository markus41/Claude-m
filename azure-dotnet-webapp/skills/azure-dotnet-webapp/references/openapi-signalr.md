# OpenAPI, SignalR, Health Checks, and Rate Limiting

## OpenAPI — .NET 8 Built-in + Swashbuckle

### Minimal setup

```csharp
// Program.cs
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "My Web API",
        Version = "v1",
        Description = "ASP.NET Core Web API on Azure"
    });

    // Include XML comments
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));

    // Bearer token in Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
        c.RoutePrefix = "swagger"; // accessible at /swagger
    });
}
```

### Enable XML doc generation in .csproj

```xml
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <NoWarn>$(NoWarn);1591</NoWarn>
</PropertyGroup>
```

### XML doc comments on controllers

```csharp
/// <summary>
/// Returns all file inventory items for the authenticated user's tenant.
/// </summary>
/// <param name="driveId">Optional filter by drive ID.</param>
/// <param name="ct">Cancellation token.</param>
/// <returns>List of file inventory records.</returns>
/// <response code="200">Returns the file list</response>
/// <response code="401">Unauthorized — missing or invalid token</response>
/// <response code="403">Forbidden — missing required scope</response>
[HttpGet]
[ProducesResponseType<IEnumerable<FileInventoryDto>>(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<ActionResult<IEnumerable<FileInventoryDto>>> GetAll(
    [FromQuery] string? driveId,
    CancellationToken ct)
{
    // ...
}
```

### Minimal API OpenAPI metadata

```csharp
app.MapGet("/api/files", GetFiles)
    .WithName("GetFiles")
    .WithSummary("Get all file inventory items")
    .WithDescription("Returns all files. Filter by driveId via query string.")
    .WithTags("Files")
    .Produces<IEnumerable<FileInventoryDto>>()
    .ProducesProblem(StatusCodes.Status401Unauthorized)
    .ProducesProblem(StatusCodes.Status403Forbidden);
```

---

## SignalR Hubs

### Hub definition

```csharp
// Hubs/NotificationHub.cs
[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier; // from JWT sub claim
        _logger.LogInformation("Client connected: {ConnectionId}, User: {UserId}",
            Context.ConnectionId, userId);

        // Add to user-specific group
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // Client calls this method
    public async Task JoinDriveGroup(string driveId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"drive-{driveId}");
        await Clients.Caller.SendAsync("JoinedGroup", driveId);
    }
}
```

### Hub registration and mapping

```csharp
// Program.cs
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 32 * 1024; // 32 KB
});

app.MapHub<NotificationHub>("/hubs/notifications");
```

### Push notifications from services

```csharp
// Inject IHubContext<T> to send from outside the hub
public class ScanCompletionService(IHubContext<NotificationHub> hubContext)
{
    public async Task NotifyScanCompleteAsync(string driveId, ScanResult result, CancellationToken ct)
    {
        // Broadcast to all clients watching this drive
        await hubContext.Clients.Group($"drive-{driveId}")
            .SendAsync("ScanComplete", new
            {
                DriveId = driveId,
                TotalFiles = result.TotalFiles,
                TotalSizeGb = result.TotalSizeGb,
                CompletedAt = DateTimeOffset.UtcNow
            }, ct);
    }
}
```

### TypeScript / JavaScript client

```typescript
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/notifications", {
        accessTokenFactory: () => getAccessToken() // inject bearer token
    })
    .withAutomaticReconnect()
    .build();

connection.on("ScanComplete", (data) => {
    console.log("Scan complete:", data);
});

connection.on("JoinedGroup", (driveId) => {
    console.log(`Joined group for drive: ${driveId}`);
});

await connection.start();
await connection.invoke("JoinDriveGroup", "b!abc123");
```

---

## Health Checks

### Registration

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("azure-sql", tags: ["ready"])
    .AddUrlGroup(new Uri("https://graph.microsoft.com/v1.0/$metadata"), "graph-api", tags: ["ready"])
    .AddCheck<StorageHealthCheck>("azure-storage", tags: ["ready"])
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"]);
```

### Custom health check

```csharp
public class StorageHealthCheck(BlobServiceClient blobClient) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            await blobClient.GetPropertiesAsync(ct);
            return HealthCheckResult.Healthy("Azure Storage is accessible.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Azure Storage is unavailable.", ex);
        }
    }
}
```

### Endpoints

```csharp
// Simple /health — returns 200 Healthy or 503 Unhealthy
app.MapHealthChecks("/health").AllowAnonymous();

// Detailed JSON response
app.MapHealthChecks("/health/detail", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse // NuGet: AspNetCore.HealthChecks.UI.Client
}).RequireAuthorization();

// Separate readiness / liveness
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
}).AllowAnonymous();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live")
}).AllowAnonymous();
```

---

## Rate Limiting

### Policy types

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Fixed window: 100 requests per 60 seconds
    options.AddFixedWindowLimiter("api", o =>
    {
        o.Window = TimeSpan.FromSeconds(60);
        o.PermitLimit = 100;
        o.QueueLimit = 0; // no queuing — immediately reject
    });

    // Sliding window: smoother distribution
    options.AddSlidingWindowLimiter("burst", o =>
    {
        o.Window = TimeSpan.FromSeconds(10);
        o.SegmentsPerWindow = 5;
        o.PermitLimit = 20;
    });

    // Token bucket: burst allowed up to token limit
    options.AddTokenBucketLimiter("intensive", o =>
    {
        o.TokenLimit = 10;
        o.ReplenishmentPeriod = TimeSpan.FromSeconds(1);
        o.TokensPerPeriod = 2;
        o.AutoReplenishment = true;
    });

    // Concurrency: max simultaneous requests
    options.AddConcurrencyLimiter("concurrent", o =>
    {
        o.PermitLimit = 5;
        o.QueueLimit = 10;
    });

    // Per-user rate limiting using JWT sub claim
    options.AddPolicy("per-user", context =>
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 60
        });
    });
});
```

### Apply to endpoints

```csharp
// Controller
[EnableRateLimiting("api")]
[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase { }

// Minimal API
app.MapGet("/api/files", GetFiles)
    .RequireRateLimiting("per-user");

// Disable for specific endpoint
app.MapGet("/health", CheckHealth)
    .DisableRateLimiting();
```
