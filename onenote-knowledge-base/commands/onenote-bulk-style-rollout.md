---
name: onenote-bulk-style-rollout
description: Roll out OneNote visual themes across sections or notebooks with dry-run and drift reporting
argument-hint: "<target-id> [--scope page|section|notebook] --theme clean|executive|contrast [--dry-run] [--max-pages <n>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# OneNote Bulk Style Rollout

Apply visual consistency at scale across many pages with guardrails and deterministic reporting.

## Step 1: Resolve Rollout Scope

1. Scope `page`: one page only.
2. Scope `section`: all pages in section.
3. Scope `notebook`: all pages across notebook sections.

Resolve IDs and enumerate candidate pages before mutation.

## Step 2: Build Drift Baseline

For each page, detect:

1. heading style inconsistencies
2. unsupported inline style usage
3. missing summary block styling
4. status-chip inconsistencies in action tables

## Step 3: Build Patch Batches

1. Reuse `onenote-style-apply` token model.
2. Build page-level PATCH plans with explicit target anchors.
3. If `--dry-run`, output plans only.

## Step 4: Execute Rollout (non-dry run)

1. Apply patches page by page.
2. Stop on hard failures and record partial progress.
3. Re-read each page to confirm style convergence.

## Step 5: Return Rollout Report

Return:

1. pages scanned
2. pages changed
3. pages skipped
4. failed pages with reason
5. residual drift summary

## Safety Rules

- Fail fast on unresolved scope IDs and invalid theme names.
- Default to dry-run when scope is notebook and page count is high.
- Redact page IDs and identity details in output.
