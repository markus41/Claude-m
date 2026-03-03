# Analytics and Reporting Reference — Process Mining

## Overview

Process analytics transforms discovered process models and event logs into actionable insights through KPIs, conformance checking, social network analysis, regression-based root cause analysis, and executive-ready reports. This reference covers all major analytical techniques with Python implementation patterns and Power BI integration for process dashboards.

---

## Process KPIs

### Core KPI Definitions

| KPI | Formula | Unit | Interpretation |
|-----|---------|------|----------------|
| Cycle Time | `max(timestamp) - min(timestamp)` per case | seconds/hours/days | Total time from case start to end |
| Processing Time | Sum of all activity durations in a case | seconds | Time actively worked on the case |
| Waiting Time | Cycle Time - Processing Time | seconds | Time spent idle between activities |
| Throughput | Cases completed / time period | cases/day | Volume of work completed |
| Rework Rate | Cases with repeated activities / total cases | percentage | Proportion of cases with loops |
| On-Time Rate | Cases completed before SLA deadline / total cases | percentage | SLA compliance rate |
| Automation Rate | Automated activities / total activities | percentage | Degree of automation |
| Error Rate | Cases with error events / total cases | percentage | Quality indicator |

### KPI Calculation in Python

```python
import pandas as pd
import numpy as np
from datetime import timedelta

def calculate_process_kpis(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate per-case KPIs from an event log DataFrame.

    Required columns: case_id, activity, timestamp, resource
    """
    df = df.sort_values(["case_id", "timestamp"])

    # Per-case aggregation
    case_stats = df.groupby("case_id").agg(
        start_time=("timestamp", "min"),
        end_time=("timestamp", "max"),
        event_count=("activity", "count"),
        unique_activities=("activity", "nunique"),
        resources_involved=("resource", "nunique"),
    ).reset_index()

    # Cycle time
    case_stats["cycle_time_hours"] = (
        case_stats["end_time"] - case_stats["start_time"]
    ).dt.total_seconds() / 3600

    # Rework: cases where any activity appears more than once
    rework_cases = (
        df.groupby(["case_id", "activity"]).size()
        .reset_index(name="count")
        .query("count > 1")["case_id"]
        .unique()
    )
    case_stats["has_rework"] = case_stats["case_id"].isin(rework_cases)

    return case_stats


def summarize_kpis(case_stats: pd.DataFrame) -> dict:
    """Compute aggregate KPI summary from per-case statistics."""
    return {
        "total_cases": len(case_stats),
        "avg_cycle_time_hours": round(case_stats["cycle_time_hours"].mean(), 2),
        "median_cycle_time_hours": round(case_stats["cycle_time_hours"].median(), 2),
        "p90_cycle_time_hours": round(case_stats["cycle_time_hours"].quantile(0.9), 2),
        "rework_rate_pct": round(100 * case_stats["has_rework"].mean(), 2),
        "avg_event_count": round(case_stats["event_count"].mean(), 1),
        "avg_resources_per_case": round(case_stats["resources_involved"].mean(), 1),
    }
```

---

## Conformance Checking

### Token-Based Replay

```python
import pm4py
from pm4py.algo.conformance.tokenreplay import algorithm as token_replay
from pm4py.algo.evaluation.replay_fitness import algorithm as replay_fitness_eval

def check_conformance_token_replay(
    event_log,
    petri_net,
    initial_marking,
    final_marking
) -> dict:
    """Check conformance using token-based replay."""
    replay_results = token_replay.apply(
        event_log,
        petri_net,
        initial_marking,
        final_marking,
        parameters={
            token_replay.Variants.TOKEN_REPLAY.value.Parameters.ACTIVITY_KEY: "concept:name"
        }
    )

    # Aggregate results
    fitness = replay_fitness_eval.apply(
        replay_results,
        petri_net,
        initial_marking,
        final_marking,
        variant=replay_fitness_eval.Variants.TOKEN_BASED
    )

    deviant_cases = [
        r for r in replay_results
        if not r.get("trace_is_fit", False)
    ]

    return {
        "fitness": fitness,
        "total_cases": len(replay_results),
        "fitting_cases": len(replay_results) - len(deviant_cases),
        "deviant_cases": len(deviant_cases),
        "fitness_rate_pct": round(100 * (1 - len(deviant_cases) / max(len(replay_results), 1)), 2),
    }


def check_conformance_alignments(event_log, petri_net, initial_marking, final_marking) -> list[dict]:
    """Check conformance using alignment-based approach (more precise but slower)."""
    from pm4py.algo.conformance.alignments.petri_net import algorithm as alignments_algo

    aligned_traces = alignments_algo.apply(
        event_log,
        petri_net,
        initial_marking,
        final_marking,
    )

    results = []
    for i, trace_alignment in enumerate(aligned_traces):
        results.append({
            "case_index": i,
            "fitness": trace_alignment.get("fitness", 0),
            "cost": trace_alignment.get("cost", 0),
            "moves_on_log": trace_alignment.get("lp_solved", 0),
            "deviations": [
                step for step in (trace_alignment.get("alignment") or [])
                if step[0] != step[1]
            ],
        })

    return results
```

---

## Social Network Analysis (Handover of Work)

```python
import pm4py
from pm4py.algo.organizational_mining.sna import algorithm as sna_algo
import networkx as nx
import matplotlib.pyplot as plt

def build_handover_network(event_log) -> nx.DiGraph:
    """Build a handover-of-work network between resources."""
    handover_matrix = sna_algo.apply(
        event_log,
        variant=sna_algo.Variants.HANDOVER_LOG
    )

    G = nx.DiGraph()
    for (source, target), weight in handover_matrix.items():
        if weight > 0:
            G.add_edge(source, target, weight=weight)

    return G


def analyze_handover_network(G: nx.DiGraph) -> pd.DataFrame:
    """Compute centrality metrics for each resource in the handover network."""
    if len(G.nodes) == 0:
        return pd.DataFrame()

    rows = []
    for node in G.nodes():
        rows.append({
            "resource": node,
            "in_degree": G.in_degree(node, weight="weight"),
            "out_degree": G.out_degree(node, weight="weight"),
            "betweenness_centrality": nx.betweenness_centrality(G).get(node, 0),
            "is_bottleneck": G.in_degree(node, weight="weight") > (sum(
                d for _, _, d in G.in_edges(data="weight", default=0)
            ) / max(len(G.nodes), 1)) * 1.5,
        })

    return pd.DataFrame(rows).sort_values("in_degree", ascending=False)


def plot_handover_network(G: nx.DiGraph, title: str = "Handover of Work Network") -> plt.Figure:
    """Visualize the handover network."""
    fig, ax = plt.subplots(figsize=(12, 8))
    pos = nx.spring_layout(G, k=2, seed=42)

    weights = [G[u][v]["weight"] for u, v in G.edges()]
    max_weight = max(weights) if weights else 1

    nx.draw_networkx_nodes(G, pos, node_size=1500, node_color="lightblue", ax=ax)
    nx.draw_networkx_labels(G, pos, font_size=8, ax=ax)
    nx.draw_networkx_edges(
        G, pos,
        width=[3 * w / max_weight for w in weights],
        alpha=0.7,
        edge_color="gray",
        arrows=True,
        arrowsize=20,
        ax=ax
    )
    edge_labels = {(u, v): d["weight"] for u, v, d in G.edges(data=True)}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=7, ax=ax)

    ax.set_title(title)
    ax.axis("off")
    plt.tight_layout()
    return fig
```

---

## Regression Analysis for Root Causes

```python
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.inspection import permutation_importance
import pandas as pd
import numpy as np

def prepare_regression_features(
    df: pd.DataFrame,
    case_stats: pd.DataFrame
) -> tuple[pd.DataFrame, pd.Series]:
    """Prepare feature matrix for predicting cycle time."""
    # Aggregate case-level features from event log
    case_features = df.groupby("case_id").agg(
        first_activity=("activity", "first"),
        last_resource=("resource", "last"),
        event_count=("activity", "count"),
        unique_resources=("resource", "nunique"),
        unique_activities=("activity", "nunique"),
        hour_of_day=("timestamp", lambda x: x.min().hour),
        day_of_week=("timestamp", lambda x: x.min().dayofweek),
    ).reset_index()

    # Merge with cycle times
    merged = case_features.merge(
        case_stats[["case_id", "cycle_time_hours"]],
        on="case_id",
        how="inner"
    )

    # Encode categoricals
    le = LabelEncoder()
    merged["first_activity_enc"] = le.fit_transform(merged["first_activity"].fillna("unknown"))
    merged["last_resource_enc"] = le.fit_transform(merged["last_resource"].fillna("unknown"))

    features = [
        "event_count", "unique_resources", "unique_activities",
        "hour_of_day", "day_of_week", "first_activity_enc", "last_resource_enc"
    ]
    X = merged[features]
    y = merged["cycle_time_hours"]

    return X, y


def run_root_cause_regression(X: pd.DataFrame, y: pd.Series) -> dict:
    """Train a gradient boosting model and return feature importances."""
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
    model.fit(X_train, y_train)

    r2 = model.score(X_test, y_test)

    # Feature importance
    perm_importance = permutation_importance(model, X_test, y_test, n_repeats=10, random_state=42)
    feature_importances = pd.DataFrame({
        "feature": X.columns,
        "importance": perm_importance.importances_mean,
        "std": perm_importance.importances_std,
    }).sort_values("importance", ascending=False)

    return {
        "r2_score": round(r2, 3),
        "feature_importances": feature_importances.to_dict(orient="records"),
    }
```

---

## Power BI Integration for Process Dashboards

### Export Event Log to Power BI Dataset

```python
import requests

def push_to_powerbi_dataset(
    token: str,
    workspace_id: str,
    dataset_id: str,
    table_name: str,
    rows: list[dict],
    batch_size: int = 1000
) -> dict:
    """Push event log rows to a Power BI Push Dataset."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    base_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/tables/{table_name}/rows"

    pushed, failed = 0, 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        resp = requests.post(
            base_url,
            json={"rows": batch},
            headers=headers
        )
        if resp.status_code == 200:
            pushed += len(batch)
        else:
            failed += len(batch)

    return {"pushed": pushed, "failed": failed}


def create_process_dashboard_dataset(token: str, workspace_id: str) -> str:
    """Create a Push Dataset schema for process mining data."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = {
        "name": "ProcessMining_EventLog",
        "defaultMode": "Push",
        "tables": [
            {
                "name": "Events",
                "columns": [
                    {"name": "CaseId", "dataType": "String"},
                    {"name": "Activity", "dataType": "String"},
                    {"name": "Timestamp", "dataType": "DateTime"},
                    {"name": "Resource", "dataType": "String"},
                    {"name": "DurationSec", "dataType": "Double"},
                    {"name": "CycleTimeHours", "dataType": "Double"},
                    {"name": "HasRework", "dataType": "Boolean"},
                ]
            }
        ]
    }
    resp = requests.post(
        f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets",
        json=body,
        headers=headers
    )
    resp.raise_for_status()
    return resp.json()["id"]
```

---

## BPMN Export

```python
import pm4py

def export_to_bpmn(petri_net, initial_marking, final_marking, output_path: str) -> None:
    """Export a discovered process model to BPMN 2.0 XML."""
    # Convert Petri net to BPMN
    bpmn_graph = pm4py.convert_to_bpmn(petri_net, initial_marking, final_marking)

    # Export to file
    pm4py.write_bpmn(bpmn_graph, output_path)
    print(f"BPMN exported to: {output_path}")
```

---

## Executive Summary Pattern

```python
def generate_executive_summary(
    kpi_summary: dict,
    conformance_results: dict,
    top_variants: pd.DataFrame,
    bottlenecks: pd.DataFrame,
    period_label: str = "Q1 2026"
) -> str:
    """Generate a structured executive summary of process analytics."""
    rework_cases = int(kpi_summary["total_cases"] * kpi_summary["rework_rate_pct"] / 100)
    top_bottleneck = bottlenecks.iloc[0]["activity"] if len(bottlenecks) > 0 else "N/A"
    top_bottleneck_wait = bottlenecks.iloc[0]["sojourn_time_mean_sec"] / 3600 if len(bottlenecks) > 0 else 0
    top_variant_pct = top_variants.iloc[0]["frequency_pct"] if len(top_variants) > 0 else 0

    return f"""
## Process Analytics Executive Summary — {period_label}

### Key Metrics
- **Total cases analyzed:** {kpi_summary['total_cases']:,}
- **Average cycle time:** {kpi_summary['avg_cycle_time_hours']:.1f} hours
  (Median: {kpi_summary['median_cycle_time_hours']:.1f} h | P90: {kpi_summary['p90_cycle_time_hours']:.1f} h)
- **Rework rate:** {kpi_summary['rework_rate_pct']}% ({rework_cases:,} cases with repeated activities)
- **Process fitness (conformance):** {conformance_results['fitness_rate_pct']}% of cases follow the reference model

### Top Finding: Bottleneck at "{top_bottleneck}"
The activity **{top_bottleneck}** has an average sojourn time of **{top_bottleneck_wait:.1f} hours**,
significantly above process average. This is the primary driver of extended cycle times.

### Process Complexity
- **Top variant coverage:** {top_variant_pct}% of all cases follow the most common path
- **Total variants discovered:** {len(top_variants)}
  — a high number indicates significant process fragmentation

### Recommendations
1. **Automate** the top variant (covers {top_variant_pct}% of cases) to reduce manual effort
2. **Investigate** the {top_bottleneck} activity for resource constraints or approval delays
3. **Eliminate** rework in {rework_cases:,} cases — target root causes via regression analysis
4. **Standardize** process to reduce variants from {len(top_variants)} to fewer well-defined paths
""".strip()
```

---

## ROI Calculation Methodology

```python
def calculate_automation_roi(
    case_count_per_year: int,
    avg_cycle_time_hours: float,
    target_cycle_time_hours: float,
    hourly_cost_per_resource: float,
    avg_resources_per_case: float,
    automation_investment_usd: float
) -> dict:
    """Calculate ROI of process improvement / automation."""
    hours_saved_per_case = avg_cycle_time_hours - target_cycle_time_hours
    total_hours_saved = hours_saved_per_case * case_count_per_year
    annual_cost_saving = total_hours_saved * hourly_cost_per_resource * avg_resources_per_case

    payback_period_years = automation_investment_usd / annual_cost_saving if annual_cost_saving > 0 else float("inf")
    roi_3yr = (annual_cost_saving * 3 - automation_investment_usd) / automation_investment_usd * 100

    return {
        "hours_saved_per_case": round(hours_saved_per_case, 2),
        "total_hours_saved_per_year": round(total_hours_saved, 0),
        "annual_cost_saving_usd": round(annual_cost_saving, 2),
        "automation_investment_usd": automation_investment_usd,
        "payback_period_years": round(payback_period_years, 2),
        "roi_3yr_pct": round(roi_3yr, 1),
    }
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `sklearn` `ValueError: Input contains NaN` | Missing feature values in regression | Impute or drop rows with missing feature values |
| PM4Py `AttributeError: PetriNet` | Wrong model type passed to conformance | Use `pm4py.discover_petri_net_inductive()` to generate compatible model |
| Power BI `401` push error | Token expired or wrong scope | Request `Dataset.ReadWrite.All` permission |
| Power BI `400` on push | Row schema mismatch | Check column names match exactly; Power BI is case-sensitive |
| Alignment conformance timeout | Event log too large | Sample to 10,000 cases; use token replay for large logs |
| `networkx` empty graph | No handover events between resources | Verify `resource` column is populated; check for single-resource process |
| `KeyError` in KPI calculation | Column name mismatch | Validate DataFrame schema before calling KPI functions |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Power BI push dataset rows per call | 10,000 | Batch larger datasets |
| Power BI push dataset total rows | 1,000,000 per table | For historical data use Import or DirectQuery mode |
| PM4Py alignment conformance | ~10,000 traces practical | Larger requires sampling or token replay |
| Regression model features | No hard limit; recommend < 30 | More features increase overfitting risk |
| BPMN export node count | Readable up to ~50 activities | Filter minor activities before export |
| Executive summary generation | Per-run computation | Cache results for dashboards |
| NetworkX graph size | ~100,000 edges | Larger graphs require sparse matrix representation |
| Conformance fitness threshold | No standard; recommend > 0.80 | < 0.70 indicates significant process deviation |
