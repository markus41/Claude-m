# Transport Rules and Connectors — Reference

## Overview

This reference covers Exchange Online transport rule conditions, actions, and exceptions with
priority handling; inbound and outbound connector configuration; TLS enforcement; IP allowlisting;
and smart host routing via Exchange Online PowerShell.

---

## Transport Rules

### PowerShell Cmdlets Reference

| Cmdlet | Purpose | Key Parameters |
|--------|---------|----------------|
| `Get-TransportRule` | List all transport rules | `-Identity`, `-State` |
| `New-TransportRule` | Create a new rule | `-Name`, `-Priority`, `-Mode` |
| `Set-TransportRule` | Update an existing rule | `-Identity`, any condition/action param |
| `Remove-TransportRule` | Delete a rule | `-Identity` |
| `Enable-TransportRule` | Enable a disabled rule | `-Identity` |
| `Disable-TransportRule` | Disable without deleting | `-Identity` |
| `Get-TransportRuleAction` | List all available actions | — |
| `Get-TransportRulePredicate` | List all available conditions | — |
| `Export-TransportRuleCollection` | Export all rules to XML | `-FileName` |
| `Import-TransportRuleCollection` | Import rules from XML | `-FileData` |

### Rule Execution Mode

| `-Mode` Value | Behavior |
|--------------|----------|
| `Enforce` | Rule applies and actions execute |
| `Audit` | Rule matches logged in audit log; no actions execute |
| `AuditAndNotify` | Logged and incident report email sent; no actions |

### Condition Parameters Table

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| `-From` | Specific sender address(es) | `"sender@contoso.com"` |
| `-FromAddressContainsWords` | Sender address contains words | `"noreply","newsletter"` |
| `-FromScope` | Sender location | `InOrganization`, `NotInOrganization` |
| `-SentTo` | Specific recipient address(es) | `"exec@contoso.com"` |
| `-SentToScope` | Recipient location | `InOrganization`, `NotInOrganization` |
| `-SentToMemberOf` | Recipient is member of group | Distribution group address |
| `-SubjectContainsWords` | Subject line contains words | `"Urgent","Invoice"` |
| `-SubjectMatchesPatterns` | Subject matches regex | `"\b\d{3}-\d{2}-\d{4}\b"` (SSN) |
| `-SubjectOrBodyContainsWords` | Subject or body contains words | `"password","credentials"` |
| `-SubjectOrBodyMatchesPatterns` | Subject or body regex | `"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+"` |
| `-MessageTypeMatches` | Message type | `AutoForward`, `Calendaring`, `OOF`, `Encrypted` |
| `-AttachmentExtensionMatchesWords` | Attachment file extension | `"exe","bat","ps1","vbs"` |
| `-AttachmentHasExecutableContent` | Attachment is detected as executable | `$true` |
| `-AttachmentSizeOver` | Attachment larger than | `"10 MB"` |
| `-HasClassification` | Message has classification applied | Classification GUID |
| `-HeaderContainsMessageHeader` | Header name exists | `"X-MS-Exchange-Organization-SCL"` |
| `-HeaderContainsWords` | Header value contains words | `"X-Spam-Flag: YES"` |
| `-SCLOver` | Spam Confidence Level greater than | `5` |
| `-RecipientAddressContainsWords` | Recipient address contains words | `"external","partner"` |
| `-AnyOfRecipientAddressContainsWords` | Any recipient address contains | `"contoso.com"` |
| `-SenderIpRanges` | Sender IP matches range | `"203.0.113.0/24"` |
| `-BetweenMemberOf1` | Sent between members of two groups | Distribution group address |
| `-WithImportance` | Message importance level | `High`, `Normal`, `Low` |

### Action Parameters Table

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| `-RejectMessageReasonText` | Reject with NDR text | `"External auto-forward blocked"` |
| `-RejectMessageEnhancedStatusCode` | Custom SMTP enhanced status | `"5.7.1"` |
| `-RedirectMessageTo` | Redirect to different address | `"compliance@contoso.com"` |
| `-BlindCopyTo` | Add BCC recipient | `"audit@contoso.com"` |
| `-AddToRecipients` | Add visible recipient | `"manager@contoso.com"` |
| `-CopyTo` | Add CC recipient | `"supervisor@contoso.com"` |
| `-SetHeaderName` / `-SetHeaderValue` | Set custom header | `"X-Policy-Applied"` / `"BlockedAutoForward"` |
| `-RemoveHeader` | Remove a header | `"X-Original-To"` |
| `-ModifyMessageSubject` | Prepend/append to subject | `"[EXTERNAL] "`, `-SubjectPrefixInsertion` or `-SubjectSuffixInsertion` |
| `-PrependSubject` | Prepend string to subject | `"[CAUTION-EXTERNAL] "` |
| `-ApplyClassification` | Apply message classification | Classification GUID |
| `-ApplyRightsProtectionTemplate` | Apply IRM/AIP template | `"Encrypt"`, `"Do Not Forward"` |
| `-Quarantine` | Move to quarantine | `$true` |
| `-DeleteMessage` | Silently delete | `$true` |
| `-StopRuleProcessing` | Stop evaluating lower-priority rules | `$true` |
| `-GenerateNotification` | Send incident notification | Notification body text |
| `-GenerateIncidentReport` | Generate incident report | `-IncidentReportOriginalMail` |

### Exception Parameters Table

| Parameter | Description |
|-----------|-------------|
| `-ExceptIfFrom` | Exclude specific senders |
| `-ExceptIfFromScope` | Exclude sender location |
| `-ExceptIfSentTo` | Exclude specific recipients |
| `-ExceptIfSubjectContainsWords` | Exclude subject keywords |
| `-ExceptIfMessageTypeMatches` | Exclude message types |
| `-ExceptIfAttachmentExtensionMatchesWords` | Exclude file extensions |
| `-ExceptIfSCLOver` | Exclude messages above SCL threshold |
| `-ExceptIfSenderIpRanges` | Exclude sender IPs |
| `-ExceptIfHeaderContainsWords` | Exclude header values |

### Rule Priority

Rules are evaluated **in ascending priority order** (Priority 0 = highest priority). Rules with
`-StopRuleProcessing $true` halt evaluation once matched.

```powershell
# View all rules sorted by priority
Get-TransportRule | Sort-Object Priority |
    Select-Object Name, State, Priority, Description | Format-Table -Wrap

# Change rule priority
Set-TransportRule -Identity "Encrypt PII" -Priority 0

# Insert a rule at a specific priority (other rules shift down)
New-TransportRule -Name "Emergency Block" -Priority 0 `
    -SubjectContainsWords "MALICIOUS" `
    -DeleteMessage $true
```

### Common Transport Rule Examples

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

# Block external auto-forwarding (required for security compliance)
New-TransportRule -Name "Block External Auto-Forward" `
    -FromScope InOrganization `
    -MessageTypeMatches AutoForward `
    -SentToScope NotInOrganization `
    -RejectMessageReasonText "External auto-forwarding is disabled by company policy." `
    -RejectMessageEnhancedStatusCode "5.7.1" `
    -Priority 0 `
    -Mode Enforce

# Tag inbound external email with subject prefix
New-TransportRule -Name "External Email Tag" `
    -FromScope NotInOrganization `
    -SentToScope InOrganization `
    -PrependSubject "[EXTERNAL] " `
    -StopRuleProcessing $false `
    -Priority 10

# BCC compliance mailbox on messages to/from executives
New-TransportRule -Name "Executive Compliance BCC" `
    -SentToMemberOf "ExecGroup@contoso.com" `
    -BlindCopyTo "compliance-archive@contoso.com" `
    -Mode Enforce

# Block executable attachments from external senders
New-TransportRule -Name "Block Executable Attachments" `
    -FromScope NotInOrganization `
    -AttachmentExtensionMatchesWords "exe","bat","ps1","vbs","js","wsf","hta","cmd","com","scr" `
    -RejectMessageReasonText "Executable attachments are not permitted." `
    -Priority 5

# Encrypt outbound messages with sensitive keywords
New-TransportRule -Name "Encrypt PII Outbound" `
    -FromScope InOrganization `
    -SentToScope NotInOrganization `
    -SubjectOrBodyMatchesPatterns "\b\d{3}-\d{2}-\d{4}\b","\bSSN\b" `
    -ApplyRightsProtectionTemplate "Encrypt" `
    -SetHeaderName "X-DLP-Applied" `
    -SetHeaderValue "PII-Encrypt" `
    -Mode Enforce

# Force TLS for messages to a specific partner domain
New-TransportRule -Name "Require TLS to Partner" `
    -SentToScope NotInOrganization `
    -RecipientAddressContainsWords "partner.com" `
    -RouteMessageOutboundRequireTls $true `
    -Mode Enforce
```

---

## Connectors

### Connector Types

| Type | Direction | Use Case |
|------|-----------|----------|
| `Inbound - Partner` | Inbound | Receive from a specific external partner or service |
| `Inbound - OnPremises` | Inbound | Receive from on-premises Exchange server |
| `Outbound - Partner` | Outbound | Route to specific external partner via TLS or smart host |
| `Outbound - OnPremises` | Outbound | Route to on-premises Exchange server via smart host |

### Connector PowerShell Cmdlets Reference

| Cmdlet | Purpose |
|--------|---------|
| `Get-InboundConnector` | List inbound connectors |
| `New-InboundConnector` | Create inbound connector |
| `Set-InboundConnector` | Update inbound connector |
| `Remove-InboundConnector` | Delete inbound connector |
| `Get-OutboundConnector` | List outbound connectors |
| `New-OutboundConnector` | Create outbound connector |
| `Set-OutboundConnector` | Update outbound connector |
| `Remove-OutboundConnector` | Delete outbound connector |
| `Test-InboundConnector` | Validate inbound connector TLS |
| `Test-OutboundConnector` | Test outbound mail routing |

### Inbound Connector Parameters

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| `-ConnectorType` | Partner or OnPremises | `Partner`, `OnPremises` |
| `-SenderDomains` | Domains connector applies to | `"partner.com","contoso-partner.com"` |
| `-RequireTls` | Require TLS connection | `$true` |
| `-TlsSenderCertificateName` | Validate sender TLS certificate CN | `"mail.partner.com"` |
| `-RestrictDomainsToCertificate` | Only accept if cert matches | `$true` |
| `-SenderIPAddresses` | Allowlisted sender IPs | `"203.0.113.25","198.51.100.0/24"` |
| `-RestrictDomainsToIPAddresses` | Only accept from allowlisted IPs | `$true` |
| `-CloudServicesMailEnabled` | Enable for cloud service messages | `$false` |
| `-Comment` | Description | `"Partner ACME Corp inbound"` |
| `-Enabled` | Enable/disable connector | `$true` |

### Outbound Connector Parameters

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| `-ConnectorType` | Partner or OnPremises | `Partner`, `OnPremises` |
| `-RecipientDomains` | Domains this connector routes | `"partner.com"` |
| `-UseMXRecord` | Route via MX (vs smart host) | `$true` / `$false` |
| `-SmartHosts` | Smart host FQDNs or IPs | `"smtp.partner.com"` |
| `-TlsSettings` | TLS requirement level | `None`, `EncryptionOnly`, `CertificateVerification`, `DomainValidation` |
| `-TlsDomain` | Expected certificate domain | `"mail.partner.com"` |
| `-IsTransportRuleScoped` | Restrict to transport rule routing | `$true` |
| `-AllAcceptedDomains` | Route all accepted domains | `$false` |
| `-Comment` | Description | `"Outbound to ACME via smart host"` |
| `-Enabled` | Enable/disable connector | `$true` |

### TLS Settings Values for Outbound Connectors

| Value | Requirement |
|-------|-------------|
| `None` | No TLS required (not recommended) |
| `EncryptionOnly` | TLS required; any certificate accepted |
| `CertificateVerification` | TLS required; certificate must be trusted |
| `DomainValidation` | TLS required; certificate CN/SAN must match `-TlsDomain` |

### Connector Configuration Examples

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

# Create inbound connector for a partner with certificate-based TLS
New-InboundConnector -Name "Inbound - ACME Partner" `
    -ConnectorType Partner `
    -SenderDomains "acme.com","mail.acme.com" `
    -RequireTls $true `
    -TlsSenderCertificateName "mail.acme.com" `
    -RestrictDomainsToCertificate $true `
    -Comment "Inbound mail from ACME Corp — requires mutual TLS" `
    -Enabled $true

# Create inbound connector with IP restriction (no TLS certificate required)
New-InboundConnector -Name "Inbound - Legacy System" `
    -ConnectorType Partner `
    -SenderDomains "legacyapp.contoso.com" `
    -SenderIPAddresses "203.0.113.100","203.0.113.101" `
    -RestrictDomainsToIPAddresses $true `
    -RequireTls $true `
    -Comment "Legacy on-premises app relay" `
    -Enabled $true

# Create outbound connector routing to partner via smart host with TLS
New-OutboundConnector -Name "Outbound - ACME Partner" `
    -ConnectorType Partner `
    -RecipientDomains "acme.com" `
    -UseMXRecord $false `
    -SmartHosts "smtp.acme.com" `
    -TlsSettings DomainValidation `
    -TlsDomain "smtp.acme.com" `
    -Comment "Route outbound to ACME via their smart host, enforce TLS" `
    -Enabled $true

# Create outbound connector scoped to transport rule (trigger via rule action)
New-OutboundConnector -Name "Outbound - Compliance Archive" `
    -ConnectorType Partner `
    -UseMXRecord $false `
    -SmartHosts "archive.complianceprovider.com" `
    -TlsSettings CertificateVerification `
    -IsTransportRuleScoped $true `
    -Comment "Used exclusively by compliance BCC transport rule" `
    -Enabled $true
```

### Test Connector Connectivity

```powershell
# Test inbound connector validation
Test-InboundConnector -Identity "Inbound - ACME Partner" -SendingIPAddress "203.0.113.100"

# Test outbound connector by sending a test message
Test-OutboundConnector -Identity "Outbound - ACME Partner" -To "test@acme.com"

# Get detailed connector status and settings
Get-InboundConnector -Identity "Inbound - ACME Partner" | Format-List *
Get-OutboundConnector -Identity "Outbound - ACME Partner" | Format-List *
```

### IP Allowlisting (Connection Filter)

```powershell
# Get current connection filter policy
Get-HostedConnectionFilterPolicy -Identity Default

# Add IPs to the allowlist (bypasses spam filtering)
Set-HostedConnectionFilterPolicy -Identity Default `
    -IPAllowList @{Add="203.0.113.0/24","198.51.100.42"} `
    -Comment "Trusted partner IPs added YYYY-MM-DD"

# Remove IPs from allowlist
Set-HostedConnectionFilterPolicy -Identity Default `
    -IPAllowList @{Remove="198.51.100.42"}

# View full allowlist
(Get-HostedConnectionFilterPolicy -Identity Default).IPAllowList

# Add IPs to blocklist
Set-HostedConnectionFilterPolicy -Identity Default `
    -IPBlockList @{Add="192.0.2.0/24"}
```

### Connector Routing Diagnostics

```powershell
# Check which connector handled a message via message trace detail
$trace = Get-MessageTrace `
    -SenderAddress "partner@acme.com" `
    -RecipientAddress "user@contoso.com" `
    -StartDate (Get-Date).AddDays(-1) `
    -EndDate (Get-Date) | Select-Object -First 1

if ($trace) {
    $details = Get-MessageTraceDetail `
        -MessageTraceId $trace.MessageTraceId `
        -RecipientAddress "user@contoso.com" `
        -StartDate (Get-Date).AddDays(-1) `
        -EndDate (Get-Date)

    Write-Host "Delivery events for $($trace.Subject):"
    $details | Where-Object { $_.Event -in @("RECEIVE","SEND","TRANSFER","AGENTINFO") } |
        Select-Object Date, Event, Action, Detail | Sort-Object Date | Format-Table -Wrap

    # RECEIVE event shows which connector accepted the message
    $receiveEvent = $details | Where-Object { $_.Event -eq "RECEIVE" } | Select-Object -First 1
    if ($receiveEvent) {
        Write-Host "`nReceived via: $($receiveEvent.Detail)"
    }
}
```

---

## Error Codes Table

| Error | Context | Meaning | Remediation |
|-------|---------|---------|-------------|
| `ObjectAlreadyExists` | `New-TransportRule` | Rule with this name already exists | Use a unique `-Name` or update existing with `Set-TransportRule` |
| `Rule evaluation limit exceeded` | Runtime | Too many rules or complex regex | Simplify conditions; consolidate redundant rules |
| `ConnectorAlreadyExists` | `New-InboundConnector` | Connector name in use | Use `Set-InboundConnector` to update, or delete and recreate |
| `TLS certificate validation failed` | Inbound connector | Sender cert CN doesn't match `-TlsSenderCertificateName` | Verify cert on sending server; check `-TlsSenderCertificateName` |
| `SmartHostDNSResolutionFailed` | Outbound connector | Smart host FQDN not resolving | Verify smart host DNS; use IP address as fallback |
| `ConnectionTimedOut` | Outbound connector | Smart host unreachable | Check firewall rules; verify port 25 open from EOP IPs |
| `TLSNegotiationFailed` | Outbound connector | TLS handshake failed | Check TLS version support on smart host; try `EncryptionOnly` first |
| `RuleActionConflict` | `New-TransportRule` | Incompatible action combination | Certain actions cannot be combined (e.g., Reject + Redirect) |
| `AccessDenied` | Any | Missing Exchange Administrator role | Assign Exchange Admin role |
| `InvalidAddress` | Condition parameter | Malformed email address | Verify address format; use wildcards correctly (`*@domain.com`) |

---

## Throttling Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Transport rules per tenant | 300 rules total | Evaluate rule consolidation regularly |
| Transport rule regex complexity | Evaluated per message | Complex regexes slow delivery; test with `Audit` mode first |
| Connector count | No published hard limit | Keep connectors to necessary pairs; unused connectors add risk |
| IP allowlist entries | 1,273 entries per policy | Use CIDR notation to cover ranges efficiently |
| IP blocklist entries | 1,273 entries per policy | Use domain blocklist for domain-level blocking |
| Smart host MX resolution | Cached; 30-minute TTL | Smart host DNS changes may take up to 30 min to propagate |

---

## Common Patterns and Gotchas

### 1. Rule Priority 0 Does Not Guarantee First Execution for All Messages

Priority 0 is the highest priority, but System rules (like malware filtering) execute before
all user-defined transport rules. Transport rules run in the **Transport Rules Agent**, which
operates after Anti-Malware but before Anti-Spam filtering in the pipeline. Plan rule logic
accordingly — don't rely on transport rules to intercept malware-flagged messages.

### 2. Test with `Audit` Mode Before `Enforce`

Always create new rules with `-Mode Audit` first. Audit mode logs matches to the message trace
and audit log without executing actions. Check for false positives over 24-48 hours before
switching to `-Mode Enforce`. Use `-Mode AuditAndNotify` to receive incident report emails during testing.

### 3. Inbound Connectors Do Not Apply to Messages Addressed to EOP

An inbound connector with `SenderDomains: partner.com` only matches when Exchange Online
receives messages FROM `partner.com`. It does not affect outbound routing. Routing decisions
for inbound messages are made by the MX record, not by inbound connectors.

### 4. Scoped Outbound Connectors Require a Transport Rule to Activate

An outbound connector with `-IsTransportRuleScoped $true` is **never used automatically**
by recipient domain routing. A transport rule must explicitly use `-RouteMessageOutboundConnector`
pointing to the scoped connector. Forgetting the transport rule causes messages to route via
the default connector.

### 5. Connection Filter IP Allowlist Bypasses ALL Spam Filtering

Adding an IP to `-IPAllowList` in the connection filter policy bypasses anti-spam scoring
entirely for messages from that IP. This is intentional for trusted relay servers but
dangerous for general use. Prefer inbound connectors with `-RestrictDomainsToIPAddresses $true`
for partner mail, which adds trust without disabling filtering.

### 6. `Export-TransportRuleCollection` Before Making Bulk Changes

Always export the full rule collection before making bulk modifications:

```powershell
$bytes = [System.Text.Encoding]::Unicode.GetBytes(
    (Get-TransportRule | ConvertTo-Json -Depth 10)
)
[System.IO.File]::WriteAllBytes("C:\Backup\transport-rules-$(Get-Date -Format 'yyyy-MM-dd').json", $bytes)
```

This provides a reference point for rollback if a new rule causes unexpected side effects.
