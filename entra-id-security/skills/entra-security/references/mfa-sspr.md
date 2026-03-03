# MFA and SSPR — Microsoft Entra ID Reference

Multi-Factor Authentication (MFA) and Self-Service Password Reset (SSPR) are core security controls in Microsoft Entra ID. Modern deployments use Conditional Access for MFA enforcement (rather than per-user MFA) and the combined registration portal for both MFA and SSPR.

---

## REST API Endpoints (Microsoft Graph)

### Authentication Methods

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/users/{id}/authentication/methods` | `UserAuthenticationMethod.Read.All` | — | List user's registered auth methods |
| GET | `/users/{id}/authentication/microsoftAuthenticatorMethods` | `UserAuthenticationMethod.Read.All` | — | Authenticator app registrations |
| DELETE | `/users/{id}/authentication/microsoftAuthenticatorMethods/{methodId}` | `UserAuthenticationMethod.ReadWrite.All` | — | Remove Authenticator registration |
| GET | `/users/{id}/authentication/phoneAuthenticationMethods` | `UserAuthenticationMethod.Read.All` | — | Phone (SMS/voice) methods |
| POST | `/users/{id}/authentication/phoneAuthenticationMethods` | `UserAuthenticationMethod.ReadWrite.All` | Body: phone + type | Register phone number |
| DELETE | `/users/{id}/authentication/phoneAuthenticationMethods/{methodId}` | `UserAuthenticationMethod.ReadWrite.All` | — | Remove phone method |
| GET | `/users/{id}/authentication/fido2Methods` | `UserAuthenticationMethod.Read.All` | — | FIDO2 security keys |
| DELETE | `/users/{id}/authentication/fido2Methods/{methodId}` | `UserAuthenticationMethod.ReadWrite.All` | — | Remove FIDO2 key |
| GET | `/users/{id}/authentication/passwordlessMicrosoftAuthenticatorMethods` | `UserAuthenticationMethod.Read.All` | — | Passwordless Authenticator |
| GET | `/users/{id}/authentication/softwareOathMethods` | `UserAuthenticationMethod.Read.All` | — | OATH TOTP tokens |
| GET | `/users/{id}/authentication/temporaryAccessPassMethods` | `UserAuthenticationMethod.Read.All` | — | Temporary Access Pass |
| POST | `/users/{id}/authentication/temporaryAccessPassMethods` | `UserAuthenticationMethod.ReadWrite.All` | Body: TAP config | Create TAP |
| DELETE | `/users/{id}/authentication/temporaryAccessPassMethods/{methodId}` | `UserAuthenticationMethod.ReadWrite.All` | — | Delete TAP |
| GET | `/users/{id}/authentication/emailMethods` | `UserAuthenticationMethod.Read.All` | — | Email OTP (SSPR) |

### MFA Registration Statistics

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/reports/authenticationMethods/usersRegisteredByFeature` | `Reports.Read.All` | — | MFA/SSPR/Passwordless registration stats |
| GET | `/reports/authenticationMethods/usersRegisteredByMethod` | `Reports.Read.All` | — | Method-level registration counts |
| GET | `/reports/authenticationMethods/userRegistrationDetails` | `Reports.Read.All` | `$filter`, `$top` | Per-user registration detail |
| GET | `/reports/authenticationMethods/usage` | `Reports.Read.All` | — | Method usage summary |

### Authentication Strengths (Policies)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/policies/authenticationStrengthPolicies` | `Policy.Read.All` | — | List strength policies |
| POST | `/policies/authenticationStrengthPolicies` | `Policy.ReadWrite.AuthenticationMethod` | Body: policy object | Create custom strength |
| PATCH | `/policies/authenticationStrengthPolicies/{id}` | `Policy.ReadWrite.AuthenticationMethod` | Partial update | Update allowed combinations |
| GET | `/policies/authenticationMethodsPolicy` | `Policy.Read.All` | — | Tenant-wide method settings |
| PATCH | `/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/{methodId}` | `Policy.ReadWrite.AuthenticationMethod` | Body: method config | Enable/configure method |

**Base URL:** `https://graph.microsoft.com/v1.0`

---

## Authentication Methods Reference

| Method | Security Level | Phishing Resistant | Best For |
|--------|---------------|---------------------|----------|
| FIDO2 security key | Very High | Yes | Privileged accounts, passwordless |
| Windows Hello for Business | Very High | Yes | Domain-joined devices |
| Microsoft Authenticator (passwordless) | High | Yes | Mobile-first workplaces |
| Microsoft Authenticator (push) | High | No (MFA fatigue risk) | General MFA |
| OATH hardware token | High | No | Offline environments |
| OATH software token (TOTP) | Medium-High | No | BYOD supplemental |
| Temporary Access Pass (TAP) | Medium (time-limited) | — | Onboarding, recovery |
| Certificate-based auth (CBA) | High | Yes | Regulated industries |
| SMS OTP | Low | No | Legacy fallback only |
| Voice call | Low | No | Accessibility fallback |
| Email OTP | Low | No | SSPR only |

---

## Audit MFA Registration Status

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

// Get per-user MFA registration details
async function getMfaRegistrationReport(client: Client): Promise<any[]> {
  const allUsers: any[] = [];
  let url = '/reports/authenticationMethods/userRegistrationDetails?$top=500';

  while (url) {
    const page = await client.api(url).get();
    allUsers.push(...page.value);
    url = page['@odata.nextLink'] || null;
  }

  return allUsers.map(u => ({
    upn: u.userPrincipalName,
    displayName: u.userDisplayName,
    isMfaCapable: u.isMfaCapable,
    isMfaRegistered: u.isMfaRegistered,
    isPasswordlessCapable: u.isPasswordlessCapable,
    isSsprEnabled: u.isSsprEnabled,
    isSsprRegistered: u.isSsprRegistered,
    methods: u.methodsRegistered
  }));
}

// Get registration summary
async function getMfaSummary(client: Client) {
  const summary = await client
    .api('/reports/authenticationMethods/usersRegisteredByFeature')
    .get();

  const total = summary.userRegistrationFeatureSummary.totalUserCount;
  const mfaRegistered = summary.userRegistrationFeatureSummary.mfaRegistered;

  return {
    total,
    mfaRegistered,
    mfaCoverage: Math.round((mfaRegistered / total) * 100),
    ssprRegistered: summary.userRegistrationFeatureSummary.selfServicePasswordResetRegistered
  };
}
```

---

## Temporary Access Pass (TAP)

TAP is a time-limited, single-use or multi-use passcode for onboarding users and recovering accounts.

```typescript
// Create a TAP for a new user onboarding
async function createTemporaryAccessPass(
  client: Client,
  userId: string,
  lifetimeInMinutes: number = 480, // 8 hours
  isUsableOnce: boolean = false
): Promise<{ tapValue: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + lifetimeInMinutes * 60 * 1000);

  const tap = await client
    .api(`/users/${userId}/authentication/temporaryAccessPassMethods`)
    .post({
      startDateTime: new Date().toISOString(),
      lifetimeInMinutes,
      isUsableOnce,
      isUsable: true
    });

  return {
    tapValue: tap.temporaryAccessPass, // Only returned at creation time
    expiresAt: tap.startDateTime
  };
}

// Delete all existing TAPs for a user (cleanup)
async function deleteAllTaps(client: Client, userId: string) {
  const taps = await client
    .api(`/users/${userId}/authentication/temporaryAccessPassMethods`)
    .get();

  for (const tap of taps.value) {
    await client
      .api(`/users/${userId}/authentication/temporaryAccessPassMethods/${tap.id}`)
      .delete();
  }
}
```

---

## Configure Authentication Methods Policy

```typescript
// Enable FIDO2 for all users
async function enableFido2(client: Client) {
  await client
    .api('/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/fido2')
    .patch({
      state: 'enabled',
      includeTargets: [
        {
          targetType: 'group',
          id: 'all_users', // 'all_users' or a specific group ID
          isRegistrationRequired: false,
          authenticationMode: 'any'
        }
      ],
      isAttestationEnforced: false,
      isSelfServiceRegistrationAllowed: true,
      keyRestrictions: {
        isEnforced: false,
        enforcementType: 'allow',
        aaGuids: []
      }
    });
}

// Disable SMS OTP for all users (push Authenticator instead)
async function disableSms(client: Client) {
  await client
    .api('/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/sms')
    .patch({
      state: 'disabled'
    });
}

// Enable Microsoft Authenticator for all users
async function enableAuthenticator(client: Client) {
  await client
    .api('/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator')
    .patch({
      state: 'enabled',
      includeTargets: [
        {
          targetType: 'group',
          id: 'all_users',
          authenticationMode: 'any',
          displayAppInformationRequiredState: 'enabled',
          numberMatchingRequiredState: 'enabled'
        }
      ]
    });
}
```

---

## SSPR Configuration (PowerShell)

SSPR is configured at the tenant level via the SSPR properties on the Entra admin center. Graph API covers authentication method registration; PowerShell (MgGraph) covers SSPR policy.

```powershell
Connect-MgGraph -Scopes "Policy.Read.All","Policy.ReadWrite.AuthenticationMethod"

# Check current SSPR registration status for a user
$userDetails = Get-MgReportAuthenticationMethodUserRegistrationDetail -UserId "user@contoso.com"
$userDetails | Select UserPrincipalName, IsSsprRegistered, IsSsprEnabled, MethodsRegistered

# Bulk report: users not registered for SSPR
$allDetails = Get-MgReportAuthenticationMethodUserRegistrationDetail -All
$notSsprRegistered = $allDetails | Where-Object { -not $_.IsSsprRegistered -and $_.IsSsprEnabled }
Write-Host "Users enabled but not registered for SSPR: $($notSsprRegistered.Count)"
$notSsprRegistered | Select UserPrincipalName, MethodsRegistered | Format-Table

# Get summary of MFA coverage
$summary = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/reports/authenticationMethods/usersRegisteredByFeature"
$summary.userRegistrationFeatureSummary | Format-List
```

---

## MFA Registration Campaign

The registration campaign nudges users without MFA to register using the combined registration portal.

```powershell
Connect-MgGraph -Scopes "Policy.ReadWrite.AuthenticationMethod"

# Get current registration campaign settings
$campaign = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy" |
    Select-Object -ExpandProperty registrationEnforcement

$campaign | ConvertTo-Json -Depth 5

# Enable nudge campaign for users without MFA
$body = @{
    registrationEnforcement = @{
        authenticationMethodsRegistrationCampaign = @{
            state = "enabled"
            snoozeDurationInDays = 3
            includeTargets = @(
                @{
                    id = "all_users"
                    targetType = "group"
                    targetedAuthenticationMethod = "microsoftAuthenticator"
                }
            )
        }
    }
} | ConvertTo-Json -Depth 10

Invoke-MgGraphRequest -Method PATCH `
    -Uri "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy" `
    -Body $body -ContentType "application/json"
```

---

## Authentication Strength Policies

Authentication strength defines which specific MFA method combinations are acceptable for a Conditional Access policy.

```typescript
// Create a "Phishing-Resistant MFA" authentication strength
const strengthPolicy = await client
  .api('/policies/authenticationStrengthPolicies')
  .post({
    displayName: 'Phishing-Resistant MFA',
    description: 'Requires FIDO2, Windows Hello, or Certificate-Based Auth',
    policyType: 'custom',
    allowedCombinations: [
      'fido2',
      'windowsHelloForBusiness',
      'x509CertificateMultiFactor'
    ]
  });

// Use in Conditional Access policy
const caPolicy = {
  displayName: 'CA007 — Phishing-Resistant MFA for Privileged Users',
  state: 'enabledForReportingButNotEnforced',
  conditions: {
    users: { includeRoles: ['62e90394-69f5-4237-9190-012177145e10'] }, // Global Admin
    applications: { includeApplications: ['All'] }
  },
  grantControls: {
    operator: 'OR',
    authenticationStrength: { id: strengthPolicy.id }
  }
};
```

---

## Number Matching (Prevent MFA Fatigue)

MFA fatigue attacks send repeated push notifications hoping the user approves one. Number matching requires the user to enter a code displayed on the sign-in page into the Authenticator app.

```typescript
// Enable number matching on Microsoft Authenticator
await client
  .api('/policies/authenticationMethodsPolicy/authenticationMethodConfigurations/microsoftAuthenticator')
  .patch({
    state: 'enabled',
    includeTargets: [{
      targetType: 'group',
      id: 'all_users',
      authenticationMode: 'any',
      numberMatchingRequiredState: 'enabled',           // Number matching
      displayAppInformationRequiredState: 'enabled'     // Show app name + location in push
    }]
  });
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `MethodNotEnabled` | Auth method not enabled in policy | Enable the method in authentication methods policy |
| 400 `TapAlreadyExists` | User already has an active TAP | Delete existing TAP before creating new one |
| 403 `Forbidden` | Missing `UserAuthenticationMethod.ReadWrite.All` | Consent permission with admin |
| 404 `MethodNotFound` | Auth method ID not found for user | Verify with GET `/authentication/methods` first |
| 409 `Conflict` | Method already registered | No action needed; method exists |
| 429 `TooManyRequests` | Graph throttled | Exponential backoff; batch requests |
| `MfaRegistrationNotEnabled` (logical) | SSPR/MFA registration not enabled for user | Check MFA policy and user group membership |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Phone numbers per user | 2 (mobile + alternate) | — |
| FIDO2 keys per user | 20 | — |
| OATH tokens per user | 5 | Hardware or software |
| Authenticator app registrations | 5 devices | Per user |
| TAP lifetime | 10 min – 8 hours | Configurable |
| TAP minimum lifetime | 10 minutes | Cannot create shorter TAP |
| Combined registration portal | All methods in one flow | — |
| Auth strength combinations | 15 | Per custom policy |
| Registration campaign snooze | 1-14 days | After which user is re-prompted |

---

## Common Patterns and Gotchas

1. **Per-user MFA is legacy** — The old per-user MFA enforcement (managed in the legacy MFA portal at aka.ms/mfasettings) conflicts with Conditional Access MFA. Migrate to CA-based MFA and disable per-user MFA settings. Mixed state causes unpredictable behavior.

2. **Security defaults vs Conditional Access** — Security defaults provide basic MFA for free, but they cannot coexist with CA policies. Once you create any CA policy, disable Security Defaults. Tenants with no CA policies should keep Security Defaults enabled.

3. **Combined registration experience** — The combined registration portal (`https://aka.ms/mysecurityinfo`) lets users register both MFA and SSPR in one flow. Ensure users can access this URL before any CA policy requires MFA registration.

4. **Authenticator number matching default** — As of 2023, Microsoft began enabling number matching by default. If you see authentication prompts asking for a 2-digit code, this is number matching. Do not disable it — it significantly reduces MFA fatigue attacks.

5. **FIDO2 on shared devices** — FIDO2 keys are tied to a specific device key handle. They cannot be shared between users. For kiosk scenarios, use WHfB shared device mode or TAP + Authenticator.

6. **TAP for onboarding** — Create TAPs with a 4-8 hour lifetime for new employee onboarding. TAPs allow the user to register their first MFA method without needing a separate provisioning step. Delete TAPs after use.

7. **SSPR license requirement** — SSPR for all users requires Entra ID P1 or P2. Self-service password reset for admins (who can always reset via Authenticator) is available at no charge. Check user license before expecting SSPR to work.

8. **Grace period** — When deploying an MFA CA policy, consider creating an exclusion group for a 1-week grace period that users can request to join. This prevents helpdesk flood while allowing exceptions.

9. **Voice calls in regulated environments** — Voice call MFA requires a DID phone number. For compliance reasons (call recording, GDPR), some organizations disable voice call MFA entirely and use FIDO2 or Authenticator push instead.

10. **Report API delay** — The `/reports/authenticationMethods/` endpoints have up to 48-hour data lag. Do not rely on them for real-time MFA enforcement status. Use the individual user method endpoints for current registration state.
