# Azure DevOps — Extensions and Marketplace Reference

## Overview

Azure DevOps extensions add functionality to the platform through the Visual Studio Marketplace. Extensions can contribute widgets, hubs, build/release tasks, service hooks consumers, work item form controls, and pipeline decorators. They are scoped to an organization and can be installed, enabled, disabled, or uninstalled via the UI, CLI, or REST API. This reference covers the extension management API, the contribution model, pipeline decorators, the extension SDK, and security considerations for evaluating and installing extensions.

---

## Extension Management REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/extensionmanagement/installedextensions?api-version=7.1-preview.1` | Extensions (Read) | `includeDisabledExtensions`, `includeErrors`, `includeInstallationIssues` | List installed extensions |
| POST | `/_apis/extensionmanagement/installedextensions?api-version=7.1-preview.1` | Extensions (Manage) | Body: `{ publisherName, extensionName, version }` | Install an extension |
| GET | `/_apis/extensionmanagement/installedextensions/{publisherName}/{extensionName}?api-version=7.1-preview.1` | Extensions (Read) | `assetTypes` | Get extension details |
| PATCH | `/_apis/extensionmanagement/installedextensions?api-version=7.1-preview.1` | Extensions (Manage) | Body: `{ publisherName, extensionName, installState: { flags } }` | Enable/disable extension |
| DELETE | `/_apis/extensionmanagement/installedextensions/{publisherName}/{extensionName}?api-version=7.1-preview.1` | Extensions (Manage) | — | Uninstall extension |
| POST | `/_apis/extensionmanagement/installedextensions/{publisherName}/{extensionName}/data/scopes/{scopeType}/{scopeValue}/collections/{collectionName}/documents?api-version=7.1-preview.1` | Extension Data (Write) | Body: document JSON | Store extension data |

---

## Installing an Extension

### Via REST API

```json
POST https://dev.azure.com/myorg/_apis/extensionmanagement/installedextensions?api-version=7.1-preview.1
Content-Type: application/json

{
  "publisherName": "ms-devlabs",
  "extensionName": "TeamRetrospectives",
  "version": "1.0.0"
}
```

If `version` is omitted, the latest version is installed.

### Via CLI

```bash
az devops extension install \
  --publisher-id ms-devlabs \
  --extension-id TeamRetrospectives \
  --org https://dev.azure.com/myorg
```

### Via Marketplace URL

Extensions are available at `https://marketplace.visualstudio.com/items?itemName={publisher}.{extension}`.

---

## Listing Installed Extensions

```bash
# CLI
az devops extension list --org https://dev.azure.com/myorg -o table

# REST
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/_apis/extensionmanagement/installedextensions?api-version=7.1-preview.1"
```

Response:

```json
{
  "count": 3,
  "value": [
    {
      "extensionName": "TeamRetrospectives",
      "publisherName": "ms-devlabs",
      "version": "1.0.72",
      "installState": {
        "flags": "none"
      },
      "scopes": ["vso.work", "vso.work_write"],
      "contributions": [
        { "id": "board-hub", "type": "ms.vss-web.hub" }
      ]
    }
  ]
}
```

---

## Enabling and Disabling Extensions

### Disable

```json
PATCH https://dev.azure.com/myorg/_apis/extensionmanagement/installedextensions?api-version=7.1-preview.1
Content-Type: application/json

{
  "publisherName": "ms-devlabs",
  "extensionName": "TeamRetrospectives",
  "installState": {
    "flags": "disabled"
  }
}
```

### Re-enable

```json
{
  "publisherName": "ms-devlabs",
  "extensionName": "TeamRetrospectives",
  "installState": {
    "flags": "none"
  }
}
```

### CLI

```bash
# Disable
az devops extension disable \
  --publisher-id ms-devlabs \
  --extension-id TeamRetrospectives \
  --org https://dev.azure.com/myorg

# Enable
az devops extension enable \
  --publisher-id ms-devlabs \
  --extension-id TeamRetrospectives \
  --org https://dev.azure.com/myorg
```

---

## Uninstalling Extensions

```bash
# CLI
az devops extension uninstall \
  --publisher-id ms-devlabs \
  --extension-id TeamRetrospectives \
  --org https://dev.azure.com/myorg --yes

# REST
curl -u ":$PAT" \
  -X DELETE \
  "https://dev.azure.com/myorg/_apis/extensionmanagement/installedextensions/ms-devlabs/TeamRetrospectives?api-version=7.1-preview.1"
```

---

## Extension Scopes

Extensions request permissions via **scopes** defined in their manifest. Review these before installing:

| Scope | Permission |
|-------|-----------|
| `vso.build` | Read builds |
| `vso.build_execute` | Queue builds |
| `vso.code` | Read repos |
| `vso.code_write` | Push to repos |
| `vso.code_manage` | Create/delete repos |
| `vso.code_full` | Full repo access |
| `vso.release` | Read releases |
| `vso.release_execute` | Create releases |
| `vso.release_manage` | Manage release definitions |
| `vso.work` | Read work items |
| `vso.work_write` | Create/update work items |
| `vso.work_full` | Full work item access |
| `vso.test` | Read test results |
| `vso.test_write` | Create/update test results |
| `vso.project` | Read project info |
| `vso.project_manage` | Create/rename projects |
| `vso.profile` | Read user profile |
| `vso.identity` | Read identities |
| `vso.identity_manage` | Manage identities |
| `vso.serviceendpoint` | Read service connections |
| `vso.serviceendpoint_manage` | Create/manage service connections |
| `vso.dashboards` | Read dashboards |
| `vso.dashboards_manage` | Create/edit dashboards |

---

## Contribution Model

Extensions add features via **contributions** — declarative JSON entries that integrate with Azure DevOps extension points.

### Common Contribution Types

| Type | Description | Example |
|------|-------------|---------|
| `ms.vss-web.hub` | Navigation hub (page) | Custom tab in project navigation |
| `ms.vss-web.hub-group` | Group of hubs | New top-level navigation section |
| `ms.vss-web.action` | Context menu action | Right-click action on work items |
| `ms.vss-dashboards-web.widget` | Dashboard widget | Custom widget tile |
| `ms.vss-work-web.work-item-form-control` | Work item form control | Custom field renderer |
| `ms.vss-work-web.work-item-form-group` | Work item form group | Custom section on form |
| `ms.vss-work-web.work-item-form-page` | Work item form page | Custom tab on form |
| `ms.vss-build-web.pipeline-task` | Pipeline task | Custom build/release step |
| `ms.vss-build-web.pipeline-decorator` | Pipeline decorator | Injected pipeline step |

### Manifest Example

```json
{
  "manifestVersion": 1,
  "id": "my-custom-extension",
  "version": "1.0.0",
  "name": "My Custom Extension",
  "publisher": "mycompany",
  "scopes": ["vso.work", "vso.work_write"],
  "contributions": [
    {
      "id": "work-item-action",
      "type": "ms.vss-web.action",
      "targets": ["ms.vss-work-web.work-item-context-menu"],
      "properties": {
        "text": "Export to PDF",
        "title": "Export this work item to PDF",
        "icon": "img/export-icon.png",
        "uri": "export-handler.html"
      }
    }
  ],
  "files": [
    { "path": "export-handler.html", "addressable": true },
    { "path": "img", "addressable": true }
  ]
}
```

---

## Pipeline Decorators

Pipeline decorators are extension contributions that inject steps into all pipelines (or a filtered set) without modifying pipeline YAML:

```json
{
  "id": "security-scan-decorator",
  "type": "ms.vss-build-web.pipeline-decorator",
  "targets": ["ms.vss-build-web.build-definition"],
  "properties": {
    "template": "security-scan.yml",
    "targettask": "ms.vss-build-web.build-definition",
    "injectionType": "after"
  }
}
```

### Decorator Template (`security-scan.yml`)

```yaml
steps:
  - task: CmdLine@2
    displayName: 'Security Scan (Decorator)'
    inputs:
      script: |
        echo "Running organization-mandated security scan..."
        # Run security scanning tool
    condition: always()
```

Decorators are powerful for enforcing organization-wide policies (security scans, compliance checks, telemetry) without requiring each pipeline to explicitly include the steps.

---

## Extension SDK

### Azure DevOps Extension SDK (`azure-devops-extension-sdk`)

```typescript
import * as SDK from "azure-devops-extension-sdk";
import { WorkItemTrackingServiceIds, IWorkItemFormService } from "azure-devops-extension-api/WorkItemTracking";

SDK.init();

SDK.ready().then(async () => {
  const formService = await SDK.getService<IWorkItemFormService>(
    WorkItemTrackingServiceIds.WorkItemFormService
  );

  const title = await formService.getFieldValue("System.Title");
  console.log(`Current work item title: ${title}`);

  await formService.setFieldValue("Custom.ReviewStatus", "Reviewed");
});
```

### Publishing an Extension

```bash
# Install the TFX CLI
npm install -g tfx-cli

# Package the extension
tfx extension create --manifest-globs vss-extension.json

# Publish to the Marketplace
tfx extension publish \
  --manifest-globs vss-extension.json \
  --token $MARKETPLACE_PAT \
  --share-with myorg

# Update an existing extension
tfx extension publish \
  --manifest-globs vss-extension.json \
  --token $MARKETPLACE_PAT \
  --override '{"version": "1.0.1"}'
```

---

## Popular Extensions

| Extension | Publisher | Description | Scopes |
|-----------|----------|-------------|--------|
| SonarQube | `SonarSource` | Code quality and security analysis | `vso.build`, `vso.code` |
| WhiteSource (Mend) | `whitesource` | Open-source vulnerability scanning | `vso.build`, `vso.code` |
| Terraform | `ms-devlabs` | Terraform plan/apply tasks | `vso.build_execute` |
| ARM Outputs | `keesschollaart` | Read ARM deployment outputs in pipelines | `vso.build` |
| Team Retrospectives | `ms-devlabs` | Sprint retrospective boards | `vso.work_write` |
| Delivery Plans | `ms-devlabs` | Cross-team delivery timeline | `vso.work` |
| Code Coverage Widgets | `ms-devlabs` | Dashboard widgets for code coverage | `vso.dashboards`, `vso.build` |
| Pull Request Manager | `AgilePM` | Enhanced PR management UI | `vso.code_write` |
| Azure Boards Kanban Tools | `ms-devlabs` | Extended Kanban board features | `vso.work_write` |

---

## Extension Data Storage

Extensions can store per-user or per-project data using the extension data service:

```typescript
import { CommonServiceIds, IExtensionDataService } from "azure-devops-extension-api";

const dataService = await SDK.getService<IExtensionDataService>(
  CommonServiceIds.ExtensionDataService
);
const dataManager = await dataService.getExtensionDataManager(
  SDK.getExtensionContext().id,
  SDK.getAccessToken()
);

// Store a document
await dataManager.setDocument("MyCollection", {
  id: "settings-1",
  theme: "dark",
  notificationsEnabled: true
});

// Retrieve a document
const doc = await dataManager.getDocument("MyCollection", "settings-1");

// Query documents
const docs = await dataManager.getDocuments("MyCollection");
```

---

## Security Considerations

1. **Review scopes before installing**: extensions with `vso.code_full` or `vso.identity_manage` have broad access. Only install from trusted publishers.

2. **Publisher verification**: look for the "Verified" badge on the Marketplace. Verified publishers have gone through Microsoft's verification process.

3. **Extension audit**: regularly audit installed extensions. Remove unused extensions to reduce attack surface.

   ```bash
   az devops extension list --org https://dev.azure.com/myorg \
     --query "[].{Name:extensionName, Publisher:publisherName, Scopes:scopes}" -o table
   ```

4. **Pipeline decorators risk**: decorators inject code into every pipeline. A compromised decorator extension can exfiltrate secrets from all builds.

5. **Extension request workflow**: configure Organization Settings > Extensions > Extension request policy to require admin approval before users can install extensions.

6. **Data residency**: extension-stored data lives in the organization's Azure DevOps region. Cross-region extensions may introduce latency.

7. **Service principal extensions**: extensions running as service principals should use the minimum required scopes.

---

## Limits and Gotchas

- **Organization-scoped**: extensions are installed per-organization, not per-project. All projects in the org see installed extensions.
- **Version pinning**: the API allows specifying a version, but most extensions auto-update. Use `autoUpgrade: false` in the install request to pin.
- **Extension data limits**: 1 MB per document, 5 MB total per collection. Use external storage (Azure Blob, Table) for larger datasets.
- **Marketplace PAT**: publishing extensions requires a PAT from `https://marketplace.visualstudio.com` with "Marketplace (Publish)" scope, separate from Azure DevOps PATs.
- **Preview API**: extension management APIs use `7.1-preview.1`. Check for breaking changes between preview versions.
- **Decorator ordering**: when multiple decorators target the same injection point, execution order is undefined. Do not create decorator dependencies.
- **Extension trust boundary**: extensions run in the browser context (for web extensions) or in the pipeline agent context (for tasks). They inherit the permissions of the user or pipeline service identity.
- **Uninstall data cleanup**: uninstalling an extension does not delete its stored data. Data persists and is accessible if the extension is reinstalled.
