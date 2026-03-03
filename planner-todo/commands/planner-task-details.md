---
name: planner-task-details
description: Update task details — add checklist items, reference links, and description
argument-hint: "<task-id> [--description '<text>'] [--checklist '<item1>|<item2>'] [--link '<url>|<title>']"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Update Planner Task Details

Add or update the detailed content of a Microsoft Planner task: description text,
checklist items (subtasks), and reference links. Task details are stored in a separate
entity from the task itself and require their own ETag for PATCH operations.

## Authentication

Requires a **delegated** token (user context). App-only tokens are not supported.

Required OAuth scope:
- `Tasks.ReadWrite` — read and update Planner task details

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<task-id>` | Yes | ID of the Planner task to update details for |
| `--description <text>` | No | Plain-text description for the task |
| `--checklist <items>` | No | Pipe-separated checklist items: `'Write tests|Run CI|Review PR'` |
| `--link <url\|title>` | No | Pipe-separated URL and display title: `'https://example.com|Spec Doc'` |
| `--clear-checklist` | No | Remove all existing checklist items |
| `--clear-references` | No | Remove all existing reference links |

At least one of `--description`, `--checklist`, or `--link` must be provided.

## Understanding Task Details

Task details are a **separate Graph resource** from the task. The task resource
(`/planner/tasks/{id}`) holds metadata like title, assignees, and due date. The details
resource (`/planner/tasks/{id}/details`) holds:

- `description` — free-text description (plain text only)
- `checklist` — dictionary of checklist items (subtasks with checkboxes)
- `references` — dictionary of external URL links

Both resources have independent ETags. PATCH operations on details require the details
ETag (not the task ETag).

## Step 1: GET Task Details and ETag

```
GET https://graph.microsoft.com/v1.0/planner/tasks/{taskId}/details
Authorization: Bearer <token>
```

The ETag is in the response header:
```
HTTP/1.1 200 OK
ETag: W/"JzEtVGFza0RldGFpbHMgQEBAQEBAQEBAQEBAQEBAWCc="
```

The response body contains existing checklist items and references:
```json
{
  "id": "oAtmh1OGz0i-hdvvnZbfGmQAF7sk",
  "description": "Existing description text",
  "checklist": {
    "uuid-1": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Existing item",
      "isChecked": false,
      "orderHint": "8585506702189421664P^"
    }
  },
  "references": {}
}
```

Save the ETag and the existing checklist/references objects for merging.

## Step 2: Build Checklist Object

Parse `--checklist` by splitting on `|` and trimming whitespace from each item.

For each new checklist item, generate a UUID key using `crypto.randomUUID()`:

```json
{
  "checklist": {
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Write unit tests",
      "isChecked": false,
      "orderHint": " !"
    },
    "b2c3d4e5-f6a7-8901-bcde-f23456789012": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Run CI pipeline",
      "isChecked": false,
      "orderHint": " !"
    }
  }
}
```

Field notes:
- The key must be a valid UUID (use `crypto.randomUUID()` or a UUID library).
- `isChecked: false` for all new items; the user checks them off in the Planner UI.
- `orderHint: " !"` appends the item at the bottom of the checklist.
- To **remove** an existing checklist item, set its value to `null` in the PATCH body.
- If `--clear-checklist` is set, set every existing item's value to `null`.

## Step 3: Build References Object

Parse `--link` by splitting on `|`: first part is the URL, second is the display title.

References are keyed by the **URL-encoded** URL. Encode the URL by replacing:
- `.` with `%2E`
- `/` with `%2F`
- `:` with `%3A`
- `?` with `%3F`
- `=` with `%3D`
- `&` with `%26`

Example: `https://example.com/spec` → `https%3A%2F%2Fexample%2Ecom%2Fspec`

```json
{
  "references": {
    "https%3A%2F%2Fexample%2Ecom%2Fspec": {
      "@odata.type": "#microsoft.graph.plannerExternalReference",
      "alias": "Spec Document",
      "type": "Other",
      "previewPriority": " !"
    }
  }
}
```

The `type` field accepts: `"PowerPoint"`, `"Word"`, `"Excel"`, `"OneNote"`, `"Project"`,
`"Visio"`, `"Pdf"`, `"Other"`. Use `"Other"` for general URLs.

To remove an existing reference, set its URL-encoded key to `null`.
If `--clear-references` is set, set every existing reference to `null`.

## Step 4: PATCH Task Details

```
PATCH https://graph.microsoft.com/v1.0/planner/tasks/{taskId}/details
Authorization: Bearer <token>
If-Match: W/"JzEtVGFza0RldGFpbHMgQEBAQEBAQEBAQEBAQEBAWCc="
Content-Type: application/json
```

Combined request body example:
```json
{
  "description": "Implement the OAuth2 login flow using MSAL.",
  "checklist": {
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
      "@odata.type": "#microsoft.graph.plannerChecklistItem",
      "title": "Write unit tests",
      "isChecked": false,
      "orderHint": " !"
    }
  },
  "references": {
    "https%3A%2F%2Fdocs%2Emicrosoft%2Ecom%2Fen-us%2Fazure%2Factive-directory": {
      "@odata.type": "#microsoft.graph.plannerExternalReference",
      "alias": "Azure AD Docs",
      "type": "Other",
      "previewPriority": " !"
    }
  }
}
```

Expected successful response: `HTTP 204 No Content`.

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 Bad Request | Malformed checklist UUID or invalid reference URL encoding | Ensure UUIDs are valid v4 format and URLs are properly encoded |
| 404 Not Found | Task does not exist | Verify the task ID |
| 412 Precondition Failed | Details ETag is stale | Re-GET `/planner/tasks/{id}/details` and retry with the fresh ETag |
| 429 Too Many Requests | Throttled | Wait `Retry-After` seconds before retrying |

On `412`, automatically re-GET the task details, merge the intended changes with the
latest state, and retry the PATCH once.

## Success Output

```
Task details updated successfully
─────────────────────────────────────────────────
Task ID:     oAtmh1OGz0i-hdvvnZbfGmQAF7sk
Title:       Implement login page

Description: "Implement the OAuth2 login flow using MSAL." (updated)

Checklist (3 items total):
  [x] Set up MSAL configuration     (existing, checked)
  [ ] Write unit tests               (added)
  [ ] Run CI pipeline                (added)

References (1 link total):
  • Azure AD Docs → https://docs.microsoft.com/...  (added)
─────────────────────────────────────────────────
```
