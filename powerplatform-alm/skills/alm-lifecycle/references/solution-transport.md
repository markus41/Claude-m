# Solution Transport

## Overview

Solution transport is the process of moving customizations between Power Platform environments. Solutions are exported as `.zip` files containing XML metadata and component definitions, then imported into target environments. This is the foundational mechanism for Power Platform ALM.

## Export Solution

### PAC CLI Export

```bash
# Export as managed (for downstream environments)
pac solution export --name MySolution --path ./exports/MySolution_1_0_0_1.zip --managed

# Export as unmanaged (for source control / development sharing)
pac solution export --name MySolution --path ./exports/MySolution_1_0_0_1_unmanaged.zip

# Export with specific settings
pac solution export \
  --name MySolution \
  --path ./exports/MySolution.zip \
  --managed \
  --include "autonumbering,calendar,customization,emailtracking,externalapplications,general,isvconfig,marketing,outlooksynchronization,relationshiproles,sales"
```

**Key flags:**
| Flag | Description |
|------|-------------|
| `--name` | Solution unique name (not display name) |
| `--path` | Output file path |
| `--managed` | Export as managed (omit for unmanaged) |
| `--include` | Comma-separated list of optional components to include |
| `--max-async-wait-time` | Timeout in minutes for async export |

### Web API Export

**POST** `{orgUrl}/api/data/v9.2/ExportSolution`

```typescript
interface ExportSolutionRequest {
  SolutionName: string;
  Managed: boolean;
  ExportAutoNumberingSettings?: boolean;
  ExportCalendarSettings?: boolean;
  ExportCustomizationSettings?: boolean;
  ExportEmailTrackingSettings?: boolean;
  ExportGeneralSettings?: boolean;
  ExportIsvConfig?: boolean;
  ExportMarketingSettings?: boolean;
  ExportOutlookSynchronizationSettings?: boolean;
  ExportRelationshipRoles?: boolean;
  ExportSales?: boolean;
}

interface ExportSolutionResponse {
  ExportSolutionFile: string; // base64-encoded zip content
}

async function exportSolution(
  orgUrl: string,
  accessToken: string,
  solutionName: string,
  managed: boolean
): Promise<Buffer> {
  const response = await fetch(`${orgUrl}/api/data/v9.2/ExportSolution`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
    body: JSON.stringify({
      SolutionName: solutionName,
      Managed: managed,
    }),
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }

  const result: ExportSolutionResponse = await response.json();
  return Buffer.from(result.ExportSolutionFile, "base64");
}
```

### Export Async (Large Solutions)

For large solutions, use the async variant to avoid timeouts:

**POST** `{orgUrl}/api/data/v9.2/ExportSolutionAsync`

```typescript
interface ExportSolutionAsyncResponse {
  ExportJobId: string;
  AsyncOperationId: string;
}

async function exportSolutionAsync(
  orgUrl: string,
  accessToken: string,
  solutionName: string,
  managed: boolean
): Promise<ExportSolutionAsyncResponse> {
  const response = await fetch(
    `${orgUrl}/api/data/v9.2/ExportSolutionAsync`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        SolutionName: solutionName,
        Managed: managed,
      }),
    }
  );

  return response.json();
}
```

Poll `asyncoperations({asyncOperationId})` until `statuscode` equals `30` (Succeeded) or `31` (Failed). Then retrieve the file from `exportjob({exportJobId})`.

## Import Solution

### PAC CLI Import

```bash
# Basic import
pac solution import --path ./exports/MySolution.zip --activate-plugins --force-overwrite

# Import as holding solution (for upgrade workflow)
pac solution import --path ./exports/MySolution.zip --import-as-holding

# Import with deployment settings (connection references + environment variables)
pac solution import --path ./exports/MySolution.zip \
  --settings-file ./deployment-settings/test.json \
  --activate-plugins \
  --force-overwrite \
  --publish-changes

# Import and skip dependency check
pac solution import --path ./exports/MySolution.zip --skip-dependency-check
```

**Key flags:**
| Flag | Description |
|------|-------------|
| `--path` | Solution zip file path |
| `--activate-plugins` | Activate plugin steps after import |
| `--force-overwrite` | Overwrite unmanaged customizations in target |
| `--import-as-holding` | Import as holding solution for staged upgrade |
| `--settings-file` | Deployment settings JSON for connection refs and env vars |
| `--publish-changes` | Publish all customizations after import |
| `--skip-dependency-check` | Skip solution dependency validation |
| `--async` | Run import asynchronously |
| `--max-async-wait-time` | Timeout in minutes |

### Web API Import

**POST** `{orgUrl}/api/data/v9.2/ImportSolutionAsync`

```typescript
interface ImportSolutionAsyncRequest {
  OverwriteUnmanagedCustomizations: boolean;
  PublishWorkflows: boolean;
  CustomizationFile: string; // base64-encoded zip
  ConvertToManaged?: boolean;
  SkipProductUpdateDependencies?: boolean;
  HoldingSolution?: boolean;
  ComponentParameters?: Array<{
    ComponentId: string;
    ConnectionId: string;
    ConnectorId: string;
  }>;
}

async function importSolutionAsync(
  orgUrl: string,
  accessToken: string,
  solutionZipBase64: string,
  overwrite: boolean = true
): Promise<string> {
  const response = await fetch(
    `${orgUrl}/api/data/v9.2/ImportSolutionAsync`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        OverwriteUnmanagedCustomizations: overwrite,
        PublishWorkflows: true,
        CustomizationFile: solutionZipBase64,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Import failed: ${response.status}`);
  }

  const result = await response.json();
  return result.AsyncOperationId;
}
```

### Polling Import Status

```typescript
interface AsyncOperation {
  asyncoperationid: string;
  statuscode: number; // 0=WaitingForResources, 10=Waiting, 20=InProgress, 30=Succeeded, 31=Failed, 32=Canceled
  statecode: number;
  message: string;
  friendlymessage: string;
}

async function pollImportStatus(
  orgUrl: string,
  accessToken: string,
  asyncOperationId: string,
  pollIntervalMs: number = 10000,
  maxWaitMs: number = 600000
): Promise<AsyncOperation> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(
      `${orgUrl}/api/data/v9.2/asyncoperations(${asyncOperationId})?$select=statuscode,statecode,message,friendlymessage`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const operation: AsyncOperation = await response.json();

    if (operation.statuscode === 30) {
      return operation; // Success
    }
    if (operation.statuscode === 31 || operation.statuscode === 32) {
      throw new Error(
        `Import failed with status ${operation.statuscode}: ${operation.message}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Import timed out");
}
```

## Solution Upgrade vs. Update

Two strategies for deploying a new version of an existing managed solution:

### Update (Overwrite)

Directly imports the new version on top of the existing one. Components in the new version overwrite the old version. Components removed from the new solution **remain** in the target environment.

```bash
pac solution import --path ./MySolution_v2.zip --force-overwrite
```

### Upgrade (Holding → Apply)

A two-phase process that cleanly replaces the old version:

1. **Import as holding solution** — the new version is staged alongside the existing version
2. **Apply upgrade** — the old version is removed, and the holding solution becomes the active version

This approach **removes components** that were in the old version but not in the new version.

```bash
# Phase 1: Import as holding
pac solution import --path ./MySolution_v2.zip --import-as-holding

# Phase 2: Apply upgrade (removes old version + holding, installs new version)
pac solution upgrade --solution-name MySolution --async
```

**Via Web API:**

```typescript
// Apply upgrade after holding import
async function applySolutionUpgrade(
  orgUrl: string,
  accessToken: string,
  solutionUniqueName: string
): Promise<void> {
  await fetch(
    `${orgUrl}/api/data/v9.2/DeleteAndPromote`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        UniqueName: solutionUniqueName,
      }),
    }
  );
}
```

**When to use each:**
- **Update** — quick patch, no components removed, minimal downtime
- **Upgrade** — clean deployment, removes deprecated components, recommended for major releases

## Solution Checker

Solution Checker validates a solution against best practices, performance rules, and supportability guidelines.

```bash
# Run solution checker
pac solution check --path ./exports/MySolution.zip --geo UnitedStates

# With custom rule set
pac solution check --path ./exports/MySolution.zip --geo UnitedStates --rule-set "Solution Checker"

# Output results to file
pac solution check --path ./exports/MySolution.zip --geo UnitedStates --outputDirectory ./checker-results
```

**Severity levels:**
| Level | Description | Action |
|-------|-------------|--------|
| **Critical** | Must fix — breaks functionality or security | Block deployment |
| **High** | Should fix — performance or reliability impact | Block deployment |
| **Medium** | Recommended — best practice violations | Warning |
| **Low** | Informational — style or minor improvements | Advisory |
| **Informational** | No action needed | Log only |

**Common checks:**
- Plugin/workflow assembly using deprecated APIs
- Web resource using unsupported DOM manipulation
- Canvas app using deprecated connectors
- Performance anti-patterns (N+1 queries, missing indexes)
- Accessibility violations
- Solution dependency issues

## Solution Versioning

### Convention: MAJOR.MINOR.BUILD.REVISION

```
1.0.0.0   → Initial release
1.1.0.0   → New feature added
1.1.1.0   → Bug fix
1.1.1.1   → Auto-increment on export
```

### Setting Version

```bash
# Set version before export
pac solution version --buildversion 1.2.0.0 --solutionPath ./src/MySolution

# In pipeline, use build number
pac solution version --buildversion "1.2.0.${BUILD_BUILDID}" --solutionPath ./src/MySolution

# Set via online (in environment)
pac solution version --buildversion 1.2.0.0 --solution-name MySolution
```

### Version Strategy per Branch

| Branch | Version Pattern | Example |
|--------|----------------|---------|
| `main` | `MAJOR.MINOR.0.BUILD_NUMBER` | `1.2.0.456` |
| `release/*` | `MAJOR.MINOR.BUILD.0` | `1.2.1.0` |
| `hotfix/*` | `MAJOR.MINOR.BUILD.REVISION` | `1.2.1.1` |

## Dependency Management

Solutions can depend on other solutions. Dependencies are automatically tracked when components reference each other.

### Check Dependencies

```bash
pac solution list --environment "https://contoso-dev.crm.dynamics.com"
```

**Via Web API — retrieve solution dependencies:**

```typescript
async function getSolutionDependencies(
  orgUrl: string,
  accessToken: string,
  solutionId: string
): Promise<Array<{ requiredSolutionName: string; requiredComponentType: number }>> {
  const response = await fetch(
    `${orgUrl}/api/data/v9.2/RetrieveDependenciesForUninstall(SolutionUniqueName='${solutionId}')`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const result = await response.json();
  return result.value;
}
```

### Import Order

When multiple solutions have dependencies, import in dependency order:
1. Base/shared solutions first (common tables, shared components)
2. Feature solutions that depend on base
3. Application solutions that depend on features

## Unpacking Solutions for Source Control

Solutions should be unpacked into individual files for meaningful source control diffs.

### Unpack

```bash
# Unpack exported solution to folder
pac solution unpack --zipfile ./exports/MySolution.zip --folder ./src/MySolution --packagetype Both

# Package types:
# Unmanaged — unpack as unmanaged source
# Managed   — unpack as managed source
# Both      — unpack both managed and unmanaged markers
```

### Folder Structure After Unpack

```
src/MySolution/
├── Entities/
│   ├── cr_project/
│   │   ├── Entity.xml
│   │   ├── FormXml/
│   │   ├── SavedQueries/
│   │   └── Charts/
│   └── cr_task/
├── Workflows/
│   └── MyFlow-GUID.json
├── CanvasApps/
│   └── cr_MyApp_DocumentUri.msapp
├── PluginAssemblies/
├── WebResources/
├── Roles/
├── ConnectionReferences/
├── EnvironmentVariableDefinitions/
├── Other/
│   └── Solution.xml
└── [Content_Types].xml
```

### Pack

```bash
# Pack from source folder back to zip
pac solution pack --folder ./src/MySolution --zipfile ./build/MySolution.zip --packagetype Managed
```

### Source Control Workflow

1. Developer exports solution from dev environment
2. Unpack to source folder: `pac solution unpack`
3. Commit changes to Git (meaningful file-level diffs)
4. CI pipeline packs from source: `pac solution pack`
5. Pipeline imports packed solution to test environment

## Solution Diff

Comparing two solution versions to understand changes:

### Using PAC CLI

```bash
# Unpack both versions
pac solution unpack --zipfile ./v1/MySolution.zip --folder ./diff/v1
pac solution unpack --zipfile ./v2/MySolution.zip --folder ./diff/v2

# Use git diff or any diff tool
diff -rq ./diff/v1 ./diff/v2
```

### Comparing customizations.xml

The `customizations.xml` file in the solution zip contains entity metadata, form definitions, view definitions, and relationships. XML-aware diff tools provide the best comparison:

```bash
# Extract and compare
unzip -o ./v1/MySolution.zip customizations.xml -d ./diff/v1
unzip -o ./v2/MySolution.zip customizations.xml -d ./diff/v2
diff ./diff/v1/customizations.xml ./diff/v2/customizations.xml
```

## Best Practices

1. **Always export managed for downstream environments** — enforces clean ALM
2. **Use solution upgrade for major releases** — removes deprecated components
3. **Run solution checker before every import** — catch issues early
4. **Automate versioning in pipelines** — tie version to build number
5. **Unpack for source control** — enables meaningful code review
6. **Test imports in sandbox first** — never import directly to production
7. **Use deployment settings files** — automate connection ref and env var mapping
8. **Monitor async import status** — don't assume success without polling
9. **Document solution dependencies** — maintain a dependency map
10. **One publisher per organization** — avoid prefix conflicts
