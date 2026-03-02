---
name: model-train
description: "Generate a model training notebook with MLflow tracking, evaluation, and comparison"
argument-hint: "<classification|regression|clustering> --algorithm <algo> [--autolog]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Train a Model with MLflow Tracking

Generate a Fabric notebook that trains a model, logs everything to MLflow, and evaluates performance.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `classification`, `regression`, `clustering`. Ask if not provided.
- `--algorithm` — Algorithm to use. Ask if not provided. Options by type:
  - **Classification**: `logistic-regression`, `random-forest`, `lightgbm`, `xgboost`, `svm`
  - **Regression**: `linear-regression`, `random-forest`, `lightgbm`, `xgboost`, `gradient-boosting`
  - **Clustering**: `kmeans`, `dbscan`, `gaussian-mixture`
- `--autolog` — Enable MLflow autologging instead of manual logging.

### 2. Generate the Training Notebook

**Cell 1: Imports and setup**

Import the appropriate libraries based on `--algorithm`:
- scikit-learn models: `from sklearn.<module> import <Model>`
- LightGBM: `from lightgbm import LGBMClassifier` / `LGBMRegressor`
- XGBoost: `from xgboost import XGBClassifier` / `XGBRegressor`

Always import:
```python
import mlflow
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import *
```

**Cell 2: Enable autologging (when --autolog)**
```python
mlflow.autolog()  # or mlflow.sklearn.autolog(), mlflow.lightgbm.autolog()
```

**Cell 3: Load and prepare data**

Load from lakehouse, split into train/test, apply preprocessing.

**Cell 4: Train model**

Generate the model training code with all relevant hyperparameters exposed as variables:

```python
with mlflow.start_run(run_name="<algorithm>-v1"):
    # Hyperparameters
    params = {
        # ... algorithm-specific params
    }
    mlflow.log_params(params)

    model = <ModelClass>(**params)
    model.fit(X_train, y_train)
```

**Cell 5: Evaluate**

For classification:
```python
    y_pred = model.predict(X_test)
    mlflow.log_metric("accuracy", accuracy_score(y_test, y_pred))
    mlflow.log_metric("f1_weighted", f1_score(y_test, y_pred, average="weighted"))
    mlflow.log_metric("precision_weighted", precision_score(y_test, y_pred, average="weighted"))
    mlflow.log_metric("recall_weighted", recall_score(y_test, y_pred, average="weighted"))
```

For regression:
```python
    y_pred = model.predict(X_test)
    mlflow.log_metric("rmse", np.sqrt(mean_squared_error(y_test, y_pred)))
    mlflow.log_metric("mae", mean_absolute_error(y_test, y_pred))
    mlflow.log_metric("r2", r2_score(y_test, y_pred))
```

For clustering:
```python
    labels = model.predict(X)
    mlflow.log_metric("silhouette", silhouette_score(X, labels))
    mlflow.log_metric("calinski_harabasz", calinski_harabasz_score(X, labels))
```

**Cell 6: Log model and artifacts**
```python
    mlflow.sklearn.log_model(model, "model")

    # Feature importance (tree-based models)
    if hasattr(model, "feature_importances_"):
        importance_df = pd.DataFrame({
            "feature": FEATURE_COLS,
            "importance": model.feature_importances_
        }).sort_values("importance", ascending=False)
        importance_df.to_csv("/tmp/feature_importance.csv", index=False)
        mlflow.log_artifact("/tmp/feature_importance.csv")
```

**Cell 7: Visualizations**

Generate appropriate plots:
- Classification: confusion matrix, ROC curve (binary), precision-recall curve
- Regression: predicted vs actual scatter, residual plot
- Clustering: cluster visualization (first 2 PCA components)

Log plots as artifacts via `mlflow.log_artifact()`.

### 3. Display Summary

Show the user:
- Generated notebook with all cells described.
- How to view runs in the experiment UI.
- Next steps: tune hyperparameters, try `/model-register` to register the best model.
