# Entra ID Security operational knowledge (compact)

## 1) Core API / surface map
- **App identity**: app registrations + service principals (`/applications`, `/servicePrincipals`).
- **Conditional Access**: policies and named locations (`/identity/conditionalAccess/*`).
- **Identity protection**: risky users and risk detections (`/identityProtection/*`).
- **Auth telemetry**: sign-in logs and directory audits (`/auditLogs/signIns`, `/auditLogs/directoryAudits`).
- **Consent governance**: OAuth2 permission grants and app role assignments.

## 2) Prerequisite matrix
| Area | Minimum requirement |
|---|---|
| Tenant role | Security Administrator / Conditional Access Administrator for policy work |
| Graph scopes | `Policy.Read.All`/`Policy.ReadWrite.ConditionalAccess`, `AuditLog.Read.All`, app lifecycle scopes as needed |
| Consent model | Admin consent for app permissions in automation scenarios |
| Licensing | Entra ID P1/P2 for Conditional Access and Identity Protection scenarios |
| Auth posture | MFA-compliant admin account and trusted admin workstation/network |
| Target scope | Clear include/exclude users, groups, apps, and break-glass accounts before policy changes |

## 3) Common failure modes and deterministic remediation
- **CA policy lockout risk**
  1. Start in report-only mode.
  2. Exclude emergency access accounts.
  3. Review sign-in impact, then enforce.
- **403 on Graph security endpoint**
  1. Verify role assignment and scope grant.
  2. Confirm admin consent completed.
  3. Re-authenticate token with updated claims.
- **Riskiest users not visible**
  1. Confirm required license tier.
  2. Validate scope (`IdentityRiskyUser.Read.All` or write variant).
  3. Query bounded time range and paginate fully.
- **Over-privileged service principal findings**
  1. Enumerate app role assignments.
  2. Remove non-required grants in staged changes.
  3. Re-test dependent workload before finalizing.

## 4) Limits, quotas, pagination/throttling guidance
- **Graph pagination**: always follow `@odata.nextLink` for sign-ins, audits, principals, and risk objects.
- **Throttling**: identity and audit endpoints can return `429`; back off and honor retry headers.
- **Policy complexity**: too many overlapping CA policies increases troubleshooting cost; consolidate where possible.
- **Log horizons**: retention varies by SKU/licensing; export needed logs for long-term forensics.
- **Write cadence**: serialize high-impact policy changes; avoid concurrent broad CA edits.

## 5) Safe-default operational patterns
1. **Read-only baseline**: export current policies, app permissions, and risky-user/sign-in trends.
2. **Report-only first**: deploy/modify CA in report-only, validate impact with logs.
3. **Least privilege**: grant minimum API permissions and privileged roles.
4. **Phased enforcement**: pilot with small target groups before tenant-wide enablement.
5. **Recovery ready**: maintain emergency access accounts and rollback instructions per policy.
