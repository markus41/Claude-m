# Stale Guests — SharePoint/OneDrive Reference

Stale guest users are external accounts that were invited to the tenant but have stopped actively using their access. Maintaining them creates unnecessary security exposure. This reference covers detection, access reviews, and cleanup via Graph API and PowerShell.

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/users?$filter=userType eq 'Guest'` | `User.Read.All` | `$filter`, `$select`, `$top` | List all guest users |
| GET | `/users/{id}` | `User.Read.All` | `$select=signInActivity` | Guest with sign-in data |
| GET | `/users/{id}/memberOf` | `User.Read.All` | — | Guest's group/team memberships |
| DELETE | `/users/{id}` | `User.ReadWrite.All` | — | Permanently delete guest user |
| POST | `/beta/identityGovernance/accessReviews/definitions` | `AccessReview.ReadWrite.All` | Body: review definition | Create access review |
| GET | `/beta/identityGovernance/accessReviews/definitions` | `AccessReview.Read.All` | — | List access reviews |
| GET | `/beta/identityGovernance/accessReviews/definitions/{id}/instances` | `AccessReview.Read.All` | — | List review instances |
| GET | `/beta/identityGovernance/accessReviews/definitions/{id}/instances/{instId}/decisions` | `AccessReview.ReadWrite.All` | `$filter` | Get decisions |
| PATCH | `/beta/identityGovernance/accessReviews/definitions/{id}/instances/{instId}/decisions/{decId}` | `AccessReview.ReadWrite.All` | Body: decision | Apply review decision |
| GET | `/beta/identity/b2cUserFlows` | `IdentityUserFlow.Read.All` | — | B2B collaboration settings |

**Base URL:** `https://graph.microsoft.com/v1.0` (beta for access reviews)

---

## Sign-In Activity API

The `signInActivity` property provides last sign-in timestamps for users (requires Entra ID P1 or P2).

```typescript
interface UserSignInActivity {
  lastSignInDateTime: string | null;          // Most recent interactive sign-in
  lastSignInRequestId: string | null;
  lastNonInteractiveSignInDateTime: string | null;  // Service token refreshes
  lastNonInteractiveSignInRequestId: string | null;
}
```

**Important:** `signInActivity` is available on `GET /users` with:
- `$select=signInActivity` in the query
- `ConsistencyLevel: eventual` header
- Entra ID P1+ license on the tenant

---

## Find Stale Guests (TypeScript)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

interface StaleGuest {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  externalUserState: string;
  createdDateTime: string;
  lastSignInDateTime: string | null;
  lastNonInteractiveSignInDateTime: string | null;
  daysSinceLastSignIn: number;
  memberOf: string[];
}

// Find guests inactive for 90+ days
async function findStaleGuests(
  client: Client,
  inactiveDays: number = 90
): Promise<StaleGuest[]> {
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().split('.')[0] + 'Z';

  const allGuests: any[] = [];
  let url =
    `/users?$filter=userType eq 'Guest'` +
    `&$select=id,displayName,mail,userPrincipalName,signInActivity,createdDateTime,externalUserState` +
    `&$top=200&$count=true`;

  while (url) {
    const page = await client
      .api(url)
      .header('ConsistencyLevel', 'eventual')
      .get();
    allGuests.push(...page.value);
    url = page['@odata.nextLink'] || null;
  }

  const staleGuests: StaleGuest[] = [];

  for (const guest of allGuests) {
    const lastSignIn = guest.signInActivity?.lastSignInDateTime;
    const lastNonInteractive = guest.signInActivity?.lastNonInteractiveSignInDateTime;

    // Determine effective last activity (use the more recent of the two)
    const effectiveLast = [lastSignIn, lastNonInteractive]
      .filter(Boolean)
      .sort()
      .pop() || null;

    const isStale =
      !effectiveLast || // Never signed in
      new Date(effectiveLast) < cutoff;

    if (isStale) {
      const daysSince = effectiveLast
        ? Math.floor((Date.now() - new Date(effectiveLast).getTime()) / (24 * 60 * 60 * 1000))
        : -1; // -1 = never signed in

      staleGuests.push({
        id: guest.id,
        displayName: guest.displayName,
        mail: guest.mail,
        userPrincipalName: guest.userPrincipalName,
        externalUserState: guest.externalUserState,
        createdDateTime: guest.createdDateTime,
        lastSignInDateTime: lastSignIn || null,
        lastNonInteractiveSignInDateTime: lastNonInteractive || null,
        daysSinceLastSignIn: daysSince,
        memberOf: []
      });
    }
  }

  return staleGuests;
}

// Enrich guests with group/team memberships
async function enrichGuestMemberships(
  client: Client,
  guests: StaleGuest[]
): Promise<StaleGuest[]> {
  for (const guest of guests) {
    const memberships = await client
      .api(`/users/${guest.id}/memberOf`)
      .select('displayName,groupTypes')
      .get();

    guest.memberOf = memberships.value.map((m: any) => m.displayName);
  }
  return guests;
}
```

---

## Guest Users Pending Acceptance (Never Redeemed)

```typescript
// Find guests who never redeemed their invitation
async function findPendingGuests(client: Client): Promise<any[]> {
  const allPending: any[] = [];
  let url =
    `/users?$filter=userType eq 'Guest' and externalUserState eq 'PendingAcceptance'` +
    `&$select=id,displayName,mail,userPrincipalName,createdDateTime,externalUserStateChangeDateTime` +
    `&$top=200&$count=true`;

  while (url) {
    const page = await client
      .api(url)
      .header('ConsistencyLevel', 'eventual')
      .get();
    allPending.push(...page.value);
    url = page['@odata.nextLink'] || null;
  }

  // Flag those pending for more than 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return allPending.filter(
    g => new Date(g.createdDateTime) < cutoff
  );
}
```

---

## Create Guest Access Review

```typescript
// Create a recurring access review for all guest users
async function createGuestAccessReview(
  client: Client,
  reviewerIds: string[],  // Entra user object IDs of reviewers
  reviewerEmails: string[]
): Promise<string> {
  const review = await client
    .api('/beta/identityGovernance/accessReviews/definitions')
    .post({
      displayName: 'Quarterly Guest User Access Review',
      descriptionForAdmins: 'Review all external guest user accounts',
      descriptionForReviewers: 'Please confirm whether each guest user still requires access to your tenant.',
      scope: {
        query: "/users?$filter=userType eq 'Guest'",
        queryType: 'MicrosoftGraph'
      },
      reviewers: reviewerIds.map(id => ({
        query: `/users/${id}`,
        queryType: 'MicrosoftGraph'
      })),
      settings: {
        mailNotificationsEnabled: true,
        reminderNotificationsEnabled: true,
        justificationRequiredOnApproval: true,
        defaultDecisionEnabled: true,
        defaultDecision: 'Deny',  // Auto-deny if reviewer doesn't respond
        instanceDurationInDays: 14,
        autoApplyDecisionsEnabled: true,  // Auto-apply deny decisions
        recommendationsEnabled: true,      // Show AI recommendations
        recurrence: {
          pattern: { type: 'absoluteMonthly', interval: 3 },  // Quarterly
          range: {
            type: 'noEnd',
            startDate: new Date().toISOString().split('T')[0]
          }
        }
      }
    });

  return review.id;
}
```

---

## External Collaboration Settings

```typescript
// Get B2B collaboration settings
async function getExternalCollaborationSettings(client: Client) {
  const settings = await client
    .api('/policies/authorizationPolicy')
    .get();

  return {
    guestUserRoleId: settings.guestUserRoleId,
    // 'a0b1b346-4d3e-4e8b-98f8-753987be4970' = Restricted guest (most limited)
    // '10dae51f-b6af-4016-8d66-8c2a99b929b3' = Limited guest
    // 'bf53b78e-ad6f-44e9-a2ec-4ff6c0dae9e9' = Guest user (same as member)
    allowInvitesFrom: settings.allowInvitesFrom,
    // 'adminsAndGuestInviters' | 'adminsGuestInvitersAndAllMembers' | 'everyone' | 'none'
    allowedToSignUpEmailBasedSubscriptions: settings.allowedToSignUpEmailBasedSubscriptions,
    allowedToUseSSPR: settings.allowedToUseSSPR
  };
}

// Check cross-tenant access settings for specific external tenant
async function getCrossTenantSettings(client: Client, externalTenantId: string) {
  const settings = await client
    .api(`/policies/crossTenantAccessPolicy/partners/${externalTenantId}`)
    .get();

  return settings.b2bCollaborationInbound;
}
```

---

## Guest Expiration Policy

```powershell
Connect-MgGraph -Scopes "Policy.ReadWrite.ExternalIdentities"

# Get current guest expiration policy
$policy = Get-MgPolicyExternalIdentityPolicy
$policy | Select-Object AllowExternalIdentitiesToLeave, AllowDeletedIdentitiesDataRemoval | Format-List

# Set automatic guest access expiration (requires Entra ID P1)
# This requires the Guest User Access Expiration feature in the portal:
# Entra ID → External Identities → External collaboration settings
# → Guest user access expires after: [number] days

# Alternative: Use lifecycle workflows for automated guest cleanup
# https://learn.microsoft.com/en-us/azure/active-directory/governance/lifecycle-workflow-scenarios
```

---

## Automatic Guest Cleanup (PowerShell)

```powershell
Connect-MgGraph -Scopes "User.ReadWrite.All","AuditLog.Read.All"

$inactiveDays = 90
$cutoffDate = (Get-Date).AddDays(-$inactiveDays)

# Find stale guests
$staleGuests = Get-MgUser -All -Filter "userType eq 'Guest'" `
    -Property "id,displayName,mail,userPrincipalName,signInActivity,createdDateTime,externalUserState" `
    -ConsistencyLevel eventual `
    -CountVariable guestCount |
    Where-Object {
        $lastSignIn = $_.SignInActivity.LastSignInDateTime
        $lastNonInteractive = $_.SignInActivity.LastNonInteractiveSignInDateTime
        $effectiveLast = @($lastSignIn, $lastNonInteractive) | Where-Object { $_ } | Sort-Object | Select-Object -Last 1
        $null -eq $effectiveLast -or [DateTime]$effectiveLast -lt $cutoffDate
    }

Write-Host "Total guests: $guestCount"
Write-Host "Stale guests (90+ days): $($staleGuests.Count)"

# Generate report (do NOT auto-delete without approval workflow)
$report = $staleGuests | ForEach-Object {
    $memberships = Get-MgUserMemberOf -UserId $_.Id | Select-Object -ExpandProperty AdditionalProperties |
        Where-Object { $_.ContainsKey('displayName') } |
        ForEach-Object { $_['displayName'] }

    [PSCustomObject]@{
        DisplayName    = $_.DisplayName
        Email          = $_.Mail
        UPN            = $_.UserPrincipalName
        State          = $_.ExternalUserState
        Created        = $_.CreatedDateTime
        LastSignIn     = $_.SignInActivity.LastSignInDateTime
        Memberships    = $memberships -join '; '
        RecommendAction = if ($null -eq $_.SignInActivity.LastSignInDateTime) {
            'Delete - Never signed in'
        } elseif (([DateTime]$_.SignInActivity.LastSignInDateTime - $cutoffDate).Days -lt -180) {
            'Delete - 180+ days inactive'
        } else {
            'Review - 90-180 days inactive'
        }
    }
}

$report | Export-Csv -Path ".\stale-guests-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
$report | Format-Table DisplayName, Email, LastSignIn, RecommendAction -AutoSize

# After review/approval, delete specific users:
# $approvedForDeletion = @("guest-id-1", "guest-id-2")
# $approvedForDeletion | ForEach-Object { Remove-MgUser -UserId $_ -Confirm:$false }
```

---

## Guest Insights Report (Office 365)

```powershell
# Use Exchange Online to identify guests who have not accessed any mailbox resources
Connect-ExchangeOnline -UserPrincipalName "admin@contoso.com"

# Get mailbox statistics for all guests with mailboxes
$guestMailboxes = Get-Mailbox -Filter "RecipientTypeDetails -eq 'GuestMailUser'" -ResultSize Unlimited
$guestActivity = $guestMailboxes | ForEach-Object {
    $stats = Get-MailboxStatistics -Identity $_.UserPrincipalName -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        UPN            = $_.UserPrincipalName
        DisplayName    = $_.DisplayName
        LastLogonTime  = $stats.LastLogonTime
        ItemCount      = $stats.ItemCount
        TotalItemSize  = $stats.TotalItemSize
    }
}

$guestActivity | Where-Object { $null -eq $_.LastLogonTime -or $_.LastLogonTime -lt (Get-Date).AddDays(-90) } |
    Sort-Object LastLogonTime |
    Format-Table UPN, LastLogonTime, ItemCount -AutoSize
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `ConsistencyLevelRequired` | Missing header for advanced query | Add `ConsistencyLevel: eventual` header and `$count=true` |
| 400 `FilterNotSupported` | `signInActivity` filter without proper setup | Add `$count=true` to the query along with `ConsistencyLevel: eventual` |
| 403 `Forbidden` | Missing `User.Read.All` or `AuditLog.Read.All` | Grant permissions in app registration |
| 403 `InsufficientPrivilege` | Deleting guest requires `User.ReadWrite.All` | Elevate permission or use delegated admin role |
| 404 `UserNotFound` | Guest already deleted | Continue to next guest in loop |
| 429 `TooManyRequests` | Graph throttled | Implement backoff; reduce parallel calls |
| `InsufficientLicense` (signInActivity) | Tenant lacks Entra ID P1 | Upgrade license tier for sign-in activity data |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| `signInActivity` retention | 30 days (P1) / 90 days (P2) | After retention period, data is purged |
| Users per `$top` | 999 | Maximum for user list queries |
| Access review members | 100,000 | Per review instance |
| Access review duration | 1-180 days | Per instance |
| Batch delete (PowerShell) | No limit | But rate-limit to 50/min to avoid throttling |
| Guest user soft-delete | 30 days | Before permanent deletion |
| Guest user hard-delete | Permanent after 30 days or admin purge | Cannot recover after hard delete |

---

## Common Patterns and Gotchas

1. **Non-interactive sign-in matters** — A guest may not have signed in interactively for 90 days but may still be actively using service-to-service tokens (non-interactive). Always check both `lastSignInDateTime` and `lastNonInteractiveSignInDateTime` before classifying as stale.

2. **Guests in Microsoft Teams** — Guest accounts that access Teams channels generate non-interactive sign-ins. A "stale" Teams guest may still be active in Teams conversations. Cross-reference with Teams activity reports before removal.

3. **Access review auto-apply** — When `autoApplyDecisionsEnabled: true` and `defaultDecision: 'Deny'`, any guest not explicitly approved is automatically removed after the review period. Test this behavior in a small pilot before enabling at scale.

4. **Cascading group removals** — Deleting a guest user automatically removes them from all groups they belong to. Document group memberships before deletion so they can be restored if needed.

5. **Shared Channel Guests (B2B Direct)** — Teams Shared Channel users are a different identity type from regular B2B guests. They do not appear in the `/users` endpoint as `userType eq 'Guest'`. Use `/teams/{teamId}/channels/{channelId}/members` to enumerate shared channel members separately.

6. **Invited but never redeemed** — Guests in `PendingAcceptance` state have never clicked their invitation link. These can often be deleted after 30+ days without business impact. However, confirm with the sponsor first.

7. **Guest sponsor tracking** — There is no built-in "sponsor" field in Graph. Maintain a separate watchlist or extensionAttribute to track which internal user is responsible for each guest. This is critical for the approval workflow.

8. **Hard delete vs soft delete** — `DELETE /users/{id}` moves the user to a 30-day soft-deleted state. During soft-delete, the user's group memberships and licenses are preserved but inactive. To hard-delete immediately: `DELETE /directory/deletedItems/{id}`.

9. **Automation runs must have approval gates** — Never automate guest deletion without an approval step. Automated mass-deletion of guests has caused operational incidents (external auditors, customer support contacts removed). Always route through a human approval workflow.

10. **B2B collaboration vs B2B direct** — B2B collaboration (standard guests) are in your tenant's user directory. B2B direct connect (Teams Shared Channels) are not in your directory. The `/users?$filter=userType eq 'Guest'` query only returns B2B collaboration guests.
