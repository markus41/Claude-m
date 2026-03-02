# M365 Admin operational knowledge (compact)

## 1) Core API / surface map
- **Users/groups/licenses**: Microsoft Graph `users`, `groups`, `subscribedSkus`, `licenseDetails`.
- **Exchange admin surfaces**: mailbox settings, mail flow artifacts, shared mailbox/group operations (Graph + Exchange admin cmdlets where required).
- **SharePoint admin surfaces**: site collections, sharing settings, permission posture via Graph/SharePoint admin endpoints.
- **Audit/compliance**: sign-ins, directory audit logs, and admin activity evidence.
- **Bulk admin workflows**: CSV-driven onboarding/offboarding/license reassignment with idempotent checkpoints.

## 2) Prerequisite matrix
| Area | Minimum requirement |
|---|---|
| Tenant role | At least User Administrator for user lifecycle; higher roles for license/security/policy changes |
| Graph permissions | Delegated/app scopes aligned to operation (e.g., `User.ReadWrite.All`, `Group.ReadWrite.All`, `Directory.Read.All`) |
| Exchange/SharePoint admin | Exchange Administrator / SharePoint Administrator role for service-specific operations |
| Licensing | Available SKU capacity before assignment |
| Auth context | Correct tenant and admin account with MFA/conditional access satisfied |
| Automation | Admin consent granted for app-only flows where used |

## 3) Common failure modes and deterministic remediation
- **Insufficient privileges**
  1. Capture exact Graph/PowerShell error.
  2. Map to missing role/scope.
  3. Assign minimal required role, re-consent if app permissions changed.
- **License assignment fails**
  1. Check `subscribedSkus` available units.
  2. Verify conflicting service plans.
  3. Retry assignment after dependency fixes.
- **Group/site propagation delay**
  1. Confirm create request succeeded.
  2. Wait for directory replication window.
  3. Re-query by stable object ID rather than display name.
- **Bulk job partial failure**
  1. Continue from failed subset only.
  2. Use idempotent keys (UPN/objectId).
  3. Emit per-record error report and deterministic retry file.

## 4) Limits, quotas, pagination/throttling guidance
- **Graph paging**: follow `@odata.nextLink` for all list operations.
- **Batch constraints**: keep Graph `$batch` requests within documented request count/size limits.
- **Throttling**: handle `429/503`, honor `Retry-After`, and avoid tenant-wide burst writes.
- **Service limits**: license counts, group limits, mailbox/site quotas vary by SKU; verify before large changes.
- **Audit retrieval**: bound time ranges and filter narrowly for predictable query runtime.

## 5) Safe-default operational patterns
1. **Read-only assessment first**: inventory users, groups, SKU capacity, and policy constraints.
2. **Preview/dry-run output**: show intended adds/removes before execution.
3. **Apply in batches**: start with pilot cohort, then full rollout.
4. **Verify post-change**: re-read effective state (license details, mailbox/site access, group membership).
5. **Reversible execution**: maintain rollback artifacts (previous group/license snapshot).
