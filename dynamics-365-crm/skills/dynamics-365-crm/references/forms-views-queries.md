# Forms, Views, and Queries Reference — Dynamics 365 / Dataverse

## Overview

This reference covers FetchXML and OData query syntax for Dataverse, view and saved query retrieval, form XML structure, and form component patterns. Use this when querying CRM data programmatically or when reading/modifying form definitions.

---

## OData Query Syntax (Dataverse Web API)

### Basic Query Operations

```python
import requests

BASE = "https://myorg.crm.dynamics.com/api/data/v9.2"

def query(token: str, entity_set: str, params: dict) -> list[dict]:
    """Execute an OData query against Dataverse."""
    headers = {
        "Authorization": f"Bearer {token}",
        "OData-Version": "4.0",
        "Prefer": "odata.maxpagesize=5000",  # Request large pages
    }
    results = []
    url = f"{BASE}/{entity_set}"

    # Build query string
    qs_parts = []
    if "$select" in params:
        qs_parts.append(f"$select={params['$select']}")
    if "$filter" in params:
        qs_parts.append(f"$filter={params['$filter']}")
    if "$expand" in params:
        qs_parts.append(f"$expand={params['$expand']}")
    if "$orderby" in params:
        qs_parts.append(f"$orderby={params['$orderby']}")
    if "$top" in params:
        qs_parts.append(f"$top={params['$top']}")
    if qs_parts:
        url += "?" + "&".join(qs_parts)

    while url:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        results.extend(data.get("value", []))
        url = data.get("@odata.nextLink")

    return results
```

### OData Filter Operators

| Operator | Syntax Example | Notes |
|---|---|---|
| Equals | `$filter=statecode eq 0` | Use numeric value for option sets |
| Not equals | `$filter=statecode ne 1` | |
| Greater than | `$filter=estimatedvalue gt 10000` | |
| Less than | `$filter=createdon lt 2026-01-01` | Date as ISO string without quotes |
| Contains | `$filter=contains(name,'Contoso')` | Case-insensitive in Dataverse |
| Starts with | `$filter=startswith(emailaddress1,'support')` | |
| Ends with | `$filter=endswith(name,'Inc')` | |
| In (any of) | `$filter=Microsoft.Dynamics.CRM.In(PropertyName='statuscode',PropertyValues=['1','2'])` | Use CRM function |
| Null check | `$filter=_parentaccountid_value eq null` | Lookup field null check |
| Not null | `$filter=_parentaccountid_value ne null` | |
| And | `$filter=statecode eq 0 and prioritycode eq 1` | |
| Or | `$filter=prioritycode eq 1 or prioritycode eq 2` | |
| Date relative | `$filter=createdon ge 2026-01-01T00:00:00Z` | Always use UTC |

### $expand Pattern

```python
# Expand related entity data
url = (
    f"{BASE}/opportunities?"
    f"$select=name,estimatedvalue,closedate,statecode"
    f"&$expand=parentaccountid($select=name,accountnumber),"
    f"parentcontactid($select=fullname,emailaddress1),"
    f"opportunity_product_association($select=quantity,priceperunit)"
    f"&$filter=statecode eq 0"
    f"&$orderby=closedate asc"
    f"&$top=100"
)
```

### Aggregate Queries

```python
# Count records
resp = requests.get(
    f"{BASE}/opportunities/$count?$filter=statecode eq 0",
    headers={**HEADERS, "Prefer": "odata.include-annotations=OData.Community.Display.V1.FormattedValue"}
)
count = resp.json()  # Returns an integer

# Aggregate via fetchXml in OData
agg_url = (
    f"{BASE}/opportunities?"
    f"$apply=filter(statecode eq 0)/aggregate(estimatedvalue with sum as total_value,"
    f"opportunityid with countdistinct as opportunity_count)"
)
```

---

## FetchXML Syntax Reference

FetchXML is the primary query language for Dataverse. It supports joins, grouping, aggregation, and conditional formatting.

### Basic FetchXML Query

```xml
<fetch mapping="logical" count="50" page="1" returntotalrecordcount="true">
  <entity name="opportunity">
    <attribute name="name"/>
    <attribute name="estimatedvalue"/>
    <attribute name="closedate"/>
    <attribute name="statecode"/>
    <attribute name="statuscode"/>
    <attribute name="ownerid"/>
    <filter type="and">
      <condition attribute="statecode" operator="eq" value="0"/>
      <condition attribute="estimatedvalue" operator="gt" value="10000"/>
      <condition attribute="closedate" operator="this-fiscal-year"/>
    </filter>
    <order attribute="closedate" descending="false"/>
  </entity>
</fetch>
```

### FetchXML with Link-Entity (JOIN)

```xml
<fetch>
  <entity name="opportunity">
    <attribute name="name"/>
    <attribute name="estimatedvalue"/>
    <link-entity name="account" from="accountid" to="parentaccountid" link-type="inner" alias="acct">
      <attribute name="name" alias="account_name"/>
      <attribute name="accountnumber"/>
      <filter>
        <condition attribute="statecode" operator="eq" value="0"/>
      </filter>
    </link-entity>
    <link-entity name="systemuser" from="systemuserid" to="owninguser" link-type="outer" alias="owner">
      <attribute name="fullname" alias="owner_name"/>
    </link-entity>
  </entity>
</fetch>
```

### FetchXML Aggregate Query

```xml
<fetch aggregate="true">
  <entity name="opportunity">
    <attribute name="estimatedvalue" aggregate="sum" alias="total_value"/>
    <attribute name="estimatedvalue" aggregate="avg" alias="avg_value"/>
    <attribute name="opportunityid" aggregate="count" alias="opp_count"/>
    <attribute name="ownerid" groupby="true" alias="owner_id"/>
    <filter>
      <condition attribute="statecode" operator="eq" value="0"/>
    </filter>
    <order alias="total_value" descending="true"/>
  </entity>
</fetch>
```

### FetchXML Condition Operators

| Operator | Meaning |
|---|---|
| `eq` | Equals |
| `ne` | Not equal |
| `gt`, `lt`, `ge`, `le` | Greater/less than (or equal) |
| `like` | Pattern match (use `%` wildcard) |
| `not-like` | Inverse pattern |
| `in` | Value in list: `<value>1</value><value>2</value>` |
| `not-in` | Not in list |
| `null` | Is null |
| `not-null` | Is not null |
| `eq-userid` | Equals current user ID |
| `eq-userteams` | In current user's teams |
| `eq-useroruserteams` | User or teams |
| `today` | Date is today |
| `this-week` | Date is this week |
| `this-month` | Date is this month |
| `this-year` | Date is this year |
| `this-fiscal-year` | Date is this fiscal year |
| `last-x-days` | Within last N days: `<condition attribute="createdon" operator="last-x-days" value="30"/>` |
| `next-x-days` | Within next N days |
| `between` | Between two values: `<value>10</value><value>100</value>` |

### Executing FetchXML via Web API

```python
import urllib.parse

def execute_fetchxml(token: str, org_url: str, fetch_xml: str) -> list[dict]:
    """Execute a FetchXML query using the Dataverse Web API."""
    entity_name = _extract_entity_name(fetch_xml)  # Parse from XML
    encoded = urllib.parse.quote(fetch_xml)

    headers = {
        "Authorization": f"Bearer {token}",
        "OData-Version": "4.0",
        "Prefer": "odata.maxpagesize=5000",
    }

    all_records = []
    url = f"{org_url}/api/data/v9.2/{entity_name}?fetchXml={encoded}"

    while url:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        all_records.extend(data.get("value", []))
        url = data.get("@odata.nextLink")

    return all_records


def _extract_entity_name(fetch_xml: str) -> str:
    """Extract the entity set name from FetchXML."""
    import xml.etree.ElementTree as ET
    root = ET.fromstring(fetch_xml)
    entity = root.find(".//entity")
    if entity is None:
        raise ValueError("No entity element found in FetchXML")
    logical_name = entity.get("name", "")
    # Map logical name to entity set name (typically logical_name + 's')
    # For known entities, use the correct pluralization
    entity_set_map = {
        "opportunity": "opportunities",
        "lead": "leads",
        "contact": "contacts",
        "account": "accounts",
        "incident": "incidents",
        "systemuser": "systemusers",
    }
    return entity_set_map.get(logical_name, f"{logical_name}s")
```

---

## Saved Queries (System Views) API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/api/data/v9.2/savedqueries` | System Customizer | `$filter=returnedtypecode eq 'opportunity'` | List views for an entity |
| GET | `/api/data/v9.2/savedqueries({viewId})` | System Customizer | `$select=name,fetchxml,layoutxml` | Get view definition |
| POST | `/api/data/v9.2/savedqueries` | System Administrator | Body: view metadata | Create a system view |
| PATCH | `/api/data/v9.2/savedqueries({viewId})` | System Administrator | Body: updated fields | Update view |
| GET | `/api/data/v9.2/userqueries` | Any user | `$filter=returnedtypecode eq 'account'` | List personal views |

```python
def get_views_for_entity(token: str, org_url: str, entity_type_code: int) -> list[dict]:
    """Get all system views for an entity."""
    url = (
        f"{org_url}/api/data/v9.2/savedqueries"
        f"?$select=name,savedqueryid,fetchxml,querytype"
        f"&$filter=returnedtypecode eq {entity_type_code} and statecode eq 0"
        f"&$orderby=name asc"
    )
    headers = {"Authorization": f"Bearer {token}", "OData-Version": "4.0"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json().get("value", [])

# Common entity type codes:
# 1=Account, 2=Contact, 3=Opportunity, 4=Lead, 5=Activity, 112=Incident
```

---

## Form XML Structure

Forms in Dataverse are defined as XML. Use the metadata API to retrieve or update form definitions.

```python
def get_entity_forms(token: str, org_url: str, entity_logical_name: str) -> list[dict]:
    """Retrieve all forms for an entity."""
    url = (
        f"{org_url}/api/data/v9.2/systemforms"
        f"?$select=name,formid,type,formxml"
        f"&$filter=objecttypecode eq '{entity_logical_name}' and statecode eq 0"
    )
    headers = {"Authorization": f"Bearer {token}", "OData-Version": "4.0"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json().get("value", [])
```

### Form XML Anatomy

```xml
<form>
  <tabs>
    <tab name="general" id="{guid}" expanded="true" locklevel="0">
      <labels>
        <label description="General" languagecode="1033"/>
      </labels>
      <columns>
        <column width="100%">
          <sections>
            <section name="account_information" id="{guid}">
              <labels>
                <label description="Account Information" languagecode="1033"/>
              </labels>
              <rows>
                <row>
                  <cell id="{guid}" showlabel="true" locklevel="0">
                    <labels>
                      <label description="Account Name" languagecode="1033"/>
                    </labels>
                    <control id="name" classid="{text-control-guid}" datafieldname="name" disabled="false">
                      <parameters>
                        <MaxLength>160</MaxLength>
                        <Format>Text</Format>
                      </parameters>
                    </control>
                  </cell>
                </row>
                <row>
                  <cell id="{guid}">
                    <control id="primarycontactid" classid="{lookup-control-guid}" datafieldname="primarycontactid">
                      <parameters>
                        <TargetEntityType>contact</TargetEntityType>
                      </parameters>
                    </control>
                  </cell>
                </row>
              </rows>
            </section>
          </sections>
        </column>
      </columns>
    </tab>
  </tabs>
  <formLibraries>
    <Library name="account_main_system_library" libraryUniqueId="{guid}"/>
  </formLibraries>
  <events>
    <event name="onload" application="false" active="false">
      <handlers>
        <handler functionName="Account.Form.onLoad" libraryName="account_main_system_library" handlerUniqueId="{guid}" enabled="true" passExecutionContext="true"/>
      </handlers>
    </event>
    <event name="onsave" application="false" active="false">
      <handlers>
        <handler functionName="Account.Form.onSave" libraryName="account_main_system_library" handlerUniqueId="{guid}" enabled="true" passExecutionContext="true"/>
      </handlers>
    </event>
  </events>
</form>
```

---

## QueryExpression (SDK) vs FetchXML vs OData

| Approach | Use Case | Language |
|---|---|---|
| OData with `$filter` | REST API queries from external systems | Any HTTP client |
| FetchXML | Complex joins, aggregation, fiscal date filters | XML (any client via fetchXml param) |
| QueryExpression | Server-side plugin or SDK code | C# / .NET |
| LINQ (CRM SDK) | Strongly-typed queries in .NET | C# |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `0x80041103` | Invalid FetchXML | Validate XML structure; check attribute logical names |
| `0x80048d19` | OData `$filter` not supported on attribute | Some attributes not filterable; use FetchXML |
| `0x80040268` | No privilege for querying entity | Grant Read privilege on security role |
| `0x8004E01C` | Aggregate query returns too many groups | Add `count` limit to fetch; reduce group-by cardinality |
| `0x80060888` | Too many requests (throttle) | Implement retry with backoff; reduce query frequency |
| `TooManyRecordsFound` | Count exceeds 50,000 for single non-paged query | Add pagination: `page` and `count` attributes in FetchXML |
| `aggregateQueryRecordLimit` | Aggregate query exceeds 50,000 source records | Filter more aggressively before aggregating |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| OData page size max | 5,000 | Set via `Prefer: odata.maxpagesize=5000` |
| FetchXML page count | 50 (default) | Override with `count` attribute; paginate with `page` |
| Aggregate result row limit | 50,000 source records | Pre-filter to stay under limit |
| `$expand` depth | 5 levels | Deeper expands may time out |
| Query timeout | 120 seconds | Break complex queries into smaller batches |
| Concurrent API calls | 6 per user | Throttled at organization level; varies by plan |
| FetchXML link-entity depth | 10 levels | Practical limit is 3–4 for performance |
| View count per entity | No hard limit | > 100 views degrades form performance |
| Saved query fetchXml size | 1 MB | Very long FetchXML should be split |
