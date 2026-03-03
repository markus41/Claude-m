# Authentication Reference

## Overview

Power Pages supports multiple authentication providers configured through site settings. This reference covers local authentication, Azure AD (Entra ID) setup, OAuth2/OIDC provider configuration, open registration vs invitation-only access, profile management, contact record creation, multi-factor authentication, and session timeout settings.

---

## Authentication Architecture

```
Browser Request
    │
    ▼
Power Pages Site
    │
    ├── Anonymous → Serve anonymous content (if table permissions allow)
    │
    └── Authentication Required
            │
            ├── Local (email/password) — adx portal user record
            ├── Azure AD (Entra ID) — OIDC
            ├── Azure AD B2C — OIDC
            ├── External OIDC (Google, Okta, custom)
            └── SAML 2.0 (via Microsoft Entra external identities)

After successful authentication:
    → Contact record created or matched in Dataverse
    → Contact linked to portal user
    → Web roles assigned based on configured rules
```

---

## Local Authentication

Local authentication uses a username/password stored in the portal. It is the simplest option but least secure — Microsoft recommends disabling local auth in favor of identity providers.

### Key Site Settings for Local Authentication

| Site Setting | Value | Description |
|---|---|---|
| `Authentication/Registration/Enabled` | `true` / `false` | Enable/disable user self-registration |
| `Authentication/Registration/RequiresConfirmation` | `true` | Require email confirmation before login |
| `Authentication/Registration/ExternalLoginEnabled` | `true` | Allow external provider login (must be true for any OAuth) |
| `Authentication/Registration/LocalLoginEnabled` | `true` | Allow username/password login (false = disable local) |
| `Authentication/Registration/OpenRegistrationEnabled` | `true` | Allow anyone to self-register (false = invitation only) |
| `Authentication/Registration/InvitationEnabled` | `true` | Enable invitation-based registration |

### Disable Local Authentication (Recommended for Production)

```
Site Setting: Authentication/Registration/LocalLoginEnabled = false
Site Setting: Authentication/Registration/ExternalLoginEnabled = true
```

When local auth is disabled, users are redirected to the external provider login page automatically.

---

## Azure AD (Entra ID) Provider Setup

### Required Azure AD App Registration Settings

1. **Platform**: Web
2. **Redirect URIs**: `https://{site-url}/signin-{provider-name}`
3. **Token configuration**: Add `email`, `upn`, `given_name`, `family_name` optional claims
4. **API permissions**: `User.Read` (Microsoft Graph)
5. **Authentication**: Enable ID tokens

### Site Settings for Azure AD

| Site Setting | Value |
|---|---|
| `Authentication/OpenIdConnect/AzureAD/Authority` | `https://login.microsoftonline.com/{tenant-id}/v2.0` |
| `Authentication/OpenIdConnect/AzureAD/ClientId` | App registration Application (client) ID |
| `Authentication/OpenIdConnect/AzureAD/ClientSecret` | App registration client secret |
| `Authentication/OpenIdConnect/AzureAD/RedirectUri` | `https://{site-url}/signin-AzureAD` |
| `Authentication/OpenIdConnect/AzureAD/ValidAudiences` | App registration client ID |
| `Authentication/OpenIdConnect/AzureAD/Caption` | `Sign in with Microsoft` |

### Site Settings for Tenant-Restricted Entra ID (Employees Only)

```
Authentication/OpenIdConnect/AzureAD/Authority = https://login.microsoftonline.com/{tenant-id}/v2.0
```

Using the tenant-specific authority (instead of `common`) restricts login to users in your tenant only.

---

## Azure AD B2C Provider Setup

B2C is the recommended provider for customer-facing portals with self-registration.

### B2C App Registration Settings

1. Register an application in the B2C tenant.
2. Add reply URL: `https://{site-url}/signin-AzureADB2C`
3. Enable implicit grant: ID tokens.
4. Create user flow: `B2C_1_SignUpSignIn` (or combined sign-up/sign-in flow).

### Site Settings for Azure AD B2C

| Site Setting | Value |
|---|---|
| `Authentication/OpenIdConnect/AzureADB2C/Authority` | `https://{b2c-tenant}.b2clogin.com/{b2c-tenant}.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=B2C_1_SignUpSignIn` |
| `Authentication/OpenIdConnect/AzureADB2C/ClientId` | B2C app registration client ID |
| `Authentication/OpenIdConnect/AzureADB2C/ClientSecret` | B2C app registration client secret |
| `Authentication/OpenIdConnect/AzureADB2C/RedirectUri` | `https://{site-url}/signin-AzureADB2C` |
| `Authentication/OpenIdConnect/AzureADB2C/PasswordResetPolicyId` | `B2C_1_PasswordReset` |
| `Authentication/OpenIdConnect/AzureADB2C/ProfileEditPolicyId` | `B2C_1_ProfileEdit` |
| `Authentication/OpenIdConnect/AzureADB2C/Caption` | `Sign in` |
| `Authentication/OpenIdConnect/AzureADB2C/DefaultPolicyId` | `B2C_1_SignUpSignIn` |

### B2C Custom Domain (Recommended)

Configure a custom domain in B2C (e.g., `login.contoso.com`) to avoid exposing the B2C tenant name in the login URL.

---

## Generic OAuth2 / OIDC Provider Configuration

Any OIDC-compliant identity provider can be configured using the `Authentication/OpenIdConnect/{ProviderName}/` site setting prefix.

### Required Site Settings for Any OIDC Provider

| Site Setting | Example Value |
|---|---|
| `Authentication/OpenIdConnect/{Name}/Authority` | `https://accounts.google.com` |
| `Authentication/OpenIdConnect/{Name}/ClientId` | Provider-issued client ID |
| `Authentication/OpenIdConnect/{Name}/ClientSecret` | Provider-issued client secret |
| `Authentication/OpenIdConnect/{Name}/RedirectUri` | `https://{site-url}/signin-{Name}` |
| `Authentication/OpenIdConnect/{Name}/Caption` | "Sign in with Google" |
| `Authentication/OpenIdConnect/{Name}/Scope` | `openid email profile` |

### Optional Site Settings

| Site Setting | Purpose |
|---|---|
| `Authentication/OpenIdConnect/{Name}/ResponseType` | Default: `code` (authorization code flow) |
| `Authentication/OpenIdConnect/{Name}/GetClaimsFromUserInfoEndpoint` | `true` to fetch claims from userinfo endpoint |
| `Authentication/OpenIdConnect/{Name}/TokenValidationParameters/NameClaimType` | Which claim to use as the display name |
| `Authentication/OpenIdConnect/{Name}/TokenValidationParameters/RoleClaimType` | Which claim to use for role assignment |

---

## Login / Logout / Profile URLs

| URL | Description |
|---|---|
| `/.auth/login/local` | Local username/password login |
| `/.auth/login/AzureAD` | Azure AD login |
| `/.auth/login/AzureADB2C` | Azure AD B2C login |
| `/.auth/login/{ProviderName}` | Generic OIDC provider login |
| `/.auth/logout` | Sign out — clears session and redirects to home |
| `/.auth/me` | Returns current user's claims as JSON |
| `/Profile` | Portal profile page (if configured) |
| `/register` | Self-registration page (if local auth enabled) |
| `/confirm-email` | Email confirmation callback |
| `/password-reset` | Password reset flow |

### Login Link in Liquid Template

```liquid
{% if user %}
  <span>{{ user.fullname }}</span>
  <a href="/.auth/logout">Sign Out</a>
{% else %}
  <a href="/.auth/login/AzureAD">Sign In</a>
{% endif %}

<!-- With return URL (redirect after login) -->
<a href="/.auth/login/AzureAD?returnUrl={{ request.url | url_encode }}">Sign In</a>
```

---

## Open Registration vs Invitation-Only

### Open Registration (Default)

Any user who successfully authenticates via a configured provider can access the portal and create a contact record automatically.

```
Site Setting: Authentication/Registration/OpenRegistrationEnabled = true
```

### Invitation-Only Registration

Users must be invited before they can register. An invitation code is generated and emailed to the user.

```
Site Setting: Authentication/Registration/OpenRegistrationEnabled = false
Site Setting: Authentication/Registration/InvitationEnabled = true
```

#### Generate Invitation via Dataverse

```json
POST /api/data/v9.2/adx_invitations
{
  "adx_name": "Invitation for Jane Smith",
  "adx_type": 756150001,
  "adx_invitecontact@odata.bind": "/contacts(<contact-id>)",
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)",
  "adx_expirydate": "2026-04-01T00:00:00Z",
  "adx_redeemlimit": 1
}
```

`adx_type` values: `756150000` = Single, `756150001` = Group

After creating the invitation, retrieve the `adx_invitationcode` field and send it to the invitee. They use the code at `/register?invitation_code={code}`.

---

## Contact Record Creation on Registration

When a user registers or signs in for the first time, Power Pages creates a Contact record in Dataverse to represent the portal user.

### Automatic Contact Matching

Power Pages attempts to match the authenticating user to an existing contact by:
1. Email address (`emailaddress1`) — primary matching criterion.
2. Username (`adx_identity_username`) — for local auth users.

If a match is found, the existing contact is linked. If no match is found, a new contact is created.

### Configure Contact Creation Fields

Use the `Authentication/UserMapping/` site settings to control which token claims populate which contact fields.

| Site Setting | Claim Mapped | Contact Field |
|---|---|---|
| `Authentication/UserMapping/EmailClaimType` | `email` | `emailaddress1` |
| `Authentication/UserMapping/FirstNameClaimType` | `given_name` | `firstname` |
| `Authentication/UserMapping/LastNameClaimType` | `family_name` | `lastname` |
| `Authentication/UserMapping/PhoneClaimType` | `phone_number` | `telephone1` |

### Post-Registration Power Automate Flow

Trigger a flow when a new portal contact is registered to assign web roles, send a welcome email, or provision additional access.

```json
// Dataverse trigger: "When a row is added" on Contact
// Filter: adx_username is not null (portal contacts have usernames)
// Actions:
//   1. POST to adx_webroles(<default-role-id>)/adx_webrole_contact/$ref to assign web role
//   2. Send welcome email via Outlook connector
//   3. Create onboarding task in Planner
```

---

## Multi-Factor Authentication (MFA)

Power Pages does not manage MFA directly — it is enforced by the identity provider.

### MFA via Azure AD Conditional Access

1. In the Azure AD (Entra ID) portal: **Security** → **Conditional Access** → Create policy.
2. Condition: Target the Power Pages app registration (by application ID).
3. Grant: Require MFA.
4. Result: Users logging into Power Pages via Azure AD are prompted for MFA.

### MFA via Azure AD B2C Custom Policy

Configure MFA in the B2C user flow settings:
1. In B2C user flow → **Properties** → **Multifactor authentication**.
2. Enable: **MFA type** = Email OTP or Phone (SMS).
3. **Enforcement**: Always on, or conditional (based on risk).

### MFA Site Settings

| Site Setting | Value | Description |
|---|---|---|
| `Authentication/OpenIdConnect/AzureADB2C/AcrValues` | `mfa` | Force MFA on every login via B2C ACR values |

---

## Session Timeout

### Session Configuration Site Settings

| Site Setting | Default | Description |
|---|---|---|
| `Authentication/ApplicationCookie/ExpireTimeSpan` | `1.00:00:00` (1 day) | Session cookie lifetime (ISO 8601 timespan) |
| `Authentication/ApplicationCookie/SlidingExpiration` | `true` | Reset timeout on each request when true |
| `Authentication/ApplicationCookie/LoginPath` | `/.auth/login/local` | Redirect path when session expires |
| `Authentication/ApplicationCookie/ReturnUrlParameter` | `returnUrl` | Query parameter for post-login redirect |

### Example: 8-Hour Session with No Sliding Expiration

```
Site Setting: Authentication/ApplicationCookie/ExpireTimeSpan = 0.08:00:00
Site Setting: Authentication/ApplicationCookie/SlidingExpiration = false
```

With `SlidingExpiration = false`, the session expires exactly 8 hours after login regardless of activity.

### Force Re-Authentication After Timeout

```liquid
<!-- Detect if session is near expiry using JavaScript -->
<script>
  // Portal session timeout warning (client-side only — server handles actual expiry)
  var sessionWarningMinutes = 5;
  var sessionExpiryMinutes = 60; // Must match Authentication/ApplicationCookie/ExpireTimeSpan

  setTimeout(function() {
    if (confirm('Your session will expire in 5 minutes. Continue?')) {
      // Ping a page to extend the sliding session
      fetch('/keep-alive');
    }
  }, (sessionExpiryMinutes - sessionWarningMinutes) * 60 * 1000);
</script>
```

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| `AADSTS50011` — Reply URL mismatch | Redirect URI not registered in Azure AD app | Add exact redirect URI (including trailing slash) to app registration |
| `AADSTS70011` — Invalid scope | Requested scope not configured | Check `Scope` site setting; verify scope in app registration |
| `AADSTS50105` — User not assigned to app | App requires assignment; user not assigned | In Azure AD → Enterprise Apps → the app → Users and groups: add user |
| Login loop on B2C | Authority URL points to wrong user flow | Verify `?p=B2C_1_SignUpSignIn` in Authority setting |
| Contact not created after login | Contact matching fails; missing email claim | Verify identity provider sends `email` claim; check `UserMapping` site settings |
| User redirected to register page on every login | Email claim doesn't match existing contact | Verify email in identity provider matches contact's `emailaddress1` in Dataverse |
| Session expires too quickly | `ExpireTimeSpan` set too short; sliding expiration off | Increase `ExpireTimeSpan`; enable `SlidingExpiration` |
| Invitation code rejected | Code expired or already redeemed | Check `adx_expirydate` and `adx_redeemed` fields on the invitation record |
| MFA not triggered | Conditional Access policy not targeting the portal app | Add the Power Pages app registration to Conditional Access policy scope |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Authentication providers per site | No hard limit | Practical: 3-5 providers |
| Session cookie lifetime | Configurable | Max: no platform limit; practical: 30 days |
| Invitation code validity | Configurable via `adx_expirydate` | No hard limit |
| Concurrent portal sessions per user | No hard limit | Each device creates a separate session |
| Contact records per site | No hard limit | Dataverse capacity limits apply |
| OAuth2 token refresh | Handled by provider | Typically 1-hour access tokens with refresh |
