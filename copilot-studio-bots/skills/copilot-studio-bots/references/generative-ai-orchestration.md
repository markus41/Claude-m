# Generative AI Orchestration Reference

## Overview

Copilot Studio's Generative AI orchestration mode uses Azure OpenAI to power responses from configured knowledge sources. Instead of matching user input to predefined topics, the AI dynamically generates answers grounded in the indexed content. This reference covers generative AI orchestration mode, knowledge sources (SharePoint, websites, Dataverse, files), AI Builder integration, GPT-powered responses, custom instructions (system messages), safety settings, citation handling, and knowledge freshness.

---

## Generative AI Orchestration Mode

### Classic Mode vs Generative AI Mode

| Mode | Topic Matching | Knowledge Sources | Response Generation |
|---|---|---|---|
| Classic | NLU matches trigger phrases | Not used by default | Predefined message nodes |
| Generative Answers (Hybrid) | NLU + AI fallback | Configured sources used for unmatched queries | AI generates for unmatched; classic handles matched |
| Generative AI Orchestration | AI selects actions and knowledge | All configured sources | Fully AI-driven; topics become tools |

**Recommendation**: For most deployments, use **Hybrid mode** — define structured topics for critical, high-confidence flows (password reset, ticket submission) and use Generative Answers for long-tail FAQ questions.

---

## Generative Answers Node

The `GenerativeAnswers` node calls the Copilot Studio AI service to generate a response from configured knowledge sources.

```yaml
- kind: GenerativeAnswers
  id: genAiAnswerNode
  variable: Topic.AIResponse

  systemMessage: >
    You are the Contoso IT Helpdesk assistant.
    Answer questions about:
    - Password resets and account issues
    - VPN setup and remote access
    - Software installation requests
    - Hardware requests

    Rules:
    - Only answer questions using the provided knowledge sources
    - Do not make up information not in the sources
    - If you cannot find an answer, say: "I don't have that information in my knowledge base.
      Let me connect you with an agent who can help."
    - Keep responses concise (3-5 sentences maximum)
    - Use bullet points for multi-step instructions

  knowledgeSources:
    - kind: SharePointSource
      siteUrl: "https://contoso.sharepoint.com/sites/ITKnowledgeBase"

    - kind: WebsiteSource
      urls:
        - "https://support.contoso.com/faq"
        - "https://support.contoso.com/how-to"

    - kind: DocumentSource
      documentIds:
        - "doc-id-vpn-setup-guide"
        - "doc-id-software-catalog"

  contentModeration:
    enabled: true
    blockHarmfulContent: true
    blockGroundednessViolations: true

  citations:
    enabled: true
    showSources: true

  fallback:
    kind: RedirectToTopic
    topicName: Escalate
```

### Output Variable

`Topic.AIResponse` contains the generated text response. Render it in a subsequent `SendMessage` node or check for blank before fallback.

```yaml
- kind: ConditionGroup
  conditions:
    - condition: "!IsNullOrEmpty(Topic.AIResponse)"
      actions:
        - kind: SendMessage
          message: "=Topic.AIResponse"
        - kind: EndConversation
          survey: true
  elseActions:
    - kind: RedirectToTopic
      topicName: Escalate
```

---

## Knowledge Sources

### SharePoint Sites

SharePoint is the primary knowledge source for internal bots. Copilot Studio crawls and indexes pages, documents (PDF, Word, PowerPoint), and list data.

```yaml
knowledgeSources:
  - kind: SharePointSource
    siteUrl: "https://contoso.sharepoint.com/sites/ITKnowledgeBase"
    # Optionally scope to a specific library:
    # siteUrl: "https://contoso.sharepoint.com/sites/ITKnowledgeBase/Shared Documents"
```

**Indexing behavior**:
- Crawls all accessible pages and documents within the site.
- Respects SharePoint permissions — the bot's service principal must have at least Read access to the site.
- Re-index cycle: approximately 24 hours for content changes to be reflected.

**Supported file types**: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), plain text, HTML pages.

### Website URLs

For public-facing knowledge bases, product documentation sites, or support portals.

```yaml
knowledgeSources:
  - kind: WebsiteSource
    urls:
      - "https://support.contoso.com"
      - "https://docs.contoso.com/help"
    maxDepth: 2     # How many link levels to crawl (1-3)
```

**Crawling notes**:
- Copilot Studio crawls the root URL and follows internal links up to `maxDepth` levels.
- Only publicly accessible pages are crawled — no authentication.
- Pages with `noindex` robots meta tag are excluded.
- Sitemap.xml is honored if present.
- Refresh frequency: configurable (weekly by default).

### Dataverse Tables

Use Dataverse as a dynamic knowledge source for structured records (employee directory, product catalog, FAQ records).

```yaml
knowledgeSources:
  - kind: DataverseSource
    entityLogicalName: "cr_kbarticle"
    columns:
      - "cr_title"
      - "cr_content"
      - "cr_category"
      - "cr_tags"
    filterExpression: "cr_ispublished eq true and statecode eq 0"
```

**Refresh**: Dataverse sources are queried in near-real-time — changes are reflected immediately (within minutes of publication).

### Uploaded Documents

Upload files directly to Copilot Studio for indexing. Best for static documentation like policies, manuals, or process guides.

```yaml
knowledgeSources:
  - kind: DocumentSource
    documentIds:
      - "doc-guid-1"
      - "doc-guid-2"
```

Supported formats: PDF, Word, PowerPoint, Excel, TXT (max 512 MB per document).

---

## Custom Instructions (System Message)

The system message constrains what the AI will and will not discuss. Write it carefully — it is the primary safety and scope control.

### System Message Structure

```
You are {bot name/persona} for {organization}.

Your role:
- {Primary purpose in 1-2 sentences}

You can help with:
- {Topic area 1}
- {Topic area 2}
- {Topic area 3}

Rules:
- Only answer questions using information from the provided knowledge sources
- Do not provide advice on {out-of-scope areas}
- Do not answer questions about competitors
- Keep responses under {X} sentences
- Always recommend contacting support for {sensitive operations}

When you cannot answer:
Say exactly: "{standard cannot-answer phrase}"
Do not apologize excessively or provide workarounds.
```

### Example System Messages

**IT Helpdesk:**
```
You are the Contoso IT Helpdesk assistant. Help employees with technology support questions.

You can help with:
- Password resets and account lockouts (guide users to the self-service portal)
- VPN connection issues
- Software installation from the approved catalog
- Hardware requests and procurement

Rules:
- Never provide actual credentials or direct access to systems
- For security incidents (suspected phishing, malware), always escalate immediately
- Only recommend approved software from the IT catalog
- Do not provide help with personal devices

If you cannot find an answer, say: "I don't have that in my knowledge base. Let me connect you with an IT agent."
```

**HR FAQ:**
```
You are the Contoso HR information assistant. Provide general HR policy information.

You can help with:
- Leave and time-off policies
- Benefits enrollment information
- Expense reimbursement procedures
- General onboarding information

Rules:
- Do not provide specific advice on individual employment situations
- For performance management, disciplinary, or termination questions: always direct to HR Business Partner
- Never share other employees' personal information
- Policies may vary by region — note this when relevant

If you cannot answer, say: "For specific HR guidance, please contact your HR Business Partner."
```

---

## Safety Settings

### Content Moderation

```yaml
contentModeration:
  enabled: true

  # Block harmful, offensive, or violent content
  blockHarmfulContent: true

  # Block responses not grounded in the knowledge sources
  # (prevents AI hallucination / making up information)
  blockGroundednessViolations: true

  # Block personally identifiable information (PII) in responses
  blockPIIInResponses: false   # Set true for regulated industries
```

### Groundedness Filtering

Groundedness filtering ensures AI responses are grounded in the configured knowledge sources rather than the model's general training knowledge. When enabled:
- If the AI cannot find supporting content in the knowledge sources, it returns no answer (triggers the fallback).
- The AI cannot "hallucinate" facts that aren't in the indexed content.
- Trade-off: reduces recall (some valid questions go unanswered) but improves precision.

**Recommendation**: Enable groundedness filtering in production. During development, disable it to explore what the AI knows and identify knowledge gaps.

### Sensitive Topics Blocking

Configure the Sensitive topics blade in Copilot Studio to block specific topic categories:

| Category | Examples |
|---|---|
| Financial advice | Investment recommendations, stock tips |
| Medical advice | Diagnoses, medication recommendations |
| Legal advice | Contract interpretation, legal rights |
| Harmful content | Violence, self-harm, dangerous activities |
| Political content | Election commentary, political opinions |
| Personal information | Social security numbers, bank accounts |

---

## Citation Handling

When citations are enabled, AI responses include references to the source documents.

### Citation Configuration

```yaml
citations:
  enabled: true
  showSources: true
  sourceFormat: "numbered"   # "numbered" or "footnote"
  maxSources: 3              # Maximum citations per response
```

### Rendered Citation Format

With citations enabled, the AI response includes inline references:

```
To reset your VPN password, follow these steps [1]:
1. Go to the IT Self-Service Portal at it.contoso.com
2. Click "Reset VPN Password"
3. Verify your identity with MFA

For setup instructions, see the VPN Setup Guide [2].

Sources:
[1] IT Knowledge Base – VPN Password Reset
[2] VPN Setup Guide v3.2 (uploaded document)
```

### Citation Appearance in Teams

In Teams, citations render as clickable links to the source documents (if the user has access via SharePoint permissions). In Web Chat and Direct Line, citations render as plain text or hyperlinks depending on the channel's Markdown support.

---

## AI Builder Integration

AI Builder models can be called within Copilot Studio topics to add classification, entity extraction, or document processing capabilities.

### Call AI Builder Model via Action Node

```yaml
- kind: InvokeAction
  id: classifyIssue
  actionName: AIBuilderCategorize
  # Uses Power Automate flow that calls AI Builder text classification model
  inputs:
    issueText: =Topic.UserIssueDescription
  outputs:
    category: Topic.IssueCategoryAI
    confidence: Topic.CategoryConfidence

- kind: ConditionGroup
  conditions:
    - condition: "Topic.CategoryConfidence > 0.85"
      actions:
        - kind: SetVariable
          variable: Topic.AutoCategory
          value: =Topic.IssueCategoryAI
    - condition: "Topic.CategoryConfidence <= 0.85"
      actions:
        - kind: AskQuestion
          prompt: "Which category best describes your issue? (IT / HR / Facilities)"
          entity: DepartmentEntity
          output:
            binding: Topic.AutoCategory
```

---

## Knowledge Freshness

### Freshness Configuration

| Source Type | Default Refresh | Configurable? | Notes |
|---|---|---|---|
| SharePoint | 24 hours | Yes | Manual refresh available |
| Website | 7 days | Yes | Sitemap.xml accelerates discovery |
| Dataverse | ~15 minutes | No | Near-real-time |
| Uploaded documents | On upload | N/A — static | Re-upload to refresh |

### Force Re-Index

```powershell
# No direct PAC CLI command for re-indexing
# Re-index via Copilot Studio portal:
# Knowledge → Select source → Refresh / Re-index

# Alternatively, via Dataverse (when source is stored as botcomponent)
PATCH /api/data/v9.2/botcomponents(<knowledge-source-id>)
{
  "statecode": 0,  # Deactivate
}
PATCH /api/data/v9.2/botcomponents(<knowledge-source-id>)
{
  "statecode": 1,  # Reactivate — triggers re-index
}
```

### Knowledge Quality Best Practices

| Guideline | Rationale |
|---|---|
| Structure documents with clear headings | AI uses document structure to identify answer boundaries |
| Keep document sections focused (1-2 topics per section) | Reduces chance of AI mixing unrelated content |
| Remove outdated content promptly | Stale content generates outdated answers |
| Use plain language, avoid jargon | AI paraphrases more accurately from clear source text |
| Provide direct, action-oriented answers in source docs | AI answers match source quality |
| Keep individual document size under 10 MB | Large documents take longer to index |

---

## Error Codes and Conditions

| Condition | Meaning | Remediation |
|---|---|---|
| AI response always triggers fallback | Knowledge sources not indexed; groundedness too strict | Verify indexing completed; check source permissions; temporarily disable groundedness |
| AI answers with outdated information | Knowledge source not refreshed after content update | Force re-index; check last-indexed timestamp |
| Bot ignores system message constraints | System message too vague or contradictory | Be specific; test with adversarial prompts; use examples |
| Citations not appearing | `citations.enabled = false`; channel does not support Markdown | Enable citations; check channel capabilities |
| SharePoint source not accessible | Bot's service principal lacks Read permission | Grant the Copilot Studio app registration Read access to the SharePoint site |
| Generative answers slow (>5s) | Large knowledge base; complex query | Narrow knowledge source scope; reduce source document count |
| AI discusses out-of-scope topics | System message too permissive; sensitive topic settings not configured | Strengthen system message constraints; enable sensitive topic blocks |
| Dataverse source returns empty results | Filter expression too restrictive; entity permissions missing | Review filter expression; verify Copilot Studio has access to the Dataverse table |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Knowledge sources per bot | 5 (Public Preview) | May increase post-GA |
| SharePoint sites per knowledge source | 1 | Add multiple sources for multiple sites |
| Website URLs per source | 5 | Each URL is crawled independently |
| Uploaded documents per bot | 100 | Combined size limit applies |
| Uploaded document size per file | 512 MB | Smaller files index faster |
| SharePoint content indexed | Up to 1 million pages | Performance varies with content volume |
| Dataverse rows indexed | Up to 100,000 per source | Use filter expression to scope |
| System message length | 4,000 characters | Keep concise and focused |
| Generative answer response length | ~800 tokens | ~600 words maximum |
| Re-index frequency | Manual or scheduled | 1 manual refresh per minute per source |
