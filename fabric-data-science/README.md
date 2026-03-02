# Fabric Data Science Plugin

Microsoft Fabric Data Science — create and track ML experiments with MLflow, train models with scikit-learn/LightGBM/XGBoost/PyTorch in Spark-based notebooks, leverage SynapseML for distributed ML, register and version models, batch-score with the T-SQL PREDICT function, and bridge Power BI semantic models to ML workflows via semantic link (SemPy).

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Microsoft Fabric Data Science so it can scaffold experiment notebooks, generate model training code, configure MLflow tracking, write PREDICT queries, and guide semantic link integration. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure a Fabric workspace, lakehouse, and verify MLflow tracking:

```
/setup              # Full guided setup
/setup --minimal    # Workspace and lakehouse only
```

Requires a Microsoft Fabric workspace with Data Science experience enabled.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Configure Fabric workspace, lakehouse, and verify MLflow tracking |
| `/experiment-create` | Create an MLflow experiment with a scaffold notebook |
| `/model-train` | Generate a training notebook with MLflow tracking and evaluation |
| `/model-register` | Register a trained model to the Fabric model registry |
| `/model-predict` | Generate batch scoring code (T-SQL PREDICT or notebook inference) |
| `/semantic-link-query` | Query Power BI datasets from notebooks via semantic link |

## Agent

| Agent | Description |
|-------|-------------|
| **Data Science Reviewer** | Reviews Fabric ML notebooks for experiment tracking, data handling, model quality, PREDICT readiness, and best practices |

## Trigger Keywords

The skill activates automatically when conversations mention: `fabric data science`, `fabric ml`, `mlflow fabric`, `fabric experiment`, `fabric model`, `predict function`, `semantic link`, `fabric notebook ml`, `synapse ml`, `fabric machine learning`, `model training`, `fabric automl`.

## Author

Markus Ahling
