# Pipeline Templates

Ready-to-use YAML pipeline templates for common Azure DevOps scenarios.
Copy-paste into your repository and customize variables for your project.

---

## Template 1: Node.js CI

Full CI pipeline for Node.js projects with caching, linting, testing, and artifact publishing.

```yaml
# azure-pipelines-nodejs.yml
trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: "ubuntu-latest"

variables:
  nodeVersion: "20.x"
  npmCacheFolder: $(Pipeline.Workspace)/.npm

stages:
  - stage: Build
    displayName: "Build & Test"
    jobs:
      - job: BuildAndTest
        displayName: "Node.js CI"
        steps:
          - task: NodeTool@0
            displayName: "Install Node.js $(nodeVersion)"
            inputs:
              versionSpec: $(nodeVersion)

          - task: Cache@2
            displayName: "Cache npm packages"
            inputs:
              key: 'npm | "$(Agent.OS)" | package-lock.json'
              restoreKeys: |
                npm | "$(Agent.OS)"
              path: $(npmCacheFolder)

          - script: npm ci
            displayName: "Install dependencies"

          - script: npm run lint
            displayName: "Run ESLint"

          - script: npm run test -- --ci --coverage --reporters=default --reporters=jest-junit
            displayName: "Run tests"
            env:
              JEST_JUNIT_OUTPUT_DIR: $(System.DefaultWorkingDirectory)/test-results

          - task: PublishTestResults@2
            displayName: "Publish test results"
            condition: succeededOrFailed()
            inputs:
              testResultsFormat: JUnit
              testResultsFiles: "test-results/junit.xml"
              mergeTestResults: true
              testRunTitle: "Node.js Unit Tests"

          - task: PublishCodeCoverageResults@2
            displayName: "Publish code coverage"
            condition: succeededOrFailed()
            inputs:
              summaryFileLocation: "$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml"

          - script: npm run build
            displayName: "Build application"

          - task: PublishPipelineArtifact@1
            displayName: "Publish build artifact"
            inputs:
              targetPath: "$(System.DefaultWorkingDirectory)/dist"
              artifact: "app-build"
              publishLocation: "pipeline"
```

---

## Template 2: .NET Build & Test

CI pipeline for .NET projects with restore, build, test, SonarQube analysis, and artifact publishing.

```yaml
# azure-pipelines-dotnet.yml
trigger:
  branches:
    include:
      - main

pr:
  branches:
    include:
      - main

pool:
  vmImage: "ubuntu-latest"

variables:
  buildConfiguration: "Release"
  dotnetVersion: "8.x"
  solution: "**/*.sln"
  sonarProjectKey: "$(Build.Repository.Name)"

stages:
  - stage: Build
    displayName: "Build, Test & Analyze"
    jobs:
      - job: BuildTestAnalyze
        displayName: ".NET Build"
        steps:
          - task: UseDotNet@2
            displayName: "Install .NET SDK $(dotnetVersion)"
            inputs:
              packageType: sdk
              version: $(dotnetVersion)

          - task: DotNetCoreCLI@2
            displayName: "Restore NuGet packages"
            inputs:
              command: restore
              projects: $(solution)
              feedsToUse: config
              nugetConfigPath: NuGet.config

          - task: SonarQubePrepare@6
            displayName: "Prepare SonarQube analysis"
            inputs:
              SonarQube: "SonarQube-ServiceConnection"
              scannerMode: "MSBuild"
              projectKey: $(sonarProjectKey)
              projectName: $(Build.Repository.Name)
              extraProperties: |
                sonar.cs.opencover.reportsPaths=$(Agent.TempDirectory)/**/coverage.opencover.xml

          - task: DotNetCoreCLI@2
            displayName: "Build solution"
            inputs:
              command: build
              projects: $(solution)
              arguments: "--configuration $(buildConfiguration) --no-restore"

          - task: DotNetCoreCLI@2
            displayName: "Run tests"
            inputs:
              command: test
              projects: "**/*Tests/*.csproj"
              arguments: >-
                --configuration $(buildConfiguration)
                --no-build
                --collect:"XPlat Code Coverage"
                --logger trx
                --results-directory $(Agent.TempDirectory)/TestResults
              publishTestResults: true

          - task: SonarQubeAnalyze@6
            displayName: "Run SonarQube analysis"

          - task: SonarQubePublish@6
            displayName: "Publish SonarQube results"
            inputs:
              pollingTimeoutSec: "300"

          - task: DotNetCoreCLI@2
            displayName: "Publish application"
            inputs:
              command: publish
              publishWebProjects: true
              arguments: "--configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)"
              zipAfterPublish: true

          - task: PublishPipelineArtifact@1
            displayName: "Publish artifact"
            inputs:
              targetPath: "$(Build.ArtifactStagingDirectory)"
              artifact: "dotnet-app"
              publishLocation: "pipeline"
```

---

## Template 3: Python Package

CI pipeline for Python packages with pip, pytest, mypy, wheel building, and Azure Artifacts publishing.

```yaml
# azure-pipelines-python.yml
trigger:
  branches:
    include:
      - main
  tags:
    include:
      - "v*"

pr:
  branches:
    include:
      - main

pool:
  vmImage: "ubuntu-latest"

variables:
  pythonVersion: "3.12"
  feedName: "my-python-feed"

stages:
  - stage: Validate
    displayName: "Lint & Test"
    jobs:
      - job: LintAndTest
        displayName: "Python CI"
        steps:
          - task: UsePythonVersion@0
            displayName: "Use Python $(pythonVersion)"
            inputs:
              versionSpec: $(pythonVersion)

          - script: |
              python -m pip install --upgrade pip
              pip install -r requirements-dev.txt
            displayName: "Install dependencies"

          - script: |
              python -m ruff check src/ tests/
            displayName: "Run Ruff linter"

          - script: |
              python -m mypy src/ --ignore-missing-imports
            displayName: "Run mypy type checking"

          - script: |
              python -m pytest tests/ \
                --junitxml=test-results/results.xml \
                --cov=src \
                --cov-report=xml:coverage/coverage.xml \
                --cov-report=html:coverage/htmlcov
            displayName: "Run pytest"

          - task: PublishTestResults@2
            displayName: "Publish test results"
            condition: succeededOrFailed()
            inputs:
              testResultsFormat: JUnit
              testResultsFiles: "test-results/results.xml"
              testRunTitle: "Python Unit Tests"

          - task: PublishCodeCoverageResults@2
            displayName: "Publish code coverage"
            condition: succeededOrFailed()
            inputs:
              summaryFileLocation: "coverage/coverage.xml"

  - stage: Publish
    displayName: "Build & Publish Package"
    dependsOn: Validate
    condition: and(succeeded(), startsWith(variables['Build.SourceBranch'], 'refs/tags/v'))
    jobs:
      - job: PublishPackage
        displayName: "Build wheel & publish"
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: $(pythonVersion)

          - script: |
              pip install build twine
              python -m build
            displayName: "Build sdist and wheel"

          - task: TwineAuthenticate@1
            displayName: "Authenticate to Azure Artifacts"
            inputs:
              artifactFeed: $(feedName)

          - script: |
              python -m twine upload \
                --repository $(feedName) \
                --config-file $(PYPIRC_PATH) \
                dist/*
            displayName: "Publish to Azure Artifacts"
```

---

## Template 4: Docker Build & Push

Build a multi-stage Docker image and push to Azure Container Registry.

```yaml
# azure-pipelines-docker.yml
trigger:
  branches:
    include:
      - main

pr:
  branches:
    include:
      - main

pool:
  vmImage: "ubuntu-latest"

variables:
  acrServiceConnection: "ACR-ServiceConnection"
  acrName: "myregistry.azurecr.io"
  imageName: "myapp"
  dockerfilePath: "$(Build.SourcesDirectory)/Dockerfile"

stages:
  - stage: Build
    displayName: "Build & Push"
    jobs:
      - job: DockerBuild
        displayName: "Docker Build"
        steps:
          - task: Docker@2
            displayName: "Build Docker image"
            inputs:
              containerRegistry: $(acrServiceConnection)
              repository: $(imageName)
              command: build
              Dockerfile: $(dockerfilePath)
              buildContext: "$(Build.SourcesDirectory)"
              tags: |
                $(Build.BuildId)
                latest
              arguments: >-
                --build-arg BUILD_NUMBER=$(Build.BuildId)
                --build-arg COMMIT_SHA=$(Build.SourceVersion)

          - task: Docker@2
            displayName: "Push to ACR"
            condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
            inputs:
              containerRegistry: $(acrServiceConnection)
              repository: $(imageName)
              command: push
              tags: |
                $(Build.BuildId)
                latest

          - script: |
              echo "##vso[task.setvariable variable=imageTag;isOutput=true]$(Build.BuildId)"
            displayName: "Set image tag output"
            name: setImageTag
```

---

## Template 5: Terraform Plan & Apply

Infrastructure-as-code pipeline with plan on PR, apply on merge, remote state in Azure Storage.

```yaml
# azure-pipelines-terraform.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infra/**

pr:
  branches:
    include:
      - main
  paths:
    include:
      - infra/**

pool:
  vmImage: "ubuntu-latest"

variables:
  azureServiceConnection: "Azure-ServiceConnection"
  terraformVersion: "1.9.x"
  workingDirectory: "$(System.DefaultWorkingDirectory)/infra"
  backendResourceGroup: "rg-terraform-state"
  backendStorageAccount: "stterraformstate"
  backendContainer: "tfstate"
  backendKey: "$(Build.Repository.Name).tfstate"

stages:
  - stage: Plan
    displayName: "Terraform Plan"
    jobs:
      - job: TerraformPlan
        displayName: "Init & Plan"
        steps:
          - task: TerraformInstaller@1
            displayName: "Install Terraform $(terraformVersion)"
            inputs:
              terraformVersion: $(terraformVersion)

          - task: TerraformTaskV4@4
            displayName: "Terraform Init"
            inputs:
              provider: "azurerm"
              command: "init"
              workingDirectory: $(workingDirectory)
              backendServiceArm: $(azureServiceConnection)
              backendAzureRmResourceGroupName: $(backendResourceGroup)
              backendAzureRmStorageAccountName: $(backendStorageAccount)
              backendAzureRmContainerName: $(backendContainer)
              backendAzureRmKey: $(backendKey)

          - task: TerraformTaskV4@4
            displayName: "Terraform Validate"
            inputs:
              provider: "azurerm"
              command: "validate"
              workingDirectory: $(workingDirectory)

          - task: TerraformTaskV4@4
            displayName: "Terraform Plan"
            inputs:
              provider: "azurerm"
              command: "plan"
              workingDirectory: $(workingDirectory)
              environmentServiceNameAzureRM: $(azureServiceConnection)
              commandOptions: "-out=tfplan -input=false"

          - task: PublishPipelineArtifact@1
            displayName: "Publish plan artifact"
            inputs:
              targetPath: "$(workingDirectory)/tfplan"
              artifact: "terraform-plan"
              publishLocation: "pipeline"

  - stage: Apply
    displayName: "Terraform Apply"
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: TerraformApply
        displayName: "Apply Infrastructure"
        environment: "production-infra"
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self

                - task: TerraformInstaller@1
                  displayName: "Install Terraform $(terraformVersion)"
                  inputs:
                    terraformVersion: $(terraformVersion)

                - task: DownloadPipelineArtifact@2
                  displayName: "Download plan artifact"
                  inputs:
                    buildType: "current"
                    artifactName: "terraform-plan"
                    targetPath: "$(workingDirectory)"

                - task: TerraformTaskV4@4
                  displayName: "Terraform Init"
                  inputs:
                    provider: "azurerm"
                    command: "init"
                    workingDirectory: $(workingDirectory)
                    backendServiceArm: $(azureServiceConnection)
                    backendAzureRmResourceGroupName: $(backendResourceGroup)
                    backendAzureRmStorageAccountName: $(backendStorageAccount)
                    backendAzureRmContainerName: $(backendContainer)
                    backendAzureRmKey: $(backendKey)

                - task: TerraformTaskV4@4
                  displayName: "Terraform Apply"
                  inputs:
                    provider: "azurerm"
                    command: "apply"
                    workingDirectory: $(workingDirectory)
                    environmentServiceNameAzureRM: $(azureServiceConnection)
                    commandOptions: "tfplan"
```

---

## Template 6: Multi-Stage with Approvals

Full multi-stage pipeline with build, test, staging deploy, and production deploy including environment approvals and deployment strategies.

```yaml
# azure-pipelines-multistage.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: "ubuntu-latest"

variables:
  - group: "shared-variables"
  - name: imageName
    value: "myapp"

stages:
  # ── Stage 1: Build ──────────────────────────────────────────────
  - stage: Build
    displayName: "Build"
    jobs:
      - job: BuildApp
        displayName: "Build Application"
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: sdk
              version: "8.x"

          - task: DotNetCoreCLI@2
            displayName: "Restore"
            inputs:
              command: restore
              projects: "**/*.csproj"

          - task: DotNetCoreCLI@2
            displayName: "Build"
            inputs:
              command: build
              projects: "**/*.csproj"
              arguments: "--configuration Release --no-restore"

          - task: DotNetCoreCLI@2
            displayName: "Publish"
            inputs:
              command: publish
              publishWebProjects: true
              arguments: "--configuration Release --output $(Build.ArtifactStagingDirectory)"
              zipAfterPublish: true

          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: "$(Build.ArtifactStagingDirectory)"
              artifact: "app-package"

  # ── Stage 2: Test ──────────────────────────────────────────────
  - stage: Test
    displayName: "Integration Tests"
    dependsOn: Build
    jobs:
      - job: IntegrationTests
        displayName: "Run Integration Tests"
        variables:
          - group: "test-variables"
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: sdk
              version: "8.x"

          - task: DotNetCoreCLI@2
            displayName: "Run integration tests"
            inputs:
              command: test
              projects: "**/*IntegrationTests*.csproj"
              arguments: "--configuration Release --logger trx"
              publishTestResults: true

  # ── Stage 3: Staging (Rolling Deploy) ──────────────────────────
  - stage: Staging
    displayName: "Deploy to Staging"
    dependsOn: Test
    variables:
      - group: "staging-variables"
    jobs:
      - deployment: DeployStaging
        displayName: "Staging Deployment"
        environment: "staging"
        strategy:
          rolling:
            maxParallel: 2
            deploy:
              steps:
                - task: DownloadPipelineArtifact@2
                  inputs:
                    buildType: current
                    artifactName: "app-package"
                    targetPath: "$(Pipeline.Workspace)/app-package"

                - task: AzureWebApp@1
                  displayName: "Deploy to App Service (Staging)"
                  inputs:
                    azureSubscription: "Azure-ServiceConnection"
                    appType: webAppLinux
                    appName: "$(stagingAppName)"
                    package: "$(Pipeline.Workspace)/app-package/**/*.zip"
                    deploymentMethod: zipDeploy

      - job: SmokeTest
        displayName: "Smoke Tests"
        dependsOn: DeployStaging
        steps:
          - script: |
              response=$(curl -s -o /dev/null -w "%{http_code}" "https://$(stagingAppName).azurewebsites.net/health")
              if [ "$response" != "200" ]; then
                echo "##vso[task.logissue type=error]Health check failed with status $response"
                exit 1
              fi
              echo "Health check passed"
            displayName: "Health check"

  # ── Stage 4: Production (Canary Deploy) ────────────────────────
  - stage: Production
    displayName: "Deploy to Production"
    dependsOn: Staging
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    variables:
      - group: "production-variables"
    jobs:
      - deployment: DeployProduction
        displayName: "Production Deployment"
        # Requires manual approval configured on the environment
        environment: "production"
        strategy:
          canary:
            increments: [10, 50]
            deploy:
              steps:
                - task: DownloadPipelineArtifact@2
                  inputs:
                    buildType: current
                    artifactName: "app-package"
                    targetPath: "$(Pipeline.Workspace)/app-package"

                - task: AzureWebApp@1
                  displayName: "Deploy to App Service (Production)"
                  inputs:
                    azureSubscription: "Azure-ServiceConnection"
                    appType: webAppLinux
                    appName: "$(productionAppName)"
                    package: "$(Pipeline.Workspace)/app-package/**/*.zip"
                    deploymentMethod: zipDeploy

            on:
              success:
                steps:
                  - script: |
                      echo "Canary increment succeeded — promoting"
                    displayName: "Canary success"
              failure:
                steps:
                  - script: |
                      echo "##vso[task.logissue type=error]Canary increment failed — rolling back"
                    displayName: "Canary failure"

      - job: PostDeployValidation
        displayName: "Post-Deploy Validation"
        dependsOn: DeployProduction
        steps:
          - script: |
              response=$(curl -s -o /dev/null -w "%{http_code}" "https://$(productionAppName).azurewebsites.net/health")
              if [ "$response" != "200" ]; then
                echo "##vso[task.logissue type=error]Production health check failed"
                exit 1
              fi
              echo "Production health check passed"
            displayName: "Production health check"

          - script: |
              echo "Deployment completed successfully"
              echo "Image: $(imageName):$(Build.BuildId)"
              echo "Environment: Production"
            displayName: "Deployment summary"
```

### Environment Approval Configuration

Configure approvals on the `production` environment via **Project Settings > Environments > production > Approvals and checks**:

| Check type | Configuration |
|---|---|
| Approvals | Add required approvers (e.g., release managers group) |
| Business hours | Restrict deployments to business hours |
| Exclusive lock | Prevent concurrent production deployments |
| Branch control | Allow only `refs/heads/main` |
| Template validation | Require approved YAML templates |

---

## Variable Group Setup

Create variable groups referenced by the templates above:

```bash
# Shared variables
az pipelines variable-group create \
  --name "shared-variables" \
  --variables imageName=myapp

# Environment-specific variable groups
az pipelines variable-group create \
  --name "staging-variables" \
  --variables stagingAppName=myapp-staging

az pipelines variable-group create \
  --name "production-variables" \
  --variables productionAppName=myapp-prod

# Link Key Vault secrets
az pipelines variable-group create \
  --name "keyvault-secrets" \
  --authorize true \
  --type Vsts \
  --variables dummy=placeholder

# Update to link Azure Key Vault
az pipelines variable-group update \
  --group-id <id> \
  --type AzureKeyVault \
  --azure-key-vault-name my-keyvault
```
