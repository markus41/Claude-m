# Claude-m

A Claude plugin marketplace for Microsoft cloud, productivity, security, analytics, and DevOps workflows.

## Why this marketplace exists
Claude-m packages a broad Microsoft operations catalog into one install source so teams can combine plugins into repeatable runbooks:
- **Cloud and governance**: Azure inventory, policy drift, cost controls, and tenant administration.
- **Productivity and collaboration**: Teams, Outlook, SharePoint, OneDrive, Planner/To Do, Power Apps, and Power Automate workflows.
- **Security and compliance**: Entra ID security checks, Purview coverage, sharing audits, and multi-tenant health scoring.
- **Analytics and ALM**: Power BI/Fabric authoring support, Dataverse schema work, and Power Platform solution lifecycle automation.

## Quick start

```bash
/plugin marketplace add markus41/Claude-m
/plugin install <plugin-name>@claude-m-microsoft-marketplace
```

## Copy-paste sessions

### 1) Add the marketplace
```bash
/plugin marketplace add markus41/Claude-m
/plugin marketplace list
```

### 2) Install a Microsoft plugin from this marketplace
```bash
/plugin install <plugin-name>@claude-m-microsoft-marketplace
```

Examples:

```bash
/plugin install microsoft-azure-mcp@claude-m-microsoft-marketplace
/plugin install powerbi-fabric@claude-m-microsoft-marketplace
/plugin install teams-lifecycle@claude-m-microsoft-marketplace
```

### 3) Run a realistic task prompt
```text
Use microsoft-azure-mcp to list all resource groups in subscription <subscription-id>,
identify resources with no recent activity, and suggest cleanup candidates.
```

## Plugin coverage summary

Current catalog in `CLAUDE.md` includes these install slugs:

- **Cloud**: `microsoft-azure-mcp`, `m365-platform-clients`, `m365-admin`, `dataverse-schema`, `azure-cost-governance`, `license-optimizer`
- **Productivity**: `microsoft-teams-mcp`, `microsoft-outlook-mcp`, `microsoft-sharepoint-mcp`, `microsoft-excel-mcp`, `excel-office-scripts`, `excel-automation`, `onedrive`, `planner-todo`, `powerapps`, `power-automate`, `exchange-mailflow`, `teams-lifecycle`, `servicedesk-runbooks`
- **Security**: `entra-id-security`, `purview-compliance`, `azure-policy-security`, `lighthouse-health`, `sharing-auditor`
- **DevOps**: `azure-devops`, `powerplatform-alm`
- **Analytics**: `powerbi-fabric`

## Opinionated flows

1. **Set up Microsoft collaboration stack**
   - Install `microsoft-teams-mcp` + `microsoft-outlook-mcp` + `microsoft-sharepoint-mcp`.
   - Prompt: “Audit communication and file handoff risks for this week and produce actions.”
2. **Azure governance review**
   - Install `microsoft-azure-mcp` + `azure-cost-governance` + `azure-policy-security`.
   - Prompt: “List subscriptions/resource groups/resources, then flag policy drift and likely cost waste.”
3. **Entra + compliance sweep**
   - Install `entra-id-security` + `purview-compliance` + `sharing-auditor`.
   - Prompt: “Review conditional access gaps, overshared files, and DLP policy coverage.”
4. **MSP tenant health and runbooks**
   - Install `lighthouse-health` + `license-optimizer` + `servicedesk-runbooks`.
   - Prompt: “Score all tenants for security posture and generate a monthly customer-ready report.”

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
- Expand cross-plugin runbooks with deterministic command sequences and validation steps.
- Add scenario packs for regulated environments (least privilege, audit evidence, and change-control outputs).
- Improve catalog quality gates and release automation for metadata consistency across plugins.
