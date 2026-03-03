---
name: dax-governance
description: Define DAX standards for measure quality, time intelligence consistency, and performance-aware patterns.
argument-hint: "[--ruleset <strict|balanced>] [--time-calendar <table>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# DAX Governance

Apply repeatable DAX governance so measures stay reliable under change and scale.

## Prerequisites

- Fabric workspace with Contributor or Admin permissions.
- XMLA endpoint access for deployment and model operations.
- Access to lakehouse or warehouse source tables used by semantic models.
- Power BI Desktop, Tabular Editor, or equivalent model authoring tooling.

## Steps

1. Baseline naming, formatting, and folder conventions.
2. Classify measures by intent and enforce dependency clarity.
3. Add performance checks for iterator and context anti-patterns.
4. Define review gates for time intelligence and blank handling.

## Output

- DAX governance checklist with enforceable rules.
- Prioritized remediation list for unstable measures.
