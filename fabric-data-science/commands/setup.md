---
name: fabric-ds-setup
description: Set up the Fabric Data Science plugin — configure workspace, lakehouse connection, and install Python ML libraries
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Fabric Data Science Setup

Guide the user through setting up a Microsoft Fabric Data Science environment.

## Step 1: Check Prerequisites

Verify the following are available:

- **Microsoft Fabric capacity**: The user needs access to a Fabric workspace with a capacity (F2+ or Trial).
- **Python 3.10+**: Fabric notebooks run Python 3.10 by default.
- **Azure CLI** (optional): For programmatic workspace management.

```bash
python --version   # Must be >= 3.10
az --version       # Optional, for Azure resource management
```

## Step 2: Install Local ML Libraries (for local development)

For local notebook development or testing outside Fabric:

```bash
pip install mlflow scikit-learn lightgbm xgboost flaml optuna \
  pandas numpy matplotlib seaborn \
  sempy-fabric onnxruntime onnxmltools \
  pyspark delta-spark
```

For SynapseML (local):
```bash
pip install synapseml
```

## Step 3: Configure Fabric Workspace

Ask the user to provide or create:

1. **Workspace**: A Fabric workspace with Data Science experience enabled.
2. **Lakehouse**: A lakehouse to store training data and model outputs.
3. **Environment** (optional): A Fabric environment with custom library versions.

To create via the Fabric portal:
1. Go to https://app.fabric.microsoft.com
2. Select or create a workspace.
3. Click **+ New** > **Lakehouse** and name it (e.g., `ml_lakehouse`).
4. Click **+ New** > **Notebook** to verify the notebook experience works.

## Step 4: Verify Lakehouse Connection

In a Fabric notebook, verify data access:

```python
# List tables in the attached lakehouse
display(spark.sql("SHOW TABLES"))

# Read a Delta table
df = spark.read.format("delta").load("Tables/my_table")
display(df.limit(5))
```

## Step 5: Verify MLflow Tracking

MLflow is pre-configured in Fabric notebooks. Verify:

```python
import mlflow

# Should print the Fabric MLflow tracking URI
print(mlflow.get_tracking_uri())

# Create a test experiment
mlflow.set_experiment("setup-test")
with mlflow.start_run():
    mlflow.log_param("test_param", "hello")
    mlflow.log_metric("test_metric", 1.0)
    print("MLflow tracking is working.")
```

After running, verify the experiment appears in the workspace under **Experiments**.

## Step 6: Verify Semantic Link (Optional)

```python
import sempy.fabric as fabric

# List available Power BI datasets in the workspace
datasets = fabric.list_datasets()
display(datasets)
```

If `sempy` is not available, install it in the notebook:
```python
%pip install sempy-fabric
```

## Step 7: Configure Environment (Optional)

For reproducible library versions, create a Fabric Environment:

1. In the workspace, click **+ New** > **Environment**.
2. Add required libraries (e.g., `flaml==2.1.0`, `optuna==3.5.0`).
3. Publish the environment.
4. Attach the environment to notebooks via **Notebook settings** > **Environment**.

If `--minimal` is passed, stop after Step 3 (workspace and lakehouse only).
