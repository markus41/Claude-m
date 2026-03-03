# Replication Monitoring — Latency Tracking, Health Checks, Reconciliation Patterns

This reference covers the operational monitoring of Fabric Mirroring: latency measurement, health check automation, row count and data reconciliation, alerting patterns, and incident response runbooks.

---

## Monitoring Architecture

```
Fabric Mirroring REST API
    │
    ├── getTablesMirroringStatus  →  Per-table status (phase, bytes, rows, lastSyncTime)
    │
    └── getMirroringStatus        →  Overall health (Running / Stopped / Failed)

OneLake Delta Tables
    │
    ├── _delta_log/latest commit  →  Last write timestamp (freshness check)
    └── Row count queries         →  Data volume reconciliation

Azure Monitor / Log Analytics
    └── Custom metrics from monitoring notebooks
         └── Data Activator Reflex  →  Alerts on latency breach
```

---

## Latency Monitoring

### Core Latency Concepts

**Replication Latency** — The time between a change being committed at the source and that change being visible in the Fabric Delta table. This consists of:

1. **CDC extraction lag** — Time for the source to make the change available in its log/feed
2. **Fabric ingestion lag** — Time for Fabric to read, transform, and write to OneLake
3. **Delta table commit lag** — Time for the commit to be visible via the SQL Analytics Endpoint

**lastSyncTime** — The timestamp returned in `getTablesMirroringStatus` represents when Fabric last successfully committed a batch of changes. The gap between `now()` and `lastSyncTime` is the observable replication latency.

### Latency Monitoring Python Class

```python
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional
import time

class MirroringLatencyMonitor:
    """Monitor replication latency for all tables in a mirrored database."""

    def __init__(self, workspace_id: str, item_id: str, token: str):
        self.workspace_id = workspace_id
        self.item_id = item_id
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.base = "https://api.fabric.microsoft.com/v1"

    def get_table_statuses(self) -> list:
        """Retrieve per-table mirroring status from Fabric API."""
        resp = requests.post(
            f"{self.base}/workspaces/{self.workspace_id}"
            f"/mirroredDatabases/{self.item_id}/getTablesMirroringStatus",
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json().get("data", [])

    def get_overall_status(self) -> str:
        """Get overall mirroring health status."""
        resp = requests.post(
            f"{self.base}/workspaces/{self.workspace_id}"
            f"/mirroredDatabases/{self.item_id}/getMirroringStatus",
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json().get("status", "Unknown")

    def calculate_latency(self, table_status: dict) -> Optional[float]:
        """Calculate current replication latency in seconds for a table."""
        last_sync = table_status.get("lastSyncTime")
        if not last_sync:
            return None

        # Parse ISO timestamp
        if last_sync.endswith("Z"):
            last_sync = last_sync[:-1] + "+00:00"
        last_sync_dt = datetime.fromisoformat(last_sync)
        now = datetime.now(timezone.utc)
        return (now - last_sync_dt).total_seconds()

    def get_latency_report(self) -> dict:
        """Generate a full latency report for all tables."""
        overall_status = self.get_overall_status()
        table_statuses = self.get_table_statuses()
        now = datetime.now(timezone.utc).isoformat()

        report = {
            "timestamp": now,
            "overallStatus": overall_status,
            "tables": []
        }

        for t in table_statuses:
            latency_seconds = self.calculate_latency(t)
            table_entry = {
                "schema": t.get("sourceSchemaName"),
                "table": t.get("sourceTableName"),
                "status": t.get("status"),
                "latencySeconds": round(latency_seconds, 1) if latency_seconds else None,
                "latencyMinutes": round(latency_seconds / 60, 2) if latency_seconds else None,
                "processedRows": t.get("processedRows"),
                "processedBytes": t.get("processedBytes"),
                "lastSyncTime": t.get("lastSyncTime")
            }
            report["tables"].append(table_entry)

        return report

    def check_slo_breach(self, slo_minutes: float = 5.0) -> list:
        """Return list of tables breaching the latency SLO."""
        table_statuses = self.get_table_statuses()
        breaches = []

        for t in table_statuses:
            if t.get("status") != "Replicating":
                continue  # Only check steady-state tables

            latency_seconds = self.calculate_latency(t)
            if latency_seconds is None:
                continue

            latency_minutes = latency_seconds / 60
            if latency_minutes > slo_minutes:
                breaches.append({
                    "table": f"{t['sourceSchemaName']}.{t['sourceTableName']}",
                    "latencyMinutes": round(latency_minutes, 2),
                    "sloMinutes": slo_minutes,
                    "breachMarginMinutes": round(latency_minutes - slo_minutes, 2)
                })

        return sorted(breaches, key=lambda x: x["latencyMinutes"], reverse=True)
```

### Running Latency Checks from a Fabric Notebook

```python
# Fabric notebook — scheduled every 5 minutes for continuous monitoring

from notebookutils import mssparkutils
import json

# Retrieve token from MSI
token = mssparkutils.credentials.getToken("https://api.fabric.microsoft.com")

WORKSPACE_ID = "your-workspace-id"
ITEM_ID = "your-mirrored-database-item-id"
LATENCY_SLO_MINUTES = 5.0  # Alert if any table exceeds 5 minutes lag

monitor = MirroringLatencyMonitor(WORKSPACE_ID, ITEM_ID, token)
report = monitor.get_latency_report()
breaches = monitor.check_slo_breach(slo_minutes=LATENCY_SLO_MINUTES)

print(f"Overall Status: {report['overallStatus']}")
print(f"Tables monitored: {len(report['tables'])}")
print(f"Latency SLO breaches: {len(breaches)}")

if breaches:
    print("\nSLO Breaches:")
    for b in breaches:
        print(f"  {b['table']}: {b['latencyMinutes']} min (SLO: {b['sloMinutes']} min)")

# Persist metrics to Delta table for trending
metrics_df = spark.createDataFrame(report["tables"])
metrics_df = metrics_df.withColumn("reportTimestamp", lit(report["timestamp"]))

metrics_df.write.format("delta").mode("append").saveAsTable(
    "monitoring.mirroring_latency_metrics"
)
```

### Latency Trending KQL (from Log Analytics)

```kql
// If you stream notebook metrics to Log Analytics via custom logs:
MirroringLatencyMetrics_CL
| where TimeGenerated > ago(24h)
| where status_s == "Replicating"
| summarize
    AvgLatencyMin = avg(latencyMinutes_d),
    P95LatencyMin = percentile(latencyMinutes_d, 95),
    MaxLatencyMin = max(latencyMinutes_d)
    by bin(TimeGenerated, 15m), tableName_s
| render timechart
```

---

## Health Check Automation

### Comprehensive Health Check Function

```python
import requests
from datetime import datetime, timezone, timedelta
from enum import Enum

class HealthStatus(Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"

def run_mirroring_health_check(
    workspace_id: str,
    item_id: str,
    token: str,
    latency_warn_minutes: float = 5.0,
    latency_critical_minutes: float = 30.0,
    min_replicating_pct: float = 80.0
) -> dict:
    """
    Run a comprehensive health check on a mirrored database.

    Returns a health assessment with status, issues, and recommendations.
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    base = "https://api.fabric.microsoft.com/v1"

    issues = []
    recommendations = []

    # 1. Check overall status
    resp = requests.post(
        f"{base}/workspaces/{workspace_id}/mirroredDatabases/{item_id}/getMirroringStatus",
        headers=headers
    )
    overall = resp.json().get("status", "Unknown")

    if overall == "Failed":
        issues.append(f"CRITICAL: Overall mirroring status is Failed")
        return {
            "status": HealthStatus.CRITICAL.value,
            "overallStatus": overall,
            "issues": issues,
            "recommendations": ["Restart mirroring; check source connectivity and credentials"]
        }

    if overall == "Stopped":
        issues.append("WARNING: Mirroring is stopped")
        return {
            "status": HealthStatus.DEGRADED.value,
            "overallStatus": overall,
            "issues": issues,
            "recommendations": ["Start mirroring via API or Fabric portal"]
        }

    # 2. Check per-table status
    resp = requests.post(
        f"{base}/workspaces/{workspace_id}/mirroredDatabases/{item_id}/getTablesMirroringStatus",
        headers=headers
    )
    tables = resp.json().get("data", [])

    if not tables:
        return {
            "status": HealthStatus.UNKNOWN.value,
            "overallStatus": overall,
            "issues": ["No table status data returned"],
            "recommendations": ["Verify mirroring configuration has at least one table enabled"]
        }

    # 3. Classify tables by status
    snapshotting = [t for t in tables if t.get("status") == "Snapshotting"]
    cdc_catchup = [t for t in tables if t.get("status") == "CdcCatchup"]
    replicating = [t for t in tables if t.get("status") == "Replicating"]
    failed = [t for t in tables if t.get("status") == "Failed"]

    if failed:
        for t in failed:
            issues.append(
                f"CRITICAL: Table {t['sourceSchemaName']}.{t['sourceTableName']} is in Failed state"
            )

    # 4. Check latency for replicating tables
    high_latency_tables = []
    now = datetime.now(timezone.utc)

    for t in replicating:
        last_sync = t.get("lastSyncTime")
        if not last_sync:
            continue
        if last_sync.endswith("Z"):
            last_sync = last_sync[:-1] + "+00:00"
        last_sync_dt = datetime.fromisoformat(last_sync)
        latency_min = (now - last_sync_dt).total_seconds() / 60

        if latency_min > latency_critical_minutes:
            issues.append(
                f"CRITICAL: {t['sourceSchemaName']}.{t['sourceTableName']} "
                f"latency {latency_min:.1f}min exceeds critical threshold {latency_critical_minutes}min"
            )
            high_latency_tables.append(t["sourceTableName"])
        elif latency_min > latency_warn_minutes:
            issues.append(
                f"WARNING: {t['sourceSchemaName']}.{t['sourceTableName']} "
                f"latency {latency_min:.1f}min exceeds warn threshold {latency_warn_minutes}min"
            )
            high_latency_tables.append(t["sourceTableName"])

    # 5. Check replication coverage
    total_non_failed = len(tables) - len(failed)
    replicating_pct = (len(replicating) / len(tables) * 100) if tables else 0

    if replicating_pct < min_replicating_pct and len(snapshotting) == 0:
        issues.append(
            f"WARNING: Only {replicating_pct:.0f}% of tables are actively replicating "
            f"(threshold: {min_replicating_pct}%)"
        )

    # 6. Generate recommendations
    if snapshotting:
        recommendations.append(
            f"{len(snapshotting)} table(s) still in initial snapshot — this is normal for new tables"
        )
    if cdc_catchup:
        recommendations.append(
            f"{len(cdc_catchup)} table(s) in CDC catchup phase — wait for steady-state"
        )
    if high_latency_tables:
        recommendations.append(
            "High latency tables: check source CDC log backlog and Fabric capacity throttling"
        )
    if failed:
        recommendations.append(
            "Failed tables: check error details in Fabric portal; may require stop/start mirroring"
        )

    # 7. Determine overall health
    critical_count = sum(1 for i in issues if i.startswith("CRITICAL"))
    warning_count = sum(1 for i in issues if i.startswith("WARNING"))

    if critical_count > 0:
        status = HealthStatus.CRITICAL
    elif warning_count > 0:
        status = HealthStatus.DEGRADED
    else:
        status = HealthStatus.HEALTHY

    return {
        "status": status.value,
        "overallStatus": overall,
        "tableSummary": {
            "total": len(tables),
            "replicating": len(replicating),
            "snapshotting": len(snapshotting),
            "cdcCatchup": len(cdc_catchup),
            "failed": len(failed),
            "replicatingPct": round(replicating_pct, 1)
        },
        "issues": issues,
        "recommendations": recommendations
    }
```

### Scheduled Health Check Notebook

```python
# Run health check every 15 minutes from a Fabric scheduled notebook
from notebookutils import mssparkutils
import json
from datetime import datetime, timezone

token = mssparkutils.credentials.getToken("https://api.fabric.microsoft.com")

WORKSPACE_ID = "your-workspace-id"
MIRRORED_DB_ITEM_ID = "your-mirrored-database-item-id"

result = run_mirroring_health_check(
    workspace_id=WORKSPACE_ID,
    item_id=MIRRORED_DB_ITEM_ID,
    token=token,
    latency_warn_minutes=5.0,
    latency_critical_minutes=30.0
)

print(f"Health Status: {result['status']}")
print(f"Table Summary: {json.dumps(result['tableSummary'], indent=2)}")

if result["issues"]:
    print("\nIssues:")
    for issue in result["issues"]:
        print(f"  {issue}")

if result["recommendations"]:
    print("\nRecommendations:")
    for rec in result["recommendations"]:
        print(f"  - {rec}")

# Write health record to Delta for history
from pyspark.sql import Row
health_row = Row(
    timestamp=datetime.now(timezone.utc).isoformat(),
    status=result["status"],
    overall_status=result["overallStatus"],
    total_tables=result["tableSummary"]["total"],
    replicating_tables=result["tableSummary"]["replicating"],
    failed_tables=result["tableSummary"]["failed"],
    issue_count=len(result["issues"])
)

spark.createDataFrame([health_row]).write \
    .format("delta") \
    .mode("append") \
    .saveAsTable("monitoring.mirroring_health_history")
```

---

## Row Count Reconciliation

Reconciliation ensures the mirrored Delta tables have the same number of rows as the source, catching silent replication failures.

### Fast Row Count Reconciliation

```python
import pyodbc
import requests

def reconcile_row_counts(
    source_connection_string: str,
    source_schema: str,
    source_tables: list,
    workspace_id: str,
    mirrored_db_sql_endpoint: str,
    token: str
) -> list:
    """
    Compare row counts between source and mirrored Delta tables.

    Returns list of discrepancies.
    """
    discrepancies = []

    # Connect to source
    src_conn = pyodbc.connect(source_connection_string)
    src_cursor = src_conn.cursor()

    # Connect to mirrored SQL Analytics Endpoint
    mirror_conn = pyodbc.connect(
        f"Driver={{ODBC Driver 18 for SQL Server}};"
        f"Server={mirrored_db_sql_endpoint};"
        f"Database=mirrored_db;"
        f"Authentication=ActiveDirectoryAccessToken;"
        f"AccessToken={token}"
    )
    mirror_cursor = mirror_conn.cursor()

    for table_name in source_tables:
        # Source count
        src_cursor.execute(
            f"SELECT COUNT(*) FROM [{source_schema}].[{table_name}] WITH (NOLOCK)"
        )
        src_count = src_cursor.fetchone()[0]

        # Mirrored count (via SQL Analytics Endpoint)
        mirror_cursor.execute(
            f"SELECT COUNT(*) FROM [{source_schema}].[{table_name}]"
        )
        mirror_count = mirror_cursor.fetchone()[0]

        diff = src_count - mirror_count
        diff_pct = abs(diff) / src_count * 100 if src_count > 0 else 0

        if diff != 0:
            discrepancies.append({
                "table": f"{source_schema}.{table_name}",
                "sourceCount": src_count,
                "mirroredCount": mirror_count,
                "difference": diff,
                "diffPct": round(diff_pct, 4),
                "verdict": "MISMATCH"
            })

    src_conn.close()
    mirror_conn.close()

    return discrepancies
```

### Deep Hash Reconciliation

For tables where row count matches but data accuracy is critical:

```python
def deep_reconcile_table(
    source_spark_df,       # DataFrame loaded from source via JDBC
    mirror_spark_df,       # DataFrame loaded from mirrored Delta table
    primary_key: str,
    hash_columns: list     # Columns to include in hash comparison
) -> dict:
    """
    Compare row-level hashes between source and mirrored table.
    Returns missing rows, extra rows, and modified rows.
    """
    from pyspark.sql.functions import md5, concat_ws, col

    # Compute hash for each row in source
    src_with_hash = source_spark_df.select(
        col(primary_key),
        md5(concat_ws("|", *[col(c) for c in hash_columns])).alias("row_hash")
    )

    # Compute hash for each row in mirror
    mirror_with_hash = mirror_spark_df.select(
        col(primary_key),
        md5(concat_ws("|", *[col(c) for c in hash_columns])).alias("row_hash")
    )

    # Find rows missing from mirror
    missing = src_with_hash.subtract(
        src_with_hash.join(mirror_with_hash, primary_key, "leftsemi")
    )

    # Find rows in mirror not in source (extra rows)
    extra = mirror_with_hash.subtract(
        mirror_with_hash.join(src_with_hash, primary_key, "leftsemi")
    )

    # Find rows where hash differs (content mismatch)
    joined = src_with_hash.join(mirror_with_hash, primary_key, "inner") \
        .filter(src_with_hash["row_hash"] != mirror_with_hash["row_hash"])

    return {
        "missingFromMirror": missing.count(),
        "extraInMirror": extra.count(),
        "hashMismatches": joined.count(),
        "missingRows": missing.limit(100),
        "extraRows": extra.limit(100),
        "mismatchedRows": joined.limit(100)
    }
```

### Reconciliation Schedule Recommendations

| Table Size | Reconciliation Type | Recommended Frequency |
|-----------|--------------------|--------------------|
| < 1M rows | Full row count + deep hash (sample 10%) | Daily |
| 1M–100M rows | Full row count + spot-check recent 7 days | Daily |
| > 100M rows | Row count only | Daily; deep hash weekly |
| Critical financial tables | Full row count | Hourly |
| Audit/compliance tables | Full row count + full hash | Weekly |

---

## Alerting on Replication Issues

### Data Activator Alert Pattern

```
Setup for latency SLO breach alert:

1. Schedule the MirroringLatencyMonitor notebook every 5 minutes
2. On SLO breach, send an event to an Eventstream:
   {
     "mirroredDbId": "item-guid",
     "tableName": "dbo.FactSales",
     "latencyMinutes": 12.4,
     "sloMinutes": 5.0,
     "timestamp": "2025-03-15T14:30:00Z"
   }

3. Create a Reflex item in Data Activator:
   - Object: MirroredTable (key: tableName)
   - Property: latencyMinutes
   - Trigger: latencyMinutes > 5.0 remains true for 10 minutes
   - Cooldown: 60 minutes
   - Action: Email data-platform@contoso.com + Teams #data-platform-alerts
```

### Python Alert Sender

```python
from azure.eventhub import EventHubProducerClient, EventData
import json
from datetime import datetime, timezone

def send_latency_alert(
    eventstream_connection_string: str,
    table_name: str,
    latency_minutes: float,
    slo_minutes: float
) -> None:
    """Send a latency breach event to an Eventstream for Data Activator processing."""
    event = {
        "tableName": table_name,
        "latencyMinutes": latency_minutes,
        "sloMinutes": slo_minutes,
        "sloBreached": latency_minutes > slo_minutes,
        "breachMarginMinutes": round(latency_minutes - slo_minutes, 2),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    producer = EventHubProducerClient.from_connection_string(eventstream_connection_string)
    batch = producer.create_batch()
    batch.add(EventData(json.dumps(event)))
    producer.send_batch(batch)
    producer.close()

# In the monitoring notebook — send alerts for any SLO breaches
breaches = monitor.check_slo_breach(slo_minutes=5.0)

connection_string = mssparkutils.credentials.getSecret(
    "https://kv-contoso.vault.azure.net/", "eventstream-connection-string"
)

for breach in breaches:
    send_latency_alert(
        connection_string,
        breach["table"],
        breach["latencyMinutes"],
        breach["sloMinutes"]
    )
```

---

## Incident Response Runbooks

### Runbook 1 — Table in Failed State

```
Trigger: getTablesMirroringStatus returns status = "Failed" for one or more tables

Step 1: Identify scope
  GET /workspaces/{wId}/mirroredDatabases/{itemId}/getTablesMirroringStatus
  → Note which tables are Failed and when they last synced

Step 2: Check source database health
  - Can you connect to the source from the Fabric connection test?
  - Is the source CDC/Change Feed still enabled?
  - Was there a source maintenance window or failover?

Step 3: Attempt table-level recovery
  - For a single table failure: stop mirroring, remove the failed table from config,
    re-add it, and restart → this triggers a re-snapshot for that table only

Step 4: If recovery does not work
  - Stop all mirroring: POST /stopMirroring
  - Wait 60 seconds
  - Start mirroring: POST /startMirroring
  - Monitor: getTablesMirroringStatus — tables will go through Snapshotting → Replicating

Step 5: Notify stakeholders if latency SLO will be missed during re-snapshot
  - Large tables (> 100M rows) may take 30 min–2 hours to re-snapshot
  - The SQL Analytics Endpoint will serve stale data during re-snapshot
```

### Runbook 2 — High Latency / Latency Spike

```
Trigger: Replication latency exceeds 5 minutes for steady-state (Replicating) tables

Step 1: Check source CDC log backlog
  For Azure SQL:
    SELECT * FROM sys.dm_cdc_log_scan_sessions ORDER BY start_time DESC;
    -- Look for scan_phase = 'Scanning' with long duration
    -- Check if log is growing: DBCC SQLPERF(LOGSPACE)

Step 2: Check Fabric capacity metrics
  - Is the Fabric capacity experiencing throttling?
  - Navigate to: Fabric portal → Monitoring → Capacity Metrics
  - Look for BackgroundThrottlingPercentage > 0

Step 3: Check source write volume
  - Is there an unusually high change rate at the source?
  - Large bulk inserts/updates/deletes can temporarily overwhelm CDC catch-up

Step 4: Check for schema drift
  - Was a schema change (ALTER TABLE) recently applied at the source?
  - Schema drift may cause temporary table failure and re-snapshot

Step 5: Recovery actions
  - If Fabric throttling: reduce concurrent background jobs; upgrade SKU temporarily
  - If source overload: source team should spread writes over time
  - If schema drift: verify table recovered or manually re-snapshot the affected table
```

### Runbook 3 — Latency Normal but Row Count Mismatch

```
Trigger: Reconciliation detects row count difference between source and mirror

Step 1: Determine magnitude
  - Difference of 0.001%: likely timing issue (changes in-flight during check)
  - Difference of 1%+: potential data loss — escalate

Step 2: Check if rows are merely delayed
  - Run reconciliation again after 5 minutes
  - If difference decreased: rows are in transit — not a failure

Step 3: For persistent mismatch
  - Identify specific missing PKs using deep_reconcile_table()
  - Check if those rows were written during a known outage window
  - Check if those rows' timestamps fall in a CDC log gap

Step 4: Resolution options
  - Stop + restart mirroring for the affected table → triggers re-snapshot
  - For small gaps: apply missing rows from source audit log via a one-time notebook

Step 5: Document and implement prevention
  - Increase source CDC log retention
  - Schedule daily row count reconciliation and alert on > 0.01% discrepancy
```

---

## Monitoring KPIs and SLOs

| Metric | Target | Alert Threshold | Measurement Method |
|--------|--------|-----------------|-------------------|
| Replication latency (P95) | < 30 seconds | > 5 minutes | `lastSyncTime` delta |
| Tables in Replicating state | 100% (after initial snapshot) | < 90% | `getTablesMirroringStatus` |
| Initial snapshot completion | < 4 hours per table | > 8 hours | Phase transition time |
| Daily row count accuracy | 100% | > 0.01% discrepancy | Row count reconciliation |
| Monthly mirroring uptime | > 99.5% | < 99% | `getMirroringStatus` history |

---

## Error Codes and Remediation

| Error / Status | Meaning | Fix |
|---------------|---------|-----|
| `Table status: Failed` | Table-level replication error | Stop mirroring; check source; restart |
| `Overall status: Failed` | Mirroring service-level failure | Check source connectivity; stop and restart mirroring |
| `lastSyncTime null` | Table has never synced successfully | Verify table is enabled in config; check source permissions |
| `Latency spike > 30 min` | CDC backlog or Fabric throttling | Check source CDC log; check Fabric capacity metrics |
| `Row count mismatch > 0.01%` | Potential data loss | Deep reconcile; identify missing PKs; consider re-snapshot |
| `Status stuck in Snapshotting` | Very large table or source performance issue | Check source I/O; contact Fabric support if > 12 hours |
| `Status stuck in CdcCatchup` | High change volume during snapshot | Wait for catchup; reduce source write load if possible |
| `403 on getTablesMirroringStatus` | Caller lacks workspace access | Ensure service principal has Workspace Viewer role or higher |
| `404 on mirroredDatabases endpoint` | Item ID incorrect or deleted | Verify item ID via `GET /workspaces/{wId}/mirroredDatabases` |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| `getTablesMirroringStatus` polling | No documented rate limit | Poll no more often than every 60 seconds in production |
| `getMirroringStatus` polling | No documented rate limit | Poll no more often than every 60 seconds |
| Latency metric precision | 1-second resolution | `lastSyncTime` is reported to the second |
| Replication history retention | 30 days | Via Fabric portal Monitor Hub |
| Maximum re-snapshot duration | No hard limit | Fabric Support timeout may apply for very long snapshots |
| Health check notebook schedule | 1-minute minimum via Fabric scheduler | Use Data Activator for sub-minute alerting |
| Row count reconciliation window | Real-time | Query SQL Analytics Endpoint directly; no delay for committed rows |
