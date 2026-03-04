# Azure DevOps Operational Knowledge

## 1) Core API Surface Map

| Area | Base URL | Key Endpoints | Notes |
|------|----------|---------------|-------|
| Repos | `dev.azure.com/{org}/{project}/_apis/git/*` | repositories, refs, pushes, pullrequests, cherrypicks, reverts | Code search uses `almsearch.dev.azure.com` |
| Pipelines (YAML) | `dev.azure.com/{org}/{project}/_apis/pipelines/*` | pipelines, runs | Preferred over Build API for YAML pipelines |
| Build (Classic) | `dev.azure.com/{org}/{project}/_apis/build/*` | builds, definitions, logs, artifacts | Shared by YAML runs for logs/artifacts |
| Release (Classic) | `vsrm.dev.azure.com/{org}/{project}/_apis/release/*` | definitions, releases, environments | Classic releases only; separate host |
| Work Tracking | `dev.azure.com/{org}/{project}/_apis/wit/*` | workitems, wiql, queries, fields, classificationnodes | JSON Patch content type for mutations |
| Boards | `dev.azure.com/{org}/{project}/{team}/_apis/work/*` | boards, columns, teamsettings, iterations | Team-scoped endpoints |
| Artifacts | `feeds.dev.azure.com/{org}/{project}/_apis/packaging/*` | feeds, packages, versions, retentionpolicies | Separate host for feeds API |
| Test Plans | `dev.azure.com/{org}/{project}/_apis/testplan/*` | plans, suites, testcases, runs, results | API version 7.1 |
| Distributed Task | `dev.azure.com/{org}/{project}/_apis/distributedtask/*` | pools, agents, environments, variablegroups, securefiles | Agent pool and environment management |
| Service Endpoints | `dev.azure.com/{org}/{project}/_apis/serviceendpoint/*` | endpoints, types | Service connection management |
| Security | `dev.azure.com/{org}/_apis/securitynamespaces/*` | namespaces, accesscontrollists, accesscontrolentries | Organization-scoped |
| Policy | `dev.azure.com/{org}/{project}/_apis/policy/*` | configurations, types | Branch policy management |
| Hooks | `dev.azure.com/{org}/_apis/hooks/*` | subscriptions, consumers, publishers | Service hooks/webhooks |
| Wiki | `dev.azure.com/{org}/{project}/_apis/wiki/*` | wikis, pages | Code wiki and project wiki |
| Dashboard | `dev.azure.com/{org}/{project}/{team}/_apis/dashboard/*` | dashboards, widgets | Team-scoped |
| Analytics | `analytics.dev.azure.com/{org}/{project}/_odata/v4.0-preview/*` | WorkItems, PipelineRuns, TestResultsDaily | OData endpoint; separate host |
| Audit | `auditservice.dev.azure.com/{org}/_apis/audit/*` | auditlog, downloadlog | Organization-level audit |
| Graph | `vssps.dev.azure.com/{org}/_apis/graph/*` | users, groups, memberships, descriptors | Identity and group management |

## 2) Prerequisite Matrix

| Area | Minimum Requirement |
|------|---------------------|
| Organization/project | Existing Azure DevOps org and target project access |
| Auth (PAT) | PAT with least-required scopes; rotate every 90 days max |
| Auth (Entra OAuth) | App registration with `499b84ac-1321-427f-aa17-267ca6975798/.default` scope |
| Auth (Managed Identity) | Azure-hosted compute with system or user-assigned MI; org policy must allow |
| Repo operations | Code (Read), Code (Read & Write) for pushes/PR creation |
| PR governance | Permission to set branch policies and complete PRs |
| Pipeline operations | Build (Read & Execute), agent pool access, service connection authorization |
| Release operations | Release (Read, Write & Execute) — Classic releases only |
| Work item operations | Work Items (Read & Write) scope; Content-Type: `application/json-patch+json` |
| Artifacts | Packaging (Read & Write); feed role: contributor for publish, reader for install |
| Test Plans | Test Plans (Read & Write) scope |
| Security/admin | Project Collection Administrator for org-level operations |
| Analytics/OData | Analytics views permission; OData endpoint enabled in org settings |
| Tenant linkage | For Entra OAuth/service connections: tenant app consent and subscription RBAC |

## 3) Azure DevOps CLI (`az devops`)

### Installation and Setup

```bash
# Install the Azure DevOps extension for Azure CLI
az extension add --name azure-devops

# Configure defaults to avoid repeating --org and --project
az devops configure --defaults organization=https://dev.azure.com/myorg project=myproject

# Login with PAT
echo $ADO_PAT | az devops login --organization https://dev.azure.com/myorg

# Login with Azure AD (browser-based)
az login
az devops configure --defaults organization=https://dev.azure.com/myorg
```

### Common CLI Commands

```bash
# --- Repos ---
az repos list --output table
az repos show --repository my-repo
az repos create --name new-repo
az repos delete --id <repo-id> --yes

# --- Pull Requests ---
az repos pr create --source-branch feature/auth --target-branch main \
  --title "Add OAuth" --description "PKCE flow" --reviewers user@company.com
az repos pr list --status active --output table
az repos pr show --id 42
az repos pr set-vote --id 42 --vote approve
az repos pr complete --id 42 --squash --delete-source-branch

# --- Branch Policies ---
az repos policy list --repository-id <repo-id> --branch main
az repos policy approver-count create --repository-id <repo-id> \
  --branch main --minimum-approver-count 2 --creator-vote-counts false \
  --enabled true --blocking true
az repos policy build create --repository-id <repo-id> --branch main \
  --build-definition-id 12 --enabled true --blocking true \
  --display-name "CI Validation" --valid-duration 720

# --- Pipelines ---
az pipelines list --output table
az pipelines show --id 5
az pipelines run --id 5 --branch main
az pipelines build list --top 10 --output table
az pipelines build show --id 100

# --- Work Items ---
az boards work-item create --type "User Story" --title "Implement login" \
  --assigned-to user@company.com --area "MyProject\\Frontend" \
  --iteration "MyProject\\Sprint 12"
az boards work-item show --id 42
az boards work-item update --id 42 --state Active
az boards work-item delete --id 42 --yes

# --- WIQL Queries ---
az boards query --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = 'Active'" --output table

# --- Artifacts ---
az artifacts feed list --output table
az artifacts feed create --name corporate-feed
az artifacts universal publish --feed corporate-feed --name my-pkg \
  --version 1.0.0 --path ./dist
az artifacts universal download --feed corporate-feed --name my-pkg \
  --version 1.0.0 --path ./output

# --- Wiki ---
az devops wiki list
az devops wiki page show --wiki my-wiki --path /Home
az devops wiki page create --wiki my-wiki --path "/New Page" \
  --content "# New Page Content"

# --- Service Connections ---
az devops service-endpoint list --output table
az devops service-endpoint show --id <endpoint-id>
```

## 4) API Version Matrix

| API Version | Status | Key Changes |
|-------------|--------|-------------|
| `7.1` | Current stable (2024+) | Pipeline checks, environment resources, enhanced WIQL |
| `7.0` | Supported | Environments, YAML pipeline runs API |
| `6.0` | Supported (legacy) | Last version with some Classic-only features |
| `5.1` | Deprecated | Missing pipeline runs API; avoid for new integrations |
| `4.1` | End of life | Pre-YAML pipeline era; do not use |

**Best practice**: Always pin `api-version=7.1` in new integrations. Older versions may miss fields or return different response shapes.

### Version negotiation
```
GET /_apis?api-version=7.1
# Returns available API areas and their supported version ranges
```

## 5) Extension and Marketplace API

```bash
# List installed extensions
az devops extension list --output table

# Install an extension
az devops extension install --publisher-id ms-devlabs \
  --extension-id team-retrospectives

# Uninstall an extension
az devops extension uninstall --publisher-id ms-devlabs \
  --extension-id team-retrospectives --yes

# Search marketplace (REST)
GET https://extmgmt.dev.azure.com/{org}/_apis/extensionmanagement/installedextensions?api-version=7.1
```

### Extension Data Storage API

Extensions can store custom data using the extension data service:
```
GET /_apis/ExtensionManagement/InstalledExtensions/{publisherId}/{extensionId}/Data/Scopes/{scopeType}/{scopeValue}/Collections/{collectionName}/Documents?api-version=7.1
```

## 6) Common Failure Modes and Deterministic Remediation

### Authentication Failures (401/403)

1. **Check PAT validity**: `az devops login` — if it prompts again, the PAT expired.
2. **Verify required scopes**: Each API area needs specific scopes (Code, Build, Work Items, Packaging, Release).
3. **Confirm project permissions**: User/service principal must have project-level access.
4. **Entra token**: Verify audience is `499b84ac-1321-427f-aa17-267ca6975798` and token is not expired.
5. **Managed Identity**: Confirm the MI is added to the Azure DevOps organization and has appropriate project permissions.

### Pipeline Failures

1. **Service connection auth**: Revalidate credentials; check Azure subscription RBAC.
2. **Agent not available**: Verify pool exists, agent is online, and parallel job entitlement covers demand.
3. **YAML compile error**: Validate with `/_apis/pipelines?validateOnly=true`; check template paths.
4. **Variable group access**: Grant pipeline access to the variable group (Project Settings > Pipelines > Library).
5. **Timeout**: Check if approval gate expired; increase timeout or re-run pipeline.

### PR Blocked Unexpectedly

1. Inspect branch policies: required reviewers, build validation, status checks.
2. Resolve stale comments and required check failures.
3. Requeue the validation pipeline.
4. Verify `lastMergeSourceCommit` is current before attempting completion.

### Work Item API Errors

1. **415 Unsupported Media Type**: Use `Content-Type: application/json-patch+json`.
2. **TF201007 field constraint**: Check work item type rules for valid states/fields.
3. **TF26027 invalid path**: Verify area/iteration path exists via classification nodes API.
4. **Concurrency conflict**: Refetch item to get current `rev` before retrying update.

### Artifacts Errors

1. **401 on feed**: Add `Packaging (Read & Write)` scope to PAT.
2. **Feed not found**: Check project-scoped vs. organization-scoped feed URL.
3. **Version exists**: Increment version; Azure Artifacts does not allow overwrite.
4. **npm E401**: Re-run `npmAuthenticate@0` task; check `.npmrc` always-auth=true.

## 7) Limits, Quotas, Pagination, and Throttling

### Global Rate Limits

| Limit | Value | Remediation |
|-------|-------|-------------|
| REST API rate limit | 12,000 requests / 5 minutes per user | Use `Retry-After` header on 429 |
| Concurrent pipeline jobs | Bounded by parallel job entitlement | Purchase additional parallel jobs |
| Work items per org | 10,000,000+ (practical, not hard limit) | Archive old projects |
| Repos per project | 1,000 | Contact support for increase |

### Pagination Patterns

```typescript
// Continuation token pattern (used by most list APIs)
let continuationToken: string | undefined;
const allItems: any[] = [];

do {
  const url = `${BASE}/git/repositories?api-version=7.1&$top=100${
    continuationToken ? `&continuationToken=${continuationToken}` : ""
  }`;
  const response = await axios.get(url, { headers: HEADERS });
  allItems.push(...response.data.value);
  continuationToken = response.headers["x-ms-continuationtoken"];
} while (continuationToken);

// $skip/$top pattern (used by WIQL results, search)
const PAGE_SIZE = 200;
for (let skip = 0; skip < totalCount; skip += PAGE_SIZE) {
  const response = await axios.get(
    `${BASE}/wit/workitems?ids=${ids.slice(skip, skip + PAGE_SIZE).join(",")}&api-version=7.1`,
    { headers: HEADERS }
  );
  allItems.push(...response.data.value);
}
```

### Throttling Best Practices

- Implement exponential backoff with jitter on 429 responses.
- Use batch endpoints where available (work items: up to 200 per request).
- Cache GET responses locally for short-lived scripts.
- Scope queries by project/repo/time to reduce response sizes.
- Use `fields` parameter to request only needed columns.

## 8) Safe-Default Operational Patterns

1. **Read-only first**: List repos/policies/pipelines/work items before mutating state.
2. **Dry-run changes**: Draft pipeline YAML/PR policy updates in feature branch first.
3. **Small blast radius**: Apply to one project/repo/pipeline, then expand.
4. **Require policy evidence**: Keep build validation and reviewer checks enforced.
5. **Rollback ready**: Maintain prior YAML, policy snapshot, and service connection fallback.
6. **Audit trail**: Use `System.History` on work items and commit messages for traceability.
7. **Least privilege**: Use scoped PATs or Workload Identity Federation over full-access tokens.
8. **Version pin**: Always specify `api-version=7.1` — never omit the query parameter.

## 9) Service Hook and Webhook Configuration

```bash
# List service hook subscriptions
az devops service-endpoint list  # Not directly for hooks; use REST

# REST: List subscriptions
GET https://dev.azure.com/{org}/_apis/hooks/subscriptions?api-version=7.1

# REST: Create a webhook subscription
POST https://dev.azure.com/{org}/_apis/hooks/subscriptions?api-version=7.1
{
  "publisherId": "tfs",
  "eventType": "git.pullrequest.created",
  "resourceVersion": "1.0",
  "consumerId": "webHooks",
  "consumerActionId": "httpRequest",
  "publisherInputs": {
    "projectId": "<project-id>",
    "repository": "<repo-id>"
  },
  "consumerInputs": {
    "url": "https://my-service.example.com/webhook",
    "httpHeaders": "X-Custom-Header:value",
    "resourceDetailsToSend": "all"
  }
}
```

### Common Event Types

| Publisher | Event Type | Fires When |
|-----------|------------|------------|
| `tfs` | `git.push` | Code pushed to any branch |
| `tfs` | `git.pullrequest.created` | New PR created |
| `tfs` | `git.pullrequest.updated` | PR title, description, or status changed |
| `tfs` | `git.pullrequest.merged` | PR completed (merged) |
| `tfs` | `build.complete` | Build finishes (success or failure) |
| `tfs` | `ms.vss-release.deployment-completed-event` | Classic release deployment completed |
| `tfs` | `workitem.created` | New work item created |
| `tfs` | `workitem.updated` | Work item field changed |
| `tfs` | `workitem.commented` | Comment added to work item |

## 10) Audit Log API

```bash
# Query audit log (REST)
GET https://auditservice.dev.azure.com/{org}/_apis/audit/auditlog?api-version=7.1&startTime=2026-03-01T00:00:00Z&endTime=2026-03-04T23:59:59Z

# Download audit log as CSV
GET https://auditservice.dev.azure.com/{org}/_apis/audit/downloadlog?format=csv&startTime=2026-03-01&endTime=2026-03-04&api-version=7.1
```

Audit events cover: permission changes, policy modifications, pipeline runs, repo access, PAT creation/revocation, and organization settings changes.
