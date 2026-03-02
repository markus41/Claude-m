# Marketplace Dev Tools Plugin

A Claude Code plugin for researching Microsoft Graph APIs, scaffolding new plugins,
extending existing ones, and auditing marketplace coverage gaps.

## What This Plugin Provides

This is a **developer tools plugin** for the Claude-m marketplace itself. It gives Claude
the ability to systematically research Microsoft Learn documentation, extract API endpoints
and permissions, and generate complete plugin directory structures from that research.

It also includes a standalone Node.js script for batch-scraping Microsoft Learn pages.

## Commands

| Command | Description |
|---------|-------------|
| /research-service | Research a Microsoft service's Graph API — endpoints, permissions, schemas |
| /scaffold-plugin | Generate a complete Claude plugin from research output JSON |
| /extend-plugin | Discover uncovered endpoints and add commands to an existing plugin |
| /audit-coverage | Compare marketplace plugins against known M365 services and score gaps |

## Agent

| Agent | Description |
|-------|-------------|
| Research Reviewer | Validates research output for endpoint accuracy, permission correctness, and coverage |

## Workflow

```
# 1. Research a service
/research-service bookings

# 2. Review the research
#    (Research Reviewer agent is invoked automatically or via /research-reviewer)

# 3. Scaffold a plugin from the research
/scaffold-plugin research-output/bookings.json --plugin-name microsoft-bookings

# 4. Extend an existing plugin with new endpoints
/extend-plugin microsoft-bookings --api-version beta

# 5. Audit overall marketplace coverage
/audit-coverage
```

## Standalone Script

The `scripts/research-service.mjs` script can be run directly for batch research:

```bash
npm run research -- bookings
npm run research -- calendar
npm run research -- teams
```

Output is written to `research-output/{service}.json`.

## Plugin Structure

```
marketplace-dev-tools/
├── .claude-plugin/plugin.json
├── skills/marketplace-research/SKILL.md
├── commands/
│   ├── research-service.md
│   ├── scaffold-plugin.md
│   ├── extend-plugin.md
│   └── audit-coverage.md
├── agents/research-reviewer.md
├── scripts/research-service.mjs
├── research-output/.gitkeep
└── README.md
```

## Trigger Keywords

The skill activates automatically when conversations mention: research service,
scaffold plugin, extend plugin, audit coverage, marketplace dev, plugin scaffold,
graph api research, microsoft learn.

## Author

Markus Ahling
