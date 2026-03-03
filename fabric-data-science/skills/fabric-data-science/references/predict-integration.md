# PREDICT Function Integration

## Overview

The T-SQL `PREDICT` function enables batch scoring of registered ONNX models directly inside Fabric Data Warehouse and Lakehouse SQL endpoints without moving data to a notebook. It reads from warehouse tables, passes rows to the model for inference, and returns predictions as a SQL result set. This reference covers the PREDICT syntax, batch scoring from a warehouse, model deployment to Fabric, online endpoint integration, monitoring predictions, and A/B testing patterns.

---

## PREDICT Function Syntax

```sql
SELECT
    d.<columns>,
    p.<output_columns>
FROM
    PREDICT(
        MODEL = '<registered-model-name>',
        DATA  = <schema>.<table> AS d,
        RUNTIME = ONNX
    )
    WITH (
        <output_column_name> <data_type> [, ...]
    ) AS p
[WHERE / JOIN / other clauses];
```

### Required Prerequisites

1. A registered model in the Fabric model registry (ONNX format or supported framework).
2. The model must be in the same Fabric workspace as the warehouse.
3. The input table must have columns matching the model's input tensor names exactly.
4. The ONNX model must declare explicit input/output shapes.

---

## Basic PREDICT Examples

### Binary Classification

```sql
-- Score all customers using the churn prediction model
SELECT
    d.customer_id,
    d.segment,
    d.tenure_months,
    d.monthly_charges,
    p.churn_probability,
    CASE WHEN p.churn_probability >= 0.5 THEN 1 ELSE 0 END AS predicted_churn
FROM
    PREDICT(
        MODEL   = 'churn-classifier',
        DATA    = dbo.customer_features AS d,
        RUNTIME = ONNX
    )
    WITH (
        churn_probability FLOAT
    ) AS p;
```

### Regression Scoring

```sql
-- Predict customer lifetime value
SELECT
    d.customer_id,
    d.acquisition_channel,
    d.product_tier,
    p.predicted_clv,
    CASE
        WHEN p.predicted_clv >= 10000 THEN 'Platinum'
        WHEN p.predicted_clv >= 5000  THEN 'Gold'
        WHEN p.predicted_clv >= 1000  THEN 'Silver'
        ELSE 'Bronze'
    END AS predicted_tier
FROM
    PREDICT(
        MODEL   = 'clv-regressor',
        DATA    = dbo.customer_features AS d,
        RUNTIME = ONNX
    )
    WITH (
        predicted_clv FLOAT
    ) AS p;
```

### Multi-Output Model (Classification with Probability)

```sql
-- Model returns both predicted class and probability
SELECT
    d.product_id,
    d.description_embedding_1,
    d.description_embedding_2,
    p.predicted_category_idx,
    p.category_probability,
    cat.category_name
FROM
    PREDICT(
        MODEL   = 'product-classifier',
        DATA    = dbo.product_features AS d,
        RUNTIME = ONNX
    )
    WITH (
        predicted_category_idx INT,
        category_probability   FLOAT
    ) AS p
JOIN dim.CategoryMap cat ON CAST(p.predicted_category_idx AS INT) = cat.idx;
```

---

## Batch Scoring from Warehouse

### Create a Scored Results Table

```sql
-- Full batch score and persist results
CREATE TABLE dbo.customer_churn_scores AS
SELECT
    d.customer_id,
    d.segment,
    d.region,
    p.churn_probability,
    CASE
        WHEN p.churn_probability >= 0.7 THEN 'Critical'
        WHEN p.churn_probability >= 0.4 THEN 'At Risk'
        ELSE 'Healthy'
    END AS risk_tier,
    GETDATE() AS scored_at,
    'churn-classifier' AS model_name,
    3                  AS model_version
FROM
    PREDICT(
        MODEL   = 'churn-classifier',
        DATA    = dbo.customer_features AS d,
        RUNTIME = ONNX
    )
    WITH (
        churn_probability FLOAT
    ) AS p;

-- Query top at-risk customers
SELECT TOP 100
    customer_id, segment, region, churn_probability
FROM dbo.customer_churn_scores
WHERE risk_tier IN ('Critical', 'At Risk')
ORDER BY churn_probability DESC;
```

### Incremental Scoring — Only New/Changed Rows

```sql
-- Score only customers not yet scored or modified since last score
INSERT INTO dbo.customer_churn_scores
    (customer_id, segment, region, churn_probability, risk_tier, scored_at, model_name, model_version)
SELECT
    d.customer_id,
    d.segment,
    d.region,
    p.churn_probability,
    CASE
        WHEN p.churn_probability >= 0.7 THEN 'Critical'
        WHEN p.churn_probability >= 0.4 THEN 'At Risk'
        ELSE 'Healthy'
    END,
    GETDATE(),
    'churn-classifier',
    3
FROM
    PREDICT(
        MODEL   = 'churn-classifier',
        DATA    = (
            SELECT * FROM dbo.customer_features
            WHERE customer_id NOT IN (
                SELECT customer_id FROM dbo.customer_churn_scores
                WHERE scored_at >= DATEADD(DAY, -1, GETDATE())
            )
        ) AS d,
        RUNTIME = ONNX
    )
    WITH (
        churn_probability FLOAT
    ) AS p;
```

### Stored Procedure for Scheduled Scoring

```sql
CREATE PROCEDURE scoring.usp_ScoreAllCustomers
    @ModelName    NVARCHAR(100) = 'churn-classifier',
    @ModelVersion INT           = NULL  -- NULL = production version
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @StartTime DATETIME2 = GETDATE();
    DECLARE @RowsScored INT;

    -- Truncate and reload
    TRUNCATE TABLE dbo.customer_churn_scores;

    INSERT INTO dbo.customer_churn_scores
        (customer_id, segment, region, churn_probability, risk_tier, scored_at, model_name)
    SELECT
        d.customer_id, d.segment, d.region,
        p.churn_probability,
        CASE
            WHEN p.churn_probability >= 0.7 THEN 'Critical'
            WHEN p.churn_probability >= 0.4 THEN 'At Risk'
            ELSE 'Healthy'
        END,
        GETDATE(),
        @ModelName
    FROM
        PREDICT(
            MODEL   = @ModelName,
            DATA    = dbo.customer_features AS d,
            RUNTIME = ONNX
        )
        WITH (churn_probability FLOAT) AS p;

    SET @RowsScored = @@ROWCOUNT;

    INSERT INTO staging.ScoringLog (ModelName, RowsScored, DurationMs, ScoredAt)
    VALUES (@ModelName, @RowsScored, DATEDIFF(MILLISECOND, @StartTime, GETDATE()), GETDATE());
END;
```

---

## Model Deployment to Fabric

### Convert scikit-learn → ONNX → Register

```python
import pickle, mlflow, mlflow.onnx
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import numpy as np

# Load trained model
model = mlflow.sklearn.load_model("models:/churn-classifier/Production")

# Determine input shape (number of features after preprocessing)
n_features = X_test.shape[1]  # e.g., 42 features after one-hot encoding

# Convert to ONNX
initial_type = [("float_input", FloatTensorType([None, n_features]))]
onnx_model   = convert_sklearn(model, initial_types=initial_type, target_opset=13)

# Verify the ONNX model
import onnxruntime as rt
sess    = rt.InferenceSession(onnx_model.SerializeToString())
inp_name  = sess.get_inputs()[0].name
out_names = [o.name for o in sess.get_outputs()]
print(f"Input: {inp_name}, Outputs: {out_names}")
test_input = X_test.values[:5].astype(np.float32)
result = sess.run(out_names, {inp_name: test_input})
print(f"Sample predictions: {result}")

# Save and register in MLflow
with mlflow.start_run():
    mlflow.onnx.log_model(
        onnx_model,
        "onnx_model",
        registered_model_name="churn-classifier"  # same registry name
    )
    run_id = mlflow.active_run().info.run_id

# Transition the ONNX version to Production
from mlflow.tracking import MlflowClient
client = MlflowClient()
versions = client.search_model_versions("name='churn-classifier' and tags.flavor = 'onnx'")
latest = max(versions, key=lambda v: int(v.version))
client.transition_model_version_stage(
    name="churn-classifier", version=latest.version,
    stage="Production", archive_existing_versions=True
)
print(f"ONNX model v{latest.version} promoted to Production")
```

### Verify PREDICT Works with the Deployed Model

```sql
-- Quick sanity check with 10 rows
SELECT TOP 10
    d.customer_id,
    p.churn_probability
FROM
    PREDICT(
        MODEL   = 'churn-classifier',
        DATA    = dbo.customer_features AS d,
        RUNTIME = ONNX
    )
    WITH (churn_probability FLOAT) AS p;
```

---

## Online Endpoint Integration

For real-time predictions (< 100ms SLA), deploy models to Azure ML managed online endpoints and call from T-SQL via external REST.

```python
# Deploy to Azure ML managed online endpoint
from azure.ai.ml import MLClient
from azure.ai.ml.entities import ManagedOnlineEndpoint, ManagedOnlineDeployment, Model
from azure.identity import DefaultAzureCredential

ml_client = MLClient(
    credential=DefaultAzureCredential(),
    subscription_id="<subscription-id>",
    resource_group_name="<rg>",
    workspace_name="<aml-workspace>"
)

# Create endpoint
endpoint = ManagedOnlineEndpoint(
    name="churn-realtime",
    description="Real-time churn scoring",
    auth_mode="key"
)
ml_client.online_endpoints.begin_create_or_update(endpoint).result()

# Deploy model
deployment = ManagedOnlineDeployment(
    name="blue",
    endpoint_name="churn-realtime",
    model=Model(path="models:/churn-classifier/Production", type="mlflow_model"),
    instance_type="Standard_DS3_v2",
    instance_count=1
)
ml_client.online_deployments.begin_create_or_update(deployment).result()

# Test the endpoint
import requests, json
endpoint_url = ml_client.online_endpoints.get("churn-realtime").scoring_uri
key          = ml_client.online_endpoints.get_keys("churn-realtime").primary_key

payload = {"input_data": {"columns": X_test.columns.tolist(), "data": X_test.iloc[:3].values.tolist()}}
resp = requests.post(endpoint_url, json=payload, headers={"Authorization": f"Bearer {key}"})
print(resp.json())
```

### Call Online Endpoint from Fabric (Notebook)

```python
import requests, json

endpoint_url = "https://churn-realtime.eastus.inference.ml.azure.com/score"
api_key      = "<endpoint-key>"

# Score a batch from lakehouse
customers_to_score = spark.sql("SELECT * FROM dbo.customer_features WHERE scored_at IS NULL LIMIT 1000").toPandas()

payload = {
    "input_data": {
        "columns": customers_to_score.columns.tolist(),
        "data":    customers_to_score.values.tolist()
    }
}
resp = requests.post(endpoint_url, json=payload, headers={"Authorization": f"Bearer {api_key}"}, timeout=60)
predictions = resp.json()

# Write back to lakehouse
import pandas as pd
result_df = pd.DataFrame({
    "customer_id":       customers_to_score["customer_id"].tolist(),
    "churn_probability": predictions,
    "scored_at":         pd.Timestamp.utcnow()
})
spark.createDataFrame(result_df).write.format("delta").mode("append").saveAsTable("gold_lakehouse.realtime_scores")
```

---

## Monitoring Predictions

### Prediction Quality Tracking

```sql
-- Track prediction distribution over time (monitor for drift)
SELECT
    CAST(scored_at AS DATE) AS score_date,
    risk_tier,
    COUNT(*)                AS customer_count,
    AVG(churn_probability)  AS avg_probability,
    MIN(churn_probability)  AS min_probability,
    MAX(churn_probability)  AS max_probability,
    STDEV(churn_probability) AS std_probability
FROM dbo.customer_churn_scores
WHERE scored_at >= DATEADD(MONTH, -3, GETDATE())
GROUP BY CAST(scored_at AS DATE), risk_tier
ORDER BY score_date DESC, risk_tier;

-- Compare predicted vs actual churn (after ground truth available)
SELECT
    s.risk_tier,
    COUNT(*) AS predictions,
    SUM(CASE WHEN a.actually_churned = 1 THEN 1 ELSE 0 END) AS actual_churn,
    CAST(SUM(CASE WHEN a.actually_churned = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) AS churn_rate
FROM dbo.customer_churn_scores s
JOIN dbo.churn_actuals a ON s.customer_id = a.customer_id AND s.scored_at <= a.churn_date
WHERE s.scored_at >= DATEADD(MONTH, -1, GETDATE())
GROUP BY s.risk_tier
ORDER BY s.risk_tier;
```

### Scoring Log Analysis

```sql
-- Scoring performance over time
SELECT
    CAST(ScoredAt AS DATE) AS score_date,
    ModelName,
    SUM(RowsScored) AS total_rows,
    AVG(DurationMs / 1000.0) AS avg_duration_seconds,
    MAX(DurationMs / 1000.0) AS max_duration_seconds
FROM staging.ScoringLog
GROUP BY CAST(ScoredAt AS DATE), ModelName
ORDER BY score_date DESC;
```

---

## A/B Testing Patterns

```sql
-- Assign customers to model version groups for A/B test
SELECT
    d.customer_id,
    CASE
        WHEN ABS(CHECKSUM(d.customer_id)) % 100 < 50 THEN 'model_a'
        ELSE 'model_b'
    END AS test_group,
    pa.churn_probability AS score_a,
    pb.churn_probability AS score_b
FROM dbo.customer_features d
CROSS APPLY (
    SELECT p.churn_probability
    FROM PREDICT(MODEL='churn-classifier-v3', DATA=dbo.customer_features AS px, RUNTIME=ONNX)
         WITH (churn_probability FLOAT) AS p
    WHERE px.customer_id = d.customer_id  -- Note: CROSS APPLY pattern; verify performance
) pa
CROSS APPLY (
    SELECT p.churn_probability
    FROM PREDICT(MODEL='churn-classifier-v4', DATA=dbo.customer_features AS px, RUNTIME=ONNX)
         WITH (churn_probability FLOAT) AS p
    WHERE px.customer_id = d.customer_id
) pb;

-- Better A/B pattern: pre-score both models separately
CREATE TABLE dbo.scores_model_a AS
SELECT d.customer_id, p.churn_probability AS score_a
FROM PREDICT(MODEL='churn-classifier-v3', DATA=dbo.customer_features AS d, RUNTIME=ONNX)
     WITH (churn_probability FLOAT) AS p;

CREATE TABLE dbo.scores_model_b AS
SELECT d.customer_id, p.churn_probability AS score_b
FROM PREDICT(MODEL='churn-classifier-v4', DATA=dbo.customer_features AS d, RUNTIME=ONNX)
     WITH (churn_probability FLOAT) AS p;

-- Compare distributions
SELECT
    'model_a' AS model,
    AVG(score_a) AS avg_score,
    STDEV(score_a) AS std_score,
    COUNT(CASE WHEN score_a >= 0.7 THEN 1 END) AS critical_count
FROM dbo.scores_model_a
UNION ALL
SELECT
    'model_b',
    AVG(score_b),
    STDEV(score_b),
    COUNT(CASE WHEN score_b >= 0.7 THEN 1 END)
FROM dbo.scores_model_b;
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `PREDICT: Model '<name>' not found` | Model not registered or wrong name | Verify model name in the Fabric model registry |
| `PREDICT: ONNX runtime error: Invalid input shape` | Input table columns don't match ONNX input tensor shape | Ensure input table has exactly the features the ONNX model expects, in the correct order |
| `PREDICT: Column count mismatch` | WITH clause output columns don't match ONNX outputs | Check ONNX model output tensor names with `onnxruntime` |
| `PREDICT: Data type mismatch` | Input column type incompatible with ONNX tensor type | Cast input columns to FLOAT before passing to PREDICT |
| `PREDICT: Model not in Production stage` | PREDICT requires Production or specific version | Transition model version to Production in the registry |
| `PREDICT: Timeout` | Scoring a very large table timed out | Score in batches; use date-range filters |
| `skl2onnx: Cannot convert Pipeline step` | Pipeline contains unsupported transformer | Replace with a supported transformer; check skl2onnx compatibility |
| `onnxruntime: Type inference failed` | ONNX model has dynamic shapes not resolvable | Use fixed input shapes in `FloatTensorType([None, n_features])` |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| PREDICT input rows per call | No documented hard limit | Very large tables (> 10M rows) should be scored in partitioned batches |
| PREDICT model size | Practical limit ~500 MB ONNX | Large models may time out during initial warm-up |
| PREDICT ONNX opset | 7–15 (tested) | Use opset 13 for widest compatibility |
| Concurrent PREDICT queries | Governed by warehouse CU concurrency | Each PREDICT query loads the model into memory; share capacity |
| Model registry versions | No hard limit | Archive unused versions to keep registry clean |
| A/B test group update | Manual re-assignment | Use a stable hash function on customer_id for consistent assignment |
