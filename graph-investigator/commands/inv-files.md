---
name: inv-files
description: SharePoint and OneDrive file access investigation — accessed, downloaded, shared, deleted files; external sharing detection
argument-hint: "<upn> [--days <number>] [--site <site-url>] [--operation <accessed|downloaded|shared|deleted|all>] [--external-only]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — File Access Investigation

Investigates SharePoint and OneDrive file activity for a user: recently accessed and modified files, files shared with the user, external sharing events, bulk download detection, and sensitive file pattern analysis.

## Arguments

| Argument | Description |
|---|---|
| `<upn>` | **Required.** User Principal Name to investigate |
| `--days <number>` | Number of days of file activity to analyze (default: 30) |
| `--site <site-url>` | Restrict to a specific SharePoint site URL |
| `--operation <accessed\|downloaded\|shared\|deleted\|all>` | Filter by operation type (default: `all`) |
| `--external-only` | Only surface events involving external recipients or anonymous links |

## Integration Context Check

Required scopes:
- `AuditLog.Read.All` — SharePoint/OneDrive audit events via directoryAudits
- `User.Read.All` — resolve UPN to object ID
- `Sites.Read.All` — OneDrive recent files and shared-with-me

For full file audit coverage (all operations, not just recent files), Exchange Online PowerShell (`Search-UnifiedAuditLog`) is required in addition to the Graph API.

If `Sites.Read.All` is unavailable, skip Steps 1 and 2 and proceed directly to the PowerShell audit path.

## Step 1: Resolve User Object ID

```bash
UPN="<upn>"

USER_ID=$(az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}?\$select=id" \
  --output json | jq -r '.id')
```

## Step 2: Recent Files from OneDrive

Fetch the user's recently accessed files from OneDrive. This endpoint returns files across all drives the user has recently interacted with.

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}/drive/recent?\$select=id,name,size,webUrl,lastModifiedDateTime,createdDateTime,createdBy,lastModifiedBy,parentReference,file,remoteItem" \
  --output json
```

From each result, extract:
- `name` — file name and extension
- `size` — file size in bytes
- `lastModifiedDateTime` — when last modified
- `lastModifiedBy.user.displayName` — who last modified it
- `parentReference.path` — full path within the drive
- `webUrl` — direct URL to the file
- `remoteItem` — if present, this file lives in a different drive (shared from another site or user)

Flag files with sensitive name patterns (see Step 7).

## Step 3: Files Shared With the User

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}/drive/sharedWithMe?\$select=id,name,size,webUrl,lastModifiedDateTime,createdBy,remoteItem" \
  --output json
```

For each `remoteItem`, the `parentReference.siteId` and `driveId` indicate which site shared the file. Cross-reference with expected business sites to identify unusual sharing sources (e.g. external tenants sharing files with this user).

## Step 4: File Activity via PowerShell Audit Log

This is the primary path for comprehensive file operation audit coverage:

```powershell
# Connect to Exchange Online first:
# Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$startDate = (Get-Date).AddDays(-30).ToString("MM/dd/yyyy")
$endDate = (Get-Date).ToString("MM/dd/yyyy")

Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -UserIds "<upn>" `
  -RecordType SharePoint,SharePointFileOperation,SharePointSharingOperation,OneDrive `
  -Operations "FileAccessed","FileModified","FileDeleted","FileDeletedFirstStageRecycleBin","FileDeletedSecondStageRecycleBin","FileDownloaded","FileCopied","FileMoved","FileRenamed","FileRestored","SharingSet","SharingInvitationCreated","SharingInvitationAccepted","AnonymousLinkCreated","AnonymousLinkUpdated","AnonymousLinkUsed","SecureLinkCreated","FilePreviewed" `
  -ResultSize 5000 |
  ConvertTo-Json | Out-File "file-audit.json"
```

Parse the `AuditData` JSON field within each record to extract:
- `ObjectId` — full SharePoint URL of the affected file
- `SourceFileName` — file name
- `SourceRelativeUrl` — relative path within the site
- `SiteUrl` — SharePoint site URL
- `DestinationFileName` / `DestinationRelativeUrl` — for copy/move operations
- `UserAgent` — browser/client used (flag unusual agents: curl, python-requests, PowerShell)

## Step 5: External Sharing Detection

Filter `SharingSet` and `SharingInvitationCreated` events to identify external sharing:

From the parsed `AuditData`:
- `TargetUserOrGroupType` — `Guest`, `External`, or `Member`
- `TargetUserOrGroupName` — email address of the recipient
- `ExternalAccess` — boolean flag

Flag all sharing events where `TargetUserOrGroupType` is `Guest` or `External`, or where the recipient domain does not match the organization's verified domains.

```powershell
# Get organization verified domains for comparison
# az rest --method GET --uri "https://graph.microsoft.com/v1.0/organization?$select=verifiedDomains" --output json
```

Also flag all `AnonymousLinkCreated` events — anyone links have no authentication requirement and represent the highest sharing risk.

## Step 6: Bulk Download Detection

After collecting all `FileDownloaded` events, group by time windows:

For each 60-minute rolling window, count downloads:
- More than 50 downloads in 1 hour: 🔴 HIGH — likely automated exfiltration
- More than 20 downloads in 1 hour: 🟡 MEDIUM — unusual activity
- More than 10 downloads in 1 hour: 🟢 LOW — worth noting

If site is specified with `--site`, count downloads from that site only. Cross-reference with any concurrent sign-in from a new IP or location.

## Step 7: Sensitive File Pattern Detection

For all file names and paths collected, check for patterns that suggest sensitive data:

**Sensitive file extensions** (beyond normal productivity):
- `.bak`, `.sql`, `.db`, `.mdf`, `.ldf` — database files
- `.pem`, `.p12`, `.pfx`, `.key`, `.crt` — certificates and private keys
- `.config`, `.env`, `*.json` with "secret" or "key" in name — configuration with secrets
- `.xlsm`, `.xlsb` — Excel with macros

**Sensitive path keywords** (case-insensitive):
- `finance`, `accounting`, `payroll`, `salary`, `compensation`
- `hr`, `human-resources`, `personnel`, `employee`
- `legal`, `contract`, `nda`, `acquisition`, `merger`
- `confidential`, `secret`, `restricted`, `classified`
- `password`, `credential`, `key-vault`, `api-key`
- `customer`, `client-list`, `pii`, `gdpr`
- `strategic`, `roadmap`, `board`, `exec`

Any file matching these patterns is flagged regardless of the operation type.

## Output Format

```markdown
## File Access Investigation — jsmith@contoso.com

**Period**: Last 30 days | **Operation Filter**: All | **External Only**: No
**Data Sources**: OneDrive recent files (Graph), SharePoint audit (PowerShell UAL)

### Activity Summary
| Operation | Count | Flagged |
|---|---|---|
| FileAccessed | 412 | 0 |
| FileDownloaded | 87 | 1 (bulk) |
| FileModified | 156 | 0 |
| FileCopied | 12 | 2 (sensitive path) |
| FileDeleted | 8 | 0 |
| SharingSet (internal) | 5 | 0 |
| SharingSet (external) | 3 | 3 |
| AnonymousLinkCreated | 1 | 1 |

### External Sharing Events (3) — 🔴 HIGH PRIORITY

| Date | File | Shared With | Type | Site |
|---|---|---|---|---|
| 2024-01-15 14:22 | Q4-Financial-Report.xlsx | external@gmail.com | External (Guest invite) | /Finance |
| 2024-01-14 09:15 | Employee-Salaries-2024.xlsx | partner@vendor.com | External (Guest invite) | /HR |
| 2024-01-13 17:30 | StrategicRoadmap-2025.pptx | (Anyone) | Anonymous link — no auth | /Executive |

⚠️ Anonymous link created for `/Executive/StrategicRoadmap-2025.pptx` on 2024-01-13. No expiry set. Anyone with the link can view this file.

### Bulk Download Detection
🔴 **2024-01-15 02:14–03:02 UTC**: 67 files downloaded from `/Finance/` in 48 minutes.
Breakdown: 67× FileDownloaded | Avg file size: 2.1 MB | Total: ~140 MB
Concurrent sign-in: Berlin, DE (5.6.7.8) — ⚠️ correlates with impossible travel event.

### Sensitive File Access
| File | Path | Operation | Date | Flag |
|---|---|---|---|---|
| Employee-Salaries-2024.xlsx | /HR/Compensation/ | FileCopied → personal OneDrive | 2024-01-15 | 🔴 HR salary data copied |
| Q4-Financial-Report.xlsx | /Finance/Quarterly/ | FileDownloaded | 2024-01-15 | 🔴 Finance data + external share |
| AWS-Prod-Keys.config | /IT/Infrastructure/ | FileAccessed | 2024-01-14 | 🔴 Credential file accessed |

### Recent OneDrive Files (Last 10 Modified)
| File Name | Size | Last Modified | Modified By |
|---|---|---|---|
| Budget-2024-Draft.xlsx | 2.4 MB | 2024-01-15 | jsmith@contoso.com |
| ... | | | |
```
