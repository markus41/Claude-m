# CLAUDE.md

## Usage
- Add this marketplace: `/plugin marketplace add markus41/Claude-m`
- Validate locally: `claude plugin validate .` (CLI) or `/plugin validate .` (inside Claude)
- Install from this marketplace: `/plugin install microsoft-azure-mcp@claude-m-microsoft-marketplace`

## Prompt examples
- "Use Microsoft Azure MCP to list my resource groups in subscription `<id>` and flag idle resources."
- "Use Microsoft Teams MCP to draft and send a standup update to channel `<channel-id>`."
- "Use Microsoft Outlook MCP to summarize unread inbox messages and schedule a follow-up event."

## Opinionated flows
1. **Microsoft integration bootstrap**: install Teams + Outlook + SharePoint plugins, then run a workspace health check prompt for communication, files, and scheduling.
2. **Azure review flow**: install Azure plugin, list subscriptions/resource groups/resources, then ask Claude to identify misconfigurations and cost hotspots.
