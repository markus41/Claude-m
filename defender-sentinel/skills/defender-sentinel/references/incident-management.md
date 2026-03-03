# Incident Management — Microsoft Sentinel & Defender XDR Reference

Incidents are collections of correlated alerts representing a potential security threat. Sentinel incidents come from analytics rules; Defender XDR incidents come from product detections. Both are accessible via REST APIs for automation and integration.

---

## REST API Endpoints — Sentinel Incidents (ARM)

**Base path:** `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}/providers/Microsoft.SecurityInsights`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/incidents?api-version=2023-02-01` | `Microsoft Sentinel Reader` | `$filter`, `$orderby`, `$top` | List incidents |
| GET | `/incidents/{id}?api-version=2023-02-01` | `Microsoft Sentinel Reader` | — | Single incident |
| PUT | `/incidents/{id}?api-version=2023-02-01` | `Microsoft Sentinel Responder` | Full body | Create or replace incident |
| PATCH | `/incidents/{id}?api-version=2023-02-01` | `Microsoft Sentinel Responder` | Partial body | Update status, severity, assignee |
| DELETE | `/incidents/{id}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | — | Delete incident |
| GET | `/incidents/{id}/comments?api-version=2023-02-01` | `Microsoft Sentinel Reader` | — | List comments |
| POST | `/incidents/{id}/comments?api-version=2023-02-01` | `Microsoft Sentinel Responder` | Body: comment | Add analyst note |
| DELETE | `/incidents/{id}/comments/{commentId}?api-version=2023-02-01` | `Microsoft Sentinel Responder` | — | Delete comment |
| POST | `/incidents/{id}/entities?api-version=2023-02-01` | `Microsoft Sentinel Reader` | No body | Get enriched entities |
| GET | `/incidents/{id}/alerts?api-version=2023-02-01` | `Microsoft Sentinel Reader` | — | Get incident's linked alerts |
| POST | `/incidents/{id}/runPlaybook?api-version=2023-02-01` | `Microsoft Sentinel Responder` | Body: logicAppResourceId | Manually trigger playbook |
| GET | `/incidents/{id}/tasks?api-version=2023-02-01` | `Microsoft Sentinel Reader` | — | List incident tasks |
| POST | `/incidents/{id}/tasks?api-version=2023-02-01` | `Microsoft Sentinel Responder` | Body: task | Add task |
| GET | `/incidents?api-version=2023-02-01&$filter=properties/status eq 'New'&$orderby=properties/createdTimeUtc desc` | `Microsoft Sentinel Reader` | — | New incidents queue |

---

## REST API Endpoints — Defender XDR Incidents (Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/security/incidents` | `SecurityIncident.Read.All` | `$filter`, `$top`, `$orderby`, `$expand=alerts` | List incidents |
| GET | `/security/incidents/{id}` | `SecurityIncident.Read.All` | `$expand=alerts` | Single incident |
| PATCH | `/security/incidents/{id}` | `SecurityIncident.ReadWrite.All` | Partial body | Update incident |
| GET | `/security/alerts_v2` | `SecurityAlert.Read.All` | `$filter`, `$expand=evidence` | List alerts |
| GET | `/security/alerts_v2/{alertId}` | `SecurityAlert.Read.All` | `$expand=evidence` | Alert with evidence |
| PATCH | `/security/alerts_v2/{alertId}` | `SecurityAlert.ReadWrite.All` | Partial body | Update alert |

**Base URL for Graph:** `https://graph.microsoft.com/v1.0`

---

## Incident Status and Classification Values

### Sentinel Incidents

| Field | Allowed Values |
|-------|---------------|
| `status` | `New`, `Active`, `Closed` |
| `severity` | `High`, `Medium`, `Low`, `Informational` |
| `classification` | `Undetermined`, `TruePositive`, `FalsePositive`, `BenignPositive` |
| `classificationReason` | `SuspiciousActivity`, `SuspiciousButExpected`, `IncorrectAlertLogic`, `InaccurateData` |

### Defender XDR Incidents

| Field | Allowed Values |
|-------|---------------|
| `status` | `active`, `resolved`, `redirected`, `inProgress`, `unknownFutureValue` |
| `severity` | `unknown`, `informational`, `low`, `medium`, `high` |
| `classification` | `unknown`, `falsePositive`, `truePositive`, `informationalExpectedActivity` |
| `determination` | `unknown`, `apt`, `malware`, `securityPersonnel`, `securityTesting`, `unwantedSoftware`, `other`, `multiStagedAttack`, `compromisedUser`, `phishing`, `maliciousUserActivity`, `notMalicious`, `notEnoughDataToValidate`, `confirmedUserActivity`, `lineOfBusinessApplication` |

---

## Incident Lifecycle Management (TypeScript)

```typescript
import { DefaultAzureCredential } from '@azure/identity';

const baseUrl = 'https://management.azure.com';
const sentinelBase = `${baseUrl}/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.OperationalInsights/workspaces/${ws}/providers/Microsoft.SecurityInsights`;

async function getToken(): Promise<string> {
  const cred = new DefaultAzureCredential();
  const token = await cred.getToken('https://management.azure.com/.default');
  return token!.token;
}

// List new high-severity incidents
async function listNewHighIncidents(): Promise<any[]> {
  const token = await getToken();
  const filter = encodeURIComponent(
    "properties/status eq 'New' and properties/severity eq 'High'"
  );
  const url = `${sentinelBase}/incidents?api-version=2023-02-01&$filter=${filter}&$orderby=properties/createdTimeUtc desc&$top=50`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  return data.value;
}

// Assign and activate an incident
async function activateAndAssign(
  incidentId: string,
  analystObjectId: string,
  analystEmail: string,
  analystName: string
): Promise<void> {
  const token = await getToken();
  const url = `${sentinelBase}/incidents/${incidentId}?api-version=2023-02-01`;

  const body = {
    properties: {
      status: 'Active',
      assignee: {
        objectId: analystObjectId,
        email: analystEmail,
        name: analystName
      }
    }
  };

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

// Close incident with classification
async function closeIncident(
  incidentId: string,
  classification: 'TruePositive' | 'FalsePositive' | 'BenignPositive' | 'Undetermined',
  classificationReason: string,
  comment: string
): Promise<void> {
  const token = await getToken();
  const url = `${sentinelBase}/incidents/${incidentId}?api-version=2023-02-01`;

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        status: 'Closed',
        classification,
        classificationReason,
        classificationComment: comment
      }
    })
  });
}

// Add analyst comment
async function addComment(
  incidentId: string,
  message: string
): Promise<string> {
  const token = await getToken();
  const commentId = crypto.randomUUID();
  const url = `${sentinelBase}/incidents/${incidentId}/comments/${commentId}?api-version=2023-02-01`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ properties: { message } })
  });

  const data = await response.json();
  return data.name;
}
```

---

## Get Incident Entities

```typescript
// Get enriched entities (Account, Host, IP, URL, File, Process, etc.)
async function getIncidentEntities(incidentId: string): Promise<any> {
  const token = await getToken();
  const url = `${sentinelBase}/incidents/${incidentId}/entities?api-version=2023-02-01`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });

  const data = await response.json();
  return {
    accounts: data.entities.filter((e: any) => e.kind === 'Account'),
    hosts: data.entities.filter((e: any) => e.kind === 'Host'),
    ips: data.entities.filter((e: any) => e.kind === 'Ip'),
    urls: data.entities.filter((e: any) => e.kind === 'Url'),
    files: data.entities.filter((e: any) => e.kind === 'File'),
    processes: data.entities.filter((e: any) => e.kind === 'Process')
  };
}
```

---

## Incident Metrics API

```http
GET https://management.azure.com/.../providers/Microsoft.SecurityInsights/incidents?api-version=2023-02-01
  &$filter=properties/status eq 'Closed' and properties/createdTimeUtc ge 2026-02-01T00:00:00Z
  &$select=properties/status,properties/severity,properties/classification,properties/createdTimeUtc,properties/closedTimeUtc
  &$top=1000
```

Calculate MTTR (Mean Time to Respond/Resolve) from `createdTimeUtc` → `closedTimeUtc`.

---

## Automation Rules — Trigger Playbooks Automatically

Automation rules execute actions on new/updated incidents without requiring alert grouping or analyst involvement.

```json
{
  "kind": "Automation",
  "properties": {
    "displayName": "Auto-assign High Severity to SOC L2",
    "order": 1,
    "triggeringLogic": {
      "isEnabled": true,
      "expirationTimeUtc": null,
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
          "severity": "High",
          "status": "Active"
        }
      },
      {
        "order": 2,
        "actionType": "RunPlaybook",
        "actionConfiguration": {
          "tenantId": "{tenantId}",
          "logicAppResourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/workflows/{playbookName}"
        }
      }
    ]
  }
}
```

---

## Integration with External Ticketing Systems (SIEM Connector)

```typescript
// Export incident to ServiceNow / Jira via Logic App or webhook
// Pattern: Sentinel automation rule → Logic App → External ITSM

// The Logic App receives incident data as:
interface SentinelIncidentPayload {
  object: {
    id: string;
    name: string;
    type: string;
    properties: {
      title: string;
      description: string;
      severity: string;
      status: string;
      incidentNumber: number;
      createdTimeUtc: string;
      firstActivityTimeUtc: string;
      lastActivityTimeUtc: string;
      labels: Array<{ labelName: string }>;
      owner: { email: string; name: string; objectId: string };
      relatedAnalyticRuleIds: string[];
    };
  };
  workspaceInfo: {
    SubscriptionId: string;
    ResourceGroupName: string;
    WorkspaceName: string;
  };
}
```

---

## Incident Reporting (KQL)

```kql
// Incidents by severity and status — last 30 days
let timeRange = 30d;
SecurityIncident
| where TimeGenerated > ago(timeRange)
| where TimeGenerated == LastModifiedTime  // Get latest state per incident
| summarize Count=count() by Severity, Status
| order by Severity asc

// MTTR by severity (minutes)
SecurityIncident
| where TimeGenerated > ago(90d)
| where Status == "Closed"
| extend MTTR_minutes = datetime_diff('minute', ClosedTime, CreatedTime)
| summarize Avg_MTTR=avg(MTTR_minutes), Median_MTTR=percentile(MTTR_minutes, 50),
    P90_MTTR=percentile(MTTR_minutes, 90), Count=count()
  by Severity
| order by Severity asc

// False positive rate by analytics rule
SecurityIncident
| where TimeGenerated > ago(90d)
| where Status == "Closed"
| extend IsFP = iff(Classification == "FalsePositive", 1, 0)
| summarize Total=count(), FalsePositives=sum(IsFP),
    FP_Rate=round(todouble(sum(IsFP)) / count() * 100, 1)
  by ProductName = tostring(RelatedAnalyticRuleIds[0])
| where Total > 5
| order by FP_Rate desc
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidIncidentId` | Incident ID format invalid | Ensure ID is a valid GUID |
| 400 `InvalidClassification` | Invalid classification/reason combination | Check allowed values table above |
| 403 `Forbidden` | Missing Sentinel Responder or higher role | Assign role on workspace |
| 404 `IncidentNotFound` | Incident not found | Verify workspace path and incident ID |
| 409 `ETagMismatch` | Concurrent modification conflict | Re-fetch incident ETag and retry with `If-Match` header |
| 429 `TooManyRequests` | ARM throttled | Retry with `Retry-After` delay |
| `PlaybookNotFound` | Logic App resource ID wrong | Verify Logic App exists and ARM ID is correct |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Incidents retained | Unlimited | Limited by Log Analytics workspace retention (90-730 days) |
| Incidents per incident list call | 100 per page | Paginate with `nextLink` |
| Comments per incident | 100 | — |
| Labels per incident | 50 | — |
| Tasks per incident | 50 | — |
| Automation rules per workspace | 512 | — |
| Playbook actions per automation rule | 5 | — |
| Incident number | Auto-incrementing integer | Cannot be reset |

---

## Common Patterns and Gotchas

1. **ETag for optimistic concurrency** — Sentinel PATCH operations support `If-Match: {etag}` to prevent overwriting concurrent analyst changes. Always include the ETag from the GET response when updating incidents in automation.

2. **Incident vs alert** — Alerts are the raw detection signals; incidents group one or more related alerts. Closing an incident does NOT close the underlying alerts. Alerts remain in their original state.

3. **SecurityIncident table** — The `SecurityIncident` KQL table in Log Analytics records all state changes for every incident. Each row is a snapshot, not a current state. Use `| where TimeGenerated == LastModifiedTime` to get current state per incident.

4. **Defender XDR vs Sentinel incidents** — When the M365 Defender connector syncs incidents into Sentinel, Defender incidents become Sentinel incidents. Updates in either portal sync bidirectionally. Do not create duplicate manual incidents for the same event.

5. **Automation rule order matters** — Automation rules are evaluated in order (1, 2, 3...). The first matching rule's actions execute; subsequent rules may or may not also run depending on the `Continue processing` setting. Test order carefully.

6. **Playbook response time** — Logic App-based playbooks may take 1-5 minutes to execute enrichment actions. For time-critical actions (device isolation), trigger the MDE API directly from the playbook without waiting for Sentinel roundtrip.

7. **False positive rate tracking** — Track FP rate per analytics rule monthly. Rules with >30% FP rate should be tuned (add exclusions, increase confidence threshold). Untuned rules burn analyst time and build false alert fatigue.

8. **Incident merge** — Sentinel supports manual incident merging from the portal but not via API. Merging consolidates alerts from two incidents into one. Use for correlated events that the analytics rule failed to group.

9. **Closed incidents persist** — Sentinel retains closed incidents for the duration of the Log Analytics workspace retention. This is important for SOC metrics and forensic review. Do not delete incidents unless they are test/invalid.

10. **Assign to group vs individual** — Sentinel supports assigning incidents to individual users (by Entra object ID). For on-call rotation, use a Logic App that queries an on-call schedule API and dynamically assigns to the current on-call analyst.
