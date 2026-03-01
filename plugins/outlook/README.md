# Microsoft Outlook MCP Plugin

Connect Claude to Microsoft Outlook via the Model Context Protocol (MCP).

## Features

- **Send Emails**: Compose and send emails from your Outlook mailbox
- **List Emails**: View recent messages from your inbox
- **Create Events**: Schedule calendar events
- **List Events**: View upcoming calendar events

## Installation

### From Claude Code Marketplace

```bash
/plugin marketplace add markus41/Claude-m
/plugin install "Microsoft Outlook MCP"
```

### Manual Configuration

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "microsoft-outlook": {
      "command": "node",
      "args": ["/path/to/Claude-m/dist/index.js"],
      "env": {
        "MICROSOFT_CLIENT_ID": "your-client-id",
        "MICROSOFT_CLIENT_SECRET": "your-client-secret",
        "MICROSOFT_TENANT_ID": "your-tenant-id",
        "MICROSOFT_ACCESS_TOKEN": "your-access-token"
      }
    }
  }
}
```

## Required Microsoft Graph Permissions

- `Mail.ReadWrite` - Read and write mail
- `Mail.Send` - Send mail
- `Calendars.ReadWrite` - Manage calendar events
- `Contacts.ReadWrite` - Access contacts

## Available Tools

### `outlook_send_email`
Sends an email via the signed-in user's Outlook mailbox.

**Arguments:**
- `to` (array): Recipient email addresses
- `subject` (string): Email subject
- `body` (string): Email body (HTML or plain text)
- `cc` (array, optional): CC email addresses
- `isHtml` (boolean, optional): Whether the body is HTML

### `outlook_list_emails`
Lists recent emails from the signed-in user's inbox.

**Arguments:**
- `top` (number, optional): Max number of emails (default 10)
- `filter` (string, optional): OData $filter expression

### `outlook_create_event`
Creates a new calendar event in the signed-in user's Outlook calendar.

**Arguments:**
- `subject` (string): Event subject
- `startDateTime` (string): ISO-8601 start date-time
- `endDateTime` (string): ISO-8601 end date-time
- `attendees` (array, optional): Attendee email addresses
- `location` (string, optional): Event location
- `body` (string, optional): Event description (HTML)

### `outlook_list_events`
Lists upcoming calendar events from the signed-in user's Outlook calendar.

**Arguments:**
- `top` (number, optional): Max number of events (default 10)

## Example Usage

```
Send an email:
> Use outlook_send_email to send a message to team@example.com

Check calendar:
> Use outlook_list_events to see my upcoming meetings
```

## License

ISC
