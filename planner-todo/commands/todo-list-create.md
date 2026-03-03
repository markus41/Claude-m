---
name: todo-list-create
description: Create a new Microsoft To Do task list
argument-hint: "<list-name>"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create To Do List

Create a new task list in Microsoft To Do for the signed-in user. Task lists are the
top-level containers for To Do tasks — each user has their own private lists.

## Authentication

Requires a **delegated** token (user context). **App-only tokens are not supported** —
To Do lists are per-user and can only be created in the context of a signed-in user.

Required OAuth scope:
- `Tasks.ReadWrite` — create and manage the signed-in user's To Do lists and tasks

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<list-name>` | Yes | Display name for the new task list |

## Important Notes on Built-in Lists

Every Microsoft To Do account has two special lists that are created automatically:

- **Tasks** — the default inbox list; always exists and cannot be deleted
- **Flagged Emails** — populated by flagging emails in Outlook; always exists and cannot
  be deleted

Microsoft To Do allows duplicate list names — you can create multiple lists with the
same display name. The system differentiates them by their unique `id`. If you intend
to avoid duplicates, check existing lists before creating a new one.

## Step 1: Parse Argument

Extract `<list-name>` from the command argument. List names support Unicode, spaces, and
emoji. There is no documented character limit enforced at the API level, but keep names
concise for usability.

## Step 2: Acquire Delegated Token

Use `InteractiveBrowserCredential` or `DeviceCodeCredential` from `@azure/identity`
with scope `https://graph.microsoft.com/.default`.

Do not use `ClientSecretCredential` — the `/me` endpoint requires a signed-in user
context and will return `403` with app-only tokens.

## Step 3: (Optional) Check for Existing Lists

To avoid unintentional duplicates, list existing task lists first:

```
GET https://graph.microsoft.com/v1.0/me/todo/lists?$select=id,displayName
Authorization: Bearer <token>
```

If a list with the same name already exists, warn the user and ask for confirmation
before proceeding. (Duplicates are permitted by the API but may cause confusion.)

## Step 4: Create the List

```
POST https://graph.microsoft.com/v1.0/me/todo/lists
Content-Type: application/json
Authorization: Bearer <token>
```

Request body:
```json
{
  "displayName": "<list-name>"
}
```

Expected successful response: `HTTP 201 Created`
```json
{
  "id": "AQMkADZhMWM5NGI5LWU0YjAtNGViZC05ZGE5LThhNTgzOGY5OGExMAAuAAADwW9zLasBCEiGoSMQX30ligEA",
  "displayName": "Work Tasks",
  "isOwner": true,
  "isShared": false,
  "wellknownListName": "none"
}
```

Field descriptions:
- `id` — unique identifier; save this for use with `todo-task-create --list <id>`
- `isOwner` — always `true` for newly created lists (the signed-in user is the owner)
- `isShared` — `false` for new lists (sharing is configured separately)
- `wellknownListName` — `"none"` for user-created lists; `"defaultList"` for Tasks,
  `"flaggedEmails"` for the Flagged Emails list

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 Bad Request | Missing or empty `displayName` field | Provide a non-empty list name |
| 401 Unauthorized | Token is expired or invalid | Re-authenticate and obtain a fresh token |
| 403 Forbidden | App-only token used, or `Tasks.ReadWrite` scope is missing | Ensure a delegated token is used with the correct scope |
| 429 Too Many Requests | Graph API throttle limit reached | Wait the number of seconds specified in the `Retry-After` header |

Note: `400` is not returned for duplicate list names — To Do permits them. A `400` on
this endpoint indicates a malformed request body.

## Success Output

Display the following after the list is created:

```
To Do list created successfully
─────────────────────────────────────────────────
List ID:      AQMkADZhMWM5NGI5LWU0YjAtNGViZC05ZGE5LThhNTgzOGY5OGExMAAuAAAD...
Display Name: Work Tasks
Owner:        Yes (you own this list)
Shared:       No

Next steps:
  • Create tasks: todo-task-create "<title>" --list <list-id>
  • Create recurring tasks: todo-task-create-recurring "<title>" --list <list-id> --pattern weekly
─────────────────────────────────────────────────
Tip: Save the List ID — it is required for all task operations on this list.
```
