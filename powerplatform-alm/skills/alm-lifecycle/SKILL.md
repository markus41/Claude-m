---
name: Power Platform ALM Lifecycle
description: Deep expertise in Power Platform Application Lifecycle Management — environment provisioning, solution transport, CI/CD pipeline automation, connection references, environment variables, and PCF control development.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - "power platform alm"
  - "solution transport"
  - "solution export"
  - "solution import"
  - "environment promotion"
  - "pcf control"
  - "pac cli"
  - "ci/cd pipeline power platform"
  - "connection reference"
  - "environment variable"
  - "managed solution"
  - "unmanaged solution"
  - "solution checker"
---

# Power Platform Application Lifecycle Management

## ALM Overview

Application Lifecycle Management (ALM) in Power Platform covers the entire journey of an application from initial development through testing, staging, and production deployment. The core cycle is **Source → Build → Test → Release**, executed across isolated Power Platform environments connected by automated pipelines.

Power Platform ALM relies on **solutions** as the unit of deployment. A solution is a container that holds all customizations — tables (entities), model-driven apps, canvas apps, Power Automate flows, PCF controls, plugins, web resources, dashboards, security roles, and more. Solutions are exported from a development environment, validated, and imported into downstream environments.

The PAC CLI (Power Platform CLI) is the primary developer tool. It handles authentication, solution management, PCF control development, environment administration, and pipeline scripting. Azure DevOps Power Platform Build Tools and GitHub Actions (`microsoft/powerplatform-actions`) provide first-party CI/CD integration.

## Environment Types

Power Platform uses isolated environments as deployment targets. Each environment has its own Dataverse database, security boundary, and configuration.

| Type | Purpose | Licensing | Reset/Copy |
|------|---------|-----------|------------|
| **Development** | Active customization; makers work here | Developer or per-user | Can be reset |
| **Sandbox** | Testing, QA, UAT; safe to reset | Per-user or per-app | Can be reset/copied |
| **Production** | Live end-user environment | Per-user or per-app | Cannot be reset |
| **Trial** | 30-day evaluation | Free (limited) | Auto-deleted |
| **Developer** | Individual developer environment (free with M365 dev) | Developer plan | Limited |
| **Default** | Created with tenant; not recommended for customization | Included | Cannot be deleted |

The standard topology is: **Dev → Test (Sandbox) → UAT (Sandbox) → Production**. Some organizations add a Build environment for automated solution compilation.

## Solution Architecture

Every solution has a **publisher** that defines a customization prefix (e.g., `cr_`, `contoso_`). The prefix namespaces all components to avoid collisions between ISVs and organizations.

**Solution hierarchy:**
```
Publisher (prefix: cr)
└── Solution (MySolution)
    ├── Tables (cr_Project, cr_Task)
    ├── Model-driven Apps
    ├── Canvas Apps
    ├── Cloud Flows
    ├── PCF Controls
    ├── Security Roles
    ├── Connection References
    ├── Environment Variables
    ├── Plugins / Custom APIs
    └── Web Resources
```

Components belong to exactly one solution for their "owning" solution but can be added to other solutions as references. The owning solution controls the component's lifecycle.

## Managed vs. Unmanaged Solutions

This distinction is critical to ALM correctness:

**Unmanaged solutions** are used in development environments. Components can be freely edited. When an unmanaged solution is deleted, its components remain in the environment (they become part of the Default solution). Unmanaged solutions are the "source code."

**Managed solutions** are used in all downstream environments (test, staging, production). Components are locked — they cannot be directly edited. When a managed solution is removed, all its components are cleanly deleted. Managed solutions enforce the principle that changes flow only through the pipeline.

**Layering behavior:** Multiple managed solutions can customize the same component. The solution with the highest layer wins. The Active layer (unmanaged customizations) always sits on top. This layering system is called the **solution layer stack**.

**Rule of thumb:**
- Export as **unmanaged** for source control and development sharing
- Export as **managed** for deployment to test and production
- Never make unmanaged customizations in production

## Transport Pipeline

The standard transport pipeline:

1. **Export** from Development (managed zip for downstream, unmanaged for source control)
2. **Validate** with Solution Checker (`pac solution check`) — catches performance issues, deprecated APIs, accessibility problems, security concerns
3. **Import to Test** environment — run automated/manual tests
4. **Approval Gate** — manual sign-off, test results review
5. **Import to Production** — activate plugins, publish customizations

Each import can use a **deployment settings file** that maps connection references and environment variables to target-specific values.

## PAC CLI Overview

The Power Platform CLI (`pac`) is installed via `dotnet tool install --global Microsoft.PowerApps.CLI.Tool` or the VS Code extension.

**Authentication:**
```bash
pac auth create --name Dev --environment https://contoso-dev.crm.dynamics.com \
  --applicationId $CLIENT_ID --clientSecret $CLIENT_SECRET --tenant $TENANT_ID
pac auth list
pac auth select --name Dev
```

**Solution commands:**
```bash
pac solution export --name MySolution --path ./out/MySolution.zip --managed
pac solution import --path ./out/MySolution.zip --activate-plugins --force-overwrite
pac solution check --path ./out/MySolution.zip --geo UnitedStates
pac solution unpack --zipfile ./out/MySolution.zip --folder ./src/MySolution
pac solution pack --folder ./src/MySolution --zipfile ./out/MySolution.zip --packagetype Managed
pac solution clone --name MySolution --outputDirectory ./src
pac solution version --buildversion 1.0.0.5
```

**Environment commands:**
```bash
pac env create --name "Dev" --type Sandbox --domain "contoso-dev"
pac env list
pac env select --env "contoso-dev"
pac env copy --source-env "Dev" --target-env "Test" --type MinimalCopy
pac env delete --env "Sandbox1"
```

**PCF commands:**
```bash
pac pcf init --namespace Contoso --name MyControl --template field
pac pcf push --publisher-prefix cr
```

## Power Platform Build Tools (Azure DevOps)

The `PowerPlatformBuildTools` extension adds pipeline tasks:

| Task | Purpose |
|------|---------|
| `PowerPlatformToolInstaller` | Install PAC CLI in pipeline agent |
| `PowerPlatformWhoAmI` | Test authentication |
| `PowerPlatformExportSolution` | Export solution from environment |
| `PowerPlatformUnpackSolution` | Unpack zip to source files |
| `PowerPlatformPackSolution` | Pack source files to zip |
| `PowerPlatformImportSolution` | Import solution to environment |
| `PowerPlatformPublishCustomizations` | Publish all customizations |
| `PowerPlatformChecker` | Run solution checker |
| `PowerPlatformSetSolutionVersion` | Set solution version number |

Connect to environments using a **Power Platform service connection** backed by an Entra ID (Azure AD) app registration with Dataverse application user.

## GitHub Actions

The `microsoft/powerplatform-actions` repository provides equivalent GitHub Actions:

| Action | Purpose |
|--------|---------|
| `who-am-i` | Verify connection |
| `export-solution` | Export from environment |
| `unpack-solution` | Unpack to source files |
| `pack-solution` | Pack from source files |
| `import-solution` | Import to target |
| `publish-solution` | Publish customizations |
| `check-solution` | Run solution checker |
| `set-solution-version` | Set version |

Secrets: `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, and environment URL secrets per target.

## Connection References

Connection references decouple cloud flows and canvas apps from specific connections. A connection reference has a **logical name** (e.g., `cr_sharedcommondataserviceforapps_abc123`) that maps to a **physical connection** in each environment.

During import, provide a deployment settings file that maps each logical name to the target environment's connection ID. This avoids manual post-import configuration and enables fully automated deployments.

## Environment Variables

Environment variables store configuration values that differ across environments — API URLs, feature flags, tenant IDs, resource identifiers, and data source references.

**Types:** String, Number, Boolean, JSON, Data Source

Each variable has a **definition** (schema name, display name, type, default value) in the solution and an environment-specific **value** record. During import, the deployment settings file provides target values.

**Usage:**
- In Cloud Flows: `@parameters('cr_ApiBaseUrl')`
- In Canvas Apps: `Environment().cr_ApiBaseUrl`
- In Plugins/Custom APIs: retrieved via `IOrganizationService` query

## PCF Control Development

PowerApps Component Framework (PCF) enables custom UI controls for model-driven and canvas apps.

**Control types:**
- **Field controls** — bound to a single column value (text input, slider, rating)
- **Dataset controls** — bound to a view/collection (gallery, chart, grid)
- **React-based controls** — use React virtual DOM instead of direct DOM manipulation (recommended for complex UI)

**Development cycle:**
1. `pac pcf init` — scaffold project
2. Edit `ControlManifest.Input.xml` — define properties and resources
3. Implement lifecycle methods in `index.ts` — `init`, `updateView`, `getOutputs`, `destroy`
4. `npm start` — test in browser harness
5. `pac pcf push` — deploy to dev environment for real testing
6. Package in a solution for transport

**React controls** use `pac pcf init --framework react` and generate a functional component skeleton with `useContext` for platform context. Fluent UI v9 (`@fluentui/react-components`) is the recommended design system.

## Solution Versioning

Solutions use **MAJOR.MINOR.BUILD.REVISION** (e.g., `1.2.0.5`).

- **MAJOR** — breaking changes, schema changes
- **MINOR** — new features, new components
- **BUILD** — bug fixes, patches
- **REVISION** — auto-incremented on each export (or CI build number)

Set version before export: `pac solution version --buildversion 1.2.0.$BUILD_NUMBER`

In pipelines, use the build number as the REVISION to ensure traceability from deployed solution back to the exact build.

## Deployment Settings Files

Deployment settings files are JSON files that provide environment-specific configuration during solution import. They map connection references to physical connections and environment variables to target-specific values. Maintain one file per target environment (e.g., `test.json`, `uat.json`, `prod.json`) and store them in source control alongside the solution source.

The structure contains two arrays — `ConnectionReferences` and `EnvironmentVariables`:

```json
{
  "ConnectionReferences": [
    {
      "LogicalName": "cr_sharedcommondataserviceforapps_abc123",
      "ConnectionId": "guid-of-target-connection",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    }
  ],
  "EnvironmentVariables": [
    {
      "SchemaName": "cr_ApiBaseUrl",
      "Value": "https://api.prod.contoso.com"
    }
  ]
}
```

Use the `--settings-file` flag with `pac solution import` or the `DeploymentSettingsFile` input in pipeline tasks to apply these mappings automatically during import.

## Solution Checker

Solution Checker is a static analysis tool that validates solutions against Microsoft's best practice rules. It checks for deprecated API usage, performance anti-patterns, accessibility violations, security concerns, and supportability issues.

Run it before every deployment to catch problems early:

```bash
pac solution check --path ./MySolution.zip --geo UnitedStates
```

Severity levels: **Critical** (must fix, blocks deployment), **High** (should fix, reliability impact), **Medium** (best practice violation), **Low** (informational). In CI/CD pipelines, configure the checker to fail the build on Critical and High severity findings.

## Power Platform Pipelines (Native)

Power Platform also offers a built-in Pipelines feature (preview/GA depending on region) that provides a no-code/low-code deployment experience directly within the platform. Native pipelines are configured in the Power Platform admin center and support multi-stage deployments with approval gates. They complement but do not replace Azure DevOps or GitHub Actions for teams that need full CI/CD customization, branching strategies, and integration with broader DevOps toolchains.

## Service Principal Authentication

For automated pipelines, authenticate using an Entra ID (Azure AD) app registration:

1. Register an application in Entra ID
2. Create a client secret or certificate
3. In each target Power Platform environment, create an **Application User** mapped to the app registration
4. Assign the **System Administrator** security role to the Application User
5. Use the app's client ID, client secret, and tenant ID in pipeline authentication

This approach avoids personal credentials in pipelines and enables proper audit trails.

## Reference Files

| Topic | File | Key Content |
|-------|------|-------------|
| Environment Management | `references/environment-management.md` | Create, copy, reset, delete; Admin API; PAC CLI; capacity |
| Solution Transport | `references/solution-transport.md` | Export/import; managed/unmanaged; versioning; unpack/pack; checker |
| CI/CD Pipelines | `references/cicd-pipelines.md` | Azure DevOps YAML; GitHub Actions YAML; Build Tools; gates |
| Connection References | `references/connection-references.md` | Logical mapping; deployment settings; programmatic creation |
| Environment Variables | `references/environment-variables.md` | Types; definition vs value; deployment settings; usage patterns |
| PCF Development | `references/pcf-development.md` | Scaffold; manifest; lifecycle; React; dataset; build/deploy |

## Example Files

| Topic | File | Key Content |
|-------|------|-------------|
| Environment Promotion | `examples/environment-promotion.md` | Full dev→test→prod script with validation |
| Pipeline Templates | `examples/pipeline-templates.md` | Azure DevOps and GitHub Actions YAML |
| PCF Scaffolding | `examples/pcf-scaffolding.md` | Field, dataset, React control templates |
| Solution Diff | `examples/solution-diff.md` | Compare solutions across environments |
