# Claude-m

> **A Claude plugin marketplace that extends Claude's ability to work with Microsoft products via MCP.**

Claude-m is an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that gives Claude native access to Microsoft 365, Microsoft Teams, Microsoft Azure, and SharePoint — all through a unified plugin marketplace. Built following the official [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) best practices using the high-level `McpServer` API.

---

## Features

✨ **Plugin Marketplace** — Discover and explore Microsoft product integrations
🔍 **Smart Search** — Find plugins by keyword or capability
🛠️ **25+ Tools** — Comprehensive Microsoft product APIs
📦 **Modular Design** — Each plugin is independently loadable
✅ **Production Ready** — Built with TypeScript, Zod validation, and comprehensive tests
🎯 **MCP Native** — Uses official `@modelcontextprotocol/sdk` v1.27.1+

---

## Architecture

This MCP server uses the modern `McpServer` high-level API (not the deprecated low-level `Server` class) for optimal compatibility with Claude Desktop and Claude Code.

### Key Components

- **`src/types.ts`** — Shared types: `PluginManifest`, `PluginAuth`, `PluginResult`
- **`src/plugins/base.ts`** — Abstract `BasePlugin` with bearer-token fetch helpers (`graphGet`, `graphPost`)
- **`src/registry.ts`** — Loads `registry/*.json` manifests at runtime; works in both ESM and CJS
- **`src/index.ts`** — MCP server using `McpServer`: dynamic tool registration with Zod schemas

Each plugin validates arguments via Zod and maps tool names to Microsoft Graph/ARM REST calls.

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

### Option 1: Install from Claude Code Plugin Marketplace (Recommended)

The easiest way to use Claude-m is through the Claude Code plugin marketplace:

```bash
# Add the marketplace
/plugin marketplace add markus41/Claude-m

# Install specific plugins
/plugin install "Microsoft Teams MCP"
/plugin install "Microsoft Excel MCP"
/plugin install "Microsoft Outlook MCP"
/plugin install "Microsoft Azure MCP"
/plugin install "Microsoft SharePoint MCP"
```

This will automatically configure the MCP server with the appropriate tools for each plugin.

### Option 2: Manual MCP Server Configuration

#### Run the MCP server

```bash
MICROSOFT_ACCESS_TOKEN=<token> npm start
```

#### Configure in Claude Desktop

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

#### Configure in Claude Code

Claude Code can automatically discover MCP servers configured in your `claude_desktop_config.json`. Alternatively, you can configure it directly in your project's `.claude/config.json`:

```json
{
  "mcpServers": {
    "claude-m": {
      "command": "node",
      "args": ["/absolute/path/to/Claude-m/dist/index.js"],
      "env": {
        "MICROSOFT_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Note**: Always use absolute paths in MCP server configuration.

---

## Marketplace Tools

The marketplace provides powerful discovery tools that are always available:

| Tool | Description |
|------|-------------|
| `marketplace_list_plugins` | List all available Microsoft plugins with descriptions, versions, and required scopes |
| `marketplace_get_plugin` | Get detailed information about a specific plugin by its ID |
| `marketplace_search_plugins` | Search plugins by keyword in name, description, or tool names |
| `marketplace_list_tools` | List all available tools across all plugins (optionally filter by plugin ID) |

### Example Usage

```typescript
// Discover all plugins
await callTool("marketplace_list_plugins", {});

// Find plugins related to email
await callTool("marketplace_search_plugins", { keyword: "email" });

// Get details about the Teams plugin
await callTool("marketplace_get_plugin", { pluginId: "teams" });

// List all tools
await callTool("marketplace_list_tools", {});

// List only Outlook tools
await callTool("marketplace_list_tools", { pluginId: "outlook" });
```

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
├── .claude-plugin/          # Claude Code marketplace metadata
│   └── marketplace.json     # Marketplace configuration
├── plugins/                 # Claude Code plugin definitions
│   ├── teams/
│   │   ├── plugin.json     # Teams plugin manifest
│   │   └── README.md       # Teams plugin documentation
│   ├── excel/
│   │   ├── plugin.json     # Excel plugin manifest
│   │   └── README.md       # Excel plugin documentation
│   ├── outlook/
│   │   ├── plugin.json     # Outlook plugin manifest
│   │   └── README.md       # Outlook plugin documentation
│   ├── azure/
│   │   ├── plugin.json     # Azure plugin manifest
│   │   └── README.md       # Azure plugin documentation
│   └── sharepoint/
│       ├── plugin.json     # SharePoint plugin manifest
│       └── README.md       # SharePoint plugin documentation
├── src/
│   ├── index.ts            # MCP server entry point
│   ├── registry.ts         # Loads plugin manifests from registry/
│   ├── types.ts            # Shared TypeScript types
│   └── plugins/
│       ├── base.ts         # Abstract BasePlugin class
│       ├── teams.ts        # Microsoft Teams plugin
│       ├── excel.ts        # Microsoft Excel plugin
│       ├── outlook.ts      # Microsoft Outlook plugin
│       ├── azure.ts        # Microsoft Azure plugin
│       └── sharepoint.ts   # Microsoft SharePoint plugin
├── registry/               # Internal JSON plugin manifests
│   ├── teams.json
│   ├── excel.json
│   ├── outlook.json
│   ├── azure.json
│   └── sharepoint.json
└── tests/                  # Jest test suites
    ├── registry.test.ts
    └── plugins.test.ts
```

---

## License

ISC

