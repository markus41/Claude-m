# SharePoint Operations Examples

Complete examples for SharePoint Online administration using TypeScript (Graph API, SharePoint REST) and PowerShell (PnP).

## 1. Create a Modern Team Site (SharePoint REST)

```typescript
interface CreateSiteInput {
  title: string;
  url: string;
  description: string;
  owner: string;
  template: "team" | "communication";
  lcid?: number;
  siteDesignId?: string;
}

interface CreateSiteResult {
  success: boolean;
  siteUrl?: string;
  siteId?: string;
  error?: string;
}

async function createModernSite(
  tenantAdminUrl: string,
  accessToken: string,
  input: CreateSiteInput,
): Promise<CreateSiteResult> {
  const templateMap: Record<string, string> = {
    team: "STS#3",
    communication: "SITEPAGEPUBLISHING#0",
  };

  interface SiteManagerRequest {
    Title: string;
    Url: string;
    Lcid: number;
    ShareByEmailEnabled: boolean;
    Description: string;
    WebTemplate: string;
    Owner: string;
    SiteDesignId?: string;
  }

  const requestBody: { request: SiteManagerRequest } = {
    request: {
      Title: input.title,
      Url: input.url,
      Lcid: input.lcid ?? 1033,
      ShareByEmailEnabled: false,
      Description: input.description,
      WebTemplate: templateMap[input.template],
      Owner: input.owner,
    },
  };

  if (input.siteDesignId) {
    requestBody.request.SiteDesignId = input.siteDesignId;
  }

  try {
    const response = await fetch(
      `${tenantAdminUrl}/_api/SPSiteManager/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json;odata=verbose",
          Accept: "application/json;odata=verbose",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    const siteStatus = result.d?.Create?.SiteStatus ?? result.SiteStatus;

    if (siteStatus === 2) {
      // Site created successfully
      return {
        success: true,
        siteUrl: result.d?.Create?.SiteUrl ?? result.SiteUrl,
        siteId: result.d?.Create?.SiteId ?? result.SiteId,
      };
    } else if (siteStatus === 1) {
      // Site creation in progress
      return {
        success: true,
        siteUrl: result.d?.Create?.SiteUrl ?? result.SiteUrl,
        siteId: result.d?.Create?.SiteId ?? result.SiteId,
      };
    } else {
      return {
        success: false,
        error: `Unexpected site status: ${siteStatus}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Usage: Create a team site
const siteResult = await createModernSite(
  "https://contoso-admin.sharepoint.com",
  accessToken,
  {
    title: "Project Alpha",
    url: "https://contoso.sharepoint.com/sites/project-alpha",
    description: "Collaboration site for Project Alpha team",
    owner: "pm@contoso.com",
    template: "team",
  },
);

if (siteResult.success) {
  console.log(`Site created: ${siteResult.siteUrl}`);
}

// Usage: Create a communication site with a site design
const commSite = await createModernSite(
  "https://contoso-admin.sharepoint.com",
  accessToken,
  {
    title: "Company Intranet",
    url: "https://contoso.sharepoint.com/sites/intranet",
    description: "Company-wide intranet and announcements",
    owner: "admin@contoso.com",
    template: "communication",
    siteDesignId: "6142d2a0-63a5-4ba0-aede-d9fefca2c767",
  },
);
```

## 2. List All Sites with Storage Usage

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface SiteStorageInfo {
  siteId: string;
  name: string;
  webUrl: string;
  storageUsed: number;
  storageTotal: number;
  storageUsedFormatted: string;
  storageTotalFormatted: string;
  utilizationPercent: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

async function listSitesWithStorage(graphClient: Client): Promise<string> {
  // Search all sites (empty search returns all)
  let allSites: Array<{ id: string; name: string; webUrl: string }> = [];
  let nextLink: string | null = "/sites?search=&$top=100";

  while (nextLink) {
    const response = await graphClient.api(nextLink).get();
    allSites = allSites.concat(response.value);
    nextLink = response["@odata.nextLink"] ?? null;
  }

  // Fetch storage for each site
  const siteStorage: SiteStorageInfo[] = [];

  for (const site of allSites) {
    try {
      const driveResponse = await graphClient
        .api(`/sites/${site.id}/drive`)
        .select("quota")
        .get();

      const quota = driveResponse.quota;
      if (quota) {
        const used = quota.used ?? 0;
        const total = quota.total ?? 0;
        siteStorage.push({
          siteId: site.id,
          name: site.name,
          webUrl: site.webUrl,
          storageUsed: used,
          storageTotal: total,
          storageUsedFormatted: formatBytes(used),
          storageTotalFormatted: total > 0 ? formatBytes(total) : "Unlimited",
          utilizationPercent: total > 0 ? Math.round((used / total) * 100) : 0,
        });
      }
    } catch {
      // Site may not have a default drive — skip
      siteStorage.push({
        siteId: site.id,
        name: site.name,
        webUrl: site.webUrl,
        storageUsed: 0,
        storageTotal: 0,
        storageUsedFormatted: "N/A",
        storageTotalFormatted: "N/A",
        utilizationPercent: 0,
      });
    }
  }

  // Sort by storage used descending
  siteStorage.sort((a, b) => b.storageUsed - a.storageUsed);

  // Build report
  const totalUsed = siteStorage.reduce((sum, s) => sum + s.storageUsed, 0);
  const report: string[] = [];
  report.push("# SharePoint Storage Report");
  report.push("");
  report.push(`**Timestamp**: ${new Date().toISOString()}`);
  report.push(`**Total sites**: ${siteStorage.length}`);
  report.push(`**Total storage used**: ${formatBytes(totalUsed)}`);
  report.push("");
  report.push("| Site | URL | Used | Total | Utilization |");
  report.push("|------|-----|------|-------|-------------|");

  for (const s of siteStorage) {
    const flag = s.utilizationPercent >= 90 ? " !!!" : s.utilizationPercent >= 75 ? " !" : "";
    report.push(
      `| ${s.name} | ${s.webUrl} | ${s.storageUsedFormatted} | ${s.storageTotalFormatted} | ${s.utilizationPercent}%${flag} |`
    );
  }

  // Top consumers
  const top5 = siteStorage.slice(0, 5);
  if (top5.length > 0) {
    report.push("");
    report.push("## Top 5 Storage Consumers");
    report.push("");
    for (let i = 0; i < top5.length; i++) {
      report.push(`${i + 1}. **${top5[i].name}** — ${top5[i].storageUsedFormatted} (${top5[i].webUrl})`);
    }
  }

  // High utilization warnings
  const highUtil = siteStorage.filter(s => s.utilizationPercent >= 80 && s.storageTotal > 0);
  if (highUtil.length > 0) {
    report.push("");
    report.push("## High Utilization Warnings");
    report.push("");
    for (const s of highUtil) {
      report.push(`- **${s.name}**: ${s.utilizationPercent}% — consider increasing quota or archiving content`);
    }
  }

  return report.join("\n");
}

// Usage
const storageReport = await listSitesWithStorage(graphClient);
console.log(storageReport);
```

## 3. Permission Audit: List All External Sharing (PnP PowerShell)

```powershell
#Requires -Modules PnP.PowerShell

<#
.SYNOPSIS
    Audits external sharing across all SharePoint sites in the tenant.
    Produces a markdown report of all externally shared items.
.PARAMETER AdminUrl
    SharePoint admin center URL (e.g., https://contoso-admin.sharepoint.com).
.PARAMETER OutputPath
    Path to save the markdown report.
.EXAMPLE
    .\Audit-ExternalSharing.ps1 -AdminUrl "https://contoso-admin.sharepoint.com" -OutputPath ".\sharing-audit.md"
#>
param(
    [Parameter(Mandatory)]
    [string]$AdminUrl,

    [string]$OutputPath = ".\sharing-audit-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"
)

# Connect to admin center
Connect-PnPOnline -Url $AdminUrl -Interactive

# Get all site collections
$sites = Get-PnPTenantSite | Where-Object {
    $_.Template -ne "SRCHCEN#0" -and
    $_.Template -ne "SPSMSITEHOST#0" -and
    $_.Template -ne "APPCATALOG#0" -and
    $_.Template -ne "RedirectSite#0"
}

$report = @()
$report += "# External Sharing Audit Report"
$report += ""
$report += "**Timestamp**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')"
$report += "**Sites scanned**: $($sites.Count)"
$report += ""

$externalItems = @()
$siteCount = 0

foreach ($site in $sites) {
    $siteCount++
    Write-Progress -Activity "Scanning sites" -Status "$($site.Url)" -PercentComplete (($siteCount / $sites.Count) * 100)

    # Check site sharing capability
    $sharingLevel = $site.SharingCapability.ToString()

    if ($sharingLevel -eq "Disabled") {
        continue  # No external sharing possible
    }

    try {
        # Connect to the individual site
        Connect-PnPOnline -Url $site.Url -Interactive

        # Get external users
        $externalUsers = Get-PnPExternalUser -SiteUrl $site.Url -PageSize 50 -ErrorAction SilentlyContinue

        foreach ($extUser in $externalUsers) {
            $externalItems += [PSCustomObject]@{
                SiteUrl      = $site.Url
                SiteTitle    = $site.Title
                ExternalUser = $extUser.Email
                DisplayName  = $extUser.DisplayName
                AcceptedAs   = $extUser.AcceptedAs
                WhenCreated  = $extUser.WhenCreated
                InvitedBy    = $extUser.InvitedBy
            }
        }

        # Check for anonymous sharing links on key document libraries
        $lists = Get-PnPList | Where-Object { $_.BaseTemplate -eq 101 }  # Document libraries

        foreach ($list in $lists) {
            $items = Get-PnPListItem -List $list -PageSize 500 | Where-Object { $_.HasUniqueRoleAssignments }

            foreach ($item in $items) {
                $sharingLinks = Get-PnPFileSharingLink -Identity $item["FileRef"] -ErrorAction SilentlyContinue

                foreach ($link in $sharingLinks) {
                    if ($link.Scope -eq "anonymous" -or $link.Scope -eq "organization") {
                        $externalItems += [PSCustomObject]@{
                            SiteUrl      = $site.Url
                            SiteTitle    = $site.Title
                            ExternalUser = "Anonymous Link"
                            DisplayName  = $item["FileLeafRef"]
                            AcceptedAs   = $link.Scope
                            WhenCreated  = $link.CreatedDateTime
                            InvitedBy    = $link.CreatedBy
                        }
                    }
                }
            }
        }
    } catch {
        Write-Warning "Error scanning $($site.Url): $($_.Exception.Message)"
    }
}

# Build report tables
$report += "## Site Sharing Policies"
$report += ""
$report += "| Site | URL | Sharing Level |"
$report += "|------|-----|---------------|"

foreach ($site in $sites) {
    $report += "| $($site.Title) | $($site.Url) | $($site.SharingCapability) |"
}

$report += ""
$report += "## External Sharing Details"
$report += ""

if ($externalItems.Count -eq 0) {
    $report += "No external sharing found."
} else {
    $report += "| Site | External User / Link | Type | Created | Invited By |"
    $report += "|------|----------------------|------|---------|------------|"

    foreach ($item in $externalItems) {
        $report += "| $($item.SiteTitle) | $($item.ExternalUser) | $($item.AcceptedAs) | $($item.WhenCreated) | $($item.InvitedBy) |"
    }

    $report += ""
    $report += "## Summary"
    $report += ""
    $report += "- **Total external shares**: $($externalItems.Count)"
    $report += "- **Unique external users**: $(($externalItems | Where-Object { $_.ExternalUser -ne 'Anonymous Link' } | Select-Object -Unique ExternalUser).Count)"
    $report += "- **Anonymous links**: $(($externalItems | Where-Object { $_.ExternalUser -eq 'Anonymous Link' }).Count)"
    $report += "- **Sites with external sharing**: $(($externalItems | Select-Object -Unique SiteUrl).Count)"
}

# Write report
$report -join "`n" | Out-File -FilePath $OutputPath -Encoding utf8
Write-Host "Report saved to: $OutputPath" -ForegroundColor Green

Disconnect-PnPOnline
```

## 4. Hub Site Association and Management (PnP PowerShell)

```powershell
#Requires -Modules PnP.PowerShell

<#
.SYNOPSIS
    Manages hub site creation, configuration, and site associations.
.PARAMETER Action
    Action to perform: CreateHub, AssociateSites, ListHub, RemoveHub
.PARAMETER HubSiteUrl
    URL of the hub site.
.PARAMETER SiteUrls
    Array of site URLs to associate with the hub.
.PARAMETER AdminUrl
    SharePoint admin center URL.
.EXAMPLE
    .\Manage-HubSite.ps1 -Action CreateHub -HubSiteUrl "https://contoso.sharepoint.com/sites/engineering-hub" -AdminUrl "https://contoso-admin.sharepoint.com"
.EXAMPLE
    .\Manage-HubSite.ps1 -Action AssociateSites -HubSiteUrl "https://contoso.sharepoint.com/sites/engineering-hub" -SiteUrls @("https://contoso.sharepoint.com/sites/team-alpha", "https://contoso.sharepoint.com/sites/team-beta")
#>
param(
    [Parameter(Mandatory)]
    [ValidateSet("CreateHub", "AssociateSites", "ListHub", "RemoveHub")]
    [string]$Action,

    [Parameter(Mandatory)]
    [string]$HubSiteUrl,

    [string]$AdminUrl,
    [string[]]$SiteUrls = @(),
    [string]$HubTitle,
    [string]$HubDescription,
    [string]$LogoUrl
)

# Connect to admin center
$connectUrl = if ($AdminUrl) { $AdminUrl } else { $HubSiteUrl }
Connect-PnPOnline -Url $connectUrl -Interactive

$report = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"

switch ($Action) {
    "CreateHub" {
        $report += "# Hub Site Creation Report"
        $report += ""
        $report += "**Timestamp**: $timestamp"
        $report += "**Hub URL**: $HubSiteUrl"
        $report += ""

        try {
            # Register site as hub
            Register-PnPHubSite -Site $HubSiteUrl
            $report += "- [x] Hub site registered"

            # Set hub properties
            $setParams = @{ Identity = $HubSiteUrl }
            if ($HubTitle) { $setParams.Title = $HubTitle }
            if ($HubDescription) { $setParams.Description = $HubDescription }
            if ($LogoUrl) { $setParams.LogoUrl = $LogoUrl }

            if ($setParams.Keys.Count -gt 1) {
                Set-PnPHubSite @setParams
                $report += "- [x] Hub properties configured (Title: $HubTitle)"
            }

            $report += ""
            $report += "Hub site created successfully."
        } catch {
            $report += "- [ ] FAILED: $($_.Exception.Message)"
        }
    }

    "AssociateSites" {
        $report += "# Hub Site Association Report"
        $report += ""
        $report += "**Timestamp**: $timestamp"
        $report += "**Hub**: $HubSiteUrl"
        $report += "**Sites to associate**: $($SiteUrls.Count)"
        $report += ""
        $report += "| Site URL | Status | Detail |"
        $report += "|----------|--------|--------|"

        foreach ($siteUrl in $SiteUrls) {
            try {
                Add-PnPHubSiteAssociation -Site $siteUrl -HubSite $HubSiteUrl
                $report += "| $siteUrl | ASSOCIATED | Successfully linked to hub |"
            } catch {
                $report += "| $siteUrl | FAILED | $($_.Exception.Message) |"
            }
        }

        $succeeded = ($report | Select-String "ASSOCIATED").Count
        $failed = ($report | Select-String "FAILED").Count
        $report += ""
        $report += "**Associated**: $succeeded | **Failed**: $failed"
    }

    "ListHub" {
        $report += "# Hub Site Details"
        $report += ""
        $report += "**Timestamp**: $timestamp"
        $report += ""

        try {
            $hub = Get-PnPHubSite -Identity $HubSiteUrl

            $report += "## Hub Information"
            $report += ""
            $report += "| Property | Value |"
            $report += "|----------|-------|"
            $report += "| Title | $($hub.Title) |"
            $report += "| URL | $($hub.SiteUrl) |"
            $report += "| Description | $($hub.Description) |"
            $report += "| ID | $($hub.ID) |"
            $report += ""

            # List associated sites
            $allSites = Get-PnPTenantSite | Where-Object { $_.HubSiteId -eq $hub.ID }

            $report += "## Associated Sites ($($allSites.Count))"
            $report += ""
            if ($allSites.Count -gt 0) {
                $report += "| Site | URL | Template | Storage Used |"
                $report += "|------|-----|----------|--------------|"
                foreach ($site in $allSites) {
                    $report += "| $($site.Title) | $($site.Url) | $($site.Template) | $($site.StorageUsageCurrent) MB |"
                }
            } else {
                $report += "No sites associated with this hub."
            }
        } catch {
            $report += "Error: $($_.Exception.Message)"
        }
    }

    "RemoveHub" {
        $report += "# Hub Site Removal Report"
        $report += ""
        $report += "**Timestamp**: $timestamp"
        $report += "**Hub**: $HubSiteUrl"
        $report += ""

        try {
            # First, disassociate all sites
            $hub = Get-PnPHubSite -Identity $HubSiteUrl
            $associatedSites = Get-PnPTenantSite | Where-Object { $_.HubSiteId -eq $hub.ID -and $_.Url -ne $HubSiteUrl }

            if ($associatedSites.Count -gt 0) {
                $report += "## Disassociating Sites"
                $report += ""
                foreach ($site in $associatedSites) {
                    try {
                        Remove-PnPHubSiteAssociation -Site $site.Url
                        $report += "- [x] Disassociated: $($site.Url)"
                    } catch {
                        $report += "- [ ] Failed to disassociate: $($site.Url) — $($_.Exception.Message)"
                    }
                }
                $report += ""
            }

            # Unregister the hub
            Unregister-PnPHubSite -Site $HubSiteUrl
            $report += "- [x] Hub site unregistered"
            $report += ""
            $report += "Hub site removed. The site collection itself remains intact."
        } catch {
            $report += "- [ ] FAILED: $($_.Exception.Message)"
        }
    }
}

# Output report
Write-Host ($report -join "`n")

Disconnect-PnPOnline
```
