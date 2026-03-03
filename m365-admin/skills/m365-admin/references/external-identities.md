# External Identities and Guest User Management

This reference covers B2B guest invitations, cross-tenant access policies, and external identity management via Microsoft Graph API.

## Required Scopes

| Operation | Scope |
|---|---|
| Invite guests | `User.Invite.All` |
| Manage cross-tenant access policy | `Policy.ReadWrite.CrossTenantAccess` |
| Manage authorization policy | `Policy.ReadWrite.Authorization` |
| Read/manage users | `User.ReadWrite.All` |

## Guest Invitations

### Invite a Guest User

```
POST https://graph.microsoft.com/v1.0/invitations
Content-Type: application/json

{
  "invitedUserEmailAddress": "partner@externalcompany.com",
  "invitedUserDisplayName": "Jane Partner",
  "inviteRedirectUrl": "https://myapps.microsoft.com",
  "sendInvitationMessage": true,
  "invitedUserMessageInfo": {
    "customizedMessageBody": "Welcome! You have been invited to collaborate on our shared projects."
  }
}
```

Response includes `inviteRedeemUrl` (the link the guest uses to accept) and the guest user object with `id`.

### Invite Without Sending Email (programmatic)

```
POST https://graph.microsoft.com/v1.0/invitations
Content-Type: application/json

{
  "invitedUserEmailAddress": "partner@externalcompany.com",
  "inviteRedirectUrl": "https://myapps.microsoft.com",
  "sendInvitationMessage": false
}
```

Capture `inviteRedeemUrl` and share it through your own channel.

### Bulk Guest Invitation Pattern

```typescript
const guests = [
  { email: "a@partner.com", name: "Alice Partner" },
  { email: "b@partner.com", name: "Bob Partner" },
];

for (const guest of guests) {
  await graphClient.api("/invitations").post({
    invitedUserEmailAddress: guest.email,
    invitedUserDisplayName: guest.name,
    inviteRedirectUrl: "https://myapps.microsoft.com",
    sendInvitationMessage: true,
  });
}
```

## Listing and Managing Guest Users

### List All Guest Users

```
GET https://graph.microsoft.com/v1.0/users?$filter=userType eq 'Guest'&$select=id,displayName,mail,userPrincipalName,createdDateTime,signInActivity
```

### List Guests Who Have Never Signed In

```
GET https://graph.microsoft.com/v1.0/users?$filter=userType eq 'Guest'&$select=id,displayName,mail,signInActivity
```

Then filter client-side for `signInActivity.lastSignInDateTime == null`.

### Get Guest's Group Memberships

```
GET https://graph.microsoft.com/v1.0/users/{guestId}/memberOf
```

### Update Guest User Properties

```
PATCH https://graph.microsoft.com/v1.0/users/{guestId}
Content-Type: application/json

{
  "displayName": "Jane Partner (Contoso)",
  "companyName": "Contoso"
}
```

### Delete / Remove Guest User

Soft-delete (30-day recycle bin):

```
DELETE https://graph.microsoft.com/v1.0/users/{guestId}
```

Permanent delete (from recycle bin):

```
DELETE https://graph.microsoft.com/v1.0/directory/deletedItems/{guestId}
```

### Revoke Guest Sessions (emergency access removal)

```
POST https://graph.microsoft.com/v1.0/users/{guestId}/revokeSignInSessions
```

Then disable the account:

```
PATCH https://graph.microsoft.com/v1.0/users/{guestId}
Content-Type: application/json

{ "accountEnabled": false }
```

## Cross-Tenant Access Policy (XTAP)

Cross-tenant access settings control B2B inbound/outbound collaboration and direct connect.

### Get Default Policy

```
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy
```

### Update Default Inbound/Outbound Settings

```
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/default
Content-Type: application/json

{
  "b2bCollaborationInbound": {
    "usersAndGroups": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllUsers", "targetType": "user" }
      ]
    },
    "applications": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllApplications", "targetType": "application" }
      ]
    }
  },
  "b2bCollaborationOutbound": {
    "usersAndGroups": {
      "accessType": "blocked",
      "targets": [
        { "target": "AllUsers", "targetType": "user" }
      ]
    }
  }
}
```

### List Partner-Specific Configurations

```
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners
```

### Add Partner-Specific Configuration

```
POST https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners
Content-Type: application/json

{
  "tenantId": "partner-tenant-id",
  "b2bCollaborationInbound": {
    "usersAndGroups": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllUsers", "targetType": "user" }
      ]
    }
  }
}
```

### Get / Update Partner Configuration

```
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
DELETE https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
```

## B2B Collaboration Settings (Authorization Policy)

### Get Authorization Policy

```
GET https://graph.microsoft.com/v1.0/policies/authorizationPolicy
```

Key properties:
- `allowInvitesFrom`: who can invite guests (`adminsAndGuestInviters`, `adminsGuestInvitersAndAllMembers`, `everyone`, `none`)
- `guestUserRoleId`: role guests get (`10dae51f-b6af-4016-8d66-8c2a99b929b3` = Guest User, `2af84b1e-32c8-42b7-82bc-daa82404023b` = Restricted Guest User)
- `allowedToSignUpEmailBasedSubscriptions`: self-service sign-up
- `allowedToUseSSPR`: self-service password reset for guests

### Restrict Guest Invitations to Admins Only

```
PATCH https://graph.microsoft.com/v1.0/policies/authorizationPolicy
Content-Type: application/json

{
  "allowInvitesFrom": "adminsAndGuestInviters"
}
```

## Stale Guest Review Pattern

For periodic stale guest cleanup:

```typescript
// 1. List all guests
const guests = await getAllPages(graphClient, "/users?$filter=userType eq 'Guest'&$select=id,mail,displayName,createdDateTime,signInActivity");

// 2. Identify stale (no sign-in for 90 days or never signed in)
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 90);

const stale = guests.filter(g => {
  const lastSignIn = g.signInActivity?.lastSignInDateTime;
  if (!lastSignIn) return true; // never signed in
  return new Date(lastSignIn) < cutoff;
});

// 3. For each stale guest, check group memberships before removing
// 4. Generate report and get approval before bulk deletion
```

## Guest Access Reviews via Access Reviews API

Create a recurring access review specifically for guest users:

```
POST https://graph.microsoft.com/v1.0/identityGovernance/accessReviews/definitions
Content-Type: application/json

{
  "displayName": "Quarterly Guest User Review",
  "scope": {
    "@odata.type": "#microsoft.graph.principalResourceMembershipsScope",
    "principalScopes": [
      {
        "@odata.type": "#microsoft.graph.accessReviewQueryScope",
        "query": "/users?$filter=userType eq 'Guest'",
        "queryType": "MicrosoftGraph"
      }
    ],
    "resourceScopes": [
      {
        "@odata.type": "#microsoft.graph.accessReviewQueryScope",
        "query": "/groups",
        "queryType": "MicrosoftGraph"
      }
    ]
  },
  "reviewers": [
    {
      "query": "/groups/{groupId}/owners",
      "queryType": "MicrosoftGraph"
    }
  ],
  "settings": {
    "defaultDecision": "Deny",
    "autoApplyDecisionsEnabled": true,
    "instanceDurationInDays": 14,
    "recurrence": {
      "pattern": { "type": "absoluteMonthly", "interval": 3 },
      "range": { "type": "noEnd", "startDate": "2024-01-01" }
    }
  }
}
```

## Invitation Redemption Order

When a guest user accepts an invitation, Microsoft Entra ID attempts identity providers in a configurable precedence order. The redemption order is stored in the cross-tenant access policy default configuration.

### Default Redemption Order

By default, Entra ID tries identity providers in this sequence:

1. **Azure Active Directory (Entra ID)** — if the guest has an account in another Entra tenant
2. **Microsoft Account (MSA)** — personal @outlook.com, @hotmail.com, or @live.com accounts
3. **Email one-time passcode (OTP)** — a 6-digit code sent to the user's email address (if OTP is enabled)

If none of the primary providers succeeds, the fallback provider (`defaultConfiguredIdp`) is used, which tries MSA and then OTP.

### Get the Current Redemption Configuration

```
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/default
```

Look for the `invitationRedemptionIdentityProviderConfiguration` property in the response.

### Customize the Redemption Order

The `invitationRedemptionIdentityProviderConfiguration` resource controls the order. You can prioritize external federation (SAML/WS-Federation) partners or force OTP-only:

```
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/default
Content-Type: application/json

{
  "invitationRedemptionIdentityProviderConfiguration": {
    "primaryIdentityProviderPrecedenceOrder": [
      "azureActiveDirectory",
      "externalFederation",
      "socialIdentityProviders"
    ],
    "fallbackIdentityProvider": "emailOneTimePasscode"
  }
}
```

### Primary Identity Provider Options

| Value | Description |
|---|---|
| `azureActiveDirectory` | User from another Entra ID (Microsoft 365) tenant |
| `externalFederation` | User from a SAML or WS-Federation federated identity provider |
| `socialIdentityProviders` | User with a Google account (when Google federation is configured) |

### Fallback Identity Provider Options

| Value | Description |
|---|---|
| `defaultConfiguredIdp` | Tries Microsoft Account, then OTP, then new Microsoft Account |
| `emailOneTimePasscode` | Always use email OTP if no primary IdP matches |
| `microsoftAccount` | Always use or create a Microsoft Account |

### One-Time Passcode (OTP) Configuration

Email OTP is enabled/disabled in the authorization policy:

```
PATCH https://graph.microsoft.com/v1.0/policies/authorizationPolicy
Content-Type: application/json

{
  "guestUserRoleId": "10dae51f-b6af-4016-8d66-8c2a99b929b3"
}
```

OTP-specific enablement is managed in the Entra admin center under External Identities > Email one-time passcode. OTP is enabled by default for all new tenants since October 2021.

**Edge cases:**
- If the guest's email domain matches a verified domain in your tenant, Entra ID treats the user as a home tenant user, not a guest — redemption is blocked
- If the invited user already exists as a member (not guest) in your tenant, a second invitation to the same email address silently reuses the existing account
- OTP codes expire after 30 minutes; if the link expires, the guest must be reinvited

## B2B Direct Connect (Shared Channels Federation)

B2B direct connect enables Teams Connect shared channels — external users participate without becoming guests in your directory. Both tenants must explicitly configure inbound and outbound B2B direct connect settings.

### Key Differences: B2B Collaboration vs. B2B Direct Connect

| Feature | B2B Collaboration (Guest) | B2B Direct Connect |
|---|---|---|
| User appears in your directory | Yes, as a Guest user object | No — user stays in home tenant |
| Supports Teams shared channels | No | Yes |
| Supports SharePoint, Exchange | Yes | Limited (Teams only currently) |
| Requires invitation + redemption | Yes | No invitation required |
| Conditional Access applicability | Your CA policies apply at resource access | Home tenant CA policies apply |
| Visibility in Entra admin center | User visible as Guest | Only accessible via shared channel |

### Enable B2B Direct Connect for a Partner Tenant

Both outbound (your users join their shared channels) and inbound (their users join your shared channels) must be configured on each side independently.

**Your tenant — allow outbound:**

```
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
Content-Type: application/json

{
  "b2bDirectConnectOutbound": {
    "usersAndGroups": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllUsers", "targetType": "user" }
      ]
    },
    "applications": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllApplications", "targetType": "application" }
      ]
    }
  }
}
```

**Your tenant — allow inbound:**

```
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
Content-Type: application/json

{
  "b2bDirectConnectInbound": {
    "usersAndGroups": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllUsers", "targetType": "user" }
      ]
    },
    "applications": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllApplications", "targetType": "application" }
      ]
    }
  }
}
```

### Scope B2B Direct Connect to Specific Security Groups

To limit which of your users can join external shared channels, use a group target:

```
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
Content-Type: application/json

{
  "b2bDirectConnectOutbound": {
    "usersAndGroups": {
      "accessType": "allowed",
      "targets": [
        {
          "target": "approved-external-collab-group-id",
          "targetType": "group"
        }
      ]
    },
    "applications": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllApplications", "targetType": "application" }
      ]
    }
  }
}
```

### Verify B2B Direct Connect Is Active

Check that both inbound and outbound are configured (neither property should be `null` or fully blocked):

```
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
```

Look for `b2bDirectConnectInbound` and `b2bDirectConnectOutbound` in the response. If `null`, the default policy applies — check `GET /policies/crossTenantAccessPolicy/default` for the default stance.

### Inbound Trust Settings for B2B Direct Connect

Configure your tenant to trust MFA claims from the partner tenant (so partner users are not double-prompted for MFA):

```
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners/{partnerTenantId}
Content-Type: application/json

{
  "inboundTrust": {
    "isMfaAccepted": true,
    "isCompliantDeviceAccepted": false,
    "isHybridAzureADJoinedDeviceAccepted": false
  }
}
```

## Conditional Access Policies Targeting Guest Users

Conditional Access policies can target specific categories of external users using the `guestOrExternalUserTypes` property. This allows different policy requirements for B2B guests versus B2B direct connect users versus service providers.

### Required Scope

`Policy.ReadWrite.ConditionalAccess` — required to create or modify Conditional Access policies.

### Create a CA Policy Requiring MFA for All B2B Collaboration Guests

```
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies
Content-Type: application/json

{
  "displayName": "Require MFA for All Guest Users",
  "state": "enabled",
  "conditions": {
    "users": {
      "includeGuestsOrExternalUsers": {
        "guestOrExternalUserTypes": "b2bCollaborationGuest,b2bCollaborationMember",
        "externalTenants": {
          "@odata.type": "#microsoft.graph.conditionalAccessAllExternalTenants",
          "membershipKind": "all"
        }
      }
    },
    "applications": {
      "includeApplications": ["All"]
    },
    "clientAppTypes": ["all"]
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}
```

### Guest User Type Values

| `guestOrExternalUserTypes` value | Description |
|---|---|
| `internalGuest` | Users in your tenant with `userType: Guest` (created locally, not via invitation) |
| `b2bCollaborationGuest` | Standard B2B invited guests with `userType: Guest` |
| `b2bCollaborationMember` | B2B users with `userType: Member` (cross-tenant sync or converted) |
| `b2bDirectConnectUser` | Users from B2B direct connect (shared channels); not in your directory |
| `otherExternalUser` | External users who don't fit other categories |
| `serviceProvider` | Cloud Solution Provider or Lighthouse service principal users |

Multiple types can be combined with commas: `"b2bCollaborationGuest,b2bCollaborationMember"`.

### Scope a CA Policy to Guests from a Specific External Tenant

```
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies
Content-Type: application/json

{
  "displayName": "Block Guest Access from Untrusted Tenant",
  "state": "enabled",
  "conditions": {
    "users": {
      "includeGuestsOrExternalUsers": {
        "guestOrExternalUserTypes": "b2bCollaborationGuest",
        "externalTenants": {
          "@odata.type": "#microsoft.graph.conditionalAccessEnumeratedExternalTenants",
          "members": ["untrusted-tenant-id"],
          "membershipKind": "enumerated"
        }
      }
    },
    "applications": {
      "includeApplications": ["All"]
    }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["block"]
  }
}
```

### Require Compliant Device for Guests Accessing Sensitive Apps

```
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies
Content-Type: application/json

{
  "displayName": "Guests - Compliant Device for SharePoint",
  "state": "enabled",
  "conditions": {
    "users": {
      "includeGuestsOrExternalUsers": {
        "guestOrExternalUserTypes": "b2bCollaborationGuest",
        "externalTenants": {
          "@odata.type": "#microsoft.graph.conditionalAccessAllExternalTenants",
          "membershipKind": "all"
        }
      }
    },
    "applications": {
      "includeApplications": ["00000003-0000-0ff1-ce00-000000000000"]
    }
  },
  "grantControls": {
    "operator": "AND",
    "builtInControls": ["mfa", "compliantDevice"]
  }
}
```

**Important notes:**
- `b2bDirectConnectUser` types are authenticated in their home tenant, so your CA policies apply at resource access time — the home tenant's CA policies also apply
- Session controls (sign-in frequency, app-enforced restrictions) work for guest users in the same way as member users
- Guests subject to a CA policy that requires a compliant device must enroll their device in your tenant's Intune (or use hybrid join) to comply — cross-tenant device compliance trust requires configuring `inboundTrust.isCompliantDeviceAccepted: true` in the XTAP settings

## Tenant Restrictions v2 (Blocking Shadow IT Guest Access)

Tenant restrictions v2 (TRv2) prevents your users from using external Entra ID accounts (including accounts in personal or shadow IT tenants) on your corporate network or managed devices. This addresses the scenario where an employee creates a separate account in an unauthorized tenant to exfiltrate data.

**Key distinction from cross-tenant access outbound settings:**
- Outbound access controls: govern your tenant's accounts accessing external tenants
- Tenant restrictions: govern external accounts being used from your network/devices, regardless of which tenant those accounts belong to

### How TRv2 Works

1. Your organization configures a TRv2 policy via the cross-tenant access policy
2. Corporate proxy or Windows device management injects the `sec-Restrict-Tenant-Access-Policy: <tenantId>:<policyId>` header into all authentication traffic
3. Microsoft Entra ID enforces the policy when it sees this header, blocking sign-ins that use external identities not permitted by your policy

### Configure Default TRv2 Policy (Block All External Accounts)

```
PATCH https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/default
Content-Type: application/json

{
  "tenantRestrictions": {
    "usersAndGroups": {
      "accessType": "blocked",
      "targets": [
        { "target": "AllUsers", "targetType": "user" }
      ]
    },
    "applications": {
      "accessType": "blocked",
      "targets": [
        { "target": "AllApplications", "targetType": "application" }
      ]
    }
  }
}
```

### Allow Specific External Apps Despite Default Block

Create a partner policy for a specific organization that overrides the default block:

```
POST https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/partners
Content-Type: application/json

{
  "tenantId": "allowed-partner-tenant-id",
  "tenantRestrictions": {
    "usersAndGroups": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllUsers", "targetType": "user" }
      ]
    },
    "applications": {
      "accessType": "allowed",
      "targets": [
        { "target": "AllApplications", "targetType": "application" }
      ]
    }
  }
}
```

### Get Your Tenant's Policy ID for Proxy Header Configuration

After setting up the TRv2 policy, retrieve your tenant ID and policy object ID:

```
GET https://graph.microsoft.com/v1.0/policies/crossTenantAccessPolicy/default
```

The `id` field in the response is the policy GUID. The proxy header format is:

```
sec-Restrict-Tenant-Access-Policy: <your-tenant-id>:<policy-object-id>
```

### TRv2 Enforcement Options

| Method | Protection Plane | Requires Proxy |
|---|---|---|
| Universal Tenant Restrictions (via Global Secure Access) | Authentication + Data plane | No — uses GSA client |
| Corporate proxy header injection | Authentication plane only | Yes |
| Windows device GPO (`TenantRestrictions` policy) | Authentication + Data plane | No — enforced on-device |

**GPO registry path for Windows:**
`HKLM\SOFTWARE\Policies\Microsoft\Windows\TenantRestrictions`

### TRv2 Edge Cases and Limitations

- TRv2 default settings cannot be scoped to individual users/groups — partner policies can specify users/groups
- Microsoft account (consumer) tenants can also be blocked; the MSA tenant ID is `9188040d-6c67-4c5b-b112-36a304b66dad`
- Data plane protection (blocking anonymous Teams meeting join, anonymous SharePoint access) is in preview and requires Windows GPO or GSA enforcement — proxy-only enforcement does not provide data plane protection
- TRv2 does not apply to device traffic from Autopilot, Windows Update, or organizational telemetry even when MSA tenant is blocked
- TRv2 is separate from and does not affect B2B guest sign-ins using your own tenant's accounts (outbound collaboration)
