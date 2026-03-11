---
name: docai-classify
description: Build and use a Document Intelligence classifier — train a classifier to identify document types and split multi-document files
argument-hint: "<action> [--classifier-id <id>] [--container-url <url>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Document Classifier

Build, train, and use custom document classifiers for Azure AI Document Intelligence. Classifiers identify document types and split multi-document files into individual documents for targeted extraction.

## Actions

- `build` — Train a new document classifier
- `classify` — Classify a document or multi-document file
- `list` — List all classifiers in the resource
- `info` — Get classifier details (document types, training data)
- `delete` — Delete a classifier
- `split-classify` — Full workflow: classify a multi-document file, split by type, analyze each segment

## Flags

- `--classifier-id <id>`: Classifier identifier
- `--container-url <url>`: Blob container SAS URL with training data
- `--confidence-threshold <value>`: Minimum confidence for classification (default: 0.80)

## Prerequisites

- Document Intelligence resource (S0 tier)
- Training data organized by document type in Blob Storage
- Run `/docai-setup` to configure endpoint and keys

## Action: build

### Step 1: Validate Training Data Structure

Training data must be organized with one subfolder per document type:

```
classifier-training/
  ├─ invoices/        (min 5 documents)
  │    ├─ inv-001.pdf
  │    ├─ inv-002.pdf
  │    └─ ...
  ├─ receipts/        (min 5 documents)
  │    ├─ rcpt-001.pdf
  │    └─ ...
  └─ purchase-orders/ (min 5 documents)
       ├─ po-001.pdf
       └─ ...
```

Use `AskUserQuestion` to collect:
1. Classifier ID (e.g., `finance-classifier-v1`)
2. Blob container SAS URL
3. Document types and their prefixes

### Step 2: Build the Classifier

```bash
ENDPOINT="${DOCUMENT_INTELLIGENCE_ENDPOINT}"
KEY="${DOCUMENT_INTELLIGENCE_KEY}"

OPERATION_URL=$(curl -s -i -X POST \
  "${ENDPOINT}documentintelligence/documentClassifiers:build?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"classifierId\": \"${CLASSIFIER_ID}\",
    \"docTypes\": {
      \"invoices\": {
        \"azureBlobSource\": {
          \"containerUrl\": \"${CONTAINER_URL}\",
          \"prefix\": \"classifier-training/invoices/\"
        }
      },
      \"receipts\": {
        \"azureBlobSource\": {
          \"containerUrl\": \"${CONTAINER_URL}\",
          \"prefix\": \"classifier-training/receipts/\"
        }
      },
      \"purchase-orders\": {
        \"azureBlobSource\": {
          \"containerUrl\": \"${CONTAINER_URL}\",
          \"prefix\": \"classifier-training/purchase-orders/\"
        }
      }
    },
    \"description\": \"Document type classifier for finance documents\"
  }" \
  | grep -i "Operation-Location" | awk '{print $2}' | tr -d '\r')

echo "Classifier build started: $OPERATION_URL"
```

### Step 3: Monitor Build Progress

```bash
while true; do
  RESULT=$(curl -s "$OPERATION_URL" -H "Ocp-Apim-Subscription-Key: ${KEY}")
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  echo "Status: $STATUS"
  if [ "$STATUS" = "succeeded" ] || [ "$STATUS" = "failed" ]; then break; fi
  sleep 10
done
```

Classifier training typically takes 5-15 minutes.

### Step 4: Verify Classifier

```bash
curl -s "${ENDPOINT}documentintelligence/documentClassifiers/${CLASSIFIER_ID}?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  | python3 -c "
import sys, json
c = json.load(sys.stdin)
print(f'Classifier: {c[\"classifierId\"]}')
print(f'Created: {c[\"createdDateTime\"]}')
print(f'Document types:')
for dtype in c.get('docTypes', {}):
    print(f'  - {dtype}')
"
```

## Action: classify

Classify a single document or multi-document file.

### From URL

```bash
OPERATION_URL=$(curl -s -i -X POST \
  "${ENDPOINT}documentintelligence/documentClassifiers/${CLASSIFIER_ID}:classify?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"urlSource\": \"${DOCUMENT_URL}\"}" \
  | grep -i "Operation-Location" | awk '{print $2}' | tr -d '\r')

# Poll for result
sleep 5
RESULT=$(curl -s "$OPERATION_URL" -H "Ocp-Apim-Subscription-Key: ${KEY}")

python3 -c "
import sys, json
result = json.loads('${RESULT//\'/\\\'}')['analyzeResult']
for doc in result.get('documents', []):
    pages = [str(r['pageNumber']) for r in doc.get('boundingRegions', [])]
    print(f'Type: {doc[\"docType\"]:20s} Confidence: {doc[\"confidence\"]:.2f}  Pages: {\"|\".join(pages)}')
"
```

### From Local File

```bash
OPERATION_URL=$(curl -s -i -X POST \
  "${ENDPOINT}documentintelligence/documentClassifiers/${CLASSIFIER_ID}:classify?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/pdf" \
  --data-binary @"{localFilePath}" \
  | grep -i "Operation-Location" | awk '{print $2}' | tr -d '\r')
```

## Action: split-classify

Full workflow for processing multi-document files:

1. **Classify** the file to identify document types and page boundaries
2. **Split** by page ranges
3. **Analyze** each segment with the appropriate prebuilt or custom model

### Workflow

```bash
# Step 1: Classify
# (same as classify action above — get result into /tmp/classify-result.json)

# Step 2: Parse classification results and analyze each segment
python3 -c "
import json, subprocess, time

with open('/tmp/classify-result.json') as f:
    result = json.load(f)['analyzeResult']

# Map document types to models
MODEL_MAP = {
    'invoices': 'prebuilt-invoice',
    'receipts': 'prebuilt-receipt',
    'purchase-orders': 'custom-po-model-v1',
    'contracts': 'prebuilt-contract'
}

for i, doc in enumerate(result.get('documents', [])):
    doc_type = doc['docType']
    confidence = doc['confidence']
    pages = [r['pageNumber'] for r in doc.get('boundingRegions', [])]
    page_range = f'{min(pages)}-{max(pages)}'
    model = MODEL_MAP.get(doc_type, 'prebuilt-document')

    print(f'Segment {i+1}: {doc_type} (confidence: {confidence:.2f}, pages: {page_range})')
    print(f'  Analyzing with model: {model}')

    if confidence < 0.80:
        print(f'  WARNING: Low confidence — routing to manual review')
        continue

    # Analyze this segment
    # POST to .../documentModels/{model}:analyze?pages={page_range}
"
```

## Action: list

```bash
curl -s "${ENDPOINT}documentintelligence/documentClassifiers?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  | python3 -c "
import sys, json
classifiers = json.load(sys.stdin).get('value', [])
print(f'Classifiers: {len(classifiers)}')
for c in classifiers:
    types = list(c.get('docTypes', {}).keys())
    print(f'  {c[\"classifierId\"]:30s} Types: {\", \".join(types)}  Created: {c[\"createdDateTime\"][:10]}')
"
```

## Action: delete

```bash
curl -s -X DELETE \
  "${ENDPOINT}documentintelligence/documentClassifiers/${CLASSIFIER_ID}?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -w "\nHTTP Status: %{http_code}\n"
```

Confirm with `AskUserQuestion` before deleting. Deletion is irreversible.

## Output Report

```markdown
# Classification Report

| Segment | Document Type | Confidence | Pages | Model Used |
|---|---|---|---|---|
| 1 | invoices | 0.95 | 1-2 | prebuilt-invoice |
| 2 | receipts | 0.88 | 3 | prebuilt-receipt |
| 3 | purchase-orders | 0.92 | 4-5 | custom-po-model-v1 |

## Warnings
- Segments with confidence below threshold: {list}
- Unrecognized document types: {list}
```

## Important Notes

- Minimum 5 sample documents per document type for classifier training.
- Classifier training does not require field labels — only document type grouping.
- Maximum 100 classifiers per resource.
- Use the `pages` parameter in the analyze request to process specific page ranges after classification.
- Documents below the confidence threshold should be routed to manual review, not silently dropped.
