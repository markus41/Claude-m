---
name: inv-teams
description: Teams chat and meeting activity investigation — chats, channel activity, meeting participation, call records
argument-hint: "<upn> [--days <number>] [--include-messages] [--include-calls] [--format <markdown|json>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — Teams Activity

Investigates Microsoft Teams activity for a user: chat memberships, joined teams, meeting participation, message activity via audit logs, call records, and external contact analysis. Surfaces anomalous patterns such as unusual external contacts, high-volume messaging, or off-hours meeting activity.

## Arguments

| Argument | Description |
|---|---|
| `<upn>` | **Required.** User Principal Name to investigate |
| `--days <number>` | Number of days of Teams activity to analyze (default: 30) |
| `--include-messages` | Include channel and chat message content (requires ChannelMessage.Read.All and Chat.Read.All — typically restricted) |
| `--include-calls` | Include call records from the Communications API |
| `--format <markdown\|json>` | Output format — defaults to `markdown` |

## Integration Context Check

Required scopes:
- `Team.ReadBasic.All` — list teams the user has joined
- `Chat.Read.All` — list chats (1:1, group, meeting chats)
- `User.Read.All` — resolve UPN to object ID and enrich participant data

Optional scopes:
- `ChannelMessage.Read.All` — required for `--include-messages` (message content); this permission requires explicit admin approval in most tenants
- `CallRecords.Read.All` — required for `--include-calls`
- `AuditLog.Read.All` — Teams activity via unified audit log (PowerShell path)

Note: `Chat.Read.All` and `ChannelMessage.Read.All` are highly sensitive permissions. Many tenants restrict these even for security teams. If denied, the PowerShell UAL path (Step 4) provides aggregated activity without message content.

## Step 1: Resolve User Object ID

```bash
UPN="<upn>"

USER_ID=$(az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}?\$select=id,displayName" \
  --output json | jq -r '.id')
```

## Step 2: List User's Chats

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}/chats?\$select=id,chatType,topic,createdDateTime,lastUpdatedDateTime,tenantId&\$expand=members(\$select=displayName,email,userId,tenantId)&\$top=50&\$orderby=lastUpdatedDateTime desc" \
  --output json
```

From each chat, extract:
- `chatType` — `oneOnOne`, `group`, `meeting`, `unknownFutureValue`
- `members` — all participants including display name, email, and `tenantId`
- `tenantId` on members — if different from the organization's tenant ID, this is an external Teams user (Teams Connect / B2B)

Flag chats where:
- Any member has a `tenantId` different from the organization's tenant (external federated Teams user)
- Any member email is not from a known internal domain
- Group chats with more than 10 external participants

Paginate using `@odata.nextLink` until all chats are retrieved.

## Step 3: Joined Teams

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}/joinedTeams?\$select=id,displayName,description,membershipType,createdDateTime,externalGroupId,isArchived&\$top=100" \
  --output json
```

For each team, optionally fetch membership to understand size and external member presence:

```bash
TEAM_ID="<team-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/teams/${TEAM_ID}/members?\$select=displayName,email,roles&\$top=100" \
  --output json
```

Flag teams where:
- `externalGroupId` is set — team is connected to an external Microsoft 365 group
- Team name suggests external focus: `*partner*`, `*vendor*`, `*client*`, `*external*`
- User has `owner` role in teams where they were recently made owner (check join date vs role date)

## Step 4: Message Activity via PowerShell UAL

For aggregate Teams activity without message content, use the unified audit log:

```powershell
# Connect to Exchange Online:
# Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

$startDate = (Get-Date).AddDays(-30).ToString("MM/dd/yyyy")
$endDate = (Get-Date).ToString("MM/dd/yyyy")

$teamsEvents = Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -UserIds "<upn>" `
  -RecordType MicrosoftTeams,MicrosoftTeamsAdmin `
  -Operations "MessageSent","ChatCreated","MeetingAttended","MeetingCreated","MessageDeleted","MessageUpdated","AppInstalled","BotAddedToPersonalScope","TeamCreated","MemberAdded","MemberRemoved","ChannelAdded","TabAdded" `
  -ResultSize 5000

$teamsEvents | ConvertTo-Json | Out-File "teams-audit.json"
```

Aggregate by operation to compute weekly message counts, meeting frequency, and application additions.

## Step 5: Message Content Investigation (--include-messages)

Only run if `--include-messages` is explicitly specified and `ChannelMessage.Read.All` is confirmed available.

For 1:1 chats, retrieve recent messages:

```bash
CHAT_ID="<chat-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/chats/${CHAT_ID}/messages?\$select=id,createdDateTime,from,body,attachments,mentions,deletedDateTime&\$top=50&\$orderby=createdDateTime desc" \
  --output json
```

For channel messages:

```bash
TEAM_ID="<team-id>"
CHANNEL_ID="<channel-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/teams/${TEAM_ID}/channels/${CHANNEL_ID}/messages?\$select=id,createdDateTime,from,body,attachments,mentions,deletedDateTime&\$top=50&\$orderby=createdDateTime desc" \
  --output json
```

Flag messages with:
- External file links (OneDrive/SharePoint URLs from different tenants)
- Attachments from external drives
- Deleted messages (soft-deleted in investigation window — `deletedDateTime` is set)
- References to sensitive keywords in message body (only surface count, not full content, to respect privacy)

## Step 6: Call Records (--include-calls)

Only run if `--include-calls` is specified and `CallRecords.Read.All` is confirmed available.

```bash
START_DATE="<ISO-8601-date>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/communications/callRecords?\$filter=startDateTime ge ${START_DATE}&\$select=id,type,startDateTime,endDateTime,joinWebUrl,participants&\$top=100" \
  --output json
```

Note: The Communications API returns all call records for the tenant, not filtered by user. Filter client-side by checking `participants` for the user's object ID. This may require paginating through a large result set.

Alternatively, use the UAL:

```powershell
Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -UserIds "<upn>" `
  -RecordType MicrosoftTeams `
  -Operations "MeetingAttended","CallStarted","CallEnded" `
  -ResultSize 5000
```

From call records, surface: call duration, participant count, external participants (different tenant), and time of day.

## Step 7: External Contact and Anomaly Analysis

Compile a list of all external contacts the user communicated with across:
- Chat members from external tenants (Step 2)
- External team members (Step 3)
- External call participants (Step 6)

Deduplicate by email address and count interaction frequency.

Flag:
- External contacts from competitor domains (cross-reference with a known competitor list if provided)
- First-time external contacts in the last 7 days
- High-frequency communication with a single external contact (>20 interactions in investigation window)
- External contacts from geographically unusual regions for this user's role

Summarize weekly message activity to show spikes:

```
Weekly Message Activity (sent by jsmith@contoso.com)
Week of Jan 08: ████████░░░░ 45 messages
Week of Jan 15: ████░░░░░░░░ 21 messages
```

## Output Format

```markdown
## Teams Activity — jsmith@contoso.com

**Period**: Last 30 days | **Sources**: Chats, Joined Teams, UAL | **Total Events**: 312

### Teams Membership (8 teams)
| Team Name | Role | Created | Members | External | Archived |
|---|---|---|---|---|---|
| Engineering | Member | 2023-01-15 | 42 | 0 | No |
| Vendor-Contoso-NDA | Member | 2024-01-10 | 8 | 4 | No |
| Executive Leadership | Guest | 2023-06-01 | 12 | 0 | No |

⚠️ User is a guest in "Executive Leadership" team — verify if appropriate for their role.
⚠️ "Vendor-Contoso-NDA" team has 4 external members.

### Chat Summary (23 chats)
| Type | Count | With External | External Domains |
|---|---|---|---|
| 1:1 | 15 | 2 | gmail.com, vendor.com |
| Group | 6 | 1 | partner.com |
| Meeting | 2 | 0 | — |

### External Contacts (3 unique)
| Contact | Domain | Interactions | First Contact | Last Contact | Flag |
|---|---|---|---|---|---|
| alice@gmail.com | gmail.com | 47 | 2024-01-10 | 2024-01-15 | 🔴 High frequency, personal email |
| bob@vendor.com | vendor.com | 12 | 2023-08-15 | 2024-01-14 | 🟢 Known vendor |
| unknown@partner.com | partner.com | 3 | 2024-01-12 | 2024-01-13 | 🟡 New contact |

🔴 **alice@gmail.com**: 47 interactions with a Gmail address over 5 days. Personal email communication should be reviewed.

### Activity Summary
| Operation | Count | Week 1 | Week 2 | Week 3 | Week 4 |
|---|---|---|---|---|---|
| Messages Sent | 312 | 80 | 90 | 75 | 67 |
| Meetings Attended | 28 | 7 | 8 | 6 | 7 |
| Apps Installed | 2 | 0 | 2 | 0 | 0 |

⚠️ 2 apps installed in Week 2: "Unknown Bot" and "FileSync for Teams" — verify legitimacy.

### Call Records Summary (if --include-calls)
| Date | Duration | Participants | External | Type |
|---|---|---|---|---|
| 2024-01-15 14:00 | 47 min | 4 | 1 (alice@gmail.com) | Meeting |
```

If `--format json` is specified, emit a single JSON object with keys: `joinedTeams`, `chats`, `externalContacts`, `activitySummary`, `callRecords`.
