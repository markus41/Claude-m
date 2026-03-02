---
name: model-register
description: "Register a trained model from an MLflow experiment to the Fabric model registry"
argument-hint: "<model-name> --experiment <experiment-name> [--run-id <run-id>] [--stage <Staging|Production>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Register a Model

Register a trained model from an MLflow experiment run into the Fabric model registry with versioning and stage management.

## Instructions

### 1. Validate Inputs

- `<model-name>` — Name for the registered model (e.g., `churn-classifier`, `demand-forecaster`). Ask if not provided.
- `--experiment` — Name of the MLflow experiment containing the run. Ask if not provided.
- `--run-id` — Specific run ID to register. If not provided, offer to list recent runs for selection.
- `--stage` — Model stage: `None` (default), `Staging`, or `Production`.

### 2. Generate the Registration Code

**Cell 1: Find the best run (when --run-id is not provided)**
```python
import mlflow
from mlflow.tracking import MlflowClient

client = MlflowClient()
experiment = client.get_experiment_by_name("<experiment-name>")

# List runs sorted by a primary metric
runs = client.search_runs(
    experiment_ids=[experiment.experiment_id],
    order_by=["metrics.<primary_metric> DESC"],
    max_results=10
)

for run in runs:
    print(f"Run: {run.info.run_id[:8]}  "
          f"Metric: {run.data.metrics.get('<primary_metric>', 'N/A'):.4f}  "
          f"Params: {run.data.params}")
```

Ask the user which metric to sort by and which run to register.

**Cell 2: Register the model**
```python
model_name = "<model-name>"
run_id = "<selected-run-id>"

model_uri = f"runs:/{run_id}/model"
model_version = mlflow.register_model(model_uri, model_name)

print(f"Registered '{model_name}' version {model_version.version}")
print(f"Source run: {run_id}")
```

**Cell 3: Set model stage (when --stage is provided)**
```python
client.transition_model_version_stage(
    name="<model-name>",
    version=model_version.version,
    stage="<stage>",
    archive_existing_versions=True
)
print(f"Model '{model_name}' v{model_version.version} transitioned to <stage>")
```

**Cell 4: Add model description and tags**
```python
client.update_model_version(
    name="<model-name>",
    version=model_version.version,
    description="<description of what the model does and its performance>"
)

client.set_model_version_tag(
    name="<model-name>",
    version=model_version.version,
    key="problem_type",
    value="<classification|regression|clustering>"
)

client.set_model_version_tag(
    name="<model-name>",
    version=model_version.version,
    key="primary_metric",
    value="<metric_name>=<metric_value>"
)
```

**Cell 5: Verify registration**
```python
# Load the registered model to verify
loaded_model = mlflow.pyfunc.load_model(f"models:/{model_name}/{model_version.version}")
print(f"Model loaded successfully. Type: {type(loaded_model)}")

# List all versions
for mv in client.search_model_versions(f"name='{model_name}'"):
    print(f"  v{mv.version} | Stage: {mv.current_stage} | Status: {mv.status}")
```

### 3. Display Summary

Show the user:
- Registered model name and version number.
- Current stage assignment.
- How to view the model in the Fabric portal (Workspace > Models).
- Next steps: use `/model-predict` for batch scoring, or transition stages for deployment.
