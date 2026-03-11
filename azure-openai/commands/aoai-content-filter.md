---
name: aoai-content-filter
description: "Create and manage Azure OpenAI content filter policies and custom blocklists"
argument-hint: "[--create-policy <name>] [--list-policies] [--create-blocklist <name>] [--add-term <term>] [--assign <deployment>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Manage Azure OpenAI Content Filters

Create, update, and assign content filter policies and blocklists to Azure OpenAI deployments.

## Instructions

### 1. Validate Inputs

- `--create-policy` — Create a new content filter policy with a given name.
- `--list-policies` — List all content filter policies on the resource.
- `--create-blocklist` — Create a custom blocklist.
- `--add-term` — Add a term or regex to an existing blocklist.
- `--assign` — Assign a policy to a deployment.

If no flag is specified, ask the user what they want to do.

### 2. Set Up Variables

```bash
RESOURCE_NAME="<resource-name>"
RG="<resource-group>"
SUB_ID="$(az account show --query id -o tsv)"
API_VERSION="2024-06-01-preview"
BASE_ARM="https://management.azure.com/subscriptions/${SUB_ID}/resourceGroups/${RG}/providers/Microsoft.CognitiveServices/accounts/${RESOURCE_NAME}"
TOKEN="$(az account get-access-token --query accessToken -o tsv)"
```

### 3. Create Content Filter Policy

Ask the user for their desired strictness level:
- **Strict** — Blocks Low severity and above (most restrictive)
- **Default** — Blocks Medium severity and above (Azure default)
- **Permissive** — Blocks High severity only (requires justification)

```bash
curl -X PUT "${BASE_ARM}/raiPolicies/<policy-name>?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "basePolicyName": "Microsoft.DefaultV2",
      "mode": "Blocking",
      "contentFilters": [
        {"name": "hate", "blocking": true, "enabled": true, "allowedContentLevel": "<level>", "source": "Prompt"},
        {"name": "hate", "blocking": true, "enabled": true, "allowedContentLevel": "<level>", "source": "Completion"},
        {"name": "sexual", "blocking": true, "enabled": true, "allowedContentLevel": "<level>", "source": "Prompt"},
        {"name": "sexual", "blocking": true, "enabled": true, "allowedContentLevel": "<level>", "source": "Completion"},
        {"name": "violence", "blocking": true, "enabled": true, "allowedContentLevel": "<level>", "source": "Prompt"},
        {"name": "violence", "blocking": true, "enabled": true, "allowedContentLevel": "<level>", "source": "Completion"},
        {"name": "selfharm", "blocking": true, "enabled": true, "allowedContentLevel": "<level>", "source": "Prompt"},
        {"name": "selfharm", "blocking": true, "enabled": true, "allowedContentLevel": "<level>", "source": "Completion"},
        {"name": "jailbreak", "blocking": true, "enabled": true, "source": "Prompt"},
        {"name": "indirect_attack", "blocking": true, "enabled": true, "source": "Prompt"}
      ]
    }
  }'
```

### 4. List Policies

```bash
curl -X GET "${BASE_ARM}/raiPolicies?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5. Create and Populate Blocklist

```bash
# Create blocklist
curl -X PUT "${BASE_ARM}/raiBlocklists/<blocklist-name>?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"description": "<description>"}}'

# Add literal term
curl -X PUT "${BASE_ARM}/raiBlocklists/<blocklist-name>/raiBlocklistItems/<item-id>?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"pattern": "<term>", "isRegex": false}}'

# Add regex pattern
curl -X PUT "${BASE_ARM}/raiBlocklists/<blocklist-name>/raiBlocklistItems/<item-id>?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"pattern": "\\b(<term1>|<term2>)\\b", "isRegex": true}}'
```

### 6. Assign Policy to Deployment

Deploy or update a model with the content filter policy:

```bash
curl -X PUT "${BASE_ARM}/deployments/<deployment-name>?api-version=${API_VERSION}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": {"name": "Standard", "capacity": 30},
    "properties": {
      "model": {"name": "<model>", "version": "<version>", "format": "OpenAI"},
      "raiPolicyName": "<policy-name>"
    }
  }'
```

### 7. Display Summary

Show the user:
- Policy name and strictness settings
- Blocklists created and item count
- Deployments assigned to the policy
- How to test: send a request that should be filtered and verify the 400 response
