---
name: azure-document-intelligence
description: Deep expertise in Azure AI Document Intelligence (formerly Form Recognizer) — OCR, prebuilt models (invoices, receipts, IDs, tax forms), custom extraction and classification models, layout analysis, document classification, batch processing, and integration patterns via REST API and SDKs.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - document intelligence
  - form recognizer
  - azure ocr
  - invoice extraction
  - receipt scanning
  - document analysis
  - custom document model
  - layout analysis
  - document classification
  - id document extraction
  - tax form processing
  - handwriting recognition
  - prebuilt-invoice
  - prebuilt-receipt
  - prebuilt-idDocument
  - prebuilt-layout
  - prebuilt-read
  - prebuilt-w2
  - prebuilt-tax
  - prebuilt-healthInsuranceCard
  - prebuilt-contract
  - prebuilt-businessCard
  - prebuilt-document
  - document model
  - analyze document
  - extract fields
  - table extraction
  - barcode recognition
  - selection marks
  - bounding polygon
  - composed model
  - neural model
  - template model
  - document classifier
  - split classify
  - batch analyze
  - document intelligence studio
---

# Azure AI Document Intelligence

This skill provides comprehensive knowledge for Azure AI Document Intelligence (formerly Azure Form Recognizer). It covers the full lifecycle of document processing: OCR text extraction, prebuilt model analysis (invoices, receipts, IDs, tax forms), custom model training and deployment, layout analysis, document classification, batch processing, and integration with Azure services.

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Resource provisioning and management | required | required | `AzureCloud`* | `service-principal` | `Cognitive Services Contributor` |
| Document analysis (data plane) | required | required | `AzureCloud`* | `service-principal` | `Cognitive Services User` |
| Custom model training | required | required | `AzureCloud`* | `service-principal` | `Cognitive Services Contributor` |
| Blob Storage access (training data) | required | required | `AzureCloud`* | `service-principal` | `Storage Blob Data Reader` |

\* Use sovereign cloud values from the canonical contract when applicable.

Fail fast when required context is missing. Redact tenant, subscription, and endpoint keys in outputs.

## Architecture Overview

```
Azure AI Document Intelligence
  ├─ Resource (Cognitive Services account, kind=FormRecognizer)
  │    ├─ Endpoint: https://{resourceName}.cognitiveservices.azure.com
  │    ├─ Keys (key1, key2) or Managed Identity
  │    └─ Pricing Tier: F0 (free) or S0 (standard)
  │
  ├─ Prebuilt Models (no training required)
  │    ├─ prebuilt-invoice        — Vendor invoices
  │    ├─ prebuilt-receipt        — Sales receipts
  │    ├─ prebuilt-idDocument     — Passports, driver's licenses
  │    ├─ prebuilt-businessCard   — Business cards
  │    ├─ prebuilt-w2             — US W-2 tax forms
  │    ├─ prebuilt-tax.us.1099.*  — US 1099 variants
  │    ├─ prebuilt-tax.us.1040    — US Form 1040
  │    ├─ prebuilt-healthInsuranceCard.us — US health insurance cards
  │    ├─ prebuilt-contract       — Contracts and agreements
  │    ├─ prebuilt-layout         — Tables, figures, paragraphs, selection marks
  │    ├─ prebuilt-read           — OCR text extraction only
  │    └─ prebuilt-document       — Generic key-value pairs
  │
  ├─ Custom Models
  │    ├─ Template models (fixed layout, fewer samples)
  │    ├─ Neural models (variable layout, needs 15-20+ samples)
  │    ├─ Generative models (preview, uses GPT for extraction)
  │    └─ Composed models (routes to best-matching component)
  │
  ├─ Custom Classifiers
  │    ├─ Document type classification
  │    ├─ Split/classify workflows
  │    └─ Multi-document file routing
  │
  └─ Batch Processing
       ├─ Analyze batch API
       ├─ Async polling pattern
       └─ Result retrieval
```

## API Version and Endpoints

The current GA API version is `2024-11-30`. The service endpoint pattern is:

```
https://{endpoint}/documentintelligence/documentModels/{modelId}:analyze?api-version=2024-11-30
```

### Key REST API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/documentintelligence/documentModels/{modelId}:analyze` | Start async document analysis |
| GET | `/documentintelligence/documentModels/{modelId}/analyzeResults/{resultId}` | Poll analysis result |
| GET | `/documentintelligence/documentModels` | List all models (prebuilt + custom) |
| GET | `/documentintelligence/documentModels/{modelId}` | Get model details and field schema |
| POST | `/documentintelligence/documentModels:build` | Build (train) a custom model |
| POST | `/documentintelligence/documentModels:compose` | Compose multiple models into one |
| DELETE | `/documentintelligence/documentModels/{modelId}` | Delete a custom model |
| POST | `/documentintelligence/documentModels/{modelId}:copyTo` | Copy model to another resource |
| POST | `/documentintelligence/documentClassifiers:build` | Build a custom classifier |
| POST | `/documentintelligence/documentClassifiers/{classifierId}:classify` | Classify a document |
| GET | `/documentintelligence/documentClassifiers/{classifierId}` | Get classifier details |
| GET | `/documentintelligence/operations/{operationId}` | Track long-running operations |

All endpoints require `?api-version=2024-11-30` query parameter.

Authentication: `Ocp-Apim-Subscription-Key: {apiKey}` header or `Authorization: Bearer {entraToken}` (managed identity).

## Prebuilt Models

Prebuilt models are ready to use without training. Each model extracts domain-specific fields with high accuracy.

### prebuilt-invoice

Extracts structured data from vendor invoices. Supports single and multi-page invoices.

**Key fields:** `VendorName`, `VendorAddress`, `VendorTaxId`, `CustomerName`, `CustomerAddress`, `CustomerAddressRecipient`, `InvoiceId`, `InvoiceDate`, `DueDate`, `PurchaseOrder`, `SubTotal`, `TotalTax`, `InvoiceTotal`, `AmountDue`, `PreviousUnpaidBalance`, `RemittanceAddress`, `ServiceAddress`, `ShippingAddress`, `BillingAddress`, `PaymentTerm`, `CurrencyCode`

**Line items:** `Items` array with `Description`, `Quantity`, `Unit`, `UnitPrice`, `ProductCode`, `Amount`, `Tax`, `Date`

**Supported locales:** en-US, en-GB, en-AU, en-CA, de-DE, fr-FR, it-IT, es-ES, nl-NL, pt-BR, ja-JP, zh-Hans, ko-KR, and 40+ more

### prebuilt-receipt

Extracts data from sales receipts (retail, restaurants, gas stations).

**Key fields:** `MerchantName`, `MerchantAddress`, `MerchantPhoneNumber`, `TransactionDate`, `TransactionTime`, `Total`, `Subtotal`, `TotalTax`, `Tip`, `PaymentType` (Cash/Credit Card/Debit Card)

**Line items:** `Items` array with `Description`, `Quantity`, `Price`, `TotalPrice`

### prebuilt-idDocument

Extracts data from passports, driver's licenses, and national identity cards.

**Key fields:** `FirstName`, `LastName`, `MiddleName`, `DocumentNumber`, `DateOfBirth`, `DateOfExpiration`, `DateOfIssue`, `Sex`, `Address`, `CountryRegion`, `Region`, `DocumentType`, `Nationality`, `PlaceOfBirth`, `MachineReadableZone`

**Supported documents:** US driver's licenses, US/international passports, EU national IDs, Canada driver's licenses, India Aadhaar/PAN, Australia driver's licenses

### prebuilt-w2

Extracts data from US W-2 tax forms.

**Key fields:** `Employee` (Name, SSN, Address), `Employer` (Name, EIN, Address), `WagesTipsOtherCompensation`, `FederalIncomeTaxWithheld`, `SocialSecurityWages`, `SocialSecurityTaxWithheld`, `MedicareWagesAndTips`, `MedicareTaxWithheld`, `TaxYear`, `W2FormVariant`, `StateTaxInfos` (array)

### prebuilt-tax.us.1099.* Variants

| Model ID | Form Type | Key Fields |
|----------|-----------|------------|
| `prebuilt-tax.us.1099.misc` | 1099-MISC | Payer, Recipient, Rents, Royalties, OtherIncome, FederalTaxWithheld |
| `prebuilt-tax.us.1099.div` | 1099-DIV | OrdinaryDividends, QualifiedDividends, CapitalGainDistributions |
| `prebuilt-tax.us.1099.int` | 1099-INT | InterestIncome, EarlySavingsWithdrawalPenalty, FederalTaxWithheld |
| `prebuilt-tax.us.1099.nec` | 1099-NEC | NonemployeeCompensation, PayerTIN, RecipientTIN |
| `prebuilt-tax.us.1099.k` | 1099-K | GrossAmount, CardNotPresentTransactions, PaymentCardTransactions |

### prebuilt-healthInsuranceCard.us

Extracts data from US health insurance cards.

**Key fields:** `Insurer`, `MemberName`, `MemberId`, `GroupNumber`, `PlanName`, `PlanType`, `Copays` (array with benefit type and amount), `Payer`, `PrescriptionInfo`, `IdNumberSuffix`

### prebuilt-contract

Extracts data from contracts and agreements.

**Key fields:** `Parties` (array with Name, Role), `EffectiveDate`, `ExpirationDate`, `RenewalDate`, `PaymentTerms`, `Jurisdiction`, `ContractType`

### prebuilt-layout

Extracts document structure without domain-specific field extraction. Use for tables, figures, paragraphs, selection marks, and barcodes.

**Extracted elements:**
- **Paragraphs** — with role (title, sectionHeading, footnote, pageHeader, pageFooter, pageNumber)
- **Tables** — with cells (rowIndex, columnIndex, kind, content, spans)
- **Figures** — with bounding regions and captions
- **Selection marks** — checkboxes, radio buttons (state: selected/unselected)
- **Barcodes** — QR codes, Code 128, Code 39, EAN, UPC, and more
- **Pages** — width, height, unit, angle (rotation), words, lines

### prebuilt-read

OCR-only text extraction. The simplest and cheapest model.

**Extracted elements:**
- **Pages** — words (content, confidence, polygon), lines (content, polygon), spans
- **Languages** — detected languages with confidence per span
- **Styles** — handwritten vs printed detection with confidence
- **Paragraphs** — plain text paragraphs (no structural roles)

Use `prebuilt-read` when you only need text content. Use `prebuilt-layout` when you need structure.

### prebuilt-document

General document model that extracts key-value pairs and entities without domain-specific knowledge.

**Extracted elements:**
- **Key-value pairs** — generic label-value extraction
- **Entities** — detected entities with category
- **Tables** — same as layout
- **Styles** — handwritten detection

Use domain-specific prebuilt models when available. `prebuilt-document` is a fallback for documents without a matching prebuilt.

## Custom Models

Custom models are trained on your specific document types using labeled training data.

### Build Modes

| Mode | Layout Dependency | Min Training Samples | Best For |
|------|-------------------|---------------------|----------|
| `template` | Fixed layout | 5 | Standardized forms (same vendor, same template) |
| `neural` | Variable layout | 15-20 | Multi-vendor documents (invoices from different vendors) |
| `generative` | Variable layout (preview) | 0-5 | Unstructured documents, extraction without labeling |

### Training Data Requirements

Training data must be stored in an Azure Blob Storage container with the following structure:

```
training-container/
  ├─ document1.pdf
  ├─ document1.ocr.json      (auto-generated by Studio)
  ├─ document1.labels.json   (field labels)
  ├─ document2.pdf
  ├─ document2.ocr.json
  ├─ document2.labels.json
  └─ fields.json             (field schema definition)
```

The `fields.json` file defines the extraction schema:

```json
{
  "fields": {
    "VendorName": { "fieldType": "string" },
    "InvoiceDate": { "fieldType": "date" },
    "Total": { "fieldType": "number" },
    "LineItems": {
      "fieldType": "array",
      "itemType": {
        "type": "object",
        "properties": {
          "Description": { "fieldType": "string" },
          "Amount": { "fieldType": "number" }
        }
      }
    }
  }
}
```

### Build Custom Model (REST API)

```http
POST https://{endpoint}/documentintelligence/documentModels:build?api-version=2024-11-30
Ocp-Apim-Subscription-Key: {apiKey}
Content-Type: application/json

{
  "modelId": "custom-purchase-order-v1",
  "buildMode": "neural",
  "azureBlobSource": {
    "containerUrl": "https://{storageAccount}.blob.core.windows.net/{container}?{sasToken}",
    "prefix": "training/"
  },
  "description": "Custom purchase order extraction model v1",
  "tags": { "project": "procurement", "version": "1" }
}
```

Response: `202 Accepted` with `Operation-Location` header. Poll until `status: succeeded`.

### Composed Models

Composed models combine multiple custom models. When a document is analyzed, the composed model automatically routes to the best-matching component.

```http
POST https://{endpoint}/documentintelligence/documentModels:compose?api-version=2024-11-30
{
  "modelId": "finance-docs-composed",
  "componentModels": [
    { "modelId": "custom-invoice-v2" },
    { "modelId": "custom-purchase-order-v1" },
    { "modelId": "custom-expense-report-v1" }
  ],
  "description": "Composed model for finance document routing"
}
```

The result includes `docType` and `docTypeConfidence` indicating which component model was selected.

### Model Lifecycle

| Operation | CLI | REST |
|-----------|-----|------|
| List models | `az cognitiveservices account deployment list` | `GET /documentModels` |
| Get model info | — | `GET /documentModels/{modelId}` |
| Delete model | — | `DELETE /documentModels/{modelId}` |
| Copy model | — | `POST /documentModels/{modelId}:copyTo` |

Custom models do not expire but should be retrained when:
- Extraction accuracy degrades on new document variants
- Business requirements change (new fields needed)
- Training data quality improves (more/better labeled samples)

## Layout Analysis

The layout model (`prebuilt-layout`) extracts document structure at a granular level.

### Document Structure Hierarchy

```
AnalyzeResult
  ├─ pages[]
  │    ├─ pageNumber, width, height, unit, angle
  │    ├─ words[] (content, confidence, polygon, span)
  │    ├─ lines[] (content, polygon, spans)
  │    └─ selectionMarks[] (state, confidence, polygon)
  │
  ├─ paragraphs[]
  │    ├─ content, role, boundingRegions, spans
  │    └─ role: title | sectionHeading | footnote | pageHeader | pageFooter | pageNumber | formulaBlock
  │
  ├─ tables[]
  │    ├─ rowCount, columnCount, boundingRegions, spans
  │    └─ cells[] (rowIndex, columnIndex, content, kind, rowSpan, columnSpan)
  │         └─ kind: content | columnHeader | rowHeader | stub | description
  │
  ├─ figures[]
  │    ├─ boundingRegions, spans, caption, elements
  │    └─ id (for cross-referencing)
  │
  └─ styles[]
       ├─ isHandwritten (boolean)
       ├─ confidence
       └─ spans (which text ranges are handwritten)
```

### Table Extraction

Tables spanning multiple pages are fully supported. Multi-page tables use `rowSpan` and `columnSpan` to track cell boundaries.

```json
{
  "rowIndex": 0,
  "columnIndex": 0,
  "content": "Product Name",
  "kind": "columnHeader",
  "rowSpan": 1,
  "columnSpan": 1,
  "boundingRegions": [{ "pageNumber": 1, "polygon": [...] }],
  "spans": [{ "offset": 45, "length": 12 }],
  "confidence": 0.95
}
```

### Bounding Polygon Coordinate System

- Coordinates are in the unit specified by `pages[].unit` (usually `inch`)
- Origin is the top-left corner of the page
- Polygon is an array of points: `[x1, y1, x2, y2, x3, y3, x4, y4]` (4 corners)
- To convert to pixels: multiply by the page DPI (typically 72 for PDFs, varies for images)

### Selection Marks (Checkboxes/Radio Buttons)

```json
{
  "state": "selected",
  "confidence": 0.98,
  "polygon": [1.2, 3.4, 1.4, 3.4, 1.4, 3.6, 1.2, 3.6],
  "span": { "offset": 120, "length": 1 }
}
```

States: `selected` or `unselected`.

### Barcode Recognition

The layout model detects and decodes barcodes:

**Supported formats:** QR Code, Code 128, Code 39, Code 93, UPC-A, UPC-E, EAN-8, EAN-13, ITF, Codabar, DataBar, DataBar Expanded, PDF417, Data Matrix

```json
{
  "kind": "QRCode",
  "value": "https://example.com/product/12345",
  "polygon": [...],
  "span": { "offset": 200, "length": 40 },
  "confidence": 0.99
}
```

## Document Classification

Custom classifiers identify document types and can split multi-document files.

### Building a Classifier

Training data structure:

```
classifier-training/
  ├─ invoices/
  │    ├─ invoice1.pdf
  │    ├─ invoice2.pdf
  │    └─ invoice3.pdf
  ├─ receipts/
  │    ├─ receipt1.pdf
  │    └─ receipt2.pdf
  └─ contracts/
       ├─ contract1.pdf
       └─ contract2.pdf
```

Each subfolder name becomes a document type. Minimum 5 documents per type.

```http
POST https://{endpoint}/documentintelligence/documentClassifiers:build?api-version=2024-11-30
{
  "classifierId": "finance-classifier-v1",
  "docTypes": {
    "invoices": {
      "azureBlobSource": {
        "containerUrl": "https://{sa}.blob.core.windows.net/{container}?{sas}",
        "prefix": "classifier-training/invoices/"
      }
    },
    "receipts": {
      "azureBlobSource": {
        "containerUrl": "https://{sa}.blob.core.windows.net/{container}?{sas}",
        "prefix": "classifier-training/receipts/"
      }
    },
    "contracts": {
      "azureBlobSource": {
        "containerUrl": "https://{sa}.blob.core.windows.net/{container}?{sas}",
        "prefix": "classifier-training/contracts/"
      }
    }
  },
  "description": "Classifier for finance document routing"
}
```

### Classifying Documents

```http
POST https://{endpoint}/documentintelligence/documentClassifiers/{classifierId}:classify?api-version=2024-11-30
Content-Type: application/json

{
  "urlSource": "https://storage.blob.core.windows.net/docs/mixed-document.pdf"
}
```

Response (after polling):

```json
{
  "status": "succeeded",
  "analyzeResult": {
    "documents": [
      {
        "docType": "invoices",
        "confidence": 0.95,
        "boundingRegions": [{ "pageNumber": 1 }, { "pageNumber": 2 }]
      },
      {
        "docType": "receipts",
        "confidence": 0.88,
        "boundingRegions": [{ "pageNumber": 3 }]
      }
    ]
  }
}
```

### Split/Classify Workflow

For multi-document files (e.g., a scanned batch of mixed documents):

1. **Classify** the file to identify document boundaries and types
2. **Split** based on `boundingRegions` page ranges
3. **Analyze** each split segment with the appropriate model

```
mixed-batch.pdf (10 pages)
  ├─ Pages 1-2: Invoice  → analyze with prebuilt-invoice
  ├─ Pages 3-3: Receipt  → analyze with prebuilt-receipt
  ├─ Pages 4-6: Contract → analyze with prebuilt-contract
  └─ Pages 7-10: Invoice → analyze with prebuilt-invoice
```

Set the `pages` parameter in the analyze request to process specific page ranges:

```http
POST .../documentModels/prebuilt-invoice:analyze?api-version=2024-11-30&pages=1-2
```

## OCR and Read Model

The `prebuilt-read` model provides pure OCR capabilities.

### Text Extraction Hierarchy

```
pages[]
  ├─ words[] — individual words with confidence and polygon
  ├─ lines[] — lines of text (logical groupings of words)
  └─ spans[] — character offset ranges into the full content string
```

### Handwriting Recognition

The read model detects handwritten text and reports it via the `styles` array:

```json
{
  "styles": [
    {
      "isHandwritten": true,
      "confidence": 0.92,
      "spans": [{ "offset": 50, "length": 120 }]
    }
  ]
}
```

Use the span offset/length to identify which portion of the extracted content is handwritten.

### Language Detection

Detected languages are reported per text span:

```json
{
  "languages": [
    {
      "locale": "en",
      "confidence": 0.98,
      "spans": [{ "offset": 0, "length": 500 }]
    },
    {
      "locale": "fr",
      "confidence": 0.85,
      "spans": [{ "offset": 501, "length": 200 }]
    }
  ]
}
```

### Supported Languages

The read model supports 300+ languages for printed text and 100+ for handwritten text. Key languages with full support: English, French, German, Italian, Spanish, Portuguese, Chinese (Simplified/Traditional), Japanese, Korean, Arabic, Hindi, Russian.

## Batch Processing

For processing many documents at scale, use the batch analyze pattern.

### Analyze Batch API

```http
POST https://{endpoint}/documentintelligence/documentModels/{modelId}:analyzeBatch?api-version=2024-11-30
Content-Type: application/json

{
  "azureBlobSource": {
    "containerUrl": "https://{sa}.blob.core.windows.net/input-docs?{sasToken}",
    "prefix": "invoices/"
  },
  "resultContainerUrl": "https://{sa}.blob.core.windows.net/results?{sasToken}",
  "resultPrefix": "invoice-results/",
  "overwriteExisting": true
}
```

This processes all documents matching the prefix and writes results to the output container.

### Async Polling Pattern

All analysis operations follow the same pattern:

1. **POST** the request — returns `202 Accepted`
2. Read the `Operation-Location` response header
3. **GET** the operation URL — returns `status`: `notStarted` | `running` | `succeeded` | `failed`
4. Poll every 2-5 seconds until `succeeded` or `failed`
5. On `succeeded`, the response body contains `analyzeResult`

```bash
# Step 1: Start analysis
OPERATION_URL=$(curl -s -i -X POST \
  "https://{endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: {key}" \
  -H "Content-Type: application/json" \
  -d '{"urlSource": "https://example.com/invoice.pdf"}' \
  | grep -i "Operation-Location" | awk '{print $2}' | tr -d '\r')

# Step 2: Poll for result
while true; do
  RESULT=$(curl -s "$OPERATION_URL" -H "Ocp-Apim-Subscription-Key: {key}")
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  if [ "$STATUS" = "succeeded" ] || [ "$STATUS" = "failed" ]; then
    echo "$RESULT"
    break
  fi
  sleep 3
done
```

### Rate Limits and Throttling

| Tier | Requests/second | Pages/month (free) | Notes |
|------|----------------|--------------------|-------|
| F0 (Free) | 1 | 500 | Dev/test only |
| S0 (Standard) | 15 | Unlimited (pay per page) | Production |

Handle HTTP 429 with exponential backoff. Read the `Retry-After` header for the recommended wait time.

## SDK and REST API

### Python SDK

```python
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential

# Key-based auth
client = DocumentIntelligenceClient(
    endpoint="https://{resource}.cognitiveservices.azure.com",
    credential=AzureKeyCredential("{apiKey}")
)

# Managed identity auth (preferred for production)
client = DocumentIntelligenceClient(
    endpoint="https://{resource}.cognitiveservices.azure.com",
    credential=DefaultAzureCredential()
)

# Analyze from URL
poller = client.begin_analyze_document(
    "prebuilt-invoice",
    analyze_request={"urlSource": "https://example.com/invoice.pdf"},
    content_type="application/json"
)
result = poller.result()

# Analyze from file
with open("invoice.pdf", "rb") as f:
    poller = client.begin_analyze_document(
        "prebuilt-invoice",
        analyze_request=f,
        content_type="application/octet-stream"
    )
    result = poller.result()

# Access extracted fields
for doc in result.documents:
    print(f"Doc type: {doc.doc_type}, confidence: {doc.confidence}")
    for name, field in doc.fields.items():
        print(f"  {name}: {field.content} (confidence: {field.confidence})")
```

**Install:** `pip install azure-ai-documentintelligence azure-identity`

### C# / .NET SDK

```csharp
using Azure;
using Azure.AI.DocumentIntelligence;
using Azure.Identity;

// Key-based auth
var client = new DocumentIntelligenceClient(
    new Uri("https://{resource}.cognitiveservices.azure.com"),
    new AzureKeyCredential("{apiKey}"));

// Managed identity auth
var client = new DocumentIntelligenceClient(
    new Uri("https://{resource}.cognitiveservices.azure.com"),
    new DefaultAzureCredential());

// Analyze from URL
var content = new AnalyzeDocumentContent { UrlSource = new Uri("https://example.com/invoice.pdf") };
Operation<AnalyzeResult> operation = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed, "prebuilt-invoice", content);
AnalyzeResult result = operation.Value;

// Access fields
foreach (var document in result.Documents)
{
    Console.WriteLine($"Type: {document.DocType}, Confidence: {document.Confidence}");
    foreach (var field in document.Fields)
    {
        Console.WriteLine($"  {field.Key}: {field.Value.Content} ({field.Value.Confidence})");
    }
}
```

**Install:** `dotnet add package Azure.AI.DocumentIntelligence` and `dotnet add package Azure.Identity`

### JavaScript/TypeScript SDK

```typescript
import { DocumentIntelligenceClient } from "@azure/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/core-auth";
import { DefaultAzureCredential } from "@azure/identity";

// Key-based auth
const client = new DocumentIntelligenceClient(
  "https://{resource}.cognitiveservices.azure.com",
  new AzureKeyCredential("{apiKey}")
);

// Managed identity auth
const client = new DocumentIntelligenceClient(
  "https://{resource}.cognitiveservices.azure.com",
  new DefaultAzureCredential()
);

// Analyze from URL
const poller = await client.beginAnalyzeDocument("prebuilt-invoice", {
  urlSource: "https://example.com/invoice.pdf"
});
const result = await poller.pollUntilDone();

for (const doc of result.documents ?? []) {
  console.log(`Type: ${doc.docType}, Confidence: ${doc.confidence}`);
  for (const [name, field] of Object.entries(doc.fields ?? {})) {
    console.log(`  ${name}: ${field.content} (${field.confidence})`);
  }
}
```

**Install:** `npm install @azure/ai-document-intelligence @azure/identity`

## Integration Patterns

### Azure Functions — Blob Trigger

Process documents automatically when uploaded to Blob Storage:

```python
import azure.functions as func
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.identity import DefaultAzureCredential
import json

app = func.FunctionApp()

@app.blob_trigger(arg_name="blob", path="incoming-invoices/{name}",
                  connection="AzureWebJobsStorage")
def process_invoice(blob: func.InputStream):
    client = DocumentIntelligenceClient(
        endpoint=os.environ["DOCUMENT_INTELLIGENCE_ENDPOINT"],
        credential=DefaultAzureCredential()
    )

    poller = client.begin_analyze_document(
        "prebuilt-invoice",
        analyze_request=blob.read(),
        content_type="application/octet-stream"
    )
    result = poller.result()

    # Process extracted fields
    for doc in result.documents:
        invoice_data = {
            field_name: field.content
            for field_name, field in doc.fields.items()
        }
        # Write to database, queue, etc.
```

### Logic Apps Connector

Use the **Azure AI Document Intelligence** connector in Logic Apps:

1. **When a blob is added** (Azure Blob Storage trigger)
2. **Analyze Document** action — select model, provide document content
3. **Parse JSON** — parse the analysis result
4. **Create record** — write extracted fields to Dataverse, SQL, SharePoint

### AI Search Skillset Integration

Use Document Intelligence as a custom skill in Azure AI Search indexing:

```json
{
  "@odata.type": "#Microsoft.Skills.Custom.WebApiSkill",
  "name": "document-intelligence-skill",
  "uri": "https://{functionApp}.azurewebsites.net/api/AnalyzeDocument",
  "httpMethod": "POST",
  "batchSize": 1,
  "inputs": [
    { "name": "documentUrl", "source": "/document/metadata_storage_path" }
  ],
  "outputs": [
    { "name": "invoiceTotal", "targetName": "invoiceTotal" },
    { "name": "vendorName", "targetName": "vendorName" },
    { "name": "invoiceDate", "targetName": "invoiceDate" }
  ]
}
```

### Power Automate Flow

Use the **AI Builder** actions in Power Automate:
- **Extract information from invoices** (uses prebuilt-invoice)
- **Extract information from receipts**
- **Extract information from identity documents**
- **Extract information from forms** (custom model)

## Monitoring and Diagnostics

### Diagnostic Settings

Enable diagnostic logging on the Cognitive Services resource:

```bash
az monitor diagnostic-settings create \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account} \
  --name "docai-diagnostics" \
  --workspace /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{workspace} \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `TotalCalls` | Total API requests | Baseline + 50% (anomaly) |
| `SuccessfulCalls` | Successful requests | Drop below 95% success rate |
| `TotalErrors` | Failed requests | > 5% error rate |
| `Latency` | Request latency (ms) | > 30 seconds average |
| `ServerErrors` | 5xx errors | Any occurrence |
| `ClientErrors` | 4xx errors | > 10% of total calls |

### KQL Queries for Log Analytics

```kql
// Analysis failures by error code
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where Category == "RequestResponse"
| where resultSignature_d >= 400
| summarize Count=count() by resultSignature_d, OperationName
| order by Count desc

// Average latency by model
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where OperationName contains "Analyze"
| summarize AvgLatencyMs=avg(DurationMs), P95=percentile(DurationMs, 95) by OperationName
| order by AvgLatencyMs desc

// Daily page consumption (cost tracking)
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where OperationName contains "Analyze"
| where resultSignature_d == 200
| summarize PageCount=count() by bin(TimeGenerated, 1d)
| render timechart
```

## Security

### Managed Identity

Preferred authentication for production:

```bash
# Enable system-assigned managed identity on the consuming resource (e.g., Azure Function)
az functionapp identity assign --name {functionApp} --resource-group {rg}

# Get the principal ID
PRINCIPAL_ID=$(az functionapp identity show --name {functionApp} --resource-group {rg} --query principalId -o tsv)

# Assign Cognitive Services User role on the Document Intelligence resource
az role assignment create \
  --role "Cognitive Services User" \
  --assignee $PRINCIPAL_ID \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}
```

### Private Endpoints

Disable public network access and configure private endpoints:

```bash
# Disable public access
az cognitiveservices account update --name {account} --resource-group {rg} --public-network-access Disabled

# Create private endpoint
az network private-endpoint create \
  --name pe-docai \
  --resource-group {rg} \
  --vnet-name {vnet} \
  --subnet {subnet} \
  --private-connection-resource-id /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account} \
  --group-ids account \
  --connection-name conn-docai

# Create private DNS zone
az network private-dns zone create --resource-group {rg} --name privatelink.cognitiveservices.azure.com
az network private-dns link vnet create --resource-group {rg} --zone-name privatelink.cognitiveservices.azure.com --name docai-dns-link --virtual-network {vnet} --registration-enabled false
az network private-endpoint dns-zone-group create --resource-group {rg} --endpoint-name pe-docai --name docai-dns-group --private-dns-zone privatelink.cognitiveservices.azure.com --zone-name cognitiveservices
```

### Customer-Managed Keys

For sensitive document processing, configure CMK encryption:

```bash
az cognitiveservices account update \
  --name {account} \
  --resource-group {rg} \
  --encryption-key-source Microsoft.KeyVault \
  --encryption-key-name {keyName} \
  --encryption-key-vault "https://{keyVault}.vault.azure.net" \
  --encryption-key-version {keyVersion}
```

Requires the Cognitive Services account identity to have `Key Vault Crypto User` role on the Key Vault.

### Data Residency

- Documents submitted for analysis are processed in the region of the resource
- Extracted results are stored temporarily for result retrieval (24 hours for async operations)
- Custom model training data must be in the same region or an accessible Blob Storage account
- For EU data residency, deploy resources in EU regions (West Europe, North Europe, France Central, Germany West Central)

## Azure CLI Quick Reference

### Account Lifecycle

```bash
# Create Document Intelligence resource
az cognitiveservices account create \
  --name {account} \
  --resource-group {rg} \
  --kind FormRecognizer \
  --sku S0 \
  --location eastus \
  --custom-domain {account} \
  --yes

# List Document Intelligence resources
az cognitiveservices account list --query "[?kind=='FormRecognizer'].{Name:name, RG:resourceGroup, Location:location, SKU:sku.name}" -o table

# Get endpoint and keys
az cognitiveservices account show --name {account} --resource-group {rg} --query properties.endpoint -o tsv
az cognitiveservices account keys list --name {account} --resource-group {rg} --query key1 -o tsv

# Regenerate keys
az cognitiveservices account keys regenerate --name {account} --resource-group {rg} --key-name key1

# Delete resource
az cognitiveservices account delete --name {account} --resource-group {rg}
```

### Network Security

```bash
# Add VNet rule
az cognitiveservices account network-rule add --name {account} --resource-group {rg} --subnet {subnetId}

# Add IP rule
az cognitiveservices account network-rule add --name {account} --resource-group {rg} --ip-address 203.0.113.0/24

# Set default action to Deny
az cognitiveservices account update --name {account} --resource-group {rg} --custom-domain {account} --api-properties "{\"networkAcls\":{\"defaultAction\":\"Deny\"}}"
```

## Error Codes

| HTTP Status | Error Code | Meaning | Remediation |
|-------------|-----------|---------|-------------|
| 400 | `InvalidRequest` | Malformed request body | Check JSON structure; ensure `urlSource` or `base64Source` is present |
| 400 | `UnsupportedContent` | File format not supported | Convert to PDF, JPEG, PNG, BMP, TIFF, or DOCX |
| 400 | `ContentTooLarge` | Document exceeds size limit | Split large PDFs; 500 MB max, 2000 page max |
| 400 | `InvalidContentLength` | Content-Length header mismatch | Verify Content-Length matches actual body size |
| 401 | `Unauthorized` | Invalid API key or token | Verify key in portal or check managed identity role |
| 403 | `Forbidden` | Insufficient permissions | Assign `Cognitive Services User` role |
| 404 | `ModelNotFound` | Model ID does not exist | List models to verify; check for typos |
| 404 | `ClassifierNotFound` | Classifier ID does not exist | List classifiers to verify |
| 409 | `ModelExists` | Model ID already in use | Choose a different model ID or delete existing |
| 429 | `TooManyRequests` | Rate limit exceeded | Backoff with `Retry-After` header; upgrade to S0 |
| 500 | `InternalServerError` | Service error | Retry with backoff; file support ticket if persistent |

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| File size (URL source) | 500 MB | — |
| File size (base64 source) | 500 MB | Encoded in request body |
| Pages per document | 2,000 | Prebuilt and custom models |
| Analysis timeout | 30 minutes | For very large documents |
| Custom models per resource | 500 | Template + neural + generative |
| Composed model components | 200 | Per composed model |
| Classifiers per resource | 100 | — |
| Min training samples (template) | 5 | Per document type |
| Min training samples (neural) | 5 (15-20 recommended) | More samples improve accuracy |
| Max training samples | 10,000 | Per build operation |
| RPS (F0 free tier) | 1 | — |
| RPS (S0 standard tier) | 15 | — |
| Free tier pages/month | 500 | — |

## Output Convention

Every operation produces a structured markdown report:

1. **Header**: operation, timestamp, model used
2. **Document summary**: doc type, confidence, page count
3. **Extracted fields table**: field name, value, confidence, notes
4. **Tables**: formatted markdown tables for any extracted table data
5. **Warnings**: low-confidence fields, unsupported content, partial extractions
6. **Recommendations**: model selection, confidence handling, next steps

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Prebuilt model IDs, field schemas, locale support, confidence patterns | [`references/prebuilt-models.md`](./references/prebuilt-models.md) |
| Custom model training, labeling, build modes, composed models, evaluation | [`references/custom-models.md`](./references/custom-models.md) |
| Layout model capabilities, table extraction, figures, selection marks, barcodes, coordinates | [`references/layout-analysis.md`](./references/layout-analysis.md) |
