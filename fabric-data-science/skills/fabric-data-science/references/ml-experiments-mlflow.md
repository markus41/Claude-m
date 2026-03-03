# ML Experiments and MLflow

## Overview

Microsoft Fabric Data Science integrates MLflow natively — no server setup required. Every Fabric workspace is pre-configured with an MLflow tracking server backed by OneLake. Experiments track parameters, metrics, artifacts, and models across runs, enabling systematic comparison and reproducibility. This reference covers the MLflow tracking API, experiment creation, run logging, model registry, run comparison, MLflow model flavors, and Fabric-specific MLflow integration.

---

## MLflow API Reference

| API | Description | Key Parameters |
|-----|-------------|----------------|
| `mlflow.set_experiment(name)` | Set the active experiment | `name`: display name or experiment ID |
| `mlflow.start_run(run_name, tags)` | Start a new run | `run_name`, `tags`, `nested` |
| `mlflow.log_param(key, value)` | Log a single parameter | String key, any value |
| `mlflow.log_params(params_dict)` | Log multiple parameters | Dict |
| `mlflow.log_metric(key, value, step)` | Log a metric | `step` for time series |
| `mlflow.log_metrics(metrics_dict, step)` | Log multiple metrics | Dict |
| `mlflow.log_artifact(local_path)` | Log a file artifact | Local file path |
| `mlflow.log_artifacts(local_dir)` | Log a directory of artifacts | Local directory path |
| `mlflow.log_dict(data, artifact_file)` | Log a dict as JSON/YAML | |
| `mlflow.log_figure(fig, artifact_file)` | Log a matplotlib/plotly figure | |
| `mlflow.log_image(img, artifact_file)` | Log a PIL image | |
| `mlflow.set_tag(key, value)` | Set a tag on the current run | Tags are string key-value |
| `mlflow.sklearn.log_model(model, artifact_path, registered_model_name)` | Log scikit-learn model | `registered_model_name` for auto-registration |
| `mlflow.register_model(model_uri, name)` | Register model from run URI | |
| `mlflow.end_run(status)` | End the current run | `FINISHED`, `FAILED`, `KILLED` |

---

## Fabric REST API — Experiments

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/v1/workspaces/{workspaceId}/items` | Workspace Contributor | `type=MLExperiment`, `displayName` | Creates experiment item |
| GET | `/v1/workspaces/{workspaceId}/items?type=MLExperiment` | Workspace Viewer | — | Lists experiments |
| DELETE | `/v1/workspaces/{workspaceId}/items/{experimentId}` | Workspace Admin | — | Deletes experiment and runs |

---

## Experiment Creation

```python
import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

# Option A: Set active experiment by name (creates if not found)
mlflow.set_experiment("customer-churn-prediction")

# Option B: Create via Fabric API (returns experiment ID for use in code)
# Then reference by ID
mlflow.set_experiment(experiment_id="<experiment-id-from-portal>")

# Verify active experiment
exp = mlflow.get_experiment_by_name("customer-churn-prediction")
print(f"Experiment ID: {exp.experiment_id}")
print(f"Artifact location: {exp.artifact_location}")
```

---

## Run Logging — Parameters, Metrics, Artifacts

### Complete Logging Pattern

```python
import mlflow
import mlflow.sklearn
import mlflow.lightgbm
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, precision_score, recall_score
import matplotlib.pyplot as plt

mlflow.set_experiment("customer-churn-prediction")

with mlflow.start_run(run_name="rf-v2-tuned", tags={"team": "data-science", "model_type": "classification"}):

    # --- Parameters ---
    params = {
        "n_estimators":     200,
        "max_depth":        15,
        "min_samples_split": 4,
        "min_samples_leaf":  2,
        "random_state":     42,
        "feature_set":      "v2",
        "train_date_range": "2024-01-01 to 2024-12-31"
    }
    mlflow.log_params(params)

    # --- Training ---
    model = RandomForestClassifier(**{k: v for k, v in params.items() if k in [
        "n_estimators", "max_depth", "min_samples_split", "min_samples_leaf", "random_state"
    ]})
    model.fit(X_train, y_train)

    # --- Metrics ---
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    mlflow.log_metrics({
        "accuracy":     accuracy_score(y_test, y_pred),
        "f1_weighted":  f1_score(y_test, y_pred, average="weighted"),
        "f1_binary":    f1_score(y_test, y_pred, average="binary"),
        "precision":    precision_score(y_test, y_pred),
        "recall":       recall_score(y_test, y_pred),
        "roc_auc":      roc_auc_score(y_test, y_proba)
    })

    # --- Artifacts: Feature Importance Plot ---
    importance = pd.DataFrame({
        "feature":    X_train.columns.tolist(),
        "importance": model.feature_importances_
    }).sort_values("importance", ascending=True).tail(20)

    fig, ax = plt.subplots(figsize=(8, 8))
    ax.barh(importance["feature"], importance["importance"])
    ax.set_xlabel("Importance")
    ax.set_title("Top 20 Feature Importances")
    plt.tight_layout()
    fig.savefig("/tmp/feature_importance.png", dpi=150)
    mlflow.log_artifact("/tmp/feature_importance.png")
    plt.close()

    # --- Artifacts: Data schema ---
    mlflow.log_dict({
        "feature_cols":  X_train.columns.tolist(),
        "target_col":    "churn",
        "train_rows":    len(X_train),
        "test_rows":     len(X_test),
        "positive_rate": float(y_train.mean())
    }, "data_schema.json")

    # --- Model ---
    mlflow.sklearn.log_model(
        model,
        "model",
        registered_model_name="churn-classifier",
        signature=mlflow.models.infer_signature(X_test, y_pred)
    )

    run_id = mlflow.active_run().info.run_id
    print(f"Run ID: {run_id}")
```

### Time-Series Metric Logging (Training Curves)

```python
with mlflow.start_run(run_name="nn-training"):
    for epoch in range(100):
        train_loss = train_one_epoch(model, train_loader)
        val_loss   = validate(model, val_loader)
        val_acc    = compute_accuracy(model, val_loader)

        mlflow.log_metrics({
            "train_loss": train_loss,
            "val_loss":   val_loss,
            "val_acc":    val_acc
        }, step=epoch)

        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}: train_loss={train_loss:.4f}, val_acc={val_acc:.4f}")
```

### Autologging

```python
# Scikit-learn: logs estimator params, metrics, model, and feature importance
mlflow.sklearn.autolog(log_model_signatures=True, log_input_examples=True)

# LightGBM
mlflow.lightgbm.autolog()

# XGBoost
mlflow.xgboost.autolog()

# PyTorch Lightning
mlflow.pytorch.autolog()

# FLAML AutoML
mlflow.autolog()  # Catches all supported frameworks

# Then train normally — everything is logged
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)
```

---

## Model Registry

### Register a Model

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Register from a run URI
model_uri  = f"runs:/{run_id}/model"
model_info = mlflow.register_model(model_uri, "churn-classifier")
print(f"Registered version: {model_info.version}")

# Or register inline during logging
with mlflow.start_run():
    mlflow.sklearn.log_model(model, "model", registered_model_name="churn-classifier")
```

### Manage Model Versions

```python
client = MlflowClient()

# Transition to Staging
client.transition_model_version_stage(
    name="churn-classifier", version=3, stage="Staging"
)

# Promote to Production (archives current Production version)
client.transition_model_version_stage(
    name="churn-classifier", version=3, stage="Production",
    archive_existing_versions=True
)

# Add description and tags
client.update_model_version(
    name="churn-classifier", version=3,
    description="RF model v2 — f1=0.87, trained on 2024 full-year data"
)
client.set_model_version_tag("churn-classifier", "3", "validated_by", "data-science-team")
client.set_model_version_tag("churn-classifier", "3", "validated_date", "2025-03-01")

# Archive old versions
client.transition_model_version_stage(
    name="churn-classifier", version=1, stage="Archived"
)
```

### Load Models for Inference

```python
# Load by stage (production)
model = mlflow.sklearn.load_model("models:/churn-classifier/Production")

# Load by version number
model = mlflow.sklearn.load_model("models:/churn-classifier/3")

# Load as generic pyfunc (works for any flavor)
model = mlflow.pyfunc.load_model("models:/churn-classifier/Production")
predictions = model.predict(X_test)
```

---

## Compare Runs

### Programmatic Run Comparison

```python
client = MlflowClient()
experiment = client.get_experiment_by_name("customer-churn-prediction")

# Search runs sorted by metric
runs = client.search_runs(
    experiment_ids=[experiment.experiment_id],
    filter_string="metrics.roc_auc > 0.80 AND params.feature_set = 'v2'",
    order_by=["metrics.roc_auc DESC"],
    max_results=20
)

print(f"{'Run ID':10} {'Model':30} {'ROC-AUC':>8} {'F1':>8} {'Params'}")
print("-" * 80)
for run in runs:
    run_id   = run.info.run_id[:8]
    model_t  = run.data.params.get("model_type", "unknown")[:30]
    roc      = run.data.metrics.get("roc_auc", 0)
    f1       = run.data.metrics.get("f1_weighted", 0)
    n_est    = run.data.params.get("n_estimators", "")
    print(f"{run_id:10} {model_t:30} {roc:8.4f} {f1:8.4f} n_estimators={n_est}")
```

### Parallel Coordinates for Run Comparison

```python
import pandas as pd

runs_data = []
for run in runs[:20]:
    row = {**run.data.params, **run.data.metrics, "run_id": run.info.run_id}
    runs_data.append(row)

df_runs = pd.DataFrame(runs_data)
display(df_runs[["run_id", "n_estimators", "max_depth", "roc_auc", "f1_weighted", "accuracy"]])
```

---

## MLflow Model Flavors

| Flavor | Log Function | Load Function | ONNX Support |
|--------|-------------|--------------|-------------|
| scikit-learn | `mlflow.sklearn.log_model` | `mlflow.sklearn.load_model` | Yes (via skl2onnx) |
| LightGBM | `mlflow.lightgbm.log_model` | `mlflow.lightgbm.load_model` | Yes |
| XGBoost | `mlflow.xgboost.log_model` | `mlflow.xgboost.load_model` | Yes |
| PyTorch | `mlflow.pytorch.log_model` | `mlflow.pytorch.load_model` | Yes |
| TensorFlow | `mlflow.tensorflow.log_model` | `mlflow.tensorflow.load_model` | Yes |
| Spark ML | `mlflow.spark.log_model` | `mlflow.spark.load_model` | Limited |
| ONNX | `mlflow.onnx.log_model` | `mlflow.onnx.load_model` | Native |
| pyfunc (custom) | `mlflow.pyfunc.log_model` | `mlflow.pyfunc.load_model` | Depends on implementation |

### Custom PyFunc Model

```python
class ChurnModelWrapper(mlflow.pyfunc.PythonModel):

    def load_context(self, context):
        import pickle
        with open(context.artifacts["model_path"], "rb") as f:
            self.model     = pickle.load(f)
        with open(context.artifacts["scaler_path"], "rb") as f:
            self.scaler    = pickle.load(f)
        self.feature_cols = context.artifacts.get("feature_cols", [])

    def predict(self, context, model_input):
        X_scaled = self.scaler.transform(model_input[self.feature_cols])
        proba    = self.model.predict_proba(X_scaled)[:, 1]
        return pd.DataFrame({"churn_probability": proba, "is_churn": (proba > 0.5).astype(int)})

# Log the custom model
with mlflow.start_run():
    mlflow.pyfunc.log_model(
        artifact_path="model",
        python_model=ChurnModelWrapper(),
        artifacts={
            "model_path":  "/tmp/model.pkl",
            "scaler_path": "/tmp/scaler.pkl"
        },
        registered_model_name="churn-classifier-custom",
        signature=mlflow.models.infer_signature(X_test, predictions_df)
    )
```

---

## Fabric MLflow Integration

### Accessing the MLflow Tracking URI

In Fabric notebooks, MLflow is pre-configured. The tracking URI points to the workspace's built-in MLflow server.

```python
import mlflow

# Check the tracking URI (auto-configured in Fabric)
print(mlflow.get_tracking_uri())
# Output: https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/mlflow

# Set experiment — creates in current workspace
mlflow.set_experiment("my-experiment")
```

### Access Experiments from Outside Fabric

```python
# From Azure ML Studio, local development, or CI/CD
import mlflow
from mlflow.tracking import MlflowClient

# Set the Fabric MLflow endpoint
mlflow.set_tracking_uri("https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/mlflow")

# Authenticate with Entra ID token
import os
os.environ["MLFLOW_TRACKING_TOKEN"] = "<bearer-token>"

client = MlflowClient()
experiments = client.search_experiments()
for exp in experiments:
    print(exp.name)
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `MlflowException: Run with UUID not found` | Run ID is incorrect or deleted | Verify run ID from experiment UI; search runs via `client.search_runs()` |
| `MlflowException: Model not found in registry` | Model name or version doesn't exist | List models with `client.search_registered_models()` |
| `RestException: INVALID_STATE: Cannot transition from Archived to Production` | Invalid stage transition | Transition to None/Staging first, then to Production |
| `MlflowException: Artifact path is invalid` | Artifact file not found at specified path | Verify local path exists before calling `log_artifact` |
| `PermissionError: Cannot write to artifact location` | MLflow artifact storage access denied | Check workspace OneLake permissions for the running identity |
| `SignatureException: Model input schema mismatch` | Prediction input doesn't match logged signature | Align DataFrame columns to the model's input schema |
| `mlflow.register_model: Model validation failed` | ONNX conversion error for PREDICT function | Check ONNX opset compatibility; use skl2onnx 1.14+ |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Experiments per workspace | No documented hard limit | Large numbers slow the experiment list UI |
| Runs per experiment | No documented hard limit | > 10,000 runs per experiment may slow search |
| Artifacts per run | No hard limit | Large artifact sets slow run comparison |
| Artifact file size | Governed by OneLake storage | Large model files (>1 GB) should use lakehouse direct storage |
| Metric log frequency | No hard limit per run | Logging > 1,000 metrics/second may cause latency |
| MLflow API requests | Governed by Fabric REST API limits (1,000/min) | Batch metric logging reduces API calls |
| Model versions per registered model | No hard limit | Archive old versions to keep the registry tidy |
