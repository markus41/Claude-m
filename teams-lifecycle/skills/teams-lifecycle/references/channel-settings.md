# Teams Channel Settings — Graph API Reference

## Overview

This reference covers channel creation (standard/private/shared), channel membership management,
moderation settings, pinned posts, tab provisioning, notifications, and archiving channels
via Microsoft Graph API.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

### Channel Management

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/teams/{teamId}/channels` | `Channel.ReadBasic.All` | `$select`, `$filter` | List all channels |
| GET | `/teams/{teamId}/channels/{channelId}` | `Channel.ReadBasic.All` | `$select` | Get channel details |
| POST | `/teams/{teamId}/channels` | `Channel.Create` | `displayName`, `membershipType` | Create channel |
| PATCH | `/teams/{teamId}/channels/{channelId}` | `ChannelSettings.ReadWrite.All` | Channel fields | Update channel settings |
| DELETE | `/teams/{teamId}/channels/{channelId}` | `Channel.Delete.All` | — | Delete channel |
| GET | `/teams/{teamId}/primaryChannel` | `Channel.ReadBasic.All` | — | Get General channel |

### Channel Membership (Private/Shared Channels)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/teams/{teamId}/channels/{channelId}/members` | `ChannelMember.Read.All` | — | List channel members |
| POST | `/teams/{teamId}/channels/{channelId}/members` | `ChannelMember.ReadWrite.All` | Member body | Add member to channel |
| PATCH | `/teams/{teamId}/channels/{channelId}/members/{membershipId}` | `ChannelMember.ReadWrite.All` | `roles` | Update member role |
| DELETE | `/teams/{teamId}/channels/{channelId}/members/{membershipId}` | `ChannelMember.ReadWrite.All` | — | Remove member |

### Tabs

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/teams/{teamId}/channels/{channelId}/tabs` | `TeamsTab.Read.All` | — | List channel tabs |
| POST | `/teams/{teamId}/channels/{channelId}/tabs` | `TeamsTab.ReadWrite.All` | Tab body | Add a tab |
| PATCH | `/teams/{teamId}/channels/{channelId}/tabs/{tabId}` | `TeamsTab.ReadWrite.All` | Tab fields | Update tab |
| DELETE | `/teams/{teamId}/channels/{channelId}/tabs/{tabId}` | `TeamsTab.ReadWrite.All` | — | Remove tab |

### Messages (Pinned Posts)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/teams/{teamId}/channels/{channelId}/messages` | `ChannelMessage.Send` | Message body | Post a message |
| GET | `/teams/{teamId}/channels/{channelId}/messages` | `ChannelMessage.Read.All` | `$top` | List channel messages |
| POST | `/teams/{teamId}/channels/{channelId}/messages/{messageId}/pin` | `ChannelMessage.Send` | — | Pin a message |

---

## Channel Types

| `membershipType` | Description | Who Can Create | Visibility |
|-----------------|-------------|----------------|------------|
| `standard` | Visible to all team members | Team members (if allowed) | All team members |
| `private` | Invite-only within the team | Team owners/members | Invited members only |
| `shared` | Cross-team shared channel | Team owners | Multiple teams |
| `unknownFutureValue` | Placeholder | N/A | N/A |

---

## Code Snippets

### TypeScript — Create Standard and Private Channels

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function createStandardChannel(
  client: Client,
  teamId: string,
  displayName: string,
  description: string,
  isFavoriteByDefault = false
): Promise<string> {
  const channel = await client
    .api(`/teams/${teamId}/channels`)
    .post({
      displayName,
      description,
      membershipType: "standard",
      isFavoriteByDefault,
    });

  console.log(`Standard channel created: ${channel.id} — "${channel.displayName}"`);
  return channel.id;
}

async function createPrivateChannel(
  client: Client,
  teamId: string,
  displayName: string,
  description: string,
  initialOwnerIds: string[]
): Promise<string> {
  const members = initialOwnerIds.map((userId) => ({
    "@odata.type": "#microsoft.graph.aadUserConversationMember",
    roles: ["owner"],
    "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${userId}')`,
  }));

  const channel = await client
    .api(`/teams/${teamId}/channels`)
    .post({
      displayName,
      description,
      membershipType: "private",
      members,
    });

  console.log(`Private channel created: ${channel.id} — "${channel.displayName}"`);
  return channel.id;
}
```

### TypeScript — Add Members to a Private Channel

```typescript
async function addPrivateChannelMembers(
  client: Client,
  teamId: string,
  channelId: string,
  userIds: string[],
  role: "member" | "owner" = "member"
): Promise<void> {
  for (const userId of userIds) {
    await client
      .api(`/teams/${teamId}/channels/${channelId}/members`)
      .post({
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: role === "owner" ? ["owner"] : [],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${userId}')`,
      });
    console.log(`Added ${role} ${userId} to private channel ${channelId}`);
  }
}
```

### TypeScript — Update Channel Settings (Description, Moderation)

```typescript
async function updateChannelSettings(
  client: Client,
  teamId: string,
  channelId: string,
  settings: {
    displayName?: string;
    description?: string;
    moderationSettings?: {
      userNewMessageRestriction?: "everyone" | "everyoneExceptGuests" | "moderators";
      replyRestriction?: "everyone" | "authorAndModerators";
      allowNewMessageFromBots?: boolean;
      allowNewMessageFromConnectors?: boolean;
    };
  }
): Promise<void> {
  const patch: Record<string, unknown> = {};

  if (settings.displayName) patch.displayName = settings.displayName;
  if (settings.description !== undefined) patch.description = settings.description;
  if (settings.moderationSettings) patch.moderationSettings = settings.moderationSettings;

  await client
    .api(`/teams/${teamId}/channels/${channelId}`)
    .patch(patch);

  console.log(`Channel ${channelId} settings updated`);
}

// Example: Lock channel to moderators only
await updateChannelSettings(client, teamId, channelId, {
  moderationSettings: {
    userNewMessageRestriction: "moderators",
    replyRestriction: "everyone",
    allowNewMessageFromBots: false,
    allowNewMessageFromConnectors: false,
  },
});
```

### TypeScript — Post a Welcome Message to Channel

```typescript
async function postChannelMessage(
  client: Client,
  teamId: string,
  channelId: string,
  message: string,
  isHtml = false
): Promise<string> {
  const result = await client
    .api(`/teams/${teamId}/channels/${channelId}/messages`)
    .post({
      body: {
        contentType: isHtml ? "html" : "text",
        content: message,
      },
    });

  console.log(`Message posted: ${result.id}`);
  return result.id;
}

// Example: Welcome message with HTML formatting
await postChannelMessage(
  client,
  teamId,
  channelId,
  `<b>Welcome to the ${channelName} channel!</b><br/><br/>` +
  `This channel is for all discussions related to <b>Project X</b>.<br/>` +
  `See pinned resources for getting-started links.`,
  true
);
```

### TypeScript — Add a SharePoint Tab to Channel

```typescript
const SHAREPOINT_PAGES_TAB_APP_ID = "2a527703-1f6f-4559-a332-d8a7d288cd88"; // SharePoint page tab app ID

async function addSharePointPageTab(
  client: Client,
  teamId: string,
  channelId: string,
  tabName: string,
  sharePointPageUrl: string
): Promise<void> {
  await client
    .api(`/teams/${teamId}/channels/${channelId}/tabs`)
    .post({
      displayName: tabName,
      "teamsApp@odata.bind": `https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/${SHAREPOINT_PAGES_TAB_APP_ID}`,
      configuration: {
        entityId: null,
        contentUrl: sharePointPageUrl,
        websiteUrl: sharePointPageUrl,
        removeUrl: null,
      },
    });

  console.log(`SharePoint tab "${tabName}" added to channel`);
}
```

### TypeScript — Add Website Tab to Channel

```typescript
const WEBSITE_TAB_APP_ID = "com.microsoft.teamspace.tab.web"; // Website tab ID

async function addWebsiteTab(
  client: Client,
  teamId: string,
  channelId: string,
  tabName: string,
  url: string
): Promise<void> {
  await client
    .api(`/teams/${teamId}/channels/${channelId}/tabs`)
    .post({
      displayName: tabName,
      "teamsApp@odata.bind": `https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/${WEBSITE_TAB_APP_ID}`,
      configuration: {
        entityId: url,
        contentUrl: url,
        websiteUrl: url,
        removeUrl: null,
      },
    });
}
```

### TypeScript — Archive and Delete a Channel

```typescript
// Note: There is no "archive channel" API — channels are deleted or have messages hidden
// Teams UI "archived" channels are actually just channels in archived teams

async function deleteChannel(
  client: Client,
  teamId: string,
  channelId: string
): Promise<void> {
  // Cannot delete the General (primary) channel
  const channel = await client
    .api(`/teams/${teamId}/channels/${channelId}`)
    .select("id,isArchived")
    .get();

  // Check it's not the primary channel
  const primaryChannel = await client
    .api(`/teams/${teamId}/primaryChannel`)
    .select("id")
    .get();

  if (channelId === primaryChannel.id) {
    throw new Error("Cannot delete the General (primary) channel");
  }

  await client
    .api(`/teams/${teamId}/channels/${channelId}`)
    .delete();

  console.log(`Channel ${channelId} deleted`);
}
```

### TypeScript — Provision Standard Project Channels

```typescript
interface ChannelSpec {
  displayName: string;
  description: string;
  isFavoriteByDefault?: boolean;
}

async function provisionProjectChannels(
  client: Client,
  teamId: string,
  channels: ChannelSpec[]
): Promise<Record<string, string>> {
  const channelIds: Record<string, string> = {};

  for (const spec of channels) {
    const channelId = await createStandardChannel(
      client,
      teamId,
      spec.displayName,
      spec.description,
      spec.isFavoriteByDefault ?? false
    );
    channelIds[spec.displayName] = channelId;
  }

  return channelIds;
}

// Standard project channel set
await provisionProjectChannels(client, teamId, [
  { displayName: "Planning", description: "Project planning and milestone tracking", isFavoriteByDefault: true },
  { displayName: "Engineering", description: "Technical design and development" },
  { displayName: "QA & Testing", description: "Test plans, bug reports, release sign-off" },
  { displayName: "Design", description: "UX/UI design assets and reviews" },
  { displayName: "Stakeholder Updates", description: "Announcements and status updates for stakeholders" },
]);
```

### PowerShell — Channel Management

```powershell
Connect-MgGraph -Scopes "Channel.Create", "ChannelSettings.ReadWrite.All", "TeamsTab.ReadWrite.All"

$teamId = "YOUR_TEAM_ID"

# Create a standard channel
$channelBody = @{
    displayName = "Q2 Campaign"
    description = "All materials and discussions for the Q2 campaign"
    membershipType = "standard"
    isFavoriteByDefault = $true
} | ConvertTo-Json

$channel = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/teams/$teamId/channels" `
    -Body $channelBody -ContentType "application/json"

Write-Host "Channel created: $($channel.id)"

# List all channels
$channels = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/teams/$teamId/channels?`$select=id,displayName,membershipType,isArchived"
$channels.value | Format-Table id, displayName, membershipType

# Update channel description
$updateBody = @{ description = "Updated description for the channel" } | ConvertTo-Json
Invoke-MgGraphRequest -Method PATCH `
    -Uri "https://graph.microsoft.com/v1.0/teams/$teamId/channels/$($channel.id)" `
    -Body $updateBody -ContentType "application/json"

# Add a tab
$tabBody = @{
    displayName = "Project Dashboard"
    "teamsApp@odata.bind" = "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/com.microsoft.teamspace.tab.web"
    configuration = @{
        entityId = "https://contoso.sharepoint.com/sites/projects/dashboard.aspx"
        contentUrl = "https://contoso.sharepoint.com/sites/projects/dashboard.aspx"
        websiteUrl = "https://contoso.sharepoint.com/sites/projects/dashboard.aspx"
    }
} | ConvertTo-Json -Depth 5

Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/teams/$teamId/channels/$($channel.id)/tabs" `
    -Body $tabBody -ContentType "application/json"
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Invalid channel name or membership type | Channel names: max 50 chars, no special chars `# % & * { } / \ : < > ?` |
| 400 memberTypeDoesNotMatch | Wrong member type for channel type | Private channels require members added at channel creation |
| 403 Forbidden | Insufficient permissions for channel type | `Channel.Create` for standard; additional for private |
| 404 NotFound | Team or channel ID not found | Verify IDs; team may be archived |
| 409 Conflict | Channel name already exists in team | Use a unique channel display name |
| 423 Locked | Team is archived | Unarchive team before creating channels |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` |
| channelNotFound | Channel does not exist | Verify channel ID; channel may have been deleted |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Channels per team | 200 standard + 30 private channels | Keep to ~20 channels for usability |
| Channel creation | ~6 per minute per team | Queue channel creation; brief delay between creates |
| Tab creation | ~10 per minute per channel | Sequential tab addition |
| Message posting | ~30 per minute per channel | Queue messages; use announcements sparingly |
| Private channel members | Up to 250 members per private channel | For larger audiences, use standard channels |

---

## Common Patterns and Gotchas

### 1. The General Channel Cannot Be Deleted or Renamed via API

The primary (General) channel is created automatically when a team is created and cannot be
deleted via the API. Attempts to DELETE it return a 400 error. It can be renamed in the Teams
UI but not via the channel PATCH endpoint.

### 2. Private Channels Require Owners at Creation Time

You MUST include at least one owner in the `members` array when creating a private channel.
You cannot create a private channel without owners and add them later. If no owner is provided,
the API returns a 400 BadRequest.

### 3. Tab App IDs Must Be Verified for Each Environment

Known tab app IDs (`com.microsoft.teamspace.tab.web`, etc.) may differ between commercial,
GCC, and GCC-High environments. Always verify tab app IDs by calling `GET /appCatalogs/teamsApps`
and filtering by `displayName` for production deployments.

### 4. Pinning Messages Requires the Message to Exist First

To pin a message, you must first POST the message to get its ID, then call the `/pin` action.
There is no way to create a pre-pinned message in a single API call.

### 5. `isFavoriteByDefault` Applies Only at Channel Creation

The `isFavoriteByDefault` flag makes the channel auto-added to the favorites list for all
current and future team members. This setting can only be set at creation time via the Graph
API — updating it via PATCH is not supported.

### 6. Shared Channels Have Different Membership Management

For shared channels (`membershipType: "shared"`), membership is managed at the shared channel
level, not the team level. Members from external teams are added via the channel membership
endpoint and require the external user's tenant to allow cross-tenant access.
