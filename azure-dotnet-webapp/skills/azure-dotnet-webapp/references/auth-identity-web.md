# Microsoft.Identity.Web — JWT, OIDC, and MSAL Patterns

## Package Setup

```bash
dotnet add package Microsoft.Identity.Web
dotnet add package Microsoft.Identity.Web.GraphServiceClient  # if using Graph OBO
dotnet add package Microsoft.Identity.Web.UI                  # if using sign-in UI (MVC/Blazor)
```

---

## Scenario 1: Web API (JWT Bearer — daemon / SPA / mobile client)

Used when another app (SPA, mobile, daemon) calls your API with a Bearer token.
The API validates the JWT but does NOT sign in users itself.

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

### Validate scopes in endpoints

```csharp
// Extension method from Microsoft.Identity.Web
[HttpGet]
[Authorize]
public IActionResult Get()
{
    // Throws 403 if the token doesn't contain the required scope
    HttpContext.VerifyUserHasAnyAcceptedScope("Files.Read", "Files.ReadWrite");
    return Ok(/* ... */);
}
```

### App roles (service-to-service, no user context)

```csharp
// appsettings.json — add AllowWebApiToBeAuthorizedByACL: true for daemon clients
// In Entra: define app roles on the API registration, assign to calling app's SP

[HttpPost]
[Authorize(Roles = "Files.Process")]
public IActionResult Process() { /* ... */ }
```

---

## Scenario 2: Web App with Sign-In (OIDC + OBO for Graph)

Used for Blazor Server, MVC apps that sign users in via Microsoft Entra and call
downstream APIs on their behalf (On-Behalf-Of flow).

```csharp
// Program.cs
builder.Services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"))
    .EnableTokenAcquisitionToCallDownstreamApi(["Files.Read.All", "User.Read"])
    .AddMicrosoftGraph(builder.Configuration.GetSection("MicrosoftGraph"))
    .AddInMemoryTokenCaches();

// For production, replace in-memory cache with distributed cache:
// .AddDistributedTokenCaches()
// builder.Services.AddStackExchangeRedisCache(options =>
//     options.Configuration = builder.Configuration["Redis:ConnectionString"]);

// appsettings.json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "<tenant-id>",
    "ClientId": "<client-id>",
    "ClientSecret": "",   // from Key Vault, not hardcoded
    "CallbackPath": "/signin-oidc"
  },
  "MicrosoftGraph": {
    "BaseUrl": "https://graph.microsoft.com/v1.0",
    "Scopes": "Files.Read.All User.Read"
  }
}
```

### Use GraphServiceClient in controller (OBO)

```csharp
[Authorize]
public class GraphController(
    GraphServiceClient graphClient,
    ITokenAcquisition tokenAcquisition) : Controller
{
    public async Task<IActionResult> Index()
    {
        // Graph client already uses the signed-in user's token via OBO
        var me = await graphClient.Me.GetAsync();
        return View(me);
    }
}
```

---

## Scenario 3: Blazor Server with OIDC

```csharp
// Program.cs
builder.Services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"))
    .EnableTokenAcquisitionToCallDownstreamApi(["Files.Read.All"])
    .AddMicrosoftGraph(builder.Configuration.GetSection("MicrosoftGraph"))
    .AddInMemoryTokenCaches();

builder.Services.AddControllersWithViews()
    .AddMicrosoftIdentityUI(); // Adds /MicrosoftIdentity/Account/SignIn and SignOut

builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();

// In _Host.cshtml or _Layout.cshtml: include Microsoft Identity sign-in/out buttons
// @using Microsoft.Identity.Web.UI
// <vc:login-partial />
```

### Blazor component — access claims

```razor
@page "/profile"
@attribute [Authorize]
@inject Microsoft.Graph.GraphServiceClient GraphClient

<h1>Hello @context.User.Identity?.Name</h1>

@code {
    [CascadingParameter] private Task<AuthenticationState>? AuthStateTask { get; set; }

    protected override async Task OnInitializedAsync()
    {
        var authState = await AuthStateTask!;
        // authState.User.Claims contains all JWT claims
    }
}
```

---

## Token Cache Strategy

| Cache Type | Use for | NuGet |
|-----------|---------|-------|
| `AddInMemoryTokenCaches` | Development, single-instance | built-in |
| `AddDistributedTokenCaches` + Redis | Production, scale-out | `Microsoft.Extensions.Caching.StackExchangeRedis` |
| `AddDistributedTokenCaches` + SQL | Production, no Redis | `Microsoft.Extensions.Caching.SqlServer` |

---

## Incremental Consent

Request additional scopes at runtime (user must re-consent):

```csharp
public class FilesController(ITokenAcquisition tokenAcquisition) : ControllerBase
{
    [HttpGet("sensitive")]
    public async Task<IActionResult> GetSensitive()
    {
        try
        {
            var token = await tokenAcquisition.GetAccessTokenForUserAsync(
                ["Files.ReadWrite.All"]);
            // use token ...
            return Ok();
        }
        catch (MicrosoftIdentityWebChallengeUserException ex)
        {
            // Blazor Server: cannot redirect mid-render — handle differently
            return Challenge(ex.MsalUiRequiredException, OpenIdConnectDefaults.AuthenticationScheme);
        }
    }
}
```

---

## appsettings.json — Secret Handling

**Never** put `ClientSecret` in source-controlled `appsettings.json`.

```csharp
// Option A: Environment variable (CI/CD, App Service)
// AZUREAD__CLIENTSECRET = <value>  (double underscore = section separator)

// Option B: Key Vault reference (App Service with Managed Identity)
// In App Service Configuration: @Microsoft.KeyVault(SecretUri=https://vault.../secrets/ClientSecret)

// Option C: User secrets (local development only)
// dotnet user-secrets set "AzureAd:ClientSecret" "<value>"
```

---

## Conditional Access — MFA Challenge

When Conditional Access requires MFA or device compliance:

```csharp
catch (MsalUiRequiredException ex) when (ex.Classification == UiRequiredExceptionClassification.ConditionalAccessBlocked)
{
    // Trigger re-authentication challenge
    return Challenge(
        new AuthenticationProperties { RedirectUri = "/" },
        OpenIdConnectDefaults.AuthenticationScheme);
}
```
