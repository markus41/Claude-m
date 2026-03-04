---
name: ado-extensions
description: Search, install, and manage Azure DevOps marketplace extensions
argument-hint: "--action search|install|list|disable [--extension <publisher.extension>] [--query <search-term>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Extensions

Search the Visual Studio Marketplace, install and manage Azure DevOps extensions, and review extension permissions.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Manage extensions` permission (organization-level)

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--action` | Yes | `search`, `install`, `list`, `enable`, `disable`, `uninstall`, `permissions` |
| `--query` | No | Search term for marketplace (for `search` action) |
| `--extension` | No | Extension identifier as `publisher.extensionId` |
| `--version` | No | Specific version to install (default: latest) |

## Instructions

1. **Search marketplace** — `POST https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.1-preview.1`:
   ```json
   {
     "filters": [{
       "criteria": [
         { "filterType": 8, "value": "Microsoft.VisualStudio.Services" },
         { "filterType": 10, "value": "<search-term>" }
       ]
     }],
     "flags": 870
   }
   ```
   Display: Publisher, Extension name, Description, Install count, Rating, Version.

2. **Install extension** — `POST /_apis/extensionmanagement/installedextensionsbyname/{publisher}/{extension}?api-version=7.1-preview.1`
   Body: `{ "version": "<version>" }` (optional).
   CLI: `az devops extension install --publisher-id {publisher} --extension-id {extension}`.

3. **List installed extensions** — `GET /_apis/extensionmanagement/installedextensions?api-version=7.1-preview.1`
   Display: Publisher, Name, Version, State (enabled/disabled), Install date.

4. **Enable/disable extension** — `PATCH /_apis/extensionmanagement/installedextensionsbyname/{publisher}/{extension}?api-version=7.1-preview.1`:
   ```json
   { "installState": { "flags": "none" } }
   ```
   For disable: `{ "installState": { "flags": "disabled" } }`.

5. **Uninstall extension** — `DELETE /_apis/extensionmanagement/installedextensionsbyname/{publisher}/{extension}?api-version=7.1-preview.1`.

6. **Review permissions** — `GET /_apis/extensionmanagement/installedextensions?includeInstallationIssues=true&api-version=7.1-preview.1`
   Show: Scopes requested (vso.code, vso.build, etc.), data collection notice, publisher trust.

## Examples

```bash
/ado-extensions --action search --query "code coverage"
/ado-extensions --action install --extension ms-devlabs.TeamProjectHealth
/ado-extensions --action list
/ado-extensions --action disable --extension publisher.extensionId
/ado-extensions --action permissions --extension ms-devlabs.TeamProjectHealth
```

## Error Handling

- **Extension not found**: Verify publisher and extension ID — search marketplace first.
- **Permission denied**: User lacks `Manage extensions` — request access from org admin.
- **Version conflict**: Extension requires a newer ADO version — check compatibility.
- **License required**: Some extensions require paid licenses — check pricing on marketplace.
