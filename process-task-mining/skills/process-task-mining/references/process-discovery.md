# Process Discovery Reference

## Overview

Process discovery is the act of reconstructing an as-is process model from raw event logs. This reference covers the Power Automate Process Mining connector, M365 audit log extraction for mining, event log schema normalization, PM4Py-based process graph construction, variant analysis, dotted chart visualization, and bottleneck identification.

---

## Power Automate Process Mining Connector

### API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `https://api.powerplatform.com/analytics/processmining/v1/environments/{envId}/processes` | `Flow.Read.All` | `api-version=2022-03-01-preview` | List all process mining projects |
| GET | `https://api.powerplatform.com/analytics/processmining/v1/environments/{envId}/processes/{processId}` | `Flow.Read.All` | — | Get process metadata |
| POST | `https://api.powerplatform.com/analytics/processmining/v1/environments/{envId}/processes/{processId}/refresh` | `Flow.ReadWrite.All` | — | Trigger data refresh |
| GET | `https://api.powerplatform.com/analytics/processmining/v1/environments/{envId}/processes/{processId}/analyticsReports` | `Flow.Read.All` | `$top`, `$skip` | List generated analytics reports |
| GET | `https://api.powerplatform.com/analytics/processmining/v1/environments/{envId}/processes/{processId}/variants` | `Flow.Read.All` | `top=100` | Get process variants |
| GET | `https://api.powerplatform.com/analytics/processmining/v1/environments/{envId}/processes/{processId}/caseStatistics` | `Flow.Read.All` | — | Aggregate statistics per case |
| POST | `https://api.powerplatform.com/analytics/processmining/v1/environments/{envId}/processes` | `Flow.ReadWrite.All` | Body: name, dataSource | Create a new process mining project |

### Authentication

```bash
TOKEN=$(az account get-access-token \
  --resource "https://api.powerplatform.com" \
  --query accessToken -o tsv)

ENV_ID="Default-<tenantId>"   # or custom environment GUID
```

### Extracting Variants via API

```python
import requests

def get_process_variants(token: str, env_id: str, process_id: str) -> list[dict]:
    url = (
        f"https://api.powerplatform.com/analytics/processmining/v1"
        f"/environments/{env_id}/processes/{process_id}/variants"
        f"?api-version=2022-03-01-preview&top=200"
    )
    headers = {"Authorization": f"Bearer {token}"}
    variants = []
    while url:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        variants.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
    return variants
```

---

## M365 Audit Log Extraction for Process Mining

### Unified Audit Log via Graph Beta API

```python
import requests
import time

GRAPH_BETA = "https://graph.microsoft.com/beta"

def create_audit_log_query(token: str, start: str, end: str, record_types: list[str]) -> str:
    """Create an async audit log query job and return the query ID."""
    url = f"{GRAPH_BETA}/security/auditLog/queries"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = {
        "displayName": f"ProcessMining_{start[:10]}",
        "filterStartDateTime": start,      # ISO 8601: "2026-01-01T00:00:00Z"
        "filterEndDateTime": end,
        "recordTypeFilters": record_types, # e.g. ["SharePointFileOperation", "ExchangeItem"]
        "operationFilters": [],            # leave empty for all operations
    }
    resp = requests.post(url, json=body, headers=headers)
    resp.raise_for_status()
    return resp.json()["id"]


def poll_audit_query(token: str, query_id: str, max_wait_sec: int = 300) -> list[dict]:
    """Poll until the audit query is complete and return all records."""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{GRAPH_BETA}/security/auditLog/queries/{query_id}"

    for _ in range(max_wait_sec // 10):
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        status = resp.json().get("status")
        if status == "succeeded":
            break
        if status == "failed":
            raise RuntimeError(f"Audit query {query_id} failed")
        time.sleep(10)

    # Retrieve records
    records_url = f"{url}/records"
    all_records: list[dict] = []
    while records_url:
        resp = requests.get(records_url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        all_records.extend(data.get("value", []))
        records_url = data.get("@odata.nextLink")

    return all_records
```

### Mapping Audit Log Records to Event Log Schema

```python
import pandas as pd
from datetime import datetime

AUDIT_RECORD_TYPE_TO_ACTIVITY = {
    "SharePointFileOperation": lambda r: r.get("operation", "Unknown"),
    "ExchangeItem": lambda r: r.get("operation", "Unknown"),
    "MicrosoftTeams": lambda r: r.get("operation", "Unknown"),
    "PowerBIAudit": lambda r: r.get("operation", "Unknown"),
}

def normalize_audit_records(records: list[dict], case_id_field: str = "ObjectId") -> pd.DataFrame:
    """Convert raw audit records to standard event log format."""
    rows = []
    for record in records:
        record_type = record.get("recordType", "Unknown")
        activity_fn = AUDIT_RECORD_TYPE_TO_ACTIVITY.get(record_type, lambda r: r.get("operation", "Unknown"))

        rows.append({
            "case_id":    record.get(case_id_field, record.get("id")),
            "activity":   activity_fn(record),
            "timestamp":  pd.Timestamp(record["createdDateTime"]),
            "resource":   record.get("userId", "System"),
            "record_type": record_type,
            "operation":  record.get("operation"),
            "workload":   record.get("workload"),
            "object_id":  record.get("ObjectId"),
        })

    df = pd.DataFrame(rows)
    df = df.dropna(subset=["case_id", "activity", "timestamp"])
    df = df.sort_values(["case_id", "timestamp"])
    return df
```

---

## Standard Event Log Schema

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `case_id` | string | Yes | Unique identifier for the process instance (e.g., document URL, ticket ID) |
| `activity` | string | Yes | Name of the activity/step performed |
| `timestamp` | datetime | Yes | When the activity occurred (UTC) |
| `resource` | string | No | Who performed the activity (UPN or system name) |
| `duration_sec` | float | No | Duration of the activity in seconds |
| `lifecycle_state` | string | No | `start` \| `complete` \| `abort` (for lifecycle logs) |
| `cost` | float | No | Cost associated with the activity |
| `additional_*` | any | No | Domain-specific attributes for filtering |

---

## PM4Py Process Graph Construction

```python
import pm4py
import pandas as pd
from pm4py.objects.log.util import dataframe_utils
from pm4py.objects.conversion.log import converter as log_converter

def build_dfg_from_event_log(df: pd.DataFrame) -> tuple:
    """Build a Directly-Follows Graph from a normalized event log DataFrame."""
    # Rename to PM4Py standard column names
    df_pm4py = df.rename(columns={
        "case_id":   "case:concept:name",
        "activity":  "concept:name",
        "timestamp": "time:timestamp",
        "resource":  "org:resource",
    })

    # Convert to PM4Py event log format
    df_pm4py = dataframe_utils.convert_timestamp_columns_in_df(df_pm4py)
    event_log = log_converter.apply(
        df_pm4py,
        variant=log_converter.Variants.TO_EVENT_LOG
    )

    # Discover Directly-Follows Graph
    dfg, start_activities, end_activities = pm4py.discover_dfg(event_log)

    return dfg, start_activities, end_activities, event_log


def discover_process_model(event_log) -> pm4py.objects.petri_net.obj.PetriNet:
    """Discover a Petri net using the Inductive Miner."""
    from pm4py.algo.discovery.inductive import algorithm as inductive_miner

    net, initial_marking, final_marking = inductive_miner.apply(event_log)
    return net, initial_marking, final_marking


def filter_by_variant_coverage(event_log, coverage: float = 0.80):
    """Keep only the variants that cover X% of all cases (noise reduction)."""
    from pm4py.algo.filtering.log.variants import variants_filter

    return variants_filter.filter_log_variants_percentage(event_log, coverage)
```

---

## Variant Analysis

```python
from pm4py.statistics.variants.log import get as variants_module

def analyze_variants(event_log) -> pd.DataFrame:
    """Get all process variants sorted by frequency."""
    variants = variants_module.get_variants(event_log)

    rows = []
    total_cases = sum(len(v) for v in variants.values())

    for variant_tuple, cases in sorted(variants.items(), key=lambda x: len(x[1]), reverse=True):
        variant_str = " -> ".join(variant_tuple)
        count = len(cases)
        rows.append({
            "variant": variant_str,
            "case_count": count,
            "frequency_pct": round(100 * count / total_cases, 2),
            "step_count": len(variant_tuple),
            "cases": [c.attributes["concept:name"] for c in cases],
        })

    return pd.DataFrame(rows)


def identify_rework_loops(event_log) -> list[dict]:
    """Detect activities that appear more than once in a single case (rework)."""
    rework = []
    for trace in event_log:
        case_id = trace.attributes["concept:name"]
        activity_counts: dict[str, int] = {}
        for event in trace:
            act = event["concept:name"]
            activity_counts[act] = activity_counts.get(act, 0) + 1

        loops = {act: cnt for act, cnt in activity_counts.items() if cnt > 1}
        if loops:
            rework.append({"case_id": case_id, "rework_activities": loops})

    return rework
```

---

## Dotted Chart Visualization

```python
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd

def plot_dotted_chart(df: pd.DataFrame, max_cases: int = 100) -> plt.Figure:
    """
    Generate a dotted chart (process timeline).
    Each row = one case; each dot = one event.
    """
    cases = df["case_id"].unique()[:max_cases]
    case_order = {c: i for i, c in enumerate(cases)}

    fig, ax = plt.subplots(figsize=(16, max(6, len(cases) * 0.3)))

    activities = df["activity"].unique()
    colors = plt.cm.get_cmap("tab20", len(activities))
    activity_color = {a: colors(i) for i, a in enumerate(activities)}

    for _, row in df[df["case_id"].isin(cases)].iterrows():
        y = case_order.get(row["case_id"])
        if y is None:
            continue
        ax.scatter(
            row["timestamp"], y,
            c=[activity_color[row["activity"]]],
            s=15, alpha=0.7, zorder=3
        )

    ax.set_yticks(range(len(cases)))
    ax.set_yticklabels(list(cases), fontsize=6)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d"))
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=mdates.MO))
    plt.xticks(rotation=45)
    ax.set_title("Dotted Chart — Process Timeline")
    ax.set_xlabel("Time")
    ax.set_ylabel("Case ID")
    ax.grid(axis="x", linestyle="--", alpha=0.3)

    # Legend
    from matplotlib.patches import Patch
    legend_elements = [Patch(facecolor=activity_color[a], label=a) for a in activities]
    ax.legend(handles=legend_elements, loc="upper right", fontsize=7, ncol=2)

    plt.tight_layout()
    return fig
```

---

## Bottleneck Identification

```python
from pm4py.statistics.sojourn_time.log import get as sojourn_time_module
from pm4py.statistics.service_time.log import get as service_time_module

def identify_bottlenecks(event_log) -> pd.DataFrame:
    """Identify activities with the highest waiting and service times."""
    sojourn = sojourn_time_module.apply(
        event_log,
        parameters={"pm4py:param:timestamp_key": "time:timestamp"}
    )
    service = service_time_module.apply(
        event_log,
        parameters={"pm4py:param:timestamp_key": "time:timestamp"}
    )

    rows = []
    for activity in set(sojourn.keys()) | set(service.keys()):
        rows.append({
            "activity": activity,
            "sojourn_time_mean_sec": sojourn.get(activity, 0),
            "service_time_mean_sec": service.get(activity, 0),
            "waiting_time_mean_sec": max(0, sojourn.get(activity, 0) - service.get(activity, 0)),
        })

    df = pd.DataFrame(rows)
    df = df.sort_values("sojourn_time_mean_sec", ascending=False)
    return df
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `403 Forbidden` on audit query | Missing `AuditLog.Read.All` permission | Grant `AuditLog.Read.All` (admin consent required) |
| Audit query status `failed` | Too large a date range or too many record types | Reduce date range to < 7 days; narrow record type filters |
| `EmptyDataFrame` in PM4Py | No events match the case ID field | Verify `case_id_field` matches a populated column |
| `KeyError: concept:name` | DataFrame column rename incorrect | Ensure rename map covers all required PM4Py columns |
| DFG has too many nodes | Noisy log with many unique activities | Filter by variant coverage > 80%; aggregate activity names |
| PM4Py `InductiveMiner` timeout | Very large log (> 100,000 events) | Sample the log; use `filter_log_variants_percentage` first |
| Graph audit query returns 0 results | Audit not enabled or date out of range | Check audit retention settings; verify M365 audit is enabled |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Graph audit query concurrent jobs | 10 per tenant | Queue additional jobs |
| Graph audit query results retention | 30 days | Export to storage for long-term analysis |
| M365 standard audit retention | 180 days | E5 license = 1 year; add-on = 10 years |
| `$top` for audit records | 1,000 per page | Always paginate via `@odata.nextLink` |
| PM4Py event log in memory | ~1 GB for ~500,000 events | Chunk large logs |
| Power Automate Process Mining cases | 1 million cases per project | Contact Microsoft for higher limits |
| DFG visualization nodes | 50 recommended max | Filter noise activities before visualizing |
| Process mining data refresh | Manual or scheduled | Scheduled refresh available via Power Automate triggers |
