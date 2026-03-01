---
name: ado-pipeline-create
description: Generate a YAML pipeline definition for an Azure DevOps project
argument-hint: "<pipeline-name> --type node|dotnet|python|docker [--stages build,test,deploy]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Generate Azure DevOps Pipeline

Generate a YAML pipeline definition based on the project type.

## Instructions

1. Determine the project type from `--type` flag.
2. Generate an `azure-pipelines.yml` file with:
   - Trigger on `main` branch.
   - Appropriate pool (`ubuntu-latest`).
   - Stages based on `--stages` (default: build, test).
   - Type-specific steps (e.g., `NodeTool@0` for Node, `UseDotNet@2` for .NET).
3. Include test result publishing and artifact staging where appropriate.
4. Write the file to the repository root.
5. Provide instructions for creating the pipeline in Azure DevOps.
