---
name: model-predict
description: "Generate batch scoring code using PREDICT function or MLflow model loading"
argument-hint: "<model-name> --method <predict-function|notebook> [--input-table <table>] [--output-table <table>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Batch Scoring with PREDICT

Generate batch scoring code to apply a registered model to new data, using either the T-SQL PREDICT function or notebook-based inference.

## Instructions

### 1. Validate Inputs

- `<model-name>` — Name of the registered model in the Fabric model registry. Ask if not provided.
- `--method` — Scoring method: `predict-function` (T-SQL PREDICT in warehouse/SQL endpoint) or `notebook` (PySpark/pandas in a notebook). Ask if not provided.
- `--input-table` — Source table containing features. Ask if not provided.
- `--output-table` — Destination table for predictions. Ask if not provided.

### 2A. Generate PREDICT Function Code (--method predict-function)

**T-SQL PREDICT in a Fabric Warehouse**:

```sql
-- Ensure the model is registered and accessible in the warehouse
-- Model: <model-name>, Version: <version>

SELECT
    d.*,
    p.predicted_<target> AS prediction
FROM
    PREDICT(
        MODEL = '<model-name>',
        DATA = dbo.<input-table> AS d,
        RUNTIME = ONNX
    )
    WITH (
        predicted_<target> FLOAT
    ) AS p;
```

**Create output table with predictions**:
```sql
CREATE TABLE dbo.<output-table> AS
SELECT
    d.*,
    p.predicted_<target> AS prediction,
    GETDATE() AS scored_at
FROM
    PREDICT(
        MODEL = '<model-name>',
        DATA = dbo.<input-table> AS d,
        RUNTIME = ONNX
    )
    WITH (
        predicted_<target> FLOAT
    ) AS p;
```

**ONNX export (if model is not already ONNX)**:
```python
import onnxmltools
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# Load the MLflow model
import mlflow
model = mlflow.sklearn.load_model(f"models:/<model-name>/<version>")

# Convert to ONNX
initial_type = [("input", FloatTensorType([None, <num_features>]))]
onnx_model = convert_sklearn(model, initial_types=initial_type)

# Save ONNX model
with open("<model-name>.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())
```

### 2B. Generate Notebook Scoring Code (--method notebook)

**Cell 1: Load registered model**
```python
import mlflow
import pandas as pd

model_name = "<model-name>"
model_version = "<version>"  # or "Production" for stage-based loading

# Load from registry
model = mlflow.pyfunc.load_model(f"models:/{model_name}/{model_version}")
print(f"Loaded model: {model_name} v{model_version}")
```

**Cell 2: Load input data**
```python
# Read from lakehouse
df_spark = spark.read.format("delta").load("Tables/<input-table>")
df = df_spark.toPandas()
print(f"Input rows: {len(df)}")
```

**Cell 3: Generate predictions**
```python
# Apply model
predictions = model.predict(df[FEATURE_COLS])
df["prediction"] = predictions
print(f"Predictions generated. Sample:")
display(df[["prediction"]].head(10))
```

**Cell 4: Write predictions to lakehouse**
```python
# Convert back to Spark DataFrame and write to Delta table
df_output = spark.createDataFrame(df)
df_output.write.format("delta").mode("overwrite").save("Tables/<output-table>")
print(f"Predictions written to Tables/<output-table>")
```

**Cell 5: Prediction summary**
```python
# Summary statistics on predictions
print(f"Prediction distribution:")
print(df["prediction"].describe())

# For classification: value counts
if df["prediction"].nunique() < 20:
    print(f"\nClass distribution:")
    print(df["prediction"].value_counts())
```

### 3. Ask the User

Prompt the user for:
- The model version or stage to use.
- The feature columns expected by the model (or detect from model signature).
- The target column name for the prediction output.
- Whether to overwrite or append to the output table.

### 4. Display Summary

Show the user:
- Generated scoring code (T-SQL or notebook).
- Input/output table names.
- How to schedule the scoring as a pipeline (Fabric Data Factory or notebook scheduling).
- Next steps: validate predictions, monitor model drift, set up recurring scoring.
