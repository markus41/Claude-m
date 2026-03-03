# Power Automate — AI Builder

## Overview
AI Builder is a low-code AI platform integrated into Power Apps and Power Automate. It provides
prebuilt and custom AI models for document processing, form extraction, prediction, classification,
text recognition, object detection, and more. Models run in the Power Platform environment and
consume AI Builder credits (pooled at tenant level, licensed separately from PPR).

---

## AI Builder Model Types

| Model Type | Input | Output | Use Case |
|---|---|---|---|
| **Document processing** | PDF, images | Structured fields/tables | Invoices, receipts, contracts |
| **Invoice processing** | PDF, images | Standard invoice fields | AP automation |
| **Receipt processing** | Images | Standard receipt fields | Expense automation |
| **ID document reader** | Images | Name, DOB, ID number | KYC, onboarding |
| **Business card reader** | Images | Contact fields | CRM data entry |
| **Text recognition (OCR)** | Images, PDF | Raw text, bounding boxes | Unstructured document scanning |
| **Object detection** | Images | Detected objects + confidence | Quality control, inventory |
| **Prediction** | Dataverse table data | Binary/multi-class prediction | Churn, risk scoring |
| **Category classification** | Text | Category label + confidence | Ticket triage, email routing |
| **Entity extraction** | Text | Named entities (person, org, date, etc.) | Contract analysis |
| **Key phrase extraction** | Text | Key phrases | Summarization, tagging |
| **Sentiment analysis** | Text | Positive/Negative/Neutral | Customer feedback |
| **Language detection** | Text | Language code + confidence | Multi-lingual routing |

---

## REST API Endpoints

| Method | Endpoint | Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| GET | `/api/data/v9.2/msdyn_AIModels` | AI Builder Customizer | `$select=msdyn_name,msdyn_modeltype` | List models |
| GET | `/api/data/v9.2/msdyn_AIModels({id})` | AI Builder Customizer | — | Get model details |
| POST | `/api/data/v9.2/msdyn_AIModels({id})/Microsoft.Dynamics.CRM.msdyn_PublishAIModel` | System Customizer | — | Publish model |
| GET | `/api/data/v9.2/msdyn_AIConfigurations?$filter=_msdyn_aimodelid_value eq {id}` | AI Builder Customizer | — | Get model config/training state |

**Model type codes:** `0` = Custom prediction, `1` = Document processing, `6` = Object detection,
`7` = Category classification, `9` = Entity extraction, `19` = Form processing (custom)

---

## Using AI Builder in Cloud Flows

### Document Processing — Extract Invoice Fields

```json
{
  "actions": {
    "Extract_information_from_document": {
      "type": "OpenApiConnection",
      "inputs": {
        "host": { "connection": { "name": "@parameters('$connections')['aibuilder']['connectionId']" } },
        "method": "post",
        "path": "/v1.0/extractCustomDocumentFields",
        "body": {
          "model": { "id": "your-model-id" },
          "document": {
            "contentBytes": "@{triggerBody()?['$content']}",
            "contentType": "@{triggerBody()?['$contentType']}"
          }
        }
      }
    }
  }
}
```

**Output structure:**
```json
{
  "fields": {
    "InvoiceNumber": { "value": "INV-2024-001", "confidence": 0.98 },
    "VendorName":    { "value": "Contoso Ltd",  "confidence": 0.95 },
    "TotalAmount":   { "value": "1250.00",       "confidence": 0.99 },
    "InvoiceDate":   { "value": "2024-01-15",    "confidence": 0.97 }
  },
  "tables": {
    "LineItems": {
      "rows": [
        { "Description": "Consulting", "Quantity": "10", "UnitPrice": "125.00" }
      ]
    }
  }
}
```

---

### Sentiment Analysis in Flow

```json
{
  "Analyze_sentiment": {
    "type": "OpenApiConnection",
    "inputs": {
      "host": { "connection": { "name": "@parameters('$connections')['cognitiveservicestextanalytics']['connectionId']" } },
      "method": "post",
      "path": "/text/analytics/v3.1/sentiment",
      "body": {
        "documents": [
          { "id": "1", "language": "en", "text": "@{triggerBody()?['feedback_text']}" }
        ]
      }
    }
  }
}
```

**Access output:** `@{body('Analyze_sentiment')?['documents'][0]?['sentiment']}` → `positive | negative | neutral | mixed`

---

### Prediction Model in Flow

```json
{
  "Predict": {
    "type": "OpenApiConnection",
    "inputs": {
      "host": { "connection": { "name": "@parameters('$connections')['aibuilder']['connectionId']" } },
      "method": "post",
      "path": "/v1.0/predict",
      "body": {
        "request": {
          "modelId": "your-prediction-model-id",
          "rows": [{
            "columnData": {
              "DaysOverdue": "@{triggerBody()?['days_overdue']}",
              "InvoiceAmount": "@{triggerBody()?['amount']}",
              "CustomerSegment": "@{triggerBody()?['segment']}"
            }
          }]
        }
      }
    }
  }
}
```

**Output:** `@{body('Predict')?['results'][0]?['Prediction']}` → `true | false` (binary)
**Confidence:** `@{body('Predict')?['results'][0]?['Probability']}` → 0.0–1.0

---

## PowerShell — Train and Publish Model

```powershell
$env = "https://yourorg.crm.dynamics.com"
$token = (Get-AzAccessToken -ResourceUrl $env).Token
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# List AI models
$models = Invoke-RestMethod "$env/api/data/v9.2/msdyn_AIModels?`$select=msdyn_name,msdyn_modeltype,statecode" -Headers $headers
$models.value | Format-Table msdyn_name, msdyn_modeltype, statecode

# Publish a trained model (triggers model publishing pipeline)
$modelId = "00000000-0000-0000-0000-000000000001"
Invoke-RestMethod "$env/api/data/v9.2/msdyn_AIModels($modelId)/Microsoft.Dynamics.CRM.msdyn_PublishAIModel" `
  -Method Post -Headers $headers -Body "{}"

# Get model configuration status
$config = Invoke-RestMethod "$env/api/data/v9.2/msdyn_AIConfigurations?`$filter=_msdyn_aimodelid_value eq $modelId" -Headers $headers
$config.value | Format-Table msdyn_name, msdyn_trainingstatus, msdyn_publishingstatus
```

---

## Building a Custom Document Processing Model

### Step-by-Step in Power Apps Portal

1. **Navigate:** make.powerapps.com → AI Builder → Build → Document processing
2. **Name model** and select entity to save extracted data
3. **Upload sample documents** (5–10 PDF or image files recommended per layout)
4. **Tag fields**: draw bounding boxes around invoice number, date, amounts, line items
5. **Tag tables**: draw table region, identify header rows vs data rows
6. **Train model**: takes 5–20 minutes depending on dataset size
7. **Evaluate**: review accuracy scores per field (target ≥ 0.80)
8. **Publish**: model becomes available in Power Automate flows
9. **Add to solution**: move model to solution for ALM

### Training Tips
- Use at least **5 documents per layout variation** (portrait/landscape, different vendors)
- For tables with variable row counts: tag at least 3 documents with different row counts
- Include documents with missing/empty fields to improve robustness
- Confidence threshold: route low-confidence extractions (`< 0.70`) to human review queue

---

## AI Builder Credits

| Action | Credits Consumed |
|---|---|
| Document processing (per page) | 1 credit |
| Prediction (per 1,000 rows) | 1 credit |
| Object detection (per image) | 1 credit |
| Category classification (per 1,000 chars) | 1 credit |
| Prebuilt: invoice processing (per document) | 1 credit |
| Model training | Variable (10–200 credits) |

**Monthly included credits:**
- Power Automate Premium: 500 credits/user/month
- Power Apps Premium: 500 credits/user/month
- Additional credits: purchasable as add-on packs (1M credits ≈ $1,000)

**Monitor usage:** Power Platform Admin Center → Capacity → AI Builder → Credit usage report

---

## Error Codes

| Error | Cause | Remediation |
|---|---|---|
| `AIBuilderCreditsInsufficient` | No AI Builder credits remaining | Purchase add-on pack or reduce usage |
| `ModelNotPublished` | Model in draft/training state | Publish model before using in flows |
| `DocumentTooLarge` | File exceeds 20 MB or 200 pages | Split document or compress before upload |
| `UnsupportedFileType` | Format not PDF/JPEG/PNG/TIFF/BMP | Convert document to supported format |
| `LowConfidenceExtraction` | Fields extracted with < threshold confidence | Add more training documents with similar layout |
| `TrainingFailed` | Insufficient or inconsistent training data | Add more documents; review tagging consistency |
| `ModelVersionMismatch` | Flow using unpublished model version | Re-publish model after retraining |
| `ConnectionNotAuthorized` | AI Builder connection credentials invalid | Re-create AI Builder connection |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Document size | 20 MB / 200 pages | Per document |
| Concurrent predictions | 5 per environment | Queue additional requests |
| Training documents | Min 5, recommended 50+ | Per layout variant |
| Custom model fields | 100 fields | Per document processing model |
| Table rows per document | 1,000 | For table extraction |
| Model publishing time | 5–30 min | Varies by model type/size |
| API throttle | 5 requests/second | Per environment for prediction API |

---

## Production Gotchas

- **Model retraining invalidates flows** — after retraining, you must republish the model AND
  re-run flows that use it; older flow runs that reference the pre-retrain version will continue
  with the old model until the connection is refreshed.
- **Credits are pooled at tenant level** — a spike in usage by one department drains credits
  for the entire organization; set up usage alerts at 80% of monthly allocation.
- **Low-confidence fields require human review** — always add a condition in the flow to
  check confidence scores and route to a Teams approval card if below threshold (e.g., 0.75).
- **Prebuilt models (invoice, receipt) are updated by Microsoft** automatically — test flows
  after Microsoft model updates as output field names may change in minor versions.
- **Document processing models are per-layout** — a single model handles one document layout.
  For multi-vendor invoices, train separate models per vendor or use the composite model pattern.
- **AI Builder in GCC/GCC-High** has restricted model types — not all prebuilt models are
  available in government cloud; check the sovereign cloud availability matrix before designing.
