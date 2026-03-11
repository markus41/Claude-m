# Custom Models Reference — Azure AI Document Intelligence

Complete reference for building, training, evaluating, and managing custom extraction models and composed models.

---

## Build Modes Comparison

| Feature | Template | Neural | Generative (Preview) |
|---------|----------|--------|---------------------|
| Layout dependency | Fixed layout required | Variable layouts supported | Variable layouts supported |
| Min training samples | 5 | 5 (15-20 recommended) | 0-5 (few-shot / zero-shot) |
| Max training samples | 10,000 | 10,000 | Limited |
| Training time | Minutes | 30 min - 2 hours | Minutes |
| Field types | All | All | All |
| Table extraction | Yes | Yes | Yes |
| Signature detection | Yes | Yes | Yes |
| Best for | Standardized forms, same template | Multi-vendor docs, varying layouts | Unstructured documents |
| Cost | Lower training cost | Higher training cost | Preview pricing |

### When to Use Each Mode

- **Template**: The source documents always use the same form/template. Examples: your company's expense report form, a specific vendor's invoice template, a government form.
- **Neural**: Documents have the same type of information but different layouts. Examples: invoices from many different vendors, purchase orders from various suppliers, shipping labels.
- **Generative**: Documents are unstructured or semi-structured. Examples: contracts with varying clause positions, free-form letters, reports with no consistent layout. Preview feature with limited availability.

---

## Training Data Preparation

### Directory Structure

```
training-data/
  ├─ document1.pdf
  ├─ document1.ocr.json          (auto-generated)
  ├─ document1.labels.json       (created in Studio or manually)
  ├─ document2.pdf
  ├─ document2.ocr.json
  ├─ document2.labels.json
  ├─ ...
  └─ fields.json                 (field schema definition)
```

### fields.json Schema

Defines the fields to extract:

```json
{
  "fields": {
    "PurchaseOrderNumber": {
      "fieldType": "string"
    },
    "OrderDate": {
      "fieldType": "date"
    },
    "VendorName": {
      "fieldType": "string"
    },
    "TotalAmount": {
      "fieldType": "number"
    },
    "Currency": {
      "fieldType": "string"
    },
    "ShipToAddress": {
      "fieldType": "address"
    },
    "LineItems": {
      "fieldType": "array",
      "itemType": {
        "type": "object",
        "properties": {
          "ItemDescription": { "fieldType": "string" },
          "Quantity": { "fieldType": "number" },
          "UnitPrice": { "fieldType": "number" },
          "LineTotal": { "fieldType": "number" }
        }
      }
    },
    "AuthorizedSignature": {
      "fieldType": "signature"
    }
  }
}
```

### Supported Field Types

| Field Type | Description | Example Value |
|-----------|-------------|---------------|
| `string` | Free-form text | "Contoso Ltd" |
| `date` | Date value | "2024-03-15" |
| `time` | Time value | "14:30:00" |
| `number` | Numeric value | 1250.50 |
| `integer` | Whole number | 42 |
| `currency` | Amount with currency | { amount: 1250.00, currencyCode: "USD" } |
| `selectionMark` | Checkbox state | "selected" / "unselected" |
| `signature` | Signature presence | "signed" / "unsigned" |
| `countryRegion` | Country/region code | "US" |
| `address` | Structured address | { streetAddress, city, state, postalCode } |
| `phoneNumber` | Phone number | "+1-555-0123" |
| `array` | Array of objects | Repeating row data (tables) |
| `object` | Nested structure | Grouped fields |

### labels.json Format

Each document has a labels file mapping field names to regions in the document:

```json
{
  "document": "document1.pdf",
  "labels": [
    {
      "label": "PurchaseOrderNumber",
      "value": [
        {
          "page": 1,
          "text": "PO-2024-0042",
          "boundingBoxes": [
            [2.1, 1.3, 4.5, 1.3, 4.5, 1.5, 2.1, 1.5]
          ]
        }
      ]
    },
    {
      "label": "OrderDate",
      "value": [
        {
          "page": 1,
          "text": "03/15/2024",
          "boundingBoxes": [
            [5.2, 1.3, 6.8, 1.3, 6.8, 1.5, 5.2, 1.5]
          ]
        }
      ]
    },
    {
      "label": "LineItems",
      "value": [
        {
          "page": 1,
          "text": "Widget A",
          "boundingBoxes": [[0.5, 4.0, 2.5, 4.0, 2.5, 4.2, 0.5, 4.2]],
          "labels": [{ "label": "ItemDescription" }]
        },
        {
          "page": 1,
          "text": "10",
          "boundingBoxes": [[3.0, 4.0, 3.5, 4.0, 3.5, 4.2, 3.0, 4.2]],
          "labels": [{ "label": "Quantity" }]
        }
      ]
    }
  ]
}
```

---

## Document Intelligence Studio Labeling

The web-based labeling tool at `https://documentintelligence.ai.azure.com/studio` provides:

1. **Upload documents** — drag and drop PDFs/images
2. **Auto-detect OCR** — automatically generates `.ocr.json` files
3. **Define fields** — create the field schema visually
4. **Label regions** — click and drag to select text regions, assign to fields
5. **Table labeling** — define table structure with column headers and rows
6. **Train** — trigger training directly from the Studio
7. **Test** — upload test documents and view extraction results with confidence scores

### Studio Workflow

```
1. Create project → connect to Blob Storage container
2. Upload training documents (5+ for template, 15-20+ for neural)
3. Define field schema (field names and types)
4. Label each document:
   a. Select text regions → assign to fields
   b. Mark table boundaries → label columns
   c. Mark checkboxes → assign to selectionMark fields
   d. Mark signature regions → assign to signature fields
5. Train the model (select build mode: template or neural)
6. Test with held-out documents
7. Deploy model ID for production use
```

### Labeling Best Practices

- **Consistency**: Label the same field in the same way across all documents. If "Total" sometimes includes tax and sometimes does not, extraction accuracy will suffer.
- **Completeness**: Label all instances of every field in every document. Unlabeled fields teach the model that the field is absent.
- **Table labeling**: Label all rows and all columns. Partial table labeling causes the model to miss rows/columns.
- **Edge cases**: Include documents with missing fields, unusual formatting, or poor scan quality in the training set.
- **Signature fields**: Draw a bounding box around the signature area, even if the signature is just a scribble.
- **Selection marks**: Label both selected and unselected checkboxes to teach the model both states.

---

## Build Custom Model — REST API

### Template Model

```http
POST https://{endpoint}/documentintelligence/documentModels:build?api-version=2024-11-30
Ocp-Apim-Subscription-Key: {apiKey}
Content-Type: application/json

{
  "modelId": "custom-po-template-v1",
  "buildMode": "template",
  "azureBlobSource": {
    "containerUrl": "https://{sa}.blob.core.windows.net/training-data?{sasToken}",
    "prefix": "purchase-orders/"
  },
  "description": "Purchase order extraction (template mode)",
  "tags": {
    "project": "procurement",
    "version": "1",
    "buildMode": "template"
  }
}
```

### Neural Model

```http
POST https://{endpoint}/documentintelligence/documentModels:build?api-version=2024-11-30
{
  "modelId": "custom-invoice-neural-v2",
  "buildMode": "neural",
  "azureBlobSource": {
    "containerUrl": "https://{sa}.blob.core.windows.net/training-data?{sasToken}",
    "prefix": "invoices-multi-vendor/"
  },
  "description": "Multi-vendor invoice extraction (neural mode)",
  "tags": {
    "project": "accounts-payable",
    "version": "2",
    "buildMode": "neural"
  }
}
```

### SAS Token Requirements

The SAS token for the training data container must:

- Have `Read` and `List` permissions on the container
- Have at least 4-hour expiry (neural training can take 2+ hours)
- Be a container-level SAS (not blob-level)

Generate a SAS token:

```bash
az storage container generate-sas \
  --account-name {storageAccount} \
  --name {container} \
  --permissions rl \
  --expiry $(date -u -d "+4 hours" +%Y-%m-%dT%H:%MZ) \
  --auth-mode key \
  -o tsv
```

---

## Track Build Operation

The build request returns `202 Accepted` with an `Operation-Location` header:

```http
GET https://{endpoint}/documentintelligence/operations/{operationId}?api-version=2024-11-30
Ocp-Apim-Subscription-Key: {apiKey}
```

Response:

```json
{
  "operationId": "abc123-...",
  "status": "running",
  "percentCompleted": 45,
  "createdDateTime": "2024-03-15T10:00:00Z",
  "lastUpdatedDateTime": "2024-03-15T10:15:00Z"
}
```

Status values: `notStarted` | `running` | `succeeded` | `failed` | `canceled`

Poll every 10-30 seconds for training operations (they take much longer than analysis).

---

## Composed Models

### Create Composed Model

```http
POST https://{endpoint}/documentintelligence/documentModels:compose?api-version=2024-11-30
{
  "modelId": "finance-composed-v1",
  "componentModels": [
    { "modelId": "custom-invoice-neural-v2" },
    { "modelId": "custom-po-template-v1" },
    { "modelId": "custom-expense-v1" },
    { "modelId": "custom-credit-note-v1" }
  ],
  "description": "Composed model for all finance documents"
}
```

### How Routing Works

1. Document is analyzed against all component models
2. The component with the highest `docTypeConfidence` is selected
3. Results include `docType` (the selected component model ID) and `docTypeConfidence`
4. If two components have similar confidence, results may be unpredictable

### Composed Model Limits

- Maximum 200 component models per composed model
- Component models must be in the same resource
- All component models must be the same build mode (cannot mix template and neural)
- Composed models cannot be nested (composed of composed)

---

## Model Evaluation

### Get Model Details

```http
GET https://{endpoint}/documentintelligence/documentModels/{modelId}?api-version=2024-11-30
```

Response includes:

```json
{
  "modelId": "custom-invoice-neural-v2",
  "description": "Multi-vendor invoice extraction",
  "createdDateTime": "2024-03-15T10:30:00Z",
  "apiVersion": "2024-11-30",
  "buildMode": "neural",
  "docTypes": {
    "custom-invoice-neural-v2": {
      "fieldSchema": {
        "VendorName": { "type": "string" },
        "InvoiceTotal": { "type": "currency" },
        "LineItems": { "type": "array", "items": { "type": "object" } }
      },
      "fieldConfidence": {
        "VendorName": 0.93,
        "InvoiceTotal": 0.95,
        "LineItems": 0.87
      },
      "buildMode": "neural"
    }
  },
  "trainingDocumentResults": {
    "trainingDocumentCount": 25,
    "evaluationDocumentCount": 5
  }
}
```

### Accuracy Assessment

The `fieldConfidence` in the model details shows average training confidence per field. For production readiness:

| Avg Field Confidence | Assessment | Action |
|---------------------|------------|--------|
| > 0.90 | Excellent | Ready for production |
| 0.80-0.90 | Good | Monitor closely, consider more training data |
| 0.70-0.80 | Fair | Add more varied training samples |
| < 0.70 | Poor | Review labeling quality, add significantly more samples |

### Testing Workflow

1. Hold out 20% of labeled documents for testing (do not include in training)
2. Analyze each test document with the trained model
3. Compare extracted fields to ground truth labels
4. Calculate per-field precision and recall
5. Review low-confidence extractions for systematic errors

---

## Copy Model Between Resources

Copy a trained model from one Document Intelligence resource to another:

### Step 1: Get Copy Authorization (Target Resource)

```http
POST https://{targetEndpoint}/documentintelligence/documentModels:authorizeCopy?api-version=2024-11-30
Ocp-Apim-Subscription-Key: {targetKey}

{
  "modelId": "custom-invoice-copy",
  "description": "Copy of invoice model from dev resource"
}
```

Returns an authorization object.

### Step 2: Execute Copy (Source Resource)

```http
POST https://{sourceEndpoint}/documentintelligence/documentModels/{modelId}:copyTo?api-version=2024-11-30
Ocp-Apim-Subscription-Key: {sourceKey}

{
  "targetResourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{targetAccount}",
  "targetResourceRegion": "westus2",
  "targetModelId": "custom-invoice-copy",
  "targetModelLocation": "https://{targetEndpoint}/documentintelligence/documentModels/custom-invoice-copy",
  "accessToken": "{authorizationToken}",
  "expirationDateTime": "2024-03-16T10:00:00Z"
}
```

Use model copy for:
- Promoting models from dev to staging to production resources
- Replicating models to different regions for latency
- Backing up models before retraining

---

## Model Lifecycle Management

### List All Custom Models

```http
GET https://{endpoint}/documentintelligence/documentModels?api-version=2024-11-30
```

### Delete a Model

```http
DELETE https://{endpoint}/documentintelligence/documentModels/{modelId}?api-version=2024-11-30
```

Deletion is immediate and irreversible. Always copy or back up models before deleting.

### Model Naming Convention

Recommended naming pattern: `{docType}-{buildMode}-v{version}`

Examples:
- `invoice-neural-v1`
- `purchase-order-template-v2`
- `expense-report-neural-v3`
- `finance-composed-v1`

### Retraining Triggers

Retrain a custom model when:
- Extraction accuracy drops below acceptable thresholds on new documents
- New document layout variants appear that were not in the original training set
- New fields need to be extracted (requires updated field schema)
- Training data labeling errors are discovered and corrected
- The API version is updated with improved model capabilities

### Resource Limits

| Resource | Limit |
|----------|-------|
| Custom models per resource | 500 |
| Composed model components | 200 |
| Max training documents | 10,000 |
| Max training document size | 50 MB each |
| Max total training data size | 5 GB |
| Training timeout | 24 hours |
| Model storage | Included in resource |

---

## Common Issues and Solutions

1. **"Model build failed: insufficient training data"** — Ensure at least 5 documents for template mode or 5 (ideally 15-20) for neural mode. All documents must have valid `.labels.json` files.

2. **"SAS token expired during training"** — Neural model training can take hours. Use a SAS token with at least 4-hour expiry. For large datasets, use 8-12 hours.

3. **Low accuracy on specific fields** — Check labeling consistency. If the same field is labeled differently across documents (e.g., sometimes "Total" includes tax, sometimes not), the model cannot learn a consistent pattern.

4. **Table extraction incomplete** — Ensure all table rows and columns are labeled in training data. If some rows are unlabeled, the model learns to skip them.

5. **Composed model selects wrong component** — Component models should handle clearly distinct document types. If two components handle similar documents, the router cannot reliably distinguish them. Consider merging similar document types into a single neural model.

6. **Model works in Studio but not via API** — Verify the API version matches. Studio may use a preview API version that differs from the GA version your application uses.
