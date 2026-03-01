# Microsoft Teams MCP Plugin

Connect Claude to Microsoft Teams via the Model Context Protocol (MCP).

## Features

- **List Teams**: Get all Microsoft Teams the signed-in user has joined
- **List Channels**: View channels within a specific team
- **Send Messages**: Post messages to Teams channels
- **Create Meetings**: Schedule online meetings in Microsoft Teams

## Installation

### From Claude Code Marketplace

```bash
/plugin marketplace add markus41/Claude-m
/plugin install "Microsoft Teams MCP"
```

### Manual Configuration

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "microsoft-teams": {
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

- `ChannelMessage.Send` - Send messages to channels
- `Chat.ReadWrite` - Read and write chats
- `OnlineMeetings.ReadWrite` - Create and manage meetings
- `Team.ReadBasic.All` - Read basic team information

## Available Tools

### `teams_list_teams`
Lists all Microsoft Teams the signed-in user has joined.

### `teams_list_channels`
Lists channels within a specific team.

**Arguments:**
- `teamId` (string): The ID of the team

### `teams_send_message`
Sends a message to a Microsoft Teams channel.

**Arguments:**
- `teamId` (string): Team ID
- `channelId` (string): Channel ID
- `message` (string): Message content (HTML or plain text)

### `teams_create_meeting`
Creates a new online meeting in Microsoft Teams.

**Arguments:**
- `subject` (string): Meeting subject
- `startDateTime` (string): ISO-8601 start date-time
- `endDateTime` (string): ISO-8601 end date-time
- `attendees` (array, optional): Attendee email addresses

## Example Usage

```
List my Teams:
> Use the teams_list_teams tool

Send a message:
> Use teams_send_message to send "Hello from Claude!" to the General channel
```

## License

ISC
