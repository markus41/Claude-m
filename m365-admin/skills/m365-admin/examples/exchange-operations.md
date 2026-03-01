# Exchange Operations Examples

Complete examples for Exchange Online administration using TypeScript (Graph API) and PowerShell (Exchange Online module).

## 1. Set Up Auto-Reply for User (TypeScript via Graph)

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface AutoReplyConfig {
  userPrincipalName: string;
  mode: "always" | "scheduled";
  internalMessage: string;
  externalMessage: string;
  externalAudience: "none" | "contactsOnly" | "all";
  startDate?: string;   // ISO 8601 date, e.g. "2025-07-01T08:00:00"
  endDate?: string;     // ISO 8601 date, e.g. "2025-07-15T08:00:00"
  timeZone?: string;    // e.g. "Pacific Standard Time"
}

interface AutoReplyResult {
  userPrincipalName: string;
  success: boolean;
  mode: string;
  error?: string;
}

async function setAutoReply(
  graphClient: Client,
  config: AutoReplyConfig,
): Promise<AutoReplyResult> {
  const timeZone = config.timeZone ?? "UTC";

  interface AutoReplySetting {
    status: string;
    externalAudience: string;
    internalReplyMessage: string;
    externalReplyMessage: string;
    scheduledStartDateTime?: { dateTime: string; timeZone: string };
    scheduledEndDateTime?: { dateTime: string; timeZone: string };
  }

  const automaticRepliesSetting: AutoReplySetting = {
    status: config.mode === "always" ? "alwaysEnabled" : "scheduled",
    externalAudience: config.externalAudience,
    internalReplyMessage: config.internalMessage,
    externalReplyMessage: config.externalMessage,
  };

  if (config.mode === "scheduled") {
    if (!config.startDate || !config.endDate) {
      return {
        userPrincipalName: config.userPrincipalName,
        success: false,
        mode: config.mode,
        error: "startDate and endDate are required for scheduled mode",
      };
    }
    automaticRepliesSetting.scheduledStartDateTime = {
      dateTime: config.startDate,
      timeZone,
    };
    automaticRepliesSetting.scheduledEndDateTime = {
      dateTime: config.endDate,
      timeZone,
    };
  }

  try {
    await graphClient
      .api(`/users/${config.userPrincipalName}/mailboxSettings`)
      .patch({ automaticRepliesSetting });

    return {
      userPrincipalName: config.userPrincipalName,
      success: true,
      mode: config.mode,
    };
  } catch (error) {
    return {
      userPrincipalName: config.userPrincipalName,
      success: false,
      mode: config.mode,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function disableAutoReply(
  graphClient: Client,
  userPrincipalName: string,
): Promise<AutoReplyResult> {
  try {
    await graphClient
      .api(`/users/${userPrincipalName}/mailboxSettings`)
      .patch({
        automaticRepliesSetting: {
          status: "disabled",
        },
      });

    return { userPrincipalName, success: true, mode: "disabled" };
  } catch (error) {
    return {
      userPrincipalName,
      success: false,
      mode: "disabled",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Bulk auto-reply for a list of users
async function bulkSetAutoReply(
  graphClient: Client,
  users: string[],
  internalMessage: string,
  externalMessage: string,
): Promise<string> {
  const results: AutoReplyResult[] = [];

  for (const upn of users) {
    const result = await setAutoReply(graphClient, {
      userPrincipalName: upn,
      mode: "always",
      internalMessage,
      externalMessage,
      externalAudience: "all",
    });
    results.push(result);
  }

  const report: string[] = [];
  report.push("# Auto-Reply Configuration Report");
  report.push("");
  report.push(`**Timestamp**: ${new Date().toISOString()}`);
  report.push(`**Users processed**: ${results.length}`);
  report.push("");
  report.push("| User | Status | Error |");
  report.push("|------|--------|-------|");
  for (const r of results) {
    report.push(`| ${r.userPrincipalName} | ${r.success ? "SET" : "FAILED"} | ${r.error ?? ""} |`);
  }
  return report.join("\n");
}

// Usage: Set scheduled auto-reply
const result = await setAutoReply(graphClient, {
  userPrincipalName: "jane@contoso.com",
  mode: "scheduled",
  internalMessage: "<html><body><p>I am on vacation from July 1-15. Contact <a href='mailto:backup@contoso.com'>backup@contoso.com</a> for urgent matters.</p></body></html>",
  externalMessage: "<html><body><p>Thank you for your email. I am currently out of office and will return on July 15, 2025.</p></body></html>",
  externalAudience: "all",
  startDate: "2025-07-01T00:00:00",
  endDate: "2025-07-15T23:59:59",
  timeZone: "Pacific Standard Time",
});
```

## 2. Create Shared Mailbox and Assign Permissions (PowerShell)

```powershell
#Requires -Modules ExchangeOnlineManagement

<#
.SYNOPSIS
    Creates a shared mailbox and configures permissions for specified users.
.PARAMETER MailboxName
    Display name for the shared mailbox.
.PARAMETER Alias
    Mail alias (becomes part of the email address).
.PARAMETER EmailAddress
    Primary SMTP address.
.PARAMETER FullAccessUsers
    Array of UPNs to grant Full Access.
.PARAMETER SendAsUsers
    Array of UPNs to grant Send As.
.PARAMETER SendOnBehalfUsers
    Array of UPNs to grant Send on Behalf.
.EXAMPLE
    .\Create-SharedMailbox.ps1 -MailboxName "Support Team" -Alias "support" -EmailAddress "support@contoso.com" -FullAccessUsers @("user1@contoso.com", "user2@contoso.com") -SendAsUsers @("user1@contoso.com")
#>
param(
    [Parameter(Mandatory)]
    [string]$MailboxName,

    [Parameter(Mandatory)]
    [string]$Alias,

    [Parameter(Mandatory)]
    [string]$EmailAddress,

    [string[]]$FullAccessUsers = @(),
    [string[]]$SendAsUsers = @(),
    [string[]]$SendOnBehalfUsers = @()
)

# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName $env:ADMIN_UPN -ShowBanner:$false

$report = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"

# Step 1: Create the shared mailbox
try {
    $mailbox = New-Mailbox -Shared -Name $MailboxName -DisplayName $MailboxName -Alias $Alias -PrimarySmtpAddress $EmailAddress
    $report += [PSCustomObject]@{
        Step   = "Create Mailbox"
        Status = "SUCCESS"
        Detail = "Created: $($mailbox.PrimarySmtpAddress)"
    }
} catch {
    $report += [PSCustomObject]@{
        Step   = "Create Mailbox"
        Status = "FAILED"
        Detail = $_.Exception.Message
    }
    Write-Error "Mailbox creation failed. Aborting."
    $report | Format-Table -AutoSize
    Disconnect-ExchangeOnline -Confirm:$false
    return
}

# Step 2: Grant Full Access
foreach ($user in $FullAccessUsers) {
    try {
        Add-MailboxPermission -Identity $EmailAddress -User $user -AccessRights FullAccess -InheritanceType All -AutoMapping $true -Confirm:$false | Out-Null
        $report += [PSCustomObject]@{
            Step   = "Full Access"
            Status = "SUCCESS"
            Detail = "$user granted Full Access (AutoMapping enabled)"
        }
    } catch {
        $report += [PSCustomObject]@{
            Step   = "Full Access"
            Status = "FAILED"
            Detail = "$user — $($_.Exception.Message)"
        }
    }
}

# Step 3: Grant Send As
foreach ($user in $SendAsUsers) {
    try {
        Add-RecipientPermission -Identity $EmailAddress -Trustee $user -AccessRights SendAs -Confirm:$false | Out-Null
        $report += [PSCustomObject]@{
            Step   = "Send As"
            Status = "SUCCESS"
            Detail = "$user granted Send As"
        }
    } catch {
        $report += [PSCustomObject]@{
            Step   = "Send As"
            Status = "FAILED"
            Detail = "$user — $($_.Exception.Message)"
        }
    }
}

# Step 4: Grant Send on Behalf
if ($SendOnBehalfUsers.Count -gt 0) {
    try {
        Set-Mailbox -Identity $EmailAddress -GrantSendOnBehalfTo $SendOnBehalfUsers
        $report += [PSCustomObject]@{
            Step   = "Send on Behalf"
            Status = "SUCCESS"
            Detail = "Granted to: $($SendOnBehalfUsers -join ', ')"
        }
    } catch {
        $report += [PSCustomObject]@{
            Step   = "Send on Behalf"
            Status = "FAILED"
            Detail = $_.Exception.Message
        }
    }
}

# Output report
Write-Host "`n=== Shared Mailbox Creation Report ===" -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp"
Write-Host "Mailbox: $EmailAddress"
Write-Host ""
$report | Format-Table Step, Status, Detail -AutoSize

# Verify final state
Write-Host "`n=== Current Permissions ===" -ForegroundColor Cyan
Get-MailboxPermission -Identity $EmailAddress | Where-Object { $_.User -ne "NT AUTHORITY\SELF" } | Format-Table User, AccessRights -AutoSize
Get-RecipientPermission -Identity $EmailAddress | Where-Object { $_.Trustee -ne "NT AUTHORITY\SELF" } | Format-Table Trustee, AccessRights -AutoSize

Disconnect-ExchangeOnline -Confirm:$false
```

## 3. Manage Distribution List Membership (PowerShell)

```powershell
#Requires -Modules ExchangeOnlineManagement

<#
.SYNOPSIS
    Manages distribution list membership from a CSV file.
    CSV columns: Action (Add/Remove), UserEmail, DistributionList
.PARAMETER CsvPath
    Path to the CSV file.
.PARAMETER DryRun
    If specified, shows what would happen without making changes.
.EXAMPLE
    .\Manage-DLMembership.ps1 -CsvPath ".\dl-changes.csv" -DryRun
#>
param(
    [Parameter(Mandatory)]
    [string]$CsvPath,

    [switch]$DryRun
)

Connect-ExchangeOnline -UserPrincipalName $env:ADMIN_UPN -ShowBanner:$false

$rows = Import-Csv -Path $CsvPath
$results = @()

Write-Host "Processing $($rows.Count) operations..." -ForegroundColor Cyan
if ($DryRun) { Write-Host "[DRY RUN MODE]" -ForegroundColor Yellow }

foreach ($row in $rows) {
    $action = $row.Action.Trim().ToLower()
    $user = $row.UserEmail.Trim()
    $dl = $row.DistributionList.Trim()

    if ($DryRun) {
        $results += [PSCustomObject]@{
            Action = $action.ToUpper()
            User   = $user
            DL     = $dl
            Status = "WOULD EXECUTE"
            Error  = ""
        }
        continue
    }

    try {
        if ($action -eq "add") {
            Add-DistributionGroupMember -Identity $dl -Member $user -ErrorAction Stop
            $results += [PSCustomObject]@{
                Action = "ADD"
                User   = $user
                DL     = $dl
                Status = "SUCCESS"
                Error  = ""
            }
        } elseif ($action -eq "remove") {
            Remove-DistributionGroupMember -Identity $dl -Member $user -Confirm:$false -ErrorAction Stop
            $results += [PSCustomObject]@{
                Action = "REMOVE"
                User   = $user
                DL     = $dl
                Status = "SUCCESS"
                Error  = ""
            }
        } else {
            $results += [PSCustomObject]@{
                Action = $action.ToUpper()
                User   = $user
                DL     = $dl
                Status = "SKIPPED"
                Error  = "Invalid action. Use 'Add' or 'Remove'."
            }
        }
    } catch {
        $results += [PSCustomObject]@{
            Action = $action.ToUpper()
            User   = $user
            DL     = $dl
            Status = "FAILED"
            Error  = $_.Exception.Message
        }
    }
}

# Report
$succeeded = ($results | Where-Object { $_.Status -eq "SUCCESS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAILED" }).Count
$skipped = ($results | Where-Object { $_.Status -eq "SKIPPED" }).Count

Write-Host "`n=== Distribution List Membership Report ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')"
Write-Host "Total: $($rows.Count) | Succeeded: $succeeded | Failed: $failed | Skipped: $skipped"
Write-Host ""
$results | Format-Table Action, User, DL, Status, Error -AutoSize

Disconnect-ExchangeOnline -Confirm:$false
```

## 4. Calendar Permission Delegation (TypeScript via Graph)

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

type CalendarRole =
  | "none"
  | "freeBusyRead"
  | "limitedRead"
  | "read"
  | "write"
  | "delegateWithoutPrivateEventAccess"
  | "delegateWithPrivateEventAccess";

interface CalendarPermission {
  id: string;
  emailAddress: {
    name: string;
    address: string;
  } | null;
  isRemovable: boolean;
  isInsideOrganization: boolean;
  role: CalendarRole;
}

interface CalendarDelegationInput {
  calendarOwnerUpn: string;
  delegateEmail: string;
  delegateName: string;
  role: CalendarRole;
}

interface DelegationResult {
  ownerUpn: string;
  delegateEmail: string;
  role: CalendarRole;
  action: "created" | "updated" | "removed" | "failed";
  permissionId?: string;
  error?: string;
}

async function listCalendarPermissions(
  graphClient: Client,
  userPrincipalName: string,
): Promise<string> {
  const response = await graphClient
    .api(`/users/${userPrincipalName}/calendar/calendarPermissions`)
    .get();

  const permissions: CalendarPermission[] = response.value;

  const report: string[] = [];
  report.push(`# Calendar Permissions: ${userPrincipalName}`);
  report.push("");
  report.push("| Delegate | Role | Internal | Removable | Permission ID |");
  report.push("|----------|------|----------|-----------|---------------|");

  for (const p of permissions) {
    const delegate = p.emailAddress?.address ?? "Default (org-wide)";
    report.push(
      `| ${delegate} | ${p.role} | ${p.isInsideOrganization} | ${p.isRemovable} | ${p.id} |`
    );
  }

  return report.join("\n");
}

async function grantCalendarAccess(
  graphClient: Client,
  input: CalendarDelegationInput,
): Promise<DelegationResult> {
  try {
    // Check if permission already exists
    const existing = await graphClient
      .api(`/users/${input.calendarOwnerUpn}/calendar/calendarPermissions`)
      .get();

    const existingPermission = existing.value.find(
      (p: CalendarPermission) => p.emailAddress?.address?.toLowerCase() === input.delegateEmail.toLowerCase()
    );

    if (existingPermission) {
      // Update existing permission
      await graphClient
        .api(`/users/${input.calendarOwnerUpn}/calendar/calendarPermissions/${existingPermission.id}`)
        .patch({ role: input.role });

      return {
        ownerUpn: input.calendarOwnerUpn,
        delegateEmail: input.delegateEmail,
        role: input.role,
        action: "updated",
        permissionId: existingPermission.id,
      };
    }

    // Create new permission
    const result = await graphClient
      .api(`/users/${input.calendarOwnerUpn}/calendar/calendarPermissions`)
      .post({
        emailAddress: {
          name: input.delegateName,
          address: input.delegateEmail,
        },
        role: input.role,
      });

    return {
      ownerUpn: input.calendarOwnerUpn,
      delegateEmail: input.delegateEmail,
      role: input.role,
      action: "created",
      permissionId: result.id,
    };
  } catch (error) {
    return {
      ownerUpn: input.calendarOwnerUpn,
      delegateEmail: input.delegateEmail,
      role: input.role,
      action: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function revokeCalendarAccess(
  graphClient: Client,
  calendarOwnerUpn: string,
  delegateEmail: string,
): Promise<DelegationResult> {
  try {
    const existing = await graphClient
      .api(`/users/${calendarOwnerUpn}/calendar/calendarPermissions`)
      .get();

    const permission = existing.value.find(
      (p: CalendarPermission) => p.emailAddress?.address?.toLowerCase() === delegateEmail.toLowerCase()
    );

    if (!permission) {
      return {
        ownerUpn: calendarOwnerUpn,
        delegateEmail,
        role: "none",
        action: "failed",
        error: "No existing permission found for this delegate",
      };
    }

    if (!permission.isRemovable) {
      return {
        ownerUpn: calendarOwnerUpn,
        delegateEmail,
        role: permission.role,
        action: "failed",
        error: "This permission is not removable (system default)",
      };
    }

    await graphClient
      .api(`/users/${calendarOwnerUpn}/calendar/calendarPermissions/${permission.id}`)
      .delete();

    return {
      ownerUpn: calendarOwnerUpn,
      delegateEmail,
      role: "none",
      action: "removed",
      permissionId: permission.id,
    };
  } catch (error) {
    return {
      ownerUpn: calendarOwnerUpn,
      delegateEmail,
      role: "none",
      action: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Usage: Grant delegate access
const delegationResult = await grantCalendarAccess(graphClient, {
  calendarOwnerUpn: "manager@contoso.com",
  delegateEmail: "assistant@contoso.com",
  delegateName: "Executive Assistant",
  role: "delegateWithPrivateEventAccess",
});

console.log(`Calendar delegation: ${delegationResult.action}`);

// Usage: List all permissions
const permReport = await listCalendarPermissions(graphClient, "manager@contoso.com");
console.log(permReport);

// Usage: Revoke access
const revocation = await revokeCalendarAccess(
  graphClient,
  "manager@contoso.com",
  "old-assistant@contoso.com",
);
console.log(`Revocation: ${revocation.action}`);
```
