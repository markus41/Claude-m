---
name: pa-formula
description: Generate a Power Fx formula from a natural language description
argument-hint: "<description> [--context gallery|form|button|app-start]"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
---

# Generate Power Fx Formula

Generate a Power Fx formula based on a natural language description.

## Instructions

1. Parse the user's description to understand the desired behavior.
2. Determine the execution context from `--context` (affects available functions and properties).
3. Generate the formula with proper syntax.
4. Add inline comments explaining complex logic.
5. Flag any delegation concerns if the formula operates on external data sources.
6. If the formula uses `Patch`, include error handling with `IfError`.
7. Prefer `App.Formulas` (named formulas) over `Set` in `App.OnStart` when possible.
