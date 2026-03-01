---
name: license-optimizer
description: Deep expertise in Microsoft 365 license management and optimization — SKU mapping, usage analysis, downgrade/upgrade recommendations, and CSP/MSP billing for cost-saving engagements.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - license optimization
  - unused licenses
  - license waste
  - sku downgrade
  - license savings
  - csp licensing
  - msp license review
  - license cost
  - underused licenses
  - license report
---

# M365 License Optimizer

This skill provides knowledge for identifying license waste, recommending right-sizing, and generating savings reports for MSP/CSP customer review meetings.

## License Inventory API

### List Tenant SKUs
```
GET https://graph.microsoft.com/v1.0/subscribedSkus
```

Returns all purchased SKUs with `prepaidUnits.enabled`, `consumedUnits`, and `skuPartNumber`.

### List User License Details
```
GET https://graph.microsoft.com/v1.0/users?$select=displayName,userPrincipalName,assignedLicenses,signInActivity&$filter=assignedLicenses/$count ne 0&$count=true
Header: ConsistencyLevel: eventual
```

The `signInActivity` property shows `lastSignInDateTime` and `lastNonInteractiveSignInDateTime`.

## Common SKU Reference

| Friendly Name | SKU Part Number | Approx. Monthly Cost (USD) |
|---|---|---|
| Microsoft 365 F1 | M365_F1 | $2.25 |
| Microsoft 365 F3 | SPE_F1 | $8.00 |
| Microsoft 365 Business Basic | O365_BUSINESS_ESSENTIALS | $6.00 |
| Microsoft 365 Business Standard | O365_BUSINESS_PREMIUM | $12.50 |
| Microsoft 365 Business Premium | SPB | $22.00 |
| Microsoft 365 E1 | STANDARDPACK | $8.00 |
| Microsoft 365 E3 | ENTERPRISEPACK | $36.00 |
| Microsoft 365 E5 | ENTERPRISEPREMIUM | $57.00 |
| Office 365 E1 | STANDARDPACK | $8.00 |
| Office 365 E3 | ENTERPRISEPACKWITHOUTPROPACK | $23.00 |
| Exchange Online Plan 1 | EXCHANGESTANDARD | $4.00 |
| Exchange Online Plan 2 | EXCHANGEENTERPRISE | $8.00 |

*Prices are approximate list prices. CSP/EA pricing varies.*

## Optimization Patterns

### 1. Inactive License Detection
Users with a license but no sign-in for 30+ days:

```
GET https://graph.microsoft.com/v1.0/users?$filter=signInActivity/lastSignInDateTime le {30daysAgo}&$select=displayName,userPrincipalName,assignedLicenses,signInActivity
```

### 2. Downgrade Candidates
| Current | Candidate | Savings | Check Before Downgrade |
|---|---|---|---|
| E5 → E3 | $21/user/mo | Not using Defender, Phone System, or advanced compliance |
| E3 → E1 | $28/user/mo | Not using desktop Office apps |
| E3 → F3 | $28/user/mo | Frontline worker (no desktop apps, limited storage) |
| Business Premium → Standard | $9.50/user/mo | Not using Intune or advanced security |
| Business Standard → Basic | $6.50/user/mo | Not using desktop Office apps |

### 3. Service Plan Usage Check
Before downgrading, verify which service plans the user actually uses:

```
GET https://graph.microsoft.com/v1.0/users/{userId}/licenseDetails
```

Cross-reference `servicePlans` with actual usage:
- Exchange Online: check mailbox activity
- SharePoint: check file activity
- Teams: check Teams activity
- Office Apps: check Office activation status

### 4. Usage Reports
```
GET https://graph.microsoft.com/v1.0/reports/getOffice365ActiveUserDetail(period='D30')
```

Returns per-user activity across Exchange, OneDrive, SharePoint, Teams, and Office apps.

## Multi-Tenant (Lighthouse) Scanning

For MSPs scanning across customer tenants:

```
GET https://graph.microsoft.com/beta/tenantRelationships/managedTenants/tenants
```

Then for each tenant, authenticate via GDAP and run the license scan queries.

### Required GDAP Roles
| Operation | Minimum GDAP Role |
|---|---|
| Read licenses | License Administrator or Global Reader |
| Read usage reports | Reports Reader |
| Read sign-in activity | Sign-in Logs Reader or Global Reader |

## Savings Calculation

```
Monthly savings = (inactive_count × license_monthly_cost) + (downgrade_count × savings_per_downgrade)
Annual savings = monthly_savings × 12
```

## Important Notes

- `signInActivity` requires Azure AD Premium P1 license on the tenant
- Usage reports have a 48-hour data lag
- Disabled accounts with licenses are the easiest win — remove licenses immediately
- E5 license includes many sub-services — check each before recommending E3 downgrade
- CSP license changes take effect at next billing cycle
