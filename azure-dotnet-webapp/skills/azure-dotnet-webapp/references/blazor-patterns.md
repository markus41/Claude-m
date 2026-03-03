# Blazor Patterns — Server, WASM, Auto Render Modes

## Render Mode Comparison (.NET 8)

| Mode | Runs on | Network hops | Use for |
|------|---------|-------------|---------|
| `InteractiveServer` | Server | SignalR per event | Real-time, data access, quick start |
| `InteractiveWebAssembly` | Browser (WASM) | HTTP API calls | Offline, low latency after load |
| `InteractiveAuto` | Server first, WASM after download | Both | Best of both (recommended default) |
| Static SSR | Server (no interactivity) | None | Read-only pages, SEO |

---

## Project Structure — Blazor Web App (.NET 8)

```
MyApp/                          ← Server project
├── Components/
│   ├── App.razor
│   ├── Routes.razor
│   ├── Layout/
│   │   ├── MainLayout.razor
│   │   └── NavMenu.razor
│   └── Pages/
│       ├── Home.razor
│       └── FileInventory.razor
├── Program.cs
└── MyApp.csproj

MyApp.Client/                   ← WASM client project
├── Components/
│   └── Pages/
│       └── Counter.razor       ← InteractiveWebAssembly pages
├── Program.cs
└── MyApp.Client.csproj
```

### Program.cs (server)

```csharp
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddInteractiveWebAssemblyComponents();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(Client._Imports).Assembly);
```

---

## Component Render Mode Declaration

```razor
@* Per-page: InteractiveServer *@
@page "/files"
@rendermode InteractiveServer

@* Per-page: InteractiveWebAssembly (must be in .Client project) *@
@page "/counter"
@rendermode InteractiveWebAssembly

@* Per-page: Auto (server first, WASM after) *@
@page "/dashboard"
@rendermode InteractiveAuto

@* Prerender disabled (no SSR + hydration mismatch) *@
@rendermode @(new InteractiveServerRenderMode(prerender: false))
```

---

## Data Access Patterns per Render Mode

### InteractiveServer — direct service injection

```razor
@page "/files"
@rendermode InteractiveServer
@inject IFileInventoryService FileService

@code {
    private List<FileInventoryDto>? files;

    protected override async Task OnInitializedAsync()
    {
        // Safe: runs on server, can use DbContext directly
        files = await FileService.GetAllAsync();
    }
}
```

### InteractiveWebAssembly — must use HTTP API

```razor
@* In MyApp.Client project *@
@page "/files"
@rendermode InteractiveWebAssembly
@inject HttpClient Http

@code {
    private List<FileInventoryDto>? files;

    protected override async Task OnInitializedAsync()
    {
        // WASM has no direct DB access — call the Web API
        files = await Http.GetFromJsonAsync<List<FileInventoryDto>>("api/files");
    }
}
```

### Auto mode — use interface, swap implementation

```csharp
// Shared interface
public interface IFileService
{
    Task<List<FileInventoryDto>> GetAllAsync(CancellationToken ct = default);
}

// Server implementation (Program.cs of server project)
builder.Services.AddScoped<IFileService, ServerFileService>(); // uses DbContext

// WASM implementation (Program.cs of .Client project)
builder.Services.AddScoped<IFileService, WasmFileService>(); // uses HttpClient
```

---

## Authentication in Blazor

### Server-side auth state

```razor
@* MainLayout.razor *@
<CascadingAuthenticationState>
    <Router AppAssembly="@typeof(App).Assembly">
        <Found Context="routeData">
            <AuthorizeRouteView RouteData="@routeData" DefaultLayout="@typeof(MainLayout)">
                <NotAuthorized>
                    <p>Not authorized. <a href="MicrosoftIdentity/Account/SignIn">Sign in</a></p>
                </NotAuthorized>
            </AuthorizeRouteView>
        </Found>
    </Router>
</CascadingAuthenticationState>
```

### [Authorize] on component

```razor
@page "/admin"
@attribute [Authorize(Roles = "Admin")]
@attribute [Authorize(Policy = "RequireMFA")]
```

### AuthorizeView for conditional UI

```razor
<AuthorizeView Roles="Admin">
    <Authorized>
        <button @onclick="DeleteAll">Delete All</button>
    </Authorized>
</AuthorizeView>

<AuthorizeView>
    <Authorized Context="authCtx">
        <p>Welcome, @authCtx.User.Identity?.Name</p>
    </Authorized>
    <NotAuthorized>
        <a href="MicrosoftIdentity/Account/SignIn">Sign in</a>
    </NotAuthorized>
</AuthorizeView>
```

---

## Forms and Validation

```razor
@page "/upload"
@rendermode InteractiveServer

<EditForm Model="@model" OnValidSubmit="HandleSubmit">
    <DataAnnotationsValidator />
    <ValidationSummary />

    <div>
        <label>File Name</label>
        <InputText @bind-Value="model.Name" class="form-control" />
        <ValidationMessage For="@(() => model.Name)" />
    </div>

    <button type="submit">Upload</button>
</EditForm>

@code {
    private UploadModel model = new();

    private async Task HandleSubmit()
    {
        // model is validated — safe to process
        await FileService.UploadAsync(model);
    }

    public class UploadModel
    {
        [Required, StringLength(255)]
        public string Name { get; set; } = "";

        [Range(1, 104857600)] // 100 MB max
        public long SizeBytes { get; set; }
    }
}
```

---

## State Management

### Component state — local only

```razor
@code {
    private int count = 0;
    private void Increment() => count++;
}
```

### Cross-component state — cascading value or service

```csharp
// Singleton scoped state service (InteractiveServer only)
public class AppState
{
    public event Action? OnChange;
    private int _count;
    public int Count
    {
        get => _count;
        set { _count = value; NotifyStateChanged(); }
    }
    private void NotifyStateChanged() => OnChange?.Invoke();
}

// Program.cs
builder.Services.AddSingleton<AppState>(); // WARNING: shared across all users in Server mode
// Use AddScoped<AppState>() for per-connection state
```

---

## Real-Time Updates via SignalR

```razor
@page "/live-feed"
@rendermode InteractiveServer
@inject NavigationManager Nav
@implements IAsyncDisposable

@foreach (var msg in messages)
{
    <p>@msg</p>
}

@code {
    private HubConnection? hubConnection;
    private List<string> messages = [];

    protected override async Task OnInitializedAsync()
    {
        hubConnection = new HubConnectionBuilder()
            .WithUrl(Nav.ToAbsoluteUri("/hubs/notifications"))
            .Build();

        hubConnection.On<string>("ReceiveMessage", msg =>
        {
            messages.Add(msg);
            InvokeAsync(StateHasChanged); // thread-safe UI update
        });

        await hubConnection.StartAsync();
    }

    public async ValueTask DisposeAsync()
    {
        if (hubConnection is not null)
            await hubConnection.DisposeAsync();
    }
}
```

---

## NavMenu Integration

```razor
@* Components/Layout/NavMenu.razor *@
<nav>
    <NavLink href="/" Match="NavLinkMatch.All">Home</NavLink>
    <NavLink href="/files">File Inventory</NavLink>
    <AuthorizeView Roles="Admin">
        <NavLink href="/admin">Admin</NavLink>
    </AuthorizeView>
</nav>
```
