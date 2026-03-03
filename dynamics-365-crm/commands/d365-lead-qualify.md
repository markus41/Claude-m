---
name: d365-lead-qualify
description: Qualify a Dynamics 365 lead — convert to opportunity, account, and contact; assign owner; set initial pipeline stage; and log the qualification activity
argument-hint: "<lead-id> [--owner <user-id>] [--opportunity-name <name>] [--value <amount>] [--close-date <date>] [--dry-run]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Lead Qualification

Qualifies a lead by calling the `QualifyLead` Dataverse action, which creates linked Account, Contact, and Opportunity records. Sets the opportunity name, estimated value, close date, and owner. Logs the qualification as a phone call or task activity.

## Arguments

- `<lead-id>`: GUID of the lead to qualify
- `--owner <user-id>`: GUID of the systemuser to assign the opportunity to (default: current user)
- `--opportunity-name <name>`: Name for the created opportunity (default: "{CompanyName} — {Subject}")
- `--value <amount>`: Estimated revenue value in base currency (default: lead's `estimatedvalue`)
- `--close-date <date>`: Expected close date ISO 8601 (default: 90 days from today)
- `--dry-run`: Show lead details and what would be created, without executing

## Integration Context Check

Require:
- `D365_ORG_URL`
- `D365_USER_ID` (for owner default)
- Minimum role: `Salesperson`

## Step 1: Validate Lead Exists and Is Open

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)

curl -s "${D365_ORG_URL}/api/data/v9.2/leads({leadId})?\$select=leadid,fullname,companyname,emailaddress1,telephone1,subject,estimatedvalue,estimatedclosedate,statecode,statuscode,leadsourcecode" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Accept: application/json"
```

Validate:
- `statecode == 0` (Open) — if already qualified (1) or disqualified (2), stop and report current state
- `statuscode` is not already `4` (Qualified) or `5` (Disqualified)

## Step 2: Retrieve Conversion Details

If `--owner` not provided, use `${D365_USER_ID}`.

If `--opportunity-name` not provided, build from: `{companyname} — {subject}` or `{fullname} — Opportunity`.

If `--close-date` not provided, compute 90 days from today:

```bash
CLOSE_DATE=$(date -d "+90 days" +%Y-%m-%dT00:00:00Z 2>/dev/null || python3 -c "from datetime import datetime, timedelta; print((datetime.utcnow() + timedelta(days=90)).strftime('%Y-%m-%dT00:00:00Z'))")
```

Get the default currency ID:

```bash
CURRENCY_ID=$(curl -s "${D365_ORG_URL}/api/data/v9.2/transactioncurrencies?\$filter=isocurrencycode eq 'USD'&\$select=transactioncurrencyid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "import sys,json; print(json.load(sys.stdin)['value'][0]['transactioncurrencyid'])")
```

## Step 3: Dry-Run Preview (if --dry-run)

```markdown
## Lead Qualification Dry Run

**Lead:** {fullname} at {companyname} (ID: {leadId})
**Status:** Open — New

**Would create:**
- Account: {companyname}
- Contact: {fullname} ({emailaddress1})
- Opportunity: {opportunityName}
  - Estimated value: {value}
  - Close date: {closeDate}
  - Owner: {ownerName}
  - Initial stage: Qualify

No changes made (dry run).
```

Stop here if `--dry-run`.

## Step 4: Execute QualifyLead Action

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/leads({leadId})/Microsoft.Dynamics.CRM.QualifyLead" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"CreateAccount\": true,
    \"CreateContact\": true,
    \"CreateOpportunity\": true,
    \"Status\": 3,
    \"OpportunityCurrencyId\": {
      \"transactioncurrencyid\": \"${CURRENCY_ID}\",
      \"@odata.type\": \"Microsoft.Dynamics.CRM.transactioncurrency\"
    }
  }"
```

Parse response to extract `opportunityid`, `accountid`, `contactid`.

## Step 5: Update Opportunity with Details

```bash
curl -s -X PATCH \
  "${D365_ORG_URL}/api/data/v9.2/opportunities({opportunityId})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"{opportunityName}\",
    \"estimatedvalue\": {value},
    \"estimatedclosedate\": \"{closeDate}\",
    \"closeprobability\": 10,
    \"stepname\": \"Qualify\",
    \"ownerid@odata.bind\": \"/systemusers/{ownerId}\"
  }"
```

## Step 6: Log Qualification Activity

Create a completed phone call activity tied to the opportunity:

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/phonecalls" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"subject\": \"Lead Qualification Call — {fullname}\",
    \"description\": \"Lead qualified and converted to opportunity. Created account {companyname} and contact {fullname}.\",
    \"directioncode\": true,
    \"statecode\": 1,
    \"statuscode\": 2,
    \"actualend\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"regardingobjectid_opportunity@odata.bind\": \"/opportunities/{opportunityId}\"
  }"
```

## Output Format

```markdown
# Lead Qualification Report
**Lead:** {fullname} at {companyname}
**Timestamp:** {timestamp}

## Result: Qualified

| Record | ID | Name |
|---|---|---|
| Lead | {leadId} | {fullname} — now Qualified |
| Account | {accountId} | {companyname} |
| Contact | {contactId} | {fullname} ({emailaddress1}) |
| Opportunity | {opportunityId} | {opportunityName} |

## Opportunity Details
- **Value:** {value}
- **Close date:** {closeDate}
- **Stage:** Qualify (10%)
- **Owner:** {ownerName}

## Activity Logged
- Phone call logged: "Lead Qualification Call — {fullname}"

## Next Steps
1. Schedule discovery call with {fullname} to move to Develop stage
2. Add account {companyname} to the correct territory
3. Attach any existing documents or email threads to the opportunity
```
