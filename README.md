# Claude-m

> **A Claude plugin marketplace that extends Claude's ability to work with Microsoft products.**

Claude-m is an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that gives Claude native access to Microsoft 365, Microsoft Teams, Microsoft Azure, and SharePoint — all through a unified plugin marketplace.

---

## Plugins

| Plugin | Product | Tools |
|--------|---------|-------|
| **teams** | Microsoft Teams | Send messages, create meetings, list teams & channels |
| **excel** | Microsoft Excel | Read/write ranges, list worksheets, create tables |
| **outlook** | Microsoft Outlook | Send emails, list inbox, create & list calendar events |
| **azure** | Microsoft Azure | List subscriptions, resource groups, resources & resource details |
| **sharepoint** | Microsoft SharePoint | List sites, list/upload/download files |

---

## Prerequisites

- **Node.js** ≥ 18
- An **Azure AD / Microsoft Entra** app registration with the required API permissions (see each plugin's `registry/*.json` for the required scopes)
- An access token or OAuth credentials for the registered application

---

## Installation

```bash
npm install
npm run build
```

---

## Configuration

Set the following environment variables before starting the server:

| Variable | Description |
|----------|-------------|
| `MICROSOFT_CLIENT_ID` | Azure AD app client ID |
| `MICROSOFT_CLIENT_SECRET` | Azure AD app client secret |
| `MICROSOFT_TENANT_ID` | Azure AD tenant ID |
| `MICROSOFT_ACCESS_TOKEN` | *(Optional)* Pre-issued access token — skips the OAuth flow |

---

## Usage

### Run the MCP server

```bash
MICROSOFT_ACCESS_TOKEN=<token> npm start
```

### Configure in Claude Desktop

Add the following entry to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "claude-m": {
      "command": "node",
      "args": ["/path/to/Claude-m/dist/index.js"],
      "env": {
        "MICROSOFT_CLIENT_ID": "<client-id>",
        "MICROSOFT_CLIENT_SECRET": "<client-secret>",
        "MICROSOFT_TENANT_ID": "<tenant-id>",
        "MICROSOFT_ACCESS_TOKEN": "<access-token>"
      }
    }
  }
}
```

---

## Marketplace tools

Two tools are always available regardless of configuration:

| Tool | Description |
|------|-------------|
| `marketplace_list_plugins` | Return all plugins registered in the marketplace |
| `marketplace_get_plugin` | Return the manifest for a specific plugin by ID |

---

## Development

```bash
# Type-check
npm run lint

# Build
npm run build

# Test
npm test

# Test with coverage
npm run test:coverage
```

### Project structure

```
Claude-m/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── registry.ts       # Loads plugin manifests from registry/
│   ├── types.ts          # Shared TypeScript types
│   └── plugins/
│       ├── base.ts       # Abstract BasePlugin class
│       ├── teams.ts      # Microsoft Teams plugin
│       ├── excel.ts      # Microsoft Excel plugin
│       ├── outlook.ts    # Microsoft Outlook plugin
│       ├── azure.ts      # Microsoft Azure plugin
│       └── sharepoint.ts # Microsoft SharePoint plugin
├── registry/             # JSON plugin manifests
│   ├── teams.json
│   ├── excel.json
│   ├── outlook.json
│   ├── azure.json
│   └── sharepoint.json
└── tests/                # Jest test suites
    ├── registry.test.ts
    └── plugins.test.ts
```

---

## License

ISC

