---
name: azure-dotnet-webapp:scaffold-api
description: Scaffold a Minimal API endpoint group or MVC controller with CRUD operations, service interface, DTOs, and OpenAPI metadata — wires the service into Program.cs automatically.
argument-hint: "[--style minimal|controllers] [--resource <name>] [--crud]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Scaffold Web API Endpoint

Scaffold a complete API resource: endpoint group or controller, service interface, DTOs, and
OpenAPI annotations. Updates `Program.cs` to register the service and map the endpoints.

## Scaffold Flow

### Step 1: Detect Project

Search the current directory for a `.csproj` file and read it to determine:
- Whether it's a Web API or Blazor project
- Which NuGet packages are installed (Swashbuckle, Microsoft.Identity.Web, EF Core)
- The root namespace

If no `.csproj` is found, ask for the project directory.

### Step 2: Select API Style

Ask if not provided via `--style`:
- **Minimal API endpoint group** — recommended for new projects, less ceremony
- **MVC controller** — use when action filters, model binding, or existing controller structure

### Step 3: Resource Name

Ask for the resource name (PascalCase, singular noun):
- Examples: `FileInventory`, `DuplicateReport`, `User`, `Notification`
- Derive plural form for route: `file-inventory`, `duplicate-reports`, `users`

### Step 4: CRUD Operations

Ask which operations to scaffold:
- GET (list all) — `GET /api/{resource}`
- GET (by ID) — `GET /api/{resource}/{id}`
- POST (create) — `POST /api/{resource}`
- PUT (update) — `PUT /api/{resource}/{id}`
- DELETE — `DELETE /api/{resource}/{id}`

Default: all five operations.

### Step 5: Generate Files

#### Option A: Minimal API Endpoint Group

Generate `Features/{ResourceName}/{ResourceName}Endpoints.cs`:

```csharp
namespace {Namespace}.Features.{ResourceName};

public static class {ResourceName}Endpoints
{
    public static IEndpointRouteBuilder Map{ResourceName}(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/{route-name}")
            .WithTags("{ResourceName}")
            .RequireAuthorization()
            .RequireRateLimiting("api");

        group.MapGet("/", GetAll)
            .WithName("Get{ResourceName}List")
            .Produces<IEnumerable<{ResourceName}Dto>>();

        group.MapGet("/{id}", GetById)
            .WithName("Get{ResourceName}ById")
            .Produces<{ResourceName}Dto>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
            .WithName("Create{ResourceName}")
            .Accepts<Create{ResourceName}Request>("application/json")
            .Produces<{ResourceName}Dto>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        group.MapPut("/{id}", Update)
            .WithName("Update{ResourceName}")
            .Accepts<Update{ResourceName}Request>("application/json")
            .Produces<{ResourceName}Dto>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{id}", Delete)
            .WithName("Delete{ResourceName}")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }

    static async Task<IResult> GetAll(I{ResourceName}Service svc, CancellationToken ct) =>
        Results.Ok(await svc.GetAllAsync(ct));

    static async Task<IResult> GetById(string id, I{ResourceName}Service svc, CancellationToken ct)
    {
        var item = await svc.GetByIdAsync(id, ct);
        return item is null ? Results.NotFound() : Results.Ok(item);
    }

    static async Task<IResult> Create(
        Create{ResourceName}Request req, I{ResourceName}Service svc, CancellationToken ct)
    {
        var created = await svc.CreateAsync(req, ct);
        return Results.CreatedAtRoute("Get{ResourceName}ById", new { id = created.Id }, created);
    }

    static async Task<IResult> Update(
        string id, Update{ResourceName}Request req, I{ResourceName}Service svc, CancellationToken ct)
    {
        var updated = await svc.UpdateAsync(id, req, ct);
        return updated is null ? Results.NotFound() : Results.Ok(updated);
    }

    static async Task<IResult> Delete(string id, I{ResourceName}Service svc, CancellationToken ct)
    {
        var deleted = await svc.DeleteAsync(id, ct);
        return deleted ? Results.NoContent() : Results.NotFound();
    }
}
```

#### Option B: MVC Controller

Generate `Controllers/{ResourceName}Controller.cs`:

```csharp
namespace {Namespace}.Controllers;

/// <summary>
/// Manages {resource name} resources.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("api")]
public class {ResourceName}Controller(I{ResourceName}Service svc) : ControllerBase
{
    /// <summary>Returns all {resource name} items.</summary>
    [HttpGet]
    [ProducesResponseType<IEnumerable<{ResourceName}Dto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<{ResourceName}Dto>>> GetAll(CancellationToken ct)
        => Ok(await svc.GetAllAsync(ct));

    /// <summary>Returns a {resource name} item by ID.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType<{ResourceName}Dto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<{ResourceName}Dto>> GetById(string id, CancellationToken ct)
    {
        var item = await svc.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>Creates a new {resource name} item.</summary>
    [HttpPost]
    [ProducesResponseType<{ResourceName}Dto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<{ResourceName}Dto>> Create(
        [FromBody] Create{ResourceName}Request req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var created = await svc.CreateAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Updates an existing {resource name} item.</summary>
    [HttpPut("{id}")]
    [ProducesResponseType<{ResourceName}Dto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<{ResourceName}Dto>> Update(
        string id, [FromBody] Update{ResourceName}Request req, CancellationToken ct)
    {
        var updated = await svc.UpdateAsync(id, req, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    /// <summary>Deletes a {resource name} item.</summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var deleted = await svc.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
```

#### Service Interface

Generate `Features/{ResourceName}/I{ResourceName}Service.cs` (Minimal API) or
`Services/I{ResourceName}Service.cs` (Controllers):

```csharp
namespace {Namespace}.{path};

public interface I{ResourceName}Service
{
    Task<IReadOnlyList<{ResourceName}Dto>> GetAllAsync(CancellationToken ct = default);
    Task<{ResourceName}Dto?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<{ResourceName}Dto> CreateAsync(Create{ResourceName}Request request, CancellationToken ct = default);
    Task<{ResourceName}Dto?> UpdateAsync(string id, Update{ResourceName}Request request, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, CancellationToken ct = default);
}
```

#### DTOs

Generate `Features/{ResourceName}/{ResourceName}Dto.cs`:

```csharp
namespace {Namespace}.Features.{ResourceName};

public record {ResourceName}Dto(
    string Id,
    string Name,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record Create{ResourceName}Request(
    [Required, StringLength(255)] string Name);

public record Update{ResourceName}Request(
    [Required, StringLength(255)] string Name);
```

#### Stub Service Implementation

Generate `Features/{ResourceName}/{ResourceName}Service.cs`:

```csharp
namespace {Namespace}.Features.{ResourceName};

public class {ResourceName}Service : I{ResourceName}Service
{
    // TODO: inject I{ResourceName}Repository or AppDbContext when ready
    private readonly List<{ResourceName}Dto> _store = [];

    public Task<IReadOnlyList<{ResourceName}Dto>> GetAllAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<{ResourceName}Dto>>(_store.AsReadOnly());

    public Task<{ResourceName}Dto?> GetByIdAsync(string id, CancellationToken ct = default) =>
        Task.FromResult(_store.FirstOrDefault(x => x.Id == id));

    public Task<{ResourceName}Dto> CreateAsync(Create{ResourceName}Request request, CancellationToken ct = default)
    {
        var item = new {ResourceName}Dto(
            Guid.NewGuid().ToString(), request.Name, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow);
        _store.Add(item);
        return Task.FromResult(item);
    }

    public Task<{ResourceName}Dto?> UpdateAsync(
        string id, Update{ResourceName}Request request, CancellationToken ct = default)
    {
        var idx = _store.FindIndex(x => x.Id == id);
        if (idx < 0) return Task.FromResult<{ResourceName}Dto?>(null);
        var updated = _store[idx] with { Name = request.Name, UpdatedAt = DateTimeOffset.UtcNow };
        _store[idx] = updated;
        return Task.FromResult<{ResourceName}Dto?>(updated);
    }

    public Task<bool> DeleteAsync(string id, CancellationToken ct = default)
    {
        var count = _store.RemoveAll(x => x.Id == id);
        return Task.FromResult(count > 0);
    }
}
```

### Step 6: Update Program.cs

Add service registration and endpoint mapping to `Program.cs`:

For **Minimal API**: add `builder.Services.AddScoped<I{ResourceName}Service, {ResourceName}Service>();`
and `app.Map{ResourceName}();` after `var app = builder.Build()`.

For **Controllers**: add `builder.Services.AddScoped<I{ResourceName}Service, {ResourceName}Service>();`.

Use the Edit tool to insert the lines in the correct positions (before `var app = builder.Build()`
for service registration, after `app.UseAuthorization()` for endpoint mapping).

### Step 7: Build Verify

```bash
dotnet build
```

Report any errors. Fix missing `using` directives by reading the generated files and adding them.

### Step 8: Summary

```
## Scaffold Complete — {ResourceName}

Files created:
- Features/{ResourceName}/{ResourceName}Endpoints.cs (or Controllers/{ResourceName}Controller.cs)
- Features/{ResourceName}/I{ResourceName}Service.cs
- Features/{ResourceName}/{ResourceName}Service.cs
- Features/{ResourceName}/{ResourceName}Dto.cs

Program.cs updated:
- Added: builder.Services.AddScoped<I{ResourceName}Service, {ResourceName}Service>()
- Added: app.Map{ResourceName}()

Endpoints:
- GET    /api/{route} — list all
- GET    /api/{route}/{id} — get by ID
- POST   /api/{route} — create
- PUT    /api/{route}/{id} — update
- DELETE /api/{route}/{id} — delete

Next: /azure-dotnet-webapp:add-webapi-operation to add Graph-backed operations
```

## Arguments

- `--style minimal`: Use Minimal API endpoint groups
- `--style controllers`: Use MVC controllers
- `--resource <name>`: Resource name (e.g., `FileInventory`) — skips the question
- `--crud`: Scaffold all 5 CRUD operations without asking
