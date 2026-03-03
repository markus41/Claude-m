# Remediation — SharePoint/OneDrive Sharing Reference

Safe remediation removes overshared access without causing data loss or workflow disruption. All remediation actions should follow an owner-notification and approval workflow before execution.

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| DELETE | `/drives/{driveId}/items/{itemId}/permissions/{permId}` | `Sites.ReadWrite.All` | — | Remove a sharing permission |
| PATCH | `/drives/{driveId}/items/{itemId}/permissions/{permId}` | `Sites.ReadWrite.All` | Body: `{ "roles": ["read"] }` | Downgrade permission (write→read) |
| POST | `/drives/{driveId}/items/{itemId}/createLink` | `Sites.ReadWrite.All` | Body: link config | Replace anonymous with org link |
| DELETE | `/users/{id}` | `User.ReadWrite.All` | — | Remove guest user |
| PATCH | `/users/{id}` | `User.ReadWrite.All` | Body: `{ "accountEnabled": false }` | Disable (not delete) guest |
| POST | `/groups/{groupId}/members/$ref` | `Group.ReadWrite.All` | — | Re-add member after review |
| DELETE | `/groups/{groupId}/members/{memberId}/$ref` | `Group.ReadWrite.All` | — | Remove guest from group |

---

## Remediation Principles

| Principle | Description |
|-----------|-------------|
| Owner-first | Notify the file/site owner before revoking access |
| Snapshot | Record the permission object before deletion |
| Phased | Revoke highest-risk (anonymous+edit) first |
| Reversible | Prefer downgrade over delete where possible |
| Audit | Log every action with timestamp, actor, target |
| Approval-gated | No bulk deletions without approval workflow |

---

## Revoke Sharing Permission (TypeScript)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

interface RemediationRecord {
  timestamp: string;
  action: string;
  driveId: string;
  itemId: string;
  itemName: string;
  permissionId: string;
  permissionSnapshot: any;
  performedBy: string;
  approvedBy: string;
  approvalTimestamp: string;
  result: 'success' | 'failed';
  error?: string;
}

// Snapshot permission before deletion
async function snapshotPermission(
  client: Client,
  driveId: string,
  itemId: string,
  permissionId: string
): Promise<any> {
  return client
    .api(`/drives/${driveId}/items/${itemId}/permissions/${permissionId}`)
    .get();
}

// Revoke a single sharing permission
async function revokePermission(
  client: Client,
  driveId: string,
  itemId: string,
  itemName: string,
  permissionId: string,
  approvedBy: string,
  auditLog: RemediationRecord[]
): Promise<void> {
  // Snapshot first
  const snapshot = await snapshotPermission(client, driveId, itemId, permissionId);

  const record: RemediationRecord = {
    timestamp: new Date().toISOString(),
    action: 'DELETE_PERMISSION',
    driveId,
    itemId,
    itemName,
    permissionId,
    permissionSnapshot: snapshot,
    performedBy: 'automation-service',
    approvedBy,
    approvalTimestamp: new Date().toISOString(),
    result: 'success'
  };

  try {
    await client
      .api(`/drives/${driveId}/items/${itemId}/permissions/${permissionId}`)
      .delete();
  } catch (err: any) {
    record.result = 'failed';
    record.error = err.message;
  }

  auditLog.push(record);
}

// Downgrade edit permission to read-only (safer than deletion)
async function downgradeToReadOnly(
  client: Client,
  driveId: string,
  itemId: string,
  permissionId: string
): Promise<void> {
  await client
    .api(`/drives/${driveId}/items/${itemId}/permissions/${permissionId}`)
    .patch({ roles: ['read'] });
}
```

---

## Convert Anonymous Link to Specific People Link

```typescript
// Step 1: Create a new "specific people" link
async function createSpecificPeopleLink(
  client: Client,
  driveId: string,
  itemId: string,
  recipientEmails: string[]
): Promise<string> {
  // Create organization-scoped link (replaces anonymous)
  const link = await client
    .api(`/drives/${driveId}/items/${itemId}/createLink`)
    .post({
      type: 'view',
      scope: 'organization',
      expirationDateTime: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ).toISOString()  // 90-day expiry
    });

  return link.link.webUrl;
}

// Step 2: Send invitation to specific people
async function inviteSpecificPeople(
  client: Client,
  driveId: string,
  itemId: string,
  recipientEmails: string[],
  message: string
): Promise<void> {
  await client
    .api(`/drives/${driveId}/items/${itemId}/invite`)
    .post({
      requireSignIn: true,  // Must sign in — not anonymous
      sendInvitation: true,
      roles: ['read'],
      recipients: recipientEmails.map(email => ({ email })),
      message
    });
}

// Complete conversion: revoke anonymous, invite specific users
async function convertAnonymToSpecific(
  client: Client,
  driveId: string,
  itemId: string,
  anonymPermissionId: string,
  recipientEmails: string[],
  ownerEmail: string
): Promise<void> {
  // 1. Invite specific people first (so they get access before anonymous is removed)
  await inviteSpecificPeople(
    client, driveId, itemId, recipientEmails,
    'Your access to this file has been updated. Please use this secure link instead.'
  );

  // 2. Wait briefly for invitation to process
  await new Promise(r => setTimeout(r, 2000));

  // 3. Delete the anonymous link
  await client
    .api(`/drives/${driveId}/items/${itemId}/permissions/${anonymPermissionId}`)
    .delete();
}
```

---

## Remove Guest User from Group

```typescript
// Remove specific guest from a team or group
async function removeGuestFromGroup(
  client: Client,
  groupId: string,
  guestUserId: string,
  reason: string
): Promise<void> {
  // Record membership before removal
  const membership = await client
    .api(`/groups/${groupId}`)
    .select('displayName,mail,groupTypes')
    .get();

  console.log(`Removing ${guestUserId} from ${membership.displayName}: ${reason}`);

  await client
    .api(`/groups/${groupId}/members/${guestUserId}/$ref`)
    .delete();
}

// Disable (not delete) a guest user as a safer first step
async function disableGuestUser(
  client: Client,
  guestUserId: string
): Promise<void> {
  await client
    .api(`/users/${guestUserId}`)
    .patch({ accountEnabled: false });
}

// Permanently delete guest user
async function deleteGuestUser(
  client: Client,
  guestUserId: string,
  guestUPN: string,
  approvalId: string
): Promise<void> {
  console.log(`[AUDIT] Deleting guest: ${guestUPN}, approval: ${approvalId}`);
  await client.api(`/users/${guestUserId}`).delete();
  // Note: User enters 30-day soft-delete. Hard delete via:
  // DELETE /directory/deletedItems/{id}
}
```

---

## SharePoint Tenant-Level Oversharing Prevention

```powershell
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Step 1: Prevent future anonymous links (require sign-in)
Set-SPOTenant -SharingCapability ExternalUserSharingOnly

# Step 2: Set maximum anonymous link expiry (for tenants that keep anonymous sharing)
Set-SPOTenant -RequireAnonymousLinksExpireInDays 30

# Step 3: Prevent anonymous links on all new sites by default
Set-SPOTenant -DefaultSharingLinkType Internal   # Default to org-wide link
Set-SPOTenant -DefaultLinkPermission View         # Default to view-only
Set-SPOTenant -FileAnonymousLinkType View         # Limit anonymous files to view
Set-SPOTenant -FolderAnonymousLinkType View       # Limit anonymous folders to view

# Step 4: Require guest account expiration
Set-SPOTenant -ExternalUserExpirationRequired $true
Set-SPOTenant -ExternalUserExpireInDays 90

# Step 5: Block re-sharing by guests
Set-SPOTenant -PreventExternalUsersFromResharing $true

# Step 6: Block sharing with specific external domains
Set-SPOTenant -SharingBlockedDomainList @("competitor.com","personal-email.com")

# Site-level: Downgrade a specific risky site
Set-SPOSite `
    -Identity "https://contoso.sharepoint.com/sites/oldproject" `
    -SharingCapability ExistingExternalUserSharingOnly `
    -DefaultSharingLinkType Internal `
    -DefaultLinkPermission View
```

---

## Conditional Access for Guests

```typescript
// Apply conditional access to guest users to require MFA
const guestCaPolicy = {
  displayName: 'CA — Require MFA for Guest Users',
  state: 'enabledForReportingButNotEnforced',  // Always start in report-only
  conditions: {
    users: {
      includeGuestsOrExternalUsers: {
        guestOrExternalUserTypes: 'internalGuest,b2bCollaborationGuest,b2bDirectConnectExternal',
        externalTenants: {
          membershipKind: 'all'
        }
      }
    },
    applications: {
      includeApplications: ['All']
    },
    clientAppTypes: ['browser', 'mobileAppsAndDesktopClients']
  },
  grantControls: {
    operator: 'OR',
    builtInControls: ['mfa']
  }
};

// Apply session controls to limit guest access from unmanaged devices
const guestSessionPolicy = {
  displayName: 'CA — Limit Guest Access on Unmanaged Devices',
  state: 'enabledForReportingButNotEnforced',
  conditions: {
    users: {
      includeGuestsOrExternalUsers: {
        guestOrExternalUserTypes: 'internalGuest,b2bCollaborationGuest',
        externalTenants: { membershipKind: 'all' }
      }
    },
    applications: {
      includeApplications: [
        '00000003-0000-0ff1-ce00-000000000000', // SharePoint Online
        '00000002-0000-0ff1-ce00-000000000000'  // Exchange Online
      ]
    }
  },
  sessionControls: {
    applicationEnforcedRestrictions: { isEnabled: true }  // SPO limited access
  },
  grantControls: null  // Session control only
};
```

---

## Bulk Remediation Pattern (PowerShell)

```powershell
# Process findings CSV from the sharing audit scanner
$findings = Import-Csv ".\sharing-findings-$(Get-Date -Format 'yyyy-MM-dd').csv"
$auditLog = @()

foreach ($finding in $findings | Where-Object { $_.ApprovedForRemediation -eq 'Yes' }) {
    $driveId = $finding.DriveId
    $itemId = $finding.ItemId
    $permId = $finding.PermissionId

    try {
        # Call Graph to delete permission
        $uri = "https://graph.microsoft.com/v1.0/drives/$driveId/items/$itemId/permissions/$permId"
        Invoke-MgGraphRequest -Method DELETE -Uri $uri -ErrorAction Stop

        $auditLog += [PSCustomObject]@{
            Timestamp      = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
            Action         = 'DELETE_PERMISSION'
            SiteUrl        = $finding.SiteUrl
            ItemName       = $finding.ItemName
            PermissionId   = $permId
            ApprovedBy     = $finding.ApprovedBy
            Result         = 'Success'
            Error          = $null
        }

        Write-Host "[OK] Revoked $($finding.ItemName) — $($finding.LinkType)"
    }
    catch {
        $auditLog += [PSCustomObject]@{
            Timestamp  = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
            Action     = 'DELETE_PERMISSION'
            SiteUrl    = $finding.SiteUrl
            ItemName   = $finding.ItemName
            PermissionId = $permId
            ApprovedBy = $finding.ApprovedBy
            Result     = 'Failed'
            Error      = $_.Exception.Message
        }

        Write-Warning "[FAIL] $($finding.ItemName): $($_.Exception.Message)"
    }

    Start-Sleep -Milliseconds 200  # Throttle to ~5 req/sec
}

# Save audit log
$auditLog | Export-Csv -Path ".\remediation-audit-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
Write-Host "Remediation complete. Success: $($auditLog | Where-Object Result -eq 'Success' | Measure-Object).Count)"
Write-Host "Failed: $(($auditLog | Where-Object Result -eq 'Failed' | Measure-Object).Count)"
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `CannotDeleteInheritedPermission` | Permission is inherited from parent | Break permission inheritance first, then delete |
| 403 `AccessDenied` | Insufficient rights to delete permission | App needs `Sites.FullControl.All` for site-scoped removals |
| 404 `ItemNotFound` | Item or permission no longer exists | Skip — already cleaned up |
| 404 `PermissionNotFound` | Permission already deleted | Skip — idempotent |
| 409 `Conflict` | Active access review prevents modification | Wait for review to complete or cancel review |
| 429 `TooManyRequests` | Graph throttled | Add `Retry-After` delay; reduce to 1 req/second |
| `FolderCannotShareWithExternalUser` | Site blocked from external sharing | Site-level sharing already downgraded; no action needed |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Anonymous link expiry max (tenant) | Configurable (default: unlimited) | Set via SPO tenant settings |
| External user expiry max | 365 days | Per `ExternalUserExpireInDays` setting |
| Graph DELETE rate limit | 4 requests/second (soft) | Use sequential deletion with 200ms delay |
| SharePoint admin setting propagation | 15-30 minutes | `Set-SPOTenant` changes are not instant |
| Guest user soft-delete | 30 days | After DELETE /users, user is soft-deleted for 30 days |
| Permission deletion rate (PowerShell) | ~5/second | Add `Start-Sleep -Milliseconds 200` between calls |

---

## Common Patterns and Gotchas

1. **Never hard-delete without approval** — Automated permission deletion without owner notification is the most common cause of operational incidents in sharing remediation projects. Always implement a notification → wait period → owner confirmation → delete workflow.

2. **Inherited permissions require breaking inheritance** — You cannot delete an inherited permission on a child item — you can only delete it on the parent. If you need granular control, break inheritance first by creating unique permissions on the child.

3. **Converting anonymous to specific-people** — When converting an anonymous link to a "specific people" link, send invitations first and allow 60 seconds before revoking the anonymous link. If you revoke first, external users may have a brief access gap.

4. **Anonymous links are not user-specific** — An anonymous link can be forwarded by anyone who has it. Revoking one anonymous link does not prevent the file from being re-shared. Pair link revocation with site-level policy changes to prevent new anonymous links.

5. **Downgrade before delete** — For high-profile sites, consider downgrading permissions (e.g., `write` → `read`) first, then validating no business disruption for 48 hours, then deleting. This reduces rollback complexity.

6. **Permission deletion is not reversible via API** — Unlike user deletion (which has soft-delete), permission deletion is immediate and final. Maintain the snapshot file with full permission details so you can recreate permissions if needed.

7. **Tenant settings affect all sites** — `Set-SPOTenant` changes apply to all sites (unless overridden per-site). Test tenant-wide changes in a staging tenant or on a limited set of sites first.

8. **Guest account disable vs delete** — Disabling a guest account (`accountEnabled: false`) preserves their identity and memberships but blocks sign-in. This is a safer first step than deletion, allowing for a 30-day reversal window.

9. **Teams channel access** — Removing a guest from a group does not remove them from the Teams team's member list if they were added as a Teams guest separately. Use `DELETE /teams/{teamId}/members/{membershipId}` to remove from Teams channels.

10. **Purview retention holds** — If a user's OneDrive is under a Purview retention hold, deleting the user will preserve the OneDrive content as an inactive site. This is expected behavior but will consume storage quota. Monitor inactive site count after bulk guest deletion.
