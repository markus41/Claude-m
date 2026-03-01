---
name: pa-solution-checker
description: Run solution checker analysis on Power Apps components and report issues
argument-hint: "[--path <solution-path>] [--severity critical|warning|info]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# Solution Checker Analysis

Run static analysis on Power Apps solution components to identify issues.

## Instructions

1. If `--path` is provided, analyze the specified solution. Otherwise, look for solution files in the current directory.
2. Check for common issues:
   - Non-delegable data operations on external sources.
   - Missing error handling on data write operations.
   - Hardcoded values that should be environment variables.
   - Overly broad connector permissions.
   - Unused variables and controls.
   - Naming convention violations.
3. Filter by `--severity` if provided.
4. Display results grouped by severity: Critical, Warning, Info.
5. Include remediation suggestions for each issue.
