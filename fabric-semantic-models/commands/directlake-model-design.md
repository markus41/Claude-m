---
name: directlake-model-design
description: Design Direct Lake semantic models with clear grain, relationship strategy, and refresh-safe table layout.
argument-hint: "<domain-context> [--grain <fact-grain>] [--mode <directlake|import|hybrid>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Direct Lake Model Design

Design a production-ready Direct Lake model with explicit table grain and relationship behavior.

## Prerequisites

- Fabric workspace with Contributor or Admin permissions.
- XMLA endpoint access for deployment and model operations.
- Access to lakehouse or warehouse source tables used by semantic models.
- Power BI Desktop, Tabular Editor, or equivalent model authoring tooling.

## Steps

1. Define fact and dimension grain with conformed dimension strategy.
2. Map relationships, cardinality, and filter direction explicitly.
3. Define partitioning and refresh policy aligned to freshness SLOs.
4. Document naming, folders, and metadata annotations.

## Output

- Model blueprint with table roles, relationships, and refresh policy.
- Risk log for ambiguous grain and cross-filter issues.
