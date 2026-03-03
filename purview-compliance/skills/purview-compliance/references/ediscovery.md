# eDiscovery — Microsoft Purview Reference

Microsoft Purview eDiscovery provides two tiers: **eDiscovery (Standard)** for basic litigation support and **eDiscovery (Premium)** for complex investigations with advanced analytics, custodian management, and review set workflows. Both are accessible via Graph API (`/security/cases/`) and the Purview compliance portal.

---

## Standard vs Premium Comparison

| Feature | eDiscovery (Standard) | eDiscovery (Premium) |
|---------|----------------------|---------------------|
| Case management | Basic | Advanced (custodians, hold policies) |
| Content search | KQL queries | KQL + intelligent search |
| Legal hold | Per-location hold | Custodian-based hold |
| Export formats | PST, MSG, native | PST, EML, PDF, native |
| Review sets | No | Yes (with analytics) |
| Near-duplicate detection | No | Yes |
| Email threading | No | Yes |
| Themes analysis | No | Yes |
| Conversation reconstruction | No | Yes |
| Custodian communications | No | Yes |
| Required license | E3 + eDiscovery add-on | E5 or E5 Compliance add-on |

---

## REST API Endpoints (Microsoft Graph v1.0)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `/security/cases/ediscoveryCases` | `eDiscovery.ReadWrite.All` | Body: case object | Create new case |
| GET | `/security/cases/ediscoveryCases` | `eDiscovery.Read.All` | `$top`, `$filter`, `$orderby` | List all cases |
| GET | `/security/cases/ediscoveryCases/{caseId}` | `eDiscovery.Read.All` | `$expand=custodians,legalHolds` | Case with related objects |
| PATCH | `/security/cases/ediscoveryCases/{caseId}` | `eDiscovery.ReadWrite.All` | Partial update body | Update case description |
| POST | `/security/cases/ediscoveryCases/{caseId}/close` | `eDiscovery.ReadWrite.All` | No body | Close case |
| POST | `/security/cases/ediscoveryCases/{caseId}/reopen` | `eDiscovery.ReadWrite.All` | No body | Reopen closed case |
| DELETE | `/security/cases/ediscoveryCases/{caseId}` | `eDiscovery.ReadWrite.All` | — | Deletes case and all children |
| POST | `/security/cases/ediscoveryCases/{caseId}/custodians` | `eDiscovery.ReadWrite.All` | Body: custodian object | Add custodian |
| GET | `/security/cases/ediscoveryCases/{caseId}/custodians` | `eDiscovery.Read.All` | `$expand=userSources,siteSources` | List custodians with sources |
| POST | `/security/cases/ediscoveryCases/{caseId}/custodians/{id}/activate` | `eDiscovery.ReadWrite.All` | No body | Activate hold on custodian |
| POST | `/security/cases/ediscoveryCases/{caseId}/custodians/{id}/release` | `eDiscovery.ReadWrite.All` | No body | Release custodian from hold |
| POST | `/security/cases/ediscoveryCases/{caseId}/legalHolds` | `eDiscovery.ReadWrite.All` | Body: hold object | Create legal hold |
| GET | `/security/cases/ediscoveryCases/{caseId}/legalHolds` | `eDiscovery.Read.All` | `$expand=siteSources,unifiedGroupSources,userSources` | List holds |
| PATCH | `/security/cases/ediscoveryCases/{caseId}/legalHolds/{holdId}` | `eDiscovery.ReadWrite.All` | Partial update | Update hold query |
| POST | `/security/cases/ediscoveryCases/{caseId}/searches` | `eDiscovery.ReadWrite.All` | Body: search object | Create content search |
| GET | `/security/cases/ediscoveryCases/{caseId}/searches` | `eDiscovery.Read.All` | — | List searches |
| POST | `/security/cases/ediscoveryCases/{caseId}/searches/{searchId}/estimate` | `eDiscovery.ReadWrite.All` | No body | Trigger estimate (async) |
| GET | `/security/cases/ediscoveryCases/{caseId}/searches/{searchId}/estimateStatistics` | `eDiscovery.Read.All` | — | Get estimate results |
| GET | `/security/cases/ediscoveryCases/{caseId}/reviewSets` | `eDiscovery.Read.All` | — | List review sets |
| POST | `/security/cases/ediscoveryCases/{caseId}/reviewSets` | `eDiscovery.ReadWrite.All` | Body: review set object | Create review set |
| POST | `/security/cases/ediscoveryCases/{caseId}/reviewSets/{id}/addToReviewSet` | `eDiscovery.ReadWrite.All` | Body: search reference | Add search results to review set |
| POST | `/security/cases/ediscoveryCases/{caseId}/reviewSets/{id}/export` | `eDiscovery.ReadWrite.All` | Body: export options | Trigger export |
| GET | `/security/cases/ediscoveryCases/{caseId}/operations` | `eDiscovery.Read.All` | — | Long-running operation status |

---

## Case Creation (TypeScript)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

async function createEdiscoveryCase(
  client: Client,
  displayName: string,
  description: string,
  externalId: string
): Promise<string> {
  const body = {
    displayName,
    description,
    externalId
  };

  const result = await client
    .api('/security/cases/ediscoveryCases')
    .post(body);

  return result.id;
}

// Usage
const caseId = await createEdiscoveryCase(
  client,
  'HR Investigation 2026-Q1',
  'Investigation into data handling compliance incident',
  'CASE-2026-0042'
);
```

---

## Custodian Management

```typescript
// Add custodian to case with all data sources on hold
async function addCustodian(
  client: Client,
  caseId: string,
  email: string
): Promise<string> {
  const custodian = await client
    .api(`/security/cases/ediscoveryCases/${caseId}/custodians`)
    .post({
      email,
      applyHoldToSources: true
    });

  // Activate the hold explicitly if not auto-activated
  await client
    .api(`/security/cases/ediscoveryCases/${caseId}/custodians/${custodian.id}/activate`)
    .post({});

  return custodian.id;
}

// List custodian data sources
async function getCustodianSources(
  client: Client,
  caseId: string,
  custodianId: string
) {
  const result = await client
    .api(`/security/cases/ediscoveryCases/${caseId}/custodians/${custodianId}`)
    .expand('userSources,siteSources,unifiedGroupSources')
    .get();

  return {
    mailboxes: result.userSources,
    sharePointSites: result.siteSources,
    groups: result.unifiedGroupSources
  };
}
```

---

## Legal Hold Creation

```typescript
// Create legal hold with KQL content query
async function createLegalHold(
  client: Client,
  caseId: string,
  displayName: string,
  contentQuery?: string
): Promise<string> {
  const hold = await client
    .api(`/security/cases/ediscoveryCases/${caseId}/legalHolds`)
    .post({
      displayName,
      description: 'Litigation hold — preserve all responsive content',
      isEnabled: true,
      contentQuery: contentQuery || ''
    });

  return hold.id;
}

// Add a mailbox user source to the hold
async function addUserSourceToHold(
  client: Client,
  caseId: string,
  holdId: string,
  email: string
) {
  await client
    .api(`/security/cases/ediscoveryCases/${caseId}/legalHolds/${holdId}/userSources`)
    .post({
      email,
      includedSources: 'mailbox,site'  // mailbox + OneDrive
    });
}

// Add a SharePoint site source to the hold
async function addSiteSourceToHold(
  client: Client,
  caseId: string,
  holdId: string,
  siteWebUrl: string
) {
  await client
    .api(`/security/cases/ediscoveryCases/${caseId}/legalHolds/${holdId}/siteSources`)
    .post({ site: { webUrl: siteWebUrl } });
}
```

---

## Content Search with KQL

```typescript
// Create search across custodian sources
async function createSearch(
  client: Client,
  caseId: string,
  displayName: string,
  kqlQuery: string
): Promise<string> {
  const search = await client
    .api(`/security/cases/ediscoveryCases/${caseId}/searches`)
    .post({
      displayName,
      description: 'Content search for responsive items',
      contentQuery: kqlQuery,
      dataSourceScopes: 'allTenant'  // or specify custodians
    });

  return search.id;
}

// Trigger estimate and poll for results
async function estimateSearch(
  client: Client,
  caseId: string,
  searchId: string
): Promise<{ items: number; size: number }> {
  // Trigger estimate
  await client
    .api(`/security/cases/ediscoveryCases/${caseId}/searches/${searchId}/estimate`)
    .post({});

  // Poll operations until complete
  let status = 'notStarted';
  while (status !== 'succeeded' && status !== 'failed') {
    await new Promise(r => setTimeout(r, 10000));
    const operations = await client
      .api(`/security/cases/ediscoveryCases/${caseId}/operations`)
      .get();

    const estimateOp = operations.value.find(
      (op: any) => op.action === 'estimateStatistics'
    );
    status = estimateOp?.status || 'notStarted';
  }

  const stats = await client
    .api(`/security/cases/ediscoveryCases/${caseId}/searches/${searchId}/estimateStatistics`)
    .get();

  return {
    items: stats.itemsCount,
    size: stats.sizeInBytes
  };
}
```

---

## Common KQL Search Queries

| Scenario | KQL Query |
|----------|-----------|
| Email from/to a specific user | `from:suspect@contoso.com OR to:suspect@contoso.com` |
| Content in date range | `sent:2025-01-01..2026-03-01` |
| Subject contains | `subject:"Project Alpha"` |
| File type filter | `filetype:xlsx AND "quarterly report"` |
| Credit card numbers | `SensitiveType:"Credit Card Number"` |
| Keyword AND site | `"merger announcement" AND path:"https://contoso.sharepoint.com/sites/finance"` |
| Teams messages | `kind:im AND "acquisition target"` |
| Large attachments | `size:>5MB AND hasattachment:true` |
| Deleted items | `folder:deletedItems` |

---

## Export from Review Set

```typescript
// Add search results to review set
async function addToReviewSet(
  client: Client,
  caseId: string,
  reviewSetId: string,
  searchId: string
) {
  await client
    .api(`/security/cases/ediscoveryCases/${caseId}/reviewSets/${reviewSetId}/addToReviewSet`)
    .post({
      search: {
        '@odata.type': 'microsoft.graph.security.ediscoverySearch',
        id: searchId
      },
      additionalDataOptions: 'allVersions,linkedFiles'
    });
}

// Export review set contents
async function exportReviewSet(
  client: Client,
  caseId: string,
  reviewSetId: string,
  exportName: string
) {
  await client
    .api(`/security/cases/ediscoveryCases/${caseId}/reviewSets/${reviewSetId}/export`)
    .post({
      outputName: exportName,
      description: 'Legal review export',
      exportOptions: 'originalFiles,tags,fileInfo,directory',
      exportStructure: 'directory',
      outputFormat: 'pst'  // pst | msg | eml
    });
}
```

---

## Export Format Reference

| Format | Use Case | Notes |
|--------|----------|-------|
| `pst` | Outlook import, attorney review | Exchange items only |
| `msg` | Individual messages, eDiscovery tools | Exchange items only |
| `eml` | Non-Outlook mail clients | Exchange items only |
| Native | Original format (DOCX, XLSX, PDF) | All content types |
| `pdf` | Read-only review | Converts Office docs to PDF |

---

## Conversation Threading and Analytics (Premium)

```typescript
// Run analytics on review set (near-duplicate, threading, themes)
async function runReviewSetAnalytics(
  client: Client,
  caseId: string,
  reviewSetId: string
) {
  // Analytics are triggered via the review set's run analytics operation
  // This starts a long-running operation
  const operation = await client
    .api(`/security/cases/ediscoveryCases/${caseId}/reviewSets/${reviewSetId}/runQuery`)
    .post({
      queryText: '*',
      runAnalytics: true
    });

  return operation.id;
}
```

---

## Custodian Communications (Premium)

```typescript
// Send hold notification to custodian
async function sendHoldNotification(
  client: Client,
  caseId: string,
  custodianId: string,
  noticeContent: string
) {
  await client
    .api(`/security/cases/ediscoveryCases/${caseId}/custodians/${custodianId}/sendHoldNotification`)
    .post({
      notificationTemplate: {
        issuanceNotes: noticeContent,
        portalNotificationContent: noticeContent
      }
    });
}
```

---

## PowerShell eDiscovery Commands

```powershell
Connect-IPPSSession -UserPrincipalName "ediscovery-admin@contoso.com"

# List all content searches (not eDiscovery searches)
Get-ComplianceSearch

# Create a quick compliance search (outside a case)
New-ComplianceSearch `
    -Name "Quick PII Scan" `
    -ExchangeLocation All `
    -ContentMatchQuery "SensitiveType:'U.S. Social Security Number (SSN)'" `
    -AllowNotFoundExchangeLocationsEnabled $true

Start-ComplianceSearch -Identity "Quick PII Scan"

# Check status
Get-ComplianceSearch -Identity "Quick PII Scan" | Select Status, Items, Size

# Preview results (sampling)
Get-ComplianceSearchAction -SearchName "Quick PII Scan" -Preview

# Export to PST
New-ComplianceSearchAction -SearchName "Quick PII Scan" -Export `
    -Format FxStream `
    -ExchangeArchiveFormat SinglePST `
    -Scope BothIndexedAndUnindexedItems
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `CustodianAlreadyExists` | Email already added to case | Query custodians first; skip if present |
| 400 `InvalidContentQuery` | Malformed KQL query | Validate KQL in Advanced Hunting before using |
| 403 `Forbidden` | Missing eDiscovery Manager or Administrator role | Assign role in Purview compliance portal |
| 404 `CaseNotFound` | Case ID not found | Verify case ID from GET cases response |
| 409 `CaseIsClosed` | Operation on closed case | Reopen case first with `POST .../reopen` |
| 409 `LegalHoldConflict` | Cannot delete content under legal hold | Release hold before attempting delete |
| 429 `TooManyRequests` | API throttled | Retry after `Retry-After` header delay |
| `OperationFailed` | Long-running operation failed | Check `/operations` for error details |
| `ExportFailed` | Export operation failed | Retry; check review set item count |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Cases per tenant | Unlimited | Archived cases do not count |
| Custodians per case | 30 (Standard) / 500 (Premium) | — |
| Legal holds per case | 50 (Standard) / 100 (Premium) | — |
| Searches per case | 50 (Standard) / 500 (Premium) | — |
| Review sets per case | — / 20 (Premium) | — |
| Items per review set | — / 1 million | Larger sets slow analytics |
| Export size limit | 200 GB per export | Split large exports |
| Search query length | 4,096 characters | — |
| eDiscovery hold latency | 24-48 hours | Hold applies after propagation |
| Audit query retention | 90 days (E3) / 1 year (E5) | eDiscovery audit events |

---

## Common Patterns and Gotchas

1. **eDiscovery Manager vs Administrator** — Managers can only see cases they created or are members of. Administrators see all cases. Assign Administrator sparingly — limit to eDiscovery team leads.

2. **Custodian vs non-custodian sources** — Custodians are specific individuals. For shared mailboxes, departmental sites, or external sources, use non-custodian data sources (legal holds without custodian objects).

3. **Estimate before export** — Always run `estimate` before adding to a review set. A search returning 2M items will take days to process and could exhaust storage quota. Narrow the KQL query first.

4. **Cloud attachments** — Modern Teams files are stored in SharePoint, not in the message. eDiscovery Standard may miss Teams file content. Use eDiscovery Premium with cloud attachment option or add the SharePoint site as a separate source.

5. **Deleted items and recoverable items** — Legal holds preserve content in the Recoverable Items folder, even after user deletion. This folder has a 100 GB quota for held mailboxes (vs 30 GB for standard). Monitor with `Get-MailboxStatistics`.

6. **Case export chain-of-custody** — Document all exports with case ID, reviewer name, export timestamp, item count, and hash values. The export manifest (`CaseContents.csv`) provides SHA-256 hashes for each file.

7. **Teams conversation threading** — Teams conversations are stored as individual messages, not threads. eDiscovery Premium reconstructs threads during analytics. Export raw messages from Standard and use conversation threading in Premium only.

8. **Inactive mailboxes** — When a mailbox is placed on hold and the user is deleted, the mailbox becomes inactive and remains indefinitely. Inactive mailboxes count against Exchange Online storage quotas until the hold is released.

9. **Multi-geo tenants** — In multi-geo tenants, searches must specify the `geoLocations` parameter or use `allTenant` to scan all geographies. Missing a geo means incomplete results.

10. **Partial export failures** — Large exports sometimes fail partially. The export manifest indicates failed items. Re-run the export with a narrower scope or split by date range to recover failed items.
