# Pipeline Templates

## Azure DevOps Templates

### Template 1: Export and Commit Pipeline

Exports a solution from the development environment, unpacks it for source control, and commits changes to the repository.

```yaml
# azure-pipelines/export-and-commit.yml
#
# Purpose: Export solution from Dev, unpack, and commit to source control.
# Trigger: Manual (workflow_dispatch equivalent).
# Prerequisites:
#   - Power Platform Build Tools extension installed
#   - "Dev-ServiceConnection" service connection configured
#   - Repository has write permissions for pipeline identity

trigger: none  # Manual only

parameters:
  - name: solutionName
    displayName: "Solution Unique Name"
    type: string
    default: "ContosoOrders"
  - name: commitMessage
    displayName: "Commit Message"
    type: string
    default: "Export solution from Dev"

pool:
  vmImage: "windows-latest"

variables:
  - name: solutionName
    value: ${{ parameters.solutionName }}
  - name: exportPath
    value: "$(Build.ArtifactStagingDirectory)/$(solutionName).zip"
  - name: exportPathManaged
    value: "$(Build.ArtifactStagingDirectory)/$(solutionName)_managed.zip"
  - name: sourceFolder
    value: "$(Build.SourcesDirectory)/src/$(solutionName)"

steps:
  # Install Power Platform CLI tools on the build agent
  - task: PowerPlatformToolInstaller@2
    displayName: "Install Power Platform CLI"

  # Verify authentication works before proceeding
  - task: PowerPlatformWhoAmI@2
    displayName: "Verify Dev Connection"
    inputs:
      authenticationType: "PowerPlatformSPN"
      PowerPlatformSPN: "Dev-ServiceConnection"

  # Export unmanaged solution (for source control)
  - task: PowerPlatformExportSolution@2
    displayName: "Export Unmanaged Solution"
    inputs:
      authenticationType: "PowerPlatformSPN"
      PowerPlatformSPN: "Dev-ServiceConnection"
      SolutionName: "$(solutionName)"
      SolutionOutputFile: "$(exportPath)"
      Managed: false
      AsyncOperation: true
      MaxAsyncWaitTime: "60"

  # Also export managed solution (for deployment artifact)
  - task: PowerPlatformExportSolution@2
    displayName: "Export Managed Solution"
    inputs:
      authenticationType: "PowerPlatformSPN"
      PowerPlatformSPN: "Dev-ServiceConnection"
      SolutionName: "$(solutionName)"
      SolutionOutputFile: "$(exportPathManaged)"
      Managed: true
      AsyncOperation: true
      MaxAsyncWaitTime: "60"

  # Unpack the unmanaged solution into individual files
  # This enables meaningful git diffs (file-level changes instead of zip binary diff)
  - task: PowerPlatformUnpackSolution@2
    displayName: "Unpack Solution to Source"
    inputs:
      SolutionInputFile: "$(exportPath)"
      SolutionTargetFolder: "$(sourceFolder)"
      SolutionType: "Both"
      OverwriteFiles: true

  # Commit the unpacked source files to the repository
  # [skip ci] prevents this commit from triggering another pipeline run
  - script: |
      git config user.email "pipeline@contoso.com"
      git config user.name "Azure DevOps Pipeline"
      git checkout -B main
      git add --all
      git diff --cached --quiet && echo "No changes to commit" && exit 0
      git commit -m "${{ parameters.commitMessage }} [skip ci]"
      git push origin main
    displayName: "Commit to Repository"
    env:
      SYSTEM_ACCESSTOKEN: $(System.AccessToken)

  # Publish the managed solution as a pipeline artifact for reference
  - task: PublishBuildArtifacts@1
    displayName: "Publish Managed Solution Artifact"
    inputs:
      PathtoPublish: "$(exportPathManaged)"
      ArtifactName: "managed-solution"
```

### Template 2: Build and Release Pipeline (Multi-Stage)

Complete multi-stage pipeline: build managed solution from source, validate, deploy to test with auto-approval, deploy to production with manual approval.

```yaml
# azure-pipelines/build-and-release.yml
#
# Purpose: Build solution from source, validate, deploy through environments.
# Trigger: Push to main branch (changes in src/ folder only).
# Prerequisites:
#   - Power Platform Build Tools extension installed
#   - Service connections: Dev-ServiceConnection, Test-ServiceConnection, Prod-ServiceConnection
#   - Azure DevOps Environments: "Test" and "Production" with approval policies
#   - Deployment settings files in repo: deployment-settings/test.json, deployment-settings/prod.json

trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/**

# Do not trigger on PRs (use pr-validation.yml for that)
pr: none

variables:
  - name: solutionName
    value: "ContosoOrders"
  - name: solutionFolder
    value: "$(Build.SourcesDirectory)/src/$(solutionName)"
  - name: solutionZip
    value: "$(Build.ArtifactStagingDirectory)/$(solutionName)_managed.zip"
  - name: solutionVersion
    value: "1.0.0.$(Build.BuildId)"

# ────────────────────────────────────────────────────────────────
# Stage 1: Build & Validate
# Pack from source, run solution checker, publish artifact.
# ────────────────────────────────────────────────────────────────
stages:
  - stage: Build
    displayName: "Build & Validate"
    pool:
      vmImage: "windows-latest"
    jobs:
      - job: BuildAndCheck
        displayName: "Build, Check, and Publish"
        steps:
          - task: PowerPlatformToolInstaller@2
            displayName: "Install Power Platform CLI"

          # Set solution version to include build number for traceability
          - task: PowerPlatformSetSolutionVersion@2
            displayName: "Set Version $(solutionVersion)"
            inputs:
              authenticationType: "PowerPlatformSPN"
              PowerPlatformSPN: "Dev-ServiceConnection"
              SolutionName: "$(solutionName)"
              SolutionVersionNumber: "$(solutionVersion)"

          # Pack the unpacked source files back into a managed solution zip
          - task: PowerPlatformPackSolution@2
            displayName: "Pack Managed Solution"
            inputs:
              SolutionSourceFolder: "$(solutionFolder)"
              SolutionOutputFile: "$(solutionZip)"
              SolutionType: "Managed"

          # Run solution checker — fail the build on Critical or High issues
          - task: PowerPlatformChecker@2
            displayName: "Solution Checker"
            inputs:
              authenticationType: "PowerPlatformSPN"
              PowerPlatformSPN: "Dev-ServiceConnection"
              FilesToAnalyze: "$(solutionZip)"
              RuleSet: "0ad12346-e108-40b8-a956-9a8f95ea18c9"
              Geography: "UnitedStates"
              FailOnPowerAppsCheckerAnalysisError: true

          # Copy deployment settings to artifact staging
          - task: CopyFiles@2
            displayName: "Copy Deployment Settings"
            inputs:
              SourceFolder: "$(Build.SourcesDirectory)/deployment-settings"
              Contents: "**/*.json"
              TargetFolder: "$(Build.ArtifactStagingDirectory)/deployment-settings"

          # Publish everything as a pipeline artifact
          - task: PublishBuildArtifacts@1
            displayName: "Publish Artifacts"
            inputs:
              PathtoPublish: "$(Build.ArtifactStagingDirectory)"
              ArtifactName: "release"

  # ────────────────────────────────────────────────────────────
  # Stage 2: Deploy to Test
  # Import managed solution with test-specific settings.
  # ────────────────────────────────────────────────────────────
  - stage: DeployTest
    displayName: "Deploy to Test"
    dependsOn: Build
    condition: succeeded()
    pool:
      vmImage: "windows-latest"
    jobs:
      - deployment: ImportToTest
        displayName: "Import to Test"
        environment: "Test"  # Configure approval checks on this environment
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PowerPlatformToolInstaller@2
                  displayName: "Install Power Platform CLI"

                # Import the managed solution with test deployment settings
                - task: PowerPlatformImportSolution@2
                  displayName: "Import Solution"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Test-ServiceConnection"
                    SolutionInputFile: "$(Pipeline.Workspace)/release/$(solutionName)_managed.zip"
                    AsyncOperation: true
                    MaxAsyncWaitTime: "120"
                    ActivatePlugins: true
                    OverwriteUnmanagedCustomizations: true
                    UseDeploymentSettingsFile: true
                    DeploymentSettingsFile: "$(Pipeline.Workspace)/release/deployment-settings/test.json"

                # Publish all customizations to make changes visible
                - task: PowerPlatformPublishCustomizations@2
                  displayName: "Publish Customizations"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Test-ServiceConnection"

  # ────────────────────────────────────────────────────────────
  # Stage 3: Deploy to Production
  # Import as holding solution, then apply upgrade for clean replacement.
  # ────────────────────────────────────────────────────────────
  - stage: DeployProd
    displayName: "Deploy to Production"
    dependsOn: DeployTest
    condition: succeeded()
    pool:
      vmImage: "windows-latest"
    jobs:
      - deployment: ImportToProd
        displayName: "Import to Production"
        environment: "Production"  # MUST have manual approval configured
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PowerPlatformToolInstaller@2
                  displayName: "Install Power Platform CLI"

                # Import as holding solution (staged alongside the current version)
                - task: PowerPlatformImportSolution@2
                  displayName: "Import as Holding Solution"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Prod-ServiceConnection"
                    SolutionInputFile: "$(Pipeline.Workspace)/release/$(solutionName)_managed.zip"
                    AsyncOperation: true
                    MaxAsyncWaitTime: "120"
                    ActivatePlugins: true
                    OverwriteUnmanagedCustomizations: true
                    HoldingSolution: true
                    UseDeploymentSettingsFile: true
                    DeploymentSettingsFile: "$(Pipeline.Workspace)/release/deployment-settings/prod.json"

                # Apply upgrade: removes old version, promotes holding to active
                - task: PowerPlatformApplySolutionUpgrade@2
                  displayName: "Apply Solution Upgrade"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Prod-ServiceConnection"
                    SolutionName: "$(solutionName)"
                    AsyncOperation: true
                    MaxAsyncWaitTime: "60"

                # Publish to make all changes visible to end users
                - task: PowerPlatformPublishCustomizations@2
                  displayName: "Publish Customizations"
                  inputs:
                    authenticationType: "PowerPlatformSPN"
                    PowerPlatformSPN: "Prod-ServiceConnection"

                # Tag the release in git
                - script: |
                    git tag "v$(solutionVersion)"
                    git push origin "v$(solutionVersion)"
                  displayName: "Tag Release"
```

### Template 3: PR Validation Pipeline

Runs solution checker on pull requests to catch issues before merge.

```yaml
# azure-pipelines/pr-validation.yml
#
# Purpose: Validate solution source on pull requests.
# Trigger: Pull requests targeting main branch.

trigger: none

pr:
  branches:
    include:
      - main
  paths:
    include:
      - src/**

pool:
  vmImage: "windows-latest"

variables:
  - name: solutionName
    value: "ContosoOrders"
  - name: solutionFolder
    value: "$(Build.SourcesDirectory)/src/$(solutionName)"

steps:
  - task: PowerPlatformToolInstaller@2
    displayName: "Install Power Platform CLI"

  # Pack solution from PR source
  - task: PowerPlatformPackSolution@2
    displayName: "Pack Solution for Validation"
    inputs:
      SolutionSourceFolder: "$(solutionFolder)"
      SolutionOutputFile: "$(Build.ArtifactStagingDirectory)/$(solutionName)_validation.zip"
      SolutionType: "Managed"

  # Run solution checker — this is the quality gate for PRs
  - task: PowerPlatformChecker@2
    displayName: "Solution Checker"
    inputs:
      authenticationType: "PowerPlatformSPN"
      PowerPlatformSPN: "Dev-ServiceConnection"
      FilesToAnalyze: "$(Build.ArtifactStagingDirectory)/$(solutionName)_validation.zip"
      RuleSet: "0ad12346-e108-40b8-a956-9a8f95ea18c9"
      Geography: "UnitedStates"
      FailOnPowerAppsCheckerAnalysisError: true
```

---

## GitHub Actions Templates

### Template 4: Export Solution Workflow

```yaml
# .github/workflows/export-solution.yml
#
# Purpose: Export solution from Dev, unpack, and commit to repository.
# Trigger: Manual (workflow_dispatch).
# Prerequisites:
#   - Repository secrets: TENANT_ID, CLIENT_ID, CLIENT_SECRET, DEV_ENVIRONMENT_URL
#   - Repository has Actions write permissions

name: Export Solution from Dev

on:
  workflow_dispatch:
    inputs:
      solution_name:
        description: "Solution unique name"
        required: true
        default: "ContosoOrders"
      commit_message:
        description: "Commit message"
        required: false
        default: "Export solution from Dev"

permissions:
  contents: write

env:
  SOLUTION_NAME: ${{ github.event.inputs.solution_name }}

jobs:
  export:
    runs-on: windows-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      # Verify authentication before doing any work
      - name: Verify Connection
        uses: microsoft/powerplatform-actions/who-am-i@v1
        with:
          environment-url: ${{ secrets.DEV_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}

      # Export unmanaged for source control
      - name: Export Unmanaged Solution
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

      # Export managed for artifact (useful for quick deployment)
      - name: Export Managed Solution
        uses: microsoft/powerplatform-actions/export-solution@v1
        with:
          environment-url: ${{ secrets.DEV_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          solution-name: ${{ env.SOLUTION_NAME }}
          solution-output-file: exports/${{ env.SOLUTION_NAME }}_managed.zip
          managed: true
          run-asynchronously: true

      # Unpack to source-controlled files
      - name: Unpack Solution
        uses: microsoft/powerplatform-actions/unpack-solution@v1
        with:
          solution-file: exports/${{ env.SOLUTION_NAME }}.zip
          solution-folder: src/${{ env.SOLUTION_NAME }}
          solution-type: "Both"
          overwrite-files: true

      # Commit changes to the repository
      - name: Commit and Push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add --all
          git diff --cached --quiet && echo "No changes" && exit 0
          git commit -m "${{ github.event.inputs.commit_message }}"
          git push

      # Upload managed solution as workflow artifact
      - name: Upload Managed Artifact
        uses: actions/upload-artifact@v4
        with:
          name: managed-solution
          path: exports/${{ env.SOLUTION_NAME }}_managed.zip
          retention-days: 30
```

### Template 5: Release Solution Workflow

```yaml
# .github/workflows/release-solution.yml
#
# Purpose: Build managed solution from source and deploy through environments.
# Trigger: Push to main branch (changes in src/ folder).
# Prerequisites:
#   - Repository secrets for each environment
#   - GitHub Environments "Test" and "Production" with protection rules

name: Build and Release Solution

on:
  push:
    branches:
      - main
    paths:
      - "src/**"
      - "deployment-settings/**"

env:
  SOLUTION_NAME: ContosoOrders
  SOLUTION_SOURCE: src/ContosoOrders

jobs:
  # ──────────────────────────────────────────────────
  # Job 1: Build and Validate
  # ──────────────────────────────────────────────────
  build:
    name: Build & Validate
    runs-on: windows-latest
    outputs:
      solution-version: ${{ steps.set-version.outputs.version }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # Generate version from run number
      - name: Set Version
        id: set-version
        run: |
          $version = "1.0.0.${{ github.run_number }}"
          echo "version=$version" >> $env:GITHUB_OUTPUT
          Write-Host "Solution version: $version"
        shell: pwsh

      # Set version in solution source files
      - name: Update Solution Version
        uses: microsoft/powerplatform-actions/set-solution-version@v1
        with:
          solution-version-number: ${{ steps.set-version.outputs.version }}
          solution-folder: ${{ env.SOLUTION_SOURCE }}

      # Pack into managed zip
      - name: Pack Managed Solution
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: ${{ env.SOLUTION_SOURCE }}
          solution-file: build/${{ env.SOLUTION_NAME }}_managed.zip
          solution-type: Managed

      # Validate with solution checker
      - name: Run Solution Checker
        uses: microsoft/powerplatform-actions/check-solution@v1
        with:
          environment-url: ${{ secrets.DEV_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          path: build/${{ env.SOLUTION_NAME }}_managed.zip
          geography: UnitedStates

      # Upload build artifacts
      - name: Upload Solution
        uses: actions/upload-artifact@v4
        with:
          name: solution-artifact
          path: |
            build/${{ env.SOLUTION_NAME }}_managed.zip
            deployment-settings/
          retention-days: 90

  # ──────────────────────────────────────────────────
  # Job 2: Deploy to Test
  # ──────────────────────────────────────────────────
  deploy-test:
    name: Deploy to Test
    needs: build
    runs-on: windows-latest
    environment:
      name: Test
      url: ${{ secrets.TEST_ENVIRONMENT_URL }}
    steps:
      - name: Download Artifacts
        uses: actions/download-artifact@v4
        with:
          name: solution-artifact
          path: artifacts/

      - name: Import to Test
        uses: microsoft/powerplatform-actions/import-solution@v1
        with:
          environment-url: ${{ secrets.TEST_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          solution-file: artifacts/build/${{ env.SOLUTION_NAME }}_managed.zip
          force-overwrite: true
          activate-plugins: true
          run-asynchronously: true
          use-deployment-settings-file: true
          deployment-settings-file: artifacts/deployment-settings/test.json

      - name: Publish Customizations
        uses: microsoft/powerplatform-actions/publish-solution@v1
        with:
          environment-url: ${{ secrets.TEST_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}

  # ──────────────────────────────────────────────────
  # Job 3: Deploy to Production
  # ──────────────────────────────────────────────────
  deploy-prod:
    name: Deploy to Production
    needs: deploy-test
    runs-on: windows-latest
    environment:
      name: Production
      url: ${{ secrets.PROD_ENVIRONMENT_URL }}
    steps:
      - name: Download Artifacts
        uses: actions/download-artifact@v4
        with:
          name: solution-artifact
          path: artifacts/

      # Import as holding — does not immediately replace the existing version
      - name: Import as Holding Solution
        uses: microsoft/powerplatform-actions/import-solution@v1
        with:
          environment-url: ${{ secrets.PROD_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          solution-file: artifacts/build/${{ env.SOLUTION_NAME }}_managed.zip
          import-as-holding: true
          force-overwrite: true
          activate-plugins: true
          run-asynchronously: true
          use-deployment-settings-file: true
          deployment-settings-file: artifacts/deployment-settings/prod.json

      # Apply upgrade — removes old version, promotes holding to active
      - name: Apply Upgrade
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

      # Create a GitHub release for the deployed version
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ needs.build.outputs.solution-version }}
          name: ${{ env.SOLUTION_NAME }} v${{ needs.build.outputs.solution-version }}
          body: |
            Deployed ${{ env.SOLUTION_NAME }} version ${{ needs.build.outputs.solution-version }} to Production.
            Build: ${{ github.run_number }}
            Commit: ${{ github.sha }}
          files: artifacts/build/${{ env.SOLUTION_NAME }}_managed.zip
```

### Template 6: PR Validation Workflow

```yaml
# .github/workflows/pr-validation.yml
#
# Purpose: Validate solution changes on pull requests.
# Trigger: Pull requests to main that change src/ files.

name: PR Validation

on:
  pull_request:
    branches:
      - main
    paths:
      - "src/**"

env:
  SOLUTION_NAME: ContosoOrders
  SOLUTION_SOURCE: src/ContosoOrders

jobs:
  validate:
    name: Validate Solution
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # Pack from source to validate it can be built
      - name: Pack Solution
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: ${{ env.SOLUTION_SOURCE }}
          solution-file: build/${{ env.SOLUTION_NAME }}_validation.zip
          solution-type: Managed

      # Run solution checker to catch issues before merge
      - name: Solution Checker
        uses: microsoft/powerplatform-actions/check-solution@v1
        with:
          environment-url: ${{ secrets.DEV_ENVIRONMENT_URL }}
          tenant-id: ${{ secrets.TENANT_ID }}
          app-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          path: build/${{ env.SOLUTION_NAME }}_validation.zip
          geography: UnitedStates

      # Post checker results as PR comment
      - name: Post Results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const checkerDir = './build';
            let body = '## Solution Checker Results\n\n';
            body += 'Solution checker analysis completed. ';
            body += 'Check the Actions tab for detailed results.\n';
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```
