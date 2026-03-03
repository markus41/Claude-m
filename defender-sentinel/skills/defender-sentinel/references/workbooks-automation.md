# Workbooks and SOAR Automation — Microsoft Sentinel Reference

Sentinel workbooks provide visualization dashboards built on Azure Monitor Workbooks. SOAR automation uses Logic Apps (playbooks) triggered by analytics rule alerts or incidents. Together they provide SOC dashboards and automated response workflows.

---

## REST API Endpoints — Workbooks (ARM)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/workbooks?api-version=2022-04-01` | `Monitoring Reader` | `$filter=category eq 'sentinel'` | List workbooks |
| GET | `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/workbooks/{id}?api-version=2022-04-01` | `Monitoring Reader` | — | Get workbook |
| PUT | `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/workbooks/{id}?api-version=2022-04-01` | `Monitoring Contributor` | Body: workbook | Create or update workbook |
| DELETE | `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/workbooks/{id}?api-version=2022-04-01` | `Monitoring Contributor` | — | Delete workbook |

## REST API Endpoints — Automation Rules (Sentinel ARM)

**Base path:** `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}/providers/Microsoft.SecurityInsights`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/automationRules?api-version=2023-02-01` | `Microsoft Sentinel Reader` | — | List automation rules |
| PUT | `/automationRules/{ruleId}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | Body: rule | Create automation rule |
| PATCH | `/automationRules/{ruleId}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | Partial | Update rule |
| DELETE | `/automationRules/{ruleId}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | — | Delete rule |

## REST API Endpoints — Watchlists (Sentinel ARM)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/watchlists?api-version=2023-02-01` | `Microsoft Sentinel Reader` | — | List watchlists |
| PUT | `/watchlists/{alias}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | Body: watchlist | Create watchlist |
| GET | `/watchlists/{alias}/watchlistItems?api-version=2023-02-01` | `Microsoft Sentinel Reader` | `$top` | List items |
| PUT | `/watchlists/{alias}/watchlistItems/{itemId}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | Body: item | Add/update item |
| DELETE | `/watchlists/{alias}/watchlistItems/{itemId}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | — | Remove item |

## REST API Endpoints — Threat Intelligence (Sentinel ARM)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/threatIntelligence/main/indicators?api-version=2023-02-01` | `Microsoft Sentinel Reader` | `$filter`, `$top` | List TI indicators |
| POST | `/threatIntelligence/main/createIndicator?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | Body: STIX indicator | Add indicator |
| DELETE | `/threatIntelligence/main/indicators/{id}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | — | Delete indicator |
| POST | `/threatIntelligence/main/queryIndicators?api-version=2023-02-01` | `Microsoft Sentinel Reader` | Body: filter query | Query indicators |

---

## Sentinel Workbook Gallery

Built-in Sentinel workbooks available as templates:

| Workbook Name | Category | Description |
|---------------|----------|-------------|
| Microsoft Sentinel Overview | Overview | Incident/alert summary, data connector health |
| Investigations Insights | Investigation | Entity timeline, alert drill-down |
| Analytics Rule Efficiency | SOC Ops | True/false positive rates, MTTR by rule |
| Microsoft Entra ID | Identity | Sign-in patterns, CA policy coverage, risky users |
| Defender for Endpoint | Endpoint | Device compliance, vulnerability, threat detections |
| Azure Activity | Cloud | Resource changes, policy violations |
| Microsoft 365 Defender | XDR | Unified incident dashboard |
| MITRE ATT&CK Coverage | Threat Intel | Detection coverage heatmap |
| Security Operations Efficiency | Metrics | Incident volume, queue age, analyst productivity |
| Zero Trust | Compliance | ZT pillar coverage across tenants |

---

## Workbook ARM Template (Minimal Example)

```json
{
  "type": "Microsoft.Insights/workbooks",
  "apiVersion": "2022-04-01",
  "name": "{workbookId-guid}",
  "location": "eastus",
  "kind": "shared",
  "tags": {
    "hidden-title": "SOC Daily Summary"
  },
  "properties": {
    "displayName": "SOC Daily Summary",
    "category": "sentinel",
    "version": "1.0",
    "serializedData": "{\"version\":\"Notebook/1.0\",\"items\":[{\"type\":1,\"content\":{\"json\":\"## Daily SOC Summary\\n\\nUse the filters below to scope the dashboard.\"},\"name\":\"header\"},{\"type\":3,\"content\":{\"version\":\"KqlItem/1.0\",\"query\":\"SecurityIncident\\n| where TimeGenerated > ago(24h)\\n| where TimeGenerated == LastModifiedTime\\n| summarize Count=count() by Severity\\n| order by Severity asc\",\"size\":1,\"title\":\"Incidents Last 24h by Severity\",\"queryType\":0,\"resourceType\":\"microsoft.operationalinsights/workspaces\",\"visualization\":\"barchart\"},\"name\":\"incidents-chart\"}]}",
    "sourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}"
  }
}
```

---

## Logic App Playbook — Incident Trigger Pattern

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "Microsoft.Logic/workflows",
      "apiVersion": "2019-05-01",
      "name": "SOC-Enrich-and-Notify",
      "location": "[resourceGroup().location]",
      "identity": {
        "type": "SystemAssigned"
      },
      "properties": {
        "definition": {
          "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
          "triggers": {
            "Microsoft_Sentinel_incident": {
              "type": "ApiConnectionWebhook",
              "inputs": {
                "host": {
                  "connection": {
                    "name": "@parameters('$connections')['azuresentinel']['connectionId']"
                  }
                },
                "body": {
                  "callback_url": "@{listCallbackUrl()}"
                },
                "path": "/incident-creation"
              }
            }
          },
          "actions": {
            "Get_incident_entities": {
              "type": "ApiConnection",
              "inputs": {
                "host": {
                  "connection": { "name": "@parameters('$connections')['azuresentinel']['connectionId']" }
                },
                "method": "post",
                "body": "@triggerBody()?['object']?['properties']?['relatedEntities']",
                "path": "/entities/enrich"
              },
              "runAfter": {}
            },
            "Post_Teams_notification": {
              "type": "ApiConnection",
              "inputs": {
                "host": {
                  "connection": { "name": "@parameters('$connections')['teams']['connectionId']" }
                },
                "method": "post",
                "body": {
                  "recipient": {
                    "groupId": "{soc-teams-channel-group-id}",
                    "channelId": "{soc-alerts-channel-id}"
                  },
                  "messageBody": "<h2>🚨 New Incident: @{triggerBody()?['object']?['properties']?['title']}</h2><p>Severity: <b>@{triggerBody()?['object']?['properties']?['severity']}</b></p><p>Incident URL: @{triggerBody()?['object']?['properties']?['incidentUrl']}</p>"
                },
                "path": "/beta/teams/conversation/message/poster/Flow Bot/location/@{encodeURIComponent('channel')}"
              },
              "runAfter": {
                "Get_incident_entities": ["Succeeded", "Failed"]
              }
            },
            "Add_incident_comment": {
              "type": "ApiConnection",
              "inputs": {
                "host": {
                  "connection": { "name": "@parameters('$connections')['azuresentinel']['connectionId']" }
                },
                "method": "post",
                "body": {
                  "incidentArmId": "@triggerBody()?['object']?['id']",
                  "message": "Automated: Teams notification sent. Enrichment complete. Assigned to SOC queue."
                },
                "path": "/Incidents/Comment"
              },
              "runAfter": {
                "Post_Teams_notification": ["Succeeded"]
              }
            }
          }
        }
      }
    }
  ]
}
```

---

## Common Playbook Action Patterns

### Disable Entra ID User (Graph API Action)

```typescript
// In Logic App: HTTP action calling Graph
const action = {
  type: 'Http',
  inputs: {
    method: 'PATCH',
    uri: `https://graph.microsoft.com/v1.0/users/@{triggerBody()?['object']?['properties']?['relatedEntities'][0]?['properties']?['userPrincipalName']}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer @{body(\'Get_Graph_Token\')?[\'access_token\']}'
    },
    body: {
      accountEnabled: false
    }
  }
};
```

### Isolate Device via MDE API

```http
POST https://api.securitycenter.microsoft.com/api/machines/{machineId}/isolate
Authorization: Bearer {mde-token}
Content-Type: application/json

{
  "Comment": "Automated isolation triggered by Sentinel playbook — Incident @{triggerBody()?['object']?['properties']?['incidentNumber']}",
  "IsolationType": "Full"
}
```

### Block IP in Azure Firewall

```typescript
// Add IP to deny list via Azure Firewall Policy or NSG
const nsgRuleBody = {
  properties: {
    priority: 100,
    protocol: '*',
    sourceAddressPrefix: '<malicious-ip>',
    sourcePortRange: '*',
    destinationAddressPrefix: '*',
    destinationPortRange: '*',
    access: 'Deny',
    direction: 'Inbound',
    description: `Blocked by Sentinel playbook — Incident ${incidentNumber}`
  }
};
```

---

## Automation Rules (Sentinel)

Automation rules run before playbooks — they can modify properties and trigger playbooks without Logic App complexity.

```json
{
  "kind": "Automation",
  "properties": {
    "displayName": "Triage: Auto-close known false positives",
    "order": 1,
    "triggeringLogic": {
      "isEnabled": true,
      "triggersOn": "Incidents",
      "triggersWhen": "Created",
      "conditions": [
        {
          "conditionType": "Property",
          "conditionProperties": {
            "propertyName": "IncidentProviderName",
            "operator": "Contains",
            "propertyValues": ["Microsoft Defender Advanced Threat Protection"]
          }
        },
        {
          "conditionType": "Property",
          "conditionProperties": {
            "propertyName": "IncidentTitle",
            "operator": "Contains",
            "propertyValues": ["Test Alert - Do Not Act"]
          }
        }
      ]
    },
    "actions": [
      {
        "order": 1,
        "actionType": "ModifyProperties",
        "actionConfiguration": {
          "status": "Closed",
          "classification": "FalsePositive",
          "classificationReason": "IncorrectAlertLogic",
          "classificationComment": "Automatically closed — known test alert pattern"
        }
      }
    ]
  }
}
```

---

## Watchlists

Watchlists are key-value reference tables in Sentinel used for enrichment and correlation.

```typescript
// Create a watchlist (high-value asset targets)
const watchlist = await fetch(
  `${sentinelBase}/watchlists/high-value-assets?api-version=2023-02-01`,
  {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        watchlistAlias: 'high-value-assets',
        displayName: 'High Value Assets',
        description: 'Servers and accounts requiring special monitoring',
        provider: 'Microsoft',
        source: 'Manual',
        itemsSearchKey: 'AssetName',
        rawContent: 'AssetName,AssetType,Owner,Criticality\nDC01,DomainController,infra-team@contoso.com,Critical\nSQL-PROD,Database,db-team@contoso.com,High'
      }
    })
  }
);

// Use watchlist in KQL detection rule
const kqlWithWatchlist = `
let highValueAssets = _GetWatchlist('high-value-assets')
    | project AssetName, Criticality;
SecurityEvent
| where EventID == 4624
| join kind=inner highValueAssets on $left.Computer == $right.AssetName
| where Criticality == "Critical"
| project TimeGenerated, Computer, AccountName, Criticality, LogonType
`;
```

---

## Threat Intelligence Indicators

```typescript
// Add a threat indicator (IP IOC)
const indicator = await fetch(
  `${sentinelBase}/threatIntelligence/main/createIndicator?api-version=2023-02-01`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'indicator',
      properties: {
        source: 'MyThreatFeed',
        pattern: "[ipv4-addr:value = '198.51.100.42']",
        patternType: 'ipv4-addr',
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        confidence: 85,
        threatTypes: ['malicious-activity'],
        displayName: 'Known C2 Server — Campaign X',
        description: 'IP associated with APT campaign targeting financial sector',
        labels: ['C2', 'APT', 'financial']
      }
    })
  }
);
```

---

## Entity Enrichment in Playbooks

```typescript
// Pattern: Get entities → enrich each → add enriched comment
interface PlaybookEnrichmentFlow {
  step1: 'Get incident entities via POST .../entities';
  step2: 'For each Account entity: GET /users/{upn}?$select=signInActivity,riskLevel';
  step3: 'For each IP entity: POST to VirusTotal or MDTI API';
  step4: 'For each Host entity: GET from MDE /api/machines?$filter=computerDnsName';
  step5: 'Build enrichment summary markdown string';
  step6: 'POST enrichment summary as incident comment';
  step7: 'If high-risk: PATCH incident severity to High';
}
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidWorkbookContent` | Workbook JSON malformed | Validate `serializedData` JSON structure |
| 400 `InvalidAutomationRule` | Automation rule condition/action mismatch | Check condition properties against allowed values |
| 403 `Forbidden` | Missing Sentinel Contributor or Logic App Contributor | Assign both roles on respective resources |
| 404 `WatchlistNotFound` | Watchlist alias not found | Verify alias matches exactly (case-sensitive) |
| 409 `AutomationRuleConflict` | Duplicate rule order or name | Change order number or display name |
| 429 `TooManyRequests` | ARM throttled | Retry with exponential backoff |
| `LogicAppFailed` | Playbook execution failed | Check Logic App run history in Azure portal |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Automation rules per workspace | 512 | Includes disabled rules |
| Actions per automation rule | 5 | Combine actions in Logic App for more |
| Playbook (Logic App) run timeout | 90 seconds default | Async pattern for longer operations |
| Watchlists per workspace | 100 | — |
| Watchlist items per watchlist | 10 million rows | CSV upload max 50 MB |
| TI indicators per workspace | Unlimited | Large volumes slow query performance |
| Workbooks per workspace | Unlimited | — |

---

## Common Patterns and Gotchas

1. **Managed identity for playbooks** — Always use system-assigned managed identity on Logic Apps instead of connection credentials. Assign the managed identity the `Microsoft Sentinel Responder` role on the workspace.

2. **Playbook permissions** — The managed identity needs explicit role assignments: `Microsoft Sentinel Responder` (to update incidents), plus appropriate permissions for any external API calls (e.g., Graph, MDE API).

3. **Alert trigger vs incident trigger** — Use the **incident trigger** for most playbooks (access to full incident context including all alerts and entities). Use the **alert trigger** only for legacy scenarios or when individual alert data is needed before grouping.

4. **Logic App throttling** — The Sentinel connector in Logic Apps is throttled to 100 runs per minute per workspace. For high-volume workspaces, batch operations or queue-based patterns.

5. **Workbook serializedData format** — Workbooks are serialized as a large JSON string inside the ARM template. Always build workbooks in the Azure portal UI first, then export to ARM template. Hand-coding the JSON is error-prone.

6. **Automation rule ordering** — Rules are evaluated in ascending `order` number. Leave gaps (10, 20, 30) to allow inserting new rules later without renumbering all existing rules.

7. **Watchlist search key** — The `itemsSearchKey` field must be a column name that exists in your CSV. It determines which field is indexed for `_GetWatchlist()` join operations. Choose a column with unique values.

8. **TI indicator confidence** — STIX indicators require a `confidence` value (0-100). Sentinel uses this to weight detection matches. Low-confidence indicators generate informational alerts; high-confidence triggers actionable alerts.

9. **Entity enrichment latency** — Enrichment playbooks add 1-5 minutes to incident triage time. For time-critical actions (ransomware propagation, device isolation), trigger containment actions immediately and enrichment asynchronously.

10. **Workbook category = sentinel** — When deploying workbooks via ARM, always set `category: "sentinel"` to ensure they appear in the Sentinel workbook gallery. Without this tag, workbooks appear only in the Azure Monitor workbooks gallery.
