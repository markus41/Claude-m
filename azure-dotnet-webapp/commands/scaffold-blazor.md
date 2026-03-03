---
name: azure-dotnet-webapp:scaffold-blazor
description: Scaffold a Blazor page component with the selected render mode, service call, auth guard, models, and NavMenu entry — works with Blazor Server, WASM, and Auto render modes.
argument-hint: "[--mode server|wasm|auto] [--feature <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Scaffold Blazor Feature

Scaffold a complete Blazor feature: page component, service interface, models, auth guard, and
NavMenu entry. Supports InteractiveServer, InteractiveWebAssembly, and InteractiveAuto render modes.

## Scaffold Flow

### Step 1: Detect Blazor Project

Search for `.csproj` files and look for `Microsoft.NET.Sdk.Web` and `AddRazorComponents` in
`Program.cs`. If found, determine:
- Whether it's a Blazor Web App (.NET 8) or Blazor Server (older pattern)
- Whether a `.Client` project exists (for WASM/Auto modes)
- The root namespace and `Components/Pages` path

### Step 2: Select Render Mode

Ask if not provided via `--mode`:
- **InteractiveServer** — runs on server, SignalR, direct DB/service access
- **InteractiveWebAssembly** — runs in browser, must call Web API for data
- **InteractiveAuto** — server first, WASM after download (best default)

> Note: WASM and Auto pages must be placed in the `.Client` project (if present).
> Server pages go in the main project's `Components/Pages/`.

### Step 3: Feature Name

Ask for the feature name (PascalCase):
- Examples: `FileInventory`, `DuplicatesDashboard`, `UserProfile`, `Reports`
- Determines: page route (`/feature-name`), component name, service interface

### Step 4: Generate Feature Files

#### Blazor Page Component (InteractiveServer)

Generate `Components/Pages/{FeatureName}.razor`:

```razor
@page "/{feature-route}"
@attribute [Authorize]
@rendermode InteractiveServer
@inject I{FeatureName}Service {FeatureName}Service
@inject NavigationManager Nav

<PageTitle>{Feature Display Name}</PageTitle>

<h1>{Feature Display Name}</h1>

<AuthorizeView>
    <Authorized>
        @if (isLoading)
        {
            <p>Loading...</p>
        }
        else if (errorMessage is not null)
        {
            <div class="alert alert-danger">@errorMessage</div>
        }
        else if (items is null || items.Count == 0)
        {
            <p>No items found.</p>
        }
        else
        {
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach (var item in items)
                    {
                        <tr>
                            <td>@item.Name</td>
                            <td>@item.CreatedAt.ToString("yyyy-MM-dd")</td>
                            <td>
                                <button class="btn btn-sm btn-danger"
                                        @onclick="() => DeleteItem(item.Id)">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        }
    </Authorized>
    <NotAuthorized>
        <p>Please <a href="MicrosoftIdentity/Account/SignIn">sign in</a> to view this page.</p>
    </NotAuthorized>
</AuthorizeView>

@code {
    private List<{FeatureName}Dto>? items;
    private bool isLoading = true;
    private string? errorMessage;

    protected override async Task OnInitializedAsync()
    {
        try
        {
            items = await {FeatureName}Service.GetAllAsync();
        }
        catch (Exception ex)
        {
            errorMessage = $"Failed to load data: {ex.Message}";
        }
        finally
        {
            isLoading = false;
        }
    }

    private async Task DeleteItem(string id)
    {
        await {FeatureName}Service.DeleteAsync(id);
        items?.RemoveAll(i => i.Id == id);
    }
}
```

#### Blazor Page Component (InteractiveWebAssembly — in .Client project)

Generate `{ProjectName}.Client/Components/Pages/{FeatureName}.razor`:

```razor
@page "/{feature-route}"
@attribute [Authorize]
@rendermode InteractiveWebAssembly
@inject HttpClient Http

<PageTitle>{Feature Display Name}</PageTitle>

<h1>{Feature Display Name}</h1>

@if (isLoading)
{
    <p>Loading...</p>
}
else if (items is null)
{
    <p>Failed to load data.</p>
}
else
{
    <ul>
        @foreach (var item in items)
        {
            <li>@item.Name — @item.CreatedAt.ToString("yyyy-MM-dd")</li>
        }
    </ul>
}

@code {
    private List<{FeatureName}Dto>? items;
    private bool isLoading = true;

    protected override async Task OnInitializedAsync()
    {
        try
        {
            items = await Http.GetFromJsonAsync<List<{FeatureName}Dto>>("api/{feature-route}");
        }
        finally
        {
            isLoading = false;
        }
    }

    public record {FeatureName}Dto(string Id, string Name, DateTimeOffset CreatedAt);
}
```

#### Service Interface (Server project)

Generate `Services/I{FeatureName}Service.cs`:

```csharp
namespace {Namespace}.Services;

public interface I{FeatureName}Service
{
    Task<List<{FeatureName}Dto>> GetAllAsync(CancellationToken ct = default);
    Task<{FeatureName}Dto?> GetByIdAsync(string id, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}
```

#### Stub Service Implementation

Generate `Services/{FeatureName}Service.cs`:

```csharp
namespace {Namespace}.Services;

public class {FeatureName}Service : I{FeatureName}Service
{
    private readonly List<{FeatureName}Dto> _store =
    [
        new("1", "Sample Item A", DateTimeOffset.UtcNow.AddDays(-5)),
        new("2", "Sample Item B", DateTimeOffset.UtcNow.AddDays(-2))
    ];

    public Task<List<{FeatureName}Dto>> GetAllAsync(CancellationToken ct = default) =>
        Task.FromResult(_store.ToList());

    public Task<{FeatureName}Dto?> GetByIdAsync(string id, CancellationToken ct = default) =>
        Task.FromResult(_store.FirstOrDefault(x => x.Id == id));

    public Task DeleteAsync(string id, CancellationToken ct = default)
    {
        _store.RemoveAll(x => x.Id == id);
        return Task.CompletedTask;
    }
}

public record {FeatureName}Dto(string Id, string Name, DateTimeOffset CreatedAt);
```

### Step 5: Update Program.cs

Add service registration:

```csharp
builder.Services.AddScoped<I{FeatureName}Service, {FeatureName}Service>();
```

Use the Edit tool to insert after the existing `AddScoped` lines or after
`builder.Services.AddRazorComponents()`.

### Step 6: Update NavMenu.razor

Read `Components/Layout/NavMenu.razor` and add a navigation entry:

```razor
<NavLink href="/{feature-route}" Match="NavLinkMatch.Prefix">
    {Feature Display Name}
</NavLink>
```

Insert after the last existing `<NavLink>` element using the Edit tool.

### Step 7: Build Verify

```bash
dotnet build
```

Report errors. Fix missing `@using` directives in `_Imports.razor` if needed.

### Step 8: Summary

```
## Scaffold Complete — {FeatureName}

Files created:
- Components/Pages/{FeatureName}.razor (@rendermode {mode})
- Services/I{FeatureName}Service.cs
- Services/{FeatureName}Service.cs

Updated:
- Program.cs — service registration added
- Components/Layout/NavMenu.razor — navigation entry added

Route: /{feature-route}
Auth: [Authorize] attribute applied

Next steps:
- Replace stub service with real data access (EF Core / Graph API)
- Run: /azure-dotnet-webapp:add-webapi-operation to add Graph data sources
```

## Arguments

- `--mode server`: Use InteractiveServer render mode
- `--mode wasm`: Use InteractiveWebAssembly (places page in .Client project)
- `--mode auto`: Use InteractiveAuto render mode
- `--feature <name>`: Feature name (e.g., `FileInventory`) — skips the question
