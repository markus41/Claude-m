---
name: notebook-orchestrate
description: "Design a multi-notebook orchestration pattern with parent-child execution, parallel fan-out, error propagation, and cross-workspace runs"
argument-hint: "<orchestrator-name> --notebooks <nb1,nb2,nb3> [--parallel] [--cross-workspace] [--quality-gate]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Design Multi-Notebook Orchestration

Create a parent orchestrator notebook that coordinates multiple child notebooks with dependency management, parallel execution, error handling, and quality gates.

## Instructions

### 1. Validate Inputs

- `<orchestrator-name>` — Name for the parent notebook (e.g., `nb_orchestrate_sales_daily`). Ask if not provided.
- `--notebooks` — Comma-separated list of child notebook names to orchestrate. Ask the user to describe their data flow if not provided.
- `--parallel` — Enable parallel execution of independent notebooks.
- `--cross-workspace` — Include cross-workspace notebook execution support.
- `--quality-gate` — Insert data quality validation between stages.

### 2. Discover the Data Flow

Ask the user:
1. What is the overall purpose of this orchestration? (e.g., daily sales ETL, customer data refresh)
2. What are the stages? (e.g., ingest → transform → aggregate → publish)
3. Which notebooks can run in parallel? (e.g., independent source ingestions)
4. What should happen on failure? (e.g., stop all, skip and continue, retry)
5. Are there cross-workspace dependencies?

### 3. Generate the Orchestrator Notebook

**Cell 1: Header** (markdown)
```markdown
# <Orchestrator Name>
- **Purpose**: <description>
- **Schedule**: <daily|hourly|on-demand>
- **Notebooks**: <list of child notebooks>
- **Error strategy**: <stop-on-failure|skip-and-continue|retry-N-times>
```

**Cell 2: Configuration & Parameters**
```python
from notebookutils import mssparkutils
from datetime import datetime
import json

# Pipeline parameters
run_date = ""  # Overridden by pipeline
environment = "prod"
batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
timeout_seconds = 3600
max_retries = 2

# Notebook execution order and dependencies
EXECUTION_PLAN = {
    "stage_1_ingest": {
        "notebooks": ["nb_ingest_source_a", "nb_ingest_source_b", "nb_ingest_source_c"],
        "parallel": True,
        "timeout": 1800,
        "required": True
    },
    "stage_2_quality": {
        "notebooks": ["nb_quality_check_bronze"],
        "parallel": False,
        "timeout": 600,
        "required": True,
        "depends_on": ["stage_1_ingest"]
    },
    "stage_3_transform": {
        "notebooks": ["nb_transform_customers", "nb_transform_orders"],
        "parallel": True,
        "timeout": 3600,
        "required": True,
        "depends_on": ["stage_2_quality"]
    },
    "stage_4_aggregate": {
        "notebooks": ["nb_aggregate_gold"],
        "parallel": False,
        "timeout": 1800,
        "required": True,
        "depends_on": ["stage_3_transform"]
    },
    "stage_5_publish": {
        "notebooks": ["nb_refresh_semantic_model"],
        "parallel": False,
        "timeout": 900,
        "required": False,
        "depends_on": ["stage_4_aggregate"]
    }
}
```

**Cell 3: Execution Engine**
```python
def run_notebook_with_retry(name, params, timeout, retries, workspace_id=None):
    """Run a notebook with retry logic and structured result capture."""
    for attempt in range(retries + 1):
        try:
            start = datetime.now()
            if workspace_id:
                result = mssparkutils.notebook.run(name, timeout, params, workspace_id=workspace_id)
            else:
                result = mssparkutils.notebook.run(name, timeout, params)
            duration = (datetime.now() - start).total_seconds()
            return {
                "notebook": name, "status": "success", "attempt": attempt + 1,
                "duration_seconds": duration, "result": result
            }
        except Exception as e:
            if attempt < retries:
                print(f"⚠ {name} failed (attempt {attempt + 1}/{retries + 1}): {e}. Retrying...")
                continue
            return {
                "notebook": name, "status": "failed", "attempt": attempt + 1,
                "error": str(e), "duration_seconds": (datetime.now() - start).total_seconds()
            }

def run_stage(stage_name, config, common_params):
    """Execute a stage: sequential or parallel notebooks."""
    print(f"\n{'='*60}")
    print(f"Stage: {stage_name} | Notebooks: {config['notebooks']} | Parallel: {config.get('parallel', False)}")
    print(f"{'='*60}")

    results = []
    if config.get("parallel", False):
        # Fan-out: launch all notebooks in parallel
        handles = {}
        for nb in config["notebooks"]:
            handle = mssparkutils.notebook.runNonBlocking(nb, config["timeout"], common_params)
            handles[nb] = handle

        # Fan-in: collect results
        for nb, handle in handles.items():
            try:
                status = mssparkutils.notebook.getStatus(handle)
                results.append({"notebook": nb, "status": "success", "result": status})
            except Exception as e:
                results.append({"notebook": nb, "status": "failed", "error": str(e)})
    else:
        # Sequential execution
        for nb in config["notebooks"]:
            result = run_notebook_with_retry(nb, common_params, config["timeout"], max_retries)
            results.append(result)
            if result["status"] == "failed" and config.get("required", True):
                print(f"✗ Required notebook {nb} failed. Stopping stage.")
                break

    return results
```

**Cell 4: Execute Plan**
```python
# Run the execution plan
all_results = {}
common_params = {"run_date": run_date, "batch_id": batch_id, "environment": environment}
failed_stages = []

for stage_name, config in EXECUTION_PLAN.items():
    # Check dependencies
    deps = config.get("depends_on", [])
    if any(d in failed_stages for d in deps):
        print(f"⏭ Skipping {stage_name} — dependency failed")
        all_results[stage_name] = [{"status": "skipped", "reason": "dependency_failed"}]
        continue

    results = run_stage(stage_name, config, common_params)
    all_results[stage_name] = results

    # Check for failures
    failures = [r for r in results if r["status"] == "failed"]
    if failures and config.get("required", True):
        failed_stages.append(stage_name)
        print(f"✗ Stage {stage_name} FAILED")
    else:
        print(f"✓ Stage {stage_name} completed")
```

**Cell 5: Quality Gate** (when --quality-gate)
```python
def quality_gate(table_name, min_rows=None, max_null_pct=None, freshness_hours=None):
    """Validate table meets quality thresholds."""
    issues = []
    df = spark.read.table(table_name)
    row_count = df.count()

    if min_rows and row_count < min_rows:
        issues.append(f"Row count {row_count} below minimum {min_rows}")

    if max_null_pct:
        for c in df.columns:
            null_pct = df.filter(col(c).isNull()).count() / max(row_count, 1) * 100
            if null_pct > max_null_pct:
                issues.append(f"Column {c}: {null_pct:.1f}% nulls exceeds {max_null_pct}%")

    if freshness_hours:
        latest = df.agg(spark_max("_ingested_at")).collect()[0][0]
        if latest and (datetime.now() - latest).total_seconds() > freshness_hours * 3600:
            issues.append(f"Data stale: latest record is {latest}")

    return {"table": table_name, "row_count": row_count, "issues": issues, "passed": len(issues) == 0}
```

**Cell 6: Summary Report**
```python
# Generate execution summary
print(f"\n{'='*60}")
print(f"ORCHESTRATION SUMMARY — Batch {batch_id}")
print(f"{'='*60}")

total_notebooks = sum(len(r) for r in all_results.values())
successes = sum(1 for stage in all_results.values() for r in stage if r.get("status") == "success")
failures = sum(1 for stage in all_results.values() for r in stage if r.get("status") == "failed")
skipped = sum(1 for stage in all_results.values() for r in stage if r.get("status") == "skipped")

print(f"Total: {total_notebooks} | ✓ {successes} | ✗ {failures} | ⏭ {skipped}")

for stage, results in all_results.items():
    for r in results:
        icon = "✓" if r.get("status") == "success" else "✗" if r.get("status") == "failed" else "⏭"
        print(f"  {icon} {r.get('notebook', stage)}: {r.get('status')} ({r.get('duration_seconds', 0):.0f}s)")

# Exit with structured result
mssparkutils.notebook.exit(json.dumps({
    "batch_id": batch_id,
    "total": total_notebooks,
    "successes": successes,
    "failures": failures,
    "skipped": skipped,
    "status": "success" if failures == 0 else "partial_failure" if successes > 0 else "failed"
}))
```

### 4. Generate Pipeline Wrapper

Create a pipeline definition that calls the orchestrator notebook with parameters and schedule:
- Pipeline triggers the orchestrator with `run_date` and `environment` parameters
- On failure: send alert via webhook
- On success: log completion to monitoring table

### 5. Display Summary

Show:
- Orchestration flow diagram (ASCII art showing stages and dependencies)
- Notebook execution order and parallelism
- Error handling strategy per stage
- Quality gate configuration (if enabled)
- How to test: run orchestrator manually, check Monitoring Hub
- How to schedule: attach to pipeline trigger
