# Dataverse Entity Schema and Relationships Reference

## Overview

Dataverse is the data platform underpinning Dynamics 365. This reference covers entity metadata structure, standard CRM entities, relationship types, the entity metadata REST API, custom entity creation, polymorphic lookups, and party list fields.

---

## Entity Metadata API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/api/data/v9.2/EntityDefinitions` | System Customizer or above | `$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute` | List all entities |
| GET | `/api/data/v9.2/EntityDefinitions(LogicalName='account')` | System Customizer | `$expand=Attributes` | Get entity with attributes |
| GET | `/api/data/v9.2/EntityDefinitions(LogicalName='lead')/Attributes` | System Customizer | `$select=LogicalName,DisplayName,AttributeType` | List entity attributes |
| GET | `/api/data/v9.2/EntityDefinitions(LogicalName='opportunity')/ManyToOneRelationships` | System Customizer | — | Get many-to-one relationships |
| GET | `/api/data/v9.2/EntityDefinitions(LogicalName='opportunity')/OneToManyRelationships` | System Customizer | — | Get one-to-many relationships |
| GET | `/api/data/v9.2/EntityDefinitions(LogicalName='lead')/ManyToManyRelationships` | System Customizer | — | Get many-to-many relationships |
| POST | `/api/data/v9.2/EntityDefinitions` | System Administrator | Body: EntityMetadata | Create a custom entity |
| PUT | `/api/data/v9.2/EntityDefinitions(LogicalName='prefix_entity')` | System Administrator | Body: partial EntityMetadata | Update entity metadata |
| POST | `/api/data/v9.2/EntityDefinitions(LogicalName='prefix_entity')/Attributes` | System Administrator | Body: AttributeMetadata | Add an attribute to an entity |

---

## Standard CRM Entities Quick Reference

| Entity (Logical Name) | Display Name | Primary Key | Entity Set Name | Notes |
|---|---|---|---|---|
| `lead` | Lead | `leadid` | `leads` | Unqualified prospect |
| `contact` | Contact | `contactid` | `contacts` | Individual person |
| `account` | Account | `accountid` | `accounts` | Company/organization |
| `opportunity` | Opportunity | `opportunityid` | `opportunities` | Sales deal |
| `quote` | Quote | `quoteid` | `quotes` | Formal price quote |
| `salesorder` | Order | `salesorderid` | `salesorders` | Confirmed purchase order |
| `invoice` | Invoice | `invoiceid` | `invoices` | Billing document |
| `incident` | Case | `incidentid` | `incidents` | Customer service case |
| `task` | Task | `activityid` | `tasks` | Follow-up task activity |
| `phonecall` | Phone Call | `activityid` | `phonecalls` | Phone call activity |
| `appointment` | Appointment | `activityid` | `appointments` | Calendar event |
| `email` | Email | `activityid` | `emails` | Email activity |
| `activitypointer` | Activity | `activityid` | `activitypointers` | Base activity type |
| `product` | Product | `productid` | `products` | Product catalog entry |
| `pricelevel` | Price List | `pricelevelid` | `pricelevels` | Price list |
| `productpricelevel` | Price List Item | `productpricelevelid` | `productpricelevels` | Product-price association |
| `queue` | Queue | `queueid` | `queues` | Work item routing queue |
| `queueitem` | Queue Item | `queueitemid` | `queueitems` | Item in a queue |
| `knowledgearticle` | Knowledge Article | `knowledgearticleid` | `knowledgearticles` | KB article |
| `systemuser` | User | `systemuserid` | `systemusers` | CRM user |
| `team` | Team | `teamid` | `teams` | CRM team |
| `businessunit` | Business Unit | `businessunitid` | `businessunits` | Organizational unit |
| `subject` | Subject | `subjectid` | `subjects` | Hierarchical category |
| `territory` | Territory | `territoryid` | `territories` | Sales territory |
| `competitor` | Competitor | `competitorid` | `competitors` | Competitor tracking |

---

## Relationship Types

### Many-to-One (N:1) — Lookup Fields

A lookup field on one entity references a single record of another entity.

```python
import requests

def get_entity_lookups(token: str, org_url: str, entity_logical_name: str) -> list[dict]:
    """Get all lookup (N:1) relationships for an entity."""
    url = (
        f"{org_url}/api/data/v9.2/EntityDefinitions(LogicalName='{entity_logical_name}')"
        f"/ManyToOneRelationships?$select=SchemaName,ReferencingAttribute,"
        f"ReferencedEntity,ReferencingEntityNavigationPropertyName"
    )
    headers = {"Authorization": f"Bearer {token}", "OData-Version": "4.0"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json().get("value", [])
```

**Common N:1 relationships:**

| Referencing Entity | Lookup Field | Referenced Entity | Navigation Property |
|---|---|---|---|
| `opportunity` | `_parentaccountid_value` | `account` | `parentaccountid` |
| `opportunity` | `_parentcontactid_value` | `contact` | `parentcontactid` |
| `incident` | `_customerid_value` | `account` or `contact` | `customerid_account`, `customerid_contact` |
| `lead` | `_ownerid_value` | `systemuser` or `team` | `ownerid` |
| `task` | `_regardingobjectid_value` | any activity-regarding entity | `regardingobjectid_*` |

### One-to-Many (1:N) — Related Records

```python
# Retrieve all contacts for an account (1:N navigation)
GET {org}/api/data/v9.2/accounts({accountId})/contact_customer_accounts?$select=fullname,emailaddress1

# Retrieve all cases for a contact
GET {org}/api/data/v9.2/contacts({contactId})/incident_customer_contacts?$select=title,ticketnumber,statecode
```

### Many-to-Many (N:N) — Intersect Entities

```python
# Connect two entities via intersect (example: opportunity competitors)
def associate_records(token: str, org_url: str, entity: str, record_id: str,
                       relationship: str, related_entity: str, related_id: str) -> None:
    url = f"{org_url}/api/data/v9.2/{entity}({record_id})/{relationship}/$ref"
    body = {
        "@odata.id": f"{org_url}/api/data/v9.2/{related_entity}({related_id})"
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
    }
    resp = requests.post(url, json=body, headers=headers)
    resp.raise_for_status()

# Remove N:N association
def disassociate_records(token: str, org_url: str, entity: str, record_id: str,
                          relationship: str, related_entity: str, related_id: str) -> None:
    url = f"{org_url}/api/data/v9.2/{entity}({record_id})/{relationship}({related_id})/$ref"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(url, headers=headers)
    resp.raise_for_status()
```

---

## Custom Entity Creation via API

```python
def create_custom_entity(token: str, org_url: str, publisher_prefix: str) -> str:
    """Create a new custom entity."""
    entity_metadata = {
        "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
        "SchemaName": f"{publisher_prefix}_ProjectTask",
        "DisplayName": {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            "LocalizedLabels": [
                {"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Project Task", "LanguageCode": 1033}
            ]
        },
        "DisplayCollectionName": {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            "LocalizedLabels": [
                {"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Project Tasks", "LanguageCode": 1033}
            ]
        },
        "Description": {
            "@odata.type": "Microsoft.Dynamics.CRM.Label",
            "LocalizedLabels": [
                {"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Tracks project tasks", "LanguageCode": 1033}
            ]
        },
        "OwnershipType": "UserOwned",
        "HasActivities": False,
        "HasNotes": True,
        "IsActivity": False,
        "PrimaryNameAttribute": f"{publisher_prefix}_name",
        "PrimaryAttribute": {
            "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
            "SchemaName": f"{publisher_prefix}_name",
            "RequiredLevel": {"Value": "ApplicationRequired"},
            "MaxLength": 200,
            "FormatName": {"Value": "Text"},
            "DisplayName": {
                "@odata.type": "Microsoft.Dynamics.CRM.Label",
                "LocalizedLabels": [
                    {"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Name", "LanguageCode": 1033}
                ]
            }
        }
    }

    url = f"{org_url}/api/data/v9.2/EntityDefinitions"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
    }
    resp = requests.post(url, json=entity_metadata, headers=headers)
    resp.raise_for_status()
    # Response header contains the new entity metadata ID
    return resp.headers.get("OData-EntityId", "")
```

---

## Attribute Types

| AttributeType | Usage | Example Schema |
|---|---|---|
| `StringAttributeMetadata` | Text fields | Name, description |
| `IntegerAttributeMetadata` | Whole numbers | Count, priority |
| `DecimalAttributeMetadata` | Decimal numbers | Amount |
| `MoneyAttributeMetadata` | Currency values | Revenue, deal value |
| `DateTimeAttributeMetadata` | Date and time | Close date, created on |
| `BooleanAttributeMetadata` | Yes/No toggle | Is Active |
| `PicklistAttributeMetadata` | Option set (single select) | Status, priority |
| `MultiSelectPicklistAttributeMetadata` | Multi-select option set | Tags |
| `LookupAttributeMetadata` | Reference to another entity | Account, Contact |
| `OwnerAttributeMetadata` | Owner (User or Team) | OwnerId |
| `StateAttributeMetadata` | State field (managed) | StateCode |
| `StatusAttributeMetadata` | Status field (managed) | StatusCode |
| `MemoAttributeMetadata` | Long text / multiline | Notes, description |
| `FileAttributeMetadata` | File attachment | Document |
| `ImageAttributeMetadata` | Image field | Profile photo |

---

## Polymorphic Lookups (Customer Field)

The `customerid` field on `incident` (Case) and `lead` can reference either an `account` or `contact`. This is a polymorphic lookup.

```python
def get_case_customer(token: str, org_url: str, incident_id: str) -> dict:
    """Retrieve the polymorphic customer field from a case."""
    url = (
        f"{org_url}/api/data/v9.2/incidents({incident_id})"
        f"?$select=title,customerid_account,customerid_contact"
        f"&$expand=customerid_account($select=name,accountnumber),"
        f"customerid_contact($select=fullname,emailaddress1)"
    )
    headers = {"Authorization": f"Bearer {token}", "OData-Version": "4.0"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    data = resp.json()

    if data.get("customerid_account"):
        return {"type": "account", "record": data["customerid_account"]}
    elif data.get("customerid_contact"):
        return {"type": "contact", "record": data["customerid_contact"]}
    return {"type": "unknown", "record": None}
```

---

## Party List Fields

Party list fields (e.g., `email.to`, `email.from`, `appointment.requiredattendees`) reference multiple entities of potentially different types.

```python
def get_email_parties(token: str, org_url: str, email_activity_id: str) -> dict:
    """Retrieve sender and recipients of an email activity."""
    url = (
        f"{org_url}/api/data/v9.2/emails({email_activity_id})"
        f"?$select=subject"
        f"&$expand=email_activity_parties($select=partyid_account,"
        f"partyid_contact,partyid_systemuser,participationtypemask)"
    )
    headers = {"Authorization": f"Bearer {token}", "OData-Version": "4.0"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()

# participationtypemask values:
# 1 = Sender, 2 = ToRecipient, 3 = CCRecipient, 4 = BCCRecipient
# 5 = RequiredAttendee, 6 = OptionalAttendee, 7 = Organizer
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `0x80040217` | Entity or attribute not found | Verify logical name; check entity is deployed in solution |
| `0x80048306` | Relationship not found | Verify relationship schema name |
| `0x80040220` | Duplicate entity schema name | Change the schema name prefix or delete the existing entity |
| `0x80040216` | Cannot create system entity | Only create custom (prefixed) entities |
| `0x8004F012` | Solution not found | Target solution must exist before importing entity metadata |
| `403 Forbidden` | Insufficient privilege | Assign System Customizer or Administrator security role |
| `0x80040265` | Entity has active forms/views | Cannot delete entity with active forms; remove forms first |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Custom entities per environment | 1,000 (default) | Contact Microsoft to increase |
| Attributes per entity | 1,000 | Includes system and custom attributes |
| Lookup depth in $expand | 5 levels | Avoid deep expands for performance |
| N:N intersect relationships per entity | No hard limit | Practical limit ~50 |
| String attribute MaxLength | 4,000 characters | Use Memo for longer text |
| Option set global values | 10,000 | Per global option set |
| Publisher prefixes | Must be 2–8 characters | Used for all custom entity schema names |
| Metadata API page size | 5,000 rows | Paginate using `$skip` for large attribute lists |
