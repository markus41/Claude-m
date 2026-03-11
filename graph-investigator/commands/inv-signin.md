---
name: inv-signin
description: Sign-in log analysis — location anomalies, IP analysis, failed logins, conditional access evaluation, risk levels
argument-hint: "<upn> [--days <number>] [--failed-only] [--risky-only] [--top <number>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — Sign-In Log Analysis

Retrieves and analyzes sign-in logs for a user. Detects location anomalies, impossible travel, legacy authentication, failed MFA, conditional access bypasses, and risk-level distributions. Outputs a comprehensive sign-in intelligence report.

## Arguments

| Argument | Description |
|---|---|
| `<upn>` | **Required.** User Principal Name to investigate |
| `--days <number>` | Number of days of sign-in history to fetch (default: 30, max: 30 for most tenants; up to 90 days with P2) |
| `--failed-only` | Only return failed sign-in attempts |
| `--risky-only` | Only return sign-ins with a non-none risk level |
| `--top <number>` | Maximum sign-in records to fetch (default: 200, max: 1000) |

## Integration Context Check

Required scopes:
- `AuditLog.Read.All` — access to `/auditLogs/signIns`
- `User.Read.All` — resolve UPN

Optional scopes:
- `IdentityRiskyUser.Read.All` — enriches risk data (requires Azure AD P2)

Sign-in logs are only available for the last **30 days** on P1 tenants and up to **90 days** on P2/E5 tenants. If no data is returned for a date range, the tenant log retention limit has likely been reached.

## Step 1: Fetch Sign-In Logs

Build the `$filter` based on arguments. Use `createdDateTime ge {startDate}` for `--days`, add `status/errorCode ne 0` for `--failed-only`, and `riskLevelAggregated ne 'none'` for `--risky-only`.

```bash
UPN="<upn>"
START_DATE="<ISO-8601-date>"  # e.g. 2024-01-01T00:00:00Z
TOP=200

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '${UPN}' and createdDateTime ge ${START_DATE}&\$select=id,createdDateTime,userPrincipalName,appDisplayName,appId,ipAddress,location,status,deviceDetail,conditionalAccessStatus,appliedConditionalAccessPolicies,riskLevelAggregated,riskEventTypes,riskState,clientAppUsed,authenticationDetails,authenticationRequirement,isInteractive,resourceDisplayName,resourceId,tokenIssuerType&\$top=${TOP}&\$orderby=createdDateTime desc" \
  --output json
```

Paginate using `@odata.nextLink` until the full result set is retrieved or the `--top` limit is reached.

## Step 2: Failure Analysis

Group sign-ins by `status.errorCode`. Map common error codes to human-readable descriptions:

| Error Code | Description | Risk |
|---|---|---|
| `0` | Success | — |
| `50058` | Silent sign-in interrupted | Low |
| `50074` | Strong auth required | Low |
| `50076` | MFA required by policy | Low |
| `50079` | User must register for MFA | Medium |
| `50126` | Invalid credentials | High — brute force indicator |
| `50053` | Account locked | High — brute force indicator |
| `50057` | Account disabled | Medium |
| `53003` | Blocked by Conditional Access | Medium |
| `700016` | App not found in tenant | High — unauthorized app |
| `65001` | Consent required | Medium |

Count successful vs. failed, and compute the failure rate. A failure rate above 20% is anomalous.

## Step 3: Geographic Analysis

Extract unique countries and cities from `location.countryOrRegion` and `location.city`:

```bash
# Extract and count unique countries from JSON output
# Process with jq:
jq '[.value[].location.countryOrRegion] | group_by(.) | map({country: .[0], count: length}) | sort_by(-.count)' signins.json
```

Flag:
- First-time country sign-in (country not seen in the baseline 90 days)
- High-risk countries based on organizational policy
- More than 3 different countries in a 7-day window

## Step 4: IP Analysis

Extract all unique `ipAddress` values. For each IP, note frequency and application context.

Flag IPs that match known hosting/cloud provider ranges (AWS, Azure, GCP, DigitalOcean, Linode) as potential VPN or proxy indicators — legitimate users rarely sign in from cloud-provider IPs.

Common patterns to flag:
- Same IP appearing for multiple different users (credential stuffing)
- Residential IP suddenly switching to datacenter IP
- Tor exit node IP ranges (maintain local blocklist or use IPQS/AbuseIPDB)
- IPv6 addresses — note if tenant has not seen IPv6 sign-ins before

## Step 5: Impossible Travel Detection

Sort all successful sign-ins chronologically by `createdDateTime`. For each consecutive pair of sign-ins from different locations, compute approximate geographic distance using Haversine formula and compare to elapsed time.

Flag any pair where required travel speed exceeds 900 km/h (commercial aircraft speed):

```
⚠️ IMPOSSIBLE TRAVEL DETECTED:
  2024-01-15 08:32 UTC — New York, US (IP: 1.2.3.4)
  2024-01-15 10:15 UTC — Berlin, DE (IP: 5.6.7.8)
  Distance: ~6,300 km | Time: 1h 43m | Required speed: 3,663 km/h — PHYSICALLY IMPOSSIBLE
```

Note: VPN or proxy use can produce false positives — always cross-reference with the user's normal travel schedule. The IP-to-location mapping used by Entra may also be imprecise for some IP ranges.

## Step 6: Application and Legacy Authentication Analysis

Group sign-ins by `appDisplayName` and `clientAppUsed`. Flag legacy authentication clients:

| clientAppUsed value | Protocol | Risk |
|---|---|---|
| `Exchange Web Services` | EWS | 🔴 Bypasses MFA |
| `Exchange ActiveSync` | EAS | 🔴 Bypasses MFA |
| `SMTP` | SMTP AUTH | 🔴 Bypasses MFA |
| `POP3` | POP3 | 🔴 Bypasses MFA |
| `IMAP4` | IMAP | 🔴 Bypasses MFA |
| `MAPI over HTTP` | MAPI | 🔴 Bypasses MFA |
| `Authenticated SMTP` | SMTP AUTH | 🔴 Bypasses MFA |
| `Other clients` | Unknown | 🟡 Review |

Any use of legacy authentication is a significant indicator because conditional access MFA policies generally do not apply to these protocols.

## Step 7: MFA and Conditional Access Analysis

For each sign-in, examine `authenticationDetails` and `appliedConditionalAccessPolicies`:

- Check `authenticationDetails[].succeeded` — false means MFA was attempted but failed
- Check `conditionalAccessStatus`: `success`, `failure`, `notApplied`, `unknownFutureValue`
- Identify sign-ins where Conditional Access was `notApplied` — these bypassed all CA policies
- List CA policy names that were applied and their results

Flag sign-ins where `authenticationRequirement` is `singleFactorAuthentication` but the user has MFA registered — indicates a CA gap or legacy auth.

## Step 8: Risk Summary

Aggregate `riskLevelAggregated` values across all sign-ins:

```bash
jq '[.value[].riskLevelAggregated] | group_by(.) | map({level: .[0], count: length})' signins.json
```

Also collect `riskEventTypes` — these are the specific risk detections Entra Identity Protection attached to each sign-in. Common types:
- `unfamiliarFeatures` — sign-in properties differ from baseline
- `anonymizedIPAddress` — sign-in from anonymizer/Tor
- `maliciousIPAddress` — known bad IP
- `impossibleTravel` — Entra's own travel detection
- `leakedCredentials` — credentials found in dark web

## Output Format

```markdown
## Sign-In Analysis — jsmith@contoso.com
**Period**: Last 30 days | **Total Sign-Ins**: 187 | **Failures**: 12 (6.4%)

### Summary
| Metric | Value | Flag |
|---|---|---|
| Total sign-ins | 187 | — |
| Successful | 175 | — |
| Failed | 12 | 🟡 6.4% failure rate |
| Unique countries | 3 | 🟡 US, DE, NL |
| Unique IPs | 8 | — |
| Legacy auth events | 2 | 🔴 SMTP, EWS |
| Risky sign-ins | 1 | 🔴 riskLevel: high |
| Impossible travel | 1 | 🔴 See below |

### Geographic Breakdown
| Country | City | Count | First Seen | Flag |
|---|---|---|---|---|
| United States | New York | 180 | 2023-12-01 | — |
| Germany | Berlin | 5 | 2024-01-15 | ⚠️ New country |
| Netherlands | Amsterdam | 2 | 2024-01-15 | ⚠️ Same day as Germany |

### Impossible Travel Events
⚠️ IMPOSSIBLE TRAVEL DETECTED:
  2024-01-15 08:32 UTC — New York, US (IP: 1.2.3.4) — Azure Portal
  2024-01-15 10:15 UTC — Berlin, DE (IP: 5.6.7.8) — Azure Portal
  Distance: ~6,300 km | Time: 1h 43m | Required speed: 3,663 km/h — PHYSICALLY IMPOSSIBLE

### Legacy Authentication Events
| Date | App | Protocol | IP | Status |
|---|---|---|---|---|
| 2024-01-10 | Unknown | SMTP AUTH | 9.8.7.6 | ✅ Success |

### Risk Distribution
| Risk Level | Count |
|---|---|
| None | 186 |
| High | 1 |

### Top Failure Reasons
| Error Code | Description | Count |
|---|---|---|
| 50126 | Invalid credentials | 9 |
| 53003 | Blocked by CA | 3 |
```
