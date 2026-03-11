# Azure Static Web Apps — Authentication Providers

## Overview

Azure Static Web Apps provides built-in authentication without writing server-side code. Authentication is handled by the SWA platform through the `/.auth/` endpoint namespace. Built-in providers (Azure AD, GitHub, Twitter) work with minimal configuration on Free tier. Custom OIDC providers and Google/Apple require Standard tier and configuration in `staticwebapp.config.json`. Role-based access is enforced via the `allowedRoles` property in route rules.

---

## REST API Endpoints

Base URL: `https://management.azure.com`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/.../staticSites/{name}/config/appsettings` | Contributor | Body: settings including CLIENT_ID/SECRET | Store OAuth client credentials as app settings |
| POST | `/.../staticSites/{name}/invitations` | Contributor | Body: invitation definition | Create role invitation link |
| GET | `/.../staticSites/{name}/authproviders` | Contributor | — | List configured auth providers |

**Built-in auth endpoints (no configuration needed)**:
| Endpoint | Purpose |
|----------|---------|
| `/.auth/login/{provider}` | Start login flow |
| `/.auth/logout` | Log out and clear session |
| `/.auth/me` | Get current user as JSON |
| `/.auth/purge/{provider}` | Remove stored tokens for provider |

---

## Built-In Providers

### Default Behavior (No Configuration)

The following providers work without any configuration on both Free and Standard tiers:

| Provider | Login URL | Notes |
|----------|-----------|-------|
| Azure AD (Entra ID) | `/.auth/login/aad` | Uses common tenant by default (allows any Azure AD account) |
| GitHub | `/.auth/login/github` | Works out of the box for any GitHub account |
| Twitter | `/.auth/login/twitter` | Requires Twitter developer app credentials since API v2 |

**Default Azure AD limitation**: The default `aad` provider authenticates against the common endpoint (`login.microsoftonline.com/common`) — any Azure AD account from any tenant can sign in. To restrict to your tenant, configure a custom `azureActiveDirectory` provider (see below).

---

## Custom Azure AD (Tenant-Restricted)

To restrict authentication to your specific Azure AD tenant, configure a custom provider in `staticwebapp.config.json`.

### Step 1: Register App in Azure AD

```bash
# Create app registration
az ad app create \
  --display-name "My SWA App" \
  --web-redirect-uris "https://my-swa.azurestaticapps.net/.auth/login/aad/callback" \
  --sign-in-audience AzureADMyOrg

# Create client secret
APP_ID=$(az ad app list --display-name "My SWA App" --query "[0].appId" -o tsv)
az ad app credential reset --id $APP_ID --append
```

### Step 2: Set Credentials as App Settings

```bash
az staticwebapp appsettings set \
  --name my-swa \
  --resource-group rg-swa \
  --setting-names \
    AAD_CLIENT_ID=<app-id> \
    AAD_CLIENT_SECRET=<client-secret>
```

### Step 3: Configure in staticwebapp.config.json

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<tenant-id>/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        },
        "userDetailsClaim": "preferred_username",
        "login": {
          "loginParameters": ["prompt=select_account"]
        }
      }
    }
  }
}
```

**`userDetailsClaim`**: The JWT claim to use for `clientPrincipal.userDetails`. Options: `preferred_username` (UPN), `email`, `name`, `oid` (object ID).
**`loginParameters`**: Additional OIDC login parameters. `prompt=select_account` forces account picker.

---

## Google OAuth (Standard Tier)

```json
{
  "auth": {
    "identityProviders": {
      "google": {
        "registration": {
          "clientIdSettingName": "GOOGLE_CLIENT_ID",
          "clientSecretSettingName": "GOOGLE_CLIENT_SECRET"
        },
        "login": {
          "scopes": ["openid", "profile", "email"]
        }
      }
    }
  }
}
```

**Create Google OAuth app**: https://console.cloud.google.com/apis/credentials
Redirect URI: `https://{swa-hostname}/.auth/login/google/callback`

---

## Custom OIDC Provider (Any OIDC-Compliant IdP)

Standard tier only. Works with any OIDC-compliant identity provider (Okta, Auth0, Ping Identity, Keycloak, etc.).

```json
{
  "auth": {
    "identityProviders": {
      "customOpenIdConnectProviders": {
        "myIdp": {
          "registration": {
            "clientIdSettingName": "MYIDP_CLIENT_ID",
            "clientCredential": {
              "clientSecretSettingName": "MYIDP_CLIENT_SECRET"
            },
            "openIdConnectConfiguration": {
              "wellKnownOpenIdConfiguration": "https://my-idp.example.com/.well-known/openid-configuration"
            }
          },
          "login": {
            "nameClaimType": "name",
            "scopes": ["openid", "profile", "email"],
            "loginParameterNames": []
          }
        }
      }
    }
  }
}
```

**Login URL**: `/.auth/login/myIdp` (use the key from `customOpenIdConnectProviders`)

---

## /.auth/me Response Structure

```json
{
  "clientPrincipal": {
    "identityProvider": "aad",
    "userId": "abc123def456",
    "userDetails": "user@contoso.com",
    "userRoles": ["anonymous", "authenticated", "admin"],
    "claims": [
      { "typ": "name", "val": "Jane Smith" },
      { "typ": "preferred_username", "val": "user@contoso.com" },
      { "typ": "oid", "val": "guid-object-id" },
      { "typ": "tid", "val": "guid-tenant-id" },
      { "typ": "roles", "val": "AppAdmin" },
      { "typ": "groups", "val": "guid-group-id" }
    ]
  }
}
```

**`userRoles`**: Always includes `anonymous` and (if logged in) `authenticated`. Custom roles are added by the role assignment function.
**`claims`**: Contains all JWT claims from the identity provider. Available in API functions via the `x-ms-client-principal` header (base64-encoded JSON).

---

## Reading Auth in API Functions

```typescript
// Azure Functions API — read client principal
import { HttpRequest, InvocationContext } from "@azure/functions";

interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
  claims: Array<{ typ: string; val: string }>;
}

function getClientPrincipal(req: HttpRequest): ClientPrincipal | null {
  const header = req.headers.get("x-ms-client-principal");
  if (!header) return null;
  const decoded = Buffer.from(header, "base64").toString("utf-8");
  return JSON.parse(decoded) as ClientPrincipal;
}

function getClaim(principal: ClientPrincipal, claimType: string): string | undefined {
  return principal.claims.find((c) => c.typ === claimType)?.val;
}

// Usage
export async function handler(req: HttpRequest, ctx: InvocationContext) {
  const principal = getClientPrincipal(req);
  if (!principal) {
    return { status: 401, jsonBody: { error: "Unauthorized" } };
  }
  const email = getClaim(principal, "preferred_username") ?? principal.userDetails;
  const objectId = getClaim(principal, "oid");
  const tenantId = getClaim(principal, "tid");
  return { jsonBody: { email, objectId, tenantId, roles: principal.userRoles } };
}
```

---

## Role Assignment Function

Custom roles are assigned dynamically via a special function at `api/roles` (configurable). This function receives the authenticated user's client principal and returns the roles to assign.

```typescript
// api/GetRoles/index.ts (v3 model) or api/getRoles.ts (v4 model)
import { HttpRequest, InvocationContext, HttpResponseInit } from "@azure/functions";
import { app } from "@azure/functions";

interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
  claims: Array<{ typ: string; val: string }>;
}

interface RolesResponse {
  roles: string[];
}

app.http("GetRoles", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "roles",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const header = req.headers.get("x-ms-client-principal");
    if (!header) {
      return { status: 401, jsonBody: { roles: [] } };
    }

    const principal = JSON.parse(
      Buffer.from(header, "base64").toString("utf-8")
    ) as ClientPrincipal;

    // Determine roles based on user identity
    const roles: string[] = [];
    const email = principal.userDetails.toLowerCase();

    // Example: assign roles based on email domain or database lookup
    if (email.endsWith("@contoso.com")) {
      roles.push("employee");
    }
    if (await isAdminUser(principal.userId)) {
      roles.push("admin");
    }
    if (await isPremiumUser(principal.userId)) {
      roles.push("premium");
    }

    const response: RolesResponse = { roles };
    return { status: 200, jsonBody: response };
  },
});

async function isAdminUser(userId: string): Promise<boolean> {
  // Lookup in database, Azure Table Storage, Cosmos DB, etc.
  const adminUsers = (process.env.ADMIN_USER_IDS ?? "").split(",");
  return adminUsers.includes(userId);
}

async function isPremiumUser(userId: string): Promise<boolean> {
  // Check subscription status in database
  return false; // placeholder
}
```

**Register the role assignment function in config**:
```json
{
  "auth": {
    "rolesSource": "/api/roles"
  }
}
```

---

## Role Invitations API

Statically assign roles to specific users via invitation links (Standard tier).

```bash
# Create invitation link for a specific user with admin role
az staticwebapp users invite \
  --name my-swa \
  --resource-group rg-swa \
  --authentication-provider AAD \
  --user-details user@contoso.com \
  --role admin \
  --invitation-expiration-in-hours 24
```

**ARM JSON — Create Invitation**:
```json
POST /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}/invitations?api-version=2023-12-01
{
  "properties": {
    "provider": "aad",
    "userDetails": "user@contoso.com",
    "roles": "admin,editor",
    "numHoursToExpiration": 48,
    "domain": "https://my-swa.azurestaticapps.net"
  }
}
```

Response includes `invitationUrl` that the user visits to have roles assigned.

---

## Azure CLI: User Management

```bash
# List users and roles
az staticwebapp users list \
  --name my-swa \
  --resource-group rg-swa \
  --output table

# Update user role
az staticwebapp users update \
  --name my-swa \
  --resource-group rg-swa \
  --user-id <user-id> \
  --roles "reader,contributor"

# Invite user with role and expiration
az staticwebapp users invite \
  --name my-swa \
  --resource-group rg-swa \
  --domain contoso.com \
  --provider aad \
  --user-details user@contoso.com \
  --role admin \
  --invitation-expiration-in-hours 72
```

---

## Frontend: Auth Integration (React)

```typescript
// src/auth/useAuth.ts
import { useState, useEffect } from "react";

interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
  claims: Array<{ typ: string; val: string }>;
}

interface AuthState {
  user: ClientPrincipal | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<ClientPrincipal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/.auth/me")
      .then((res) => res.json())
      .then((data: { clientPrincipal: ClientPrincipal | null }) => {
        setUser(data.clientPrincipal);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return {
    user,
    loading,
    isAuthenticated: user !== null,
    hasRole: (role: string) => user?.userRoles.includes(role) ?? false,
  };
}

// Usage in component
function AdminPage() {
  const { user, loading, isAuthenticated, hasRole } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) {
    window.location.href = "/.auth/login/aad?post_login_redirect_uri=/admin";
    return null;
  }
  if (!hasRole("admin")) return <div>Access denied</div>;

  return <div>Welcome, {user!.userDetails}</div>;
}
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `401 Unauthorized on /.auth/me` | User not authenticated | Redirect to `/.auth/login/{provider}`; check `allowedRoles` on route |
| `403 Forbidden` | Authenticated but wrong role | Check `userRoles` in `/.auth/me`; verify role assignment function returns correct roles |
| `AADSTS50011: Redirect URI mismatch` | Callback URL not registered in Azure AD | Add `https://{hostname}/.auth/login/aad/callback` to app registration redirect URIs |
| `AADSTS70011: Scope invalid` | Requested scope not configured | Add required scopes to app registration; use `openid profile email` |
| `Provider not configured` | Custom OIDC provider not in config | Add provider to `staticwebapp.config.json`; redeploy |
| `rolesSource function returned non-200` | Role assignment function failing | Check function logs; ensure function returns `{ "roles": [] }` even for unauthenticated users |
| `Session expired` | Authentication cookie expired | Implement `/.auth/me` polling; redirect expired sessions to login |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| `/.auth/me` API calls | No published rate limit | Cache result in-memory; poll every 5 minutes, not per request |
| Role assignment function invocations | Per-request on login; governed by Functions limits | Cache role lookups; use Table Storage over SQL for low-latency role lookup |
| Invitations per SWA | No published limit | Use role assignment function for dynamic role management at scale |
| Auth token lifetime | Provider-specific (AAD: 1 hour access token, 8 hours session) | Implement silent token refresh; handle 401 responses gracefully |
| Custom OIDC providers | Unlimited (Standard tier) | Register all providers in config; manage client secret rotation |

---

## Common Patterns and Gotchas

**1. Default AAD provider allows all tenants**
The built-in `aad` provider with no configuration accepts any Microsoft account from any Azure AD tenant. For production enterprise apps, always configure a custom `azureActiveDirectory` provider with your specific tenant's issuer URL.

**2. Role assignment function is called on every login**
The roles source function is invoked every time a user logs in (or the session cookie is refreshed). Keep this function fast — use Azure Table Storage or Cosmos DB with point reads, not SQL queries. Cache role results in a distributed cache if the underlying role store is slow.

**3. Claims are available in API but not in frontend**
JWT claims from the identity provider are available in API functions via `x-ms-client-principal` header. The `/.auth/me` endpoint exposes claims to the frontend but only includes claims the provider passes to SWA — not all JWT claims are forwarded. For sensitive claims, read them in the API function.

**4. Post-login redirect**
Use `?post_login_redirect_uri=/intended-page` on the login URL to redirect users back to their originally requested page after authentication. In `responseOverrides`, use `ORIGINAL_URL` as a placeholder for automatic redirect.

**5. Dev/production auth differences**
SWA CLI provides mock authentication locally (`swa start`). The mock `/.auth/login` returns fake user data. Do NOT rely on claims or user IDs from local dev auth in any production logic. Test auth flows in a deployed preview environment.

**6. Logout and token invalidation**
SWA's `/.auth/logout` clears the session cookie and redirects to the logout URL. For Azure AD, this also logs out of the AAD session. If you use `/.auth/purge/{provider}`, it removes the stored refresh token but the user remains in the SWA session. Always use `/.auth/logout` for complete sign-out.
