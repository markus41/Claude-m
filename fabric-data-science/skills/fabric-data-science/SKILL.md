---
name: Fabric Data Science
description: >
  Deep expertise in Microsoft Fabric Data Science — create and track ML experiments with MLflow,
  train models with scikit-learn/LightGBM/XGBoost/PyTorch in Spark-based notebooks, leverage
  SynapseML for distributed ML and Cognitive Services, register and version models, batch-score
  with the T-SQL PREDICT function, and bridge Power BI semantic models to ML workflows via
  semantic link (SemPy). Targets data scientists and ML engineers building production ML
  pipelines on Microsoft Fabric.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric data science
  - fabric ml
  - mlflow fabric
  - fabric experiment
  - fabric model
  - predict function
  - semantic link
  - fabric notebook ml
  - synapse ml
  - fabric machine learning
  - model training
  - fabric automl
---

# Fabric Data Science

## 1. Fabric Data Science Overview

Microsoft Fabric Data Science provides an integrated environment for building, training, and deploying machine learning models directly within the Fabric platform. It combines Spark-based compute, MLflow experiment tracking, a model registry, and seamless integration with lakehouses and Power BI.

**Core components**:
| Component | Purpose | Key Feature |
|-----------|---------|-------------|
| Notebooks | Interactive ML development | Spark + Python with pre-installed ML libraries |
| Experiments | MLflow-based experiment tracking | Compare runs, log metrics/params/models |
| Models | Model registry with versioning | Stage management (Staging/Production/Archived) |
| PREDICT | T-SQL batch scoring | Score data in warehouse without moving it |
| Semantic Link | Power BI ↔ Notebook bridge | Read semantic models, evaluate measures from code |
| Environments | Custom library management | Pin library versions for reproducibility |

**Supported frameworks** (pre-installed in Fabric notebooks):
- **scikit-learn**: Classification, regression, clustering, preprocessing
- **LightGBM**: Gradient boosting for tabular data (via SynapseML or standalone)
- **XGBoost**: Extreme gradient boosting
- **PyTorch**: Deep learning (with GPU support on larger capacities)
- **SynapseML**: Distributed ML, Cognitive Services, OpenAI integration
- **FLAML**: Automated ML and hyperparameter tuning
- **MLflow**: Experiment tracking, model registry, model serving

**Architecture flow**:
```
Lakehouse (Delta tables)
    ↓  spark.read.format("delta")
Fabric Notebook (Spark + Python)
    ↓  mlflow.log_model()
MLflow Experiment (tracking)
    ↓  mlflow.register_model()
Model Registry (versioning + stages)
    ↓  PREDICT() or mlflow.pyfunc.load_model()
Warehouse / Lakehouse (scored data)
    ↓  Power BI DirectLake
Power BI Report (predictions visualized)
```

**Fabric vs standalone MLflow**:
| Aspect | Fabric Data Science | Standalone MLflow |
|--------|-------------------|-------------------|
| Setup | Zero-config, pre-integrated | Install MLflow server, configure backend store |
| Compute | Managed Spark clusters | Self-managed infrastructure |
| Storage | Lakehouse (OneLake) | S3/ADLS/local file system |
| Model serving | PREDICT function + registry | MLflow Models serve or custom deployment |
| BI integration | Semantic link to Power BI | Manual data export |
| Governance | Fabric workspace RBAC | Custom auth layer |

## 2. ML Experiments

MLflow experiments in Fabric track all aspects of ML training runs — parameters, metrics, artifacts, and models.

**Create an experiment**:

Option A — Via the Fabric portal:
1. In a workspace, click **+ New** > **Experiment**.
2. Name the experiment (e.g., `churn-prediction`).
3. The experiment appears in the workspace item list.

Option B — Via notebook code:
```python
import mlflow

# Set the active experiment (creates if it doesn't exist)
mlflow.set_experiment("churn-prediction")
```

**Basic tracking pattern**:
```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

mlflow.set_experiment("churn-prediction")

with mlflow.start_run(run_name="rf-baseline"):
    # Log parameters
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 10)
    mlflow.log_param("random_state", 42)

    # Train
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate and log metrics
    y_pred = model.predict(X_test)
    mlflow.log_metric("accuracy", accuracy_score(y_test, y_pred))
    mlflow.log_metric("f1_weighted", f1_score(y_test, y_pred, average="weighted"))

    # Log the model artifact
    mlflow.sklearn.log_model(model, "model")
```

**Autologging** (automatically captures parameters, metrics, and model):
```python
# For scikit-learn
mlflow.sklearn.autolog()

# For LightGBM
mlflow.lightgbm.autolog()

# For XGBoost
mlflow.xgboost.autolog()

# For PyTorch
mlflow.pytorch.autolog()

# Then just train — everything is logged automatically
model = RandomForestClassifier(n_estimators=100, max_depth=10)
model.fit(X_train, y_train)
```

**Comparing runs in the experiment UI**:
1. Open the experiment in the Fabric portal.
2. Select multiple runs using the checkboxes.
3. Click **Compare** to see a side-by-side table of parameters and metrics.
4. Use the built-in charts to visualize metric trends across runs.
5. Sort runs by any metric to find the best performing model.

**Logging additional artifacts**:
```python
with mlflow.start_run():
    # Log a plot
    fig, ax = plt.subplots()
    ax.plot(history["loss"])
    fig.savefig("/tmp/loss_curve.png")
    mlflow.log_artifact("/tmp/loss_curve.png")

    # Log a data file
    mlflow.log_artifact("/tmp/feature_importance.csv")

    # Log a dictionary as JSON
    mlflow.log_dict({"features": FEATURE_COLS, "target": TARGET_COL}, "data_schema.json")
```

## 3. Notebook ML Workflows

Fabric notebooks are the primary development surface for ML. They run on managed Spark clusters with Python, R, and Scala support.

**Loading data from a lakehouse**:
```python
# Read a Delta table (preferred)
df_spark = spark.read.format("delta").load("Tables/customers")

# Read via SQL
df_spark = spark.sql("SELECT * FROM lakehouse.customers WHERE active = true")

# Read a CSV/Parquet file from the Files section
df_spark = spark.read.format("csv").option("header", "true").load("Files/raw/data.csv")
df_spark = spark.read.format("parquet").load("Files/processed/data.parquet")
```

**Converting to pandas for ML**:
```python
# Convert Spark DataFrame to pandas (ensure data fits in memory)
df = df_spark.toPandas()
print(f"Shape: {df.shape}")

# For large datasets, sample first
df_sample = df_spark.sample(fraction=0.1, seed=42).toPandas()
```

**Feature engineering pattern**:
```python
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer

# Separate features and target
TARGET_COL = "churn"
FEATURE_COLS = [c for c in df.columns if c != TARGET_COL]

X = df[FEATURE_COLS].copy()
y = df[TARGET_COL].copy()

# Handle nulls
numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()

num_imputer = SimpleImputer(strategy="median")
X[numeric_cols] = num_imputer.fit_transform(X[numeric_cols])

cat_imputer = SimpleImputer(strategy="most_frequent")
X[categorical_cols] = cat_imputer.fit_transform(X[categorical_cols])

# Encode categoricals
label_encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    X[col] = le.fit_transform(X[col].astype(str))
    label_encoders[col] = le

# Scale numerics
scaler = StandardScaler()
X[numeric_cols] = scaler.fit_transform(X[numeric_cols])
```

**Train/test split**:
```python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y  # stratify for classification
)
print(f"Train: {X_train.shape}, Test: {X_test.shape}")
```

**Classification pattern**:
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

model = RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))
print(f"Confusion matrix:\n{confusion_matrix(y_test, y_pred)}")
```

**Regression pattern**:
```python
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

model = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
print(f"MAE:  {mean_absolute_error(y_test, y_pred):.4f}")
print(f"R2:   {r2_score(y_test, y_pred):.4f}")
```

**Clustering pattern**:
```python
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

model = KMeans(n_clusters=5, random_state=42, n_init=10)
labels = model.fit_predict(X)

print(f"Silhouette score: {silhouette_score(X, labels):.4f}")
print(f"Cluster sizes: {pd.Series(labels).value_counts().to_dict()}")
```

**Writing results back to lakehouse**:
```python
# Add predictions to the DataFrame
df["prediction"] = model.predict(X)

# Convert to Spark and write
df_result = spark.createDataFrame(df)
df_result.write.format("delta").mode("overwrite").save("Tables/customers_scored")

# Or append predictions
df_result.write.format("delta").mode("append").save("Tables/prediction_log")
```

## 4. SynapseML

SynapseML (formerly MMLSpark) provides distributed ML capabilities that run natively on Spark, enabling large-scale model training without converting to pandas.

**LightGBM on Spark** (distributed training):
```python
from synapse.ml.lightgbm import LightGBMClassifier, LightGBMRegressor
from pyspark.ml.feature import VectorAssembler

# Assemble features into a vector column
assembler = VectorAssembler(inputCols=feature_cols, outputCol="features")
df_assembled = assembler.transform(df_spark)

# Train a distributed LightGBM classifier
lgbm = LightGBMClassifier(
    featuresCol="features",
    labelCol="label",
    numLeaves=31,
    numIterations=100,
    learningRate=0.1,
    objective="binary"
)
model = lgbm.fit(df_assembled)

# Predict
predictions = model.transform(df_assembled)
display(predictions.select("features", "label", "prediction", "probability"))
```

**LightGBM Regressor**:
```python
lgbm_reg = LightGBMRegressor(
    featuresCol="features",
    labelCol="target",
    numLeaves=31,
    numIterations=200,
    learningRate=0.05,
    objective="regression"
)
model = lgbm_reg.fit(train_df)
```

**Cognitive Services integration** (text analytics):
```python
from synapse.ml.cognitive import TextSentiment, AnalyzeText

# Sentiment analysis
sentiment = TextSentiment(
    textCol="review_text",
    outputCol="sentiment",
    subscriptionKey="<cognitive-services-key>",
    endpoint="<cognitive-services-endpoint>"
)
result = sentiment.transform(df_spark)
display(result.select("review_text", "sentiment"))
```

**Anomaly detection**:
```python
from synapse.ml.cognitive import SimpleDetectAnomalies

anomaly_detector = SimpleDetectAnomalies(
    subscriptionKey="<key>",
    endpoint="<endpoint>",
    timestampCol="timestamp",
    valueCol="metric_value",
    outputCol="anomalies",
    granularity="daily"
)
result = anomaly_detector.transform(df_spark)
```

**OpenAI integration via SynapseML**:
```python
from synapse.ml.cognitive import OpenAICompletion

completion = OpenAICompletion(
    subscriptionKey="<openai-key>",
    deploymentName="gpt-4",
    promptCol="prompt_text",
    outputCol="completion",
    maxTokens=500
)
result = completion.transform(df_spark)
display(result.select("prompt_text", "completion"))
```

**Spark ML pipeline with SynapseML**:
```python
from pyspark.ml import Pipeline
from pyspark.ml.feature import VectorAssembler, StringIndexer
from synapse.ml.lightgbm import LightGBMClassifier

# Build a pipeline
indexer = StringIndexer(inputCol="category", outputCol="category_idx")
assembler = VectorAssembler(inputCols=["feature1", "feature2", "category_idx"], outputCol="features")
lgbm = LightGBMClassifier(featuresCol="features", labelCol="label")

pipeline = Pipeline(stages=[indexer, assembler, lgbm])
pipeline_model = pipeline.fit(train_df)
predictions = pipeline_model.transform(test_df)
```

## 5. Model Registry & Deployment

The Fabric model registry provides centralized model management with versioning and lifecycle stages.

**Register a model from an experiment run**:
```python
import mlflow

# After a training run, register the model
model_uri = f"runs:/{run_id}/model"
model_info = mlflow.register_model(model_uri, "churn-classifier")
print(f"Registered version: {model_info.version}")
```

**Register directly during a run**:
```python
with mlflow.start_run():
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)

    # Log and register in one step
    mlflow.sklearn.log_model(
        model, "model",
        registered_model_name="churn-classifier"
    )
```

**Model versioning and stages**:
```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Transition to Staging
client.transition_model_version_stage(
    name="churn-classifier",
    version=1,
    stage="Staging"
)

# Promote to Production
client.transition_model_version_stage(
    name="churn-classifier",
    version=1,
    stage="Production",
    archive_existing_versions=True  # Archives the current Production model
)

# Archive an old version
client.transition_model_version_stage(
    name="churn-classifier",
    version=1,
    stage="Archived"
)
```

**Stage lifecycle**:
| Stage | Purpose | Typical Use |
|-------|---------|-------------|
| `None` | Default after registration | Initial state |
| `Staging` | Pre-production validation | A/B testing, validation runs |
| `Production` | Active serving model | Batch scoring, PREDICT function |
| `Archived` | Retired model | Historical reference |

**Load a model for inference**:
```python
# Load by version number
model = mlflow.pyfunc.load_model("models:/churn-classifier/3")

# Load by stage
model = mlflow.pyfunc.load_model("models:/churn-classifier/Production")

# Load the sklearn model directly (for sklearn-specific methods)
model = mlflow.sklearn.load_model("models:/churn-classifier/Production")
```

**List and search models**:
```python
client = MlflowClient()

# List all registered models
for rm in client.search_registered_models():
    print(f"{rm.name}: {rm.description}")

# List versions of a specific model
for mv in client.search_model_versions("name='churn-classifier'"):
    print(f"  v{mv.version} | Stage: {mv.current_stage} | Run: {mv.run_id[:8]}")
```

**Add metadata to models**:
```python
# Update model description
client.update_registered_model(
    name="churn-classifier",
    description="Predicts customer churn probability based on usage patterns."
)

# Tag a model version
client.set_model_version_tag("churn-classifier", version="3", key="validated", value="true")
client.set_model_version_tag("churn-classifier", version="3", key="accuracy", value="0.94")
```

## 6. PREDICT Function

The T-SQL `PREDICT` function enables batch scoring directly in a Fabric warehouse or lakehouse SQL endpoint, without moving data to a notebook.

**Prerequisites**:
1. A registered model in the Fabric model registry (ONNX format or supported framework).
2. A Fabric warehouse or lakehouse SQL endpoint with the input data table.
3. The model must be accessible from the warehouse's workspace.

**Basic PREDICT syntax**:
```sql
SELECT
    d.*,
    p.predicted_value
FROM
    PREDICT(
        MODEL = 'my-model',
        DATA = dbo.input_table AS d,
        RUNTIME = ONNX
    )
    WITH (
        predicted_value FLOAT
    ) AS p;
```

**PREDICT with specific model version**:
```sql
SELECT
    d.customer_id,
    d.feature1,
    d.feature2,
    p.churn_probability
FROM
    PREDICT(
        MODEL = 'churn-classifier',
        DATA = dbo.customer_features AS d,
        RUNTIME = ONNX
    )
    WITH (
        churn_probability FLOAT
    ) AS p
WHERE p.churn_probability > 0.7;
```

**Create a scored table**:
```sql
CREATE TABLE dbo.customer_scores AS
SELECT
    d.customer_id,
    d.segment,
    p.churn_probability,
    CASE WHEN p.churn_probability > 0.5 THEN 'High Risk' ELSE 'Low Risk' END AS risk_category,
    GETDATE() AS scored_at
FROM
    PREDICT(
        MODEL = 'churn-classifier',
        DATA = dbo.customer_features AS d,
        RUNTIME = ONNX
    )
    WITH (
        churn_probability FLOAT
    ) AS p;
```

**Converting a model to ONNX** (required for PREDICT):
```python
import onnxmltools
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# Load the trained model
model = mlflow.sklearn.load_model("models:/churn-classifier/Production")

# Define input schema
num_features = len(FEATURE_COLS)
initial_type = [("input", FloatTensorType([None, num_features]))]

# Convert
onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset=13)

# Save
with open("churn_classifier.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

# Log to MLflow
with mlflow.start_run():
    mlflow.log_artifact("churn_classifier.onnx")
```

**Input/output schema considerations**:
- Input columns in the SQL table must match the model's feature names and types exactly.
- Output column names in the `WITH` clause must match the model's output tensor names.
- For multi-output models, list all output columns in the `WITH` clause.
- FLOAT, INT, and VARCHAR types are supported for input/output mapping.

## 7. Semantic Link

Semantic link (SemPy) bridges Power BI semantic models and Fabric notebooks, enabling data scientists to read Power BI data, evaluate DAX measures, and write ML results back for reporting.

**Install and import**:
```python
# SemPy is pre-installed in Fabric notebooks
# If missing, install:
# %pip install sempy-fabric

import sempy.fabric as fabric
from sempy.fabric import FabricDataFrame
```

**Discover datasets**:
```python
# List all datasets (semantic models) in the workspace
datasets = fabric.list_datasets()
display(datasets)

# List tables in a dataset
tables = fabric.list_tables("Sales Analytics")
display(tables)

# List measures in a dataset
measures = fabric.list_measures("Sales Analytics")
display(measures)

# List columns for a specific table
columns = fabric.list_columns("Sales Analytics", "FactSales")
display(columns)
```

**Read a table as FabricDataFrame**:
```python
# Read an entire table
df = fabric.read_table("Sales Analytics", "DimCustomer")
print(f"Loaded {len(df)} rows")
display(df.head())

# FabricDataFrame extends pandas DataFrame — all pandas operations work
high_value = df[df["TotalPurchases"] > 1000]
```

**Evaluate DAX measures**:
```python
# Evaluate a measure grouped by a dimension
result = fabric.evaluate_measure(
    dataset="Sales Analytics",
    measure="Total Revenue",
    groupby_columns=["DimProduct[Category]", "DimDate[Year]"]
)
display(result)

# Evaluate multiple measures
result = fabric.evaluate_measure(
    dataset="Sales Analytics",
    measure=["Total Revenue", "Avg Order Value"],
    groupby_columns=["DimCustomer[Segment]"],
    filters={"DimDate[Year]": [2024, 2025]}
)
display(result)
```

**Execute arbitrary DAX queries**:
```python
dax = """
EVALUATE
SUMMARIZECOLUMNS(
    DimProduct[Category],
    DimDate[CalendarYear],
    "Revenue", [Total Revenue],
    "Orders", [Order Count]
)
ORDER BY DimDate[CalendarYear] DESC, [Revenue] DESC
"""
result = fabric.evaluate_dax("Sales Analytics", dax)
display(result)
```

**Semantic functions on FabricDataFrame**:
```python
df = fabric.read_table("Sales Analytics", "DimCustomer")

# is_holiday — checks dates against holiday calendar
# find_anomalies — detects anomalies in a series

# Add a calculated column using a DAX measure
df = fabric.add_measure(df, dataset="Sales Analytics", measure="Customer Lifetime Value")
```

**Power BI data → ML pipeline → Power BI visualization**:
```python
# Step 1: Read Power BI data via semantic link
df = fabric.read_table("Sales Analytics", "FactSales")

# Step 2: Train a model (using the data)
# ... ML training code ...

# Step 3: Write predictions to lakehouse
predictions_spark = spark.createDataFrame(predictions_df)
predictions_spark.write.format("delta").mode("overwrite").save("Tables/sales_predictions")

# Step 4: Power BI can now connect to the lakehouse table via DirectLake
```

## 8. Feature Engineering

Feature engineering transforms raw data into informative features for ML models. Fabric supports both pandas-based and Spark ML pipeline approaches.

**Common pandas transformations**:
```python
from sklearn.preprocessing import (
    StandardScaler, MinMaxScaler, LabelEncoder,
    OneHotEncoder, OrdinalEncoder
)
from sklearn.impute import SimpleImputer

# Numeric scaling
scaler = StandardScaler()
X_train[numeric_cols] = scaler.fit_transform(X_train[numeric_cols])
X_test[numeric_cols] = scaler.transform(X_test[numeric_cols])  # transform only, no fit

# One-hot encoding
encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
encoded_train = encoder.fit_transform(X_train[categorical_cols])
encoded_test = encoder.transform(X_test[categorical_cols])

# Imputation
imputer = SimpleImputer(strategy="median")
X_train[numeric_cols] = imputer.fit_transform(X_train[numeric_cols])
X_test[numeric_cols] = imputer.transform(X_test[numeric_cols])
```

**Spark ML pipelines** (for large datasets):
```python
from pyspark.ml.feature import (
    VectorAssembler, StringIndexer, OneHotEncoder,
    StandardScaler, Imputer, Bucketizer
)
from pyspark.ml import Pipeline

# String indexing (categorical → numeric)
indexers = [
    StringIndexer(inputCol=col, outputCol=f"{col}_idx", handleInvalid="keep")
    for col in categorical_cols
]

# One-hot encoding
encoders = [
    OneHotEncoder(inputCol=f"{col}_idx", outputCol=f"{col}_ohe")
    for col in categorical_cols
]

# Assemble all features into a single vector
feature_cols = numeric_cols + [f"{col}_ohe" for col in categorical_cols]
assembler = VectorAssembler(inputCols=feature_cols, outputCol="features")

# Scale
scaler = StandardScaler(inputCol="features", outputCol="scaled_features")

# Build pipeline
pipeline = Pipeline(stages=indexers + encoders + [assembler, scaler])
pipeline_model = pipeline.fit(train_df)
train_transformed = pipeline_model.transform(train_df)
test_transformed = pipeline_model.transform(test_df)
```

**Date/time feature extraction**:
```python
df["day_of_week"] = df["date"].dt.dayofweek
df["month"] = df["date"].dt.month
df["quarter"] = df["date"].dt.quarter
df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
df["days_since_event"] = (pd.Timestamp.now() - df["last_event_date"]).dt.days
```

**Feature store patterns** (saving reusable features):
```python
# Save engineered features to lakehouse as a reusable feature table
feature_df = spark.createDataFrame(X_train)
feature_df.write.format("delta").mode("overwrite").save("Tables/customer_features_v1")

# Load features in subsequent experiments
features = spark.read.format("delta").load("Tables/customer_features_v1").toPandas()
```

## 9. AutoML & Hyperparameter Tuning

Fabric supports automated ML with FLAML and hyperparameter tuning with Optuna or Hyperopt.

**FLAML AutoML**:
```python
from flaml import AutoML

automl = AutoML()
automl_settings = {
    "time_budget": 120,           # seconds
    "metric": "accuracy",          # or "r2", "rmse", "f1", "log_loss"
    "task": "classification",      # or "regression"
    "log_file_name": "flaml.log",
    "seed": 42,
    "estimator_list": ["lgbm", "xgboost", "rf", "extra_tree"],
    "n_jobs": -1,
}

automl.fit(X_train, y_train, **automl_settings)

print(f"Best model: {automl.best_estimator}")
print(f"Best config: {automl.best_config}")
print(f"Best score: {automl.best_loss:.4f}")

# Log best model to MLflow
with mlflow.start_run(run_name="flaml-best"):
    mlflow.log_params(automl.best_config)
    mlflow.log_metric("best_loss", automl.best_loss)
    mlflow.sklearn.log_model(automl.model, "model")
```

**Optuna hyperparameter tuning**:
```python
import optuna
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 50, 500),
        "max_depth": trial.suggest_int("max_depth", 3, 20),
        "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
        "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 10),
        "random_state": 42,
    }

    model = RandomForestClassifier(**params)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    return accuracy_score(y_test, y_pred)

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=50)

print(f"Best trial: {study.best_trial.value:.4f}")
print(f"Best params: {study.best_trial.params}")

# Log best trial to MLflow
with mlflow.start_run(run_name="optuna-best"):
    mlflow.log_params(study.best_trial.params)
    mlflow.log_metric("accuracy", study.best_trial.value)
    best_model = RandomForestClassifier(**study.best_trial.params, random_state=42)
    best_model.fit(X_train, y_train)
    mlflow.sklearn.log_model(best_model, "model")
```

**Hyperopt tuning**:
```python
from hyperopt import fmin, tpe, hp, Trials, STATUS_OK

def objective(params):
    params["n_estimators"] = int(params["n_estimators"])
    params["max_depth"] = int(params["max_depth"])
    model = RandomForestClassifier(**params, random_state=42)
    model.fit(X_train, y_train)
    accuracy = accuracy_score(y_test, model.predict(X_test))
    return {"loss": -accuracy, "status": STATUS_OK}

space = {
    "n_estimators": hp.quniform("n_estimators", 50, 500, 50),
    "max_depth": hp.quniform("max_depth", 3, 20, 1),
    "min_samples_split": hp.randint("min_samples_split", 2, 20),
}

trials = Trials()
best = fmin(fn=objective, space=space, algo=tpe.suggest, max_evals=50, trials=trials)
print(f"Best params: {best}")
```

**Cross-validation**:
```python
from sklearn.model_selection import cross_val_score

scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
print(f"CV accuracy: {scores.mean():.4f} (+/- {scores.std():.4f})")

# Log CV results to MLflow
with mlflow.start_run(run_name="cv-evaluation"):
    mlflow.log_metric("cv_mean_accuracy", scores.mean())
    mlflow.log_metric("cv_std_accuracy", scores.std())
    for i, score in enumerate(scores):
        mlflow.log_metric(f"cv_fold_{i}", score)
```

## 10. Visualization

Fabric notebooks support inline visualization with matplotlib, seaborn, and Plotly for ML analysis.

**Confusion matrix**:
```python
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt

cm = confusion_matrix(y_test, y_pred)
disp = ConfusionMatrixDisplay(confusion_matrix=cm)
disp.plot(cmap="Blues")
plt.title("Confusion Matrix")
plt.tight_layout()
plt.savefig("/tmp/confusion_matrix.png")
mlflow.log_artifact("/tmp/confusion_matrix.png")
plt.show()
```

**ROC curve (binary classification)**:
```python
from sklearn.metrics import roc_curve, auc

y_prob = model.predict_proba(X_test)[:, 1]
fpr, tpr, _ = roc_curve(y_test, y_prob)
roc_auc = auc(fpr, tpr)

plt.figure()
plt.plot(fpr, tpr, label=f"AUC = {roc_auc:.3f}")
plt.plot([0, 1], [0, 1], "k--")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve")
plt.legend()
plt.savefig("/tmp/roc_curve.png")
mlflow.log_artifact("/tmp/roc_curve.png")
plt.show()
```

**Feature importance**:
```python
if hasattr(model, "feature_importances_"):
    importance = pd.DataFrame({
        "feature": FEATURE_COLS,
        "importance": model.feature_importances_
    }).sort_values("importance", ascending=True)

    plt.figure(figsize=(10, max(6, len(FEATURE_COLS) * 0.3)))
    plt.barh(importance["feature"], importance["importance"])
    plt.xlabel("Importance")
    plt.title("Feature Importance")
    plt.tight_layout()
    plt.savefig("/tmp/feature_importance.png")
    mlflow.log_artifact("/tmp/feature_importance.png")
    plt.show()
```

**Predicted vs actual (regression)**:
```python
plt.figure(figsize=(8, 8))
plt.scatter(y_test, y_pred, alpha=0.5, s=10)
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], "r--")
plt.xlabel("Actual")
plt.ylabel("Predicted")
plt.title("Predicted vs Actual")
plt.tight_layout()
plt.show()
```

## 11. Monitoring & Governance

Monitoring ML models in production ensures ongoing quality and compliance.

**Experiment comparison for model selection**:
```python
from mlflow.tracking import MlflowClient

client = MlflowClient()
experiment = client.get_experiment_by_name("churn-prediction")

runs = client.search_runs(
    experiment_ids=[experiment.experiment_id],
    order_by=["metrics.accuracy DESC"],
    max_results=10
)

print("Top runs by accuracy:")
for run in runs:
    acc = run.data.metrics.get("accuracy", "N/A")
    model_type = run.data.params.get("model_type", "unknown")
    print(f"  {run.info.run_id[:8]}  acc={acc:.4f}  type={model_type}")
```

**Model lineage tracking**:
```python
# Every registered model version links back to its run
for mv in client.search_model_versions("name='churn-classifier'"):
    run = client.get_run(mv.run_id)
    print(f"v{mv.version} | Stage: {mv.current_stage}")
    print(f"  Source run: {mv.run_id[:8]}")
    print(f"  Params: {run.data.params}")
    print(f"  Metrics: {run.data.metrics}")
```

**Data drift detection pattern**:
```python
import numpy as np

def detect_drift(reference_df, current_df, columns, threshold=0.1):
    """Compare distributions between reference and current datasets."""
    from scipy.stats import ks_2samp

    drift_report = {}
    for col in columns:
        if reference_df[col].dtype in [np.float64, np.int64]:
            stat, p_value = ks_2samp(reference_df[col].dropna(), current_df[col].dropna())
            drift_report[col] = {
                "ks_statistic": stat,
                "p_value": p_value,
                "drift_detected": p_value < threshold
            }
    return drift_report

drift = detect_drift(training_data, new_data, FEATURE_COLS)
for col, result in drift.items():
    if result["drift_detected"]:
        print(f"DRIFT in '{col}': KS={result['ks_statistic']:.4f}, p={result['p_value']:.4f}")
```

**Responsible AI considerations**:
- Log model fairness metrics (demographic parity, equalized odds) alongside accuracy.
- Use SHAP values to provide feature-level explanations for individual predictions.
- Document model cards: intended use, limitations, evaluation data, ethical considerations.
- Version training data alongside models for full reproducibility.
- Implement human-in-the-loop review for high-stakes predictions.

## 12. Common Patterns

### Pattern 1: End-to-End Classification with MLflow

```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report
import pandas as pd

# Setup
mlflow.set_experiment("customer-churn")

# Load data
df = spark.read.format("delta").load("Tables/customers").toPandas()
X = df.drop(columns=["churn"])
y = df["churn"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Train with MLflow tracking
with mlflow.start_run(run_name="rf-v1"):
    params = {"n_estimators": 200, "max_depth": 15, "random_state": 42}
    mlflow.log_params(params)

    model = RandomForestClassifier(**params)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")
    mlflow.log_metric("accuracy", acc)
    mlflow.log_metric("f1_weighted", f1)

    mlflow.sklearn.log_model(model, "model", registered_model_name="churn-classifier")
    print(f"Accuracy: {acc:.4f}, F1: {f1:.4f}")
```

### Pattern 2: Batch Scoring with PREDICT in Warehouse

```sql
-- Step 1: Score customers using the registered ONNX model
CREATE TABLE dbo.churn_scores AS
SELECT
    d.customer_id,
    d.name,
    d.segment,
    p.churn_probability,
    CASE
        WHEN p.churn_probability > 0.7 THEN 'Critical'
        WHEN p.churn_probability > 0.4 THEN 'At Risk'
        ELSE 'Healthy'
    END AS risk_tier,
    GETDATE() AS scored_date
FROM
    PREDICT(
        MODEL = 'churn-classifier',
        DATA = dbo.customer_features AS d,
        RUNTIME = ONNX
    )
    WITH (
        churn_probability FLOAT
    ) AS p;

-- Step 2: Query high-risk customers
SELECT * FROM dbo.churn_scores
WHERE risk_tier IN ('Critical', 'At Risk')
ORDER BY churn_probability DESC;
```

### Pattern 3: SynapseML Text Classification

```python
from synapse.ml.lightgbm import LightGBMClassifier
from synapse.ml.featurize.text import TextFeaturizer
from pyspark.ml import Pipeline

# Featurize text into TF-IDF vectors
text_featurizer = TextFeaturizer(
    inputCol="description",
    outputCol="text_features",
    numFeatures=1000
)

# Classify with LightGBM
classifier = LightGBMClassifier(
    featuresCol="text_features",
    labelCol="category_idx",
    numLeaves=31,
    numIterations=100
)

pipeline = Pipeline(stages=[text_featurizer, classifier])
model = pipeline.fit(train_df)
predictions = model.transform(test_df)
display(predictions.select("description", "category_idx", "prediction"))
```

### Pattern 4: Semantic Link — Power BI Data to Model to Predictions

```python
import sempy.fabric as fabric
import mlflow
import mlflow.sklearn
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np

# Step 1: Read Power BI data via semantic link
df = fabric.read_table("Sales Analytics", "FactSales")
print(f"Loaded {len(df)} sales records from Power BI")

# Step 2: Prepare features
feature_cols = ["quantity", "unit_price", "discount", "customer_segment_idx"]
TARGET = "revenue"
X = df[feature_cols]
y = df[TARGET]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Step 3: Train and track
mlflow.set_experiment("revenue-prediction")
with mlflow.start_run(run_name="gbr-v1"):
    model = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    mlflow.log_metric("rmse", rmse)
    mlflow.log_metric("r2", r2)
    mlflow.sklearn.log_model(model, "model", registered_model_name="revenue-predictor")

# Step 4: Score all data and write predictions to lakehouse
df["predicted_revenue"] = model.predict(X)
predictions_spark = spark.createDataFrame(df)
predictions_spark.write.format("delta").mode("overwrite").save("Tables/sales_predictions")

# Step 5: Power BI can now consume Tables/sales_predictions via DirectLake mode
print(f"Predictions written. RMSE: {rmse:.2f}, R2: {r2:.4f}")
```

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| MLflow API, experiment creation, logging patterns, model registry, run comparison, autologging | [`references/ml-experiments-mlflow.md`](./references/ml-experiments-mlflow.md) |
| Spark ML pipelines, scikit-learn, FLAML AutoML, SynapseML LightGBM, cross-validation, ONNX export | [`references/model-training.md`](./references/model-training.md) |
| SemPy API, read_table, evaluate_measure, evaluate_dax, FabricDataFrame, Power BI write-back | [`references/semantic-link.md`](./references/semantic-link.md) |
| PREDICT T-SQL syntax, batch scoring patterns, model deployment to Fabric, monitoring predictions | [`references/predict-integration.md`](./references/predict-integration.md) |
