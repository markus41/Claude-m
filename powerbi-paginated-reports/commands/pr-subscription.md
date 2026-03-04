---
name: pr-subscription
description: Create or manage email subscriptions for paginated reports in the Power BI service via REST API.
argument-hint: "--workspace <id> --report <id> --recipients <emails> [--frequency daily|weekly|monthly] [--format pdf|excel|csv] [--params <param-values>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Manage Paginated Report Subscriptions

Generate a TypeScript script to create, list, or delete email subscriptions for paginated reports.

## Instructions

1. Parse arguments:
   - `--workspace` — Workspace ID
   - `--report` — Report ID
   - `--recipients` — Comma-separated email addresses
   - `--frequency` — Delivery frequency: daily, weekly, monthly (default: weekly)
   - `--format` — Export format: pdf, excel, csv, word (default: pdf)
   - `--params` — Report parameter values as key=value pairs
   - `--list` — List existing subscriptions instead of creating
   - `--delete <subscription-id>` — Delete a subscription

2. Read REST API reference:
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/references/rest-api.md`
   - `${CLAUDE_PLUGIN_ROOT}/skills/paginated-reports/examples/api-automation.md`

3. Generate the appropriate TypeScript script.

## Output Format

### Create Subscription Script

```typescript
// create-subscription.ts
// Creates an email subscription for a paginated report

const subscriptionConfig = {
  title: 'Weekly Sales Report',
  frequency: 'Weekly',
  startDate: '2025-03-17T08:00:00Z',
  endDate: '2026-03-17T08:00:00Z',
  daysOfWeek: ['Monday'],
  format: 'PDF',
  recipients: ['user@company.com'],
  params: [
    { name: 'Region', value: 'North' },
  ],
};

// ... authentication + API call
```

### List Subscriptions Script

```typescript
// list-subscriptions.ts
// Lists all subscriptions for a paginated report
// Output: table with ID, title, frequency, recipients, last status
```

## Guidelines

- Default subscription schedule: Monday at 8:00 AM UTC
- Maximum 50 recipients per subscription
- Validate email addresses before making API call
- Include error handling for common failures (invalid email, capacity not available)
- Show the subscription ID after creation (needed for delete/update)
- For Power Automate alternatives (file share delivery), reference the migration checklist examples
