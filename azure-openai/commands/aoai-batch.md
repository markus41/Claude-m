---
name: aoai-batch
description: "Create and manage Azure OpenAI Batch API jobs — upload input files, run batch processing, retrieve results"
argument-hint: "[--create] [--monitor <batch-id>] [--results <batch-id>] [--list] [--cancel <batch-id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Azure OpenAI Batch API

Create batch processing jobs for bulk Azure OpenAI requests at 50% cost discount.

## Instructions

### 1. Validate Inputs

- `--create` — Create a new batch job (will prompt for input file).
- `--monitor` — Check status of a batch job.
- `--results` — Download results of a completed batch.
- `--list` — List all batch jobs.
- `--cancel` — Cancel a running batch.

If no flag is specified, guide the user through the full workflow.

### 2. Prepare Input File

The input file is JSONL where each line is a complete API request:

```jsonl
{"custom_id": "req-001", "method": "POST", "url": "/chat/completions", "body": {"model": "<deployment-name>", "messages": [{"role": "system", "content": "Classify sentiment."}, {"role": "user", "content": "Great product!"}], "max_tokens": 50}}
{"custom_id": "req-002", "method": "POST", "url": "/chat/completions", "body": {"model": "<deployment-name>", "messages": [{"role": "system", "content": "Classify sentiment."}, {"role": "user", "content": "Terrible experience."}], "max_tokens": 50}}
```

**Requirements**:
- `custom_id` must be unique per line
- `model` in the body must match a deployment name
- Maximum 100,000 requests per batch
- Maximum input file size: 200 MB

### 3. Validate Input File

```bash
python3 -c "
import json, sys
with open('<input-file>') as f:
    ids = set()
    for i, line in enumerate(f, 1):
        data = json.loads(line)
        if 'custom_id' not in data:
            print(f'Line {i}: missing custom_id')
        elif data['custom_id'] in ids:
            print(f'Line {i}: duplicate custom_id {data[\"custom_id\"]}')
        else:
            ids.add(data['custom_id'])
        if 'body' not in data or 'model' not in data.get('body', {}):
            print(f'Line {i}: missing body.model')
    print(f'Total: {i} requests, {len(ids)} unique IDs')
"
```

### 4. Upload Input File

```bash
RESOURCE_NAME="<resource-name>"
API_VERSION="2024-08-01-preview"
BASE_URL="https://${RESOURCE_NAME}.openai.azure.com/openai"

curl -X POST "${BASE_URL}/files?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -F "purpose=batch" \
  -F "file=@<input-file>"
```

Save the returned file ID. Check status until `"processed"`:
```bash
curl -X GET "${BASE_URL}/files/<file-id>?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

### 5. Create Batch Job

```bash
curl -X POST "${BASE_URL}/batches?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input_file_id": "<file-id>",
    "endpoint": "/chat/completions",
    "completion_window": "24h"
  }'
```

Save the batch ID from the response.

### 6. Monitor Batch Progress

```bash
curl -X GET "${BASE_URL}/batches/<batch-id>?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

Status progression: `validating` -> `in_progress` -> `completed` (or `failed`, `expired`, `cancelled`).

The response includes progress counts:
- `request_counts.total` — Total requests
- `request_counts.completed` — Completed requests
- `request_counts.failed` — Failed requests

### 7. Retrieve Results

After the batch completes, download the output file:

```bash
# Get output_file_id from the batch status response
OUTPUT_FILE_ID="<output-file-id>"

curl -X GET "${BASE_URL}/files/${OUTPUT_FILE_ID}/content?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  --output batch_results.jsonl
```

Each line in the output contains the response for the corresponding `custom_id`:
```jsonl
{"id": "resp-1", "custom_id": "req-001", "response": {"status_code": 200, "body": {"choices": [{"message": {"content": "Positive"}}]}}}
```

Check for failed requests (status_code != 200) in the output.

### 8. List All Batches

```bash
curl -X GET "${BASE_URL}/batches?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

### 9. Cancel a Batch

```bash
curl -X POST "${BASE_URL}/batches/<batch-id>/cancel?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

### 10. Display Summary

Show the user:
- Batch ID and status
- Request counts (total, completed, failed)
- Output file location
- Cost savings estimate (50% discount vs standard pricing)
- Any failed requests that need attention
