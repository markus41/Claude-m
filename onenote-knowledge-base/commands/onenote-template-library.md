---
name: onenote-template-library
description: Manage reusable OneNote page templates for SOPs, decisions, runbooks, and meeting workflows
argument-hint: "[--action list|create|update|instantiate] [--template <name>] [--section <id-or-name>] [--theme clean|executive|contrast]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# OneNote Template Library

Create and operate a reusable template catalog so page quality stays consistent across teams.

## Step 1: Resolve Action and Scope

1. `list`: enumerate available templates and metadata.
2. `create`: register a new template structure.
3. `update`: patch an existing template definition.
4. `instantiate`: create a page from a named template.

## Step 2: Validate Template Schema

Each template must define:

1. `template-name`
2. `purpose`
3. `required-sections`
4. `required-anchors`
5. `allowed-tags`
6. `theme-default`

Reject incomplete templates.

## Step 3: Build Template Content Model

1. Emit strict XHTML fragments for each section.
2. Include patch anchors (`data-id`) on mutable blocks.
3. Add tag placeholders where required (`#todo`, `#decision`, `#risk`).

## Step 4: Instantiate Template (if requested)

1. Resolve target section ID.
2. Compose page from template + runtime parameters.
3. Create page via `POST /me/onenote/sections/{section-id}/pages`.

## Step 5: Return Deterministic Output

Return:

1. Template name and version
2. Anchors present
3. Theme applied
4. Page ID/URL (for instantiate)

## Safety Rules

- Fail fast on missing template schema fields or invalid section resolution.
- Reject unsupported XHTML elements in templates.
- Redact IDs, identities, and secret-bearing values in output.
