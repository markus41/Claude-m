# App Registrations — Microsoft Entra ID Reference

App registrations define applications that use Microsoft Entra ID (Azure AD) for authentication. Each registration has a corresponding **application object** (global) and a **service principal** (local tenant instance). Managing registrations involves API permissions, credentials, app roles, and token configuration.

---

## REST API Endpoints (Microsoft Graph)

### Application Object

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/applications` | `Application.Read.All` | `$filter`, `$select`, `$top` | List all app registrations |
| GET | `/applications/{id}` | `Application.Read.All` | `$select` | Single app by object ID |
| GET | `/applications(appId='{clientId}')` | `Application.Read.All` | — | Lookup by client ID |
| POST | `/applications` | `Application.ReadWrite.All` | Body: app object | Create new app registration |
| PATCH | `/applications/{id}` | `Application.ReadWrite.All` | Partial update body | Update app settings |
| DELETE | `/applications/{id}` | `Application.ReadWrite.All` | — | Delete app registration |
| POST | `/applications/{id}/addPassword` | `Application.ReadWrite.All` | Body: passwordCredential | Add client secret |
| POST | `/applications/{id}/removePassword` | `Application.ReadWrite.All` | Body: `{ "keyId": "guid" }` | Remove client secret |
| GET | `/applications/{id}/owners` | `Application.Read.All` | — | List app owners |
| POST | `/applications/{id}/owners/$ref` | `Application.ReadWrite.All` | Body: directoryObject ref | Add owner |

### Service Principal

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/servicePrincipals` | `Application.Read.All` | `$filter=appId eq '{clientId}'` | Find SP by client ID |
| GET | `/servicePrincipals/{id}` | `Application.Read.All` | — | Single service principal |
| POST | `/servicePrincipals` | `Application.ReadWrite.All` | Body: `{ "appId": "client-id" }` | Create SP (instantiate app in tenant) |
| PATCH | `/servicePrincipals/{id}` | `Application.ReadWrite.All` | Partial update | Update SP properties |
| DELETE | `/servicePrincipals/{id}` | `Application.ReadWrite.All` | — | Delete SP |
| GET | `/servicePrincipals/{id}/appRoleAssignments` | `AppRoleAssignment.ReadWrite.All` | — | List role assignments |
| POST | `/servicePrincipals/{id}/appRoleAssignments` | `AppRoleAssignment.ReadWrite.All` | Body: appRoleAssignment | Grant app role |
| GET | `/servicePrincipals/{id}/oauth2PermissionGrants` | `DelegatedPermissionGrant.ReadWrite.All` | — | List delegated grants |

**Base URL:** `https://graph.microsoft.com/v1.0`

---

## Create App Registration (TypeScript)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

async function createAppRegistration(
  client: Client,
  displayName: string,
  redirectUri: string
): Promise<{ appId: string; objectId: string }> {
  const app = await client.api('/applications').post({
    displayName,
    signInAudience: 'AzureADMyOrg',
    web: {
      redirectUris: [redirectUri],
      implicitGrantSettings: {
        enableIdTokenIssuance: false,
        enableAccessTokenIssuance: false
      }
    },
    requiredResourceAccess: [
      {
        // Microsoft Graph
        resourceAppId: '00000003-0000-0000-c000-000000000000',
        resourceAccess: [
          {
            id: 'e1fe6dd8-ba31-4d61-89e7-88639da4683d', // User.Read
            type: 'Scope'
          }
        ]
      }
    ],
    notes: `Created by automation on ${new Date().toISOString()}`
  });

  // Create the corresponding service principal
  const sp = await client.api('/servicePrincipals').post({
    appId: app.appId
  });

  return { appId: app.appId, objectId: app.id };
}
```

---

## Add Client Secret

```typescript
async function addClientSecret(
  client: Client,
  appObjectId: string,
  secretDisplayName: string,
  expiryMonths: number = 12
): Promise<{ secretId: string; secretValue: string; expiresAt: Date }> {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);

  const credential = await client
    .api(`/applications/${appObjectId}/addPassword`)
    .post({
      passwordCredential: {
        displayName: secretDisplayName,
        endDateTime: expiresAt.toISOString()
      }
    });

  // IMPORTANT: secretText is only returned ONCE at creation time
  // Store it immediately in Key Vault
  return {
    secretId: credential.keyId,
    secretValue: credential.secretText,
    expiresAt
  };
}
```

---

## Add Certificate Credential (Preferred over secrets)

```typescript
async function addCertificateCredential(
  client: Client,
  appObjectId: string,
  base64EncodedCert: string,    // PEM certificate base64
  displayName: string
): Promise<string> {
  const app = await client.api(`/applications/${appObjectId}`).get();

  // Build the keyCredentials array (patch-style — must include existing certs)
  const existingCerts = app.keyCredentials || [];
  const newCert = {
    type: 'AsymmetricX509Cert',
    usage: 'Verify',
    displayName,
    key: base64EncodedCert,
    startDateTime: new Date().toISOString(),
    endDateTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  };

  await client.api(`/applications/${appObjectId}`).patch({
    keyCredentials: [...existingCerts, newCert]
  });

  return newCert.displayName;
}
```

---

## API Permissions Reference

### Permission Types

| Type | API `type` Value | Description | Admin Consent Required |
|------|-----------------|-------------|----------------------|
| Delegated | `Scope` | App acts on behalf of signed-in user | Sometimes |
| Application | `Role` | App acts as itself, no user context | Always |

### Key Graph Permission IDs

| Permission Name | Type | ID | Use Case |
|----------------|------|-----|----------|
| `User.Read` | Delegated | `e1fe6dd8-ba31-4d61-89e7-88639da4683d` | Read signed-in user profile |
| `User.Read.All` | Application | `df021288-bdef-4463-88db-98f22de89214` | Read all users |
| `Directory.Read.All` | Application | `7ab1d382-f21e-4acd-a863-ba3e13f7da61` | Read directory data |
| `Directory.ReadWrite.All` | Application | `19dbc75e-c2e2-444c-a770-ec69d8559fc7` | Write directory data |
| `Mail.Read` | Application | `810c84a8-4a9e-49e6-bf7d-12d183f40d01` | Read all mailboxes |
| `Calendars.ReadWrite` | Application | `ef54d2bf-783f-4e0f-bca1-3210c4d8a14d` | Read/write all calendars |
| `Sites.Read.All` | Application | `332a536c-c7ef-4017-ab91-336970924f0d` | Read all SharePoint sites |
| `AuditLog.Read.All` | Application | `b0afded3-3588-46d8-8b3d-9842eff778da` | Read audit logs |
| `Policy.Read.All` | Application | `246dd0d5-5bd0-4def-940b-0421030a5b68` | Read policies |
| `SecurityEvents.Read.All` | Application | `bf394140-e372-4bf9-a898-299cfa7ee8cf` | Read security events |

---

## App Roles Definition and Assignment

### Define App Roles on the Application

```typescript
// Add app roles to the app registration
await client.api(`/applications/${appObjectId}`).patch({
  appRoles: [
    {
      allowedMemberTypes: ['User'],  // 'User' or 'Application' or both
      description: 'Read access to application data',
      displayName: 'Reader',
      id: 'generate-a-guid-here',
      isEnabled: true,
      value: 'Reader'
    },
    {
      allowedMemberTypes: ['User', 'Application'],
      description: 'Full write access to application data',
      displayName: 'Writer',
      id: 'generate-another-guid-here',
      isEnabled: true,
      value: 'Writer'
    }
  ]
});
```

### Grant App Role to User or Service Principal

```typescript
// Grant app role to a user
await client.api(`/servicePrincipals/${resourceSpId}/appRoleAssignments`).post({
  principalId: 'user-object-id',
  resourceId: resourceSpId,
  appRoleId: 'role-guid'
});

// Grant application permission (app role) to another service principal
await client.api(`/servicePrincipals/${resourceSpId}/appRoleAssignments`).post({
  principalId: callerSpObjectId,
  resourceId: resourceSpId,
  appRoleId: 'role-guid'
});
```

---

## Token Configuration

```typescript
// Configure optional claims in the access token
await client.api(`/applications/${appObjectId}`).patch({
  optionalClaims: {
    accessToken: [
      { name: 'groups', source: null, essential: false, additionalProperties: ['emit_as_roles'] },
      { name: 'tid', source: null, essential: false },
      { name: 'upn', source: null, essential: false }
    ],
    idToken: [
      { name: 'email', source: null, essential: true },
      { name: 'given_name', source: null, essential: false },
      { name: 'family_name', source: null, essential: false }
    ],
    saml2Token: []
  }
});
```

---

## Audit Expiring Credentials (PowerShell)

```powershell
Connect-MgGraph -Scopes "Application.Read.All"

$today = Get-Date
$thirtyDays = $today.AddDays(30)
$ninetyDays = $today.AddDays(90)

# Find apps with secrets expiring in 30 days
$apps = Get-MgApplication -All
$expiringSecrets = foreach ($app in $apps) {
    foreach ($secret in $app.PasswordCredentials) {
        if ($secret.EndDateTime -ne $null -and $secret.EndDateTime -lt $ninetyDays) {
            [PSCustomObject]@{
                AppName         = $app.DisplayName
                AppId           = $app.AppId
                SecretName      = $secret.DisplayName
                ExpiresAt       = $secret.EndDateTime
                DaysUntilExpiry = ($secret.EndDateTime - $today).Days
                Urgency         = if ($secret.EndDateTime -lt $thirtyDays) { 'CRITICAL' } else { 'Warning' }
            }
        }
    }
}
$expiringSecrets | Sort-Object DaysUntilExpiry | Format-Table -AutoSize

# Find apps with no owners (orphaned apps)
$orphanedApps = foreach ($app in $apps) {
    $owners = Get-MgApplicationOwner -ApplicationId $app.Id
    if ($owners.Count -eq 0) {
        [PSCustomObject]@{
            AppName   = $app.DisplayName
            AppId     = $app.AppId
            CreatedAt = $app.CreatedDateTime
        }
    }
}
$orphanedApps | Format-Table
```

---

## Permission Audit (Over-Permissioned Apps)

```powershell
# Audit application permissions granted to service principals
Connect-MgGraph -Scopes "Application.Read.All","DelegatedPermissionGrant.ReadWrite.All"

# High-risk application permissions to flag
$highRiskPermissions = @(
    "Directory.ReadWrite.All",
    "Mail.ReadWrite",
    "Files.ReadWrite.All",
    "Sites.FullControl.All",
    "RoleManagement.ReadWrite.Directory"
)

$servicePrincipals = Get-MgServicePrincipal -All
foreach ($sp in $servicePrincipals) {
    $roles = Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $sp.Id
    foreach ($role in $roles) {
        $resourceSp = Get-MgServicePrincipal -ServicePrincipalId $role.ResourceId
        $appRole = $resourceSp.AppRoles | Where-Object { $_.Id -eq $role.AppRoleId }
        if ($appRole.Value -in $highRiskPermissions) {
            Write-Warning "HIGH RISK: $($sp.DisplayName) has $($appRole.Value) on $($resourceSp.DisplayName)"
        }
    }
}
```

---

## Sign-In Audiences

| `signInAudience` Value | Who Can Sign In | Use Case |
|-----------------------|----------------|----------|
| `AzureADMyOrg` | Users in this tenant only | Internal LOB apps |
| `AzureADMultipleOrgs` | Users in any Microsoft Entra tenant | B2B SaaS apps |
| `AzureADandPersonalMicrosoftAccount` | Entra users + personal Microsoft accounts | Consumer-facing apps |
| `PersonalMicrosoftAccount` | Personal Microsoft accounts only | Consumer apps, Xbox |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `BindingRedirection` | Redirect URI not registered | Add the redirect URI in PATCH to `web.redirectUris` |
| 400 `InvalidKeyCredentials` | Malformed certificate | Verify base64 encoding of the certificate DER |
| 403 `Forbidden` | Missing `Application.ReadWrite.All` | Re-consent with admin privileges |
| 404 `AppNotFound` | Application object ID not found | Verify object ID vs app ID (client ID) — they are different |
| 409 `AppAlreadyExists` | Duplicate display name or client ID conflict | Check existing apps; use unique display names |
| 429 `TooManyRequests` | Graph throttled | Use exponential backoff |
| `InvalidClientSecret` (AADSTS70011) | Secret expired or wrong | Rotate secret; verify `EndDateTime` not past |
| `AADSTS50011` | Redirect URI mismatch | Ensure exact match including trailing slash |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| App registrations per tenant | 250 (default) | Can be increased by Microsoft request |
| Client secrets per app | 2 | Rotate: have both active, delete old after deploying new |
| Certificate credentials per app | 2 | Same rotation approach as secrets |
| App roles per app | 100 | — |
| Owners per app | 100 | — |
| Redirect URIs per app | 256 | — |
| Token claim size | 200 claims max | Large group memberships use groups overage claim |
| Sign-in audience | Cannot change from multi-tenant to single-tenant | Plan audience before first deployment |

---

## Common Patterns and Gotchas

1. **Application object vs service principal** — The application object defines the app globally. The service principal is the tenant-local instance. Graph calls like `/applications` work on the global object; `/servicePrincipals` targets the tenant instance. Permissions (appRoleAssignments) are on the service principal.

2. **Client secret visibility** — The `secretText` property is returned only at creation time (`addPassword`). After that, it is never returned again. Always store secrets immediately in Azure Key Vault.

3. **Certificate authentication is preferred** — Client secrets are string-based and leak risk is high. Certificates use public-key cryptography — only the public key is stored in Entra ID. The private key never leaves the app.

4. **Orphaned apps** — Apps with no owners are a governance risk. If the creator leaves, nobody can manage credential rotation. Enforce an owner policy and use groups as owners for team-owned apps.

5. **Admin consent vs user consent** — Application permissions always require admin consent. Delegated permissions may require admin consent if the tenant has `permissionGrantPolicy` set to admin-only. Check tenant consent settings before deploying.

6. **Multi-tenant apps and home/resource tenants** — In multi-tenant apps, the application object lives in the "home tenant." Each customer tenant has a service principal. Permissions must be granted in each customer tenant separately.

7. **App role assignment required** — For apps that require users to be explicitly assigned before signing in, set `appRoleAssignmentRequired: true` on the service principal. Without this, any user in the tenant can use the app.

8. **Token lifetime** — Default access token lifetime is 1 hour. Configure `accessTokenIssuancePolicies` for custom lifetimes if needed. CAE provides real-time revocation for supported clients.

9. **Exposed API (resource apps)** — If your app is a resource API, define OAuth2 permission scopes (`oauth2PermissionScopes`) on the application object. Client apps then request these scopes in their `requiredResourceAccess`.

10. **Managed identity vs app registration** — For Azure resources (VMs, App Services, Functions), use managed identity instead of app registrations when possible. Managed identities have no credentials to manage and auto-rotate.
