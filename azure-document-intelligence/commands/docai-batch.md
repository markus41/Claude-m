---
name: docai-batch
description: Batch analyze multiple documents with Document Intelligence — process entire Blob containers, monitor batch jobs, and retrieve results at scale
argument-hint: "<action> [--model-id <id>] [--source-url <url>] [--result-url <url>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Batch Document Processing

Batch analyze multiple documents using Azure AI Document Intelligence. Process entire Blob Storage containers, monitor batch job progress, and retrieve structured results at scale.

## Actions

- `start` — Start a batch analysis job
- `status` — Check batch job status
- `results` — Retrieve and summarize batch results
- `plan` — Estimate cost and time for a batch job

## Flags

- `--model-id <id>`: Model to use for analysis (e.g., `prebuilt-invoice`)
- `--source-url <url>`: Source Blob container SAS URL with documents
- `--source-prefix <prefix>`: Filter documents by blob prefix
- `--result-url <url>`: Destination Blob container SAS URL for results
- `--result-prefix <prefix>`: Prefix for result files
- `--overwrite`: Overwrite existing results (default: false)

## Prerequisites

- Document Intelligence resource (S0 tier)
- Source documents in Azure Blob Storage
- Result container in Azure Blob Storage (can be the same storage account)
- SAS tokens with appropriate permissions (Read+List for source, Write for results)
- Run `/docai-setup` to configure endpoint and keys

## Action: plan

Estimate the cost and time for a batch job before starting.

### Step 1: Count Documents

```bash
# List documents in source container
curl -s "${SOURCE_URL}&restype=container&comp=list&prefix=${SOURCE_PREFIX}" \
  | python3 -c "
import sys, xml.etree.ElementTree as ET

root = ET.parse(sys.stdin).getroot()
blobs = []
for blob in root.iter():
    if blob.tag.endswith('Name'):
        name = blob.text
        if name and any(name.lower().endswith(ext) for ext in ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.docx']):
            blobs.append(name)

print(f'Documents found: {len(blobs)}')

# Estimate (rough: 1 page per document average for images, 3 pages for PDFs)
pdfs = [b for b in blobs if b.lower().endswith('.pdf')]
images = [b for b in blobs if not b.lower().endswith('.pdf')]
est_pages = len(pdfs) * 3 + len(images)

print(f'  PDFs: {len(pdfs)}')
print(f'  Images: {len(images)}')
print(f'  Estimated pages: {est_pages}')
print()
print('Cost estimate (S0 tier):')
print(f'  Read model:    \${est_pages * 0.001:.2f} (\$0.001/page)')
print(f'  Layout model:  \${est_pages * 0.01:.2f} (\$0.01/page)')
print(f'  Prebuilt model:\${est_pages * 0.01:.2f} (\$0.01/page)')
print(f'  Custom model:  \${est_pages * 0.03:.2f} (\$0.03/page)')
print()
print(f'Estimated time: {max(1, est_pages // 15)} - {max(2, est_pages // 5)} minutes (at 15 RPS)')
"
```

### Step 2: Confirm with User

Use `AskUserQuestion` to confirm:
- Number of documents and estimated pages
- Estimated cost
- Model to use
- Proceed with batch job?

## Action: start

### Start Batch Analysis

```bash
ENDPOINT="${DOCUMENT_INTELLIGENCE_ENDPOINT}"
KEY="${DOCUMENT_INTELLIGENCE_KEY}"

OPERATION_URL=$(curl -s -i -X POST \
  "${ENDPOINT}documentintelligence/documentModels/${MODEL_ID}:analyzeBatch?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"azureBlobSource\": {
      \"containerUrl\": \"${SOURCE_URL}\",
      \"prefix\": \"${SOURCE_PREFIX}\"
    },
    \"resultContainerUrl\": \"${RESULT_URL}\",
    \"resultPrefix\": \"${RESULT_PREFIX}\",
    \"overwriteExisting\": ${OVERWRITE:-false}
  }" \
  | grep -i "Operation-Location" | awk '{print $2}' | tr -d '\r')

echo "Batch job started."
echo "Operation URL: $OPERATION_URL"
echo ""
echo "Save this URL to check status later:"
echo "  /docai-batch status --operation-url \"$OPERATION_URL\""
```

### Alternative: Individual Parallel Analysis

For more control over individual document processing, use parallel individual analysis requests:

```bash
# List all documents
DOCS=$(curl -s "${SOURCE_URL}&restype=container&comp=list&prefix=${SOURCE_PREFIX}" \
  | python3 -c "
import sys, xml.etree.ElementTree as ET
root = ET.parse(sys.stdin).getroot()
for blob in root.iter():
    if blob.tag.endswith('Name'):
        name = blob.text
        if name and any(name.lower().endswith(ext) for ext in ['.pdf', '.jpg', '.jpeg', '.png']):
            print(name)
")

# Process each document (with rate limiting)
PROCESSED=0
TOTAL=$(echo "$DOCS" | wc -l)
for DOC in $DOCS; do
  DOC_URL="${SOURCE_URL%\?*}/${DOC}?${SOURCE_URL#*\?}"

  curl -s -X POST \
    "${ENDPOINT}documentintelligence/documentModels/${MODEL_ID}:analyze?api-version=2024-11-30" \
    -H "Ocp-Apim-Subscription-Key: ${KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"urlSource\": \"${DOC_URL}\"}" \
    > /dev/null

  PROCESSED=$((PROCESSED + 1))
  echo "Submitted: $PROCESSED / $TOTAL - $DOC"

  # Rate limit: 15 RPS for S0, 1 RPS for F0
  sleep 0.1
done
```

## Action: status

Check the status of a running batch job:

```bash
RESULT=$(curl -s "$OPERATION_URL" -H "Ocp-Apim-Subscription-Key: ${KEY}")

python3 -c "
import json
result = json.loads('''${RESULT}''')
print(f'Status: {result[\"status\"]}')
print(f'Percent complete: {result.get(\"percentCompleted\", \"N/A\")}%')
print(f'Created: {result.get(\"createdDateTime\", \"N/A\")}')
print(f'Last updated: {result.get(\"lastUpdatedDateTime\", \"N/A\")}')

if result['status'] == 'failed':
    print(f'Error: {json.dumps(result.get(\"error\", {}), indent=2)}')
"
```

## Action: results

Retrieve and summarize batch results from the output container.

### List Result Files

```bash
curl -s "${RESULT_URL}&restype=container&comp=list&prefix=${RESULT_PREFIX}" \
  | python3 -c "
import sys, xml.etree.ElementTree as ET
root = ET.parse(sys.stdin).getroot()
results = []
for blob in root.iter():
    if blob.tag.endswith('Name'):
        name = blob.text
        if name and name.endswith('.json'):
            results.append(name)
print(f'Result files: {len(results)}')
for r in results[:20]:
    print(f'  {r}')
if len(results) > 20:
    print(f'  ... and {len(results) - 20} more')
"
```

### Summarize Results

```bash
# Download and summarize a result file
RESULT_BLOB="${RESULT_URL%\?*}/${RESULT_PREFIX}result-001.json?${RESULT_URL#*\?}"

curl -s "$RESULT_BLOB" | python3 -c "
import sys, json
result = json.load(sys.stdin)

if 'analyzeResult' in result:
    ar = result['analyzeResult']
    print(f'Pages: {len(ar.get(\"pages\", []))}')
    print(f'Documents: {len(ar.get(\"documents\", []))}')
    print(f'Tables: {len(ar.get(\"tables\", []))}')

    for doc in ar.get('documents', []):
        print(f'\nDoc type: {doc.get(\"docType\")} (confidence: {doc.get(\"confidence\", 0):.2f})')
        for name, field in doc.get('fields', {}).items():
            print(f'  {name}: {field.get(\"content\", \"N/A\")} ({field.get(\"confidence\", 0):.2f})')
"
```

### Generate Batch Summary Report

```markdown
# Batch Analysis Report

| Metric | Value |
|---|---|
| Model | {modelId} |
| Total documents | {count} |
| Successful | {successCount} |
| Failed | {failCount} |
| Total pages | {pageCount} |
| Processing time | {duration} |
| Estimated cost | ${cost} |

## Results Summary

| Document | Type | Confidence | Pages | Key Fields |
|---|---|---|---|---|
| invoice-001.pdf | invoice | 0.95 | 2 | Vendor: Contoso, Total: $1,250 |
| receipt-001.jpg | receipt | 0.92 | 1 | Merchant: Cafe, Total: $12.50 |
| ... | ... | ... | ... | ... |

## Warnings

- Documents with low confidence (< 0.70): {list}
- Failed documents: {list with error codes}
- Documents exceeding size limits: {list}
```

## Cost Optimization Tips

1. **Use the cheapest model that meets requirements:**
   - `prebuilt-read` ($0.001/page) — OCR text only
   - `prebuilt-layout` ($0.01/page) — tables and structure
   - `prebuilt-invoice` ($0.01/page) — invoice field extraction
   - Custom models ($0.03/page) — custom field extraction

2. **Filter documents before processing** — Use classification first to route only relevant documents to expensive models.

3. **Specify page ranges** — If you only need data from page 1, use `pages=1` to avoid processing unnecessary pages.

4. **Cache results** — Store analysis results. Do not re-analyze the same document unless it has changed.

5. **Use F0 tier for development** — Free tier provides 500 pages/month at no cost.

## Important Notes

- SAS tokens for both source and result containers must have sufficient permissions and expiry.
- Source container: `Read` + `List` permissions.
- Result container: `Write` + `Create` + `List` permissions.
- Batch operations are asynchronous — use the operation URL to track progress.
- S0 tier rate limit is 15 RPS — plan processing time accordingly for large batches.
- Failed individual documents within a batch do not fail the entire batch job.
