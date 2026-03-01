---
name: license-report
description: Generate a customer-facing license optimization report for review meetings — includes savings summary, recommendations, and multi-tenant Lighthouse comparison.
argument-hint: "[--tenant <tenantId>] [--all-tenants] [--format <markdown|csv>] [--meeting-ready]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# License Optimization Report

Generate a polished, customer-facing report suitable for QBR (quarterly business review) or license review meetings.

## Report Sections

### Executive Summary
- Total licenses, utilization rate, estimated waste
- Top 3 savings opportunities with dollar amounts
- Overall recommendation (optimize / right-size / no action needed)

### License Inventory
- Table of all SKUs with purchased, assigned, unassigned counts
- Utilization percentage per SKU
- Month-over-month trend (if historical data available)

### Savings Recommendations
- Prioritized list of actions with effort level and savings amount
- Clear "recommended action" vs. "review needed" categorization
- Implementation timeline suggestion

### Multi-Tenant Comparison (Lighthouse Mode)
When `--all-tenants` is used:

```markdown
# Multi-Tenant License Report — [MSP Name]

| Customer | Total Licenses | Utilization | Waste | Monthly Savings |
|---|---|---|---|---|
| Contoso | 500 | 84% | 80 unused | $2,880 |
| Fabrikam | 200 | 92% | 16 unused | $576 |
| Woodgrove | 150 | 71% | 43 unused | $1,548 |
| **Total** | **850** | **83%** | **139** | **$5,004/mo** |
```

### Next Steps Checklist
- [ ] Review inactive user list with customer
- [ ] Confirm downgrade candidates
- [ ] Schedule license changes for next billing cycle
- [ ] Set up monthly license utilization monitoring

## Arguments

- `--tenant <tenantId>`: Single tenant report
- `--all-tenants`: Cross-tenant Lighthouse report
- `--format <markdown|csv>`: Output format
- `--meeting-ready`: Add executive summary and action items suitable for presentation

## Important Notes

- Reports use point-in-time data — note the scan date prominently
- CSP pricing differs from list pricing — ask the user for their rate card
- License changes in CSP take effect at the next billing cycle
- Reference: `skills/license-optimizer/SKILL.md` for SKU reference and pricing
