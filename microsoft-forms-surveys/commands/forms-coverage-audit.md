---
name: forms-coverage-audit
description: "Audit Microsoft Forms feature coverage against official Graph beta documentation"
argument-hint: "<form-id> [--group <group-id>]"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# Audit Forms Feature Coverage

Compare this plugin's guidance to Microsoft Forms Graph beta docs and produce a concrete gap list before creating or changing survey workflows.

## Inputs

- `<form-id>` (required): Form ID for endpoint checks.
- `--group <group-id>` (optional): Include group form coverage.

## Prerequisites

- Valid Graph beta token with `Forms.Read`.
- Review docs:
  - `https://learn.microsoft.com/graph/api/resources/forms-api-overview?view=graph-rest-beta`
  - `https://learn.microsoft.com/graph/api/resources/form?view=graph-rest-beta`
  - `https://learn.microsoft.com/graph/api/resources/formquestion?view=graph-rest-beta`
  - `https://learn.microsoft.com/graph/api/resources/formresponse?view=graph-rest-beta`

## Step 1: Build the feature matrix

| Domain | Required API families |
|---|---|
| Form lifecycle | create/read/update/delete form |
| Question model coverage | choice, text, rating, date, likert, required fields |
| Response ingestion | paged responses, detail lookup |
| Ownership and scope | `/me/forms` and `/groups/{groupId}/forms` |
| Analytics summaries | aggregate counts, response rate, sentiment buckets |
| Preview risk handling | beta change detection and fallback notes |

Mark each domain as `covered`, `partial`, or `missing`.

## Step 2: Run deterministic checks

```bash
curl -s "https://graph.microsoft.com/beta/me/forms/${FORM_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '{id, title, status}'

curl -s "https://graph.microsoft.com/beta/me/forms/${FORM_ID}/questions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.value[] | {id, displayName, questionType, isRequired}'

curl -s "https://graph.microsoft.com/beta/me/forms/${FORM_ID}/responses?$top=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '{count: (.value|length), nextLink: ."@odata.nextLink"}'
```

If `--group` is provided, also run:

```bash
curl -s "https://graph.microsoft.com/beta/groups/${GROUP_ID}/forms" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.value[] | {id, title}'
```

## Step 3: Output format (required)

```markdown
# Microsoft Forms Coverage Report

## Coverage Summary
| Domain | Status | Evidence | Action |
|---|---|---|---|
| Question model coverage | covered | SKILL question reference + /questions response | none |
| Ownership and scope | partial | group forms documented but not commandized | add `/forms-group-list` |

## Beta risks
- [risk and mitigation]

## Recommended next steps
1. [deterministic, safe action]
2. [deterministic, safe action]
```

## Validation

- Every row cites a docs URL and either SKILL/README or command evidence.
- Do not mark a domain `covered` without both documentation and API response evidence.
