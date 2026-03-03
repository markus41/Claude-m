# SPF, DKIM, and DMARC — Reference

## Overview

This reference covers SPF record syntax and mechanism semantics, DKIM key setup and rotation
via Exchange Online PowerShell, DMARC policy configuration and reporting, alignment failure
diagnostics, and MTA-STS enforcement for Exchange Online tenants.

---

## SPF (Sender Policy Framework)

### SPF Mechanism Reference

| Mechanism | Type | Description | Example |
|-----------|------|-------------|---------|
| `v=spf1` | Required | Version identifier; must appear first | `v=spf1 ...` |
| `include:` | Redirect | Authorize another domain's SPF record | `include:spf.protection.outlook.com` |
| `ip4:` | Network | Authorize specific IPv4 address or CIDR | `ip4:203.0.113.25`, `ip4:192.0.2.0/24` |
| `ip6:` | Network | Authorize specific IPv6 address or CIDR | `ip6:2001:db8::1`, `ip6:2001:db8::/32` |
| `a` | Host | Authorize domain's A/AAAA records | `a`, `a:mail.contoso.com` |
| `mx` | Host | Authorize domain's MX records | `mx`, `mx:contoso.com` |
| `ptr` | Reverse | Authorize by PTR record (deprecated) | `ptr:contoso.com` |
| `exists` | Macro | Authorize if A record exists for macro | `exists:%{ir}.example.com` |
| `redirect=` | Modifier | Use another domain's SPF as this policy | `redirect=_spf.example.com` |
| `exp=` | Modifier | Explanation TXT record for failures | `exp=explain._spf.contoso.com` |
| `-all` | Qualifier | Hard fail — reject unauthorized senders | Recommended for production |
| `~all` | Qualifier | Soft fail — accept but mark unauthorized | Testing/transition only |
| `?all` | Qualifier | Neutral — no assertion | Not recommended |
| `+all` | Qualifier | Pass all — effectively no SPF | Never use |

### SPF for Microsoft 365

| Domain Type | SPF Record |
|------------|------------|
| M365 only (no on-premises relay) | `v=spf1 include:spf.protection.outlook.com -all` |
| M365 + on-premises mail server | `v=spf1 include:spf.protection.outlook.com ip4:<on-prem-IP> -all` |
| M365 + third-party bulk sender | `v=spf1 include:spf.protection.outlook.com include:sendgrid.net -all` |
| Parked/non-sending domain | `v=spf1 -all` |

### DNS Lookup Budget

SPF resolution is limited to **10 DNS lookups** (excluding `ip4:`, `ip6:`, and `all`). Each
`include:`, `a`, `mx`, `ptr`, and `exists` mechanism counts as one lookup. Nested `include:`
chains count recursively. Exceeding 10 lookups causes a `permerror`.

```powershell
# PowerShell — Count SPF lookups for a domain
function Measure-SpfLookups {
    param ([string]$Domain)

    $txt = Resolve-DnsName -Name $Domain -Type TXT -ErrorAction SilentlyContinue |
        Where-Object { $_.Strings -match "v=spf1" }

    if (-not $txt) {
        Write-Error "No SPF record found for $Domain"
        return
    }

    $record = $txt.Strings -join ""
    Write-Host "SPF record: $record"

    # Count lookup mechanisms
    $lookups = ([regex]::Matches($record, "(include:|a:|a\s|mx:|mx\s|ptr:|exists:)")).Count
    Write-Host "Approximate DNS lookups: $lookups"

    if ($lookups -gt 10) {
        Write-Warning "SPF lookup limit exceeded! Reduce include mechanisms."
    } elseif ($lookups -ge 8) {
        Write-Warning "Approaching SPF lookup limit ($lookups/10). Review includes."
    } else {
        Write-Host "[OK] Within lookup limit ($lookups/10)"
    }
}

Measure-SpfLookups -Domain "contoso.com"
```

### PowerShell — Validate SPF Record

```powershell
function Test-SpfRecord {
    param ([string]$Domain)

    Write-Host "=== SPF Validation for $Domain ==="

    $records = Resolve-DnsName -Name $Domain -Type TXT -ErrorAction SilentlyContinue |
        Where-Object { $_.Strings -match "v=spf1" }

    if (-not $records) {
        Write-Warning "[FAIL] No SPF record found for $Domain"
        Write-Host "Recommended record: v=spf1 include:spf.protection.outlook.com -all"
        return
    }

    if ($records.Count -gt 1) {
        Write-Warning "[FAIL] Multiple SPF records found. Only one is allowed."
        return
    }

    $spf = $records.Strings -join ""
    Write-Host "Record: $spf"

    # Check for M365 inclusion
    if ($spf -match "include:spf\.protection\.outlook\.com") {
        Write-Host "[OK] M365 SPF included"
    } else {
        Write-Warning "[WARN] Missing M365 SPF include. Add: include:spf.protection.outlook.com"
    }

    # Check qualifier
    if ($spf -match "-all") {
        Write-Host "[OK] Hard fail (-all) configured"
    } elseif ($spf -match "~all") {
        Write-Warning "[WARN] Soft fail (~all) — consider upgrading to hard fail (-all)"
    } elseif ($spf -match "\?all" -or $spf -match "\+all") {
        Write-Warning "[WARN] Weak or open qualifier. Use -all for production."
    }
}

Test-SpfRecord -Domain "contoso.com"
```

---

## DKIM (DomainKeys Identified Mail)

### DKIM PowerShell Cmdlets Reference

| Cmdlet | Purpose | Key Parameters |
|--------|---------|----------------|
| `Get-DkimSigningConfig` | List DKIM signing configs | `-Identity <domain>` |
| `Set-DkimSigningConfig` | Enable/disable DKIM | `-Identity <domain> -Enabled $true` |
| `New-DkimSigningConfig` | Create config for new domain | `-DomainName <domain> -KeySize 2048` |
| `Rotate-DkimSigningConfig` | Rotate to new key pair | `-Identity <domain> -KeySize 2048` |

### DKIM DNS Record Format

Exchange Online uses two selectors (`selector1` and `selector2`) as CNAMEs:

```
selector1._domainkey.contoso.com  CNAME  selector1-contoso-com._domainkey.contoso.onmicrosoft.com
selector2._domainkey.contoso.com  CNAME  selector2-contoso-com._domainkey.contoso.onmicrosoft.com
```

The CNAME target format is: `selector<N>-<domain-with-hyphens>._domainkey.<tenant>.onmicrosoft.com`
(dots in the custom domain are replaced with hyphens in the CNAME target).

### DKIM Setup and Rotation Workflow

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

# Step 1: Check current DKIM status for all domains
$dkimStatus = Get-DkimSigningConfig
$dkimStatus | Select-Object Domain, Enabled, Status, Selector1CNAME, Selector2CNAME | Format-Table -Wrap

# Step 2: Enable DKIM for a custom domain (must have CNAMEs in DNS first)
Set-DkimSigningConfig -Identity "contoso.com" -Enabled $true

# Step 3: Verify the signing config
$config = Get-DkimSigningConfig -Identity "contoso.com"
Write-Host "Domain: $($config.Domain)"
Write-Host "Status: $($config.Status)"  # Should be: Valid
Write-Host "Key size: $($config.KeySize)"  # 1024 or 2048
Write-Host "Selector1 CNAME: $($config.Selector1CNAME)"
Write-Host "Selector2 CNAME: $($config.Selector2CNAME)"

# Step 4: Rotate keys (generates a new key for the inactive selector)
Rotate-DkimSigningConfig -KeySize 2048 -Identity "contoso.com"

# After rotating: update the DNS CNAME for the new selector
# Exchange rotates between selector1 and selector2 automatically after DNS propagation
$updated = Get-DkimSigningConfig -Identity "contoso.com"
Write-Host "Rotation complete. New selector active."
Write-Host "Update DNS CNAME if not already done:"
Write-Host "  Selector1: $($updated.Selector1CNAME)"
Write-Host "  Selector2: $($updated.Selector2CNAME)"
```

### PowerShell — Verify DKIM DNS Records

```powershell
function Test-DkimDns {
    param ([string]$Domain)

    $config = Get-DkimSigningConfig -Identity $Domain -ErrorAction SilentlyContinue
    if (-not $config) {
        Write-Error "No DKIM config found for $Domain"
        return
    }

    Write-Host "=== DKIM DNS Verification for $Domain ==="

    foreach ($selectorNum in @(1, 2)) {
        $selectorName = "selector$selectorNum"
        $lookupName = "$selectorName._domainkey.$Domain"
        $expectedCname = if ($selectorNum -eq 1) { $config.Selector1CNAME } else { $config.Selector2CNAME }

        Write-Host "`nChecking: $lookupName"

        $cname = Resolve-DnsName -Name $lookupName -Type CNAME -ErrorAction SilentlyContinue
        if ($cname) {
            $resolvedTarget = $cname.NameHost
            if ($resolvedTarget -eq $expectedCname) {
                Write-Host "  [OK] CNAME matches expected value"
            } else {
                Write-Warning "  [MISMATCH] Expected: $expectedCname"
                Write-Warning "             Found:    $resolvedTarget"
            }
        } else {
            Write-Warning "  [MISSING] CNAME record not found"
            Write-Host "  Create: $lookupName CNAME $expectedCname"
        }
    }
}

Test-DkimDns -Domain "contoso.com"
```

---

## DMARC (Domain-based Message Authentication, Reporting, and Conformance)

### DMARC Record Syntax

```
v=DMARC1; p=reject; sp=reject; pct=100; adkim=r; aspf=r;
  rua=mailto:dmarc-agg@contoso.com; ruf=mailto:dmarc-forensic@contoso.com; fo=1
```

### DMARC Tag Reference

| Tag | Required | Values | Description |
|-----|---------|--------|-------------|
| `v=` | Yes | `DMARC1` | Version; must be first tag |
| `p=` | Yes | `none`, `quarantine`, `reject` | Policy for the organizational domain |
| `sp=` | No | `none`, `quarantine`, `reject` | Policy for subdomains (inherits `p=` if omitted) |
| `pct=` | No | `1`-`100` (default: `100`) | Percentage of failing messages to apply policy |
| `adkim=` | No | `r` (relaxed), `s` (strict) | DKIM identifier alignment (default: relaxed) |
| `aspf=` | No | `r` (relaxed), `s` (strict) | SPF identifier alignment (default: relaxed) |
| `rua=` | No | `mailto:` URI(s) | Aggregate (daily XML) report recipients |
| `ruf=` | No | `mailto:` URI(s) | Forensic (per-failure) report recipients |
| `fo=` | No | `0`, `1`, `d`, `s` | Forensic reporting triggers |
| `ri=` | No | Seconds (default: `86400`) | Reporting interval |
| `rf=` | No | `afrf` | Report format |

### DMARC Forensic Reporting Options (`fo=`)

| Value | Meaning |
|-------|---------|
| `0` | Report when all authentication mechanisms fail (SPF AND DKIM both fail) |
| `1` | Report when any authentication mechanism fails (SPF OR DKIM fails) |
| `d` | Report when DKIM signature fails |
| `s` | Report when SPF fails |

### DMARC Alignment Explained

DMARC requires "alignment" between the `From:` header domain and the authenticated domain:

| Alignment Mode | DKIM Requirement | SPF Requirement |
|---------------|------------------|-----------------|
| Relaxed (`r`) | `d=` domain must match or be a subdomain of `From:` domain | `MAIL FROM` domain must match or be a subdomain of `From:` domain |
| Strict (`s`) | `d=` domain must exactly match `From:` domain | `MAIL FROM` domain must exactly match `From:` domain |

**Common alignment failures:**

- Bulk email service sends with `d=sendgrid.net` but `From:` is `@contoso.com` — use custom DKIM signing in SendGrid
- Marketing tool uses `Return-Path: bounce@mailservice.com` but `From:` is `@contoso.com` — configure subdomain alignment or custom SPF
- Forwarding scenarios — forwarding breaks SPF alignment; only DKIM survives forwarding

### DMARC Rollout Process

```powershell
# Stage 1: Monitor only (no enforcement)
# DNS TXT record: _dmarc.contoso.com
# Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@contoso.com; fo=1

# PowerShell to verify DMARC is readable
function Get-DmarcRecord {
    param ([string]$Domain)

    $dmarc = Resolve-DnsName -Name "_dmarc.$Domain" -Type TXT -ErrorAction SilentlyContinue |
        Where-Object { $_.Strings -match "v=DMARC1" }

    if (-not $dmarc) {
        Write-Warning "No DMARC record found for $Domain"
        Write-Host "Create DNS TXT record at: _dmarc.$Domain"
        Write-Host "Starting value: v=DMARC1; p=none; rua=mailto:dmarc-reports@$Domain"
        return
    }

    $record = $dmarc.Strings -join ""
    Write-Host "DMARC record for $Domain:"
    Write-Host $record

    # Parse policy
    if ($record -match "p=(\w+)") {
        $policy = $Matches[1]
        switch ($policy) {
            "none"       { Write-Host "[MONITOR] Policy: none — monitoring only, no enforcement" }
            "quarantine" { Write-Host "[PARTIAL] Policy: quarantine — failing messages sent to spam" }
            "reject"     { Write-Host "[ENFORCE] Policy: reject — failing messages rejected at gateway" }
        }
    }

    # Check for reporting
    if ($record -match "rua=") {
        Write-Host "[OK] Aggregate reporting configured"
    } else {
        Write-Warning "[WARN] No aggregate reporting (rua=) configured"
    }
}

Get-DmarcRecord -Domain "contoso.com"
```

### DMARC Rollout Timeline

```
Week 1-4:   p=none; rua=mailto:dmarc@contoso.com
            → Review aggregate reports, identify all sending sources

Week 5-6:   p=quarantine; pct=10
            → 10% of failing messages quarantined; monitor for false positives

Week 7-8:   p=quarantine; pct=50
            → Increase to 50%; fix remaining alignment issues

Week 9-10:  p=quarantine; pct=100
            → All failing messages quarantined

Week 11-12: p=reject; pct=100
            → Full enforcement; unauthorized senders rejected
```

---

## MTA-STS (SMTP MTA Strict Transport Security)

MTA-STS prevents SMTP downgrade attacks by publishing a policy requiring TLS for inbound mail.

### MTA-STS DNS Record

```
_mta-sts.contoso.com  TXT  "v=STSv1; id=20260101000000Z"
```

The `id` value must change every time the policy file changes.

### MTA-STS Policy File

Hosted at `https://mta-sts.contoso.com/.well-known/mta-sts.txt`:

```
version: STSv1
mode: enforce
mx: contoso-com.mail.protection.outlook.com
max_age: 604800
```

| `mode` | Effect |
|--------|--------|
| `testing` | Report failures but do not reject (use for initial rollout) |
| `enforce` | Reject delivery if TLS cannot be established to an allowed MX |
| `none` | Disable the policy |

### TLS-RPT (TLS Reporting)

```
_smtp._tls.contoso.com  TXT  "v=TLSRPTv1; rua=mailto:tls-reports@contoso.com"
```

TLS-RPT sends daily JSON reports about TLS negotiation failures and MTA-STS policy violations.

### PowerShell — Full Email Authentication Audit

```powershell
function Invoke-EmailAuthAudit {
    param ([string]$Domain)

    Write-Host "`n========================================="
    Write-Host "Email Authentication Audit: $Domain"
    Write-Host "=========================================`n"

    # SPF Check
    Write-Host "--- SPF ---"
    $spf = Resolve-DnsName -Name $Domain -Type TXT -ErrorAction SilentlyContinue |
        Where-Object { $_.Strings -match "v=spf1" }
    if ($spf) {
        $record = $spf.Strings -join ""
        Write-Host "Record: $record"
        if ($record -match "include:spf\.protection\.outlook\.com") {
            Write-Host "[OK] M365 SPF mechanism present"
        } else { Write-Warning "[FAIL] Missing M365 SPF mechanism" }
        if ($record -match "-all") {
            Write-Host "[OK] Hard fail (-all)"
        } elseif ($record -match "~all") {
            Write-Warning "[WARN] Soft fail (~all) — upgrade to -all"
        }
    } else {
        Write-Warning "[FAIL] No SPF record found"
    }

    # DKIM Check
    Write-Host "`n--- DKIM ---"
    try {
        $dkim = Get-DkimSigningConfig -Identity $Domain -ErrorAction Stop
        if ($dkim.Enabled) {
            Write-Host "[OK] DKIM enabled. Status: $($dkim.Status)"
        } else {
            Write-Warning "[FAIL] DKIM not enabled for $Domain"
        }
    } catch {
        Write-Warning "[FAIL] No DKIM config found (domain may not be in Exchange Online)"
    }

    # DMARC Check
    Write-Host "`n--- DMARC ---"
    $dmarc = Resolve-DnsName -Name "_dmarc.$Domain" -Type TXT -ErrorAction SilentlyContinue |
        Where-Object { $_.Strings -match "v=DMARC1" }
    if ($dmarc) {
        $record = $dmarc.Strings -join ""
        Write-Host "Record: $record"
        if ($record -match "p=reject") {
            Write-Host "[OK] DMARC policy: reject"
        } elseif ($record -match "p=quarantine") {
            Write-Warning "[PARTIAL] DMARC policy: quarantine (consider upgrading to reject)"
        } elseif ($record -match "p=none") {
            Write-Warning "[MONITOR] DMARC policy: none (monitoring only)"
        }
        if ($record -match "rua=") {
            Write-Host "[OK] Aggregate reporting configured"
        } else {
            Write-Warning "[WARN] No aggregate reporting configured"
        }
    } else {
        Write-Warning "[FAIL] No DMARC record found"
    }

    # MTA-STS Check
    Write-Host "`n--- MTA-STS ---"
    $mta = Resolve-DnsName -Name "_mta-sts.$Domain" -Type TXT -ErrorAction SilentlyContinue |
        Where-Object { $_.Strings -match "v=STSv1" }
    if ($mta) {
        Write-Host "[OK] MTA-STS DNS record found: $($mta.Strings -join '')"
    } else {
        Write-Warning "[INFO] No MTA-STS record (optional but recommended)"
    }
}

Invoke-EmailAuthAudit -Domain "contoso.com"
```

---

## Error Codes Table

| Error / Status | Meaning | Remediation |
|----------------|---------|-------------|
| `SPF: permerror` | DNS lookup limit exceeded (>10 lookups) | Flatten SPF record; use `ip4:` instead of `include:` chains |
| `SPF: temperror` | DNS timeout during SPF lookup | Transient DNS issue; retry or check DNS resolver |
| `SPF: neutral` | Sending IP not authorized but no hard/soft fail | Change `?all` to `-all` |
| `SPF: fail` | Sending IP not in SPF record | Add IP to SPF or route mail through authorized server |
| `SPF: softfail` | Soft fail — message delivered with mark | Investigate and move to `-all` |
| `DKIM: no signature` | No DKIM signature on message | Enable DKIM signing on the sending domain |
| `DKIM: signature invalid` | DKIM signature failed verification | Check DNS key rotation; verify CNAME resolution |
| `DKIM: key not found` | CNAME for selector not in DNS | Publish selector CNAME record; wait for propagation |
| `DMARC: fail` | Both SPF and DKIM alignment failed | Check alignment mode; ensure `From:` domain matches signing domain |
| `DMARC: no record` | No `_dmarc.` TXT record exists | Create DMARC record starting with `p=none` |
| `MTA-STS: policy not found` | No policy file at well-known URL | Host policy file at `https://mta-sts.<domain>/.well-known/mta-sts.txt` |
| `MTA-STS: certificate mismatch` | TLS cert CN/SAN doesn't match MX hostname | Verify TLS certificate covers the MX hostname |

---

## Throttling Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| SPF DNS lookups | 10 per evaluation | Exceeding causes `permerror`; flatten with `ip4:` |
| SPF record length | 255 chars per TXT string; multiple strings concatenated | Some tools show warnings above 450 chars total |
| DKIM key size | 1024 or 2048 bits (2048 recommended) | Exchange Online supports both; 2048 preferred |
| DKIM selector rotation | Once every 30 days recommended | Exchange Online supports immediate rotation |
| DMARC aggregate reports | Sent once per 24 hours (configurable via `ri=`) | Reports may be delayed up to 48 hours by senders |
| MTA-STS max_age | Up to 31,557,600 seconds (~1 year) | Start with 86400 (1 day); increase after validation |

---

## Common Patterns and Gotchas

### 1. Forwarding Breaks SPF, Not DKIM

When email is forwarded, the sending IP changes — breaking SPF. DKIM signatures survive
forwarding because they are in the message headers. This is why DMARC with `adkim=r` (relaxed)
is more robust than relying on SPF alignment alone. Ensure DKIM is enabled before enforcing DMARC.

### 2. Subdomains Need Their Own DMARC Records

A DMARC `p=reject` record at `contoso.com` does not automatically protect `mail.contoso.com`
unless the top-level record includes `sp=reject`. Create explicit `_dmarc.mail.contoso.com`
records for any subdomain that sends mail, or add `sp=reject` to the organizational domain record.

### 3. Third-Party Senders Require Separate DKIM or Subdomain Delegation

Marketing tools (Salesforce, Mailchimp, SendGrid) sending as `From: @contoso.com` must either:
- Use a subdomain (`newsletters.contoso.com`) with its own SPF and DKIM
- Or use the provider's DKIM signing capability with a `CNAME` pointing to their signing key

Sharing your M365 DKIM private key with a third party is not supported or recommended.

### 4. Multiple SPF Records Cause Permanent Errors

A domain may have **only one SPF TXT record**. If two TXT records starting with `v=spf1` exist
at the same DNS label, evaluation produces a `permerror`. Check existing records with
`Resolve-DnsName -Type TXT` before adding a new SPF record.

### 5. DKIM CNAME Propagation Takes Up to 48 Hours

After publishing CNAME records for DKIM selectors, wait for DNS propagation (up to 48 hours)
before enabling DKIM in Exchange Online (`Set-DkimSigningConfig -Enabled $true`). Enabling
before propagation causes signing failures until the CNAME is resolvable globally.

### 6. `pct=` Applies Only to Failing Messages

The `pct=` tag in DMARC controls what percentage of **failing** messages are subject to the policy.
It does not affect compliant messages. A `pct=10` with `p=quarantine` means 10% of failing messages
are quarantined; the other 90% are delivered normally. This is useful for gradual rollout.
