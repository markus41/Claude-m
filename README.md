# Claude-m

A focused Claude plugin marketplace for Microsoft workflows (Azure, Teams, Outlook, Excel, SharePoint) backed by one MCP server.

## Why this marketplace exists
Claude-m is optimized for high-value Microsoft tasks:
- **Review Azure IaC and live resources** for risk/cost hot spots.
- **Triage DevOps and collaboration workflows** through Teams/Outlook context.
- **Analyze spreadsheets and operational data** from Excel/SharePoint quickly.

This repo intentionally keeps the marketplace small, strict, and maintainable.

## Quick start

```bash
/plugin marketplace add markus41/Claude-m
/plugin install "Microsoft Azure MCP@Claude-m Microsoft Marketplace"
```

## Copy-paste sessions

### 1) Add the marketplace
```bash
/plugin marketplace add markus41/Claude-m
/plugin marketplace list
```

### 2) Install a Microsoft plugin from this marketplace
```bash
/plugin install "Microsoft Teams MCP@Claude-m Microsoft Marketplace"
```

### 3) Run a realistic task prompt
```text
Use Microsoft Azure MCP to list all resource groups in subscription <subscription-id>,
identify resources with no recent activity, and suggest cleanup candidates.
```

## Opinionated flows

1. **Set up Microsoft collaboration stack**
   - Install Teams + Outlook + SharePoint plugins.
   - Prompt: “Audit communication and file handoff risks for this week and produce actions.”
2. **Azure governance review**
   - Install Azure plugin.
   - Prompt: “List subscriptions/resource groups/resources, then flag policy drift and likely cost waste.”

## Marketplace structure guidance
- `.claude-plugin/marketplace.json` is intentionally minimal (short name, clear description, only maintained plugins).
- `strict: true` is used for all first-party plugins in this repo.
- If you need heavy command/agent reshaping for third-party plugins, put those entries in a separate marketplace repo with `strict: false` only where required.
- Prefer multiple focused marketplace repos (e.g. `claude-msft-suite`, `claude-devtools`) over a single giant catalog.

## Validation commands
Run the same checks locally and in CI:

```bash
claude plugin validate .
/plugin validate .
npm run validate:marketplace
npm run validate:plugins
npm run validate:all
```

`validate:marketplace` checks `.claude-plugin/marketplace.json`; `validate:plugins` checks every `plugins/*/plugin.json`.

## Org allow-listing (`strictKnownMarketplaces`)
For org rollouts, admins can allow-list this marketplace URL/repo with `strictKnownMarketplaces` in their Claude policy so installs resolve only from approved sources.

## Prioritization backlog

See `docs-plugin-prioritization.md` for a scored plugin backlog (impact × complexity × scope friction) and the recommended next 3 plugins to implement.

## Development

```bash
npm install
npm run build
npm run lint
npm test
```

## Roadmap
- SharePoint automation expansions (bulk operations and metadata workflows)
- Power BI plugin for dataset/report inspection
- Teams automation helpers for channel lifecycle and meeting operations
