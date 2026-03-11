---
name: azure-search-index
description: Create or update an Azure AI Search index with vector fields, semantic configuration, and optional integrated vectorization — ready for hybrid RAG workloads
argument-hint: "<index-name> [--dimensions <1536|3072>] [--model <embedding-deployment>] [--semantic] [--with-skillset] [--dry-run]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Azure AI Search Index Management

Creates or updates an Azure AI Search index schema with full-text, vector, and semantic search capabilities. Optionally wires up integrated vectorization (calling Azure OpenAI during indexing) and a blob storage data source with an indexer.

## Arguments

- `<index-name>`: Name of the index to create or update
- `--dimensions <n>`: Embedding dimensions (default: `1536` for `text-embedding-3-small`; use `3072` for `text-embedding-3-large`)
- `--model <deployment>`: Azure OpenAI embedding deployment name (default: `text-embedding-3-small`)
- `--semantic`: Include semantic ranker configuration
- `--with-skillset`: Create an integrated vectorization skillset + indexer pointing at Azure Blob Storage
- `--dry-run`: Output schema JSON without executing

## Integration Context Check

Require:
- `AZURE_SEARCH_ENDPOINT` (e.g., `https://{serviceName}.search.windows.net`)
- `AZURE_SEARCH_ADMIN_KEY` or RBAC `Search Index Data Contributor` role
- If `--with-skillset`: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_ACCOUNT_NAME`

## Step 1: Check if Index Exists

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "${AZURE_SEARCH_ENDPOINT}/indexes/{indexName}?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}"
```

- `200`: Index exists — will update schema
- `404`: Index does not exist — will create

If updating an existing index, retrieve the current schema first:

```bash
curl -s "${AZURE_SEARCH_ENDPOINT}/indexes/{indexName}?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))"
```

**Immutable field properties:** `type`, `key`, `dimensions` — these cannot be changed on an existing index without deletion. Warn the user if a change to these is requested.

## Step 2: Build Index Schema

Compose the full index schema:

```json
{
  "name": "{indexName}",
  "fields": [
    {
      "name": "id",
      "type": "Edm.String",
      "key": true,
      "retrievable": true,
      "filterable": true,
      "searchable": false
    },
    {
      "name": "title",
      "type": "Edm.String",
      "searchable": true,
      "retrievable": true,
      "filterable": false,
      "sortable": false,
      "analyzer": "en.microsoft"
    },
    {
      "name": "content",
      "type": "Edm.String",
      "searchable": true,
      "retrievable": true,
      "filterable": false,
      "analyzer": "en.microsoft"
    },
    {
      "name": "category",
      "type": "Edm.String",
      "searchable": false,
      "retrievable": true,
      "filterable": true,
      "facetable": true
    },
    {
      "name": "sourceUrl",
      "type": "Edm.String",
      "searchable": false,
      "retrievable": true,
      "filterable": false
    },
    {
      "name": "lastModified",
      "type": "Edm.DateTimeOffset",
      "searchable": false,
      "retrievable": true,
      "filterable": true,
      "sortable": true
    },
    {
      "name": "contentVector",
      "type": "Collection(Edm.Single)",
      "searchable": true,
      "retrievable": false,
      "dimensions": {dimensions},
      "vectorSearchProfile": "hnsw-cosine"
    }
  ],
  "vectorSearch": {
    "profiles": [
      {
        "name": "hnsw-cosine",
        "algorithm": "hnsw-config",
        "vectorizer": "aoai-vectorizer"
      }
    ],
    "algorithms": [
      {
        "name": "hnsw-config",
        "kind": "hnsw",
        "hnswParameters": {
          "m": 4,
          "efConstruction": 400,
          "efSearch": 500,
          "metric": "cosine"
        }
      }
    ],
    "vectorizers": [
      {
        "name": "aoai-vectorizer",
        "kind": "azureOpenAI",
        "azureOpenAIParameters": {
          "resourceUri": "{AZURE_OPENAI_ENDPOINT}",
          "deploymentId": "{model}",
          "modelName": "{model}",
          "authIdentity": null
        }
      }
    ]
  },
  "semantic": {
    "configurations": [
      {
        "name": "semantic-config",
        "prioritizedFields": {
          "titleField": { "fieldName": "title" },
          "contentFields": [{ "fieldName": "content" }],
          "keywordsFields": [{ "fieldName": "category" }]
        }
      }
    ]
  },
  "suggesters": [
    {
      "name": "sg",
      "searchMode": "analyzingInfixMatching",
      "sourceFields": ["title"]
    }
  ],
  "scoringProfiles": [
    {
      "name": "recency-boost",
      "functions": [
        {
          "type": "freshness",
          "fieldName": "lastModified",
          "boost": 2,
          "freshness": { "boostingDuration": "P30D" }
        }
      ]
    }
  ]
}
```

If `--semantic` is not set, omit the `"semantic"` block.

## Step 3: Dry-Run Preview (if --dry-run)

Print the composed schema JSON and stop. Do not execute any API calls.

## Step 4: Create or Update Index

**Create:**
```bash
curl -s -X PUT \
  "${AZURE_SEARCH_ENDPOINT}/indexes/{indexName}?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d @index-schema.json
```

**Update (merge):**
```bash
curl -s -X PUT \
  "${AZURE_SEARCH_ENDPOINT}/indexes/{indexName}?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d @index-schema.json
```

## Step 5: Create Skillset + Indexer (if --with-skillset)

Prompt the user for:
1. Azure Blob Storage connection string
2. Container name

**Create data source:**
```bash
curl -s -X POST \
  "${AZURE_SEARCH_ENDPOINT}/datasources?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "{indexName}-datasource",
    "type": "azureblob",
    "credentials": { "connectionString": "{blobConnectionString}" },
    "container": { "name": "{containerName}" }
  }'
```

**Create skillset with embedding skill:**
```bash
curl -s -X PUT \
  "${AZURE_SEARCH_ENDPOINT}/skillsets/{indexName}-skillset?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "{indexName}-skillset",
    "skills": [
      {
        "@odata.type": "#Microsoft.Skills.Text.SplitSkill",
        "name": "split-skill",
        "textSplitMode": "pages",
        "maximumPageLength": 2000,
        "pageOverlapLength": 200,
        "context": "/document",
        "inputs": [{ "name": "text", "source": "/document/content" }],
        "outputs": [{ "name": "textItems", "targetName": "pages" }]
      },
      {
        "@odata.type": "#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill",
        "name": "embedding-skill",
        "resourceUri": "{AZURE_OPENAI_ENDPOINT}",
        "deploymentId": "{model}",
        "modelName": "{model}",
        "dimensions": {dimensions},
        "context": "/document/pages/*",
        "inputs": [{ "name": "text", "source": "/document/pages/*" }],
        "outputs": [{ "name": "embedding", "targetName": "contentVector" }]
      }
    ]
  }'
```

**Create indexer:**
```bash
curl -s -X PUT \
  "${AZURE_SEARCH_ENDPOINT}/indexers/{indexName}-indexer?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "{indexName}-indexer",
    "dataSourceName": "{indexName}-datasource",
    "targetIndexName": "{indexName}",
    "skillsetName": "{indexName}-skillset",
    "schedule": { "interval": "PT2H" },
    "parameters": {
      "configuration": {
        "dataToExtract": "contentAndMetadata",
        "parsingMode": "default"
      }
    },
    "fieldMappings": [
      { "sourceFieldName": "metadata_storage_path", "targetFieldName": "id", "mappingFunction": { "name": "base64Encode" } },
      { "sourceFieldName": "metadata_storage_name", "targetFieldName": "title" },
      { "sourceFieldName": "metadata_storage_last_modified", "targetFieldName": "lastModified" }
    ],
    "outputFieldMappings": [
      { "sourceFieldName": "/document/pages/*/contentVector", "targetFieldName": "contentVector" }
    ]
  }'
```

## Step 6: Run Initial Index Population (if --with-skillset)

```bash
curl -s -X POST \
  "${AZURE_SEARCH_ENDPOINT}/indexers/{indexName}-indexer/run?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}"
```

Poll status:
```bash
curl -s "${AZURE_SEARCH_ENDPOINT}/indexers/{indexName}-indexer/status?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}" \
  --query "lastResult.{Status: status, Items: itemCount, Failed: failedItemCount}"
```

## Search Service Lifecycle Management

### Delete Search Service

```bash
az search service delete --name {serviceName} --resource-group {rg} --yes
```

Deletes the search service and all its indexes, indexers, skillsets, and data sources. This is irreversible.

### Update Search Service (Scale)

Scale replicas and partitions to adjust query throughput and storage capacity:

```bash
az search service update --name {serviceName} --resource-group {rg} --replica-count 3 --partition-count 2
```

Replicas improve query throughput and availability (3 replicas = read HA SLA). Partitions increase storage capacity.

### Query Key Management

Query keys provide read-only access to index data (search queries only):

```bash
# Create a query key
az search query-key create --name "{keyName}" --resource-group {rg} --service-name {serviceName}

# List query keys
az search query-key list --resource-group {rg} --service-name {serviceName} --output table

# Delete a query key
az search query-key delete --key-value {key} --resource-group {rg} --service-name {serviceName}
```

### Admin Key Regeneration

Regenerate the primary or secondary admin key:

```bash
az search admin-key renew --key-kind primary --resource-group {rg} --service-name {serviceName}
```

Use `--key-kind secondary` to regenerate the secondary key. Rotate keys by regenerating the unused key first, updating applications, then regenerating the other.

## Output Format

```markdown
# Azure AI Search Index Report
**Index:** {indexName} | **Action:** {create/update} | **Timestamp:** {timestamp}

## Schema Summary
- **Fields:** {N} fields ({vectorFields} vector, {textFields} full-text, {filterFields} filterable)
- **Vector dimensions:** {dimensions}
- **Embedding model:** {model}
- **Semantic config:** {enabled/disabled}
- **HNSW parameters:** m={m}, efConstruction={ec}, efSearch={es}, metric=cosine

## Components Created
| Component | Name | Status |
|---|---|---|
| Index | {indexName} | Created |
| Vectorizer | aoai-vectorizer | Configured |
| Skillset | {indexName}-skillset | Created / Skipped |
| Data Source | {indexName}-datasource | Created / Skipped |
| Indexer | {indexName}-indexer | Created / Skipped |

## Indexer Status
{running/completed} — {N} documents indexed, {M} failed

## Sample Query
Test hybrid search:
```bash
curl -s -X POST "{AZURE_SEARCH_ENDPOINT}/indexes/{indexName}/docs/search?api-version=2024-05-01-preview" \
  -H "api-key: ${AZURE_SEARCH_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"search": "your query here", "vectorQueries": [{"kind": "text", "text": "your query here", "k": 5, "fields": "contentVector"}], "queryType": "semantic", "semanticConfiguration": "semantic-config", "top": 5}'
```
