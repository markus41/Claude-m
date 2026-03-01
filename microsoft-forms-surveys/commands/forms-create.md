---
name: forms-create
description: "Create a new Microsoft Form"
argument-hint: "--title <title> [--description <text>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Create a Microsoft Form

Create a new Microsoft Form with a title and optional description using the Graph beta API.

## Instructions

1. Build the request body with the provided `--title` and optional `--description`.
2. Send a POST request to the Forms beta endpoint:

```
POST https://graph.microsoft.com/beta/me/forms
Content-Type: application/json
Authorization: Bearer {token}
```

**Request body**:
```json
{
  "title": "Team Lunch Preferences",
  "description": "Quick poll to decide this Friday's lunch order"
}
```

3. Parse the response to extract:
   - `id` — the form ID (needed for adding questions and retrieving responses)
   - `webUrl` — the shareable link respondents can use
   - `createdDateTime` — timestamp of creation
   - `status` — should be `draft` (forms start unpublished)

**Example response**:
```json
{
  "id": "abc123-def456",
  "title": "Team Lunch Preferences",
  "description": "Quick poll to decide this Friday's lunch order",
  "status": "draft",
  "webUrl": "https://forms.office.com/Pages/ResponsePage.aspx?id=abc123",
  "createdDateTime": "2026-03-01T10:00:00Z"
}
```

4. Display the form ID and shareable URL to the user.
5. Remind the user that the form is in **draft** status — they must publish it (or use the Forms web UI) before respondents can submit answers.

## Notes

- The Forms API is on the Microsoft Graph **beta** endpoint. Do not use `/v1.0/`.
- Forms are created under the authenticated user's account (`/me/forms`).
- To create a group form (shared ownership), use `/groups/{group-id}/forms` instead.
- The form title has a maximum length of 255 characters.
