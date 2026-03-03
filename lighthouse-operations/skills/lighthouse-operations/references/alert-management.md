# M365 Lighthouse Alert Management — Rules, Triage, Notification Routing

## Alert Architecture

Lighthouse alerts are generated from monitoring rules applied across all managed tenants.
They surface issues like risky users, malware detections, low MFA coverage, compliance drift.

**Base URL**: `https://graph.microsoft.com/beta/tenantRelationships/managedTenants`

---

## Alert Rules

### List All Alert Rules

```
GET {base}/managedTenantAlertRules
?$select=id,displayName,description,alertRuleTemplateId,severity,isEnabled,tenants
```

### Alert Rule Severity Levels

| Severity | Description | Response SLA |
|----------|-------------|-------------|
| `critical` | Immediate risk — active malware, compromised admin | < 1 hour |
| `high` | Serious risk — risky user, admin without MFA | < 4 hours |
| `medium` | Moderate risk — stale accounts, low device compliance | < 24 hours |
| `informational` | Trend data — license utilization, usage patterns | Next business day |

### Create Custom Alert Rule

```
POST {base}/managedTenantAlertRules
Content-Type: application/json

{
  "displayName": "Admin Without MFA",
  "severity": "high",
  "description": "Alert when an admin account does not have MFA registered",
  "alertRuleTemplateId": "<template-id-for-admin-mfa>",
  "tenants": ["<tenant-id-1>", "<tenant-id-2>"]
}
```

---

## Active Alerts

### Get All Active Alerts

```
GET {base}/managedTenantAlerts
?$filter=status eq 'active'
&$orderby=severity desc,lastRefreshedDateTime desc
&$select=id,displayName,severity,status,tenantId,tenantDisplayName,alertData,
         firstSeenDateTime,lastSeenDateTime,alertRuleDisplayName
```

### Get Critical Alerts Across All Tenants

```
GET {base}/managedTenantAlerts
?$filter=severity eq 'critical' and status eq 'active'
&$orderby=firstSeenDateTime asc
&$select=id,displayName,tenantId,tenantDisplayName,alertData,firstSeenDateTime
```

### Alert Response Structure

```json
{
  "id": "alert-id",
  "displayName": "Malware Detected on Device",
  "severity": "critical",
  "status": "active",
  "tenantId": "customer-tenant-id",
  "tenantDisplayName": "Contoso Customer",
  "firstSeenDateTime": "2026-03-02T14:23:00Z",
  "lastSeenDateTime": "2026-03-02T14:23:00Z",
  "alertRuleDisplayName": "Malware Detection",
  "alertData": {
    "deviceName": "DESKTOP-ABC123",
    "threatName": "Trojan:Win32/Wacatac",
    "userName": "john.doe@contoso.com"
  }
}
```

---

## Alert Status Management

### Acknowledge an Alert

```
PATCH {base}/managedTenantAlerts/{alert-id}
Content-Type: application/json

{
  "status": "acknowledged"
}
```

### Dismiss an Alert

```
PATCH {base}/managedTenantAlerts/{alert-id}
Content-Type: application/json

{
  "status": "dismissed"
}
```

### Alert Status Values

| Status | Description |
|--------|-------------|
| `active` | New or unaddressed alert |
| `acknowledged` | MSP has reviewed and is working on it |
| `resolved` | Issue has been remediated |
| `dismissed` | Intentionally closed without action (with justification) |

---

## Alert Triage Workflow

### Priority Matrix

```
Severity × Tenant Risk Tier = Response Priority

        | Tier 1 (Critical) | Tier 2 (Standard) | Tier 3 (Basic) |
--------|-------------------|-------------------|----------------|
Critical| P1 - 1hr          | P2 - 2hr          | P2 - 4hr       |
High    | P2 - 2hr          | P2 - 4hr          | P3 - 8hr       |
Medium  | P3 - 8hr          | P3 - 24hr         | P4 - 48hr      |
Info    | P4 - 48hr         | P5 - SLA window   | P5 - SLA window|
```

### Standard Triage Steps

1. **Acknowledge** the alert in Lighthouse
2. **Assess scope**: single user/device or systemic?
3. **Check GDAP role**: verify you have the right role to remediate
4. **Investigate**: check Entra sign-in logs, Defender alerts, audit logs
5. **Remediate**: take action (reset credential, isolate device, block sign-in)
6. **Document**: record actions taken and outcome
7. **Resolve** alert in Lighthouse

### Risky User Alert — Remediation Actions

When a `riskyUsers` alert fires:

```
GET https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/{userId}
  (via GDAP Security Reader in customer tenant)
```

Options:
- **Confirm compromised**: `POST /riskyUsers/confirmCompromised` → forces password reset + blocks all sessions
- **Dismiss risk**: `POST /riskyUsers/dismiss` → if false positive
- **Block sign-in**: `PATCH /users/{id}` → `accountEnabled: false`

### Malware Detection — Remediation Actions

When a `windowsDeviceMalwareStates` alert fires:

1. Note device name and malware threat name
2. Via Intune (GDAP Intune Admin role in customer tenant):
   - `POST /deviceManagement/managedDevices/{id}/remoteLock` — prevent further access
   - `POST /deviceManagement/managedDevices/{id}/runFullScan` — trigger AV scan
   - `POST /deviceManagement/managedDevices/{id}/syncDevice` — force policy sync
3. Review Defender portal for additional detections

---

## Notification Routing — Email and Webhooks

### Configure Alert Email Notifications

In Lighthouse portal: **Tenants → Alert rules → Edit rule → Notifications**

Via API (Partner Center admin API — not yet available in Graph beta; use portal).

### Programmatic Notification via Azure Logic App / Power Automate

Trigger on Lighthouse alert webhook (preview feature as of 2026):

```json
{
  "trigger": "Lighthouse Alert",
  "conditions": [
    { "field": "severity", "operator": "equals", "value": "critical" }
  ],
  "actions": [
    {
      "type": "SendEmail",
      "to": "msp-soc@contoso.com",
      "subject": "[CRITICAL] Lighthouse alert: {alertDisplayName}",
      "body": "Tenant: {tenantDisplayName}\nAlert: {alertDisplayName}\nTime: {firstSeenDateTime}"
    },
    {
      "type": "CreateTeamsMessage",
      "channel": "MSP-Alerts",
      "message": "🚨 @here Critical alert in **{tenantDisplayName}**\n{alertDisplayName}\nAction required within 1 hour"
    },
    {
      "type": "CreateServiceDeskTicket",
      "priority": "P1",
      "category": "Security Incident"
    }
  ]
}
```

---

## Monthly Alert Summary Report

```
GET {base}/managedTenantAlerts
?$filter=firstSeenDateTime gt {first-of-month}
&$select=tenantDisplayName,severity,status,alertRuleDisplayName,firstSeenDateTime
&$orderby=severity desc,firstSeenDateTime asc
```

Group by `tenantDisplayName` and summarize:
- Total alerts by severity
- Mean time to acknowledge (MTTA)
- Mean time to resolve (MTTR)
- Open vs. resolved count
