---
name: onenote-quality-audit
description: Audit OneNote page quality for structure, styling, accessibility, patchability, and stale task risk
argument-hint: "<page-id-or-section-id-or-notebook-id> [--deep] [--include-stale-days <n>]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# OneNote Quality Audit

Run a comprehensive quality audit to keep every page clean, polished, and operationally useful.

## Step 1: Resolve Audit Scope

1. Single page by ID.
2. All pages in section.
3. Representative pages in notebook.

## Step 2: Run Structural Checks

1. Exactly one H1 per page.
2. Logical H2/H3 progression.
3. Presence of summary block near top.
4. Presence of references or next-actions block for long pages.

## Step 3: Run Visual Consistency Checks

1. Theme token consistency (font, heading colors, callouts).
2. Status chip consistency in task tables.
3. Column layout integrity when used.

## Step 4: Run Accessibility and Patchability Checks

1. Images include `alt` text.
2. Links appear valid and meaningful.
3. Patch anchors (`data-id`) exist on mutable blocks.
4. Unsupported HTML/layout elements are absent.

## Step 5: Run Task and Tag Hygiene Checks

1. Detect unresolved tasks older than threshold (`--include-stale-days`, default 30).
2. Detect rows missing owner or due date.
3. Detect missing or inconsistent tags.

## Step 6: Return Deterministic Audit Report

Report sections:

1. Overall status (`PASS`, `NEEDS WORK`, `CRITICAL`).
2. Critical findings with target anchors.
3. Warnings and recommended fixes.
4. Suggested next command (`/onenote-style-apply`, `/onenote-page-patch`, `/onenote-task-tracker`).

## Safety Rules

- Fail fast on invalid scope resolution.
- Redact sensitive identifiers.
- Do not mutate content in audit mode.
