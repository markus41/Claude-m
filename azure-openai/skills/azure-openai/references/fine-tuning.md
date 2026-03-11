# Azure OpenAI — Fine-Tuning

## Overview

Fine-tuning customizes a base Azure OpenAI model with your own training data. This produces a model that is better at your specific task, can follow your desired output format without lengthy prompts, and may require fewer tokens per request. Fine-tuning is available for GPT-4o-mini, GPT-3.5-Turbo (0613, 1106, 0125), and select other models. Fine-tuned models are deployed like standard models and billed at fine-tuned model token rates.

---

## REST API Endpoints (Fine-Tuning)

Base URL: `https://{resource-name}.openai.azure.com/openai`
API Version: `2024-08-01-preview`

| Method | Endpoint | Description | Key Parameters |
|--------|----------|-------------|----------------|
| POST | `/files` | Upload training/validation file | `purpose=fine-tune`, file binary |
| GET | `/files` | List uploaded files | — |
| GET | `/files/{file-id}` | Get file details | — |
| DELETE | `/files/{file-id}` | Delete a file | — |
| GET | `/files/{file-id}/content` | Download file content | — |
| POST | `/fine_tuning/jobs` | Create fine-tuning job | model, training_file, hyperparameters |
| GET | `/fine_tuning/jobs` | List fine-tuning jobs | — |
| GET | `/fine_tuning/jobs/{job-id}` | Get job details | — |
| POST | `/fine_tuning/jobs/{job-id}/cancel` | Cancel a running job | — |
| GET | `/fine_tuning/jobs/{job-id}/events` | List training events/logs | — |
| GET | `/fine_tuning/jobs/{job-id}/checkpoints` | List training checkpoints | — |

---

## Training Data Format (JSONL)

Each line in the JSONL file is a complete chat conversation:

### Standard Chat Format
```jsonl
{"messages": [{"role": "system", "content": "You are a helpful legal assistant that extracts key clauses from contracts."}, {"role": "user", "content": "Extract the termination clause from this contract:\n\nEither party may terminate this agreement with 30 days written notice..."}, {"role": "assistant", "content": "{\"clause_type\": \"termination\", \"notice_period\": \"30 days\", \"method\": \"written notice\", \"conditions\": \"Either party, no cause required\"}"}]}
{"messages": [{"role": "system", "content": "You are a helpful legal assistant that extracts key clauses from contracts."}, {"role": "user", "content": "Extract the termination clause from this contract:\n\nThis agreement shall continue unless terminated for cause..."}, {"role": "assistant", "content": "{\"clause_type\": \"termination\", \"notice_period\": \"N/A\", \"method\": \"for cause\", \"conditions\": \"Breach of material terms required\"}"}]}
```

### With Function Calling
```jsonl
{"messages": [{"role": "system", "content": "You help users manage tasks."}, {"role": "user", "content": "Create a high priority task to review the quarterly report by Friday"}], "tools": [{"type": "function", "function": {"name": "create_task", "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "priority": {"type": "string", "enum": ["low", "medium", "high"]}, "due_date": {"type": "string"}}, "required": ["title", "priority"]}}}], "tool_choice": {"type": "function", "function": {"name": "create_task"}}}
```

### Data Requirements

| Requirement | Value | Notes |
|------------|-------|-------|
| Minimum examples | 10 | 50-100+ recommended for meaningful improvement |
| Maximum file size | 512 MB | Per file |
| Format | JSONL (UTF-8) | One JSON object per line |
| System message | Consistent across examples | Use same system message for all training data |
| Message roles | system (optional), user, assistant | At least one user + one assistant per example |
| Max tokens per example | Model context limit | Must fit within model's max context window |

### Data Quality Checklist

- [ ] System messages are consistent (same persona/instructions in all examples)
- [ ] Assistant responses demonstrate the exact behavior/format you want
- [ ] No contradictory examples (same input should not produce different outputs)
- [ ] Edge cases and difficult examples are included
- [ ] No PII or sensitive data unless necessary and approved
- [ ] Data is representative of production traffic distribution
- [ ] At least 10% of data covers error/refusal scenarios
- [ ] JSONL is valid (no trailing commas, proper escaping)

---

## File Upload

```bash
RESOURCE_NAME="my-openai-resource"
API_VERSION="2024-08-01-preview"
BASE_URL="https://${RESOURCE_NAME}.openai.azure.com/openai"

# Upload training file
curl -X POST "${BASE_URL}/files?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -F "purpose=fine-tune" \
  -F "file=@training_data.jsonl"

# Upload validation file
curl -X POST "${BASE_URL}/files?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -F "purpose=fine-tune" \
  -F "file=@validation_data.jsonl"

# Check file processing status
curl -X GET "${BASE_URL}/files/{file-id}?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
# Wait for status: "processed" (not "pending" or "error")

# List all files
curl -X GET "${BASE_URL}/files?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# Delete a file
curl -X DELETE "${BASE_URL}/files/{file-id}?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

**File processing states**: `pending` -> `running` -> `processed` or `error`. If `error`, check the `status_details` field for validation errors (malformed JSON, missing required fields, encoding issues).

---

## Fine-Tuning Job Lifecycle

### Create a Job

```bash
# Create fine-tuning job with defaults
curl -X POST "${BASE_URL}/fine_tuning/jobs?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "training_file": "file-abc123",
    "suffix": "contoso-support"
  }'

# Create with validation file and custom hyperparameters
curl -X POST "${BASE_URL}/fine_tuning/jobs?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "training_file": "file-abc123",
    "validation_file": "file-def456",
    "hyperparameters": {
      "n_epochs": 3,
      "batch_size": 4,
      "learning_rate_multiplier": 1.0
    },
    "suffix": "contoso-support-v2"
  }'
```

### Monitor Progress

```bash
# Get job status
curl -X GET "${BASE_URL}/fine_tuning/jobs/{job-id}?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# Response fields of interest:
# - status: "validating_files" | "queued" | "running" | "succeeded" | "failed" | "cancelled"
# - fine_tuned_model: the model name to use for deployment (available after "succeeded")
# - trained_tokens: total tokens used in training
# - result_files: file IDs for training results

# List training events (logs)
curl -X GET "${BASE_URL}/fine_tuning/jobs/{job-id}/events?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
# Events include training loss, validation loss, and epoch progress

# List checkpoints
curl -X GET "${BASE_URL}/fine_tuning/jobs/{job-id}/checkpoints?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# Cancel a running job
curl -X POST "${BASE_URL}/fine_tuning/jobs/{job-id}/cancel?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# List all fine-tuning jobs
curl -X GET "${BASE_URL}/fine_tuning/jobs?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

### Job Status Flow

```
validating_files -> queued -> running -> succeeded
                                      -> failed
                    -> cancelled
```

---

## Hyperparameter Tuning

| Parameter | Default | Range | When to Adjust |
|-----------|---------|-------|---------------|
| `n_epochs` | auto (typically 3-4) | 1-25 | Increase if training loss is still decreasing; decrease if validation loss increases |
| `batch_size` | auto | 1-256 | Larger = smoother gradients, faster training; smaller = more updates per epoch |
| `learning_rate_multiplier` | auto (typically 0.5-2.0) | 0.01-5.0 | Decrease if training loss oscillates; increase if loss decreases very slowly |

**Tuning strategy**:
1. Start with all defaults (auto) for the first run
2. Evaluate results on a held-out test set
3. If underfitting (poor test performance, training loss still high):
   - Increase `n_epochs` (try 5-8)
   - Increase `learning_rate_multiplier` slightly (try 1.5-2.0)
   - Add more diverse training examples
4. If overfitting (training loss low but validation/test performance degrades):
   - Decrease `n_epochs` (try 1-2)
   - Decrease `learning_rate_multiplier` (try 0.5)
   - Add more training examples
   - Reduce example repetitiveness

---

## Deploy Fine-Tuned Models

After a job succeeds, deploy the fine-tuned model:

```bash
# Get the fine-tuned model name from the job
FT_MODEL=$(curl -s -X GET "${BASE_URL}/fine_tuning/jobs/{job-id}?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" | jq -r '.fine_tuned_model')

# Deploy the fine-tuned model
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name contoso-support-ft \
  --model-name "${FT_MODEL}" \
  --model-version "1" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 20

# Test the fine-tuned deployment
curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/deployments/contoso-support-ft/chat/completions?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful legal assistant that extracts key clauses from contracts."},
      {"role": "user", "content": "Extract the termination clause: This agreement may be terminated by mutual consent..."}
    ],
    "max_tokens": 200
  }'
```

---

## Evaluation

### Metrics to Track

| Metric | Source | Healthy Range |
|--------|--------|--------------|
| Training loss | Events API | Decreasing, converging to < 1.0 |
| Validation loss | Events API | Decreasing and close to training loss |
| Token accuracy | Events API | Increasing towards 80%+ |
| Test set accuracy | Manual evaluation | Domain-dependent |
| Response format compliance | Manual evaluation | 95%+ for structured output tasks |

### Evaluation Script Pattern

```python
import json
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://my-openai.openai.azure.com/",
    api_key=api_key,
    api_version="2024-08-01-preview"
)

# Load test set
with open("test_data.jsonl") as f:
    test_examples = [json.loads(line) for line in f]

results = {"correct": 0, "total": 0, "errors": []}

for example in test_examples:
    messages = example["messages"][:-1]  # All but the expected assistant message
    expected = example["messages"][-1]["content"]

    response = client.chat.completions.create(
        model="contoso-support-ft",  # Fine-tuned deployment name
        messages=messages,
        max_tokens=200,
        temperature=0
    )

    actual = response.choices[0].message.content
    results["total"] += 1

    if evaluate_match(expected, actual):  # Your comparison logic
        results["correct"] += 1
    else:
        results["errors"].append({
            "input": messages[-1]["content"],
            "expected": expected,
            "actual": actual
        })

print(f"Accuracy: {results['correct']}/{results['total']} = {results['correct']/results['total']:.2%}")
```

---

## Common Patterns and Gotchas

**1. Training data quality > quantity**: 50 high-quality, diverse examples often outperform 500 repetitive ones. Ensure examples cover the full range of inputs your model will see in production.

**2. Consistent system messages**: Use the same system message in all training examples AND at inference time. Changing the system message at inference can degrade fine-tuned behavior.

**3. Fine-tuning for format, not knowledge**: Fine-tuning is most effective for teaching output format, tone, and task-specific behavior. It is less effective for adding new factual knowledge (use RAG for that).

**4. Cost of fine-tuned models**: Fine-tuned model inference costs more per token than the base model. Factor this into your cost comparison — if fine-tuning lets you remove 80% of your prompt tokens, it may still be cheaper overall.

**5. Model version compatibility**: Fine-tuned models are tied to the base model version. When the base model version is deprecated, you must re-fine-tune on the new version. Plan for periodic retraining.

**6. File ID lifetime**: Uploaded files are retained for 2 years on Azure OpenAI. Clean up old training files to stay within the 500-file limit per resource.

**7. Concurrent job limit**: Azure OpenAI limits you to 3 concurrent fine-tuning jobs per resource. Queue additional jobs and submit as earlier ones complete.

**8. Validation split**: If you do not provide a validation file, Azure automatically reserves ~20% of your training data for validation. For better control, always provide an explicit validation file.
