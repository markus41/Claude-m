---
name: alm-pipeline-generate
description: Generate CI/CD pipeline YAML for Azure DevOps or GitHub Actions to automate Power Platform solution deployment.
argument-hint: "<azure-devops|github-actions> [--solution name] [--stages dev,test,prod]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Generate CI/CD Pipeline

Generate complete CI/CD pipeline YAML for Power Platform solution deployment.

## Supported Platforms

### Azure DevOps
- Uses Power Platform Build Tools extension
- Tasks: `PowerPlatformToolInstaller`, `PowerPlatformExportSolution`, `PowerPlatformImportSolution`, etc.
- Service connections: Power Platform SPN type
- Multi-stage with environments and approval gates

### GitHub Actions
- Uses `microsoft/powerplatform-actions` marketplace actions
- Actions: `export-solution`, `import-solution`, `check-solution`, etc.
- Secrets: TENANT_ID, CLIENT_ID, CLIENT_SECRET, environment URLs
- Environment protection rules for approvals

## Steps

1. Determine the CI/CD platform (Azure DevOps or GitHub Actions)
2. Gather pipeline requirements:
   - Solution name
   - Environment stages (dev, test, uat, prod)
   - Whether to include solution checker
   - Whether to use holding solution + upgrade for production
   - Whether to include export-and-commit workflow
3. Generate the appropriate YAML file(s):
   - **Export pipeline** — manual trigger, exports and commits to source control
   - **Release pipeline** — triggered on push, builds and deploys through stages
   - **PR validation** — solution checker on pull requests
4. Generate deployment settings file templates for each target environment
5. Document required secrets/service connections

## Pipeline Types

| Type | Trigger | Purpose |
|------|---------|---------|
| Export & Commit | Manual | Export from dev, unpack, commit to repo |
| Build & Release | Push to main | Build managed, validate, deploy to test, deploy to prod |
| PR Validation | Pull request | Pack and run solution checker |

## Checklist for Generated Pipelines

- Service connections / secrets are referenced correctly
- Solution name matches the actual solution unique name
- Deployment settings paths are correct
- Approval gates are configured on production stage
- Solution checker geography matches the tenant region
- Async timeouts are reasonable (60-120 minutes for large solutions)
