# Model Training

## Overview

Fabric Data Science supports multiple model training approaches: scikit-learn on pandas DataFrames, Spark ML pipelines for large datasets, FLAML AutoML for automated model selection, distributed training with SynapseML, and hyperparameter tuning with Optuna or Hyperopt. This reference covers Spark ML pipelines, scikit-learn workflows in Fabric, FLAML AutoML, distributed training, cross-validation, hyperparameter tuning, and saving models to lakehouses.

---

## Spark ML Pipelines

Spark ML pipelines process data at scale without converting to pandas. Ideal for datasets > available driver memory.

### Complete Classification Pipeline

```python
from pyspark.ml import Pipeline
from pyspark.ml.feature import (
    StringIndexer, OneHotEncoder, VectorAssembler,
    StandardScaler, Imputer, Bucketizer
)
from pyspark.ml.classification import RandomForestClassifier, GBTClassifier
from pyspark.ml.evaluation import BinaryClassificationEvaluator, MulticlassClassificationEvaluator
from pyspark.ml.tuning import CrossValidator, ParamGridBuilder
from pyspark.sql import functions as F

# Load data
df = spark.read.format("delta").load("Tables/customer_features")

# Check class balance
df.groupBy("churn").count().show()

# Feature lists
categorical_cols = ["segment", "region", "plan_type"]
numeric_cols     = ["tenure_months", "monthly_charges", "total_charges", "num_products"]
label_col        = "churn"

# Stage 1: String indexing for categoricals
indexers = [
    StringIndexer(inputCol=col, outputCol=f"{col}_idx", handleInvalid="keep")
    for col in categorical_cols
]

# Stage 2: One-hot encoding
encoders = [
    OneHotEncoder(inputCol=f"{col}_idx", outputCol=f"{col}_ohe", dropLast=True)
    for col in categorical_cols
]

# Stage 3: Impute missing numerics
imputer = Imputer(
    inputCols=numeric_cols,
    outputCols=[f"{c}_imp" for c in numeric_cols],
    strategy="median"
)

# Stage 4: Assemble all features
feature_cols = [f"{c}_ohe" for c in categorical_cols] + [f"{c}_imp" for c in numeric_cols]
assembler = VectorAssembler(
    inputCols=feature_cols,
    outputCol="raw_features",
    handleInvalid="keep"
)

# Stage 5: Scale features
scaler = StandardScaler(inputCol="raw_features", outputCol="features", withMean=True, withStd=True)

# Stage 6: Label indexing
label_indexer = StringIndexer(inputCol=label_col, outputCol="label")

# Stage 7: Classifier
rf = RandomForestClassifier(
    featuresCol="features",
    labelCol="label",
    numTrees=200,
    maxDepth=10,
    minInstancesPerNode=5,
    seed=42
)

# Build pipeline
pipeline = Pipeline(stages=indexers + encoders + [imputer, assembler, scaler, label_indexer, rf])

# Train/test split
train_df, test_df = df.randomSplit([0.8, 0.2], seed=42)
print(f"Train: {train_df.count()}, Test: {test_df.count()}")

# Fit
pipeline_model = pipeline.fit(train_df)
predictions    = pipeline_model.transform(test_df)

# Evaluate
binary_eval  = BinaryClassificationEvaluator(labelCol="label", metricName="areaUnderROC")
multi_eval   = MulticlassClassificationEvaluator(labelCol="label", metricName="f1")

roc_auc = binary_eval.evaluate(predictions)
f1      = multi_eval.evaluate(predictions)
print(f"AUC-ROC: {roc_auc:.4f}, F1: {f1:.4f}")
```

### Spark ML Regression Pipeline

```python
from pyspark.ml.regression import GBTRegressor
from pyspark.ml.evaluation import RegressionEvaluator

gbt = GBTRegressor(
    featuresCol="features",
    labelCol="revenue",
    maxIter=100,
    maxDepth=6,
    stepSize=0.1,
    seed=42
)

pipeline = Pipeline(stages=indexers + encoders + [imputer, assembler, scaler, gbt])
model    = pipeline.fit(train_df)
preds    = model.transform(test_df)

evaluator = RegressionEvaluator(labelCol="revenue", predictionCol="prediction")
rmse = evaluator.evaluate(preds, {evaluator.metricName: "rmse"})
r2   = evaluator.evaluate(preds, {evaluator.metricName: "r2"})
mae  = evaluator.evaluate(preds, {evaluator.metricName: "mae"})
print(f"RMSE: {rmse:.2f}, R2: {r2:.4f}, MAE: {mae:.2f}")
```

---

## Scikit-learn in Fabric

For datasets that fit in memory (< 4–8 GB), scikit-learn runs on the Spark driver's pandas data.

### End-to-End Pattern

```python
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline as SkPipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    classification_report, roc_auc_score, confusion_matrix,
    accuracy_score, f1_score
)
import mlflow
import mlflow.sklearn

# Load data from lakehouse
df = spark.read.format("delta").load("Tables/customer_features").toPandas()
print(f"Shape: {df.shape}")

# Features and target
TARGET = "churn"
NUMERIC_COLS    = ["tenure_months", "monthly_charges", "total_charges", "num_products"]
CATEGORICAL_COLS = ["segment", "region", "plan_type"]

X = df[NUMERIC_COLS + CATEGORICAL_COLS]
y = df[TARGET].astype(int)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Build scikit-learn ColumnTransformer
numeric_transformer = SkPipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler",  StandardScaler())
])
categorical_transformer = SkPipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
])

preprocessor = ColumnTransformer([
    ("num", numeric_transformer,    NUMERIC_COLS),
    ("cat", categorical_transformer, CATEGORICAL_COLS)
])

# Build full pipeline
clf_pipeline = SkPipeline([
    ("preprocessor", preprocessor),
    ("classifier",   RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1))
])

# Train with MLflow tracking
mlflow.set_experiment("customer-churn-sklearn")
with mlflow.start_run(run_name="rf-full-pipeline"):
    mlflow.log_params({
        "n_estimators": 200, "max_depth": 12,
        "train_rows": len(X_train), "test_rows": len(X_test),
        "positive_rate": float(y_train.mean())
    })

    clf_pipeline.fit(X_train, y_train)

    y_pred  = clf_pipeline.predict(X_test)
    y_proba = clf_pipeline.predict_proba(X_test)[:, 1]

    mlflow.log_metrics({
        "accuracy":  accuracy_score(y_test, y_pred),
        "f1":        f1_score(y_test, y_pred, average="binary"),
        "roc_auc":   roc_auc_score(y_test, y_proba)
    })

    mlflow.sklearn.log_model(
        clf_pipeline, "model",
        registered_model_name="churn-sklearn-pipeline"
    )
    print(classification_report(y_test, y_pred, target_names=["Retained", "Churned"]))
```

---

## FLAML AutoML

FLAML finds the best model and hyperparameters within a time/resource budget.

```python
from flaml import AutoML
import mlflow

automl = AutoML()

automl_settings = {
    "time_budget":     300,               # seconds
    "metric":          "roc_auc",          # or "accuracy", "f1", "rmse", "r2"
    "task":            "classification",   # or "regression", "ts_forecast"
    "log_file_name":   "/tmp/flaml.log",
    "seed":            42,
    "n_concurrent_trials": 4,
    "estimator_list":  ["lgbm", "xgboost", "rf", "extra_tree", "lrl1"],
    "eval_method":     "cv",
    "n_splits":        5,
    "verbose":         1
}

mlflow.set_experiment("churn-automl")
with mlflow.start_run(run_name="flaml-300s"):
    automl.fit(X_train, y_train, **automl_settings)

    print(f"Best estimator:  {automl.best_estimator}")
    print(f"Best config:     {automl.best_config}")
    print(f"Best validation: {1 - automl.best_loss:.4f} (metric: {automl_settings['metric']})")

    # Evaluate on test set
    y_pred  = automl.predict(X_test)
    y_proba = automl.predict_proba(X_test)[:, 1]

    mlflow.log_params({**automl.best_config, "time_budget": automl_settings["time_budget"]})
    mlflow.log_metrics({
        "test_roc_auc":  roc_auc_score(y_test, y_proba),
        "test_accuracy": accuracy_score(y_test, y_pred),
        "test_f1":       f1_score(y_test, y_pred, average="binary")
    })
    mlflow.sklearn.log_model(automl.model.estimator, "model", registered_model_name="churn-automl")
```

---

## Distributed Training with SynapseML

SynapseML runs training across all Spark workers — ideal for > 10M rows.

```python
from synapse.ml.lightgbm import LightGBMClassifier, LightGBMRegressor
from synapse.ml.core.spark import FluentAPI
from pyspark.ml.feature import VectorAssembler
import mlflow

# Assemble features
assembler = VectorAssembler(inputCols=numeric_cols + [f"{c}_idx" for c in categorical_cols],
                             outputCol="features")
train_assembled = assembler.transform(train_df)
test_assembled  = assembler.transform(test_df)

lgbm = LightGBMClassifier(
    featuresCol      = "features",
    labelCol         = "label",
    numLeaves        = 64,
    numIterations    = 300,
    learningRate     = 0.05,
    minDataInLeaf    = 50,
    lambda1          = 0.1,
    lambda2          = 0.1,
    objective        = "binary",
    metric           = "auc",
    verbosity        = -1,
    numThreads       = 4,   # per executor
    useSingleDatasetMode = True  # faster on Fabric
)

mlflow.set_experiment("churn-synapseml")
with mlflow.start_run(run_name="lgbm-distributed"):
    model = lgbm.fit(train_assembled)
    preds = model.transform(test_assembled)

    # Evaluate
    from pyspark.ml.evaluation import BinaryClassificationEvaluator
    evaluator = BinaryClassificationEvaluator(labelCol="label", metricName="areaUnderROC")
    auc = evaluator.evaluate(preds)
    mlflow.log_metric("auc_roc", auc)
    print(f"Distributed LightGBM AUC-ROC: {auc:.4f}")

    mlflow.spark.log_model(model, "model", registered_model_name="churn-lgbm-spark")
```

---

## Cross-Validation

### Scikit-learn Cross-Validation

```python
from sklearn.model_selection import StratifiedKFold, cross_validate
import numpy as np

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

cv_results = cross_validate(
    clf_pipeline,
    X, y,
    cv=skf,
    scoring=["accuracy", "f1", "roc_auc"],
    return_train_score=True,
    n_jobs=-1
)

print("Cross-Validation Results:")
for metric in ["accuracy", "f1", "roc_auc"]:
    test_scores  = cv_results[f"test_{metric}"]
    train_scores = cv_results[f"train_{metric}"]
    print(f"  {metric}: test={test_scores.mean():.4f} ± {test_scores.std():.4f}  "
          f"train={train_scores.mean():.4f}")

with mlflow.start_run(run_name="rf-cv-5fold"):
    for i, score in enumerate(cv_results["test_roc_auc"]):
        mlflow.log_metric("cv_fold_auc", score, step=i)
    mlflow.log_metrics({
        "cv_mean_auc": cv_results["test_roc_auc"].mean(),
        "cv_std_auc":  cv_results["test_roc_auc"].std()
    })
```

### Spark ML Cross-Validation

```python
from pyspark.ml.tuning import CrossValidator, ParamGridBuilder

paramGrid = ParamGridBuilder() \
    .addGrid(rf.numTrees, [100, 200]) \
    .addGrid(rf.maxDepth, [8, 12]) \
    .build()

cv = CrossValidator(
    estimator=pipeline,
    estimatorParamMaps=paramGrid,
    evaluator=binary_eval,
    numFolds=3,
    seed=42,
    parallelism=2  # evaluate 2 configs in parallel
)

cv_model = cv.fit(train_df)
best_model = cv_model.bestModel
print(f"Best params: numTrees={best_model.stages[-1].getNumTrees}, "
      f"maxDepth={best_model.stages[-1].getMaxDepth()}")
```

---

## Hyperparameter Tuning

### Optuna Tuning

```python
import optuna
from sklearn.metrics import roc_auc_score

optuna.logging.set_verbosity(optuna.logging.WARNING)

def objective(trial):
    params = {
        "n_estimators":      trial.suggest_int("n_estimators", 50, 500, step=50),
        "max_depth":         trial.suggest_int("max_depth", 3, 20),
        "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
        "min_samples_leaf":  trial.suggest_int("min_samples_leaf", 1, 10),
        "max_features":      trial.suggest_categorical("max_features", ["sqrt", "log2", None]),
        "random_state":      42
    }
    clf = SkPipeline([
        ("preprocessor", preprocessor),
        ("classifier",   RandomForestClassifier(**params, n_jobs=-1))
    ])
    score = cross_val_score(clf, X_train, y_train, cv=3, scoring="roc_auc", n_jobs=-1).mean()
    return score

study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=42))
study.optimize(objective, n_trials=50, n_jobs=1, show_progress_bar=True)

print(f"Best trial AUC: {study.best_trial.value:.4f}")
print(f"Best params:    {study.best_trial.params}")

# Log best trial to MLflow
with mlflow.start_run(run_name="optuna-best"):
    mlflow.log_params(study.best_trial.params)
    mlflow.log_metric("cv_roc_auc", study.best_trial.value)
    best_model = SkPipeline([
        ("preprocessor", preprocessor),
        ("classifier",   RandomForestClassifier(**study.best_trial.params, n_jobs=-1))
    ])
    best_model.fit(X_train, y_train)
    mlflow.sklearn.log_model(best_model, "model", registered_model_name="churn-optuna-tuned")
```

---

## Saving Models to Lakehouse

### Save scikit-learn Model to Lakehouse Files/

```python
import pickle
import mlflow

# Save model pickle to lakehouse
model_path = "/lakehouse/default/Files/models/churn_rf_v3.pkl"
with open(model_path, "wb") as f:
    pickle.dump(clf_pipeline, f)
print(f"Model saved to {model_path}")

# Save ONNX model for PREDICT function
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# Get number of features after preprocessing
n_features = preprocessor.fit_transform(X_train).shape[1]
initial_type = [("float_input", FloatTensorType([None, n_features]))]
onnx_model = convert_sklearn(clf_pipeline, initial_types=initial_type, target_opset=13)

onnx_path = "/lakehouse/default/Files/models/churn_rf_v3.onnx"
with open(onnx_path, "wb") as f:
    f.write(onnx_model.SerializeToString())
print(f"ONNX model saved to {onnx_path}")

# Log ONNX to MLflow for PREDICT function use
with mlflow.start_run():
    mlflow.log_artifact(onnx_path)
    mlflow.onnx.log_model(onnx_model, "onnx_model", registered_model_name="churn-onnx")
```

### Save Spark ML Model to Lakehouse

```python
# Save Spark pipeline model to lakehouse Tables/ or Files/
model_save_path = "abfss://my-workspace@onelake.dfs.fabric.microsoft.com/ml-lakehouse.Lakehouse/Files/models/lgbm_pipeline_v2"
pipeline_model.save(model_save_path)

# Load it back
from pyspark.ml import PipelineModel
loaded_model = PipelineModel.load(model_save_path)
preds = loaded_model.transform(test_df)
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `MemoryError: Unable to allocate array` | Pandas DataFrame too large for driver memory | Use Spark ML instead; sample data; increase driver memory |
| `ValueError: Input contains NaN` | Imputer or model input has unhandled nulls | Add `SimpleImputer` in pipeline; check data upstream |
| `NotFittedError: This Pipeline instance is not fitted yet` | Calling `predict` before `fit` | Ensure `pipeline.fit(X_train, y_train)` is called first |
| `ConvergenceWarning: lbfgs failed to converge` | LogisticRegression max_iter too low | Increase `max_iter=1000`; scale features |
| `ValueError: could not convert string to float` | Categorical column not encoded | Verify all categorical columns are indexed/encoded in pipeline |
| `SynapseML: LightGBM failed with OOM on workers` | Executor memory exhausted | Increase executor memory in `%%configure`; reduce data per partition |
| `optuna.exceptions.TrialPruned` | Trial pruned by Optuna pruner | Expected behavior; add `optuna.pruners.NopPruner()` if unwanted |
| `skl2onnx: Unsupported converter for type` | Model type not supported by skl2onnx | Use a supported model type; custom pyfunc for unsupported models |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| `toPandas()` practical limit | Driver memory (4–56 GB depending on SKU) | Sample or aggregate before `toPandas()` |
| Spark ML Cross-Validator parallelism | `parallelism` parameter | Keep ≤ executor count to avoid OOM |
| FLAML time_budget max | No hard limit | Budget > 3600s rarely improves results significantly |
| Optuna trials | No hard limit | 50–200 trials typically sufficient for most problems |
| ONNX opset compatibility with PREDICT | Opset 7–15 tested | Use `target_opset=13` for best compatibility |
| Model file size for PREDICT | Practical limit ~500 MB | Large models may time out during PREDICT warm-up |
| Pickle file size | No hard limit | Large pickles (> 2 GB) require chunked saving |
