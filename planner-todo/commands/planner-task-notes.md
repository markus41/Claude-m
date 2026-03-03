---
name: planner-task-notes
description: Update a Planner task's rich HTML notes and description (replaces plain-text description)
argument-hint: "<task-id> --notes '<html-or-plain-text>' [--format html|plain]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Update Planner Task Notes

Update a task's rich content using the `notes` field in task details. The `notes` field
supports full HTML and is the modern replacement for the deprecated `description` field.

> **Important**: `notes` and `description` are mutually exclusive in a PATCH request.
> Setting both in the same request returns a 400 error. Use `notes` for new tasks;
> `description` only if the plan explicitly uses the legacy format.

## Authentication

Required OAuth scope: `Tasks.ReadWrite`

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<task-id>` | Yes | Planner task ID |
| `--notes <content>` | Yes | HTML or plain text content for the task notes |
| `--format <type>` | No | `html` (default) or `plain`. Plain text is auto-wrapped in `<p>` tags |

## Step 1: Fetch Task Details ETag

Task details require their own ETag — it is separate from the task ETag:

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{taskId}/details
Authorization: Bearer <token>
```

Extract the `@odata.etag` from the response headers or response body.

## Step 2: Build Notes Content

If `--format plain`, wrap content in HTML paragraphs:
```
Plain: "Fix the login bug and add validation"
HTML:  "<p>Fix the login bug and add validation</p>"
```

If `--format html` (default), use the content as-is.

Valid HTML tags supported by Planner notes:
- `<p>`, `<br>` — paragraphs and line breaks
- `<strong>`, `<em>`, `<u>`, `<s>` — text formatting
- `<ul>`, `<ol>`, `<li>` — lists
- `<h1>` through `<h3>` — headings
- `<a href="...">` — hyperlinks
- `<code>`, `<pre>` — code blocks
- `<blockquote>` — quotes
- `<table>`, `<tr>`, `<td>`, `<th>` — tables

## Step 3: Update Task Details

```
PATCH https://graph.microsoft.com/v1.0/planner/tasks/{taskId}/details
Content-Type: application/json
Authorization: Bearer <token>
If-Match: <details-etag>
```

```json
{
  "notes": {
    "content": "<p>Fix the login bug and add validation</p><ul><li>Check null input</li><li>Add rate limiting</li></ul>",
    "contentType": "html"
  }
}
```

Note: `notes` is a `itemBody` object with `content` and `contentType` fields.
Do NOT include `description` in the same request.

Expected response: `HTTP 204 No Content`

## Step 4: Verify

Optionally re-fetch task details to confirm the update:

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{taskId}/details?$select=notes
```

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 | Both `notes` and `description` present in body | Remove `description` from the request — use only `notes` |
| 412 | ETag mismatch (details were updated by someone else) | Re-GET `/details` to get current ETag, then retry |
| 409 | Concurrency conflict | Same as 412 — re-fetch and retry once |
| 404 | Task not found | Verify task ID |

## Success Output

```
Task notes updated
─────────────────────────────────────────────────
Task ID:   <taskId>
Format:    HTML
Length:    <character-count> characters

Preview:
  <first 200 chars of plain-text version>
─────────────────────────────────────────────────
```
