---
name: d365-pipeline-report
description: Generate a Dynamics 365 Sales pipeline forecast — summarize open opportunities by owner, stage, and close date; calculate weighted value; identify at-risk deals
argument-hint: "[--owner <user-id>] [--period <YYYY-QN>] [--from <date>] [--to <date>] [--output-csv]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Pipeline Report

Retrieves all open opportunities, aggregates by owner and pipeline stage, calculates weighted pipeline value, identifies at-risk deals (past close date or stale), and produces a structured forecast report.

## Arguments

- `--owner <user-id>`: Scope to a specific owner's pipeline (default: all)
- `--period <YYYY-QN>`: Quarter shorthand, e.g., `2026-Q2` (sets --from and --to automatically)
- `--from <date>`: Start of close date range (ISO 8601 date, default: today)
- `--to <date>`: End of close date range (default: end of current quarter)
- `--output-csv`: Export opportunity list as CSV

## Integration Context Check

Require:
- `D365_ORG_URL`
- Minimum role: `Salesperson` (own pipeline) or `Sales Manager` (all)

## Step 1: Resolve Date Range

If `--period` is provided, compute start/end from quarter notation:

```python
import sys
from datetime import date

period = sys.argv[1]  # e.g., "2026-Q2"
year, q = period.split("-")
year = int(year)
q_map = {"Q1": (1, 3), "Q2": (4, 6), "Q3": (7, 9), "Q4": (10, 12)}
start_month, end_month = q_map[q]
from_date = date(year, start_month, 1).isoformat()
import calendar
to_date = date(year, end_month, calendar.monthrange(year, end_month)[1]).isoformat()
print(f"{from_date},{to_date}")
```

Default to current date → end of current quarter if no range provided.

## Step 2: Retrieve Open Opportunities

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)

OWNER_FILTER=""
if [ -n "{ownerId}" ]; then
  OWNER_FILTER=" and _ownerid_value eq {ownerId}"
fi

curl -s "${D365_ORG_URL}/api/data/v9.2/opportunities?\$select=opportunityid,name,estimatedvalue,closeprobability,stepname,estimatedclosedate,forecastcategoryname,createdon,modifiedon&\$expand=owninguser(\$select=fullname,systemuserid),parentaccountid(\$select=name,accountid)&\$filter=statecode eq 0 and estimatedclosedate ge {fromDate} and estimatedclosedate le {toDate}${OWNER_FILTER}&\$orderby=estimatedclosedate asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" \
  -H "Prefer: odata.maxpagesize=250"
```

Follow `@odata.nextLink` to page through all results.

## Step 3: Identify At-Risk Deals

**Past close date (open but overdue):**
```python
today = date.today()
at_risk = [opp for opp in opportunities
           if date.fromisoformat(opp['estimatedclosedate'][:10]) < today]
```

**Stale deals (no activity in 30+ days):**
```bash
# For each suspect deal, check last activity date
curl -s "${D365_ORG_URL}/api/data/v9.2/activitypointers?\$select=subject,createdon,actualdurationminutes&\$filter=_regardingobjectid_value eq {oppId}&\$orderby=createdon desc&\$top=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

Flag deals with no activity (or last activity > 30 days ago).

## Step 4: Retrieve Stage Distribution

Get stage counts via OData aggregation:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/opportunities?\$apply=filter(statecode eq 0 and estimatedclosedate ge {fromDate} and estimatedclosedate le {toDate})/groupby((stepname,owninguser/fullname),aggregate(estimatedvalue with sum as totalValue,\$count as dealCount))&\$expand=owninguser(\$select=fullname)" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" \
  -H "Prefer: odata.include-annotations=OData.Community.Display.V1.FormattedValue"
```

## Step 5: Calculate Weighted Pipeline

```python
def calculate_pipeline(opportunities):
    total_value = sum(o['estimatedvalue'] or 0 for o in opportunities)
    weighted_value = sum(
        (o['estimatedvalue'] or 0) * (o['closeprobability'] or 0) / 100
        for o in opportunities
    )
    by_stage = {}
    for opp in opportunities:
        stage = opp.get('stepname', 'Unknown')
        by_stage.setdefault(stage, {'count': 0, 'total': 0, 'weighted': 0})
        by_stage[stage]['count'] += 1
        by_stage[stage]['total'] += opp['estimatedvalue'] or 0
        by_stage[stage]['weighted'] += (opp['estimatedvalue'] or 0) * (opp['closeprobability'] or 0) / 100
    return total_value, weighted_value, by_stage
```

## Step 6: Per-Owner Summary

Group by owner, compute per-owner totals:

| Owner | Deals | Total Value | Weighted Value | Avg Probability | Deals at Risk |
|---|---|---|---|---|---|
| Jane Smith | 8 | $420,000 | $168,000 | 40% | 1 |
| John Doe | 5 | $280,000 | $196,000 | 70% | 0 |

## Step 7: Export CSV (if --output-csv)

```python
import csv, io
rows = []
for opp in opportunities:
    rows.append({
        'OpportunityId': opp['opportunityid'],
        'Name': opp['name'],
        'Account': opp.get('parentaccountid', {}).get('name', ''),
        'Owner': opp.get('owninguser', {}).get('fullname', ''),
        'Stage': opp.get('stepname', ''),
        'EstimatedValue': opp.get('estimatedvalue', 0),
        'Probability': opp.get('closeprobability', 0),
        'WeightedValue': (opp.get('estimatedvalue') or 0) * (opp.get('closeprobability') or 0) / 100,
        'CloseDate': opp.get('estimatedclosedate', '')[:10],
        'ForecastCategory': opp.get('forecastcategoryname', ''),
        'AtRisk': 'Yes' if opp['opportunityid'] in at_risk_ids else 'No'
    })
```

Write to `pipeline-report-{period}.csv`.

## Output Format

```markdown
# Dynamics 365 Pipeline Report
**Period:** {fromDate} — {toDate} | **Generated:** {timestamp}
**Scope:** {ownerName or "All Owners"}

## Executive Summary
| Metric | Value |
|---|---|
| Total open opportunities | {N} |
| Total pipeline value | ${totalValue:,.0f} |
| **Weighted pipeline value** | **${weightedValue:,.0f}** |
| Deals at risk (overdue) | {atRiskCount} |
| Stale deals (no activity 30d) | {staleCount} |

## Pipeline by Stage
| Stage | Deals | Total Value | Weighted Value | Avg Probability |
|---|---|---|---|---|
| Qualify | 4 | $180,000 | $18,000 | 10% |
| Develop | 3 | $220,000 | $44,000 | 20% |
| Propose | 5 | $300,000 | $150,000 | 50% |
| Close | 2 | $200,000 | $160,000 | 80% |

## Pipeline by Owner
| Owner | Deals | Total Value | Weighted Value | At Risk |
|---|---|---|---|---|
| Jane Smith | 8 | $420,000 | $168,000 | 1 |
| John Doe | 6 | $480,000 | $204,000 | 0 |

## At-Risk Deals ({N} total)
| Opportunity | Owner | Value | Close Date | Days Overdue |
|---|---|---|---|---|
| Contoso Q2 Renewal | Jane Smith | $75,000 | 2026-02-28 | 2 days |

## Stale Deals ({N} total — no activity 30+ days)
| Opportunity | Owner | Value | Last Activity |
|---|---|---|---|
| Fabrikam Migration | John Doe | $120,000 | 2026-01-28 |

## Recommendations
1. Follow up on {N} overdue deals before quarter end
2. {staleCount} deals have no recent activity — assign tasks or disqualify
3. Weighted pipeline of ${weightedValue:,.0f} vs target ${target:,.0f}: {onTrack/BehindPace}
```
