# NDR Codes — Reference

## Overview

This reference covers SMTP 4xx temporary failure codes, 5xx permanent failure codes,
Microsoft-specific enhanced status codes (550 5.7.x series), on-premises Exchange vs
Exchange Online error differences, and per-category remediation steps for common
Non-Delivery Reports (NDRs).

---

## NDR Structure

An NDR (Non-Delivery Report) contains three parts:

| Part | Example | Description |
|------|---------|-------------|
| Basic status code | `550` | Three-digit SMTP reply code (4xx = temporary, 5xx = permanent) |
| Enhanced status code | `5.7.1` | `class.subject.detail` format per RFC 3463 |
| Diagnostic code | `smtp;550 5.7.1 ...` | Free-text explanation from the rejecting server |

The **enhanced status code** is the most useful for diagnosis. Format: `X.Y.Z`
- `X` = `4` (transient) or `5` (permanent)
- `Y` = subject (0=other, 1=addressing, 2=mailbox, 3=mail system, 4=network/routing, 5=protocol, 6=content/message, 7=security)
- `Z` = detail code

---

## 4xx Temporary Failure Codes

Temporary failures (4xx) mean the sending server should retry. Exchange Online retries
for up to **48 hours** before generating an NDR.

| Code | Enhanced | Meaning | Common Cause | Remediation |
|------|----------|---------|--------------|-------------|
| `421` | `4.3.1` | Service not available — closing channel | Destination server temporarily overloaded | Wait and retry; destination server issue |
| `421` | `4.3.2` | System not accepting network messages | Destination server in maintenance | Retry after 30 minutes |
| `421` | `4.7.0` | TLS not available | TLS handshake failed on connection | Check TLS cert validity on connector; try `EncryptionOnly` mode |
| `421` | `4.7.26` | IPv6 not supported over this connection | Destination MX does not support IPv6 | Exchange Online will retry over IPv4 automatically |
| `450` | `4.2.2` | Mailbox quota exceeded | Recipient mailbox is full | Ask recipient to clear mailbox; increase quota |
| `451` | `4.1.0` | Sender address ambiguous | Multiple matching sender records | Verify sender address uniqueness in directory |
| `451` | `4.4.2` | Connection dropped | Network interruption during transmission | Retry; check network path between mail servers |
| `451` | `4.7.1` | Greylisting — try again | First contact from new sending IP | Retry after 5-10 minutes; greylisting typically expires |
| `452` | `4.2.2` | Insufficient system storage | Server disk full | Server-side storage issue; contact destination mail admin |
| `452` | `4.3.1` | Insufficient system resources | Server under memory/CPU pressure | Retry; escalate to destination server admin |
| `454` | `4.7.0` | TLS not available due to temporary problem | TLS certificate expired or renewal in progress | Wait for certificate renewal; check cert expiry date |

---

## 5xx Permanent Failure Codes

Permanent failures (5xx) mean delivery will not be retried. The sending server sends an NDR
immediately (or after retry period expires for 4xx upgraded to 5xx).

### 5.1.x — Addressing Failures

| Code | Enhanced | Meaning | On-Premises Difference | Remediation |
|------|----------|---------|----------------------|-------------|
| `550` | `5.1.1` | Bad destination mailbox address | Recipient not in GAL | Verify recipient address; check for mailbox deletion or rename |
| `550` | `5.1.2` | Bad destination mailbox address — unresolvable | SMTP domain has no MX record | Verify MX record exists for recipient domain |
| `550` | `5.1.3` | Invalid character in email address | Malformed address in `To:` field | Fix address format (no spaces, valid characters only) |
| `550` | `5.1.4` | Destination mailbox address ambiguous | Multiple matching mailboxes | Disambiguate recipient; check for address conflicts |
| `550` | `5.1.6` | Recipient has moved | Mailbox moved without forwarding | Contact recipient; update address book entry |
| `550` | `5.1.7` | Invalid address | Sender address not valid | Ensure `MAIL FROM:` address is a valid SMTP address |
| `550` | `5.1.8` | Access denied — bad outbound sender | Sender blocked by outbound spam policy | Check outbound spam filter; may be compromised account |
| `550` | `5.1.9` | Communication protocol violation | SMTP conversation error | Check sending server compliance with RFC 5321 |
| `550` | `5.1.10` | Recipient not found (RCPT validation) | Recipient not found during RCPT TO | Most common NDR; verify address spelling; check for mailbox disable |

### 5.2.x — Mailbox Failures

| Code | Enhanced | Meaning | Remediation |
|------|----------|---------|-------------|
| `552` | `5.2.2` | Mailbox full — over quota | Increase mailbox quota or ask user to clean up |
| `552` | `5.2.3` | Message size exceeds limit | Reduce attachment size; check connector size limits |
| `552` | `5.2.4` | Mailing list expansion failed | Distribution group issue; check group membership resolution |
| `553` | `5.2.0` | Other or undefined mailbox status | Catch-all mailbox error; check Exchange event logs |
| `550` | `5.2.14` | Message rejected as spam by Microsoft | Sending domain or IP is in a deny list | Check Microsoft JMRP; remediate IP reputation |

### 5.3.x — Mail System Failures

| Code | Enhanced | Meaning | Remediation |
|------|----------|---------|-------------|
| `451` | `5.3.0` | Other or undefined mail system status | Generic error; check diagnostic text | See error details |
| `550` | `5.3.2` | System not accepting network messages | Receiving server not processing mail | Contact destination mail admin |
| `550` | `5.3.4` | Message too big for system | Message exceeds system limit | Reduce message size; use file sharing links instead of attachments |
| `550` | `5.3.5` | System incorrectly configured | Mail routing misconfiguration | Check accepted domains and mail flow connectors |

### 5.4.x — Network and Routing Failures

| Code | Enhanced | Meaning | On-Premises Difference | Remediation |
|------|----------|---------|----------------------|-------------|
| `550` | `5.4.1` | Relay access denied | Destination server doesn't accept relay | Check accepted domains; verify connector configuration |
| `550` | `5.4.4` | Invalid argument — invalid address | MX record invalid or missing | Check MX record for recipient domain |
| `550` | `5.4.6` | Routing loop detected | Mail routing creating a loop | Check transport rules, forwarding settings, journal rules |
| `550` | `5.4.310` | DNS lookup failure | MX record unresolvable | Check DNS health; verify MX record TTL and value |
| `550` | `5.4.312` | DNS query failed | Network/DNS issue from EOP | Transient DNS failure; EOP will retry |
| `550` | `5.4.316` | Message rejected after DNS failure | Persistent DNS lookup failure | Verify MX/A records are published and resolving globally |
| `421` | `4.4.1` | Connection timeout | Remote server unreachable | Check firewall rules; verify remote server is accepting port 25 |

### 5.7.x — Security and Policy Failures (Most Common)

| Code | Enhanced | Meaning | On-Premises Difference | Remediation |
|------|----------|---------|----------------------|-------------|
| `550` | `5.7.1` | Delivery not authorized | Transport rule blocked delivery | Check transport rules; verify sender permissions for recipient |
| `550` | `5.7.1` | Relay not permitted | Not EXO-specific; on-prem relay denial | Configure accepted domains; check receive connector settings |
| `550` | `5.7.8` | Authentication required | Sending server must authenticate | Enable SMTP AUTH; check connector TLS settings |
| `550` | `5.7.23` | SPF or DMARC rejected | Message failed DMARC policy | Fix SPF/DKIM alignment; check DMARC policy at destination |
| `550` | `5.7.25` | IPv6 sender must have reverse DNS | PTR record missing for IPv6 sending IP | Add PTR record for IPv6 address |
| `550` | `5.7.26` | Unauthenticated email denied | Tenant blocks unauthenticated inbound | Configure an inbound connector for the sending domain |
| `550` | `5.7.57` | Client was not authenticated | SMTP AUTH disabled or not configured | Enable SMTP AUTH for the mailbox; use modern auth flow |
| `550` | `5.7.64` | TenantInboundAttribution | Message attributed to wrong tenant | Check hybrid connector configuration |
| `550` | `5.7.133` | Recipient restricted — group policy | Distribution group requires sender auth | Add sender to group membership or allowed senders list |
| `550` | `5.7.134` | Recipient restricted — user policy | Recipient's mailbox allows only specific senders | Add sender to recipient's safe senders / allowed senders |
| `550` | `5.7.136` | Recipient restricted — allow list | Tenant or recipient safe-sender policy | Admin: check anti-spam policy allowed senders |
| `550` | `5.7.501` | Access denied — spam abuse detected | Sending IP on Microsoft's blocklist | Submit to JMRP at https://sender.office.com |
| `550` | `5.7.503` | Access denied — spam abuse detected | Sending tenant flagged for abuse | Submit remediation request at https://support.microsoft.com |
| `550` | `5.7.504` | Recipient email address rejected | Sending to a blocked address | Verify recipient address is valid and not suppressed |
| `550` | `5.7.505` | Access denied — spam detected | Message classified as spam | Improve sending reputation; authenticate with SPF/DKIM/DMARC |
| `550` | `5.7.506` | Bad HELO — connecting IP/domain mismatch | HELO hostname doesn't match sending IP | Correct HELO hostname on sending mail server |
| `550` | `5.7.507` | Attachment blocked | Attachment type blocked by policy | Use a file sharing link instead; check EOP attachment filter |
| `550` | `5.7.508` | Too many recipients — rate limit | Exceeded recipient rate limit | Reduce recipients per message; throttle bulk sending |
| `550` | `5.7.509` | Access denied — sending domain not verified | Domain has no SPF or DMARC | Publish SPF and DMARC records for sending domain |
| `550` | `5.7.510` | Access denied | General delivery block | Check Microsoft SNDS; check IP/domain reputation |
| `550` | `5.7.511` | Access denied — banned sender | Sender on Microsoft outbound block list | Contact Microsoft support; investigate for compromise |
| `550` | `5.7.512` | Authentication required | Must authenticate to relay | Enable proper authentication |
| `550` | `5.7.606` | Access denied — banned sending IP | IP banned for spam/abuse | Delist at https://sender.office.com/unblocksubmission |
| `550` | `5.7.708` | Access denied — policy | Tenant-level outbound policy block | Check outbound spam policy; investigate account compromise |
| `550` | `5.7.750` | Client blocked — forwarding to external | External forwarding blocked by admin | Transport rule blocking external auto-forward (expected behavior) |

---

## Exchange Online vs On-Premises NDR Differences

| Scenario | Exchange Online | On-Premises Exchange |
|----------|----------------|---------------------|
| Recipient not found | `5.1.10` with "Recipient address rejected" | `5.1.1` — SMTP `RCPT TO` rejection |
| Relay denied | `5.4.1` with connector hint | `5.7.1` "Unable to relay" |
| TLS required | `4.7.0` / `5.7.0` from EOP | `4.7.1` from Hub Transport |
| Sender IP blocked | `5.7.501` / `5.7.606` (Microsoft DBEB) | Custom SCL or connection filter |
| Mailbox over quota | `5.2.2` with storage detail | `5.2.2` — may vary by version |
| Archive mailbox full | Separate `5.2.2` with archive identifier | Only on Exchange Server 2013+ |
| Transport rule reject | `5.7.1` with custom message | `5.7.1` with rule-specified message |
| DMARC fail | `5.7.23` specific | `5.7.1` or custom rejection |
| Client SMTP AUTH | `5.7.57` | `5.7.57` or `530 5.7.0 Must issue STARTTLS` |

---

## Code Snippets

### PowerShell — Diagnose NDR from Message Trace

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

function Get-NdrDiagnostics {
    param (
        [string]$SenderAddress,
        [string]$RecipientAddress,
        [int]$DaysBack = 10
    )

    Write-Host "Searching for failed messages..."

    $traces = Get-MessageTrace `
        -SenderAddress $SenderAddress `
        -RecipientAddress $RecipientAddress `
        -Status Failed `
        -StartDate (Get-Date).AddDays(-$DaysBack) `
        -EndDate (Get-Date) `
        -PageSize 100

    if (-not $traces) {
        Write-Host "No failed messages found."
        Write-Host "Try: Get-MessageTrace without -Status filter to check other statuses."
        return
    }

    Write-Host "Found $($traces.Count) failed message(s):"

    foreach ($trace in $traces) {
        Write-Host "`n--- Message ---"
        Write-Host "Subject:    $($trace.Subject)"
        Write-Host "Received:   $($trace.Received) (UTC)"
        Write-Host "Status:     $($trace.Status)"
        Write-Host "StatusDetail: $($trace.StatusDetail)"

        # Get detailed events
        $details = Get-MessageTraceDetail `
            -MessageTraceId $trace.MessageTraceId `
            -RecipientAddress $RecipientAddress `
            -StartDate (Get-Date).AddDays(-$DaysBack) `
            -EndDate (Get-Date)

        # Find FAIL event with NDR code
        $failEvent = $details | Where-Object { $_.Event -eq "FAIL" } | Select-Object -First 1
        if ($failEvent) {
            Write-Host "NDR Detail: $($failEvent.Detail)"

            # Extract enhanced status code
            if ($failEvent.Detail -match "(\d\.\d\.\d+)") {
                $enhancedCode = $Matches[1]
                Write-Host "Enhanced Status Code: $enhancedCode"
            }
        }

        # Show AGENTINFO events (rules that fired)
        $ruleEvents = $details | Where-Object { $_.Event -eq "AGENTINFO" }
        if ($ruleEvents) {
            Write-Host "Transport Rules Applied:"
            $ruleEvents | ForEach-Object { Write-Host "  - $($_.Action): $($_.Detail)" }
        }
    }
}

Get-NdrDiagnostics -SenderAddress "sender@external.com" -RecipientAddress "user@contoso.com"
```

### PowerShell — Categorize and Count NDRs by Enhanced Status Code

```powershell
function Get-NdrSummary {
    param (
        [int]$DaysBack = 7,
        [int]$MaxResults = 5000
    )

    Write-Host "Fetching failed messages from last $DaysBack days..."

    $page = 1
    $allFailed = @()
    do {
        $batch = Get-MessageTrace `
            -Status Failed `
            -StartDate (Get-Date).AddDays(-$DaysBack) `
            -EndDate (Get-Date) `
            -PageSize 1000 -Page $page
        $allFailed += $batch
        $page++
    } while ($batch.Count -eq 1000 -and $allFailed.Count -lt $MaxResults)

    Write-Host "Total failed messages: $($allFailed.Count)"
    Write-Host "`nTop failure reasons (StatusDetail):"
    $allFailed |
        Group-Object StatusDetail |
        Sort-Object Count -Descending |
        Select-Object -First 15 |
        ForEach-Object { Write-Host "  $($_.Count.ToString().PadLeft(5)) — $($_.Name)" }

    Write-Host "`nTop failing sender domains:"
    $allFailed |
        ForEach-Object { ($_.SenderAddress -split "@")[1] } |
        Group-Object |
        Sort-Object Count -Descending |
        Select-Object -First 10 |
        ForEach-Object { Write-Host "  $($_.Count.ToString().PadLeft(5)) — $($_.Name)" }

    Write-Host "`nTop affected recipients:"
    $allFailed |
        Group-Object RecipientAddress |
        Sort-Object Count -Descending |
        Select-Object -First 10 |
        ForEach-Object { Write-Host "  $($_.Count.ToString().PadLeft(5)) — $($_.Name)" }

    return $allFailed
}

$failedMessages = Get-NdrSummary -DaysBack 3
```

### PowerShell — Check Recipient Restrictions for a Mailbox

```powershell
function Test-RecipientRestrictions {
    param ([string]$Mailbox)

    $mbx = Get-Mailbox -Identity $Mailbox -ErrorAction SilentlyContinue
    if (-not $mbx) {
        Write-Error "Mailbox $Mailbox not found"
        return
    }

    Write-Host "=== Recipient Restrictions for $Mailbox ==="

    # Check accepted senders restriction
    if ($mbx.AcceptMessagesOnlyFrom -or $mbx.AcceptMessagesOnlyFromDLMembers -or $mbx.AcceptMessagesOnlyFromSendersOrMembers) {
        Write-Warning "[RESTRICTED] Mailbox only accepts messages from specific senders:"
        if ($mbx.AcceptMessagesOnlyFrom) {
            Write-Host "  AcceptMessagesOnlyFrom: $($mbx.AcceptMessagesOnlyFrom -join ', ')"
        }
        if ($mbx.AcceptMessagesOnlyFromSendersOrMembers) {
            Write-Host "  AcceptMessagesOnlyFromSendersOrMembers: $($mbx.AcceptMessagesOnlyFromSendersOrMembers -join ', ')"
        }
    } else {
        Write-Host "[OK] No AcceptMessagesOnlyFrom restriction"
    }

    # Check rejected senders restriction
    if ($mbx.RejectMessagesFrom -or $mbx.RejectMessagesFromDLMembers -or $mbx.RejectMessagesFromSendersOrMembers) {
        Write-Warning "[RESTRICTED] Mailbox rejects messages from specific senders:"
        Write-Host "  RejectMessagesFrom: $($mbx.RejectMessagesFrom -join ', ')"
    } else {
        Write-Host "[OK] No RejectMessagesFrom restriction"
    }

    # Check if mailbox is hidden from GAL
    if ($mbx.HiddenFromAddressListsEnabled) {
        Write-Warning "[INFO] Mailbox is hidden from address lists"
    }

    # Check quota
    $stats = Get-MailboxStatistics -Identity $Mailbox -ErrorAction SilentlyContinue
    if ($stats) {
        Write-Host "`n--- Quota Status ---"
        Write-Host "Total item size: $($stats.TotalItemSize)"
        Write-Host "Item count: $($stats.ItemCount)"
        if ($mbx.ProhibitSendReceiveQuota -ne "Unlimited") {
            Write-Host "Quota limit: $($mbx.ProhibitSendReceiveQuota)"
        }
    }
}

Test-RecipientRestrictions -Mailbox "user@contoso.com"
```

### PowerShell — Unblock a Banned Outbound Sender

```powershell
# Check if a user is in the restricted senders list (blocked for outbound spam)
function Test-OutboundSenderBlock {
    param ([string]$UserAddress)

    # Check blocked sender list
    $blockedSenders = Get-BlockedSenderAddress -ErrorAction SilentlyContinue
    if ($blockedSenders) {
        $match = $blockedSenders | Where-Object { $_.SenderAddress -eq $UserAddress }
        if ($match) {
            Write-Warning "[BLOCKED] $UserAddress is in the restricted senders list"
            Write-Host "Blocked reason: Suspected outbound spam or compromised account"
            Write-Host "`nRemediation steps:"
            Write-Host "1. Reset the user's password immediately"
            Write-Host "2. Review the user's sent items for unauthorized activity"
            Write-Host "3. Check for mail forwarding rules set by attacker"
            Write-Host "4. Remove from blocked list:"
            Write-Host "   Remove-BlockedSenderAddress -SenderAddress '$UserAddress'"
            Write-Host "5. Enable MFA for the account"
        } else {
            Write-Host "[OK] $UserAddress is not in the restricted senders list"
        }
    }
}

Test-OutboundSenderBlock -UserAddress "user@contoso.com"

# Remove from restricted senders (after account remediation)
# Remove-BlockedSenderAddress -SenderAddress "user@contoso.com"
```

---

## NDR Remediation Quick Reference

### By Symptom

| Symptom | Most Likely Code | First Diagnostic Step |
|---------|-----------------|----------------------|
| "Email address doesn't exist" | `5.1.10` | Check recipient address; search mailbox in EAC |
| "Mailbox full" | `5.2.2` | Check mailbox quota with `Get-MailboxStatistics` |
| "Message too large" | `5.2.3` | Check message size limits on connectors and mailbox |
| "Relay denied" | `5.4.1` | Check accepted domains and connector config |
| "Authentication required" | `5.7.57` | Enable SMTP AUTH or check app password |
| "Blocked by policy" | `5.7.1` | Check transport rules with `Get-TransportRule` |
| "DMARC fail" | `5.7.23` | Check SPF/DKIM with `Test-SpfRecord`; check DMARC alignment |
| "IP blocked" | `5.7.606` | Submit to https://sender.office.com for delisting |
| "Auto-forward blocked" | `5.7.750` | Expected behavior if transport rule blocks external forwarding |
| "Group restricted" | `5.7.133` | Add sender to distribution group's allowed senders |
| "Account blocked outbound" | `5.7.708` | Password reset, MFA, review mailbox rules, remove from blocklist |

---

## Error Codes Table

| PowerShell Error | Meaning | Remediation |
|-----------------|---------|-------------|
| `CommandNotFound: Get-MessageTrace` | Not connected to Exchange Online | Run `Connect-ExchangeOnline` |
| `AccessDenied: Get-Mailbox` | Missing Exchange role | Assign Exchange Recipient Management role |
| `ManagementObjectNotFoundException` | Mailbox or object not found | Verify address; check for soft-deleted mailbox |
| `InvalidCredential` | Token expired | Re-run `Connect-ExchangeOnline` |

---

## Throttling Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| NDR generation | No hard limit | Downstream sending servers generate NDRs; EOP generates for local failures |
| Restricted senders list | Published per account | Block removes automatically after ~24h if not manually removed sooner |
| Outbound spam policy recipient limit | 500 recipients/hour for user mailboxes | Limit prevents bulk spam from compromised accounts |
| Message size limit (EXO) | 150 MB default (send/receive) | Configurable per mailbox and connector |
| Recipient rate limit | 10,000 recipients/24h for user mailboxes | Bulk sending requires Exchange Online bulk licensing |

---

## Common Patterns and Gotchas

### 1. `5.1.10` Is the Most Common False Alarm

The `5.1.10` code is often triggered by recipient address typos or recently disabled/deleted
mailboxes. Before escalating, always verify the address exists in the Exchange Admin Center and
has not been disabled, soft-deleted, or renamed within the last 30 days.

### 2. `5.7.23` Requires Checking All Three Authentication Records

When DMARC causes a `5.7.23` rejection, check SPF alignment AND DKIM alignment separately.
DMARC passes if **either** SPF or DKIM aligns with the `From:` domain. A common scenario:
SPF fails alignment (forwarding path), but DKIM passes — delivery succeeds. If both fail,
the sending domain's DMARC policy controls rejection.

### 3. `5.7.57` — Distinguish Between SMTP AUTH and Modern Auth

`5.7.57` has two distinct causes:
- **SMTP AUTH disabled on the mailbox**: Fix with `Set-CASMailbox -SmtpClientAuthenticationEnabled $true`
- **App not using correct credential format**: Legacy apps using passwords must use App Passwords if MFA is enabled, or migrate to OAuth 2.0

### 4. `5.7.606` Delist Process Takes 24 Hours

After submitting at `https://sender.office.com`, delisting takes up to 24 hours to propagate.
The submission portal provides a confirmation ID. If the IP is blocked again within 24 hours,
the account sending from that IP is likely still compromised — investigate before resubmitting.

### 5. `4.4.1` vs `5.4.1` — Transient vs Permanent Relay

`4.4.1` (connection timeout) is a network-level transient error — Exchange retries automatically.
`5.4.1` (relay denied) is a permanent rejection at the SMTP level — the receiving server
explicitly refuses relay. These require different remediation: `4.4.1` needs a network/firewall
check; `5.4.1` needs accepted domain or connector configuration.

### 6. On-Premises Exchange NDRs Lack the `5.7.xxx` Specificity of EXO

Exchange Server on-premises uses more generic codes (often `5.7.1`) for security rejections
that Exchange Online would classify specifically as `5.7.23` (DMARC), `5.7.133` (group policy),
or `5.7.750` (forwarding blocked). When diagnosing on-premises NDRs, check the event log
on the Hub/Edge Transport server for the full diagnostic text.
