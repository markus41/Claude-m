---
name: pa-ai-builder
description: Design and integrate an AI Builder model into a Power Automate flow — model selection, training guidance, flow integration patterns, confidence thresholds, and human review routing.
argument-hint: "<use-case> [--model-type <document|prediction|classification|sentiment|ocr>] [--source <sharepoint|email|dataverse>] [--output <dataverse|teams|email>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# AI Builder Integration

## Purpose
Design an end-to-end AI Builder solution: select the right model type, plan training data,
build the Power Automate integration flow, handle confidence thresholds, and route low-confidence
extractions to human review.

## Required Inputs
- Business use case (e.g., "extract invoice fields", "classify support tickets", "predict churn")
- Document/data source (SharePoint, email attachments, Dataverse, external API)
- Output destination (Dataverse table, Teams notification, email, SharePoint list)
- Confidence threshold for auto-processing vs human review (default: 0.80)
- Volume estimate (documents/day or predictions/day)

## Steps

### 1. Select AI Builder Model Type
Map use case to model type using `references/ai-builder.md` model types table:
- **Documents with structured fields** (invoices, receipts, forms) → Document processing
- **Unstructured text routing** (ticket classification, email categorization) → Category classification
- **Risk/outcome prediction from Dataverse data** → Prediction
- **OCR of handwritten or printed text** → Text recognition
- **Object detection in images** → Object detection
- **Sentiment from customer feedback** → Sentiment analysis
- **Existing Microsoft formats** (invoice, receipt, ID) → Prebuilt models

### 2. Estimate AI Builder Credit Consumption
Calculate monthly credits:
- Document processing: 1 credit/page × pages/month
- Prediction: 1 credit/1,000 rows × predictions/month
- Report total and compare to included credits (500/user/month on Premium)
- If over: recommend purchasing add-on credits or batching requests

### 3. Training Data Assessment
For custom models:
- Minimum: 5 sample documents per layout variant
- Recommended: 50+ documents per layout for production
- Identify field variability (required: invoice number, date, total; optional: line items)
- Flag low-quality training data issues: scanned PDFs, rotated images, mixed layouts

### 4. Design Integration Flow
Build complete flow skeleton:
```
Trigger: [source-specific trigger]
Action 1: Get document/data from source
Action 2: AI Builder — process/predict/classify
Action 3: Condition — confidence >= threshold?
  Yes → Auto-process: create Dataverse record / send notification
  No  → Human review: create Teams approval card with extracted values
Action 4: Update source record with processing status
Action 5 (error scope): Log failure, notify operations team
```

### 5. Low-Confidence Review Pattern
For each extracted field below threshold:
- Highlight field in Teams adaptive card with confidence score shown
- Allow reviewer to accept, correct, or reject each field
- Record human corrections as training feedback for model improvement
- Set SLA: human review should complete within 24 hours

### 6. Output
Deliver:
- Model type selection with justification
- Training data requirements (count, format, variation guidance)
- Credit consumption estimate (monthly)
- Complete flow architecture with trigger, AI Builder action, confidence routing
- Teams adaptive card JSON for human review (if applicable)
- Dataverse schema for storing extracted/predicted values
- Error handling and logging pattern

## Quality Checks
- Confidence threshold defined (never process all outputs blindly)
- Credit consumption within licensed allocation
- Human review SLA defined for low-confidence cases
- Error scope wrapping the entire flow
- Solution-aware design (connection references, environment variables)
