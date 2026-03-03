# Microsoft Sentinel API Reference

## Workspace and Workspace ID

Sentinel operates on a Log Analytics workspace. Two IDs are needed:

- **ARM workspace resource ID** (for control-plane operations): `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{workspaceName}`
- **Workspace GUID** (for data-plane Log Analytics query API): found in workspace properties as `customerId`

## Sentinel ARM API Version

Use `api-version=2023-02-01` for stable operations. Use `2023-09-01-preview` for preview features (automation rules v2, entity pages).

## Incidents

### List Incidents

```http
GET https://management.azure.com/{workspaceResourceId}/providers/Microsoft.SecurityInsights/incidents?api-version=2023-02-01
  &$filter=properties/status eq 'New'
  &$orderby=properties/createdTimeUtc desc
  &$top=25
```

**Incident object key fields:**

| Field | Type | Description |
|---|---|---|
| `properties.incidentNumber` | int | Human-readable incident number |
| `properties.title` | string | Incident title (from rule or manual) |
| `properties.severity` | string | `High`, `Medium`, `Low`, `Informational` |
| `properties.status` | string | `New`, `Active`, `Closed` |
| `properties.createdTimeUtc` | datetime | Creation time |
| `properties.lastModifiedTimeUtc` | datetime | Last update time |
| `properties.assignee.email` | string | Assigned analyst email |
| `properties.labels` | array | Free-form label strings |
| `properties.classification` | string | Closure classification |
| `properties.classificationReason` | string | Closure reason |
| `properties.firstActivityTimeUtc` | datetime | Earliest alert time in incident |
| `properties.lastActivityTimeUtc` | datetime | Latest alert time |
| `properties.relatedAnalyticRuleIds` | array | Source analytics rule resource IDs |

### Get Incident Details

```http
GET .../incidents/{incidentId}?api-version=2023-02-01
```

### Get Incident Entities

Returns enriched entities (accounts, hosts, IPs, URLs, files, processes) extracted from all alerts in the incident.

```http
POST .../incidents/{incidentId}/entities?api-version=2023-02-01
```

Response entity kinds: `Account`, `Host`, `Ip`, `Url`, `File`, `Process`, `MailCluster`, `MailMessage`, `Mailbox`, `SecurityAlert`, `AzureResource`, `CloudApplication`, `DnsResolution`, `FileHash`, `HuntingBookmark`, `IoTDevice`, `RegistryKey`, `RegistryValue`, `SecurityGroup`, `SubmissionMail`

### Get Incident Alerts

```http
POST .../incidents/{incidentId}/alerts?api-version=2023-02-01
```

### Add Comment

```http
PUT .../incidents/{incidentId}/comments/{commentId}?api-version=2023-02-01
Content-Type: application/json

{
  "properties": {
    "message": "Your markdown-formatted analyst note here."
  }
}
```

### Bulk Update Incidents

Sentinel does not support native batch PATCH. Use ARM $batch:

```http
POST https://management.azure.com/batch?api-version=2020-06-01
{
  "requests": [
    { "httpMethod": "PATCH", "url": "/subscriptions/.../incidents/{id1}?api-version=2023-02-01", "content": {"properties":{"status":"Active"}} },
    { "httpMethod": "PATCH", "url": "/subscriptions/.../incidents/{id2}?api-version=2023-02-01", "content": {"properties":{"status":"Active"}} }
  ]
}
```

## Analytics Rules

### List Rules

```http
GET .../alertRules?api-version=2023-02-01
```

Filter by kind: `&$filter=kind eq 'Scheduled'`

### Scheduled Rule Properties

| Property | Description |
|---|---|
| `queryFrequency` | ISO 8601 duration — how often to run (min: `PT5M`) |
| `queryPeriod` | ISO 8601 duration — lookback window (must be >= queryFrequency) |
| `triggerOperator` | `GreaterThan`, `LessThan`, `Equal`, `NotEqual` |
| `triggerThreshold` | Integer count of matching rows to trigger |
| `suppressionDuration` | ISO 8601 — suppress re-alert after trigger |
| `suppressionEnabled` | bool |
| `tactics` | Array of MITRE tactic names |
| `techniques` | Array of MITRE technique IDs (T1059.001 format) |
| `entityMappings` | Array of entity type → column mappings |
| `incidentConfiguration.createIncident` | bool — create incident vs alert only |

### NRT Rule Differences

NRT rules (`kind: NRT`) omit `queryFrequency` and `queryPeriod` — they fire on ingestion. Maximum 50 NRT rules per workspace. NRT rules support the same entity mappings and tactics as Scheduled.

### MicrosoftSecurityIncidentCreation Rule

Promotes alerts from Defender/MDI/Purview products into Sentinel incidents.

```json
{
  "kind": "MicrosoftSecurityIncidentCreation",
  "properties": {
    "productFilter": "Microsoft Defender Advanced Threat Protection",
    "severitiesFilter": ["High", "Medium"],
    "displayNamesFilter": [],
    "displayNamesExcludeFilter": [],
    "enabled": true
  }
}
```

`productFilter` values: `"Microsoft Defender Advanced Threat Protection"`, `"Azure Active Directory Identity Protection"`, `"Microsoft Defender for Cloud Apps"`, `"Microsoft Defender for Office 365"`, `"Azure Defender"`, `"Azure Security Center for IoT"`.

## Alert Rule Templates

Microsoft-provided templates that can be instantiated as rules:

```http
GET .../alertRuleTemplates?api-version=2023-02-01&$filter=kind eq 'Scheduled'
```

To create a rule from a template, POST to `alertRules` with the same `kind` and copy `properties` from the template response.

## Watchlists

Watchlists are CSV-backed reference datasets used in KQL queries via `_GetWatchlist('alias')`.

**Create watchlist:**

```http
PUT .../watchlists/{watchlistAlias}?api-version=2023-02-01
{
  "properties": {
    "displayName": "VIP Users",
    "provider": "Custom",
    "itemsSearchKey": "UserPrincipalName",
    "rawContent": "UserPrincipalName,Department\nceo@contoso.com,Executive\ncfo@contoso.com,Finance",
    "contentType": "text/csv"
  }
}
```

**Query watchlist in KQL:**

```kql
let vipUsers = _GetWatchlist('VIPUsers') | project UserPrincipalName;
SigninLogs
| where UserPrincipalName in (vipUsers)
| where ResultType != 0
```

## Bookmarks

Bookmarks mark specific query rows as investigation artifacts.

```http
PUT .../bookmarks/{bookmarkId}?api-version=2023-02-01
{
  "properties": {
    "displayName": "Suspicious logon from Tor exit node",
    "query": "SigninLogs | where IPAddress == '185.220.101.x'",
    "queryResult": "{\"IPAddress\":\"185.220.101.x\",\"UserPrincipalName\":\"victim@contoso.com\"}",
    "eventTime": "2026-03-01T10:00:00Z",
    "notes": "Tor exit node confirmed via threat intel enrichment.",
    "labels": ["InitialAccess", "TOR"]
  }
}
```

## Automation Rules

Automation rules trigger playbooks or field updates on incident creation/update.

```http
PUT .../automationRules/{ruleId}?api-version=2023-02-01
{
  "properties": {
    "displayName": "Auto-assign high severity to Tier 1",
    "order": 1,
    "triggeringLogic": {
      "isEnabled": true,
      "triggersOn": "Incidents",
      "triggersWhen": "Created",
      "conditions": [
        {
          "conditionType": "Property",
          "conditionProperties": {
            "propertyName": "IncidentSeverity",
            "operator": "Equals",
            "propertyValues": ["High"]
          }
        }
      ]
    },
    "actions": [
      {
        "order": 1,
        "actionType": "ModifyProperties",
        "actionConfiguration": {
          "assignee": { "objectId": "{tier1-team-object-id}", "email": "tier1@contoso.com" }
        }
      }
    ]
  }
}
```

## Data Connectors

Key connector kinds and their `kind` values:

| Product | `kind` value |
|---|---|
| Microsoft Defender for Endpoint | `MicrosoftThreatProtection` |
| Azure Active Directory | `AzureActiveDirectory` |
| Azure Activity | `AzureActivity` |
| Microsoft 365 Defender | `MicrosoftThreatProtection` |
| Defender for Cloud | `AzureSecurityCenter` |
| Microsoft Defender for IoT | `IoT` |
| Threat Intelligence (STIX/TAXII) | `ThreatIntelligenceTaxii` |
| Microsoft Defender Threat Intelligence | `MicrosoftDefenderThreatIntelligence` |

## Log Analytics Query API

Endpoint: `https://api.loganalytics.io/v1/workspaces/{workspaceId}/query`

Required scope: `https://api.loganalytics.io/.default`

**Useful security tables:**

| Table | Description |
|---|---|
| `SecurityAlert` | All alerts ingested by Sentinel |
| `SecurityIncident` | Incident change history |
| `SecurityEvent` | Windows Security Event Log |
| `Syslog` | Linux syslog |
| `SigninLogs` | Entra ID interactive sign-ins |
| `AADNonInteractiveUserSignInLogs` | Non-interactive sign-ins |
| `AuditLogs` | Entra ID directory audits |
| `AzureActivity` | Azure ARM control plane |
| `AzureMetrics` | Azure resource metrics |
| `DeviceProcessEvents` | MDE process creation |
| `DeviceNetworkEvents` | MDE network connections |
| `DeviceFileEvents` | MDE file operations |
| `DeviceLogonEvents` | MDE logon events |
| `EmailEvents` | MDO email delivery |
| `CloudAppEvents` | MDCA cloud app activity |
| `RiskyUsers` | Entra ID Identity Protection |

## Limits and Quotas

| Resource | Limit |
|---|---|
| Active analytics rules (Scheduled) | 512 per workspace |
| NRT rules | 50 per workspace |
| Automation rules | 100 per workspace |
| Watchlists | 100 per workspace |
| Watchlist items | 10,000,000 per watchlist |
| Log Analytics query response size | 64 MB |
| Log Analytics query timeout | 10 minutes |
| ARM API calls | 1,200/5min per principal |
