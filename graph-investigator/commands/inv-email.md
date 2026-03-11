---
name: inv-email
description: Search Exchange mailbox messages — by sender, recipient, subject, date range, or keywords
argument-hint: "<upn> [--from <address>] [--to <address>] [--subject <text>] [--days <number>] [--keyword <text>] [--has-attachments] [--folder <inbox|sent|all>] [--top <number>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — Email Search

Searches a user's Exchange Online mailbox using OData filters and Graph API message search. Supports filtering by sender, recipient, subject, date range, keywords, and attachments. Flags suspicious patterns such as external recipients with attachments.

## Arguments

| Argument | Description |
|---|---|
| `<upn>` | **Required.** User Principal Name of the mailbox to search |
| `--from <address>` | Filter messages from this sender address |
| `--to <address>` | Filter messages sent to this recipient address |
| `--subject <text>` | Filter messages containing this text in the subject |
| `--days <number>` | Search messages from the last N days (default: 30) |
| `--keyword <text>` | Full-text keyword search across subject and body |
| `--has-attachments` | Only return messages with attachments |
| `--folder <inbox\|sent\|all>` | Restrict to a specific folder (default: `all`) |
| `--top <number>` | Maximum results to return (default: 50, max: 1000) |

## Integration Context Check

Required scopes:
- `Mail.Read` — read messages from any user's mailbox (application permission) or `Mail.Read` delegated for own mailbox
- `User.Read.All` — resolve UPN to object ID

If the `Mail.Read` scope probe from `inv-setup` failed, this command cannot proceed. Ensure the service principal or delegated account has the `Mail.Read` application permission consented at the tenant level.

## Step 1: Build OData Filter

Construct the `$filter` expression by combining all provided arguments with `and`. Do not include a filter clause for arguments not provided.

| Argument | OData clause |
|---|---|
| `--from user@domain.com` | `from/emailAddress/address eq 'user@domain.com'` |
| `--to user@domain.com` | `toRecipients/any(r:r/emailAddress/address eq 'user@domain.com')` |
| `--subject "invoice"` | `contains(subject,'invoice')` |
| `--days 14` | `receivedDateTime ge 2024-01-01T00:00:00Z` (compute the ISO 8601 date) |
| `--has-attachments` | `hasAttachments eq true` |

When `--keyword` is supplied, use `$search` instead of `$filter` — these two parameters cannot be combined in the same request.

## Step 2: Search Messages

```bash
UPN="<upn>"
FILTER="<constructed-filter>"
TOP=50
FOLDER_PATH="messages"  # or mailFolders/inbox/messages or mailFolders/sentitems/messages

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/${FOLDER_PATH}?\$filter=${FILTER}&\$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,hasAttachments,importance,internetMessageId,conversationId,bodyPreview,isDraft,isRead&\$top=${TOP}&\$orderby=receivedDateTime desc" \
  --headers "ConsistencyLevel=eventual" \
  --output json
```

Paginate using `@odata.nextLink` until the desired result count is reached or there are no more pages.

## Step 3: Keyword Search (--keyword)

When `--keyword` is specified, use `$search` syntax instead of `$filter`:

```bash
KEYWORD="<keyword>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/messages?\$search=\"'${KEYWORD}'\"&\$select=id,subject,from,toRecipients,receivedDateTime,hasAttachments,bodyPreview&\$top=${TOP}" \
  --headers "ConsistencyLevel=eventual" \
  --output json
```

Note: `$search` uses KQL syntax. The `ConsistencyLevel: eventual` header is required for search queries.

## Step 4: Attachment Analysis

For every message where `hasAttachments eq true`, fetch the attachment list to record file names, sizes, and MIME types:

```bash
MSG_ID="<message-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/messages/${MSG_ID}/attachments?\$select=id,name,size,contentType,isInline,lastModifiedDateTime" \
  --output json
```

Flag suspicious attachment types: `.exe`, `.bat`, `.ps1`, `.vbs`, `.lnk`, `.iso`, `.zip` (especially password-protected), `.xlsm`, `.docm`.

Flag large attachments over 10 MB as potential data exfiltration indicators when combined with external recipients.

## Step 5: Folder-Specific Search

Adjust the base path depending on `--folder`:

| Flag value | API path |
|---|---|
| `inbox` | `/users/{upn}/mailFolders/inbox/messages` |
| `sent` | `/users/{upn}/mailFolders/sentitems/messages` |
| `all` (default) | `/users/{upn}/messages` |

To discover other folder IDs (e.g. Deleted Items, custom folders):

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/mailFolders?\$select=id,displayName,totalItemCount,unreadItemCount" \
  --output json
```

## Step 6: Suspicious Pattern Detection

After collecting results, scan for the following patterns and surface them as flagged items:

| Pattern | Indicator | Severity |
|---|---|---|
| External recipient + attachment | Possible data exfiltration | 🔴 HIGH |
| BCC external domain | Covert copy to external | 🔴 HIGH |
| Attachment with executable MIME type | Malware delivery | 🔴 HIGH |
| Large attachment (>10 MB) to external | Bulk exfiltration | 🟡 MEDIUM |
| Many recipients + attachment | Phishing send | 🟡 MEDIUM |
| Reply-To domain differs from From domain | Phishing lure | 🟡 MEDIUM |
| High frequency from single external sender | Account compromise or spam | 🟢 LOW |

## Output Format

```markdown
## Email Search Results — jsmith@contoso.com

**Filter**: from=external@domain.com | Last 30 days | Has Attachments
**Results**: 7 messages (3 flagged)

| Date | Subject | From | To | Attachments | Preview |
|---|---|---|---|---|---|
| 2024-01-15 14:22 | Urgent: Invoice #1234 | billing@external.com | jsmith@contoso.com | invoice.pdf (2.1 MB) | Please find attached... |
| 2024-01-14 09:05 | Re: Contract | legal@external.com | jsmith@contoso.com | contract_final.docx (890 KB) | As discussed... |

### Flagged Items (3)

🔴 **2024-01-15 14:22** — `invoice.pdf` sent to external recipient `personal@gmail.com` (Cc). External recipient + attachment.
🔴 **2024-01-13 17:41** — `report.xlsm` (macro-enabled workbook) received from `unknown@suspicious.com`. Executable macro attachment.
🟡 **2024-01-12 08:19** — 18.4 MB archive sent to `external@partner.com`. Large attachment to external recipient.

### Summary
- Total messages found: 7
- Messages with attachments: 5
- External recipients detected: 3
- Flagged items: 3 (2 HIGH, 1 MEDIUM)
```

If `--format json` is not specified (default markdown), emit the table and flagged items section as shown above.
