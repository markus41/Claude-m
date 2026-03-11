---
name: docai-analyze
description: Analyze a document with a prebuilt or custom Document Intelligence model — extract fields, tables, and text from invoices, receipts, IDs, tax forms, or any document type
argument-hint: "<model-id> <document-source> [--pages <range>] [--locale <locale>] [--output <format>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Analyze Document

Analyze a document using Azure AI Document Intelligence. Supports all prebuilt models and custom models. Extracts fields, tables, text content, and structural elements.

## Arguments

- `<model-id>`: Model to use (e.g., `prebuilt-invoice`, `prebuilt-receipt`, `prebuilt-layout`, or a custom model ID)
- `<document-source>`: URL to the document or local file path

## Flags

- `--pages <range>`: Analyze specific pages only (e.g., `1-3`, `1,3,5`)
- `--locale <locale>`: Document locale hint (e.g., `en-US`, `de-DE`)
- `--output <format>`: Output format — `summary` (default), `full-json`, `markdown`, `csv` (tables only)

## Prerequisites

- Document Intelligence resource configured (run `/docai-setup` first)
- Environment variables: `DOCUMENT_INTELLIGENCE_ENDPOINT`, `DOCUMENT_INTELLIGENCE_KEY`

## Step 1: Validate Inputs

1. Confirm the model ID is valid (prebuilt or custom)
2. Confirm the document source is accessible (URL or local file)
3. Determine content type:
   - PDF: `application/pdf`
   - JPEG: `image/jpeg`
   - PNG: `image/png`
   - TIFF: `image/tiff`
   - BMP: `image/bmp`
   - DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## Step 2: Start Analysis

### From URL

```bash
ENDPOINT="${DOCUMENT_INTELLIGENCE_ENDPOINT}"
KEY="${DOCUMENT_INTELLIGENCE_KEY}"
MODEL_ID="{modelId}"
PAGES_PARAM=""  # Add "&pages=1-3" if --pages is set
LOCALE_PARAM="" # Add "&locale=en-US" if --locale is set

OPERATION_URL=$(curl -s -i -X POST \
  "${ENDPOINT}documentintelligence/documentModels/${MODEL_ID}:analyze?api-version=2024-11-30${PAGES_PARAM}${LOCALE_PARAM}" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"urlSource\": \"${DOCUMENT_URL}\"}" \
  | grep -i "Operation-Location" | awk '{print $2}' | tr -d '\r')
```

### From Local File

```bash
OPERATION_URL=$(curl -s -i -X POST \
  "${ENDPOINT}documentintelligence/documentModels/${MODEL_ID}:analyze?api-version=2024-11-30${PAGES_PARAM}${LOCALE_PARAM}" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/pdf" \
  --data-binary @"{localFilePath}" \
  | grep -i "Operation-Location" | awk '{print $2}' | tr -d '\r')
```

## Step 3: Poll for Results

```bash
MAX_ATTEMPTS=60
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  RESULT=$(curl -s "$OPERATION_URL" -H "Ocp-Apim-Subscription-Key: ${KEY}")
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")

  if [ "$STATUS" = "succeeded" ]; then
    echo "$RESULT" > /tmp/docai-result.json
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Analysis failed:"
    echo "$RESULT" | python3 -c "import sys,json; r=json.load(sys.stdin); print(json.dumps(r.get('error',{}), indent=2))"
    exit 1
  fi

  ATTEMPT=$((ATTEMPT + 1))
  sleep 3
done
```

## Step 4: Process Results

### For Prebuilt Models (Invoice, Receipt, ID, Tax)

Extract document fields:

```bash
python3 -c "
import json
with open('/tmp/docai-result.json') as f:
    result = json.load(f)['analyzeResult']

for doc in result.get('documents', []):
    print(f'Document type: {doc.get(\"docType\", \"N/A\")}')
    print(f'Confidence: {doc.get(\"confidence\", \"N/A\")}')
    print()
    for name, field in doc.get('fields', {}).items():
        content = field.get('content', field.get('value', 'N/A'))
        confidence = field.get('confidence', 'N/A')
        print(f'  {name}: {content} (confidence: {confidence})')
"
```

### For Layout Model

Extract tables and structure:

```bash
python3 -c "
import json
with open('/tmp/docai-result.json') as f:
    result = json.load(f)['analyzeResult']

# Pages summary
for page in result.get('pages', []):
    print(f'Page {page[\"pageNumber\"]}: {page[\"width\"]}x{page[\"height\"]} {page[\"unit\"]}')

# Tables
for i, table in enumerate(result.get('tables', [])):
    print(f'\nTable {i+1}: {table[\"rowCount\"]} rows x {table[\"columnCount\"]} cols')
    for cell in table['cells']:
        if cell.get('kind') == 'columnHeader':
            print(f'  Header [{cell[\"columnIndex\"]}]: {cell[\"content\"]}')

# Paragraphs with roles
for para in result.get('paragraphs', []):
    role = para.get('role', 'body')
    if role != 'body':
        print(f'  [{role}] {para[\"content\"][:80]}')
"
```

### For Read Model (OCR)

Extract text content:

```bash
python3 -c "
import json
with open('/tmp/docai-result.json') as f:
    result = json.load(f)['analyzeResult']

print(result.get('content', ''))

# Handwriting detection
for style in result.get('styles', []):
    if style.get('isHandwritten'):
        print(f'\nHandwritten text detected (confidence: {style[\"confidence\"]})')
"
```

## Step 5: Output Report

### Summary Format (default)

```markdown
# Document Analysis Report

| Property | Value |
|---|---|
| Model | {modelId} |
| Pages analyzed | {pageCount} |
| Document type | {docType} |
| Overall confidence | {confidence} |
| Timestamp | {timestamp} |

## Extracted Fields

| Field | Value | Confidence |
|---|---|---|
| {fieldName} | {value} | {confidence} |
| ... | ... | ... |

## Tables

{markdown table for each extracted table}

## Warnings

- Fields with confidence below 0.70: {list}
- Unsupported content warnings: {list}
```

## Error Handling

| Error | Cause | Fix |
|---|---|---|
| 400 `InvalidRequest` | Bad JSON or missing source | Check request body format |
| 400 `UnsupportedContent` | Unsupported file format | Convert to PDF/JPEG/PNG/BMP/TIFF/DOCX |
| 400 `ContentTooLarge` | File > 500 MB or > 2000 pages | Split the document |
| 401 `Unauthorized` | Invalid key | Check key in Azure portal |
| 404 `ModelNotFound` | Wrong model ID | List models with `/docai-setup` |
| 429 `TooManyRequests` | Rate limit | Wait for `Retry-After` header duration |

## Important Notes

- Always check field-level confidence, not just document-level confidence.
- Financial fields (amounts, totals) should use a confidence threshold of 0.85.
- PII fields (SSN, document numbers) should use a threshold of 0.90.
- For multi-page invoices, the `documents` array may contain multiple invoice entries.
- Clean up `/tmp/docai-result.json` after processing.
