# API Patterns - fabric-data-store

Use these patterns to keep store operations deterministic and auditable.

## 1. Asset Discovery and Identity

1. Enumerate workspace items by type.
2. Resolve target by immutable item ID.
3. Confirm expected subtype metadata before write operations.

```http
GET /v1/workspaces/{workspaceId}/items?type={assetType}
```

## 2. Safe Change Pattern

1. Read current definition and version/etag.
2. Validate requested operation against governance constraints.
3. Apply minimal patch using optimistic concurrency.
4. Re-read and compare normalized policy fields.

```http
PATCH /v1/workspaces/{workspaceId}/items/{itemId}
If-Match: "{etag}"
```

## 3. Cosmos DB Database Governance

- Pin throughput policy and partition strategy.
- Enforce backup and retention settings.
- Require explicit owner and support metadata.

## 4. SQL Database Governance

- Enforce collation and compatibility-level policy.
- Validate schema migration mode (`manual`, `approved-pipeline`, `blocked`).
- Require deterministic backup/restore posture metadata.

## 5. Snowflake Database Link Governance

- Pin account locator and database mapping explicitly.
- Validate network/security boundary and credential mode.
- Store lineage metadata for linked objects.

## 6. Datamart Governance (Preview)

Preview caveat: API fields may vary by tenant and region.

- Require explicit refresh cadence, semantic owner, and dependency map.
- Reject implicit auto-model changes without approval metadata.

## 7. Event Schema Set Governance (Preview)

Preview caveat: schema validation and compatibility modes can change.

- Enforce schema versioning policy.
- Require compatibility mode (`backward`, `forward`, `full`) on updates.
- Require producer/consumer ownership tags.

## 8. Fail-Fast and Redaction

- Fail fast when context fields or minimum grants are missing.
- Redact IDs in outputs and never expose credentials, tokens, or secrets.
