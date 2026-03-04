---
name: onenote-page-patch
description: Apply deterministic OneNote page PATCH operations for incremental updates to anchored content blocks
argument-hint: "<page-id> --op append|prepend|insert|replace --target <body|#anchor> --content <xhtml-fragment> [--batch-file <path>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Patch OneNote Pages

Update existing OneNote pages safely with minimal, deterministic changes.

## Step 1: Validate Target and Anchors

1. Fetch page metadata by page ID.
2. Fetch page content.
3. Validate requested target exists (`body`, `#title`, or `#data-id`).

## Step 2: Build Patch Array

1. Support single operation from flags.
2. Support multi-operation array from `--batch-file`.
3. Validate each action is one of: `append`, `prepend`, `insert`, `replace`.

## Step 3: Validate XHTML Fragments

1. Ensure fragments use supported elements.
2. Reject unsupported structural/layout elements.
3. Require escaped entities for XML safety.

## Step 4: Execute PATCH

1. `PATCH /me/onenote/pages/{page-id}/content`
2. `Content-Type: application/json`
3. Send action array in one call when batching.

## Step 5: Verify Post-Patch State

1. Re-fetch page content.
2. Confirm target block changed as expected.
3. Return concise diff summary.

## Step 6: Recommended Follow-up

If style drift increased, recommend `/onenote-style-apply`.
If action items were changed, recommend `/onenote-task-tracker` audit.

## Safety Rules

- Fail fast if target anchor is missing.
- Do not patch without content validation.
- Redact IDs in logs and output.
