---
name: sentinel-analytics-rule
description: Create, update, or tune Microsoft Sentinel analytics rules — Scheduled, NRT, and MicrosoftSecurityIncidentCreation rules with MITRE mapping, entity extraction, and alert grouping
argument-hint: "<action> [--kind <Scheduled|NRT|MicrosoftSecurity>] [--rule-id <id>] [--template-id <id>] [--name <name>]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Sentinel Analytics Rule Management

Create new analytics rules from scratch or from Microsoft templates, update existing rules (tune thresholds, adjust frequency, disable noisy rules), and deploy detection rules with proper MITRE mapping and entity extraction.

## Arguments

- `<action>`: `create`, `update`, `disable`, `enable`, `list`, `from-template`
- `--kind`: Rule kind: `Scheduled`, `NRT`, `MicrosoftSecurity`
- `--rule-id`: ARM rule ID for update/disable/enable operations
- `--template-id`: Template ID for `from-template` action
- `--name`: Display name filter for `list` action

## Integration Context Check

Require:
- `SENTINEL_WORKSPACE_RESOURCE_ID`
- `SENTINEL_SUBSCRIPTION_ID`, `SENTINEL_RESOURCE_GROUP`, `SENTINEL_WORKSPACE_NAME`
- Role: `Microsoft Sentinel Contributor`

## Action: list

List all configured analytics rules:

```bash
az rest --method GET \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/alertRules?api-version=2023-02-01" \
  --query "value[].{
    Name: properties.displayName,
    Kind: kind,
    Enabled: properties.enabled,
    Severity: properties.severity,
    Frequency: properties.queryFrequency,
    LastRun: properties.lastModifiedUtc
  }" -o table
```

## Action: from-template

### List Available Templates

```bash
az rest --method GET \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/alertRuleTemplates?api-version=2023-02-01" \
  --query "value[?kind=='Scheduled'].{Id: name, DisplayName: properties.displayName, Severity: properties.severity, Tactics: properties.tactics}" -o table
```

### Deploy Rule from Template

Retrieve template and instantiate:

```bash
TEMPLATE=$(az rest --method GET \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/alertRuleTemplates/{templateId}?api-version=2023-02-01")

az rest --method PUT \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/alertRules/{newRuleId}?api-version=2023-02-01" \
  --body "{
    \"kind\": \"Scheduled\",
    \"properties\": {
      \"displayName\": \"{template_displayName}\",
      \"description\": \"{template_description}\",
      \"severity\": \"{template_severity}\",
      \"enabled\": true,
      \"query\": \"{template_query}\",
      \"queryFrequency\": \"{template_queryFrequency}\",
      \"queryPeriod\": \"{template_queryPeriod}\",
      \"triggerOperator\": \"{template_triggerOperator}\",
      \"triggerThreshold\": {template_triggerThreshold},
      \"suppressionDuration\": \"PT5H\",
      \"suppressionEnabled\": false,
      \"tactics\": {template_tactics},
      \"techniques\": {template_techniques},
      \"entityMappings\": {template_entityMappings},
      \"incidentConfiguration\": {
        \"createIncident\": true,
        \"groupingConfiguration\": {
          \"enabled\": true,
          \"reopenClosedIncident\": false,
          \"lookbackDuration\": \"PT5H\",
          \"matchingMethod\": \"AllEntities\",
          \"groupByEntities\": []
        }
      },
      \"alertDetailsOverride\": null,
      \"customDetails\": null
    }
  }"
```

## Action: create (Scheduled Rule)

Guided creation for a new Scheduled analytics rule.

Use `AskUserQuestion` if called interactively to collect:
1. Display name
2. Severity
3. KQL query
4. Run frequency (queryFrequency)
5. Lookback period (queryPeriod)
6. MITRE tactics and techniques

### Rule Creation Template

```bash
az rest --method PUT \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/alertRules/{ruleId}?api-version=2023-02-01" \
  --body '{
    "kind": "Scheduled",
    "properties": {
      "displayName": "{displayName}",
      "description": "{description}",
      "severity": "{severity}",
      "enabled": true,
      "query": "{kqlQuery}",
      "queryFrequency": "{queryFrequency}",
      "queryPeriod": "{queryPeriod}",
      "triggerOperator": "GreaterThan",
      "triggerThreshold": 0,
      "suppressionDuration": "PT1H",
      "suppressionEnabled": false,
      "tactics": {tacticsArray},
      "techniques": {techniquesArray},
      "entityMappings": {entityMappings},
      "incidentConfiguration": {
        "createIncident": true,
        "groupingConfiguration": {
          "enabled": true,
          "reopenClosedIncident": false,
          "lookbackDuration": "PT5H",
          "matchingMethod": "Selected",
          "groupByEntities": ["Account"]
        }
      }
    }
  }'
```

### Entity Mapping Templates

**Account entity:**
```json
{
  "entityType": "Account",
  "fieldMappings": [
    { "identifier": "Name", "columnName": "AccountName" },
    { "identifier": "UPNSuffix", "columnName": "AccountDomain" }
  ]
}
```

**Host entity:**
```json
{
  "entityType": "Host",
  "fieldMappings": [
    { "identifier": "HostName", "columnName": "Computer" },
    { "identifier": "OSFamily", "columnName": "OperatingSystem" }
  ]
}
```

**IP entity:**
```json
{
  "entityType": "IP",
  "fieldMappings": [
    { "identifier": "Address", "columnName": "IPAddress" }
  ]
}
```

**Process entity:**
```json
{
  "entityType": "Process",
  "fieldMappings": [
    { "identifier": "CommandLine", "columnName": "ProcessCommandLine" },
    { "identifier": "ProcessId", "columnName": "ProcessId" }
  ]
}
```

## Action: create (NRT Rule)

NRT rules are identical to Scheduled except `kind: NRT` and no `queryFrequency`/`queryPeriod`:

```bash
az rest --method PUT \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/alertRules/{ruleId}?api-version=2023-02-01" \
  --body '{
    "kind": "NRT",
    "properties": {
      "displayName": "{displayName}",
      "severity": "{severity}",
      "enabled": true,
      "query": "{kqlQuery}",
      "tactics": {tacticsArray},
      "techniques": {techniquesArray},
      "entityMappings": {entityMappings},
      "incidentConfiguration": {
        "createIncident": true,
        "groupingConfiguration": {
          "enabled": false,
          "lookbackDuration": "PT5M",
          "matchingMethod": "AllEntities",
          "groupByEntities": []
        }
      }
    }
  }'
```

## Action: update (Tune Rule)

Common tuning operations:

**Raise threshold to reduce noise:**
```bash
az rest --method PATCH \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/alertRules/{ruleId}?api-version=2023-02-01" \
  --body '{"properties": {"triggerThreshold": 5}}'
```

**Adjust frequency:**
```bash
az rest --method PATCH \
  --uri ".../{ruleId}?api-version=2023-02-01" \
  --body '{"properties": {"queryFrequency": "PT15M", "queryPeriod": "PT1H"}}'
```

**Enable suppression (1 hour):**
```bash
az rest --method PATCH \
  --uri ".../{ruleId}?api-version=2023-02-01" \
  --body '{"properties": {"suppressionEnabled": true, "suppressionDuration": "PT1H"}}'
```

## Action: disable / enable

```bash
az rest --method PATCH \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/alertRules/{ruleId}?api-version=2023-02-01" \
  --body '{"properties": {"enabled": false}}'
```

Set `enabled: true` to re-enable.

## Output Format

```markdown
# Sentinel Analytics Rule Report
**Action:** {action} | **Timestamp:** {timestamp}

## Rule: {displayName}
- **ID:** {ruleId}
- **Kind:** {kind}
- **Severity:** {severity}
- **Enabled:** {enabled}
- **Frequency:** {queryFrequency} / Period: {queryPeriod}
- **Threshold:** >{triggerThreshold} results
- **MITRE Tactics:** {tactics}
- **MITRE Techniques:** {techniques}
- **Entity Mappings:** {entityTypes}

## KQL Query
```kql
{query}
```

## Grouping Configuration
- **Create incident:** {createIncident}
- **Group by:** {groupByEntities}
- **Lookback:** {lookbackDuration}

## Status
{action} completed successfully. Rule is now {enabled/disabled}.

## Recommendations
- Monitor false positive rate for the first 24 hours
- Consider raising triggerThreshold if noise exceeds 5 incidents/day
- Review MITRE mapping against ATT&CK Navigator for coverage gaps
```
