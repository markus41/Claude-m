---
name: audit-coverage
description: Audit marketplace plugin coverage against known Microsoft 365 services
argument-hint: "[--format table|json|markdown] [--threshold <min-score>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - WebFetch
  - WebSearch
---

# Audit Marketplace Coverage

Compare installed marketplace plugins against the full catalog of Microsoft 365 and Azure services
to identify coverage gaps and recommend next plugin builds.

## Instructions

### 1. Inventory current plugins

Read `.claude-plugin/marketplace.json` to get the full list of registered plugins.
For each plugin, read its `plugin.json` and SKILL.md to understand what services and
endpoints it covers.

Build a coverage map: `{ serviceName: pluginName | null }`.

### 2. Load the M365 services catalog

Use the known services catalog from the marketplace-research SKILL.md. This catalog
lists ~60 Microsoft 365 and Azure services with their Graph API availability and
target audience.

### 3. Compare coverage

For each service in the catalog, determine:
- **Covered**: A plugin exists and covers the service's primary endpoints
- **Partial**: A plugin exists but covers only a subset of the service
- **Uncovered**: No plugin exists for this service

### 4. Score uncovered services

For each uncovered or partially covered service, calculate a priority score:

```
Score = (Impact * 2) - BuildComplexity - ScopeFriction
```

Where:
- **Impact** (1-5): How many users would benefit from this plugin?
  - 5 = Core productivity (Mail, Calendar, Files)
  - 4 = Collaboration (Teams, SharePoint, Planner)
  - 3 = Administration (Entra, Intune, Compliance)
  - 2 = Developer tools (DevOps, GitHub, App Registration)
  - 1 = Niche services (Kaizala, Bookings, StaffHub)
- **BuildComplexity** (1-5): How complex is the API surface?
  - 1 = Simple CRUD with <10 endpoints
  - 2 = Standard CRUD with 10-25 endpoints
  - 3 = Complex with 25-50 endpoints, special auth
  - 4 = Very complex with 50+ endpoints, webhooks, streaming
  - 5 = Extremely complex, undocumented, or heavily rate-limited
- **ScopeFriction** (1-5): How hard is it to get permissions approved?
  - 1 = Standard delegated scopes, no admin consent
  - 2 = Requires admin consent for some operations
  - 3 = Requires application permissions with admin consent
  - 4 = Requires privileged permissions (Directory, Security)
  - 5 = Requires special licensing or government cloud

### 5. Generate report

Output a ranked report in the requested format (default: `table`):

**Table format:**
```
| Rank | Service | Status | Impact | Complexity | Friction | Score | Recommendation |
|------|---------|--------|--------|------------|----------|-------|----------------|
| 1    | Intune  | Uncovered | 4   | 3          | 3        | 2     | Build next — high admin demand |
```

**Include sections:**
- Coverage summary (X/Y services covered, Z partially covered)
- Top 10 recommended builds (sorted by score descending)
- Partial coverage improvements (what to add to existing plugins)
- Services intentionally skipped (deprecated, preview-only, or out of scope)

### 6. Write output

If `--format json` is specified, write the full report to `research-output/coverage-audit.json`.
Otherwise, display the report directly.

If `--threshold` is specified, only show services with a score >= the threshold.
