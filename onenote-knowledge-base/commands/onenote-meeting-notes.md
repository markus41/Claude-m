---
name: onenote-meeting-notes
description: Create premium meeting pages with structured decisions, action tracking, and polished formatting
argument-hint: "<section-id-or-name> --title <meeting-title> --date <YYYY-MM-DD> --attendees <a,b,c> [--agenda <item1,item2>] [--theme clean|executive|contrast]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Create Premium Meeting Notes

Generate a polished meeting page with deterministic structure and actionable follow-up tracking.

## Step 1: Parse and Validate Inputs

1. Resolve target section.
2. Validate date format `YYYY-MM-DD`.
3. Parse attendees into ordered list.
4. Parse agenda into ordered list; if empty, inject placeholder topic.

## Step 2: Build High-Quality Template

Required sections:

1. Meeting Summary (short paragraph)
2. Meeting Info table
3. Agenda (ordered list)
4. Discussion Notes by agenda item
5. Decisions (`#decision` tags)
6. Action Items table (`Action`, `Owner`, `Due`, `Status`)
7. Risks and Blockers (`#risk` tags)
8. Next Checkpoint

Use patch anchors:

1. `data-id="meeting-summary"`
2. `data-id="decisions"`
3. `data-id="action-items"`
4. `data-id="risks"`

## Step 3: Apply Theme Styling

Use consistent inline style tokens for:

1. Header and subtitle text
2. Section heading color
3. Status chips (Open, In Progress, Blocked, Done)
4. Callout rows for urgent actions

## Step 4: Insert To-do Markers and Tags

1. Add checklist lines using `[ ]` markers.
2. Add searchable tags: `#todo`, `#decision`, `#risk`, `#owner/<name>`.
3. Ensure every action item has owner and due date placeholder.

## Step 5: Create the Page

1. Send XHTML to `POST /me/onenote/sections/{section-id}/pages`.
2. Verify HTTP 201 and capture page metadata.

## Step 6: Return Operational Summary

Return:

1. Page URL
2. Attendee count
3. Agenda item count
4. Action item rows initialized
5. Tags emitted

## Safety Rules

- Fail fast on unsupported XHTML.
- Redact IDs and sensitive user identifiers.
- Keep output deterministic and reusable for recurring meetings.
