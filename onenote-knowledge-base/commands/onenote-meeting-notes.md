---
name: onenote-meeting-notes
description: "Create a structured meeting notes page from a template"
argument-hint: "<section-id> --title <meeting-title> --date <YYYY-MM-DD> --attendees <name1,name2> [--agenda <item1,item2>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Create Meeting Notes Page

Create a structured meeting notes page in a OneNote section using a standard template. Designed for recurring team meetings, standups, project syncs, and retrospectives.

## Instructions

### 1. Parse Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<section-id>` | Yes | Target section ID (or section name to resolve) |
| `--title` | Yes | Meeting title (e.g., "Sprint 14 Planning") |
| `--date` | Yes | Meeting date in YYYY-MM-DD format |
| `--attendees` | Yes | Comma-separated list of attendee names |
| `--agenda` | No | Comma-separated list of agenda items |

If the user provides a section name instead of an ID, resolve it:

```
GET /me/onenote/sections?$filter=displayName eq '{section-name}'&$select=id,displayName
```

### 2. Build the Meeting Notes XHTML

Use this complete template, replacing all `{placeholders}`:

```html
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:oes="http://schemas.microsoft.com/office/onenote/2013/onenote">
<head>
  <title>{meeting-title} — {date}</title>
  <meta name="created" content="{date}T09:00:00Z" />
</head>
<body>
  <h1>{meeting-title}</h1>

  <h2>Meeting Info</h2>
  <table>
    <tr><td><b>Date</b></td><td>{date}</td></tr>
    <tr><td><b>Attendees</b></td><td>{attendee1}, {attendee2}, ...</td></tr>
    <tr><td><b>Facilitator</b></td><td>{first-attendee}</td></tr>
    <tr><td><b>Note Taker</b></td><td>(to be assigned)</td></tr>
  </table>

  <h2>Agenda</h2>
  <ol>
    <li>{agenda-item-1}</li>
    <li>{agenda-item-2}</li>
    <!-- one <li> per --agenda item; if no agenda provided, include a single placeholder -->
  </ol>

  <h2>Discussion Notes</h2>
  <p><i>Record key points, decisions, and context for each agenda item.</i></p>
  <h3>{agenda-item-1}</h3>
  <ul>
    <li>(notes here)</li>
  </ul>
  <h3>{agenda-item-2}</h3>
  <ul>
    <li>(notes here)</li>
  </ul>

  <h2>Action Items</h2>
  <table>
    <tr>
      <th>Action</th>
      <th>Owner</th>
      <th>Due Date</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>(describe the task)</td>
      <td>(name)</td>
      <td>(YYYY-MM-DD)</td>
      <td>Open</td>
    </tr>
  </table>

  <h2>Next Steps</h2>
  <ul>
    <li>Next meeting: (date and time)</li>
    <li>Follow-up items to prepare before next meeting</li>
  </ul>

  <h2>Parking Lot</h2>
  <p><i>Topics raised but deferred to a future discussion.</i></p>
  <ul>
    <li>(none yet)</li>
  </ul>
</body>
</html>
```

### 3. Template Population Rules

- **Title**: Combine `--title` and `--date` as `"{title} -- {date}"`.
- **Attendees**: Split the comma-separated `--attendees` string and join with commas in the table cell.
- **Facilitator**: Default to the first attendee unless the user specifies otherwise.
- **Agenda**: If `--agenda` is provided, create one `<li>` per item in the Agenda section and one `<h3>` per item in the Discussion Notes section. If no agenda is provided, include a single placeholder item: "Agenda to be determined".
- **Action Items**: Start with one empty template row. The user fills these in during or after the meeting.
- **Created timestamp**: Use the `--date` value with a default time of `T09:00:00Z`.

### 4. Send the Request

```
POST https://graph.microsoft.com/v1.0/me/onenote/sections/{section-id}/pages
Content-Type: application/xhtml+xml

{xhtml-payload}
```

### 5. Display the Result

On success (HTTP 201), display:

```
Meeting notes page created.
  Title:      {meeting-title} — {date}
  Section:    {section-name}
  Attendees:  {attendee-count} people
  Agenda:     {agenda-count} items
  Page ID:    {page-id}
  URL:        {links.oneNoteWebUrl.href}
```

### 6. Post-Creation Tips

After creating the page, remind the user:

```
Tips:
  - Open the URL above to edit the page in OneNote during the meeting.
  - Fill in Discussion Notes under each agenda heading.
  - Add action items with an owner and due date in the Action Items table.
  - Use /onenote-search to find this page later by title or keywords.
```

### 7. Error Handling

- **400**: Malformed XHTML. Verify all tags are properly closed and no unsupported elements are present.
- **401/403**: Missing `Notes.ReadWrite` permission. Suggest running `/setup`.
- **404**: Section not found. List available sections to help the user pick the right target.
