# Directory Role Assignments — Reference

## Common Built-in Role Definition IDs

| Role | Role Definition ID |
|------|-------------------|
| Global Administrator | `62e90394-69f5-4237-9190-012177145e10` |
| Privileged Role Administrator | `e8611ab8-c189-46e8-94e1-60213ab1f814` |
| User Administrator | `fe930be7-5e62-47db-91af-98c3a49a38b1` |
| Group Administrator | `fdd7a751-b60b-444a-984c-02652fe8fa1c` |
| License Administrator | `4d6ac14f-3453-41d0-bef9-a3e0c569773a` |
| Security Administrator | `194ae4cb-b126-40b2-bd5b-6091b380977d` |
| Security Reader | `5d6b6bb7-de71-4623-b4af-96380a352509` |
| Conditional Access Administrator | `b1be1c3e-b65d-4f19-8427-f6fa0d97feb9` |
| Application Administrator | `9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3` |
| Cloud Application Administrator | `158c047a-c907-4556-b7ef-446551a6b5f7` |
| Global Reader | `f2ef992c-3afb-46b9-b7cf-a126ee74c451` |
| Helpdesk Administrator | `729827e3-9c14-49f7-bb1b-9608f156bbb8` |
| Exchange Administrator | `29232cdf-9323-42fd-ade2-1d097af3e4de` |
| SharePoint Administrator | `f28a1f50-f6e7-4571-818b-6a12f2af6b6c` |
| Teams Administrator | `69091246-20e8-4a56-aa4d-066075b2a7a8` |
| Reports Reader | `4a5d8f65-41da-4de4-8968-e035b65339cf` |
| Intune Administrator | `3a2c62db-5318-420d-8d74-23affee5d9d5` |

## List Role Definitions

```
GET /roleManagement/directory/roleDefinitions?$select=id,displayName,isBuiltIn,isEnabled
  &$filter=isEnabled eq true
  &$orderby=displayName asc
```

Find role by name:
```
GET /roleManagement/directory/roleDefinitions?$filter=displayName eq 'User Administrator'
```

## List Active Role Assignments

```
# All active assignments for a specific role
GET /roleManagement/directory/roleAssignments?$filter=roleDefinitionId eq '<role-def-id>'
  &$expand=principal($select=id,displayName,userPrincipalName)

# All roles assigned to a user
GET /roleManagement/directory/roleAssignments?$filter=principalId eq '<user-id>'
  &$expand=roleDefinition($select=displayName)

# All tenant-wide (non-scoped) assignments
GET /roleManagement/directory/roleAssignments?$filter=directoryScopeId eq '/'
```

## Assign a Directory Role

```
POST /roleManagement/directory/roleAssignments
{
  "principalId": "<user-or-group-or-sp-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/"
}
```

Scoped to administrative unit:
```json
{
  "principalId": "<user-id>",
  "roleDefinitionId": "fe930be7-5e62-47db-91af-98c3a49a38b1",
  "directoryScopeId": "/administrativeUnits/<au-id>"
}
```

Scoped to application (app management role):
```json
{
  "principalId": "<user-id>",
  "roleDefinitionId": "9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3",
  "directoryScopeId": "/applications/<app-object-id>"
}
```

## Remove Role Assignment

```
DELETE /roleManagement/directory/roleAssignments/{assignmentId}
```

Get assignment ID first:
```
GET /roleManagement/directory/roleAssignments?$filter=principalId eq '<user-id>'
  and roleDefinitionId eq '<role-definition-id>'
  and directoryScopeId eq '/'
```

## Custom Role Definitions

Create a custom role (requires Azure AD P2):
```
POST /roleManagement/directory/roleDefinitions
{
  "displayName": "Application Secrets Manager",
  "description": "Can manage application client secrets and certificates",
  "isEnabled": true,
  "rolePermissions": [
    {
      "allowedResourceActions": [
        "microsoft.directory/applications/credentials/update"
      ]
    }
  ],
  "templateId": "<new-guid>"
}
```

Browse available resource actions:
```
GET /roleManagement/directory/resourceNamespaces
GET /roleManagement/directory/resourceNamespaces/{id}/resourceActions
```

## Azure CLI Quick Reference — Roles

### Azure RBAC Roles (`az role`)

```bash
# Assign role at subscription scope
az role assignment create --assignee jane.smith@contoso.com \
  --role "Reader" --scope /subscriptions/<sub-id>

# Assign at resource group scope
az role assignment create --assignee jane.smith@contoso.com \
  --role "Contributor" --resource-group <rg-name>

# List assignments
az role assignment list --assignee jane.smith@contoso.com --output table
az role assignment list --scope /subscriptions/<sub-id> --output table

# Remove assignment
az role assignment delete --assignee jane.smith@contoso.com \
  --role "Reader" --scope /subscriptions/<sub-id>

# Search role definitions
az role definition list --query "[?contains(roleName,'Contributor')]" --output table
az role definition list --custom-role-only true --output table
```

### Entra ID Directory Roles (`az rest`)

```bash
# List activated directory roles
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/directoryRoles" \
  --query "value[].{Role:displayName, ID:id}" --output table

# Activate a role template
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/directoryRoles" \
  --body '{"roleTemplateId":"<template-id>"}'

# Assign user to directory role
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/directoryRoles/<role-id>/members/\$ref" \
  --body '{"@odata.id":"https://graph.microsoft.com/v1.0/users/<user-id>"}'

# Remove user from directory role
az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/directoryRoles/<role-id>/members/<user-id>/\$ref"
```

### App Registrations and Service Principals (`az ad`)

```bash
# Create app registration
az ad app create --display-name "My API" --sign-in-audience AzureADMyOrg

# Manage app credentials
az ad app credential reset --id <app-id> --append --display-name "CLI cred" --years 1
az ad app credential list --id <app-id> --output table
az ad app credential delete --id <app-id> --key-id <key-id>

# Federated credentials (OIDC)
az ad app federated-credential create --id <app-id> --parameters @credential.json
az ad app federated-credential list --id <app-id>

# API permissions
az ad app permission add --id <app-id> \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope
az ad app permission admin-consent --id <app-id>

# Create service principal from app
az ad sp create --id <app-id>

# Create SP with RBAC in one step
az ad sp create-for-rbac --name "deploy-sp" \
  --role Contributor --scopes /subscriptions/<sub-id>

# SP credential management
az ad sp credential reset --id <sp-id> --append --display-name "Rotation" --years 1
az ad sp credential list --id <sp-id>
```

## Group-Assignable Roles

Mark a security group as role-assignable (set at creation — cannot be changed after):
```json
{
  "displayName": "SG-GlobalAdmins",
  "mailEnabled": false,
  "mailNickname": "sg-globaladmins",
  "securityEnabled": true,
  "isAssignableToRole": true,
  "groupTypes": []
}
```

Then assign the role to the group:
```
POST /roleManagement/directory/roleAssignments
{
  "principalId": "<group-id>",
  "roleDefinitionId": "<role-definition-id>",
  "directoryScopeId": "/"
}
```
