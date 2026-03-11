# Azure OpenAI — Content Filtering

## Overview

Azure OpenAI includes a built-in content filtering system that evaluates both input prompts and output completions in real-time. The system detects and optionally blocks content across four harm categories (hate, sexual, violence, self-harm) plus jailbreak attempts and indirect prompt injection. Custom content filter policies allow per-deployment configuration of severity thresholds, and custom blocklists enable blocking specific terms or patterns.

---

## REST API Endpoints (Content Filtering)

Base URL: `https://management.azure.com`
API Version: `2024-06-01-preview`

| Method | Endpoint | Description | Key Parameters |
|--------|----------|-------------|----------------|
| PUT | `.../{name}/raiPolicies/{policyName}` | Create or update a content filter policy | Body: policy definition |
| GET | `.../{name}/raiPolicies/{policyName}` | Get a content filter policy | — |
| GET | `.../{name}/raiPolicies` | List all content filter policies | — |
| DELETE | `.../{name}/raiPolicies/{policyName}` | Delete a content filter policy | — |
| PUT | `.../{name}/raiBlocklists/{blocklistName}` | Create or update a blocklist | Body: description |
| GET | `.../{name}/raiBlocklists` | List all blocklists | — |
| DELETE | `.../{name}/raiBlocklists/{blocklistName}` | Delete a blocklist | — |
| PUT | `.../{name}/raiBlocklists/{blocklist}/raiBlocklistItems/{itemName}` | Add blocklist item | Body: pattern, isRegex |
| GET | `.../{name}/raiBlocklists/{blocklist}/raiBlocklistItems` | List blocklist items | — |
| DELETE | `.../{name}/raiBlocklists/{blocklist}/raiBlocklistItems/{itemName}` | Delete blocklist item | — |

---

## Filter Categories

### Harm Categories

| Category | API Name | Description | Example Content |
|----------|----------|-------------|----------------|
| Hate & Fairness | `hate` | Discrimination, slurs, stereotyping | Racial slurs, gender discrimination |
| Sexual | `sexual` | Explicit sexual content | Adult content, sexual solicitation |
| Violence | `violence` | Threats, graphic violence, weapons | Physical harm instructions, gore |
| Self-harm | `selfharm` | Self-injury, suicide | Methods, encouragement, glorification |

### Additional Filters

| Filter | API Name | Direction | Description |
|--------|----------|-----------|-------------|
| Jailbreak detection | `jailbreak` | Prompt only | Detects attempts to bypass system instructions |
| Indirect prompt injection | `indirect_attack` | Prompt only | Detects injected instructions in grounding data |
| Protected material (text) | `protected_material_text` | Completion only | Detects verbatim copyrighted text |
| Protected material (code) | `protected_material_code` | Completion only | Detects verbatim licensed code |

---

## Severity Levels

Each harm category is scored on a 0-7 severity scale, grouped into four levels:

| Severity Level | Score Range | Description | Default Action |
|---------------|-------------|-------------|---------------|
| Safe | 0-1 | No harmful content | Allow |
| Low | 2-3 | Mildly problematic, contextual | Allow (configurable) |
| Medium | 4-5 | Moderately harmful | Block (default threshold) |
| High | 6-7 | Severely harmful, explicit | Block |

**`allowedContentLevel`** in policy configuration controls the threshold:
- `"Low"` — Only Safe content is allowed (strictest)
- `"Medium"` — Safe and Low content allowed (default)
- `"High"` — Safe, Low, and Medium content allowed (permissive)

---

## Default Content Filter Policy

The `Microsoft.DefaultV2` policy is automatically applied to all deployments unless overridden:

| Category | Prompt Threshold | Completion Threshold |
|----------|-----------------|---------------------|
| Hate | Medium | Medium |
| Sexual | Medium | Medium |
| Violence | Medium | Medium |
| Self-harm | Medium | Medium |
| Jailbreak | Enabled | N/A |
| Indirect attack | Disabled | N/A |

---

## Custom Content Filter Policies

### Create a Strict Policy

```bash
RESOURCE_NAME="my-openai-resource"
RG="rg-openai"
SUB_ID="$(az account show --query id -o tsv)"
API_VERSION="2024-06-01-preview"
BASE_ARM="https://management.azure.com/subscriptions/${SUB_ID}/resourceGroups/${RG}/providers/Microsoft.CognitiveServices/accounts/${RESOURCE_NAME}"
TOKEN="$(az account get-access-token --query accessToken -o tsv)"

# Strict policy — blocks Low and above for all categories
curl -X PUT "${BASE_ARM}/raiPolicies/strict-policy?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "basePolicyName": "Microsoft.DefaultV2",
      "mode": "Blocking",
      "contentFilters": [
        {"name": "hate", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Prompt"},
        {"name": "hate", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Completion"},
        {"name": "sexual", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Prompt"},
        {"name": "sexual", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Completion"},
        {"name": "violence", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Prompt"},
        {"name": "violence", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Completion"},
        {"name": "selfharm", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Prompt"},
        {"name": "selfharm", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Completion"},
        {"name": "jailbreak", "blocking": true, "enabled": true, "source": "Prompt"},
        {"name": "indirect_attack", "blocking": true, "enabled": true, "source": "Prompt"},
        {"name": "protected_material_text", "blocking": true, "enabled": true, "source": "Completion"},
        {"name": "protected_material_code", "blocking": false, "enabled": true, "source": "Completion"}
      ]
    }
  }'
```

### Create a Permissive Policy (for approved use cases)

```bash
# Permissive policy — allows up to Medium severity
curl -X PUT "${BASE_ARM}/raiPolicies/permissive-policy?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "basePolicyName": "Microsoft.DefaultV2",
      "mode": "Blocking",
      "contentFilters": [
        {"name": "hate", "blocking": true, "enabled": true, "allowedContentLevel": "High", "source": "Prompt"},
        {"name": "hate", "blocking": true, "enabled": true, "allowedContentLevel": "High", "source": "Completion"},
        {"name": "sexual", "blocking": true, "enabled": true, "allowedContentLevel": "High", "source": "Prompt"},
        {"name": "sexual", "blocking": true, "enabled": true, "allowedContentLevel": "High", "source": "Completion"},
        {"name": "violence", "blocking": true, "enabled": true, "allowedContentLevel": "High", "source": "Prompt"},
        {"name": "violence", "blocking": true, "enabled": true, "allowedContentLevel": "High", "source": "Completion"},
        {"name": "selfharm", "blocking": true, "enabled": true, "allowedContentLevel": "High", "source": "Prompt"},
        {"name": "selfharm", "blocking": true, "enabled": true, "allowedContentLevel": "High", "source": "Completion"},
        {"name": "jailbreak", "blocking": true, "enabled": true, "source": "Prompt"}
      ]
    }
  }'
```

### Annotation-Only Policy (logging without blocking)

```bash
# Annotation-only — logs severity but does not block
curl -X PUT "${BASE_ARM}/raiPolicies/annotation-only?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "basePolicyName": "Microsoft.DefaultV2",
      "mode": "Blocking",
      "contentFilters": [
        {"name": "hate", "blocking": false, "enabled": true, "allowedContentLevel": "High", "source": "Prompt"},
        {"name": "hate", "blocking": false, "enabled": true, "allowedContentLevel": "High", "source": "Completion"},
        {"name": "sexual", "blocking": false, "enabled": true, "allowedContentLevel": "High", "source": "Prompt"},
        {"name": "sexual", "blocking": false, "enabled": true, "allowedContentLevel": "High", "source": "Completion"},
        {"name": "violence", "blocking": false, "enabled": true, "allowedContentLevel": "High", "source": "Prompt"},
        {"name": "violence", "blocking": false, "enabled": true, "allowedContentLevel": "High", "source": "Completion"},
        {"name": "selfharm", "blocking": false, "enabled": true, "allowedContentLevel": "High", "source": "Prompt"},
        {"name": "selfharm", "blocking": false, "enabled": true, "allowedContentLevel": "High", "source": "Completion"}
      ]
    }
  }'
```

### Manage Policies

```bash
# List all policies
curl -X GET "${BASE_ARM}/raiPolicies?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}"

# Get specific policy
curl -X GET "${BASE_ARM}/raiPolicies/strict-policy?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}"

# Delete a policy
curl -X DELETE "${BASE_ARM}/raiPolicies/strict-policy?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Assign Policy to Deployment

Policies are assigned during deployment creation or update via the `raiPolicyName` property:

```bash
# Deploy model with custom content filter policy
curl -X PUT "${BASE_ARM}/deployments/gpt4o-strict?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": {"name": "Standard", "capacity": 30},
    "properties": {
      "model": {
        "name": "gpt-4o",
        "version": "2024-08-06",
        "format": "OpenAI"
      },
      "raiPolicyName": "strict-policy"
    }
  }'
```

---

## Custom Blocklists

Blocklists complement content filters by blocking specific terms, brand names, competitor references, or any custom patterns.

### Create and Manage Blocklists

```bash
# Create a blocklist
curl -X PUT "${BASE_ARM}/raiBlocklists/competitor-terms?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "description": "Block competitor brand names and product references"
    }
  }'

# Add a literal term
curl -X PUT "${BASE_ARM}/raiBlocklists/competitor-terms/raiBlocklistItems/item1?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "pattern": "CompetitorBrand",
      "isRegex": false
    }
  }'

# Add a regex pattern (matches variations)
curl -X PUT "${BASE_ARM}/raiBlocklists/competitor-terms/raiBlocklistItems/item2?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "pattern": "\\b(competitor1|competitor2|competitor3)\\b",
      "isRegex": true
    }
  }'

# Add case-insensitive pattern
curl -X PUT "${BASE_ARM}/raiBlocklists/competitor-terms/raiBlocklistItems/item3?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "pattern": "(?i)restricted-term",
      "isRegex": true
    }
  }'

# List blocklist items
curl -X GET "${BASE_ARM}/raiBlocklists/competitor-terms/raiBlocklistItems?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}"

# Delete a blocklist item
curl -X DELETE "${BASE_ARM}/raiBlocklists/competitor-terms/raiBlocklistItems/item1?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}"

# Delete the entire blocklist
curl -X DELETE "${BASE_ARM}/raiBlocklists/competitor-terms?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Reference Blocklist in Content Filter Policy

Include blocklists in your content filter policy definition:

```json
{
  "properties": {
    "basePolicyName": "Microsoft.DefaultV2",
    "mode": "Blocking",
    "contentFilters": [
      // ... standard filters ...
    ],
    "customBlocklists": [
      {"blocklistName": "competitor-terms", "blocking": true, "source": "Prompt"},
      {"blocklistName": "competitor-terms", "blocking": true, "source": "Completion"},
      {"blocklistName": "profanity-list", "blocking": true, "source": "Prompt"},
      {"blocklistName": "profanity-list", "blocking": true, "source": "Completion"}
    ]
  }
}
```

---

## Content Filter Annotations (API Response)

### Successful Response (no filters triggered)

```json
{
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Here is the information..."},
    "finish_reason": "stop",
    "content_filter_results": {
      "hate": {"filtered": false, "severity": "safe"},
      "self_harm": {"filtered": false, "severity": "safe"},
      "sexual": {"filtered": false, "severity": "safe"},
      "violence": {"filtered": false, "severity": "safe"},
      "protected_material_text": {"filtered": false, "detected": false},
      "protected_material_code": {"filtered": false, "detected": false}
    }
  }],
  "prompt_filter_results": [{
    "prompt_index": 0,
    "content_filter_results": {
      "hate": {"filtered": false, "severity": "safe"},
      "self_harm": {"filtered": false, "severity": "safe"},
      "sexual": {"filtered": false, "severity": "safe"},
      "violence": {"filtered": false, "severity": "safe"},
      "jailbreak": {"filtered": false, "detected": false},
      "indirect_attack": {"filtered": false, "detected": false}
    }
  }]
}
```

### Blocked Response (filter triggered)

When a filter triggers, the API returns HTTP 400:

```json
{
  "error": {
    "code": "content_filter",
    "message": "The response was filtered due to the prompt triggering Azure OpenAI's content management policy.",
    "innererror": {
      "code": "ResponsibleAIPolicyViolation",
      "content_filter_result": {
        "hate": {"filtered": true, "severity": "medium"},
        "self_harm": {"filtered": false, "severity": "safe"},
        "sexual": {"filtered": false, "severity": "safe"},
        "violence": {"filtered": false, "severity": "safe"}
      }
    }
  }
}
```

### Blocklist Trigger Response

```json
{
  "error": {
    "code": "content_filter",
    "message": "The response was filtered due to the prompt triggering Azure OpenAI's content management policy.",
    "innererror": {
      "code": "ResponsibleAIPolicyViolation",
      "content_filter_result": {
        "custom_blocklists": [
          {"id": "competitor-terms", "filtered": true}
        ]
      }
    }
  }
}
```

---

## Application-Level Content Filter Handling

```python
import openai
import logging

logger = logging.getLogger(__name__)

def safe_completion(client, deployment, messages, fallback_message="I cannot assist with that request."):
    """Call Azure OpenAI with content filter handling."""
    try:
        response = client.chat.completions.create(
            model=deployment,
            messages=messages,
            max_tokens=1000
        )

        # Check completion-side annotations
        choice = response.choices[0]
        filters = choice.content_filter_results
        if filters:
            for category in ["hate", "sexual", "violence", "self_harm"]:
                result = getattr(filters, category, None)
                if result and result.severity != "safe":
                    logger.info(f"Content annotation: {category}={result.severity}")

        return choice.message.content

    except openai.BadRequestError as e:
        error_body = e.body if hasattr(e, 'body') else {}
        if "content_filter" in str(e):
            logger.warning(f"Content filter blocked request: {error_body}")
            return fallback_message
        raise
```

---

## Monitoring Content Filter Activity

### KQL Query for Filter Triggers

```kql
// Content filter triggers over time
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where resultSignature_d == 400
| where properties_s contains "content_filter"
| summarize FilterTriggers = count() by bin(TimeGenerated, 1h), Category = tostring(properties_s)
| render timechart

// Top blocked prompts by category
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where resultSignature_d == 400
| extend FilterCategory = extract("\"(hate|sexual|violence|self_harm)\":\\{\"filtered\":true", 1, properties_s)
| where isnotempty(FilterCategory)
| summarize Count = count() by FilterCategory
| order by Count desc
```

---

## Common Patterns and Gotchas

**1. Content filter adds latency**: Content filtering adds 10-50ms to each request. For latency-sensitive workloads, this is negligible, but measure in your specific scenario.

**2. Annotation-only mode still logs**: Even when `blocking: false`, content annotations are returned in the response. Use these for monitoring and analytics without blocking users.

**3. System messages are filtered too**: The content filter evaluates the entire messages array, including system messages. A system message containing example harmful content (for few-shot classification) may trigger filters.

**4. Streaming and content filters**: In streaming mode, content filter results appear in the first and last chunks. If the completion triggers a filter mid-stream, the stream ends with a `content_filter` finish reason.

**5. Blocklist regex limits**: Regex patterns in blocklists have a maximum length of 250 characters. For complex patterns, split into multiple blocklist items.

**6. Policy deletion requires no active assignments**: You cannot delete a content filter policy that is assigned to a deployment. Remove the assignment first by switching the deployment to a different policy.

**7. Jailbreak detection false positives**: The jailbreak filter may occasionally flag legitimate prompts that discuss AI safety or prompt engineering. Use annotation-only mode for such use cases, or adjust to a permissive policy.

**8. Custom blocklists are case-sensitive by default**: Literal (non-regex) blocklist items are case-sensitive. Use regex with `(?i)` flag for case-insensitive matching.
