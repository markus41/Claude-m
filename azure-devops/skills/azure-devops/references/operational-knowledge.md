# Azure DevOps operational knowledge (compact)

## 1) Core API / surface map
- **Repos**: Git repositories, branches, branch policies, pull requests (`/_apis/git/*`).
- **Pipelines**: YAML pipelines/runs/logs (`/_apis/pipelines/*`), build definitions/runs (`/_apis/build/*`).
- **Work tracking**: Work items + WIQL queries (`/_apis/wit/*`).
- **Artifacts**: Feeds, packages, versions (`/_apis/packaging/*`).
- **Security/admin**: Project/team settings, service connections, variable groups, approvals/checks.

## 2) Prerequisite matrix
| Area | Minimum requirement |
|---|---|
| Organization/project | Existing Azure DevOps org and target project access |
| Auth | PAT with least-required scopes or Microsoft Entra OAuth token |
| Repo operations | Repo Contribute/Branch Create permissions |
| PR governance | Permission to set branch policies and complete PRs |
| Pipeline operations | Queue builds + edit pipeline permissions; agent pool access |
| Tenant linkage | If using Entra OAuth/service connections, tenant app consent and subscription rights (for Azure deployments) |

## 3) Common failure modes and deterministic remediation
- **401/403 on REST calls**
  1. Check PAT validity/expiry.
  2. Verify required scopes for endpoint area.
  3. Confirm user/service principal project permissions.
- **Pipeline fails on service connection auth**
  1. Revalidate service connection credentials.
  2. Confirm subscription/resource RBAC.
  3. Re-run with system diagnostics enabled.
- **PR blocked unexpectedly**
  1. Inspect branch policies (required reviewers/build/status checks).
  2. Resolve stale comments and required checks.
  3. Requeue validation pipeline.
- **Work item query incomplete**
  1. Use WIQL with explicit Area/Iteration filters.
  2. Handle continuation/paging in result processing.
  3. Verify security trimming is not hiding items.

## 4) Limits, quotas, pagination/throttling guidance
- **REST pagination**: use `$top` + continuation tokens for list APIs; do not assume full result in one response.
- **Rate limits**: handle `429` with exponential backoff and retry budget.
- **Pipeline concurrency**: bounded by agent pool capacity and parallel job entitlement.
- **Artifact limits**: feed/package retention and size constraints require cleanup policies.
- **Large org queries**: scope repo/work item queries by project/path/time to avoid expensive scans.

## 5) Safe-default operational patterns
1. **Read-only first**: list repos/policies/pipelines/work items before mutating state.
2. **Dry-run changes**: draft pipeline YAML/PR policy updates in feature branch first.
3. **Small blast radius**: apply to one project/repo/pipeline, then expand.
4. **Require policy evidence**: keep build validation and reviewer checks enforced.
5. **Rollback ready**: maintain prior YAML, policy snapshot, and service connection fallback.
