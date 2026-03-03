# EF Core + Azure SQL + Managed Identity

## Connection String — No Password

Use `Authentication=Active Directory Default` to let EF Core authenticate via
`DefaultAzureCredential`. No passwords in configuration files.

```json
// appsettings.json
{
  "ConnectionStrings": {
    "AzureSQL": "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<database>;Authentication=Active Directory Default;Encrypt=True;TrustServerCertificate=False;"
  }
}
```

Local development: `az login` populates `AzureCliCredential` in the chain.
In Azure App Service: assign the app's Managed Identity as a user in Azure SQL.

```sql
-- Run once in Azure SQL to grant Managed Identity access
CREATE USER [<app-name>] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [<app-name>];
ALTER ROLE db_datawriter ADD MEMBER [<app-name>];
```

---

## DbContext

```csharp
// AppDbContext.cs
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<FileInventoryItem> FileInventory => Set<FileInventoryItem>();
    public DbSet<DuplicateGroup> DuplicateGroups => Set<DuplicateGroup>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FileInventoryItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.WebUrl).HasMaxLength(1000);
            entity.HasIndex(e => e.DriveId);
            entity.HasIndex(e => e.Sha1Hash);
            entity.HasIndex(e => new { e.DriveId, e.ParentPath }); // composite
        });

        modelBuilder.Entity<DuplicateGroup>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasMany(e => e.Items)
                  .WithOne(e => e.DuplicateGroup)
                  .HasForeignKey(e => e.DuplicateGroupId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

// Program.cs registration
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("AzureSQL"),
        sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null);
            sqlOptions.CommandTimeout(60);
        });

    if (builder.Environment.IsDevelopment())
        options.EnableDetailedErrors().EnableSensitiveDataLogging();
});
```

---

## Entity Models

```csharp
public class FileInventoryItem
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public long SizeBytes { get; set; }
    public string ParentPath { get; set; } = "";
    public string WebUrl { get; set; } = "";
    public DateTimeOffset CreatedDateTime { get; set; }
    public string CreatedBy { get; set; } = "";
    public DateTimeOffset LastModifiedDateTime { get; set; }
    public string LastModifiedBy { get; set; } = "";
    public string? Sha1Hash { get; set; }
    public string? QuickXorHash { get; set; }
    public string DriveId { get; set; } = "";
    public string DriveType { get; set; } = "";

    // Navigation
    public string? DuplicateGroupId { get; set; }
    public DuplicateGroup? DuplicateGroup { get; set; }
}
```

---

## Repository Pattern

```csharp
public interface IFileInventoryRepository
{
    Task<IReadOnlyList<FileInventoryItem>> GetAllAsync(CancellationToken ct = default);
    Task<FileInventoryItem?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<IReadOnlyList<FileInventoryItem>> GetByDriveAsync(string driveId, CancellationToken ct = default);
    Task UpsertBatchAsync(IEnumerable<FileInventoryItem> items, CancellationToken ct = default);
    Task<int> DeleteByDriveAsync(string driveId, CancellationToken ct = default);
}

public class FileInventoryRepository(AppDbContext db) : IFileInventoryRepository
{
    public async Task<IReadOnlyList<FileInventoryItem>> GetAllAsync(CancellationToken ct = default)
        => await db.FileInventory
            .AsNoTracking()          // read-only — skip change tracking
            .OrderBy(f => f.Name)
            .ToListAsync(ct);

    public async Task<FileInventoryItem?> GetByIdAsync(string id, CancellationToken ct = default)
        => await db.FileInventory
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == id, ct);

    public async Task UpsertBatchAsync(IEnumerable<FileInventoryItem> items, CancellationToken ct = default)
    {
        // EF Core 8 bulk upsert via ExecuteUpdateAsync / AddOrUpdate
        foreach (var batch in items.Chunk(500))
        {
            foreach (var item in batch)
            {
                var existing = await db.FileInventory.FindAsync([item.Id], ct);
                if (existing is null)
                    db.FileInventory.Add(item);
                else
                {
                    existing.Name = item.Name;
                    existing.SizeBytes = item.SizeBytes;
                    existing.LastModifiedDateTime = item.LastModifiedDateTime;
                    existing.Sha1Hash = item.Sha1Hash;
                }
            }
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<int> DeleteByDriveAsync(string driveId, CancellationToken ct = default)
        => await db.FileInventory
            .Where(f => f.DriveId == driveId)
            .ExecuteDeleteAsync(ct);  // EF Core 7+ bulk delete (no change tracking)
}
```

---

## Migrations

```bash
# Add EF Core tools
dotnet add package Microsoft.EntityFrameworkCore.Tools

# Create initial migration
dotnet ef migrations add InitialCreate --output-dir Data/Migrations

# Apply migrations to database
dotnet ef database update

# Generate SQL script (for production, review before applying)
dotnet ef migrations script --idempotent -o migrations.sql

# Roll back last migration
dotnet ef migrations remove
```

### Auto-apply migrations on startup (use carefully in production)

```csharp
// Program.cs — only for dev or controlled deployments
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}
```

---

## Performance — AsNoTracking, IAsyncEnumerable, Bulk Ops

```csharp
// AsNoTracking for all read-only queries
var items = await db.FileInventory.AsNoTracking().ToListAsync(ct);

// IAsyncEnumerable for large result streaming (no buffer)
public async IAsyncEnumerable<FileInventoryItem> StreamAllAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var item in db.FileInventory.AsNoTracking().AsAsyncEnumerable()
        .WithCancellation(ct))
    {
        yield return item;
    }
}

// EF Core 7+ bulk update (no load-modify-save cycle)
await db.FileInventory
    .Where(f => f.DriveId == driveId)
    .ExecuteUpdateAsync(s => s.SetProperty(f => f.Sha1Hash, (string?)null), ct);

// Compiled query (reuse query plan)
private static readonly Func<AppDbContext, string, Task<FileInventoryItem?>> GetById =
    EF.CompileAsyncQuery((AppDbContext db, string id) =>
        db.FileInventory.FirstOrDefault(f => f.Id == id));
```

---

## Health Check for EF Core

```csharp
// Program.cs
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("azure-sql", tags: ["ready"]);

// Separate readiness and liveness probes
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false // always healthy if process is running
});
```
