---
name: aoai-fine-tune
description: "Fine-tune an Azure OpenAI model — upload training data, create fine-tuning job, monitor progress, deploy the result"
argument-hint: "[--upload <file>] [--create-job] [--monitor <job-id>] [--deploy <job-id>] [--model <gpt-4o-mini|gpt-35-turbo>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Fine-Tune Azure OpenAI Model

Walk the user through the complete fine-tuning workflow: data preparation, upload, training, and deployment.

## Instructions

### 1. Validate Inputs

- `--upload` — Upload a training JSONL file.
- `--create-job` — Create a fine-tuning job (requires uploaded file ID).
- `--monitor` — Check status of a fine-tuning job.
- `--deploy` — Deploy a completed fine-tuned model.
- `--model` — Base model to fine-tune (gpt-4o-mini, gpt-35-turbo-0613, etc.).

If no flag is specified, guide the user through the full workflow.

### 2. Validate Training Data

Before uploading, validate the training file format:

```bash
# Check file is valid JSONL
python3 -c "
import json, sys
errors = []
with open('<file-path>') as f:
    for i, line in enumerate(f, 1):
        try:
            data = json.loads(line)
            if 'messages' not in data:
                errors.append(f'Line {i}: missing messages field')
            else:
                roles = [m['role'] for m in data['messages']]
                if 'user' not in roles or 'assistant' not in roles:
                    errors.append(f'Line {i}: must have at least one user and one assistant message')
        except json.JSONDecodeError as e:
            errors.append(f'Line {i}: invalid JSON - {e}')
if errors:
    print(f'Found {len(errors)} errors:')
    for e in errors[:10]:
        print(f'  {e}')
else:
    print(f'Valid JSONL with {i} examples')
"
```

**Minimum requirements**:
- At least 10 examples (50-100+ recommended)
- Each example must have `messages` array with user + assistant messages
- System messages should be consistent across all examples

### 3. Upload Training File

```bash
RESOURCE_NAME="<resource-name>"
API_VERSION="2024-08-01-preview"

curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/files?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -F "purpose=fine-tune" \
  -F "file=@<file-path>"
```

Save the returned `id` value (e.g., `file-abc123`). Check processing status:

```bash
curl -X GET "https://${RESOURCE_NAME}.openai.azure.com/openai/files/<file-id>?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

Wait until `status` is `"processed"` before creating a job.

### 4. Create Fine-Tuning Job

```bash
curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/fine_tuning/jobs?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<base-model>",
    "training_file": "<training-file-id>",
    "suffix": "<custom-suffix>",
    "hyperparameters": {
      "n_epochs": "auto",
      "batch_size": "auto",
      "learning_rate_multiplier": "auto"
    }
  }'
```

Save the returned job ID (e.g., `ftjob-xyz789`).

### 5. Monitor Training Progress

```bash
# Check job status
curl -X GET "https://${RESOURCE_NAME}.openai.azure.com/openai/fine_tuning/jobs/<job-id>?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# View training events/logs
curl -X GET "https://${RESOURCE_NAME}.openai.azure.com/openai/fine_tuning/jobs/<job-id>/events?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

Status progression: `validating_files` -> `queued` -> `running` -> `succeeded` (or `failed`).

### 6. Deploy Fine-Tuned Model

After the job succeeds, get the fine-tuned model name from the job response (`fine_tuned_model` field), then deploy:

```bash
az cognitiveservices account deployment create \
  --name <resource-name> \
  --resource-group <rg-name> \
  --deployment-name <deployment-name> \
  --model-name "<fine-tuned-model-name>" \
  --model-version "1" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 20
```

### 7. Test the Deployment

```bash
curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/deployments/<deployment-name>/chat/completions?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "<same system message as training data>"},
      {"role": "user", "content": "<test input>"}
    ],
    "max_tokens": 200
  }'
```

### 8. Display Summary

Show the user:
- Base model and fine-tuned model name
- Training examples count and trained tokens
- Deployment name and endpoint
- Test command to verify the fine-tuned model
- Cost information (fine-tuned inference rates)
