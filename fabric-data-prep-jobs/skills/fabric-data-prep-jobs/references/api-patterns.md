# API Patterns - fabric-data-prep-jobs

Use these patterns to keep prep operations deterministic and auditable.

## 1. Workspace Item Discovery

1. List candidate items in workspace.
2. Filter by expected item type (`AirflowJob`, `DataflowGen1`, `MountedAdfPipeline`, `DbtJob`).
3. Match by stable name and immutable item ID.

Example (shape):

```http
GET /v1/workspaces/{workspaceId}/items?type={itemType}
```

## 2. Safe Upsert Pattern

1. Read current definition and version/etag.
2. Build minimal patch with deterministic fields only.
3. Submit update with optimistic concurrency token.
4. Re-read and compare normalized fields.

```http
PATCH /v1/workspaces/{workspaceId}/items/{itemId}
If-Match: "{etag}"
```

## 3. Deterministic Job Contract Fields

- `schedule.cron` and `timezone`
- `retry.maxAttempts` and `retry.backoffSeconds`
- `concurrency.maxParallelRuns`
- `inputs` and `outputs` schema fingerprints
- `ownerGroup` and `supportAlias`

Reject updates missing any required field.

## 4. Airflow Job Controls

- Pause/resume is a state transition only.
- DAG definition changes must reference a pinned artifact version.
- Avoid implicit default pools/queues in production.

## 5. ADF Mount Governance

- Store both Fabric item ID and source ADF pipeline identity.
- Validate that mapped trigger behavior is explicit (`manual`, `schedule`, `event`).
- Preserve source-to-target lineage metadata on every change.

## 6. Dataflow Gen1 Controls

- Pin refresh policy (window, retries, timeout).
- Require deterministic transform ordering (no unordered wildcard rules).
- Enforce output table naming convention.

## 7. dbt Job Governance (Preview)

Preview caveat: API surface may change by region/tenant.

- Require pinned dbt project ref (`gitSha` or immutable release tag).
- Require explicit target profile and environment.
- Store artifact retention window and test severity gate.

## 8. Fail-Fast and Redaction

- Fail fast on missing `tenantId`, missing workspace context, cloud mismatch, or insufficient grants.
- Redact sensitive IDs in logs/output (`abcdef...1234`) and never emit secrets/tokens.
