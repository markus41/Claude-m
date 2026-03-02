---
name: experiment-create
description: "Create a new MLflow experiment in Fabric with tracking configuration and initial notebook scaffold"
argument-hint: "<experiment-name> [--description <desc>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create an MLflow Experiment

Set up a new MLflow experiment in Microsoft Fabric with a scaffold notebook for tracking runs.

## Instructions

### 1. Validate Inputs

- `<experiment-name>` — Name for the MLflow experiment (e.g., `churn-prediction`, `sales-forecast`). Ask if not provided.
- `--description` — Optional description of the experiment's goal.

### 2. Generate the Experiment Notebook

Create a Fabric notebook scaffold with the following cells:

**Cell 1: Setup and imports**
```python
import mlflow
import mlflow.sklearn
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
```

**Cell 2: Configure experiment**
```python
EXPERIMENT_NAME = "<experiment-name>"
mlflow.set_experiment(EXPERIMENT_NAME)
print(f"Experiment '{EXPERIMENT_NAME}' is active.")
print(f"Tracking URI: {mlflow.get_tracking_uri()}")
```

**Cell 3: Load data from lakehouse**
```python
# Load data from the attached lakehouse
df_spark = spark.read.format("delta").load("Tables/<table_name>")
df = df_spark.toPandas()
print(f"Loaded {len(df)} rows, {len(df.columns)} columns")
display(df.head())
```

**Cell 4: Exploratory data analysis**
```python
# Basic EDA
print(df.describe())
print(f"\nNull counts:\n{df.isnull().sum()}")
print(f"\nData types:\n{df.dtypes}")
```

**Cell 5: Feature engineering placeholder**
```python
# TODO: Add feature engineering steps
# - Handle nulls
# - Encode categoricals
# - Scale numerics
# - Create derived features

TARGET_COL = "<target_column>"
FEATURE_COLS = [col for col in df.columns if col != TARGET_COL]

X = df[FEATURE_COLS]
y = df[TARGET_COL]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"Train: {len(X_train)}, Test: {len(X_test)}")
```

**Cell 6: Training run template**
```python
with mlflow.start_run(run_name="baseline"):
    # Log parameters
    params = {"model_type": "placeholder", "test_size": 0.2, "random_state": 42}
    mlflow.log_params(params)

    # TODO: Train model
    # model = ...
    # model.fit(X_train, y_train)

    # TODO: Evaluate
    # predictions = model.predict(X_test)
    # mlflow.log_metric("accuracy", accuracy_score(y_test, predictions))

    # TODO: Log model
    # mlflow.sklearn.log_model(model, "model")

    print("Run logged. Check the experiment in the workspace.")
```

### 3. Ask the User

Prompt the user for:
- The lakehouse table name to load data from.
- The target column for prediction.
- The problem type: classification, regression, or clustering.
- Any specific algorithms to try (default: start with a baseline).

Update the notebook cells with their answers.

### 4. Display Summary

Show the user:
- Experiment name and where to find it in the Fabric portal.
- Generated notebook file path.
- Next steps: fill in feature engineering, run training cells, compare runs in the experiment UI.
- Relevant commands: `/model-train`, `/model-register`.
