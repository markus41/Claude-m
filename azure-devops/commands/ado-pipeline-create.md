---
name: ado-pipeline-create
description: Generate a YAML pipeline definition for an Azure DevOps project
argument-hint: "<pipeline-name> --type node|dotnet|python|docker [--stages build,test,deploy] [--triggers ci,pr,schedule] [--environments dev,staging,prod]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
---

# Generate Azure DevOps Pipeline

Generate a multi-stage YAML pipeline definition based on the project type, with triggers, environments, approvals, and variable groups.

## Prerequisites

- Azure DevOps project with a Git repository
- Service connections configured for deployment targets (if using deploy stage)

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<pipeline-name>` | Yes | Display name for the pipeline |
| `--type` | Yes | Project type: `node`, `dotnet`, `python`, `docker` |
| `--stages` | No | Comma-separated stages (default: `build,test`) |
| `--triggers` | No | Trigger types: `ci`, `pr`, `schedule`, `pipeline` (default: `ci,pr`) |
| `--environments` | No | Deployment environments: `dev`, `staging`, `prod` |
| `--variable-groups` | No | Comma-separated variable group names to link |
| `--service-connection` | No | Service connection name for deploy stages |
| `--extends-template` | No | Path to a template to extend from |

## Instructions

1. **Determine project type** from `--type` flag.

2. **Generate trigger configuration**:
   - **CI trigger**: `trigger: { branches: { include: [main] }, paths: { exclude: [docs/*, README.md] } }`
   - **PR trigger**: `pr: { branches: { include: [main, release/*] } }`
   - **Scheduled**: `schedules: [{ cron: "0 6 * * 1-5", displayName: "Weekday build", branches: { include: [main] } }]`
   - **Pipeline completion**: `resources: { pipelines: [{ pipeline: upstream, source: "upstream-pipeline", trigger: true }] }`

3. **Generate stages** based on `--stages` and `--type`:
   - **Build stage**: type-specific build steps
     - Node: `NodeTool@0`, `npm ci`, `npm run build`
     - .NET: `UseDotNet@2`, `dotnet restore`, `dotnet build -c Release`
     - Python: `UsePythonVersion@0`, `pip install -r requirements.txt`, `python setup.py build`
     - Docker: `Docker@2` build and push to ACR
   - **Test stage**: type-specific test steps with result publishing
     - Node: `npm test` + `PublishTestResults@2` (JUnit)
     - .NET: `dotnet test` + `PublishTestResults@2` (VSTest)
     - Python: `pytest --junitxml=results.xml` + `PublishTestResults@2`
   - **Deploy stage**: per-environment deployment jobs
     - Use `deployment` job type with `environment` reference
     - Include `strategy: runOnce` with `deploy` lifecycle hook

4. **Add variable groups** — if `--variable-groups` is specified, add `variables: [{ group: "group-name" }]`.

5. **Add extends template** — if `--extends-template` is specified, wrap pipeline with `extends: { template: path }`.

6. **Set pool**: `vmImage: ubuntu-latest` (default). Use `windows-latest` for .NET Framework projects.

7. **Include artifacts**: `PublishBuildArtifacts@1` or `PublishPipelineArtifact@1` for build outputs.

8. **Write the file** to `azure-pipelines.yml` (or `pipelines/{pipeline-name}.yml` for multi-pipeline repos).

9. **Register the pipeline** — provide instructions:
   - Portal: Pipelines > New Pipeline > Azure Repos Git > select repo > Existing YAML file
   - CLI: `az pipelines create --name "{name}" --repository {repo} --branch main --yml-path azure-pipelines.yml`

10. **Organize pipeline** — optionally place in a folder: `az pipelines folder create --path "\\CI"`.

## Examples

```bash
/ado-pipeline-create my-api --type dotnet --stages build,test,deploy --environments dev,prod --service-connection azure-sub
/ado-pipeline-create frontend --type node --triggers ci,pr,schedule
/ado-pipeline-create ml-pipeline --type python --variable-groups ml-config,secrets
```

## Error Handling

- **Service connection not found**: List available connections and prompt user to select one.
- **Variable group not found**: Create the group or suggest running `/ado-variable-group`.
- **YAML syntax error**: Validate generated YAML with `az pipelines validate`.
