# CI/CD Pipelines for Power Platform

## Overview

Automated CI/CD pipelines are essential for reliable Power Platform ALM. Two primary platforms are supported with first-party tooling: **Azure DevOps** (Power Platform Build Tools) and **GitHub Actions** (`microsoft/powerplatform-actions`). Both provide tasks/actions for solution export, import, validation, unpacking, packing, and publishing.

## Azure DevOps — Power Platform Build Tools

### Installation

Install the **Power Platform Build Tools** extension from the Azure DevOps Marketplace:
- Publisher: Microsoft
- Extension ID: `PowerPlatformBuildTools`
- URL: `https://marketplace.visualstudio.com/items?itemName=microsoft-IsvExpTools.PowerPlatformBuildTools`

### Service Connection Setup

1. Register an app in Entra ID (Azure AD) with a client secret or certificate
2. Create an Application User in each target Power Platform environment with the **System Administrator** security role
3. In Azure DevOps Project Settings → Service connections → New → **Power Platform**
4. Enter: Server URL (environment URL), Tenant ID, Application (Client) ID, Client Secret

### Available Tasks

| Task ID | Display Name | Purpose |
|---------|-------------|---------|
| `PowerPlatformToolInstaller@2` | Power Platform Tool Installer | Install PAC CLI on agent |
| `PowerPlatformWhoAmI@2` | Power Platform WhoAmI | Verify service connection |
| `PowerPlatformExportSolution@2` | Power Platform Export Solution | Export solution from environment |
| `PowerPlatformUnpackSolution@2` | Power Platform Unpack Solution | Unpack zip to source files |
| `PowerPlatformPackSolution@2` | Power Platform Pack Solution | Pack source files to zip |
| `PowerPlatformImportSolution@2` | Power Platform Import Solution | Import solution to environment |
| `PowerPlatformPublishCustomizations@2` | Power Platform Publish Customizations | Publish all customizations |
| `PowerPlatformChecker@2` | Power Platform Checker | Run solution checker |
| `PowerPlatformSetSolutionVersion@2` | Power Platform Set Solution Version | Set version in solution |
| `PowerPlatformDeleteSolution@2` | Power Platform Delete Solution | Delete solution from environment |
| `PowerPlatformApplySolutionUpgrade@2` | Power Platform Apply Solution Upgrade | Apply staged upgrade |

### Pipeline 1: Export and Commit to Source Control

This pipeline exports a solution from the development environment and commits the unpacked source to the repository.

```yaml
# azure-pipelines-export.yml
trigger: none  # Manual trigger only

parameters:
  - name: solutionName
    displayName: "Solution Unique Name"
    type: string
    default: "MySolution"

pool:
  vmImage: "windows-latest"

variables:
  - name: solutionName
    value: ${{ parameters.solutionName }}
  - name: solutionExportPath
    value: "$(Build.ArtifactStagingDirectory)/$(solutionName).zip"
  - name: solutionUnpackFolder
    value: "$(Build.SourcesDirectory)/src/$(solutionName)"

steps:
  # Step 1: Install Power Platform CLI
  - task: PowerPlatformToolInstaller@2
    displayName: "Install Power Platform CLI"

  # Step 2: Verify connection to development environment
  - task: PowerPlatformWhoAmI@2
    displayName: "Verify Dev Connection"
    inputs:
      authenticationType: "PowerPlatformSPN"
      PowerPlatformSPN: "Dev-ServiceConnection"

  # Step 3: Export solution as unmanaged (for source control)
  - task: PowerPlatformExportSolution@2
    displayName: "Export Solution (Unmanaged)"
    inputs:
      authenticationType: "PowerPlatformSPN"
      PowerPlatformSPN: "Dev-ServiceConnection"
      SolutionName: "$(solutionName)"
      SolutionOutputFile: "$(solutionExportPath)"
      Managed: false
      AsyncOperation: true
      MaxAsyncWaitTime: "60"

  # Step 4: Unpack solution to source-controlled folder
  - task: PowerPlatformUnpackSolution@2
    displayName: "Unpack Solution"
    inputs:
      SolutionInputFile: "$(solutionExportPath)"
      SolutionTargetFolder: "$(solutionUnpackFolder)"
      SolutionType: "Both"

  # Step 5: Commit changes to repository
  - script: |
      git config user.email "pipeline@contoso.com"
      git config user.name "Azure Pipeline"
      git checkout -B main
      git add --all
      git diff --cached --quiet || git commit -m "Export $(solutionName) from Dev [skip ci]"
      git push origin main
    displayName: "Commit Solution Source"
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

### Pipeline 2: Build and Release (Multi-Stage)

This pipeline builds a managed solution from source, validates it, and deploys through test and production with approval gates.

```yaml
# azure-pipelines-release.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/**

variables:
  - name: solutionName
    value: "MySolution"
  - name: solutionFolder
    value: "$(Build.SourcesDirectory)/src/$(solutionName)"
  - name: solutionPackedPath
    value: "$(Build.ArtifactStagingDirectory)/$(solutionName)_managed.zip"

stages:
  # ──────────────────────────────────────────
  # Stage 1: Build and Validate
  # ──────────────────────────────────────────
  - stage: Build
    displayName: "Build & Validate"
    pool:
      vmImage: "windows-latest"
    jobs:
      - job: BuildSolution
        displayName: "Build Managed Solution"
        steps:
          - task: PowerPlatformToolInstaller@2
            displayName: "Install Power Platform CLI"

          # Set solution version using build number
          - task: PowerPlatformSetSolutionVersion@2
            displayName: "Set Solution Version"
            inputs:
              authenticationType: "PowerPlatformSPN"
              PowerPlatformSPN: "Dev-ServiceConnection"
              SolutionName: "$(solutionName)"
              SolutionVersionNumber: "1.0.0.$(Build.BuildId)"

          # Pack solution from source files
          - task: PowerPlatformPackSolution@2
            displayName: "Pack Managed Solution"
            inputs:
              SolutionSourceFolder: "$(solutionFolder)"
              SolutionOutputFile: "$(solutionPackedPath)"
              SolutionType: "Managed"

          # Run solution checker
          - task: PowerPlatformChecker@2
            displayName: "Run Solution Checker"
            inputs:
              authenticationType: "PowerPlatformSPN"
              PowerPlatformSPN: "Dev-ServiceConnection"
              FilesToAnalyze: "$(solutionPackedPath)"
              RuleSet: "0ad12346-e108-40b8-a956-9a8f95ea18c9"  # Solution Checker ruleset GUID
              Geography: "UnitedStates"

          # Publish build artifact
          - task: PublishBuildArtifacts@1
            displayName: "Publish Solution Artifact"
            inputs:
              PathtoPublish: "$(Build.ArtifactStagingDirectory)"
              ArtifactName: "solution"

  # ──────────────────────────────────────────
  # Stage 2: Deploy to Test
  # ──────────────────────────────────────────
  - stage: DeployTest
    displayName: "Deploy to Test"
    dependsOn: Build
    pool:
      vmImage: "windows-latest"
    jobs:
      - deployment: DeployToTest
        displayName: "Import to Test Environment"
        environment: "Test"  # Azure DevOps Environment with optional approval check
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PowerPlatformToolInstaller@2
                  displayName: "Install Power Platform CLI"

                - task: PowerPlatformImportSolution@2
                  displayName: "Import Solution to Test"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Test-ServiceConnection"
                    SolutionInputFile: "$(Pipeline.Workspace)/solution/$(solutionName)_managed.zip"
                    AsyncOperation: true
                    MaxAsyncWaitTime: "120"
                    ActivatePlugins: true
                    OverwriteUnmanagedCustomizations: true
                    UseDeploymentSettingsFile: true
                    DeploymentSettingsFile: "$(Pipeline.Workspace)/solution/deployment-settings/test.json"

                - task: PowerPlatformPublishCustomizations@2
                  displayName: "Publish Customizations"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Test-ServiceConnection"

  # ──────────────────────────────────────────
  # Stage 3: Deploy to Production
  # ──────────────────────────────────────────
  - stage: DeployProd
    displayName: "Deploy to Production"
    dependsOn: DeployTest
    pool:
      vmImage: "windows-latest"
    jobs:
      - deployment: DeployToProd
        displayName: "Import to Production Environment"
        environment: "Production"  # Requires manual approval
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PowerPlatformToolInstaller@2
                  displayName: "Install Power Platform CLI"

                - task: PowerPlatformImportSolution@2
                  displayName: "Import Solution to Production"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Prod-ServiceConnection"
                    SolutionInputFile: "$(Pipeline.Workspace)/solution/$(solutionName)_managed.zip"
                    AsyncOperation: true
                    MaxAsyncWaitTime: "120"
                    ActivatePlugins: true
                    OverwriteUnmanagedCustomizations: true
                    HoldingSolution: true  # Import as holding for upgrade
                    UseDeploymentSettingsFile: true
                    DeploymentSettingsFile: "$(Pipeline.Workspace)/solution/deployment-settings/prod.json"

                - task: PowerPlatformApplySolutionUpgrade@2
                  displayName: "Apply Solution Upgrade"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Prod-ServiceConnection"
                    SolutionName: "$(solutionName)"
                    AsyncOperation: true
                    MaxAsyncWaitTime: "60"

                - task: PowerPlatformPublishCustomizations@2
                  displayName: "Publish Customizations"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Prod-ServiceConnection"
```

### Approval Gates in Azure DevOps

Configure approval gates on the **Environment** resource in Azure DevOps:

1. Navigate to Pipelines → Environments → Select environment (e.g., "Production")
2. Click "Approvals and checks"
3. Add **Approvals** — specify required approvers
4. Optionally add **Business Hours** — restrict deployments to specific windows
5. Optionally add **Branch Control** — only allow deployments from `main` or `release/*`

## GitHub Actions — microsoft/powerplatform-actions

### Available Actions

All actions are in the `microsoft/powerplatform-actions` repository:

| Action | Purpose |
|--------|---------|
| `microsoft/powerplatform-actions/who-am-i@v1` | Verify authentication |
| `microsoft/powerplatform-actions/export-solution@v1` | Export solution |
| `microsoft/powerplatform-actions/unpack-solution@v1` | Unpack to source files |
| `microsoft/powerplatform-actions/pack-solution@v1` | Pack from source files |
| `microsoft/powerplatform-actions/import-solution@v1` | Import solution |
| `microsoft/powerplatform-actions/publish-solution@v1` | Publish customizations |
| `microsoft/powerplatform-actions/check-solution@v1` | Run solution checker |
| `microsoft/powerplatform-actions/set-solution-version@v1` | Set version |
| `microsoft/powerplatform-actions/delete-solution@v1` | Delete solution |
| `microsoft/powerplatform-actions/upgrade-solution@v1` | Apply upgrade |

### Secrets Setup

Configure these repository secrets:

| Secret | Description | Example |
|--------|-------------|---------|
| `TENANT_ID` | Azure AD Tenant ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `CLIENT_ID` | App Registration Client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `CLIENT_SECRET` | App Registration Client Secret | `your-secret-value` |
| `DEV_ENVIRONMENT_URL` | Dev environment URL | `https://contoso-dev.crm.dynamics.com` |
| `TEST_ENVIRONMENT_URL` | Test environment URL | `https://contoso-test.crm.dynamics.com` |
| `PROD_ENVIRONMENT_URL` | Prod environment URL | `https://contoso.crm.dynamics.com` |

### Workflow 1: Export Solution (Manual Trigger)

```yaml
# .github/workflows/export-solution.yml
name: Export Solution from Dev

on:
  workflow_dispatch:
    inputs:
      solution_name:
        description: "Solution unique name"
        required: true
        default: "MySolution"

permissions:
  contents: write

env:
  SOLUTION_NAME: ${{ github.event.inputs.solution_name }}

jobs:
  export-and-commit:
    runs-on: windows-latest
    steps:
      # Checkout repository
      - uses: actions/checkout@v4

      # Verify connection
      - name: Who Am I
        uses: microsoft/powerplatform-actions/who-am-i@v1
        with:
          environment-url: ${{ secrets.DEV_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}

      # Export unmanaged solution
      - name: Export Solution
        uses: microsoft/powerplatform-actions/export-solution@v1
        with:
          environment-url: ${{ secrets.DEV_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          solution-name: ${{ env.SOLUTION_NAME }}
          solution-output-file: exports/${{ env.SOLUTION_NAME }}.zip
          managed: false
          run-asynchronously: true

      # Unpack solution
      - name: Unpack Solution
        uses: microsoft/powerplatform-actions/unpack-solution@v1
        with:
          solution-file: exports/${{ env.SOLUTION_NAME }}.zip
          solution-folder: src/${{ env.SOLUTION_NAME }}
          solution-type: "Both"
          overwrite-files: true

      # Commit unpacked source
      - name: Commit Changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add --all
          git diff --cached --quiet || git commit -m "Export ${{ env.SOLUTION_NAME }} from Dev"
          git push
```

### Workflow 2: Release Solution (On Push to Main)

```yaml
# .github/workflows/release-solution.yml
name: Build and Release Solution

on:
  push:
    branches:
      - main
    paths:
      - "src/**"

env:
  SOLUTION_NAME: MySolution
  SOLUTION_SOURCE_FOLDER: src/MySolution

jobs:
  # ──────────────────────────────────────────
  # Job 1: Build and validate
  # ──────────────────────────────────────────
  build:
    runs-on: windows-latest
    outputs:
      solution-version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      # Set version
      - name: Set Solution Version
        id: version
        run: |
          $version = "1.0.0.${{ github.run_number }}"
          echo "version=$version" >> $env:GITHUB_OUTPUT
        shell: pwsh

      - name: Set Solution Version in Source
        uses: microsoft/powerplatform-actions/set-solution-version@v1
        with:
          solution-version-number: ${{ steps.version.outputs.version }}
          solution-folder: ${{ env.SOLUTION_SOURCE_FOLDER }}

      # Pack managed solution
      - name: Pack Solution
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: ${{ env.SOLUTION_SOURCE_FOLDER }}
          solution-file: build/${{ env.SOLUTION_NAME }}_managed.zip
          solution-type: Managed

      # Run solution checker
      - name: Solution Checker
        uses: microsoft/powerplatform-actions/check-solution@v1
        with:
          environment-url: ${{ secrets.DEV_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          path: build/${{ env.SOLUTION_NAME }}_managed.zip
          geography: UnitedStates

      # Upload artifact
      - name: Upload Solution Artifact
        uses: actions/upload-artifact@v4
        with:
          name: managed-solution
          path: build/${{ env.SOLUTION_NAME }}_managed.zip

  # ──────────────────────────────────────────
  # Job 2: Deploy to Test
  # ──────────────────────────────────────────
  deploy-test:
    needs: build
    runs-on: windows-latest
    environment:
      name: Test
    steps:
      - uses: actions/checkout@v4

      - name: Download Solution Artifact
        uses: actions/download-artifact@v4
        with:
          name: managed-solution
          path: build/

      - name: Import to Test
        uses: microsoft/powerplatform-actions/import-solution@v1
        with:
          environment-url: ${{ secrets.TEST_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          solution-file: build/${{ env.SOLUTION_NAME }}_managed.zip
          force-overwrite: true
          activate-plugins: true
          run-asynchronously: true
          use-deployment-settings-file: true
          deployment-settings-file: deployment-settings/test.json

      - name: Publish Customizations
        uses: microsoft/powerplatform-actions/publish-solution@v1
        with:
          environment-url: ${{ secrets.TEST_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}

  # ──────────────────────────────────────────
  # Job 3: Deploy to Production
  # ──────────────────────────────────────────
  deploy-prod:
    needs: deploy-test
    runs-on: windows-latest
    environment:
      name: Production  # Requires manual approval in GitHub Environment settings
    steps:
      - uses: actions/checkout@v4

      - name: Download Solution Artifact
        uses: actions/download-artifact@v4
        with:
          name: managed-solution
          path: build/

      - name: Import to Production (Holding)
        uses: microsoft/powerplatform-actions/import-solution@v1
        with:
          environment-url: ${{ secrets.PROD_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          solution-file: build/${{ env.SOLUTION_NAME }}_managed.zip
          import-as-holding: true
          force-overwrite: true
          activate-plugins: true
          run-asynchronously: true
          use-deployment-settings-file: true
          deployment-settings-file: deployment-settings/prod.json

      - name: Apply Solution Upgrade
        uses: microsoft/powerplatform-actions/upgrade-solution@v1
        with:
          environment-url: ${{ secrets.PROD_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          solution-name: ${{ env.SOLUTION_NAME }}
          run-asynchronously: true

      - name: Publish Customizations
        uses: microsoft/powerplatform-actions/publish-solution@v1
        with:
          environment-url: ${{ secrets.PROD_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
```

### Workflow 3: PR Validation (Solution Checker on Pull Request)

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request:
    branches:
      - main
    paths:
      - "src/**"

env:
  SOLUTION_NAME: MySolution
  SOLUTION_SOURCE_FOLDER: src/MySolution

jobs:
  validate:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      # Pack solution for validation
      - name: Pack Solution
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: ${{ env.SOLUTION_SOURCE_FOLDER }}
          solution-file: build/${{ env.SOLUTION_NAME }}.zip
          solution-type: Managed

      # Run solution checker
      - name: Solution Checker
        uses: microsoft/powerplatform-actions/check-solution@v1
        with:
          environment-url: ${{ secrets.DEV_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          path: build/${{ env.SOLUTION_NAME }}.zip
          geography: UnitedStates
```

### Environment Approvals in GitHub

1. Navigate to repository Settings → Environments
2. Create environments: `Test`, `Production`
3. For Production: enable **Required reviewers** and add approver GitHub usernames
4. Optionally add **Wait timer** (e.g., 15 minutes delay)
5. Optionally restrict to specific branches (e.g., only `main`)

## PAC CLI in Custom Pipelines

For CI systems other than Azure DevOps or GitHub, use PAC CLI directly in shell scripts.

### Bash Script: Full Pipeline

```bash
#!/bin/bash
set -euo pipefail

# Configuration
SOLUTION_NAME="MySolution"
TENANT_ID="${TENANT_ID}"
CLIENT_ID="${CLIENT_ID}"
CLIENT_SECRET="${CLIENT_SECRET}"
DEV_URL="https://contoso-dev.crm.dynamics.com"
TEST_URL="https://contoso-test.crm.dynamics.com"
PROD_URL="https://contoso.crm.dynamics.com"
OUTPUT_DIR="./output"
BUILD_NUMBER="${BUILD_NUMBER:-0}"

mkdir -p "$OUTPUT_DIR"

echo "=== Step 1: Authenticate to Dev ==="
pac auth create --name Dev \
  --environment "$DEV_URL" \
  --applicationId "$CLIENT_ID" \
  --clientSecret "$CLIENT_SECRET" \
  --tenant "$TENANT_ID"

echo "=== Step 2: Set Solution Version ==="
pac solution version --buildversion "1.0.0.${BUILD_NUMBER}" \
  --solution-name "$SOLUTION_NAME"

echo "=== Step 3: Export Managed Solution ==="
pac solution export \
  --name "$SOLUTION_NAME" \
  --path "$OUTPUT_DIR/${SOLUTION_NAME}_managed.zip" \
  --managed

echo "=== Step 4: Run Solution Checker ==="
pac solution check \
  --path "$OUTPUT_DIR/${SOLUTION_NAME}_managed.zip" \
  --geo UnitedStates \
  --outputDirectory "$OUTPUT_DIR/checker-results"

echo "=== Step 5: Authenticate to Test ==="
pac auth create --name Test \
  --environment "$TEST_URL" \
  --applicationId "$CLIENT_ID" \
  --clientSecret "$CLIENT_SECRET" \
  --tenant "$TENANT_ID"

pac auth select --name Test

echo "=== Step 6: Import to Test ==="
pac solution import \
  --path "$OUTPUT_DIR/${SOLUTION_NAME}_managed.zip" \
  --settings-file "./deployment-settings/test.json" \
  --activate-plugins \
  --force-overwrite \
  --publish-changes

echo "=== Step 7: Authenticate to Prod ==="
pac auth create --name Prod \
  --environment "$PROD_URL" \
  --applicationId "$CLIENT_ID" \
  --clientSecret "$CLIENT_SECRET" \
  --tenant "$TENANT_ID"

pac auth select --name Prod

echo "=== Step 8: Import to Prod (Holding) ==="
pac solution import \
  --path "$OUTPUT_DIR/${SOLUTION_NAME}_managed.zip" \
  --settings-file "./deployment-settings/prod.json" \
  --activate-plugins \
  --force-overwrite \
  --import-as-holding

echo "=== Step 9: Apply Upgrade ==="
pac solution upgrade --solution-name "$SOLUTION_NAME" --async

echo "=== Pipeline Complete ==="
```

### PowerShell Script Equivalent

```powershell
# pipeline.ps1
param(
    [string]$SolutionName = "MySolution",
    [string]$BuildNumber = "0"
)

$ErrorActionPreference = "Stop"

$OutputDir = "./output"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host "=== Authenticate to Dev ===" -ForegroundColor Cyan
pac auth create --name Dev `
    --environment $env:DEV_URL `
    --applicationId $env:CLIENT_ID `
    --clientSecret $env:CLIENT_SECRET `
    --tenant $env:TENANT_ID

Write-Host "=== Export Managed Solution ===" -ForegroundColor Cyan
pac solution export `
    --name $SolutionName `
    --path "$OutputDir/${SolutionName}_managed.zip" `
    --managed

Write-Host "=== Run Solution Checker ===" -ForegroundColor Cyan
pac solution check `
    --path "$OutputDir/${SolutionName}_managed.zip" `
    --geo UnitedStates

Write-Host "=== Import to Test ===" -ForegroundColor Cyan
pac auth create --name Test `
    --environment $env:TEST_URL `
    --applicationId $env:CLIENT_ID `
    --clientSecret $env:CLIENT_SECRET `
    --tenant $env:TENANT_ID

pac auth select --name Test

pac solution import `
    --path "$OutputDir/${SolutionName}_managed.zip" `
    --settings-file "./deployment-settings/test.json" `
    --activate-plugins `
    --force-overwrite `
    --publish-changes

Write-Host "=== Pipeline Complete ===" -ForegroundColor Green
```

## Deployment Settings File

Used by both Azure DevOps tasks and GitHub Actions to map connection references and environment variables:

```json
{
  "EnvironmentVariables": [
    {
      "SchemaName": "cr_ApiBaseUrl",
      "Value": "https://api.test.contoso.com"
    },
    {
      "SchemaName": "cr_FeatureFlags",
      "Value": "{\"newUI\": true, \"betaFeatures\": false}"
    }
  ],
  "ConnectionReferences": [
    {
      "LogicalName": "cr_sharedcommondataserviceforapps_abc123",
      "ConnectionId": "00000000-0000-0000-0000-000000000001",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    {
      "LogicalName": "cr_sharedsharepointonline_def456",
      "ConnectionId": "00000000-0000-0000-0000-000000000002",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
    }
  ]
}
```

Create one deployment settings file per target environment: `test.json`, `uat.json`, `prod.json`.

## Best Practices

1. **Separate build and release pipelines** — build once, deploy to multiple environments
2. **Use solution checker as a gate** — fail the build on Critical/High issues
3. **Pin action versions** — use `@v1` or specific commit SHAs, not `@main`
4. **Store deployment settings in source control** — version-controlled environment config
5. **Use environment approvals for production** — require human sign-off
6. **Enable admin mode during deployments** — prevent user access during import
7. **Tag releases** — create git tags matching the solution version
8. **Monitor pipeline duration** — set reasonable timeouts
9. **Separate service connections per environment** — principle of least privilege
10. **Use variable groups** — share configuration across pipelines
11. **Implement rollback strategy** — keep previous solution version as artifact for emergency rollback
12. **Audit deployment history** — maintain a log of what was deployed, when, and by whom
