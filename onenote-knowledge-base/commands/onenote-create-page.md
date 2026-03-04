---
name: onenote-create-page
description: Create polished OneNote pages with template-driven structure, style tokens, tags, and patch anchors
argument-hint: "<section-id-or-name> --title <title> [--template knowledge|sop|decision|runbook] [--theme clean|executive|contrast] [--tags <#a,#b>] [--from-file <path>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Create Polished OneNote Page

Create high-quality pages that look consistent and remain easy to patch and search.

## Step 1: Resolve Target Section

1. Accept section ID directly when provided.
2. If section name is provided, resolve ID with `GET /me/onenote/sections?$filter=displayName eq '{name}'`.
3. Fail if resolution returns zero or multiple ambiguous matches.

## Step 2: Select Template and Theme

Template options:

1. `knowledge`: summary, key points, references, next actions.
2. `sop`: purpose, scope, procedure, rollback, revision history.
3. `decision`: context, options, decision, consequences, owner.
4. `runbook`: trigger, diagnostics, mitigation, verification, escalation.

Theme options define inline style tokens (supported properties only):

1. Font family
2. Font size
3. Heading color
4. Accent background color for callouts
5. Status chip color mapping

## Step 3: Build XHTML Payload

Use strict XHTML with OneNote namespace and patch-friendly anchors:

1. One H1 title.
2. Summary block near top (`data-id="summary"`).
3. Primary content sections as H2/H3.
4. At least one structured table where appropriate.
5. `data-id` attributes on patch targets (`summary`, `decisions`, `action-items`, `references`).

Tag and to-do conventions:

1. Include tags as plain searchable text (`#todo`, `#decision`, `#risk`, `#owner/alice`).
2. Use checklist markers `[ ]` and `[x]` inside list items.

## Step 4: Validate Content Safety

Before create call:

1. Reject unsupported structural elements (`div`, `section`, `script`, `style`, `iframe`).
2. Ensure images include `alt` text.
3. Ensure heading order is logical (H1 then H2/H3).

## Step 5: Create Page

1. `POST /me/onenote/sections/{section-id}/pages`
2. `Content-Type: application/xhtml+xml`
3. Store returned page ID and web URL.

## Step 6: Return Quality Summary

Return:

1. Page ID and URL
2. Template used
3. Theme used
4. Detected tags
5. Patch anchors created

## Safety Rules

- Fail fast on XHTML validation errors.
- Redact IDs and secrets.
- Do not mutate existing pages in this command.
