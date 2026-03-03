# Azure AI Search Reference

## Service Management (ARM)

### Resource Type

`Microsoft.Search/searchServices`

### API Version

Management: `api-version=2023-11-01`
Data plane: `api-version=2024-05-01-preview` (for vector and semantic features)

### SKU Comparison

| SKU | Indexes | Storage/partition | Replicas | Partitions | Semantic search |
|---|---|---|---|---|---|
| `free` | 3 | 50 MB | 1 | 1 | Not supported |
| `basic` | 15 | 2 GB | 3 max | 1 | Paid add-on |
| `standard` | 50 | 25 GB | 12 max | 12 max | Standard tier |
| `standard2` | 200 | 100 GB | 12 max | 12 max | Standard tier |
| `standard3` | 1000 | 200 GB | 12 max | 12 max | Standard tier |
| `storage_optimized_l1` | 10 | 1 TB | 12 max | 12 max | Standard tier |
| `storage_optimized_l2` | 10 | 2 TB | 12 max | 12 max | Standard tier |

### Create Service

```http
PUT https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Search/searchServices/{serviceName}?api-version=2023-11-01
{
  "location": "eastus",
  "sku": { "name": "standard" },
  "properties": {
    "replicaCount": 1,
    "partitionCount": 1,
    "hostingMode": "default",
    "publicNetworkAccess": "enabled",
    "semanticSearch": "standard",
    "disableLocalAuth": false
  }
}
```

Set `semanticSearch: "standard"` (paid) or `"free"` (1000 queries/month free).

### Get Admin Keys

```http
POST https://management.azure.com/.../searchServices/{serviceName}/listAdminKeys?api-version=2023-11-01
```

**Prefer RBAC over admin keys.** Assign `Search Index Data Contributor` or `Search Service Contributor` roles.

### Create Query Key

```http
POST .../searchServices/{serviceName}/createQueryKey/{keyName}?api-version=2023-11-01
```

Query keys are read-only. Use for client-side search queries.

## Data Plane Base URL

```
https://{serviceName}.search.windows.net
```

All data plane requests include:
- `api-key: {admin-or-query-key}` **or** `Authorization: Bearer {entra-token}` (RBAC)
- `api-version=2024-05-01-preview` (for vector + semantic)

## Index Schema

### Field Types

| OData type | Description |
|---|---|
| `Edm.String` | Text field |
| `Edm.Int32` | 32-bit integer |
| `Edm.Int64` | 64-bit integer |
| `Edm.Double` | Floating point |
| `Edm.Boolean` | Boolean |
| `Edm.DateTimeOffset` | Date/time with time zone |
| `Edm.GeographyPoint` | Geographic coordinates |
| `Collection(Edm.String)` | Array of strings |
| `Collection(Edm.Single)` | Float32 array — **required for vector fields** |
| `Collection(Edm.Double)` | Float64 array |

### Field Attributes

| Attribute | Purpose |
|---|---|
| `key: true` | Primary key field (must be `Edm.String`) |
| `searchable: true` | Full-text indexed |
| `filterable: true` | Can use in `$filter` |
| `sortable: true` | Can use in `$orderby` |
| `facetable: true` | Can use in facet queries |
| `retrievable: true` | Returned in search results |
| `analyzer` | Text analyzer (e.g., `en.microsoft`, `en.lucene`, `keyword`) |
| `dimensions` | Required for vector fields — embedding dimension size |
| `vectorSearchProfile` | Name of vector profile to apply |

### Create Index with Vectors and Semantic

```http
PUT https://{serviceName}.search.windows.net/indexes/{indexName}?api-version=2024-05-01-preview
Content-Type: application/json

{
  "name": "{indexName}",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true, "retrievable": true, "filterable": true },
    { "name": "title", "type": "Edm.String", "searchable": true, "retrievable": true, "analyzer": "en.microsoft" },
    { "name": "content", "type": "Edm.String", "searchable": true, "retrievable": true, "analyzer": "en.microsoft" },
    { "name": "category", "type": "Edm.String", "filterable": true, "facetable": true, "retrievable": true },
    { "name": "published", "type": "Edm.DateTimeOffset", "filterable": true, "sortable": true, "retrievable": true },
    { "name": "score", "type": "Edm.Double", "filterable": true, "sortable": true, "retrievable": true },
    {
      "name": "contentVector",
      "type": "Collection(Edm.Single)",
      "searchable": true,
      "retrievable": false,
      "dimensions": 1536,
      "vectorSearchProfile": "hnsw-cosine"
    }
  ],
  "vectorSearch": {
    "profiles": [
      { "name": "hnsw-cosine", "algorithm": "hnsw-config", "vectorizer": "openai-vectorizer" }
    ],
    "algorithms": [
      {
        "name": "hnsw-config",
        "kind": "hnsw",
        "hnswParameters": { "m": 4, "efConstruction": 400, "efSearch": 500, "metric": "cosine" }
      }
    ],
    "vectorizers": [
      {
        "name": "openai-vectorizer",
        "kind": "azureOpenAI",
        "azureOpenAIParameters": {
          "resourceUri": "https://{openaiAccount}.openai.azure.com",
          "deploymentId": "text-embedding-3-small",
          "modelName": "text-embedding-3-small"
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
  "scoringProfiles": [
    {
      "name": "recency-boost",
      "functions": [
        { "type": "freshness", "fieldName": "published", "boost": 2, "freshness": { "boostingDuration": "P30D" } }
      ]
    }
  ]
}
```

### HNSW Parameters

| Parameter | Range | Default | Effect |
|---|---|---|---|
| `m` | 4–10 | 4 | Graph edges per node — higher = better recall, more memory |
| `efConstruction` | 100–1000 | 400 | Build-time search width — higher = better quality, slower build |
| `efSearch` | 100–1000 | 500 | Query-time search width — higher = better recall, slower query |
| `metric` | `cosine`, `dotProduct`, `euclidean` | `cosine` | Distance metric — must match embedding model |

## Data Sources

### Azure Blob Storage

```http
POST https://{serviceName}.search.windows.net/datasources?api-version=2024-05-01-preview
{
  "name": "blob-datasource",
  "type": "azureblob",
  "credentials": { "connectionString": "DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;" },
  "container": { "name": "documents", "query": "subfolder/" },
  "dataDeletionDetectionPolicy": {
    "@odata.type": "#Microsoft.Azure.Search.SoftDeleteColumnDeletionDetectionPolicy",
    "softDeleteColumnName": "IsDeleted",
    "softDeleteMarkerValue": "true"
  }
}
```

### Azure SQL

```json
{
  "type": "azuresql",
  "credentials": { "connectionString": "Server=tcp:{server}.database.windows.net;Database={db};User ID={user};Password={pw};" },
  "container": { "name": "dbo.Documents", "query": "SELECT id, title, content, modified FROM dbo.Documents WHERE modified >= @HighWaterMark ORDER BY modified" },
  "dataChangeDetectionPolicy": { "@odata.type": "#Microsoft.Azure.Search.HighWaterMarkChangeDetectionPolicy", "highWaterMarkColumnName": "modified" }
}
```

### Cosmos DB

```json
{
  "type": "cosmosdb",
  "credentials": { "connectionString": "AccountEndpoint=...;AccountKey=...;Database={db};" },
  "container": { "name": "products", "query": "SELECT * FROM c WHERE c._ts >= @HighWaterMark" }
}
```

## Skillsets

### Create Skillset

```http
POST https://{serviceName}.search.windows.net/skillsets?api-version=2024-05-01-preview
{
  "name": "enrichment-pipeline",
  "description": "OCR, entity recognition, and embedding generation",
  "skills": [ ... ],
  "cognitiveServices": {
    "@odata.type": "#Microsoft.Azure.Search.CognitiveServicesByKey",
    "key": "{cognitive-services-multi-key}"
  },
  "knowledgeStore": { ... }
}
```

### Built-in Skills Reference

| Skill | `@odata.type` | Purpose |
|---|---|---|
| OCR | `#Microsoft.Skills.Vision.OcrSkill` | Extract text from images |
| Image Analysis | `#Microsoft.Skills.Vision.ImageAnalysisSkill` | Tags, captions, objects |
| Split | `#Microsoft.Skills.Text.SplitSkill` | Split text into pages/sentences |
| Merge | `#Microsoft.Skills.Text.MergeSkill` | Merge text fields |
| Language Detection | `#Microsoft.Skills.Text.LanguageDetectionSkill` | Detect document language |
| Entity Recognition | `#Microsoft.Skills.Text.V3.EntityRecognitionSkill` | Extract named entities |
| Key Phrase Extraction | `#Microsoft.Skills.Text.KeyPhraseExtractionSkill` | Extract key phrases |
| Sentiment | `#Microsoft.Skills.Text.V3.SentimentSkill` | Sentiment + opinion mining |
| Translation | `#Microsoft.Skills.Text.TranslationSkill` | Translate to target language |
| PII Detection | `#Microsoft.Skills.Text.PIIDetectionSkill` | Detect and redact PII |
| Custom Web API | `#Microsoft.Skills.Custom.WebApiSkill` | Call external HTTP endpoint |
| Azure OpenAI Embedding | `#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill` | Generate embeddings via AOAI |

### AzureOpenAIEmbeddingSkill Example

```json
{
  "@odata.type": "#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill",
  "name": "embedding-skill",
  "resourceUri": "https://{openaiAccount}.openai.azure.com",
  "apiKey": null,
  "deploymentId": "text-embedding-3-small",
  "modelName": "text-embedding-3-small",
  "dimensions": 1536,
  "context": "/document",
  "inputs": [{ "name": "text", "source": "/document/content" }],
  "outputs": [{ "name": "embedding", "targetName": "contentVector" }]
}
```

## Indexers

### Create Indexer

```http
POST https://{serviceName}.search.windows.net/indexers?api-version=2024-05-01-preview
{
  "name": "blob-indexer",
  "dataSourceName": "blob-datasource",
  "targetIndexName": "{indexName}",
  "skillsetName": "enrichment-pipeline",
  "schedule": { "interval": "PT2H", "startTime": "2026-01-01T00:00:00Z" },
  "parameters": {
    "maxFailedItems": 10,
    "maxFailedItemsPerBatch": 5,
    "configuration": {
      "dataToExtract": "contentAndMetadata",
      "parsingMode": "default",
      "imageAction": "generateNormalizedImages"
    }
  },
  "fieldMappings": [
    { "sourceFieldName": "metadata_storage_name", "targetFieldName": "id", "mappingFunction": { "name": "base64Encode" } }
  ],
  "outputFieldMappings": [
    { "sourceFieldName": "/document/contentVector", "targetFieldName": "contentVector" }
  ]
}
```

### Run Indexer on Demand

```http
POST https://{serviceName}.search.windows.net/indexers/{indexerName}/run?api-version=2024-05-01-preview
```

### Get Indexer Status

```http
GET https://{serviceName}.search.windows.net/indexers/{indexerName}/status?api-version=2024-05-01-preview
```

Status values: `running`, `error`, `success`; includes `lastResult` with item counts and error details.

### Reset Indexer (full reindex)

```http
POST .../indexers/{indexerName}/reset?api-version=2024-05-01-preview
```

## Search Queries

### Simple Keyword Search

```http
POST https://{serviceName}.search.windows.net/indexes/{indexName}/docs/search?api-version=2024-05-01-preview
{
  "search": "cloud security best practices",
  "searchFields": "title,content",
  "queryType": "full",
  "top": 10,
  "select": "id,title,category,published",
  "filter": "category eq 'security'",
  "orderby": "published desc",
  "count": true
}
```

### Vector-Only Search

```json
{
  "vectorQueries": [{
    "kind": "vector",
    "vector": [0.123, -0.456, ...],
    "k": 5,
    "fields": "contentVector"
  }],
  "select": "id,title,content",
  "top": 5
}
```

### Hybrid Search (vector + keyword + semantic reranking)

```json
{
  "search": "renewable energy storage solutions",
  "vectorQueries": [{
    "kind": "vector",
    "vector": [...],
    "k": 50,
    "fields": "contentVector",
    "exhaustive": false
  }],
  "queryType": "semantic",
  "semanticConfiguration": "semantic-config",
  "queryLanguage": "en-us",
  "captions": "extractive|highlight-true",
  "answers": "extractive|count-3",
  "top": 10,
  "select": "id,title,content,category",
  "filter": "category ne 'archived'"
}
```

**`exhaustive: true`** performs exact KNN (slower, higher recall); `false` uses approximate HNSW.

### Facet Query

```json
{
  "search": "*",
  "facets": ["category,count:10", "published,interval:year"],
  "top": 0
}
```

### Autocomplete

```http
POST .../indexes/{indexName}/docs/autocomplete?api-version=2024-05-01-preview
{
  "search": "cloud se",
  "suggesterName": "sg",
  "fuzzy": true,
  "top": 5
}
```

Add suggester to index schema:
```json
"suggesters": [{ "name": "sg", "searchMode": "analyzingInfixMatching", "sourceFields": ["title"] }]
```

## Limits

| Resource | Standard SKU | Basic SKU |
|---|---|---|
| Max indexes | 50 | 15 |
| Max fields per index | 1000 | 100 |
| Max vector dimensions | 4096 | 4096 |
| Max document size | 16 MB | 16 MB |
| Max index size per partition | 25 GB | 2 GB |
| Max indexer runs per minute | 1 | 1 |
| Max skillset skills | 30 | 30 |
| Semantic ranker requests/month (free) | 1000 | 1000 |
