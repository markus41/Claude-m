# Exchange Message Trace API — Reference

## Overview

This reference covers message trace via Exchange Online PowerShell and the Security &
Compliance REST API — historical trace vs real-time, filtering by sender/recipient/subject/status,
trace detail events, MX lookup, and connector routing diagnostics.

---

## Message Trace Methods

| Method | Tool | Time Range | Max Results | Async |
|--------|------|-----------|-------------|-------|
| `Get-MessageTrace` | Exchange Online PowerShell | Last 10 days | 1,000 per query | No |
| `Start-HistoricalSearch` | Exchange Online PowerShell | 10-90 days | Unlimited (report) | Yes |
| `Get-HistoricalSearch` | Exchange Online PowerShell | — | — | Poll status |
| Message Trace REST API | Security & Compliance API | Last 10 days | 1,000 per request | No |
| Admin Center UI | Exchange Admin Center | Last 10 days | — | No |

---

## PowerShell Cmdlets Reference

### `Get-MessageTrace` Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `-SenderAddress` | string | Filter by sender email | `"sender@external.com"` |
| `-RecipientAddress` | string | Filter by recipient email | `"user@contoso.com"` |
| `-Subject` | string | Filter by subject (partial match) | `"Q2 Budget"` |
| `-Status` | string | Filter by delivery status | `"Failed"`, `"Delivered"`, `"Quarantined"` |
| `-MessageId` | string | Filter by specific Message-ID header | `"<unique-id@domain.com>"` |
| `-StartDate` | DateTime | Start of search window | `(Get-Date).AddDays(-10)` |
| `-EndDate` | DateTime | End of search window | `(Get-Date)` |
| `-FromIP` | string | Filter by sender IP | `"203.0.113.25"` |
| `-ToIP` | string | Filter by destination IP | — |
| `-PageSize` | int | Results per page (max 5000) | `1000` |
| `-Page` | int | Page number for pagination | `1`, `2`, `3` |

### `Get-MessageTraceDetail` Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `-MessageTraceId` | string | From `Get-MessageTrace` output |
| `-RecipientAddress` | string | Required for multi-recipient messages |
| `-StartDate` | DateTime | Same as the original trace |
| `-EndDate` | DateTime | Same as the original trace |

### `Start-HistoricalSearch` Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `-ReportTitle` | string | Name for the report |
| `-ReportType` | string | `"MessageTrace"` or `"MessageTraceDetail"` |
| `-SenderAddress` | string[] | Filter by senders |
| `-RecipientAddress` | string[] | Filter by recipients |
| `-NotifyAddress` | string[] | Email notifications when report is ready |
| `-StartDate` | DateTime | Start (10-90 days ago) |
| `-EndDate` | DateTime | End of search window |
| `-MessageId` | string | Optional specific message |
| `-OriginalClientIP` | string | Optional IP filter |

---

## Code Snippets

### PowerShell — Real-Time Message Trace (Last 10 Days)

```powershell
# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

# Basic trace: messages from external to a specific user
$results = Get-MessageTrace `
    -SenderAddress "partner@external.com" `
    -RecipientAddress "user@contoso.com" `
    -StartDate (Get-Date).AddDays(-7) `
    -EndDate (Get-Date) `
    -PageSize 1000

$results | Select-Object Received, SenderAddress, RecipientAddress, Subject, Status, StatusDetail |
    Sort-Object Received -Descending | Format-Table

# Paginate if more than 1000 results
$page = 1
$allResults = @()
do {
    $batch = Get-MessageTrace `
        -SenderAddress "newsletter@marketing.com" `
        -StartDate (Get-Date).AddDays(-10) `
        -EndDate (Get-Date) `
        -PageSize 1000 -Page $page

    $allResults += $batch
    $page++
    Write-Host "Page $($page-1): $($batch.Count) results (total: $($allResults.Count))"
} while ($batch.Count -eq 1000)

Write-Host "Total results: $($allResults.Count)"
```

### PowerShell — Get Detailed Trace Events for a Specific Message

```powershell
# First, find the message
$trace = Get-MessageTrace `
    -SenderAddress "sender@external.com" `
    -RecipientAddress "ceo@contoso.com" `
    -StartDate (Get-Date).AddDays(-3) `
    -EndDate (Get-Date) | Select-Object -First 1

if (-not $trace) {
    Write-Error "Message not found in trace"
    return
}

Write-Host "Message found: $($trace.Subject) — Status: $($trace.Status)"

# Get detailed delivery events
$details = Get-MessageTraceDetail `
    -MessageTraceId $trace.MessageTraceId `
    -RecipientAddress "ceo@contoso.com" `
    -StartDate (Get-Date).AddDays(-3) `
    -EndDate (Get-Date)

$details | Select-Object Date, Event, Action, Detail | Sort-Object Date | Format-Table -Wrap
```

### PowerShell — Historical Search (10-90 Days)

```powershell
# Start an async historical search
$search = Start-HistoricalSearch `
    -ReportTitle "Missing Email Investigation $(Get-Date -Format 'yyyy-MM-dd')" `
    -ReportType "MessageTrace" `
    -SenderAddress @("sender@partner.com") `
    -RecipientAddress @("finance@contoso.com") `
    -StartDate (Get-Date).AddDays(-30) `
    -EndDate (Get-Date).AddDays(-10) `
    -NotifyAddress @("admin@contoso.com")

Write-Host "Historical search started: $($search.JobId)"
Write-Host "Status: $($search.Status)"

# Poll for completion
$jobId = $search.JobId
do {
    Start-Sleep -Seconds 30
    $status = Get-HistoricalSearch -JobId $jobId
    Write-Host "Status: $($status.Status) — Progress: $($status.PercentComplete)%"
} while ($status.Status -eq "InProgress" -or $status.Status -eq "NotStarted")

if ($status.Status -eq "Done") {
    # Results are emailed to -NotifyAddress and available in the admin center
    Write-Host "Historical search complete. Report: $($status.ReportTitle)"
    Write-Host "Result count: $($status.EstimatedEntries)"
} else {
    Write-Host "Search failed or cancelled: $($status.Status)"
}
```

### PowerShell — Filtered Trace by Status

```powershell
# Find all failed messages in the last 24 hours
$failedMessages = Get-MessageTrace `
    -Status "Failed" `
    -StartDate (Get-Date).AddDays(-1) `
    -EndDate (Get-Date) `
    -PageSize 1000

Write-Host "Failed messages in last 24 hours: $($failedMessages.Count)"
$failedMessages | Select-Object Received, SenderAddress, RecipientAddress, StatusDetail |
    Group-Object StatusDetail |
    Sort-Object Count -Descending |
    Select-Object Name, Count |
    Format-Table

# Find quarantined messages
$quarantined = Get-MessageTrace `
    -Status "Quarantined" `
    -StartDate (Get-Date).AddDays(-7) `
    -EndDate (Get-Date)

Write-Host "Quarantined messages last 7 days: $($quarantined.Count)"
```

### PowerShell — Trace Analysis: Pattern Detection

```powershell
# Analyze message trace results for patterns
function Analyze-MessageTraceResults {
    param (
        [Parameter(Mandatory=$true)]$TraceResults
    )

    $summary = @{
        Total = $TraceResults.Count
        ByStatus = $TraceResults | Group-Object Status | Sort-Object Count -Descending
        ByHour = $TraceResults | Group-Object { [DateTime]$_.Received | Get-Date -Format "yyyy-MM-dd HH:00" } | Sort-Object Name
        TopSenders = $TraceResults | Group-Object SenderAddress | Sort-Object Count -Descending | Select-Object -First 10
        TopRecipients = $TraceResults | Group-Object RecipientAddress | Sort-Object Count -Descending | Select-Object -First 10
    }

    Write-Host "`n=== Message Trace Summary ==="
    Write-Host "Total Messages: $($summary.Total)"

    Write-Host "`nBy Status:"
    $summary.ByStatus | ForEach-Object { Write-Host "  $($_.Name): $($_.Count)" }

    Write-Host "`nTop Senders:"
    $summary.TopSenders | ForEach-Object { Write-Host "  $($_.Name): $($_.Count) messages" }

    return $summary
}

$last24h = Get-MessageTrace -StartDate (Get-Date).AddDays(-1) -EndDate (Get-Date) -PageSize 1000
Analyze-MessageTraceResults -TraceResults $last24h
```

### PowerShell — Trace with MX Verification

```powershell
# When status is "None" (Exchange never received message), check MX
function Test-EmailDeliveryPath {
    param (
        [string]$Domain
    )

    Write-Host "Checking mail flow for domain: $Domain"

    # Check MX record
    $mx = Resolve-DnsName -Name $Domain -Type MX -ErrorAction SilentlyContinue
    if ($mx) {
        Write-Host "MX Records:"
        $mx | Sort-Object Preference | ForEach-Object {
            Write-Host "  Priority $($_.Preference): $($_.NameExchange)"
        }

        # Check if any MX points to Microsoft (Office 365)
        $m365Mx = $mx | Where-Object { $_.NameExchange -match "mail.protection.outlook.com" }
        if ($m365Mx) {
            Write-Host "  [OK] MX record points to Microsoft 365"
        } else {
            Write-Warning "  [WARNING] MX does not point to Microsoft 365 protection"
        }
    } else {
        Write-Error "  [ERROR] No MX records found for $Domain"
    }

    # Check SPF
    $spf = Resolve-DnsName -Name $Domain -Type TXT -ErrorAction SilentlyContinue |
        Where-Object { $_.Strings -match "v=spf1" }

    if ($spf) {
        $spfRecord = $spf.Strings -join ""
        Write-Host "`nSPF: $spfRecord"
        if ($spfRecord -match "include:spf.protection.outlook.com") {
            Write-Host "  [OK] SPF includes M365"
        } else {
            Write-Warning "  [WARNING] SPF may not include M365"
        }
    } else {
        Write-Warning "No SPF record found"
    }
}

Test-EmailDeliveryPath -Domain "contoso.com"
```

---

## Message Trace Status Values Reference

| Status | Meaning | Next Diagnostic Step |
|--------|---------|---------------------|
| `Delivered` | Reached recipient mailbox | Check user's Junk, deleted items, or Outlook rules |
| `Failed` | Delivery failed — permanent | Get `StatusDetail` and `Get-MessageTraceDetail` for NDR code |
| `Pending` | Message in transit, retry queue | Wait and re-trace in 15-30 minutes |
| `Quarantined` | Held by anti-spam or anti-malware | Check `Get-QuarantineMessage` |
| `FilteredAsSpam` | Classified as spam | Check SCL score; add sender to safe senders list |
| `GettingStatus` | Status lookup in progress | Re-query after 2-3 minutes |
| `Expanded` | Delivered to distribution group | Trace individual recipient addresses |
| `Resolved` | Message resolved (alias/forwarding) | Check forwarding rules on the mailbox |
| `None` | No record — Exchange never received it | Check MX records; check sending server logs |

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `CommandNotFound: Get-MessageTrace` | Not connected to Exchange Online | Run `Connect-ExchangeOnline` first |
| `AccessDenied` | Missing Exchange Administrator role | Assign Exchange Admin or Compliance role |
| `InvalidDate` | Date outside supported range | `Get-MessageTrace`: last 10 days only |
| `TooManyResults` | More than 1000 results | Add filters; paginate with `-Page` parameter |
| `HistoricalSearchJobLimit` | Max 250 historical searches per 24h | Wait or cancel old searches |
| `JobAlreadyExists` | Historical search with same title | Use unique `-ReportTitle` per search |
| REST 429 | Rate limit exceeded | Respect `Retry-After` header |
| REST 401 | Expired session | Re-authenticate to Exchange Online |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| `Get-MessageTrace` | 1,000 results per call | Paginate with `-Page`; narrow filters |
| `Get-MessageTrace` window | Last 10 days only | Use `Start-HistoricalSearch` for older data |
| `Start-HistoricalSearch` | 250 searches per 24 hours | Schedule searches; reuse reports |
| Historical search size | No formal limit; large searches take hours | Use narrow filters; check at off-peak times |
| Message detail events | Up to 50 events per message | Events cover all delivery hops |

---

## Common Patterns and Gotchas

### 1. "None" Status Means Exchange Never Received the Message

When `Get-MessageTrace` returns no results (or `Status: None`), Exchange has no record of the
message. This points to an issue upstream of Exchange: MX record misconfiguration, sender
blacklisting, or sending server delivery failure. Start with `nslookup -type=mx` for the domain.

### 2. Paginate When Results Equal the Page Size

If your query returns exactly 1,000 results, there are likely more. Always paginate using
`-Page 2`, `-Page 3`, etc. until a page returns fewer results than the page size.

### 3. `Get-MessageTraceDetail` Requires Both MessageTraceId and RecipientAddress

For messages with multiple recipients, each recipient has separate trace events. You must
specify both `-MessageTraceId` AND `-RecipientAddress` to get the events for a specific
recipient's delivery path.

### 4. Historical Search Results Are Emailed — Not Returned Inline

`Start-HistoricalSearch` sends the report to the `-NotifyAddress` email(s) and makes it
downloadable from the Exchange Admin Center. The PowerShell cmdlet does not return the report
data directly. Check the admin center's "Mail Flow" → "Message Trace" → "Download Results".

### 5. Connector Routing Is Visible in Trace Detail Events

The `Get-MessageTraceDetail` output includes events like `RECEIVE` (from which connector),
`SEND` (to which downstream), and `AGENTINFO` (which transport rules fired). Use this to debug
messages that were unexpectedly routed through a partner connector.

### 6. Timestamps Are UTC

All timestamps in message trace results are in UTC. Convert to local time for user-facing
reports: `[DateTime]::SpecifyKind($_.Received, 'Utc').ToLocalTime()`.
