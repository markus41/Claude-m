---
name: lighthouse-operations:lighthouse-alerts
description: Manage M365 Lighthouse alerts across all managed tenants — list and triage active alerts by severity, acknowledge or dismiss alerts, generate remediation actions for risky users and malware, and configure alert notification rules.
argument-hint: "[--action list|triage|ack|dismiss|configure] [--severity critical|high|medium] [--tenant-id <id>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Lighthouse Alert Management

Triage and manage M365 Lighthouse alerts across all managed tenants.

## Alert Action Flow

### Step 1: Select Action

Ask if not provided via `--action`:
1. **List** — Show all active alerts organized by severity and tenant
2. **Triage** — Work through alerts in priority order with remediation guidance
3. **Acknowledge** — Mark alerts as acknowledged (being worked)
4. **Dismiss** — Dismiss false-positive alerts with justification
5. **Configure** — Set up alert rules and notification routing

---

## Action: List

```bash
TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
BASE="https://graph.microsoft.com/beta/tenantRelationships/managedTenants"

# Get all active alerts ordered by severity
az rest --method GET \
  --url "${BASE}/managedTenantAlerts?\$filter=status eq 'active'&\$orderby=severity desc,firstSeenDateTime asc&\$select=id,displayName,severity,status,tenantId,tenantDisplayName,alertData,firstSeenDateTime,alertRuleDisplayName" \
  --headers "Authorization=Bearer ${TOKEN}"
```

Apply `--severity` filter if provided:
`?$filter=status eq 'active' and severity eq 'critical'`

Apply `--tenant-id` filter if provided:
`?$filter=status eq 'active' and tenantId eq '{id}'`

Display organized table:

```
## Active Alerts — {timestamp}

### 🔴 CRITICAL (1)
| ID | Tenant            | Alert                    | First Seen       |
|----|-------------------|--------------------------|------------------|
| .. | Fabrikam Ltd.     | Malware: Trojan/Wacatac  | 2026-03-02 14:23 |

### 🟠 HIGH (4)
| ID | Tenant            | Alert                    | First Seen       |
|----|-------------------|--------------------------|------------------|
| .. | Contoso Customer  | Risky User: john.doe     | 2026-03-01 09:15 |
| .. | Woodgrove Bank    | Admin without MFA: alice | 2026-03-02 11:00 |

### 🟡 MEDIUM (12)
[...]

Total: 17 active alerts across 8 tenants
```

---

## Action: Triage

Work through alerts in priority order (critical → high → medium → informational).

For each alert:

1. Show alert details including `alertData` content
2. Provide remediation guidance based on alert type:

**Risky User alerts:**
```
Alert: Risky User — john.doe@contoso.com (risk: high, reason: malwareInfectedIPAddress)

Recommended actions:
a) CONFIRM COMPROMISED — forces immediate password reset + revokes all sessions
b) DISMISS — if false positive (document reason)
c) INVESTIGATE — check sign-in logs first

GDAP Role needed: Security Reader (to view) + Security Admin (to confirm/dismiss)

To confirm compromised (run in context of customer tenant):
POST https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/confirmCompromised
{ "userIds": ["<user-object-id>"] }
```

**Malware Detection alerts:**
```
Alert: Malware Detected — DESKTOP-ABC123 — Trojan:Win32/Wacatac

Recommended actions:
1. Isolate device in Intune:
   POST /deviceManagement/managedDevices/{device-id}/remoteLock
2. Trigger full AV scan:
   POST /deviceManagement/managedDevices/{device-id}/runFullScan
3. Check for spread: review other devices in same subnet

GDAP Role needed: Intune Admin
```

**MFA Coverage alerts:**
```
Alert: Low MFA Coverage — 74% (threshold: 90%)

Recommended actions:
1. Identify users without MFA:
   GET /reports/credentialUserRegistrationDetails?$filter=isMfaRegistered eq false
2. Send MFA enrollment reminder to {N} users
3. Enforce CA policy: Require MFA (report-only → enforced)

GDAP Role needed: User Admin + Security Admin
```

3. Ask: "Take action now? (yes/no/skip)"
4. If yes, execute the remediation API calls
5. Acknowledge the alert after action taken

---

## Action: Acknowledge

```bash
az rest --method PATCH \
  --url "${BASE}/managedTenantAlerts/{alert-id}" \
  --headers "Authorization=Bearer ${TOKEN}" \
  --body '{"status": "acknowledged"}'
```

Ask for alert ID or select from list. Support bulk acknowledge by severity.

---

## Action: Dismiss

```bash
az rest --method PATCH \
  --url "${BASE}/managedTenantAlerts/{alert-id}" \
  --headers "Authorization=Bearer ${TOKEN}" \
  --body '{"status": "dismissed"}'
```

Ask for justification reason before dismissing. Log to audit file:
```
2026-03-02T15:30Z | DISMISSED | alert-id={id} | tenant=Contoso | reason="False positive: VPN IP address" | by={user}
```

---

## Action: Configure Alert Rules

```bash
# List current alert rules
az rest --method GET \
  --url "${BASE}/managedTenantAlertRules" \
  --headers "Authorization=Bearer ${TOKEN}"
```

Ask which tenants to apply new alert rules to, and show available rule templates.

Provide guidance on connecting Lighthouse alerts to notification systems:
- **Email**: Configure notification contacts in the Lighthouse portal
- **Teams**: Use Power Automate flow triggered on new alerts
- **ServiceNow / Zendesk**: Webhook pattern via Logic App or Power Automate

---

## Alert Response SLA

Track and report on alert response times:

```
Alert Response SLA Report

| Severity | SLA Target | Average Response | Met SLA |
|----------|-----------|-----------------|---------|
| Critical | 1 hour    | 0.8 hours       | 95%     |
| High     | 4 hours   | 3.2 hours       | 88%     |
| Medium   | 24 hours  | 18 hours        | 92%     |
```

## Arguments

- `--action list|triage|ack|dismiss|configure`: Action to perform
- `--severity critical|high|medium|informational`: Filter by severity
- `--tenant-id <id>`: Filter by specific tenant
