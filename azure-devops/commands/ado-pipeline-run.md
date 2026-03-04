---
name: ado-pipeline-run
description: Trigger a pipeline run with parameters, variable overrides, and stage selection
argument-hint: "<pipeline-id-or-name> [--branch <branch>] [--variables key=val,...] [--stages stage1,stage2] [--monitor]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Trigger Pipeline Run

Trigger an Azure DevOps pipeline run with branch overrides, runtime parameters, variable overrides, stage selection, and optional progress monitoring.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Queue builds` permission on the pipeline

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<pipeline>` | Yes | Pipeline definition ID or name |
| `--branch` | No | Branch to build (default: pipeline's default branch) |
| `--variables` | No | Runtime variable overrides as `key=value` pairs |
| `--parameters` | No | Template parameters as JSON: `{"param1":"val1"}` |
| `--stages` | No | Comma-separated stages to run (skip others) |
| `--skip-stages` | No | Comma-separated stages to skip |
| `--resources` | No | Resource version overrides as JSON |
| `--monitor` | No | Poll run status until completion |

## Instructions

1. **Resolve pipeline** — if a name is provided, look up the definition ID:
   `GET /_apis/pipelines?api-version=7.1` and filter by name.

2. **Build run request body**:
   ```json
   {
     "resources": {
       "repositories": {
         "self": { "refName": "refs/heads/{branch}" }
       }
     },
     "templateParameters": { "param1": "value1" },
     "variables": {
       "varName": { "value": "varValue", "isSecret": false }
     },
     "stagesToSkip": ["stage3"]
   }
   ```

3. **Trigger run** — call `POST /_apis/pipelines/{pipelineId}/runs?api-version=7.1`.
   CLI: `az pipelines run --id {pipelineId} --branch {branch} --variables key=val`.

4. **Stage selection** — if `--stages` is provided, compute `stagesToSkip` by fetching all stages from the pipeline definition and excluding the selected ones.

5. **Monitor progress** — if `--monitor` is specified:
   - Poll `GET /_apis/pipelines/{pipelineId}/runs/{runId}?api-version=7.1` every 15 seconds.
   - Display current stage and job status.
   - Fetch timeline for real-time task progress.
   - Stop polling when `state` is `completed`.
   - Show final result: `succeeded`, `failed`, `canceled`.

6. **Display results** — show run ID, URL, state, result, branch, and triggered stages.

## Examples

```bash
/ado-pipeline-run 42 --branch feature/auth --variables env=staging,debug=true
/ado-pipeline-run "CI Build" --parameters '{"deployTarget":"staging"}' --monitor
/ado-pipeline-run 42 --stages build,test --skip-stages deploy
```

## Error Handling

- **Pipeline not found**: List available pipelines and prompt user.
- **Invalid parameter**: Parameter not defined in pipeline template — show expected parameters.
- **Branch not found**: Branch does not exist in the repository — list available branches.
- **Queue position**: If build is queued behind others, show queue position.
- **Approval pending**: If a stage requires approval, notify user and provide approval link.
