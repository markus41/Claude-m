---
name: lighthouse-operations:gdap-manage
description: Full GDAP relationship lifecycle management — create new relationships with approval links, assign security group roles, list expiring relationships, renew expiring ones, and terminate obsolete relationships with audit trail.
argument-hint: "[--action create|list|renew|terminate|assign] [--customer-tenant-id <id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# GDAP Lifecycle Management

Full lifecycle management for Granular Delegated Admin Privilege relationships.

## Action Selection

Ask which action to perform if not provided via `--action`:

1. **Create** — Create a new GDAP relationship for a customer
2. **List** — Show all relationships with status, expiry, and role coverage
3. **Renew** — Create renewal relationships for expiring/expired ones
4. **Terminate** — End a relationship that is no longer needed
5. **Assign** — Add or update security group role assignments on an active relationship

---

## Action: Create

### Step 1: Collect Details

Ask for:
- Customer tenant ID (or search by name via Lighthouse API)
- Relationship display name (e.g., `Contoso MSP — Full Administration`)
- Duration: 180 days / 365 days / 730 days (default: 730)
- Auto-extend: 90 days / 180 days / none (default: 180)
- Role preset:
  - **Standard MSP** — Security Admin, Security Reader, Global Reader, User Admin, Helpdesk Admin, Exchange Admin
  - **Read-Only** — Security Reader, Global Reader, Reports Reader
  - **Security-Only** — Security Admin, Security Reader, Authentication Admin
  - **Full Admin** — Global Admin (use cautiously)
  - **Custom** — select roles interactively

### Step 2: Build and Send Request

```bash
TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships" \
  --headers "Authorization=Bearer ${TOKEN}" \
  --body '{
    "displayName": "<name>",
    "duration": "P730D",
    "autoExtendDuration": "P180D",
    "customer": { "tenantId": "<customer-tenant-id>" },
    "accessDetails": {
      "unifiedRoles": [
        { "roleDefinitionId": "194ae4cb-b126-40b2-bd5b-6091b380977d" },
        { "roleDefinitionId": "5d6b6bb7-de71-4623-b4af-96380a352509" },
        { "roleDefinitionId": "f2ef992c-3afb-46b9-b7cf-a126ee74c451" },
        { "roleDefinitionId": "fe930be7-5e62-47db-91af-98c3a49a38b1" },
        { "roleDefinitionId": "729827e3-9c14-49f7-bb1b-9608f156bbb8" },
        { "roleDefinitionId": "29232cdf-9323-42fd-ade2-1d097af3e4de" }
      ]
    }
  }'
```

### Step 3: Generate Approval Link

After creation, extract the `id` from the response and generate the customer approval URL:

```
Customer approval URL:
https://admin.microsoft.com/AdminPortal/Home#/partners/invitation/granularAdminRelationships/{relationship-id}

Send this URL to the customer's Global Administrator.
They must approve it in the Microsoft 365 admin center before access is granted.
```

### Step 4: Confirm Access Assignments

Once status transitions to `active` (poll every 5 min or instruct user to re-run with `--action assign`), proceed with role assignments.

---

## Action: List

```bash
# Get all relationships with status and expiry
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships?\$select=id,displayName,customer,status,endDateTime,autoExtendDuration&\$orderby=endDateTime asc" \
  --headers "Authorization=Bearer ${TOKEN}"
```

Output table:
```
Relationship                        | Customer           | Status  | Expires      | Auto-Extend
------------------------------------|-------------------|---------|--------------|------------
Contoso MSP — Full Admin            | Contoso            | active  | 2027-03-01   | 180 days
Fabrikam MSP — Security             | Fabrikam Ltd.      | active  | 2026-04-15   | None ⚠️
Woodgrove MSP — Read Only           | Woodgrove Bank     | expiring| 2026-03-28   | None ⚠️
OldCustomer MSP                     | Old Corp           | expired | 2026-01-01   | —  🔴
```

Flag: relationships expiring in < 30 days, expired, or without auto-extend.

---

## Action: Renew

List all expiring or expired relationships. For each:

1. Show current relationship details
2. Confirm: create replacement? (yes/no)
3. Create new relationship with same customer + updated name `{name} — Renewal {date}`
4. Generate new approval URL
5. After customer approves, instruct to run `--action assign`

---

## Action: Terminate

1. List active relationships
2. Ask user to select which to terminate
3. Confirm: "Terminating this relationship will immediately revoke all MSP access to {customer}. Confirm?"
4. Execute:

```bash
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships/{id}/requests" \
  --headers "Authorization=Bearer ${TOKEN}" \
  --body '{"@odata.type": "#microsoft.graph.delegatedAdminRelationshipRequest", "action": "terminate"}'
```

5. Confirm termination in output.

---

## Action: Assign

Assign security groups to roles on an active relationship.

1. List active relationships without complete assignments
2. Ask for partner security group object IDs (or accept from config)
3. For each group, create access assignment:

```bash
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships/{id}/accessAssignments" \
  --headers "Authorization=Bearer ${TOKEN}" \
  --body '{
    "accessContainer": {
      "accessContainerId": "<group-object-id>",
      "accessContainerType": "securityGroup"
    },
    "accessDetails": {
      "unifiedRoles": [
        { "roleDefinitionId": "194ae4cb-b126-40b2-bd5b-6091b380977d" },
        { "roleDefinitionId": "5d6b6bb7-de71-4623-b4af-96380a352509" }
      ]
    }
  }'
```

4. Verify assignments:
```bash
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships/{id}/accessAssignments" \
  --headers "Authorization=Bearer ${TOKEN}"
```

## Arguments

- `--action create|list|renew|terminate|assign`: Skip action selection
- `--customer-tenant-id <id>`: Pre-populate customer tenant for create/assign actions
