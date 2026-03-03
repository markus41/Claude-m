# Cognitive Services (Language, Translator, Health) — Azure AI Reference

Azure AI Language Service provides NLP capabilities: sentiment analysis, NER, key phrase extraction, language detection, text summarization, PII detection, and Conversational Language Understanding (CLU). Azure Translator provides text and document translation.

---

## REST API Endpoints

### Language Service

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `https://{endpoint}/language/:analyze-text?api-version=2023-04-01` | API key or `Cognitive Services User` managed identity | Body: analysis task | Synchronous — small batches |
| POST | `https://{endpoint}/language/analyze-text/jobs?api-version=2023-04-01` | API key or managed identity | Body: job config | Async — large batches |
| GET | `https://{endpoint}/language/analyze-text/jobs/{jobId}?api-version=2023-04-01` | Same | `showStats=true` | Poll async job status |
| POST | `https://{endpoint}/language/analyze-conversations?api-version=2023-04-01` | API key or managed identity | Body: CLU request | Conversational Language Understanding |
| POST | `https://{endpoint}/language/query-knowledgebases?api-version=2021-10-01` | API key or managed identity | Body: question + project | Custom Question Answering |
| GET | `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{name}?api-version=2023-05-01` | `Cognitive Services Contributor` | — | Get resource details |
| PUT | `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{name}?api-version=2023-05-01` | `Cognitive Services Contributor` | Body: resource | Create Language resource |

---

## Language Service — Analysis Tasks

### Sentiment Analysis

```typescript
const response = await fetch(
  `https://${endpoint}/language/:analyze-text?api-version=2023-04-01`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      kind: 'SentimentAnalysis',
      parameters: {
        modelVersion: 'latest',
        opinionMining: true  // Enable aspect-based sentiment
      },
      analysisInput: {
        documents: [
          { id: '1', language: 'en', text: 'The service was excellent but the wait time was too long.' },
          { id: '2', language: 'en', text: 'Delivery was fast and the product is great value.' }
        ]
      }
    })
  }
);

const data = await response.json();
// data.results.documents[0].sentiment = 'mixed'
// data.results.documents[0].confidenceScores = { positive: 0.6, neutral: 0.1, negative: 0.3 }
// data.results.documents[0].sentences[0].targets[0] = { text: 'service', sentiment: 'positive' }
```

### Named Entity Recognition (NER)

```typescript
const nerResponse = await fetch(
  `https://${endpoint}/language/:analyze-text?api-version=2023-04-01`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      kind: 'EntityRecognition',
      parameters: { modelVersion: 'latest' },
      analysisInput: {
        documents: [
          { id: '1', language: 'en', text: 'Microsoft was founded by Bill Gates in Redmond, Washington on April 4, 1975.' }
        ]
      }
    })
  }
);
// Returns entities: { text: "Microsoft", category: "Organization", confidenceScore: 0.99 }
// Categories: Person, Organization, Location, DateTime, Quantity, URL, Email, Phone, Address, ProductCode
```

### PII Redaction

```typescript
const piiResponse = await fetch(
  `https://${endpoint}/language/:analyze-text?api-version=2023-04-01`,
  {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'PiiEntityRecognition',
      parameters: {
        modelVersion: 'latest',
        redactionCharacter: '*',  // Character to replace PII with
        piiCategories: ['Email', 'PhoneNumber', 'SSN', 'CreditCardNumber']
      },
      analysisInput: {
        documents: [
          { id: '1', language: 'en', text: 'Call John at 555-867-5309 or email john@company.com' }
        ]
      }
    })
  }
);
// data.results.documents[0].redactedText = "Call John at ************ or email *****************"
```

### Extractive Summarization

```typescript
// Async API required for summarization
const jobResponse = await fetch(
  `https://${endpoint}/language/analyze-text/jobs?api-version=2023-04-01`,
  {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: 'summarize-support-tickets',
      analysisInput: {
        documents: [
          { id: '1', language: 'en', text: longSupportTicketText }
        ]
      },
      tasks: [
        {
          kind: 'ExtractiveSummarization',
          taskName: 'Summarize',
          parameters: {
            modelVersion: 'latest',
            sentenceCount: 3,
            sortBy: 'Rank'
          }
        },
        {
          kind: 'AbstractiveSummarization',
          taskName: 'Abstract',
          parameters: {
            modelVersion: 'latest',
            summaryLength: 'short'
          }
        }
      ]
    })
  }
);

const jobId = jobResponse.headers.get('operation-location')?.split('/').pop();
```

---

## Key Phrase Extraction and Language Detection

```typescript
// Combined multi-task analysis in one request
const combinedResponse = await fetch(
  `https://${endpoint}/language/:analyze-text?api-version=2023-04-01`,
  {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'KeyPhraseExtraction',
      parameters: { modelVersion: 'latest' },
      analysisInput: {
        documents: [
          { id: '1', language: 'en', text: 'Azure AI Services provide powerful NLP capabilities for enterprise applications.' }
        ]
      }
    })
  }
);
// Returns: ['Azure AI Services', 'powerful NLP capabilities', 'enterprise applications']
```

---

## Text Analytics for Health

```typescript
// Detect medical entities in clinical text
const healthResponse = await fetch(
  `https://${endpoint}/language/analyze-text/jobs?api-version=2023-04-01`,
  {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: 'health-text-analysis',
      analysisInput: {
        documents: [
          { id: '1', language: 'en', text: 'Patient was prescribed 200mg ibuprofen twice daily for lower back pain.' }
        ]
      },
      tasks: [
        {
          kind: 'Healthcare',
          taskName: 'HealthcareTask',
          parameters: {
            modelVersion: 'latest',
            fhirVersion: '4.0.1'  // Optional: return FHIR R4 output
          }
        }
      ]
    })
  }
);
// Returns entities: MedicationName(ibuprofen), Dosage(200mg), Frequency(twice daily), BodyStructure(lower back)
```

### Health Entity Categories

| Category | Examples |
|----------|---------|
| `MedicationName` | ibuprofen, metformin, aspirin |
| `Dosage` | 200mg, 10ml, twice daily |
| `MedicationRoute` | oral, IV, topical |
| `Symptom` | fever, chest pain, shortness of breath |
| `Diagnosis` | pneumonia, diabetes type 2 |
| `BodyStructure` | left ventricle, lumbar spine |
| `TreatmentName` | chemotherapy, physical therapy |
| `ExaminationName` | CBC, MRI, chest X-ray |
| `Time` | 3 days ago, yesterday morning |

---

## Azure Translator

```typescript
// Translate text (supports 100+ languages)
const translationResponse = await fetch(
  'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=es&to=fr',
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': translatorKey,
      'Ocp-Apim-Subscription-Region': 'eastus',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      { text: 'Hello, how are you today?' },
      { text: 'The weather is beautiful.' }
    ])
  }
);

// Detect language
const detectResponse = await fetch(
  'https://api.cognitive.microsofttranslator.com/detect?api-version=3.0',
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': translatorKey,
      'Ocp-Apim-Subscription-Region': 'eastus',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ text: 'Bonjour le monde' }])
  }
);
// Returns: { language: 'fr', score: 1.0, isTranslationSupported: true }

// Document translation (async — translate entire documents)
const docTranslationResponse = await fetch(
  `https://${endpoint}/translator/document/batches?api-version=2024-05-01`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': translatorKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: [
        {
          source: {
            sourceUrl: 'https://mystorageaccount.blob.core.windows.net/input/document.docx',
            storageType: 'File',
            language: 'en'
          },
          targets: [
            {
              targetUrl: 'https://mystorageaccount.blob.core.windows.net/output/document-es.docx',
              language: 'es'
            }
          ]
        }
      ]
    })
  }
);
```

---

## Custom Question Answering (QnA Maker Successor)

```typescript
// Query a custom knowledge base
const qnaResponse = await fetch(
  `https://${endpoint}/language/:query-knowledgebases?projectName=${projectName}&api-version=2021-10-01&deploymentName=production`,
  {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: 'How do I reset my password?',
      top: 3,
      confidenceScoreThreshold: 0.5,
      answerSpanRequest: { enable: true },
      filters: {
        metadataFilter: {
          logicalOperation: 'AND',
          metadata: [{ key: 'category', value: 'IT Support' }]
        }
      }
    })
  }
);
// Returns answers with confidence scores; highest confidence answer first
```

---

## QnA Maker → Custom Question Answering Migration

| Feature | QnA Maker (Legacy) | Custom Question Answering |
|---------|--------------------|--------------------------|
| Endpoint | `api.qnamaker.ai` | Language Service endpoint |
| Runtime key | Separate runtime subscription key | Language Service API key |
| Pricing | Separate tier | Included in Language Service |
| Models | Rule-based retrieval | Neural retrieval (better accuracy) |
| Precise answering | No | Yes (answer span extraction) |
| Custom synonyms | No | Yes |
| End-of-support | Retired October 2025 | Current platform |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidDocument` | Document text is empty or too long | Check text length (max 125,000 characters per document) |
| 400 `UnsupportedLanguage` | Language code not supported | Check language support matrix; some tasks are English-only |
| 401 `Unauthorized` | Invalid API key | Verify `Ocp-Apim-Subscription-Key` header value |
| 403 `QuotaExceeded` | Monthly transaction quota exceeded | Upgrade pricing tier or request quota increase |
| 404 `ProjectNotFound` | CLU/QnA project not found | Verify project name and deployment name |
| 429 `TooManyRequests` | Rate limit exceeded | Implement retry with `Retry-After` header; use batching |
| 503 `ServiceUnavailable` | Transient failure | Retry with exponential backoff |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Documents per synchronous request | 25 | Use async API for batches |
| Characters per document | 125,000 | Across all tasks |
| Documents per async job | 1,000 | — |
| Concurrent async jobs | 10 | Per resource |
| QnA knowledge base answers | Top 10 | Per query |
| Translator characters per request | 50,000 | Per translation call |
| Document translation file size | 40 MB | Per document |
| Languages supported (Translator) | 100+ | Check regional availability |
| Regional availability | Variable by feature | Health/CLU: limited regions |

---

## Common Patterns and Gotchas

1. **Batch via async API** — Synchronous Language API handles up to 25 documents per call. For large batches (hundreds or thousands of documents), always use the async job API to avoid 429 throttling.

2. **Language detection before analysis** — If input language is unknown, run language detection first. Sending French text to an English-only model returns degraded results without error.

3. **QnA Maker migration deadline** — QnA Maker was retired in October 2025. All knowledge bases must be migrated to Custom Question Answering (Language Service). Use the migration portal at language.azure.com.

4. **Text Analytics for Health is HIPAA-eligible** — The Health endpoint processes clinical text. Ensure the Language Service resource is deployed in a HIPAA-eligible region and that BAA (Business Associate Agreement) is in place before processing real patient data.

5. **Opinion mining** — Aspect-based sentiment (opinion mining) provides granular feedback analysis. Enable `opinionMining: true` to get target-opinion pairs (e.g., "battery life → positive"). Standard sentiment analysis returns only document-level and sentence-level sentiment.

6. **Document translation SAS URLs** — Document translation requires Azure Blob Storage SAS URLs with specific permissions: read + write on target container, read on source blob. Ensure SAS expiry is long enough to cover the translation job.

7. **CLU vs LUIS** — Conversational Language Understanding (CLU) is the successor to LUIS (retired October 2025). CLU supports multi-intent classification and entity extraction with improved accuracy. Do not create new LUIS apps.

8. **Regional endpoint for Translator** — Translator API uses the global endpoint `api.cognitive.microsofttranslator.com`. For data residency compliance, use the regional endpoint: `{region}.api.cognitive.microsofttranslator.com` (e.g., `eastus.api.cognitive.microsofttranslator.com`).

9. **Key vs managed identity authentication** — API keys are easier to set up but have no audit trail per identity. Use managed identity (`Authorization: Bearer {token}` with scope `https://cognitiveservices.azure.com/.default`) for production workloads.

10. **Responsible AI content** — PII detection is designed to protect privacy, not to de-identify data for HIPAA compliance. For healthcare data de-identification, use the dedicated Azure Health Data Services De-Identification Service.
