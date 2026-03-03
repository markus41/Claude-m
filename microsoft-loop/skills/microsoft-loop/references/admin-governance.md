# Microsoft Loop — Admin & Governance

## Admin Centers

Loop is managed across three admin surfaces:

| Admin Center | URL | What you manage |
|---|---|---|
| Microsoft 365 admin center | `admin.microsoft.com` | Loop app enablement, guest access, component embedding |
| Teams admin center | `admin.teams.microsoft.com` | Loop app permission policies, app setup policies |
| Microsoft Purview | `purview.microsoft.com` | Sensitivity labels, DLP, retention, eDiscovery |

---

## M365 Admin Center — Loop Settings

Navigate to: **Settings → Org settings → Microsoft Loop**

### Key Settings

| Setting | Default | Description |
|---|---|---|
| Microsoft Loop enabled | On (licensed users) | Toggle Loop availability for your tenant |
| Loop workspaces | On | Allow users to create Loop workspaces |
| Loop components in Teams | On | Allow embedding Loop components in Teams messages |
| Loop components in Outlook | On | Allow embedding Loop components in Outlook email |
| Loop components in OneNote | On | Allow embedding in OneNote |
| External sharing (guests) | Follows SharePoint policy | Whether guests can be added to workspaces |
| Create public workspaces | Off (recommended) | Allow workspaces to be shared with "anyone with link" |

### PowerShell — Read Loop Settings

```powershell
# Connect to SharePoint Online (Loop uses SPO infrastructure)
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Read Loop settings
Get-SPOTenant | Select-Object IsFluidEnabled, IsLoopEnabled, DisablePersonalListCreation
```

### PowerShell — Configure Loop Settings

```powershell
# Disable Loop workspaces (allow components only)
Set-SPOTenant -IsLoopEnabled $false

# Enable Loop with restricted sharing
Set-SPOTenant `
  -IsLoopEnabled $true `
  -SharingCapability ExternalUserSharingOnly  # Restrict to authenticated guests only
```

---

## Teams Admin Center — Loop App Policies

### App Permission Policy

Control which users can use the Loop app in Teams:

1. Teams admin center → **Teams apps → Permission policies**
2. Create or edit a policy → search "Microsoft Loop"
3. Set to `Allow` (all users), `Block` (no users), or `Allowed for specific users`

**PowerShell:**
```powershell
Connect-MicrosoftTeams

# Block Loop app for all users
$appId = "0d820ecd-def2-4297-adad-78056cde7c78"  # Loop Teams app ID

New-CsTeamsAppPermissionPolicy -Identity "BlockLoop" `
  -DefaultCatalogApps @(New-Object -TypeName "Microsoft.Teams.Policy.Administration.Cmdlets.Core.DefaultCatalogApp" -Property @{Id=$appId; Permission="Block"})

# Assign policy to users
Grant-CsTeamsAppPermissionPolicy -PolicyName "BlockLoop" -Identity "user@contoso.com"
```

### App Setup Policy

Pin the Loop app to the Teams sidebar for all users:
```powershell
# Add Loop to pinned apps for all users
$policy = Get-CsTeamsAppSetupPolicy -Identity "Global"
$pinnedApps = $policy.PinnedAppBarApps
$pinnedApps += New-Object `
  -TypeName "Microsoft.Teams.Policy.Administration.Cmdlets.Core.PinnedApp" `
  -Property @{Id="0d820ecd-def2-4297-adad-78056cde7c78"}

Set-CsTeamsAppSetupPolicy -Identity "Global" -PinnedAppBarApps $pinnedApps
```

---

## Microsoft Purview — Loop Compliance

### Sensitivity Labels

Apply sensitivity labels to Loop workspaces to enforce encryption and access restrictions.

**Create a label for Loop content:**
1. Purview → **Information Protection → Sensitivity labels**
2. Create label → scope: **Groups & sites** (workspaces inherit site labels)
3. Configure encryption (optional), access restrictions
4. Publish label to users who create Loop workspaces

**PowerShell:**
```powershell
Connect-IPPSSession

# Get existing labels
Get-Label | Select-Object DisplayName, Priority, LabelActions

# Create a new label for Loop confidential workspaces
New-Label `
  -DisplayName "Loop - Confidential" `
  -Name "LoopConfidential" `
  -Tooltip "Confidential Loop workspace — internal use only" `
  -EncryptionEnabled $false `
  -SiteAndGroupProtectionEnabled $true `
  -SiteAndGroupProtectionPrivacy "Private" `
  -SiteAndGroupProtectionAllowEmailFromGuestUsers $false
```

### DLP Policies for Loop

Protect sensitive data in Loop pages and components.

**Create DLP policy covering Loop workspaces:**
1. Purview → **Data Loss Prevention → Policies → Create policy**
2. Template: Custom (or start from financial/healthcare template)
3. Locations: Include **SharePoint sites** (Loop workspaces are backed by SPO)
4. Rules: define sensitive info types (credit card, SSN, etc.)
5. Actions: Block sharing externally / notify user / require justification

**PowerShell:**
```powershell
# DLP policy covering SharePoint (which includes Loop)
New-DlpCompliancePolicy `
  -Name "Loop-Protect-PII" `
  -SharePointLocation All `
  -Mode Enable

New-DlpComplianceRule `
  -Name "Loop-Block-PII-External-Share" `
  -Policy "Loop-Protect-PII" `
  -ContentContainsSensitiveInformation @{
    Name="Credit Card Number"
    minCount=1
  } `
  -BlockAccess $true `
  -NotifyUser Owner
```

### Retention Policies

Configure how long Loop workspace content is retained:

1. Purview → **Data lifecycle management → Retention policies**
2. Locations: **SharePoint sites** (includes Loop) or **All SharePoint sites**
3. Retention period: e.g., 7 years (for financial compliance)
4. Disposition: Delete after retention period or keep indefinitely

**PowerShell:**
```powershell
# Retain Loop content for 7 years, then delete
New-RetentionCompliancePolicy `
  -Name "Loop-7Year-Retention" `
  -SharePointLocation All

New-RetentionComplianceRule `
  -Name "Loop-7Year-Rule" `
  -Policy "Loop-7Year-Retention" `
  -RetentionDuration 2555 `
  -RetentionComplianceAction KeepAndDelete
```

---

## eDiscovery — Loop Content

Loop workspaces are discoverable via Microsoft Purview eDiscovery (Premium).

**Search for Loop content:**
1. Purview → **eDiscovery → Cases → Create case**
2. Add search → Locations: SharePoint sites → select Loop workspace URLs
3. Keywords: search within `.loop` file content (indexed by Microsoft Search)

**Identify workspace URLs for eDiscovery:**
```powershell
# Get all Loop workspace SPO site URLs
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"
Get-SPOSite -Template "FLUID#0" | Select-Object Url, Title, Owner
```

Loop workspace sites use the `FLUID#0` template — this is the SPO template ID for Loop workspaces.

---

## Audit Logging

Loop activities are captured in the Unified Audit Log (UAL).

### Enable Audit Log (if not enabled)

```powershell
Connect-ExchangeOnline
Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true
```

### Search Loop Audit Events

```powershell
Connect-IPPSSession

$startDate = (Get-Date).AddDays(-30)
$endDate = Get-Date

# Search for Loop workspace creation events
$auditEvents = Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -Operations "LoopWorkspaceCreated","LoopWorkspaceDeleted","LoopComponentCreated","LoopComponentShared" `
  -ResultSize 500

$auditEvents | Select-Object CreationDate, UserIds, Operations, AuditData | Export-Csv "loop-audit.csv"
```

### Loop Audit Operations Reference

| Operation | Trigger |
|---|---|
| `LoopWorkspaceCreated` | User creates a new Loop workspace |
| `LoopWorkspaceDeleted` | User deletes a Loop workspace |
| `LoopPageCreated` | User creates a new page in a workspace |
| `LoopPageDeleted` | User deletes a page |
| `LoopComponentCreated` | User creates a Loop component |
| `LoopComponentShared` | User shares a component link |
| `LoopComponentModified` | User edits a component |
| `LoopMemberAdded` | User added to a workspace |
| `LoopMemberRemoved` | User removed from a workspace |
| `LoopWorkspaceSharedExternally` | Workspace shared with external user |

---

## Licensing

| Feature | Required License |
|---|---|
| Loop app (workspaces + pages) | Microsoft 365 Business Standard/Premium, E3, E5, F3 |
| Loop components in Teams | Microsoft 365 E1 and above (or Teams Essentials) |
| Loop components in Outlook | Exchange Online Plan 2 (or M365 E3+) |
| Loop admin settings | Global Admin or SharePoint Admin role |
| Loop eDiscovery | Microsoft Purview eDiscovery (Premium) license |

**License check via Graph:**
```http
GET https://graph.microsoft.com/v1.0/subscribedSkus
    ?$select=skuPartNumber,prepaidUnits,consumedUnits
```

Look for SKU part numbers: `SPE_E3` (M365 E3), `SPE_E5` (M365 E5), `O365_BUSINESS_PREMIUM` (Business Premium).

---

## Usage Reports

No dedicated Loop usage report in M365 admin center as of Q1 2026. Proxy metrics:

### SharePoint Usage (includes Loop)

```http
GET https://graph.microsoft.com/v1.0/reports/getSharePointActivityUserDetail(period='D30')
```

Returns per-user SharePoint activity including files viewed/modified — Loop workspace files count as SharePoint activity.

### OneDrive Usage (Loop Components)

```http
GET https://graph.microsoft.com/v1.0/reports/getOneDriveActivityUserDetail(period='D30')
```

Loop components (`.fluid` files) stored in OneDrive appear in OneDrive activity.

### Workspace Inventory Report (Custom)

```powershell
# Generate inventory of all Loop workspaces in tenant
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

$loopSites = Get-SPOSite -Template "FLUID#0" -Limit All |
  Select-Object Url, Title, Owner, StorageUsageCurrent, LastContentModifiedDate

$loopSites | Export-Csv "loop-workspace-inventory.csv" -NoTypeInformation
Write-Host "Found $($loopSites.Count) Loop workspaces"
```

---

## Governance Checklist

Use this checklist for Loop governance review:

```markdown
## Loop Governance Review — {date}
**Tenant:** {name}

### Configuration
- [ ] Loop enabled only for licensed users (not all users)
- [ ] External sharing: ExternalUserSharingOnly (not Anyone)
- [ ] Loop in Teams: verified app permission policy applied
- [ ] Loop in Outlook: verified setting matches org policy

### Compliance
- [ ] Sensitivity label policy covers Loop workspaces (SharePoint location)
- [ ] DLP policy covers SharePoint (includes Loop) for PII/sensitive data
- [ ] Retention policy configured for Loop content (SharePoint location)
- [ ] Audit logging enabled (UnifiedAuditLogIngestionEnabled = True)

### Hygiene
- [ ] Orphaned workspaces identified (owner left org) — count: ___
- [ ] Workspaces inactive >90 days — count: ___
- [ ] Workspaces with external sharing enabled — count: ___
- [ ] Components shared via "Anyone with link" — count: ___

### Recommended Actions
1. {action} — {priority}
```

---

## Production Gotchas

- **Loop uses SPO `FLUID#0` template** — when writing SPO admin scripts, filter by this template
  to target only Loop workspaces. Without filtering, you'll process all SPO sites.
- **Loop admin settings require SPO Admin role** — Global Admin or SharePoint Admin required
  for PowerShell changes; regular user admin roles are insufficient.
- **Sensitivity labels require SPO site scope** — label must have "Groups & sites" scope enabled
  for it to apply to Loop workspaces. Labels scoped only to files won't apply at workspace level.
- **DLP only inspects crawled content** — Loop pages are indexed by Microsoft Search. DLP enforcement
  may lag 15-60 minutes after content is written. For real-time enforcement, use Conditional Access.
- **eDiscovery hold on Loop** — placing an eDiscovery hold on a Loop workspace prevents deletion
  even after the 30-day deactivation grace period. Monitor active holds before bulk cleanup.
- **Guest access is governed by SPO policy** — Loop workspace guest access inherits the SharePoint
  `SharingCapability` tenant setting. Changing the M365 admin center Loop toggle doesn't override SPO.
