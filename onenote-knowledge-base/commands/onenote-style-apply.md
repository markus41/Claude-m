---
name: onenote-style-apply
description: Apply and normalize OneNote visual themes for fonts, headers, colors, callouts, and status chips
argument-hint: "<page-id> --theme clean|executive|contrast [--enforce] [--preview]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Apply OneNote Visual Theme

Standardize page aesthetics so every page looks intentional, readable, and consistent.

## Step 1: Inspect Current Page Styling

1. Fetch page XHTML.
2. Detect heading structure and existing inline styles.
3. Identify style drift from plugin standards.

## Step 2: Select Theme Tokens

Theme tokens include:

1. Base font family and size.
2. H1/H2/H3 color hierarchy.
3. Callout background and text color.
4. Status chip colors for Open, InProgress, Blocked, Done.

Only use supported inline style properties:

1. `color`
2. `background-color`
3. `font-size`
4. `font-family`

## Step 3: Build Patch Plan

1. Map each target block by `data-id` or heading target.
2. Build PATCH array for headings, summary block, callouts, and status labels.
3. If `--preview`, return patch plan without mutation.

## Step 4: Apply Theme

1. Run PATCH in one batched call.
2. Re-fetch page.
3. Confirm all intended elements were updated.

## Step 5: Return Style Report

Return:

1. Theme applied
2. Blocks updated count
3. Remaining style drift issues
4. Suggested follow-up (`/onenote-quality-audit`)

## Safety Rules

- Fail fast on missing anchors.
- Do not introduce unsupported CSS.
- Keep semantic content unchanged while styling.
- Redact page IDs, user identifiers, and any secret-bearing values in output.
