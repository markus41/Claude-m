---
name: inv-user
description: Comprehensive user profile investigation — groups, roles, licenses, auth methods, devices, recent sign-ins
argument-hint: "<upn-or-user-id> [--include-devices] [--include-auth-methods] [--format <markdown|json>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — User Profile

Builds a full investigation profile for a user: core identity, manager chain, group and role memberships, license details, authentication methods, and recent sign-in activity.

## Arguments

| Argument | Description |
|---|---|
| `<upn-or-user-id>` | **Required.** User Principal Name (e.g. `jsmith@contoso.com`) or Entra object ID |
| `--include-devices` | Also fetch Intune managed devices and Entra registered devices for this user |
| `--include-auth-methods` | Enumerate all registered authentication methods |
| `--format <markdown\|json>` | Output format — defaults to `markdown` |

## Integration Context Check

Before making any API calls, confirm the required scopes are available. Run `inv-setup` if this is your first time using graph-investigator.

Required scopes:
- `User.Read.All` — core profile and group memberships
- `AuditLog.Read.All` — sign-in logs
- `GroupMember.Read.All` — transitive group and role membership

Optional scopes:
- `UserAuthenticationMethod.Read.All` — required for `--include-auth-methods`
- `DeviceManagementManagedDevices.Read.All` — required for `--include-devices`

## Step 1: Core User Profile

```bash
UPN="<upn-or-user-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}?\$select=id,displayName,userPrincipalName,mail,mailNickname,jobTitle,department,officeLocation,businessPhones,mobilePhone,accountEnabled,createdDateTime,deletedDateTime,lastPasswordChangeDateTime,passwordPolicies,usageLocation,preferredLanguage,onPremisesSyncEnabled,onPremisesLastSyncDateTime,onPremisesSamAccountName,onPremisesDomainName,onPremisesDistinguishedName,externalUserState,signInActivity" \
  --output json
```

Extract and surface key risk-relevant fields:
- `accountEnabled` — is the account active?
- `onPremisesSyncEnabled` — hybrid identity (changes here may revert from on-prem)
- `lastPasswordChangeDateTime` — how recently was the password changed?
- `passwordPolicies` — `DisablePasswordExpiration` removes forced rotation
- `signInActivity.lastSignInDateTime` — last interactive and non-interactive sign-in
- `externalUserState` — if set, this is a B2B guest

## Step 2: Manager Chain

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/manager?\$select=displayName,userPrincipalName,jobTitle,department" \
  --output json
```

If the user has no manager, the endpoint returns `404` — this is normal for external users and top-level executives.

## Step 3: Group Memberships

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/memberOf?\$select=id,displayName,groupTypes,securityEnabled,mailEnabled,onPremisesSyncEnabled&\$top=100" \
  --output json
```

Paginate if `@odata.nextLink` is present. Flag:
- Groups with `onPremisesSyncEnabled: true` — membership controlled from on-prem AD
- Security groups with names matching `*admin*`, `*privileged*`, `*break-glass*`, `*vip*`

## Step 4: Directory Role Memberships

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/transitiveMemberOf/microsoft.graph.directoryRole?\$select=id,displayName,description,roleTemplateId" \
  --output json
```

Flag high-privilege roles: Global Administrator, Privileged Role Administrator, Security Administrator, Exchange Administrator, SharePoint Administrator, Conditional Access Administrator.

## Step 5: License Summary

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/licenseDetails?\$select=skuPartNumber,skuId,servicePlans" \
  --output json
```

Map `skuPartNumber` to friendly names for the output table (e.g. `ENTERPRISEPREMIUM` → M365 E5, `SPE_E3` → M365 E3). Note which service plans are disabled — a plan with `provisioningStatus: Disabled` means the feature is not available even though the SKU is assigned.

## Step 6: Authentication Methods (--include-auth-methods)

Only run if `--include-auth-methods` is specified.

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/authentication/methods" \
  --output json
```

Decode the `@odata.type` values:
- `#microsoft.graph.passwordAuthenticationMethod` — password is registered (always present)
- `#microsoft.graph.microsoftAuthenticatorAuthenticationMethod` — Authenticator app
- `#microsoft.graph.phoneAuthenticationMethod` — SMS or voice call
- `#microsoft.graph.fido2AuthenticationMethod` — hardware security key
- `#microsoft.graph.windowsHelloForBusinessAuthenticationMethod` — Windows Hello
- `#microsoft.graph.emailAuthenticationMethod` — email OTP

Flag the absence of any phishing-resistant method (FIDO2 or WHfB) as a risk indicator.

## Step 7: Recent Sign-In Summary

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '${UPN}'&\$top=5&\$orderby=createdDateTime desc&\$select=createdDateTime,ipAddress,location,appDisplayName,status,riskLevelAggregated,riskEventTypes,clientAppUsed,deviceDetail,conditionalAccessStatus" \
  --headers "ConsistencyLevel=eventual" \
  --output json
```

Surface: last sign-in date/time, last seen IP and location, any risk events on recent sign-ins, whether MFA was satisfied.

## Step 8: Sign-In Activity from Profile

If `signInActivity` is populated on the user object (requires AAD P2 or M365 E5):
- `lastSignInDateTime` — last interactive sign-in
- `lastNonInteractiveSignInDateTime` — last silent token refresh

A large gap between interactive and non-interactive sign-in can indicate a long-lived refresh token being used without the user's knowledge.

## Output Format

Emit a structured profile card followed by data tables.

```markdown
## User Profile — jsmith@contoso.com

### Identity
| Field | Value |
|---|---|
| Display Name | John Smith |
| UPN | jsmith@contoso.com |
| Object ID | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| Account Enabled | ✅ Yes |
| Hybrid Sync | ✅ On-premises synced |
| Password Last Changed | 2024-01-10 14:32 UTC |
| Last Interactive Sign-In | 2024-01-15 09:17 UTC |
| Last Non-Interactive Sign-In | 2024-01-15 11:45 UTC |
| External/Guest | No |

### Manager
John Smith reports to: Jane Doe (jdoe@contoso.com) — VP Engineering

### Group Memberships (12 total)
| Group | Type | Synced | Risk |
|---|---|---|---|
| sg-all-employees | Security | ✅ | — |
| sg-admins | Security | ✅ | ⚠️ Privileged name |

### Directory Roles (2)
| Role | Template ID | Risk |
|---|---|---|
| Global Administrator | 62e90394-... | 🔴 HIGH — Highest privilege |
| Security Reader | 5d6b6bb7-... | 🟢 LOW |

### Licenses
| SKU | Friendly Name | Disabled Plans |
|---|---|---|
| ENTERPRISEPREMIUM | Microsoft 365 E5 | None |

### Authentication Methods
| Method | Details | Phishing-Resistant |
|---|---|---|
| Password | Registered | ❌ No |
| Authenticator App | jsmith's iPhone | ❌ No |

⚠️ No phishing-resistant method (FIDO2 or WHfB) registered.

### Recent Sign-Ins
| Date/Time | App | IP | Location | Status | Risk |
|---|---|---|---|---|---|
| 2024-01-15 09:17 | Azure Portal | 1.2.3.4 | New York, US | ✅ Success | None |
```

If `--format json` is specified, emit a single JSON object with keys: `profile`, `manager`, `groups`, `roles`, `licenses`, `authMethods`, `recentSignIns`.
