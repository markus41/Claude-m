---
name: semantic-link-query
description: "Query Power BI datasets from a Fabric notebook using semantic link (SemPy)"
argument-hint: "<dataset-name> [--measure <measure>] [--list-tables]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Query Power BI with Semantic Link

Generate code to read Power BI semantic model data from a Fabric notebook using the SemPy library (semantic link).

## Instructions

### 1. Validate Inputs

- `<dataset-name>` — Name of the Power BI dataset (semantic model) in the workspace. Ask if not provided.
- `--measure` — A specific DAX measure to evaluate. Optional.
- `--list-tables` — When set, list available tables and measures instead of querying data.

### 2A. Generate Discovery Code (--list-tables)

```python
import sempy.fabric as fabric

# List all datasets in the workspace
datasets = fabric.list_datasets()
display(datasets)

# List tables in the dataset
tables = fabric.list_tables("<dataset-name>")
display(tables)

# List measures in the dataset
measures = fabric.list_measures("<dataset-name>")
display(measures)

# List columns for a specific table
columns = fabric.list_columns("<dataset-name>", "<table-name>")
display(columns)
```

### 2B. Generate Data Query Code

**Cell 1: Setup**
```python
import sempy.fabric as fabric
from sempy.fabric import FabricDataFrame

DATASET = "<dataset-name>"
```

**Cell 2: Read a table as FabricDataFrame**
```python
# Read a full table from the Power BI dataset
df = fabric.read_table(DATASET, "<table-name>")
print(f"Loaded {len(df)} rows from '<table-name>'")
display(df.head())
```

**Cell 3: Evaluate a DAX measure (when --measure is provided)**
```python
# Evaluate a measure with optional group-by columns
result = fabric.evaluate_measure(
    dataset=DATASET,
    measure="<measure-name>",
    groupby_columns=["<dim-table>[<column>]"]
)
display(result)
```

**Cell 4: Execute a DAX query**
```python
# Run an arbitrary DAX query
dax_query = """
EVALUATE
SUMMARIZECOLUMNS(
    '<dim-table>'[<column>],
    "Measure Value", [<measure-name>]
)
"""
result = fabric.evaluate_dax(DATASET, dax_query)
display(result)
```

**Cell 5: Use semantic functions on FabricDataFrame**
```python
# Semantic functions add AI-powered operations to DataFrames
df = fabric.read_table(DATASET, "<table-name>")

# Check if the DataFrame supports semantic functions
print(f"Semantic info available: {hasattr(df, 'sem_info')}")
```

**Cell 6: Write results back to lakehouse**
```python
# Convert results to Spark DataFrame and save
df_spark = spark.createDataFrame(result)
df_spark.write.format("delta").mode("overwrite").save("Tables/<output-table>")
print("Results written to lakehouse.")
```

### 3. Ask the User

Prompt the user for:
- Which table or measure they want to query.
- Any filter conditions or group-by dimensions.
- Whether to write results to the lakehouse for further ML processing.

### 4. Display Summary

Show the user:
- Generated query code.
- Available tables and measures discovered (if `--list-tables`).
- How to combine with ML workflows: read Power BI data via semantic link, train a model, write predictions back to the lakehouse, then consume in Power BI.
- Relevant commands: `/experiment-create`, `/model-train`.
