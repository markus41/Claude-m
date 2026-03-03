# Dataverse Integration Reference

## Overview

This reference covers Dataverse Web API authentication (OAuth2 and service principals), bulk operations via `$batch`, change tracking, audit log API, calculated and rollup fields, virtual tables, elastic tables, and Dataverse Link for Microsoft Fabric.

---

## Authentication

### OAuth2 with Service Principal (Client Credentials)

```python
import requests
from azure.identity import ClientSecretCredential

def get_dataverse_token(tenant_id: str, client_id: str, client_secret: str, org_url: str) -> str:
    """Get an access token for Dataverse using a service principal."""
    credential = ClientSecretCredential(tenant_id, client_id, client_secret)
    # Dataverse resource is the org URL without trailing slash
    resource = org_url.rstrip("/")
    token = credential.get_token(f"{resource}/.default")
    return token.token


def get_dataverse_token_direct(
    tenant_id: str, client_id: str, client_secret: str, org_url: str
) -> str:
    """Get Dataverse token directly via HTTP (no Azure SDK dependency)."""
    resource = org_url.rstrip("/")
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    resp = requests.post(token_url, data={
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": f"{resource}/.default",
    })
    resp.raise_for_status()
    return resp.json()["access_token"]
```

### Required App Registration Configuration

```
1. Register app in Azure AD
2. In Dataverse admin center (Power Platform Admin Center):
   - Environment > Settings > Users + Permissions > Application Users
   - New app user → Select the registered app → Assign Security Role

3. Required permissions (for programmatic access):
   - Dataverse: user_impersonation (delegated) OR
   - No Azure AD API permissions needed for Client Credentials if app user is configured in Dataverse
```

---

## Standard CRUD Operations

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/api/data/v9.2/{entitySet}({id})` | Read privilege | `$select`, `$expand` | Get a single record |
| GET | `/api/data/v9.2/{entitySet}` | Read privilege | `$filter`, `$select`, `$top`, `$orderby` | Query records |
| POST | `/api/data/v9.2/{entitySet}` | Create privilege | Body: entity fields | Create; returns 204 with `OData-EntityId` header |
| PATCH | `/api/data/v9.2/{entitySet}({id})` | Write privilege | Body: fields to update | Partial update |
| PUT | `/api/data/v9.2/{entitySet}({id})/{field}` | Write privilege | Body: value | Update a single field |
| DELETE | `/api/data/v9.2/{entitySet}({id})` | Delete privilege | — | Permanent delete |
| POST | `/api/data/v9.2/{entitySet}({id})/{field}/$ref` | Associate privilege | Body: `@odata.id` | Associate N:N |
| DELETE | `/api/data/v9.2/{entitySet}({id})/{field}({relatedId})/$ref` | Associate privilege | — | Disassociate N:N |

---

## Bulk Operations via $batch

The OData `$batch` endpoint allows combining multiple requests into a single HTTP call. Each batch can include up to 1,000 requests.

```python
import uuid

def batch_upsert_contacts(token: str, org_url: str, contacts: list[dict]) -> dict:
    """Upsert contacts in a single $batch request (max 1,000 per batch)."""
    boundary = f"batch_{uuid.uuid4().hex}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/mixed; boundary={boundary}",
        "OData-Version": "4.0",
    }

    parts = []
    for contact in contacts[:1000]:
        contact_id = contact.pop("contactid", None)
        if contact_id:
            method = "PATCH"
            url = f"{org_url}/api/data/v9.2/contacts({contact_id})"
        else:
            method = "POST"
            url = f"{org_url}/api/data/v9.2/contacts"

        import json
        part = (
            f"--{boundary}\r\n"
            f"Content-Type: application/http\r\n"
            f"Content-Transfer-Encoding: binary\r\n\r\n"
            f"{method} {url} HTTP/1.1\r\n"
            f"Content-Type: application/json\r\n"
            f"OData-Version: 4.0\r\n\r\n"
            f"{json.dumps(contact)}\r\n"
        )
        parts.append(part)

    body = "".join(parts) + f"--{boundary}--"

    resp = requests.post(
        f"{org_url}/api/data/v9.2/$batch",
        data=body.encode("utf-8"),
        headers=headers
    )
    resp.raise_for_status()

    # Parse response parts
    response_boundary = resp.headers.get("Content-Type", "").split("boundary=")[-1]
    return {
        "status_code": resp.status_code,
        "batch_boundary": response_boundary,
        "raw_response": resp.text[:2000],  # Truncate for logging
    }
```

---

## Change Tracking

Change tracking allows efficient incremental synchronization by returning only modified records since the last sync.

```python
def get_changes_since_delta(
    token: str, org_url: str, entity_set: str, delta_token: str | None = None
) -> tuple[list[dict], str]:
    """
    Get changes since the last delta token.
    First call: delta_token=None → returns all records + new delta token
    Subsequent calls: pass the returned delta_token
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "OData-Version": "4.0",
        "Prefer": "odata.track-changes,odata.maxpagesize=5000",
    }

    if delta_token:
        url = delta_token  # The delta link IS the next URL
    else:
        url = (
            f"{org_url}/api/data/v9.2/{entity_set}"
            f"?$select=contactid,fullname,emailaddress1,modifiedon"
        )

    changes = []
    next_delta_token = None

    while url:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        changes.extend(data.get("value", []))

        if "@odata.nextLink" in data:
            url = data["@odata.nextLink"]
        elif "@odata.deltaLink" in data:
            next_delta_token = data["@odata.deltaLink"]
            url = None
        else:
            url = None

    return changes, next_delta_token or ""
```

**Deleted record detection:**
Records deleted since the last delta token appear with `@removed: { "reason": "deleted" }` in the response payload. Filter these out in the consumer.

---

## Audit Log API

```python
def query_audit_log(
    token: str, org_url: str, entity_logical_name: str, record_id: str
) -> list[dict]:
    """Get audit history for a specific record."""
    url = (
        f"{org_url}/api/data/v9.2/audits"
        f"?$filter=objectid eq {record_id}"
        f"&$select=createdon,action,operation,userid,attributemask"
        f"&$orderby=createdon desc"
        f"&$top=100"
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "OData-Version": "4.0",
    }
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json().get("value", [])

# Audit action codes:
# 1=Create, 2=Update, 4=Delete, 64=ReadAccess, 100=UserAccessChange
# Operation codes: 1=Create, 2=Update, 3=Delete, 4=Access
```

**Enable auditing on an entity:**
```python
def enable_entity_auditing(token: str, org_url: str, entity_logical_name: str) -> None:
    """Enable audit logging for a Dataverse entity."""
    url = f"{org_url}/api/data/v9.2/EntityDefinitions(LogicalName='{entity_logical_name}')"
    body = {"IsAuditEnabled": True}
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
    }
    resp = requests.patch(url, json=body, headers=headers)
    resp.raise_for_status()
```

---

## Calculated and Rollup Fields

### Calculated Fields

Calculated fields compute values from other fields on the same record using a formula. They are updated automatically.

```python
def get_calculated_field_value(token: str, org_url: str, entity_set: str, record_id: str, field_name: str) -> object:
    """Retrieve a calculated field value (forces recalculation if needed)."""
    url = f"{org_url}/api/data/v9.2/{entity_set}({record_id})?$select={field_name}"
    headers = {
        "Authorization": f"Bearer {token}",
        "OData-Version": "4.0",
    }
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json().get(field_name)
```

### Rollup Fields (Force Recalculation)

Rollup fields aggregate related records (e.g., total deal value for an account). They update on a schedule but can be forced:

```python
def recalculate_rollup_field(token: str, org_url: str, entity_logical_name: str, record_id: str, field_name: str) -> None:
    """Force recalculation of a rollup field."""
    url = f"{org_url}/api/data/v9.2/CalculateRollupField"
    body = {
        "Target": {
            "@odata.type": f"Microsoft.Dynamics.CRM.{entity_logical_name}",
            f"{entity_logical_name}id": record_id,
        },
        "FieldName": field_name,
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
    }
    resp = requests.post(url, json=body, headers=headers)
    resp.raise_for_status()
```

---

## Virtual Tables

Virtual tables expose external data as if it were native Dataverse tables. Queries are translated to custom provider calls.

```python
# Virtual table rows come from an external data provider plugin
# Query virtual table just like a regular entity
def query_virtual_table(token: str, org_url: str, virtual_entity_set: str) -> list[dict]:
    url = (
        f"{org_url}/api/data/v9.2/{virtual_entity_set}"
        f"?$select=name,externalid,status"
        f"&$top=100"
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "OData-Version": "4.0",
    }
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json().get("value", [])

# Virtual table connector (modern) — no-code configuration via
# Power Platform admin center > Virtual Tables > New connector
```

---

## Elastic Tables (Cosmos DB Backend)

Elastic tables store data in Azure Cosmos DB for high-volume, low-latency scenarios (millions of rows).

```python
# Elastic tables are queried the same way as standard tables
# Key differences:
# - No support for cross-entity joins (no $expand to other entities)
# - Partition key must be included in queries for performance
# - Time-to-live (TTL) can be set per record

def create_elastic_table_record(token: str, org_url: str, entity_set: str, record: dict, partition_key: str) -> str:
    """Create a record in an elastic table."""
    url = f"{org_url}/api/data/v9.2/{entity_set}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
        # Partition key header for elastic tables
        "partitionid": partition_key,
    }
    resp = requests.post(url, json=record, headers=headers)
    resp.raise_for_status()
    entity_id_url = resp.headers.get("OData-EntityId", "")
    return entity_id_url.split("(")[-1].rstrip(")")
```

---

## Dataverse Link for Microsoft Fabric

Dataverse Link replicates Dataverse data to a Fabric Lakehouse (OneLake) in near-real-time using Delta Lake format.

```python
# Dataverse Link configuration is done in Power Platform admin center
# Data is available at:
# OneLake path: abfss://workspace@onelake.dfs.fabric.microsoft.com/lakehouse/Tables/{entity_name}

# Reading linked Dataverse data in Fabric via Spark (PySpark)
from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()

# Read opportunity data from Dataverse Link
df = spark.read.format("delta").load(
    "abfss://myworkspace@onelake.dfs.fabric.microsoft.com/dataverse-lakehouse/Tables/opportunity"
)

df.createOrReplaceTempView("opportunities")

# Analyze with SQL
result = spark.sql("""
    SELECT
        estimatedvalue,
        statecode,
        COUNT(*) AS count,
        SUM(estimatedvalue) AS total_value
    FROM opportunities
    WHERE statecode = 0
    GROUP BY estimatedvalue, statecode
    ORDER BY total_value DESC
    LIMIT 20
""")

result.show()
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `0x80040220` | Duplicate record detected | Check duplicate detection rules; pass `MSCRM.SuppressDuplicateDetection: true` header if intentional |
| `0x8004431A` | Record not found | Verify GUID and entity set name |
| `0x80040265` | Privilege check failed | Assign appropriate security role to the service principal's app user |
| `0x8006088` | Throttle — too many requests | Implement exponential backoff; check `Retry-After` header |
| `0x80040203` | Column not in ColumnSet | Use `$select` or `ColumnSet("field1","field2")` |
| `$batch` `400` | Malformed batch body | Check CRLF line endings; verify boundary format |
| `deltaLink` missing | Change tracking not enabled on entity | Enable change tracking in entity settings |
| Audit log `404` | Audit not enabled | Enable audit at org level AND entity level |
| Virtual table `500` | Custom provider plugin failed | Check plugin trace log; verify external data source availability |
| Elastic table `429` | Cosmos DB throttling | Add partition key; reduce write frequency |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| `$batch` requests per batch | 1,000 | Split larger operations across multiple batches |
| `$batch` response size | 100 MB | Each sub-response counts |
| Change tracking delta token validity | 90 days | After 90 days, must start fresh sync |
| Audit log retention | 30 days (default) | Configurable up to 7 years with add-on |
| Rollup field recalculation frequency | Every 12 hours (scheduled) | Use `CalculateRollupField` for on-demand |
| Virtual table row limit | 50,000 per query | External data source limits apply |
| Elastic table row count | Billions (Cosmos DB backed) | No Dataverse row limit |
| Elastic table TTL | Per-record; configurable in days | Expired records are automatically deleted |
| Dataverse Link replication lag | Near-real-time (~5 min) | Not suited for sub-second latency use cases |
| API concurrency per user | 6 requests | Organization-level throttling applies |
| Total Dataverse storage (default) | 10 GB + 2 GB/user license | Add storage packs as needed |
