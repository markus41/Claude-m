# CI/CD Patterns — Azure DevOps, GitHub Actions, Validation Scripts, and Environment Configs

This reference provides complete CI/CD pipeline implementations for Microsoft Fabric using Azure DevOps and GitHub Actions, artifact validation scripts, and environment configuration management patterns.

---

## Azure DevOps — Complete Pipeline

```yaml
# azure-pipelines.yml
# Triggered on commits to dev and main branches that touch workspace files

trigger:
  branches:
    include: [main, dev, 'release/*']
  paths:
    include: ['workspaces/**', 'scripts/**']
  tags:
    include: ['v*']

pr:
  branches:
    include: [main, dev]
  paths:
    include: ['workspaces/**']

variables:
  - group: fabric-deployment-secrets  # Contains: FABRIC_CLIENT_ID, FABRIC_CLIENT_SECRET, FABRIC_TENANT_ID
  - name: pythonVersion
    value: '3.11'
  - name: devWorkspaceId
    value: $(DEV_WORKSPACE_GUID)
  - name: testWorkspaceId
    value: $(TEST_WORKSPACE_GUID)
  - name: prodWorkspaceId
    value: $(PROD_WORKSPACE_GUID)
  - name: pipelineId
    value: $(DEPLOYMENT_PIPELINE_GUID)

stages:
  # ── Stage 1: Validate ──────────────────────────────────────────────────────
  - stage: Validate
    displayName: 'Validate Artifacts'
    pool: { vmImage: 'ubuntu-latest' }
    jobs:
      - job: ArtifactValidation
        displayName: 'Artifact structure and best practices'
        steps:
          - task: UsePythonVersion@0
            inputs: { versionSpec: '$(pythonVersion)' }

          - script: pip install requests pyyaml jsonschema
            displayName: 'Install validation dependencies'

          - task: PythonScript@0
            displayName: 'Validate .platform files'
            inputs:
              scriptPath: 'scripts/validate-platform-files.py'
              arguments: '--path workspaces'

          - task: PythonScript@0
            displayName: 'Check for hardcoded connection strings'
            inputs:
              scriptPath: 'scripts/check-hardcoded-secrets.py'
              arguments: '--path workspaces'

          - task: PythonScript@0
            displayName: 'Validate notebook cell counts and size'
            inputs:
              scriptPath: 'scripts/validate-notebooks.py'
              arguments: '--path workspaces --max-size-mb 10'

  # ── Stage 2: Sync to Dev ───────────────────────────────────────────────────
  - stage: SyncDev
    displayName: 'Sync Dev Workspace'
    dependsOn: Validate
    condition: and(succeeded(), not(eq(variables['Build.Reason'], 'PullRequest')), in(variables['Build.SourceBranch'], 'refs/heads/dev', 'refs/heads/main'))
    pool: { vmImage: 'ubuntu-latest' }
    jobs:
      - deployment: SyncDevWorkspace
        displayName: 'Update Dev workspace from Git'
        environment: 'Development'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: UsePythonVersion@0
                  inputs: { versionSpec: '$(pythonVersion)' }

                - script: pip install azure-identity requests
                  displayName: 'Install dependencies'

                - task: PythonScript@0
                  displayName: 'Update Dev workspace from Git'
                  env:
                    FABRIC_TENANT_ID: $(FABRIC_TENANT_ID)
                    FABRIC_CLIENT_ID: $(FABRIC_CLIENT_ID)
                    FABRIC_CLIENT_SECRET: $(FABRIC_CLIENT_SECRET)
                  inputs:
                    scriptPath: 'scripts/update-workspace-from-git.py'
                    arguments: >
                      --workspace-id $(devWorkspaceId)
                      --commit-hash $(Build.SourceVersion)
                      --conflict-resolution PreferRemote

  # ── Stage 3: Promote Dev → Test ────────────────────────────────────────────
  - stage: PromoteToTest
    displayName: 'Dev → Test Promotion'
    dependsOn: SyncDev
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    pool: { vmImage: 'ubuntu-latest' }
    jobs:
      - deployment: PromoteDevToTest
        displayName: 'Deploy Dev to Test'
        environment: 'Test'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: UsePythonVersion@0
                  inputs: { versionSpec: '$(pythonVersion)' }
                - script: pip install azure-identity requests
                  displayName: 'Install dependencies'
                - task: PythonScript@0
                  displayName: 'Deploy Dev → Test'
                  env:
                    FABRIC_TENANT_ID: $(FABRIC_TENANT_ID)
                    FABRIC_CLIENT_ID: $(FABRIC_CLIENT_ID)
                    FABRIC_CLIENT_SECRET: $(FABRIC_CLIENT_SECRET)
                  inputs:
                    scriptPath: 'scripts/promote.py'
                    arguments: >
                      --pipeline-id $(pipelineId)
                      --source-stage 0
                      --note "CI/CD: $(Build.BuildNumber) — $(Build.SourceVersionMessage)"

  # ── Stage 4: Promote Test → Prod (manual gate) ────────────────────────────
  - stage: PromoteToProd
    displayName: 'Test → Production Promotion'
    dependsOn: PromoteToTest
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    pool: { vmImage: 'ubuntu-latest' }
    jobs:
      - deployment: PromoteTestToProd
        displayName: 'Deploy Test to Production'
        environment: 'Production'   # Requires manual approval in Azure DevOps environments
        strategy:
          runOnce:
            deploy:
              steps:
                - task: UsePythonVersion@0
                  inputs: { versionSpec: '$(pythonVersion)' }
                - script: pip install azure-identity requests
                  displayName: 'Install dependencies'
                - task: PythonScript@0
                  displayName: 'Deploy Test → Production'
                  env:
                    FABRIC_TENANT_ID: $(FABRIC_TENANT_ID)
                    FABRIC_CLIENT_ID: $(FABRIC_CLIENT_ID)
                    FABRIC_CLIENT_SECRET: $(FABRIC_CLIENT_SECRET)
                  inputs:
                    scriptPath: 'scripts/promote.py'
                    arguments: >
                      --pipeline-id $(pipelineId)
                      --source-stage 1
                      --note "PROD: $(Build.BuildNumber) — approved by $(Build.RequestedFor)"
```

---

## GitHub Actions — Complete Workflow

```yaml
# .github/workflows/fabric-cicd.yml

name: Fabric CI/CD

on:
  push:
    branches: [main, dev]
    paths:
      - 'workspaces/**'
      - 'scripts/**'
  pull_request:
    branches: [main, dev]
    paths:
      - 'workspaces/**'

env:
  PYTHON_VERSION: '3.11'

jobs:
  validate:
    name: Validate Artifacts
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: pip install requests pyyaml jsonschema azure-identity

      - name: Validate .platform files
        run: python scripts/validate-platform-files.py --path workspaces

      - name: Check for hardcoded secrets
        run: python scripts/check-hardcoded-secrets.py --path workspaces

      - name: Validate notebooks
        run: python scripts/validate-notebooks.py --path workspaces --max-size-mb 10

  sync-dev:
    name: Sync Dev Workspace
    runs-on: ubuntu-latest
    needs: validate
    if: github.ref == 'refs/heads/dev' && github.event_name == 'push'
    environment: Development
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '${{ env.PYTHON_VERSION }}' }
      - run: pip install azure-identity requests
      - name: Update Dev workspace from Git
        env:
          FABRIC_TENANT_ID: ${{ secrets.FABRIC_TENANT_ID }}
          FABRIC_CLIENT_ID: ${{ secrets.FABRIC_CLIENT_ID }}
          FABRIC_CLIENT_SECRET: ${{ secrets.FABRIC_CLIENT_SECRET }}
        run: |
          python scripts/update-workspace-from-git.py \
            --workspace-id ${{ vars.DEV_WORKSPACE_ID }} \
            --commit-hash ${{ github.sha }} \
            --conflict-resolution PreferRemote

  promote-to-test:
    name: Dev → Test
    runs-on: ubuntu-latest
    needs: sync-dev
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: Test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '${{ env.PYTHON_VERSION }}' }
      - run: pip install azure-identity requests
      - name: Deploy Dev → Test
        env:
          FABRIC_TENANT_ID: ${{ secrets.FABRIC_TENANT_ID }}
          FABRIC_CLIENT_ID: ${{ secrets.FABRIC_CLIENT_ID }}
          FABRIC_CLIENT_SECRET: ${{ secrets.FABRIC_CLIENT_SECRET }}
        run: |
          python scripts/promote.py \
            --pipeline-id ${{ vars.PIPELINE_ID }} \
            --source-stage 0 \
            --note "GHA: ${{ github.run_number }} — ${{ github.event.head_commit.message }}"

  promote-to-prod:
    name: Test → Production
    runs-on: ubuntu-latest
    needs: promote-to-test
    if: github.ref == 'refs/heads/main'
    environment: Production    # Requires manual approval in GitHub Environments
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '${{ env.PYTHON_VERSION }}' }
      - run: pip install azure-identity requests
      - name: Deploy Test → Production
        env:
          FABRIC_TENANT_ID: ${{ secrets.FABRIC_TENANT_ID }}
          FABRIC_CLIENT_ID: ${{ secrets.FABRIC_CLIENT_ID }}
          FABRIC_CLIENT_SECRET: ${{ secrets.FABRIC_CLIENT_SECRET }}
        run: |
          python scripts/promote.py \
            --pipeline-id ${{ vars.PIPELINE_ID }} \
            --source-stage 1 \
            --note "PROD: GHA run ${{ github.run_number }}"
```

---

## Validation Scripts

### validate-platform-files.py

```python
#!/usr/bin/env python3
"""Validate Fabric .platform files in a workspace directory."""
import os
import json
import argparse
import sys

REQUIRED_METADATA_FIELDS = ["type", "displayName"]
SUPPORTED_TYPES = [
    "Notebook", "Lakehouse", "Warehouse", "DataPipeline",
    "SemanticModel", "Report", "KQLDatabase", "Eventstream",
    "DataflowsGen2", "Environment"
]

def validate_platform_file(file_path: str) -> list:
    """Return list of issues with a .platform file."""
    issues = []
    try:
        with open(file_path) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return [f"Invalid JSON: {e}"]

    # Check required fields
    metadata = data.get("metadata", {})
    for field in REQUIRED_METADATA_FIELDS:
        if not metadata.get(field):
            issues.append(f"Missing metadata.{field}")

    # Check type is supported
    item_type = metadata.get("type")
    if item_type and item_type not in SUPPORTED_TYPES:
        issues.append(f"Unknown item type: {item_type}")

    # Check logicalId is present and is a valid GUID format
    config = data.get("config", {})
    logical_id = config.get("logicalId")
    if not logical_id:
        issues.append("Missing config.logicalId")

    return issues

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", required=True, help="Root directory to scan")
    args = parser.parse_args()

    all_issues = []
    for root, dirs, files in os.walk(args.path):
        for filename in files:
            if filename == ".platform":
                file_path = os.path.join(root, filename)
                issues = validate_platform_file(file_path)
                if issues:
                    for issue in issues:
                        all_issues.append(f"{file_path}: {issue}")
                        print(f"ERROR: {file_path}: {issue}")

    if all_issues:
        print(f"\nValidation FAILED: {len(all_issues)} issues found")
        sys.exit(1)
    else:
        print("All .platform files valid")

if __name__ == "__main__":
    main()
```

### check-hardcoded-secrets.py

```python
#!/usr/bin/env python3
"""Detect hardcoded connection strings and secrets in workspace artifacts."""
import os
import re
import argparse
import sys

SENSITIVE_PATTERNS = [
    (r'(?i)server\s*=\s*[\'"]?[\w.-]+\.database\.windows\.net', 'Hardcoded Azure SQL server'),
    (r'(?i)AccountKey=[A-Za-z0-9+/=]{20,}', 'Storage account key'),
    (r'(?i)SharedAccessSignature=sv=', 'Storage SAS token'),
    (r'(?i)"password"\s*:\s*"[^"]{8,}"', 'Potential password in JSON'),
    (r'(?i)client_secret\s*=\s*[\'"][^\'"]{10,}', 'Client secret'),
    (r'(?i)Bearer\s+eyJ[A-Za-z0-9._-]+', 'Bearer token'),
]

EXCLUDE_PATHS = ['.git', '__pycache__', '.venv', 'node_modules']
SCAN_EXTENSIONS = {'.py', '.json', '.sql', '.yml', '.yaml', '.m', '.pq', '.ipynb'}

def scan_file(file_path: str) -> list:
    issues = []
    try:
        with open(file_path, encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception:
        return issues

    for pattern, label in SENSITIVE_PATTERNS:
        if re.search(pattern, content):
            issues.append(f"{label} in {file_path}")
    return issues

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", required=True)
    args = parser.parse_args()

    all_issues = []
    for root, dirs, files in os.walk(args.path):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_PATHS]
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in SCAN_EXTENSIONS:
                file_path = os.path.join(root, filename)
                issues = scan_file(file_path)
                all_issues.extend(issues)
                for issue in issues:
                    print(f"SECRET DETECTED: {issue}")

    if all_issues:
        print(f"\nSecurity scan FAILED: {len(all_issues)} potential secrets found")
        sys.exit(1)
    else:
        print("No hardcoded secrets detected")

if __name__ == "__main__":
    main()
```

---

## Environment Configuration Management

### Environment Config Table (Lakehouse)

Store environment-specific configuration in a Lakehouse Delta table:

```python
# Create the environment config table (run once in setup notebook)
from pyspark.sql import Row

config_data = [
    Row(environment="dev",  key="source_db", value="analytics-dev.database.windows.net/SalesDB"),
    Row(environment="dev",  key="refresh_cron", value="0 */4 * * *"),
    Row(environment="dev",  key="log_level", value="DEBUG"),
    Row(environment="test", key="source_db", value="analytics-test.database.windows.net/SalesDB"),
    Row(environment="test", key="refresh_cron", value="0 6 * * *"),
    Row(environment="test", key="log_level", value="INFO"),
    Row(environment="prod", key="source_db", value="analytics-prod.database.windows.net/SalesDB"),
    Row(environment="prod", key="refresh_cron", value="0 5 * * *"),
    Row(environment="prod", key="log_level", value="WARNING"),
]

config_df = spark.createDataFrame(config_data)
config_df.write.format("delta").mode("overwrite").saveAsTable("config.EnvironmentConfig")
```

### Read Config in Notebooks

```python
# In any Fabric notebook — read env config
import sempy.fabric as fabric

# Determine current environment from workspace name
workspace_name = fabric.get_workspace_settings()["name"]
if "prod" in workspace_name.lower():
    env = "prod"
elif "test" in workspace_name.lower():
    env = "test"
else:
    env = "dev"

# Load config
config_df = spark.read.format("delta").table("config.EnvironmentConfig")
config = {row["key"]: row["value"] for row in config_df.filter(f"environment = '{env}'").collect()}

SOURCE_DB = config["source_db"]
LOG_LEVEL = config["log_level"]
```

---

## Common Gotchas

**Gotcha: OAuth tokens expire mid-pipeline**
Long-running deployments (> 1 hour) may fail if the initial OAuth token expires. Use `ClientSecretCredential` which automatically refreshes tokens:
```python
from azure.identity import ClientSecretCredential
cred = ClientSecretCredential(tenant_id, client_id, client_secret)
# Call .get_token() immediately before each API call, not once at the start
token = cred.get_token("https://api.fabric.microsoft.com/.default").token
```

**Gotcha: Deployment pipeline requires workspace with capacity**
Workspaces without a Fabric capacity assigned cannot participate in deployment pipelines. Assign the capacity before creating the pipeline or assigning workspaces to stages.

**Gotcha: Git commit with no changes returns 400**
If the workspace has no changes relative to Git, the commitToGit API returns a 400 error ("No changes to commit"). Handle this in scripts:
```python
status_resp = requests.get(f".../git/status", headers=headers)
if not status_resp.json().get("changes"):
    print("No changes to commit — skipping")
    sys.exit(0)
```

**Pattern: PR-triggered validation only (no deployment)**
In the pipeline/workflow, check `github.event_name == 'pull_request'` (GitHub) or `Build.Reason == 'PullRequest'` (ADO) to skip deployment stages and only run validation on PRs.
