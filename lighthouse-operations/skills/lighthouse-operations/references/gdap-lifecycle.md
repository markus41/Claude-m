# GDAP Lifecycle — Create, Approve, Assign Roles, Monitor, Renew

## GDAP Overview

Granular Delegated Admin Privileges (GDAP) replaces legacy Delegated Admin Privileges (DAP)
for CSP/MSP partner access to customer M365 tenants. GDAP requires explicit role selection
(least privilege) and has configurable duration and auto-extend.

### GDAP vs. DAP

| Feature | DAP (Legacy) | GDAP |
|---------|-------------|------|
| Roles | Global Admin equivalent | Specific roles per relationship |
| Duration | Indefinite | 1 day to 730 days |
| Auto-extend | Not supported | Up to 180 days |
| Expiry alerts | None | Automatic alerts via Lighthouse |
| Customer visibility | Limited | Full visibility in admin portal |
| Microsoft requirement | Being deprecated | Required for new relationships |

---

## Step 1: Create GDAP Relationship

```
POST https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships
Content-Type: application/json
Authorization: Bearer {partner-tenant-token}
```

### Request Body

```json
{
  "displayName": "Contoso MSP — Full Administration",
  "duration": "P730D",
  "autoExtendDuration": "P180D",
  "customer": {
    "tenantId": "<customer-tenant-id>"
  },
  "accessDetails": {
    "unifiedRoles": [
      { "roleDefinitionId": "62e90394-69f5-4237-9190-012177145e10" },
      { "roleDefinitionId": "5d6b6bb7-de71-4623-b4af-96380a352509" },
      { "roleDefinitionId": "f2ef992c-3afb-46b9-b7cf-a126ee74c451" },
      { "roleDefinitionId": "fe930be7-5e62-47db-91af-98c3a49a38b1" },
      { "roleDefinitionId": "194ae4cb-b126-40b2-bd5b-6091b380977d" },
      { "roleDefinitionId": "9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3" },
      { "roleDefinitionId": "29232cdf-9323-42fd-ade2-1d097af3e4de" }
    ]
  }
}
```

### Recommended GDAP Roles for MSP

| Role | Role Definition ID | Purpose |
|------|-------------------|---------|
| Global Administrator | `62e90394-69f5-4237-9190-012177145e10` | Full admin (use sparingly) |
| Security Administrator | `194ae4cb-b126-40b2-bd5b-6091b380977d` | Security settings |
| Security Reader | `5d6b6bb7-de71-4623-b4af-96380a352509` | Read security data |
| Global Reader | `f2ef992c-3afb-46b9-b7cf-a126ee74c451` | Read-only all config |
| User Administrator | `fe930be7-5e62-47db-91af-98c3a49a38b1` | User lifecycle |
| Helpdesk Administrator | `729827e3-9c14-49f7-bb1b-9608f156bbb8` | Password reset |
| Exchange Administrator | `29232cdf-9323-42fd-ade2-1d097af3e4de` | Exchange config |
| SharePoint Administrator | `f28a1f50-f6e7-4571-818b-6a12f2af6b6c` | SharePoint config |
| Teams Administrator | `69091246-20e8-4a56-aa4d-066075b2a7a8` | Teams config |
| Intune Administrator | `3a2c62db-5318-420d-8d74-23affee5d9d5` | Device management |
| Application Administrator | `9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3` | App registrations |
| Billing Administrator | `b0f54661-2d74-4c50-afa3-1ec803f12efe` | License management |
| Reports Reader | `4a5d8f65-41da-4de4-8968-e035b65339cf` | Usage reports |
| Authentication Administrator | `c4e39bd9-1100-46d3-8c65-fb160da0071f` | Auth methods |

---

## Step 2: Generate Customer Approval Link

After creating the relationship, provide the customer with an approval URL:

```
https://admin.microsoft.com/AdminPortal/Home#/partners/invitation/granularAdminRelationships/{relationship-id}
```

The customer's Global Administrator must approve in the Microsoft 365 admin center.
After approval, the relationship status transitions from `approvalPending` to `active`.

### Check Approval Status

```
GET https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships/{id}
?$select=id,displayName,status,customer,endDateTime,autoExtendDuration
```

---

## Step 3: Create Access Assignments

Once `active`, assign partner security groups to specific roles:

```
POST https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships/{id}/accessAssignments
```

### Request Body

```json
{
  "accessContainer": {
    "accessContainerId": "<partner-security-group-object-id>",
    "accessContainerType": "securityGroup"
  },
  "accessDetails": {
    "unifiedRoles": [
      { "roleDefinitionId": "194ae4cb-b126-40b2-bd5b-6091b380977d" },
      { "roleDefinitionId": "5d6b6bb7-de71-4623-b4af-96380a352509" }
    ]
  }
}
```

### Recommended Group Structure

| Partner Security Group | Roles Assigned |
|----------------------|----------------|
| MSP-Tier1-Support | Helpdesk Admin, User Admin |
| MSP-Security-Team | Security Admin, Security Reader |
| MSP-Exchange-Team | Exchange Admin, Global Reader |
| MSP-Admins | Global Admin (for break-glass scenarios) |
| MSP-Billing | Billing Admin, Reports Reader |
| MSP-DevOps | Application Admin |

---

## Step 4: List and Monitor Relationships

### List All Active Relationships

```
GET https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships
?$filter=status eq 'active'
&$select=id,displayName,customer,status,duration,autoExtendDuration,endDateTime
&$orderby=endDateTime asc
```

### Relationships Expiring in 30 Days

```
GET https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships
?$filter=status eq 'active' and endDateTime lt {date-30-days-from-now}
&$orderby=endDateTime asc
&$select=id,displayName,customer,endDateTime,autoExtendDuration
```

Replace `{date-30-days-from-now}` with ISO 8601 format: `2026-04-03T00:00:00Z`

### Detect Expired or Terminated Relationships

```
GET https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships
?$filter=status eq 'expired' or status eq 'terminated'
&$select=id,displayName,customer,status,endDateTime
```

---

## Step 5: Renew / Replace Expiring Relationships

GDAP relationships cannot be extended directly — you must create a new relationship and
get customer re-approval.

### Renewal Workflow

1. Create new relationship with updated duration:
   ```
   POST /tenantRelationships/delegatedAdminRelationships
   { "displayName": "{name} — Renewal {date}", "duration": "P730D", ... }
   ```
2. Send new approval URL to customer
3. Customer approves
4. Create access assignments on the new relationship
5. Verify access works
6. Optionally terminate the old relationship:
   ```
   POST /tenantRelationships/delegatedAdminRelationships/{old-id}/requests
   { "@odata.type": "#microsoft.graph.delegatedAdminRelationshipRequest", "action": "terminate" }
   ```

### Auto-Extend Consideration

When `autoExtendDuration` is set (e.g., `"P180D"`), the relationship automatically extends
by that duration before expiry — but only once. After the auto-extension, it will expire unless
renewed manually.

---

## Step 6: Terminate a Relationship

```
POST https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships/{id}/requests
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.delegatedAdminRelationshipRequest",
  "action": "terminate"
}
```

Termination requires the relationship to be in `active` status. Both partner and customer
can terminate. After termination, status becomes `terminated` and access is immediately revoked.

---

## Bulk GDAP Audit Across All Customers

Combine with Lighthouse to generate a relationship health report:

```bash
# Step 1: Get all active relationships
az rest --method GET \
  --headers "Authorization=Bearer ${PARTNER_TOKEN}" \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships?\$filter=status eq 'active'&\$orderby=endDateTime asc&\$select=id,displayName,customer,endDateTime,autoExtendDuration"

# Parse response and flag:
# - endDateTime < now+30days → EXPIRING SOON
# - autoExtendDuration == null → NO AUTO EXTEND (manual renewal required)
# - accessAssignments empty → NO ROLES ASSIGNED (broken relationship)
```
