# Alerting — Data Activator Patterns, Azure Monitor Alerts, Notification Routing

This reference covers alerting strategies for Microsoft Fabric: Data Activator for event-driven alerting, Azure Monitor for metric-based alerts, notification routing patterns, and alert management at scale.

---

## Alerting Architecture

```
Fabric Events (pipeline failures, data quality issues, freshness breaches)
    │
    ├──► Data Activator (Reflex items)
    │         → Email, Teams, Power Automate
    │
    ├──► Azure Monitor Alerts (metric thresholds)
    │         → Action Groups → Email, SMS, ITSM, Webhook
    │
    └──► Custom webhooks from notebooks/pipelines
              → PagerDuty, ServiceNow, Opsgenie
```

---

## Data Activator Alerting Patterns

### Pattern 1: Pipeline Failure Alert

```
Architecture:
Custom App → Fabric Eventstream → Reflex item
              (sends completion events)

Pipeline sends event on completion:
{
  "pipelineId": "abc-123",
  "pipelineName": "DailySalesETL",
  "status": "Failed",
  "errorCode": "SparkJobFailed",
  "errorMessage": "OutOfMemoryError",
  "workspaceName": "Analytics-Prod",
  "timestamp": "2025-03-15T03:45:12Z"
}

Reflex item:
  Object: DataPipeline (key: pipelineName)
  Property: status
  Trigger: status changes to "Failed"
  Cooldown: 30 minutes
  Action: Email ops-team@contoso.com + Teams post to #data-platform-alerts
```

### Pattern 2: Data Freshness Alert

```python
# Notebook that runs every 15 minutes to check freshness
# and sends events to an eventstream if freshness is breached

from notebookutils import mssparkutils
import requests
import json
from datetime import datetime, timezone

def check_freshness_and_alert(table_name: str, slo_minutes: int) -> dict:
    """Check if a Delta table was updated within the SLO window."""
    df = spark.read.format("delta").table(table_name)
    last_modified = df.select("_commit_timestamp").agg({"_commit_timestamp": "max"}).collect()[0][0]

    freshness_minutes = (datetime.now(timezone.utc) - last_modified.replace(tzinfo=timezone.utc)).total_seconds() / 60

    return {
        "tableName": table_name,
        "lastModified": last_modified.isoformat(),
        "freshnessMinutes": round(freshness_minutes, 1),
        "sloBreach": freshness_minutes > slo_minutes,
        "sloMinutes": slo_minutes,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Check critical tables
critical_tables = [
    ("gold.FactSales", 120),
    ("gold.CustomerMetrics", 60),
    ("gold.InventoryLevel", 30)
]

events = [check_freshness_and_alert(t, slo) for t, slo in critical_tables]

# Send events to eventstream (which feeds a Reflex item)
connection_string = mssparkutils.credentials.getSecret(
    "https://kv-contoso.vault.azure.net/", "eventstream-connection-string"
)

for event in events:
    if event["sloBreach"]:
        # Send event to Reflex via eventstream
        from azure.eventhub import EventHubProducerClient, EventData
        producer = EventHubProducerClient.from_connection_string(connection_string)
        batch = producer.create_batch()
        batch.add(EventData(json.dumps(event)))
        producer.send_batch(batch)
        producer.close()
```

### Pattern 3: Semantic Model Stale Alert

```
Setup:
1. Create eventstream with Custom App source
2. Schedule a notebook every 30 minutes that checks dataset refresh history
3. Notebook sends a "refresh missed" event to the eventstream if dataset is stale
4. Reflex item monitors events:
   - Object: SemanticModel (key: modelName)
   - Property: freshnessMinutes
   - Trigger: freshnessMinutes > 180 remains true for 30 minutes
   - Action: Email to model owner + Teams to #bi-platform
```

---

## Azure Monitor Alert Configuration

### Metric Alert — Capacity CU Utilization

```bash
# Create a metric alert for Fabric capacity
az monitor metrics alert create \
  --name "FabricHighCUUtilization" \
  --resource-group "rg-fabric" \
  --scopes "/subscriptions/${SUB_ID}/resourceGroups/rg-fabric/providers/Microsoft.Fabric/capacities/${CAPACITY_NAME}" \
  --condition "avg CUConsumptionMetric > 85" \
  --window-size "PT15M" \
  --evaluation-frequency "PT5M" \
  --severity 2 \
  --description "Fabric capacity CU utilization exceeded 85% for 15 minutes" \
  --action "${ACTION_GROUP_ID}"

# Create a metric alert for capacity throttling
az monitor metrics alert create \
  --name "FabricCapacityThrottling" \
  --resource-group "rg-fabric" \
  --scopes "/subscriptions/${SUB_ID}/resourceGroups/rg-fabric/providers/Microsoft.Fabric/capacities/${CAPACITY_NAME}" \
  --condition "avg ThrottlingPercentage > 5" \
  --window-size "PT10M" \
  --evaluation-frequency "PT5M" \
  --severity 1 \
  --description "Fabric capacity is throttling operations" \
  --action "${ACTION_GROUP_ID}"
```

### Log-Based Alert — Pipeline Failures (Log Analytics)

```bash
# Create a scheduled query alert for pipeline failures
az monitor scheduled-query create \
  --name "FabricPipelineFailures" \
  --resource-group "rg-monitoring" \
  --scopes "/subscriptions/${SUB_ID}/resourceGroups/rg-monitoring/providers/Microsoft.OperationalInsights/workspaces/${LOG_WORKSPACE}" \
  --condition-query "
    FabricOperations
    | where TimeGenerated > ago(15m)
    | where Category == 'DataPipeline' and ResultType == 'Failed'
    | where PipelineName in ('DailySalesETL', 'FinanceDataLoad', 'CustomerSync')
    | summarize FailureCount = count()
  " \
  --condition-threshold 0 \
  --condition-operator "GreaterThan" \
  --evaluation-frequency "PT5M" \
  --window-size "PT15M" \
  --severity 2 \
  --action-groups "${ACTION_GROUP_ID}"
```

### Action Groups

```bash
# Create an action group with email + webhook
az monitor action-group create \
  --resource-group "rg-ops" \
  --name "DataPlatformOps" \
  --short-name "DPOps" \
  --email-receivers name="OpsTeam" email-address="data-ops@contoso.com" \
  --webhook-receivers \
    name="PagerDuty" \
    service-uri="https://events.pagerduty.com/integration/${INTEGRATION_KEY}/enqueue" \
    use-common-alert-schema true
```

---

## Notification Routing Patterns

### Route by Severity

```python
# Python webhook handler — route alerts based on severity
from flask import Flask, request, jsonify

app = Flask(__name__)

ROUTING = {
    "P1": {
        "email": ["on-call@contoso.com", "platform-lead@contoso.com"],
        "teams_channel": "#p1-incidents",
        "pagerduty": True,
        "slack": "#critical-alerts"
    },
    "P2": {
        "email": ["data-ops@contoso.com"],
        "teams_channel": "#data-platform-alerts",
        "pagerduty": False,
        "slack": "#data-platform-alerts"
    },
    "P3": {
        "email": ["data-team@contoso.com"],
        "teams_channel": "#data-platform-info",
        "pagerduty": False,
        "slack": None
    }
}

def classify_alert(alert: dict) -> str:
    """Classify alert severity based on context."""
    pipeline_name = alert.get("pipelineName", "")
    error_code = alert.get("errorCode", "")

    # P1: Critical pipelines or data corruption errors
    if pipeline_name in ("DailySalesETL", "FinanceClose") or error_code == "DataCorruption":
        return "P1"
    # P2: Important pipelines
    elif pipeline_name in ("CustomerSync", "InventoryUpdate"):
        return "P2"
    # P3: Non-critical
    else:
        return "P3"

@app.route("/webhook/fabric-alert", methods=["POST"])
def handle_alert():
    alert = request.get_json()
    severity = classify_alert(alert)
    routing = ROUTING[severity]

    # Route to appropriate channels
    send_teams_message(routing["teams_channel"], alert, severity)
    send_emails(routing["email"], alert, severity)
    if routing["pagerduty"]:
        trigger_pagerduty(alert, severity)

    return jsonify({"status": "routed", "severity": severity}), 200
```

### On-Call Schedule Integration

```python
# Determine on-call person from schedule
import requests

def get_on_call_contact(service_name: str) -> str:
    """Get current on-call contact from PagerDuty API."""
    resp = requests.get(
        f"https://api.pagerduty.com/oncalls?escalation_policy_ids[]={POLICY_ID}&limit=1",
        headers={"Authorization": f"Token token={PAGERDUTY_TOKEN}"}
    )
    oncalls = resp.json().get("oncalls", [])
    if oncalls:
        return oncalls[0]["user"]["email"]
    return "data-ops@contoso.com"  # Fallback
```

---

## Alert Lifecycle Management

### Alert Deduplication

Prevent duplicate alerts for the same incident:

```python
import redis
import hashlib

def deduplicate_alert(alert_key: str, suppression_minutes: int = 30) -> bool:
    """Return True if alert should be suppressed (duplicate)."""
    redis_client = redis.Redis(host="redis-host", port=6379, decode_responses=True)
    cache_key = f"fabric_alert:{hashlib.md5(alert_key.encode()).hexdigest()}"

    if redis_client.exists(cache_key):
        return True  # Suppress duplicate

    # Store with expiry
    redis_client.setex(cache_key, suppression_minutes * 60, "active")
    return False  # New alert — send it

# Usage
alert_key = f"{pipeline_name}:{error_code}"
if not deduplicate_alert(alert_key, suppression_minutes=30):
    send_alert(alert)
```

### Alert Escalation Pattern

```python
def escalate_unresolved_alert(alert: dict, minutes_unresolved: int):
    """Escalate an alert if it has not been resolved after N minutes."""
    if minutes_unresolved >= 30 and not alert.get("acknowledged"):
        # Escalate to manager
        send_email("manager@contoso.com", f"ESCALATION: Unresolved P2 alert - {alert['pipelineName']}")
    if minutes_unresolved >= 60 and not alert.get("resolved"):
        # Create P1 incident
        create_pagerduty_incident(alert, severity="critical")
```

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `403 on action group webhook` | Webhook endpoint returned 403 | Verify bearer token / API key in webhook URL; rotate credentials |
| `Alert not firing` | Threshold never met; query returns 0 rows | Test query in Log Analytics directly; verify MetricName spelling |
| `Duplicate alerts` | Cooldown not configured; alert fires multiple times | Set appropriate cooldown in Data Activator; add deduplication logic |
| `Alert fires but no notification` | Action group misconfigured; email in spam | Verify action group email; check spam folder; use webhook fallback |
| `Azure Monitor metric not found` | Metric name incorrect for resource type | Use `az monitor metrics list-definitions --resource` to discover metric names |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Data Activator triggers per Reflex | 100 | |
| Azure Monitor alerts per subscription | 5,000 | |
| Action group members | 10 per action type | |
| Scheduled query alert window | 2 days max | |
| Alert evaluation frequency (Azure Monitor) | 1 minute minimum | |
| Action group webhook timeout | 30 seconds | Webhook handler must respond within 30s |
