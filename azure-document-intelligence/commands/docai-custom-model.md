---
name: docai-custom-model
description: Build a custom Document Intelligence extraction model — prepare training data, label fields, train, evaluate accuracy, and deploy for production use
argument-hint: "<action> [--model-id <id>] [--build-mode <template|neural>] [--container-url <url>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Custom Model Builder

Build, train, evaluate, and manage custom extraction models for Azure AI Document Intelligence. Handles the full lifecycle from training data preparation to production deployment.

## Actions

- `build` — Train a new custom model
- `evaluate` — Check model accuracy and field confidence
- `list` — List all custom models in the resource
- `info` — Get details for a specific model
- `delete` — Delete a custom model
- `compose` — Create a composed model from multiple custom models
- `copy` — Copy a model to another resource

## Flags

- `--model-id <id>`: Custom model identifier
- `--build-mode <template|neural>`: Build mode (default: `neural`)
- `--container-url <url>`: Blob container SAS URL with training data
- `--prefix <prefix>`: Blob prefix for training data subfolder

## Prerequisites

- Document Intelligence resource (S0 tier required for custom models)
- Training data in Azure Blob Storage with labels
- Run `/docai-setup` to configure endpoint and keys

## Action: build

### Step 1: Validate Training Data

Use `AskUserQuestion` to collect:
1. Model ID (naming convention: `{docType}-{buildMode}-v{version}`)
2. Build mode (`template` for fixed layout, `neural` for variable layout)
3. Blob container SAS URL
4. Prefix (subfolder path, optional)

Validate the SAS URL is accessible:

```bash
curl -s -o /dev/null -w "%{http_code}" "${CONTAINER_URL}&restype=container&comp=list&maxresults=5"
```

Expected: 200. If 403: SAS token lacks `Read` + `List` permissions. If 404: container does not exist.

### Step 2: Check Training Data Count

```bash
curl -s "${CONTAINER_URL}&restype=container&comp=list&prefix=${PREFIX}" \
  | python3 -c "
import sys, xml.etree.ElementTree as ET
root = ET.parse(sys.stdin).getroot()
ns = {'b': 'http://schemas.microsoft.com/windowsazure'}
blobs = root.findall('.//b:Blob/b:Name', ns) or root.findall('.//Blob/Name')
pdfs = [b.text for b in blobs if b.text.endswith('.pdf') or b.text.endswith('.jpg') or b.text.endswith('.png')]
labels = [b.text for b in blobs if b.text.endswith('.labels.json')]
print(f'Documents: {len(pdfs)}')
print(f'Label files: {len(labels)}')
if len(pdfs) < 5:
    print('WARNING: Minimum 5 documents required for training')
if len(labels) < len(pdfs):
    print(f'WARNING: {len(pdfs) - len(labels)} documents missing labels')
"
```

Requirements:
- Template mode: minimum 5 labeled documents
- Neural mode: minimum 5, recommended 15-20 labeled documents
- Each document must have a corresponding `.labels.json` file

### Step 3: Start Model Build

```bash
ENDPOINT="${DOCUMENT_INTELLIGENCE_ENDPOINT}"
KEY="${DOCUMENT_INTELLIGENCE_KEY}"

OPERATION_URL=$(curl -s -i -X POST \
  "${ENDPOINT}documentintelligence/documentModels:build?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"modelId\": \"${MODEL_ID}\",
    \"buildMode\": \"${BUILD_MODE}\",
    \"azureBlobSource\": {
      \"containerUrl\": \"${CONTAINER_URL}\",
      \"prefix\": \"${PREFIX}\"
    },
    \"description\": \"${DESCRIPTION}\",
    \"tags\": {
      \"buildMode\": \"${BUILD_MODE}\",
      \"version\": \"1\"
    }
  }" \
  | grep -i "Operation-Location" | awk '{print $2}' | tr -d '\r')

echo "Build started. Operation URL: $OPERATION_URL"
```

### Step 4: Monitor Training Progress

```bash
while true; do
  RESULT=$(curl -s "$OPERATION_URL" -H "Ocp-Apim-Subscription-Key: ${KEY}")
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['status'])")
  PCT=$(echo "$RESULT" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('percentCompleted', 'N/A'))")
  echo "Status: $STATUS (${PCT}% complete)"

  if [ "$STATUS" = "succeeded" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  sleep 15
done
```

Template models: typically 2-10 minutes. Neural models: typically 30 minutes to 2 hours.

### Step 5: Report Build Results

On success, retrieve model details and report field confidence:

```bash
curl -s "${ENDPOINT}documentintelligence/documentModels/${MODEL_ID}?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  | python3 -c "
import sys, json
model = json.load(sys.stdin)
print(f'Model ID: {model[\"modelId\"]}')
print(f'Build mode: {model.get(\"buildMode\", \"N/A\")}')
print(f'Created: {model[\"createdDateTime\"]}')
for doc_type, info in model.get('docTypes', {}).items():
    print(f'\nDoc type: {doc_type}')
    fc = info.get('fieldConfidence', {})
    for field, conf in fc.items():
        status = 'OK' if conf >= 0.80 else 'LOW'
        print(f'  {field}: {conf:.2f} [{status}]')
"
```

## Action: evaluate

Get model details and field-level confidence:

```bash
curl -s "${ENDPOINT}documentintelligence/documentModels/${MODEL_ID}?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" > /tmp/docai-model-info.json

python3 -c "
import json
with open('/tmp/docai-model-info.json') as f:
    model = json.load(f)

print(f'Model: {model[\"modelId\"]}')
print(f'Build mode: {model.get(\"buildMode\", \"N/A\")}')
print(f'API version: {model[\"apiVersion\"]}')
print()

for dtype, info in model.get('docTypes', {}).items():
    fc = info.get('fieldConfidence', {})
    print(f'Field Confidence for {dtype}:')
    for field, conf in sorted(fc.items(), key=lambda x: x[1]):
        bar = '#' * int(conf * 20)
        status = 'PASS' if conf >= 0.80 else 'WARN' if conf >= 0.70 else 'FAIL'
        print(f'  {field:30s} {conf:.2f} [{status}] {bar}')
"
```

## Action: list

```bash
curl -s "${ENDPOINT}documentintelligence/documentModels?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  | python3 -c "
import sys, json
models = json.load(sys.stdin)['value']
custom = [m for m in models if not m['modelId'].startswith('prebuilt-')]
print(f'Custom models: {len(custom)}')
for m in custom:
    print(f'  {m[\"modelId\"]:40s} {m.get(\"buildMode\",\"N/A\"):10s} {m[\"createdDateTime\"][:10]}')
"
```

## Action: compose

```bash
curl -s -X POST \
  "${ENDPOINT}documentintelligence/documentModels:compose?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"modelId\": \"${COMPOSED_MODEL_ID}\",
    \"componentModels\": [
      {\"modelId\": \"${COMPONENT_1}\"},
      {\"modelId\": \"${COMPONENT_2}\"}
    ],
    \"description\": \"${DESCRIPTION}\"
  }"
```

## Action: delete

```bash
curl -s -X DELETE \
  "${ENDPOINT}documentintelligence/documentModels/${MODEL_ID}?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -w "\nHTTP Status: %{http_code}\n"
```

Confirm with `AskUserQuestion` before deleting. Deletion is irreversible.

## Important Notes

- SAS tokens must have at least 4-hour expiry for neural training (can take 2+ hours).
- Use Document Intelligence Studio (https://documentintelligence.ai.azure.com) for visual labeling.
- Do not evaluate a model on its own training data — use held-out test documents.
- Fields with confidence below 0.70 indicate poor labeling quality or insufficient training samples.
- Maximum 500 custom models per resource.
