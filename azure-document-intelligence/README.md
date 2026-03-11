# azure-document-intelligence

Azure AI Document Intelligence plugin for Claude Code. Covers OCR, prebuilt models (invoices, receipts, ID documents, tax forms), custom extraction and classification models, layout analysis, batch processing, and SDK/REST API integration patterns.

## What it covers

- **Prebuilt Models** — Invoice, Receipt, ID Document, W-2, 1099, Health Insurance Card, Business Card, Contract, Layout, Read (OCR), General Document
- **Custom Models** — Template and neural extraction models, composed models, Document Intelligence Studio labeling, model lifecycle management
- **Layout Analysis** — Document structure extraction (paragraphs, tables, figures, selection marks, barcodes), reading order, language detection
- **Document Classification** — Custom classifiers, split/classify workflows, multi-document classification, confidence thresholds
- **OCR & Read Model** — Text extraction, handwriting recognition, language support, style detection (handwritten vs printed)
- **Batch Processing** — Analyze batch operations, async polling, large-scale document processing pipelines
- **Integration Patterns** — Logic Apps, Power Automate, Azure Functions, Blob Storage event-driven processing, AI Search skillset integration

## Install

```bash
/plugin install azure-document-intelligence@claude-m-microsoft-marketplace
```

## Required permissions

| Workload | Role |
|---|---|
| Resource provisioning and management | `Cognitive Services Contributor` |
| Document analysis (data plane) | `Cognitive Services User` |
| Custom model training | `Cognitive Services Contributor` |
| Network and security configuration | `Contributor` on the resource |

## Setup

```
/docai-setup
```

Discovers or creates a Document Intelligence resource, validates RBAC, tests connectivity with a sample analysis, and configures environment variables.

## Commands

| Command | Description |
|---|---|
| `/docai-setup` | Create or discover Document Intelligence resource, validate auth, test connectivity |
| `/docai-analyze` | Analyze a document with a prebuilt or custom model |
| `/docai-custom-model` | Build a custom extraction model: prepare data, label, train, evaluate |
| `/docai-classify` | Build and use a document classifier for splitting and routing documents |
| `/docai-batch` | Batch analyze multiple documents, monitor jobs, retrieve results |

## Agent

| Agent | Description |
|---|---|
| `docai-reviewer` | Reviews Document Intelligence implementations for model selection, confidence handling, security, and cost optimization |

## Example prompts

- "Use `azure-document-intelligence` to extract data from an invoice PDF"
- "Analyze a batch of receipt images and extract totals and merchant names"
- "Build a custom model to extract fields from my company's purchase orders"
- "Create a document classifier to route invoices, receipts, and contracts"
- "Set up Document Intelligence with managed identity and private endpoints"
- "Extract table data and reading order from a multi-page PDF layout"

## Auth pattern

Uses the integration context contract (`docs/integration-context.md`). Required context:

```
tenantId + subscriptionId + DOCUMENT_INTELLIGENCE_ENDPOINT (or resource name)
```

Managed identity is preferred over API keys for production deployments.
