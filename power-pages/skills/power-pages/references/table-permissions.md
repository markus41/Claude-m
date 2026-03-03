# Table Permissions Reference

## Overview

Table permissions (`adx_entitypermission`) are the security model for Power Pages. They control which Dataverse tables portal users can access and what CRUD operations they can perform, scoped by the relationship between the user's contact record and the target data. Every data interaction — entity lists, basic forms, web forms, OData endpoints, and FetchXML in Liquid — respects table permissions. Without a matching table permission, all data access is denied by default.

---

## Permission Record Structure

### adx_entitypermission Fields

| Field | Logical Name | Type | Description |
|---|---|---|---|
| Name | `adx_entityname` | String | Display name (e.g., "Case - Contact Scope") |
| Table Name | `adx_entitylogicalname` | String | Dataverse table logical name (e.g., `incident`) |
| Access Type (Scope) | `adx_scope` | Option Set | Controls which records are accessible |
| Read | `adx_read` | Boolean | Grant read access |
| Write | `adx_write` | Boolean | Grant update access |
| Create | `adx_create` | Boolean | Grant create access |
| Delete | `adx_delete` | Boolean | Grant delete access |
| Append | `adx_append` | Boolean | Grant append access (link to related records) |
| Append To | `adx_appendto` | Boolean | Grant append-to access |
| Website | `adx_websiteid` | Lookup | Parent website record |
| Parent Permission | `adx_parententitypermissionid` | Lookup | Parent permission for Parent/Child scopes |

### Create Table Permission

```json
POST /api/data/v9.2/adx_entitypermissions
{
  "adx_entityname": "Case",
  "adx_entitylogicalname": "incident",
  "adx_scope": 756150001,
  "adx_read": true,
  "adx_write": true,
  "adx_create": true,
  "adx_delete": false,
  "adx_append": true,
  "adx_appendto": true,
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

---

## Access Type (Scope) Values

| Scope Name | `adx_scope` Value | Description | When to Use |
|---|---|---|---|
| Global | `756150000` | All records in the table, regardless of ownership | Public content, admin panels |
| Contact | `756150001` | Records where a lookup column points to the current user's contact | User's own records (orders, cases, applications) |
| Account | `756150002` | Records where a lookup column points to an account that the user's contact belongs to | B2B portals (all records for the user's company) |
| Self | `756150003` | Only the contact record that IS the current user | Profile page — user edits their own contact record |
| Parent | `756150004` | Records related to a parent record that the user already has access to via another permission | Related records (case notes, order line items) |

### Scope Decision Matrix

| Scenario | Recommended Scope |
|---|---|
| Public knowledge base (anonymous read) | Global (Read only) on `Anonymous Users` web role |
| User views only their own support cases | Contact scope — `customerid` field links to contact |
| B2B partner views all orders for their company | Account scope — `customerid` or `accountid` links to account |
| User edits their own profile/contact record | Self scope |
| User views notes attached to their cases | Parent scope — parent permission = Case (Contact scope) |
| Admin views all records | Global scope on `Administrators` web role |

---

## Scope Configuration Details

### Contact Scope

Contact scope limits access to records where a specified lookup column on the target table points to the current user's contact record.

```json
{
  "adx_entitylogicalname": "incident",
  "adx_scope": 756150001,
  "adx_contactrelationshipname": "incident_customer_contacts",
  "adx_contactlogicalname": "contact",
  "adx_read": true
}
```

**`adx_contactrelationshipname`**: The relationship schema name between the table and the Contact table.
**`adx_contactlogicalname`**: The lookup column's target entity — almost always `contact`.

For the `incident` (case) table, the relevant relationship is through `customerid` pointing to a contact.

### Account Scope

Account scope grants access to records where the target table has a lookup to an account, and the current user's contact has that account as their parent account (`parentcustomerid`).

```json
{
  "adx_entitylogicalname": "salesorder",
  "adx_scope": 756150002,
  "adx_accountrelationshipname": "account_order",
  "adx_read": true,
  "adx_write": false,
  "adx_create": false
}
```

### Self Scope

Self scope is specifically for the Contact table — the user can only access their own contact record.

```json
{
  "adx_entitylogicalname": "contact",
  "adx_scope": 756150003,
  "adx_read": true,
  "adx_write": true,
  "adx_create": false,
  "adx_delete": false
}
```

### Parent Scope (Hierarchical Access)

Parent scope grants access to records that are related to a parent record already accessible via another permission. This is used for nested data structures (e.g., case notes are accessible because the parent case is accessible).

```json
// Parent permission: Case (Contact scope, Read+Write)
// Child permission: Annotation (notes) on Case — Parent scope

{
  "adx_entitylogicalname": "annotation",
  "adx_scope": 756150004,
  "adx_parententitypermissionid@odata.bind": "/adx_entitypermissions(<case-permission-id>)",
  "adx_parentrelationshipname": "Incident_Annotations",
  "adx_read": true,
  "adx_write": true,
  "adx_create": true,
  "adx_delete": false
}
```

---

## Privilege Combinations

| Privilege | `adx_*` Field | Required For |
|---|---|---|
| Read | `adx_read` | View records in entity lists, basic forms (Read Only mode), FetchXML in Liquid, OData GET |
| Write | `adx_write` | Edit existing records via basic forms or web form steps (Edit mode) |
| Create | `adx_create` | Create new records via basic forms or web form steps (Insert mode) |
| Delete | `adx_delete` | Delete records via entity list delete action |
| Append | `adx_append` | Associate this record with another record (e.g., add a contact to an account) |
| Append To | `adx_appendto` | Allow other records to be associated with this record |

### Common Permission Combinations

| Use Case | Read | Write | Create | Delete |
|---|---|---|---|---|
| Public content (read-only) | ✓ | | | |
| User views their own records | ✓ | | | |
| User submits and views their own records | ✓ | | ✓ | |
| User manages their own records | ✓ | ✓ | ✓ | |
| Admin full control | ✓ | ✓ | ✓ | ✓ |
| Profile page (self-service) | ✓ | ✓ | | |

---

## Web Role Assignment

Permissions are associated with web roles. Users in a web role inherit all permissions assigned to that role.

### Assign Permission to Web Role

```json
// Associate adx_entitypermission with adx_webrole via N:N relationship
POST /api/data/v9.2/adx_entitypermissions(<permission-id>)/adx_entitypermission_webrole/$ref
{
  "@odata.id": "/api/data/v9.2/adx_webroles(<webrole-id>)"
}
```

### Default Web Roles

| Web Role | Purpose | Automatically Assigned |
|---|---|---|
| `Anonymous Users` | All unauthenticated visitors | Yes — every non-signed-in visitor |
| `Authenticated Users` | All signed-in portal users | Yes — upon authentication |
| Custom roles | Business-specific roles (Partner, Customer, Admin) | Assigned manually or via Power Automate on registration |

### Assign User to Web Role (Power Automate)

```json
// On contact creation (new registration), assign to "Customer" web role
POST /api/data/v9.2/adx_webroles(<webrole-id>)/adx_webrole_contact/$ref
{
  "@odata.id": "/api/data/v9.2/contacts(<contact-id>)"
}
```

---

## Permission Inheritance

```
Global Permission (Read) on "Account"
├── Contact Permission (Read, Write, Create) on "Case"  — customerid = contact
│   └── Parent Permission (Read, Write, Create) on "Annotation"  — case → annotation
│       └── Grants access to notes on cases the contact owns
└── Account Permission (Read) on "Invoice"  — accountid = user's account
```

Rules:
1. A user's effective permissions are the **union** of permissions from all web roles they belong to.
2. Permissions are **additive** — multiple permissions on the same table grant combined privileges.
3. There is no permission **deny** — you cannot subtract privileges.
4. If no permission matches, access is **denied** by default.

---

## OData Endpoint and Permission Enforcement

The `/_odata/` endpoint enforces the same table permission rules as forms and entity lists.

```javascript
// Anonymous user — only gets records covered by "Anonymous Users" role permissions
// Authenticated user — gets records from "Authenticated Users" + custom role permissions

// If a Contact scope permission exists for "incident", anonymous users will not get results
// (they have no contact record) and authenticated users will only get their own cases

fetch('/_odata/incidents?$select=incidentid,title')
  .then(r => r.json())
  .then(data => {
    // data.value contains only records the current user has Read permission for
  });
```

---

## Debugging Table Permissions

### Enable Permission Errors in Development

Add the site setting `Site/EnableCustomPluginError = true` to surface permission errors in page output during development.

### Check Permission via Liquid

```liquid
<!-- Test if the user has any permissions on a table -->
{% assign test_perms = 'incident' | entity_permissions %}
{% if test_perms.can_read %}
  <p>You have read access to Cases.</p>
{% else %}
  <p>You do not have access to Cases.</p>
{% endif %}

{% if test_perms.can_create %}
  <a href="/submit-case">Submit New Case</a>
{% endif %}
```

### Query Active Permissions

```json
GET /api/data/v9.2/adx_entitypermissions
    ?$filter=adx_entitylogicalname eq 'incident'
    &$expand=adx_entitypermission_webrole($select=adx_name)
    &$select=adx_entityname,adx_scope,adx_read,adx_write,adx_create,adx_delete
```

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| Entity list shows no records | No Read permission for user's web role + scope | Add/verify entity permission with Read, correct scope, linked to appropriate web role |
| Form submit returns 403 | No Create permission for the target table | Add Create privilege to matching permission record |
| Form edit blocked | No Write permission | Add Write privilege; verify user's contact is the record's owner (for Contact scope) |
| Parent scope records not accessible | Parent permission not configured or relationship name wrong | Verify `adx_parentrelationshipname` matches the Dataverse relationship schema name |
| Anonymous user cannot read public content | Permission not assigned to `Anonymous Users` web role | Associate the Global Read permission with the `Anonymous Users` web role |
| Authenticated user missing permissions | User not in required web role | Verify contact is in web role via `adx_webrole_contact` relationship |
| Permission granted but OData still returns 403 | Permission not published / cache not cleared | Republish the site; clear server cache via Portal Management app |
| Account scope shows wrong records | Contact's `parentcustomerid` points to wrong account | Verify contact record's `parentcustomerid` lookup in Dataverse |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Table permissions per website | No hard limit | Hundreds of permissions is normal for complex portals |
| Web roles per website | No hard limit | Practical: keep under 20 for manageability |
| Web roles per contact | No hard limit | Additive permissions are computed at runtime |
| Scope depth (Parent chain) | 3 levels | Parent of parent — limited to 3 levels deep |
| Global permissions (anonymous read) | No hard limit | Each requires careful review — any anonymous read is public data |
