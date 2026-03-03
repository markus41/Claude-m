# Semantic Link (SemPy)

## Overview

Semantic link (`sempy-fabric`) bridges Microsoft Fabric notebooks and Power BI semantic models (datasets). It enables data scientists to read Power BI tables, evaluate DAX measures, execute arbitrary DAX queries, and sync changes — all from Python. The core class is `FabricDataFrame`, a pandas-compatible DataFrame with semantic model metadata. This reference covers the semantic-link API, reading datasets, evaluating DAX from Python, FabricDataFrame operations, semantic model sync, and lineage tracking.

---

## Installation and Import

```python
# sempy-fabric is pre-installed in Fabric notebooks
# If missing or version pinning required:
%pip install sempy-fabric==0.8.0

import sempy.fabric as fabric
from sempy.fabric import FabricDataFrame
from sempy.fabric._utils import create_report_visuals

# Verify version
import sempy
print(sempy.__version__)
```

---

## SemPy API Reference

| Function | Description | Key Parameters |
|----------|-------------|----------------|
| `fabric.list_datasets()` | List all semantic models in the workspace | — |
| `fabric.list_tables(dataset)` | List tables in a dataset | `dataset`: name or GUID |
| `fabric.list_columns(dataset, table)` | List columns for a table | |
| `fabric.list_measures(dataset)` | List all measures in a dataset | |
| `fabric.list_relationships(dataset)` | List table relationships | |
| `fabric.read_table(dataset, table)` | Read table as FabricDataFrame | `fully_qualified_columns`, `num_rows` |
| `fabric.evaluate_measure(dataset, measure, groupby_columns, filters)` | Evaluate DAX measure | `filters` as dict |
| `fabric.evaluate_dax(dataset, dax_string)` | Execute arbitrary DAX | Full EVALUATE query |
| `fabric.add_measure(df, dataset, measure)` | Add a DAX measure as a column | |
| `fabric.create_relationship_detector(dataset)` | Suggest relationships | For data quality analysis |

---

## Discover Datasets

```python
# List all semantic models in the current workspace
datasets = fabric.list_datasets()
display(datasets)
# Returns: DatasetId, DatasetName, WorkspaceId, TargetStorageMode, IsEffectiveIdentityRequired

# List datasets in a specific workspace
datasets_other = fabric.list_datasets(workspace="Analytics Production")
display(datasets_other)

# List tables in a dataset
tables = fabric.list_tables("Sales Analytics")
display(tables)
# Returns: Name, Description, IsHidden, DataCategory, IsPrivate

# List columns for a specific table
columns = fabric.list_columns("Sales Analytics", "FactSales")
display(columns)
# Returns: Column, DataType, ColumnCardinality, IsHidden, FormatString

# List all measures
measures = fabric.list_measures("Sales Analytics")
display(measures)
# Returns: Measure, DataType, Table, MeasureDescription, IsHidden, FormatString

# List relationships
relationships = fabric.list_relationships("Sales Analytics")
display(relationships)
```

---

## Read Tables as FabricDataFrame

```python
# Read an entire table
df = fabric.read_table("Sales Analytics", "DimCustomer")
print(f"Type:  {type(df)}")
print(f"Shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")
display(df.head(10))

# FabricDataFrame extends pandas — all pandas operations work
high_value = df[df["LifetimeValue"] > 10000].copy()
high_value["value_tier"] = "Platinum"

# Read with row limit (for large tables)
df_sample = fabric.read_table("Sales Analytics", "FactSales", num_rows=50000)

# Read with fully qualified column names (useful when multiple tables have same column names)
df_fqc = fabric.read_table(
    "Sales Analytics",
    "FactSales",
    fully_qualified_columns=True  # Returns "FactSales[OrderDate]" style column names
)
```

---

## Evaluate DAX Measures

```python
# Evaluate a single measure broken down by a dimension
result = fabric.evaluate_measure(
    dataset       = "Sales Analytics",
    measure       = "Total Revenue",
    groupby_columns = ["DimProduct[Category]", "DimDate[CalendarYear]"]
)
display(result)

# Evaluate multiple measures
result = fabric.evaluate_measure(
    dataset       = "Sales Analytics",
    measure       = ["Total Revenue", "Order Count", "Average Order Value"],
    groupby_columns = ["DimCustomer[Segment]", "DimDate[CalendarYear]"],
    filters       = {
        "DimDate[CalendarYear]":   [2024, 2025],
        "DimProduct[IsDiscounted]": [True]
    }
)
display(result)

# Return as plain pandas (not FabricDataFrame)
result_pd = fabric.evaluate_measure(
    dataset="Sales Analytics",
    measure="Customer Lifetime Value",
    groupby_columns=["DimCustomer[CustomerID]"]
)
# Already pandas-compatible — use standard pandas operations
top_clv = result_pd.nlargest(100, "Customer Lifetime Value")
```

---

## Execute Arbitrary DAX Queries

```python
# Full EVALUATE query
dax_query = """
EVALUATE
SUMMARIZECOLUMNS(
    DimProduct[Category],
    DimDate[CalendarYear],
    DimCustomer[Segment],
    "Revenue",         [Total Revenue],
    "Transactions",    [Order Count],
    "AvgOrderValue",   [Average Order Value],
    "UniqueCustomers", DISTINCTCOUNT(FactSales[CustomerKey])
)
ORDER BY
    DimDate[CalendarYear] DESC,
    "Revenue" DESC
"""

result = fabric.evaluate_dax("Sales Analytics", dax_query)
display(result)

# DAX query with measures and calculated values
dax_yoy = """
EVALUATE
ADDCOLUMNS(
    SUMMARIZECOLUMNS(
        DimDate[CalendarYear],
        DimProduct[Category],
        "Revenue", [Total Revenue]
    ),
    "RevenueLastYear",
    CALCULATE(
        [Total Revenue],
        SAMEPERIODLASTYEAR(DimDate[Date])
    ),
    "YoYGrowthPct",
    DIVIDE(
        [Total Revenue] - CALCULATE([Total Revenue], SAMEPERIODLASTYEAR(DimDate[Date])),
        CALCULATE([Total Revenue], SAMEPERIODLASTYEAR(DimDate[Date]))
    )
)
"""
yoy_df = fabric.evaluate_dax("Sales Analytics", dax_yoy)
display(yoy_df.sort_values("DimDate[CalendarYear]", ascending=False))
```

---

## FabricDataFrame Operations

`FabricDataFrame` inherits from `pandas.DataFrame` with additional semantic model metadata.

```python
from sempy.fabric import FabricDataFrame

# Read a table
df = fabric.read_table("Sales Analytics", "FactSales")

# --- Standard pandas operations ---
# Filtering
recent_sales = df[df["FactSales[OrderDate]"] >= "2025-01-01"]

# Aggregation
monthly_revenue = df.groupby("FactSales[OrderDate]")["FactSales[TotalAmount]"].sum()

# Merge with another FabricDataFrame
dim_products = fabric.read_table("Sales Analytics", "DimProduct")
enriched = df.merge(dim_products, on="FactSales[ProductKey]", how="left")

# --- Semantic-specific operations ---
# Get metadata
print(df._metadata)

# Check column semantic types
print(df.dtypes)

# Convert to Spark DataFrame for large-scale processing
spark_df = spark.createDataFrame(df)
spark_df.write.format("delta").mode("overwrite").saveAsTable("gold_lakehouse.enriched_sales")

# Add a DAX measure as a column
df_with_measure = fabric.add_measure(
    df,
    dataset="Sales Analytics",
    measure="Customer Lifetime Value"
)
display(df_with_measure.head())
```

---

## Semantic Functions

SemPy includes built-in functions for common analytics tasks.

```python
from sempy.fabric import FabricDataFrame

df = fabric.read_table("Sales Analytics", "FactSales")

# find_anomalies: detect anomalies in a numeric series
anomalies = df.find_anomalies(
    column="FactSales[TotalAmount]",
    group_by="FactSales[OrderDate]",
    method="iqr"  # or "zscore", "isolation_forest"
)
display(anomalies[anomalies["is_anomaly"] == True])

# Check dates for holiday status (uses built-in holiday calendar)
date_df = fabric.read_table("Sales Analytics", "DimDate")
date_df_with_holiday = date_df.assign(
    is_holiday=date_df["DimDate[Date]"].apply(lambda d: fabric.is_holiday(d, country="US"))
)
```

---

## Power BI Data → ML Pipeline → Write Back

```python
import sempy.fabric as fabric
import mlflow
import mlflow.sklearn
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error
import numpy as np

# Step 1: Read features from Power BI semantic model
feature_df = fabric.evaluate_measure(
    dataset         = "Sales Analytics",
    measure         = ["Total Revenue", "Order Count", "Avg Discount"],
    groupby_columns = [
        "DimCustomer[CustomerID]",
        "DimCustomer[Segment]",
        "DimCustomer[TenureMonths]"
    ]
)
print(f"Loaded {len(feature_df)} customers from Power BI")

# Step 2: Prepare features
feature_df = feature_df.rename(columns={
    "Total Revenue": "lifetime_revenue",
    "Order Count":   "total_orders",
    "Avg Discount":  "avg_discount"
})

X = feature_df[["total_orders", "avg_discount", "DimCustomer[TenureMonths]"]]
y = feature_df["lifetime_revenue"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Step 3: Train and log
mlflow.set_experiment("revenue-prediction-from-powerbi")
with mlflow.start_run(run_name="gbr-powerbi-features"):
    model = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    rmse   = np.sqrt(mean_squared_error(y_test, y_pred))
    r2     = r2_score(y_test, y_pred)
    mlflow.log_metrics({"rmse": rmse, "r2": r2})
    mlflow.sklearn.log_model(model, "model", registered_model_name="revenue-predictor")

# Step 4: Score all customers and write to lakehouse
feature_df["predicted_revenue"] = model.predict(X)
scores_spark = spark.createDataFrame(feature_df[["DimCustomer[CustomerID]", "predicted_revenue"]])
scores_spark.write.format("delta").mode("overwrite").saveAsTable("gold_lakehouse.revenue_predictions")

print(f"Predictions written. RMSE={rmse:.2f}, R2={r2:.4f}")
# Step 5: Power BI Direct Lake dataset picks up Tables/revenue_predictions automatically
```

---

## Sync Semantic Models

```python
# Refresh the semantic model to pick up new lakehouse data
# (Triggers a dataset refresh from code)
fabric.refresh_dataset(
    dataset="Sales Analytics",
    refresh_type="full"  # or "automatic"
)

# Check refresh status
import time
status = fabric.get_dataset_refresh_status("Sales Analytics")
while status["status"] == "InProgress":
    print(f"Refresh status: {status['status']}")
    time.sleep(30)
    status = fabric.get_dataset_refresh_status("Sales Analytics")

print(f"Refresh completed: {status['status']}")
```

---

## Lineage Tracking

```python
# List lineage for a dataset
lineage = fabric.list_dataset_lineage("Sales Analytics")
display(lineage)
# Returns: SourceTable, SourceType, DependentTable, DependentType

# Get all dependencies (upstream sources feeding the semantic model)
sources = fabric.list_dataset_sources("Sales Analytics")
display(sources)
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `DatasetNotFoundException` | Dataset name not found in workspace | Verify dataset name via `fabric.list_datasets()`; check workspace |
| `TableNotFoundException` | Table not found in dataset | Verify table name via `fabric.list_tables(dataset)` |
| `MeasureNotFoundException` | Measure name not found | Verify measure name via `fabric.list_measures(dataset)` |
| `DAXQueryException: The syntax for … is incorrect` | DAX syntax error | Test DAX in Power BI desktop or DAX Studio first |
| `UnauthorizedAccessException` | No access to the semantic model | Add user/SPN to workspace with Viewer role; check RLS |
| `RefreshException: Refresh is already running` | Dataset refresh conflict | Wait for current refresh to complete before triggering another |
| `FabricDataFrame: No semantic metadata` | Reading from a non-semantic source | Use `pandas.DataFrame` directly for non-Power BI data |
| `evaluate_measure: timeout` | Large DAX query took too long | Limit groupby columns; add filters; reduce measure complexity |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| `read_table` max rows | No hard limit; governed by memory | Use `num_rows` parameter for large tables |
| `evaluate_measure` result rows | ~150,000 rows | For larger results, use `evaluate_dax` with chunking |
| `evaluate_dax` result rows | ~150,000 rows | Use DAX pagination with TOPN and OFFSET for larger sets |
| Concurrent dataset refreshes | 1 per dataset at a time | Queue refreshes; check status before triggering |
| Dataset refresh max duration | 2 hours per refresh | For large models, optimize incremental refresh |
| SemPy API requests | Governed by Power BI REST API limits | ~200 requests/hour per user for large workloads |
| `find_anomalies` dataset size | Practical limit ~1M rows for `iqr` method | Use Spark for anomaly detection on larger datasets |
