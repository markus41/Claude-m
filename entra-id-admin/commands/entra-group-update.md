---
name: entra-group-update
description: Update group properties — display name, description, visibility, dynamic membership rule, or add/remove owners
argument-hint: "<group-id-or-name> [--name <new-name>] [--description <text>] [--dynamic-rule <rule>] [--visibility Public|Private] [--add-owner <upn>] [--remove-owner <upn>]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Update Entra ID Group

Update properties of an existing group. Supports renaming, description changes, dynamic rule modifications, visibility, and owner management.

## Steps

### 1. Resolve Group

Accept group display name or object ID:
- If name: `GET /groups?$filter=displayName eq '<name>'&$select=id,displayName,groupTypes,membershipRule,visibility`
- Confirm match with user if multiple groups found

### 2. Build PATCH Body

Include only fields specified in arguments:

```json
{
  "displayName": "<--name if provided>",
  "description": "<--description if provided>",
  "membershipRule": "<--dynamic-rule if provided>",
  "membershipRuleProcessingState": "On",
  "visibility": "<--visibility if provided>"
}
```

### 3. PATCH /groups/{groupId}

```
PATCH https://graph.microsoft.com/v1.0/groups/{groupId}
```

Note: Cannot change `groupTypes`, `mailEnabled`, `securityEnabled`, or `isAssignableToRole` after creation.

### 4. Add/Remove Owners

Add owner:
```
POST /groups/{groupId}/owners/$ref
{ "@odata.id": "https://graph.microsoft.com/v1.0/users/{ownerId}" }
```

Remove owner (ensure at least 1 owner remains):
```
DELETE /groups/{groupId}/owners/{ownerId}/$ref
```

Validate owner count before removing — warn if this would leave 0 owners.

### 5. Display Output

```
Group updated
─────────────────────────────────────────────────────────────────
Group: Project Phoenix Team (<group-id>)
─────────────────────────────────────────────────────────────────
Changed:
  Description: (none) → "Cross-functional product team"
  Visibility:  Public → Private
─────────────────────────────────────────────────────────────────
```

## Error Handling

| Code | Fix |
|------|-----|
| `404` | Group not found |
| `400 Property is read-only` | Cannot change immutable group properties |
| `403` | Add `Group.ReadWrite.All` scope |
