# Document Intelligence — Azure AI Reference

Azure AI Document Intelligence (formerly Form Recognizer) extracts structured data from documents using prebuilt and custom models. It processes invoices, receipts, IDs, tax forms, contracts, and custom business documents via REST API.

---

## REST API Endpoints (v4.0)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `https://{endpoint}/documentintelligence/documentModels/{modelId}:analyze?api-version=2024-02-29-preview` | API key or `Cognitive Services User` | Body: source (URL/base64) | Start async analysis |
| GET | `https://{endpoint}/documentintelligence/documentModels/{modelId}/analyzeResults/{resultId}?api-version=2024-02-29-preview` | API key or managed identity | — | Poll analysis result |
| GET | `https://{endpoint}/documentintelligence/documentModels?api-version=2024-02-29-preview` | API key or managed identity | — | List all models |
| GET | `https://{endpoint}/documentintelligence/documentModels/{modelId}?api-version=2024-02-29-preview` | API key or managed identity | — | Get model details |
| POST | `https://{endpoint}/documentintelligence/documentModels:build?api-version=2024-02-29-preview` | `Cognitive Services Contributor` | Body: build config | Build custom model |
| GET | `https://{endpoint}/documentintelligence/operations/{operationId}?api-version=2024-02-29-preview` | API key or managed identity | — | Track build operation |
| DELETE | `https://{endpoint}/documentintelligence/documentModels/{modelId}?api-version=2024-02-29-preview` | `Cognitive Services Contributor` | — | Delete custom model |
| POST | `https://{endpoint}/documentintelligence/documentModels/{id}:copyTo?api-version=2024-02-29-preview` | `Cognitive Services Contributor` | Body: target resource | Copy model to another resource |
| POST | `https://{endpoint}/documentintelligence/documentModels:compose?api-version=2024-02-29-preview` | `Cognitive Services Contributor` | Body: component model IDs | Compose multiple models |

---

## Prebuilt Models Reference

| Model ID | Document Type | Key Fields Extracted |
|----------|--------------|---------------------|
| `prebuilt-invoice` | Vendor invoices | VendorName, InvoiceId, InvoiceDate, DueDate, InvoiceTotal, LineItems (qty, unit price, amount), TaxDetails |
| `prebuilt-receipt` | Sales receipts | MerchantName, TransactionDate, TransactionTime, Total, Tax, Subtotal, LineItems, PaymentType |
| `prebuilt-idDocument` | Passports, driver's licenses | FirstName, LastName, DateOfBirth, DateOfExpiration, DocumentNumber, CountryRegion, Region |
| `prebuilt-businessCard` | Business cards | ContactNames, JobTitles, Emails, PhoneNumbers, Addresses, CompanyNames, Websites |
| `prebuilt-w2` | US W-2 tax forms | EmployeeSSN, EmployerName, EmployerEIN, WagesTips, FederalIncomeTax, State, LocalWages |
| `prebuilt-tax.us.1040` | US Form 1040 | FilingStatus, AdjustedGrossIncome, TaxableIncome, TotalTax, SignatureDate |
| `prebuilt-contract` | Contracts / agreements | Parties, PaymentTerms, EffectiveDate, ExpirationDate, RenewalDate, Jurisdiction |
| `prebuilt-healthInsuranceCard.us` | US health insurance cards | MemberName, MemberId, GroupNumber, PlanName, Payer, Copay |
| `prebuilt-layout` | Any document | Text, tables, selection marks, paragraphs, bounding polygons |
| `prebuilt-read` | Any document | Text content only (OCR), language detection, words + lines |
| `prebuilt-document` | General document | Key-value pairs, entities, tables (no domain-specific extraction) |

---

## Analyze Document (TypeScript)

```typescript
import { AzureKeyCredential, DocumentAnalysisClient } from '@azure/ai-form-recognizer';

const endpoint = 'https://myresource.cognitiveservices.azure.com';
const apiKey = process.env.DOCUMENT_INTELLIGENCE_KEY!;

const client = new DocumentAnalysisClient(
  endpoint,
  new AzureKeyCredential(apiKey)
);

// Analyze an invoice from URL
async function analyzeInvoice(invoiceUrl: string) {
  const poller = await client.beginAnalyzeDocumentFromUrl(
    'prebuilt-invoice',
    invoiceUrl,
    {
      locale: 'en-US'
    }
  );

  const result = await poller.pollUntilDone();

  for (const invoice of result.documents || []) {
    const fields = invoice.fields;
    console.log({
      vendorName: fields.VendorName?.content,
      invoiceId: fields.InvoiceId?.content,
      invoiceDate: fields.InvoiceDate?.content,
      dueDate: fields.DueDate?.content,
      invoiceTotal: {
        amount: fields.InvoiceTotal?.value?.amount,
        currencyCode: fields.InvoiceTotal?.value?.currencyCode
      },
      lineItems: (fields.Items?.value || []).map((item: any) => ({
        description: item.value?.Description?.content,
        quantity: item.value?.Quantity?.content,
        unitPrice: item.value?.UnitPrice?.value?.amount,
        amount: item.value?.Amount?.value?.amount
      }))
    });
  }
}

// Analyze from base64 (for local files)
async function analyzeLocalFile(filePath: string) {
  const fs = await import('fs');
  const fileBuffer = fs.readFileSync(filePath);

  const poller = await client.beginAnalyzeDocument(
    'prebuilt-invoice',
    fileBuffer,
    { contentType: 'application/pdf' }
  );

  return poller.pollUntilDone();
}
```

---

## Raw REST API Pattern (Without SDK)

```typescript
// Step 1: Start analysis
async function startAnalysis(
  endpoint: string,
  apiKey: string,
  modelId: string,
  documentUrl: string
): Promise<string> {
  const response = await fetch(
    `${endpoint}/documentintelligence/documentModels/${modelId}:analyze?api-version=2024-02-29-preview`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urlSource: documentUrl
      })
    }
  );

  // Result ID is in the Operation-Location response header
  const operationLocation = response.headers.get('Operation-Location');
  return operationLocation!.split('/').pop()!.split('?')[0];
}

// Step 2: Poll for results
async function pollForResult(
  endpoint: string,
  apiKey: string,
  modelId: string,
  resultId: string
): Promise<any> {
  const url = `${endpoint}/documentintelligence/documentModels/${modelId}/analyzeResults/${resultId}?api-version=2024-02-29-preview`;

  while (true) {
    const response = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey }
    });

    const data = await response.json();

    if (data.status === 'succeeded') {
      return data.analyzeResult;
    } else if (data.status === 'failed') {
      throw new Error(`Analysis failed: ${JSON.stringify(data.error)}`);
    }

    // Wait before polling again
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

---

## Bounding Polygon and Confidence Scores

```typescript
// Access bounding polygon and confidence for each extracted field
const result = await analyzeDocument(/* ... */);

for (const document of result.documents) {
  for (const [fieldName, fieldValue] of Object.entries(document.fields)) {
    const field = fieldValue as any;
    console.log({
      field: fieldName,
      content: field.content,
      confidence: field.confidence,  // 0.0 - 1.0
      boundingRegions: field.boundingRegions?.map((r: any) => ({
        pageNumber: r.pageNumber,
        polygon: r.polygon  // Array of [x1,y1, x2,y2, ...] coordinates
      }))
    });
  }
}

// Table extraction
for (const table of result.tables || []) {
  for (const cell of table.cells) {
    console.log({
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex,
      content: cell.content,
      kind: cell.kind,  // 'columnHeader' | 'rowHeader' | 'content' | 'stub'
      confidence: cell.confidence
    });
  }
}
```

---

## Custom Model Training

### Template Model (Layout-based)

```typescript
// Train a template model — for documents with consistent layouts
async function buildTemplateModel(
  endpoint: string,
  apiKey: string,
  modelId: string,
  trainingDataUrl: string  // Azure Blob SAS URL to labeled training data
) {
  const response = await fetch(
    `${endpoint}/documentintelligence/documentModels:build?api-version=2024-02-29-preview`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modelId,
        buildMode: 'template',  // 'template' | 'neural' | 'generative'
        azureBlobSource: {
          containerUrl: trainingDataUrl,
          prefix: 'training/'  // Optional subfolder
        },
        description: 'Custom purchase order model'
      })
    }
  );

  const operationLocation = response.headers.get('Operation-Location');
  return operationLocation;
}
```

### Neural Model (Form-free)

```typescript
// Neural model: handles variable layouts with fewer training samples needed
const buildResponse = await fetch(
  `${endpoint}/documentintelligence/documentModels:build?api-version=2024-02-29-preview`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      modelId: 'custom-contract-neural',
      buildMode: 'neural',
      azureBlobSource: { containerUrl: trainingBlobSas },
      description: 'Neural model for contract data extraction'
    })
  }
);
```

---

## Composed Models

Composed models route incoming documents to the best-matching component model automatically.

```typescript
const composeResponse = await fetch(
  `${endpoint}/documentintelligence/documentModels:compose?api-version=2024-02-29-preview`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      modelId: 'finance-documents-composed',
      componentModels: [
        { modelId: 'invoice-model' },
        { modelId: 'purchase-order-model' },
        { modelId: 'expense-report-model' }
      ],
      description: 'Combined finance document extractor'
    })
  }
);
```

---

## Document Intelligence Studio (Labeling)

The Document Intelligence Studio at `https://documentintelligence.ai.azure.com` provides:
- Label training documents with field annotations
- Test prebuilt models interactively
- View detailed analysis results with bounding boxes

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidRequest` | Malformed request body | Check JSON structure; ensure `urlSource` or `base64Source` is present |
| 400 `UnsupportedContent` | File format not supported | Convert to PDF, JPEG, PNG, BMP, TIFF, or DOCX |
| 400 `ContentTooLarge` | Document exceeds size limit | Split large PDFs into smaller chunks |
| 401 `Unauthorized` | Invalid API key | Verify key in Azure portal → Keys and Endpoint |
| 404 `ModelNotFound` | Model ID not found | List models to verify model ID exists |
| 409 `ModelExists` | Model ID already in use | Choose a different model ID |
| 429 `TooManyRequests` | Rate limit reached | Add retry with `Retry-After` header delay |
| `InvalidFieldValue` | Low confidence field | Check confidence score; manual review for scores below 0.7 |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| File size | 500 MB | For URL-based submission |
| Base64 file size | 500 MB | Encoded in request body |
| Pages per document | 2,000 | Prebuilt models; custom models may vary |
| Analysis timeout | 30 minutes | Long PDFs may approach this limit |
| Custom model training samples | Min 5 (neural) / 5 (template) | More samples = better accuracy |
| Composed model components | 100 | Per composed model |
| Custom models per resource | 500 | Per Document Intelligence resource |
| Requests per second (S0 tier) | 15 | — |
| Requests per second (S1 tier) | 15 | — |
| Pages per billing unit | 1 | Per page extracted |

---

## Common Patterns and Gotchas

1. **Operation-Location polling** — The analysis is always asynchronous. The `POST` response returns `202 Accepted` with an `Operation-Location` header. Poll this URL until `status == 'succeeded'`. Do not poll more frequently than every 2 seconds.

2. **Confidence threshold** — Fields with confidence below 0.7 should be flagged for manual review in production workflows. For financial data (invoices, receipts), consider a minimum confidence of 0.85 before auto-posting.

3. **Template vs neural model** — Template models require consistent document layouts and work with fewer samples. Neural models handle layout variability better but require at least 15-20 labeled samples for good accuracy. Use neural for documents with varying formats (e.g., invoices from many different vendors).

4. **SAS URL expiration** — Training data containers require SAS URLs that remain valid for the entire training duration (which can take 30+ minutes for large datasets). Use a minimum 4-hour SAS expiry for training operations.

5. **PDF vs image quality** — Scanned PDFs with poor image quality (below 300 DPI) significantly reduce extraction accuracy. For best results, request native digital PDFs or scan at 300+ DPI.

6. **Multi-page document tables** — Tables spanning multiple pages are tracked via `rowSpans` and split correctly. However, if table formatting is inconsistent across pages, results may be incomplete.

7. **Prebuilt model versioning** — Prebuilt models are updated periodically. Pin to a specific model version in production (`modelId=prebuilt-invoice:2023-07-31`) to prevent breaking changes from model updates.

8. **Key-value pairs vs field extraction** — The `prebuilt-document` model extracts generic key-value pairs but does not understand domain semantics. Use `prebuilt-invoice` for invoices rather than `prebuilt-document` — domain models provide much higher accuracy.

9. **Bounding polygon coordinate system** — Polygon coordinates are in inches from the top-left corner of the page, at 72 DPI resolution. Multiply by the actual image DPI to get pixel coordinates for overlay rendering.

10. **Composed model routing** — Composed models select the component with the highest document match confidence. If two components have similar scores, results may be unpredictable. Review `docType` and `docTypeConfidence` in the result to understand which component was used.
