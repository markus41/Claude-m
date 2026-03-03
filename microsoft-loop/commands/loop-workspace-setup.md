---
name: loop-workspace-setup
description: Set up a Microsoft Loop workspace for a project — create the workspace via Graph API, configure members, design the initial page structure, and create a pinned Teams tab.
argument-hint: "<project-name> [--team <team-name>] [--members <user-list>] [--template <project|meeting|brainstorm>] [--pin-teams-channel <channel-id>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Loop Workspace Setup

## Purpose
Create and configure a production-ready Loop workspace for a project: workspace creation
via Graph API, member access, initial page structure, and Teams tab pinning.
Uses `references/workspaces-pages.md` and `references/graph-api.md`.

## Required Inputs
- Project name (becomes workspace display name)
- Team or group of members to add (names or UPNs)
- Optional: initial page template (`project`, `meeting`, `brainstorm`)
- Optional: Teams channel ID to pin workspace as a tab
- Optional: existing Loop workspace ID to configure (skip creation)

## Steps

### 1. Gather Configuration
Collect:
- Workspace display name (e.g., "Q2 Product Launch")
- Workspace description (1-2 sentences, project purpose)
- Member list: owner (creator), writers, readers
- Initial pages to create: kickoff, planning, decisions, retrospective
- Whether to pin to a Teams channel (channel ID needed)

### 2. Authenticate and Get Container Type ID

```typescript
import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from
  "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

const credential = new ClientSecretCredential(
  process.env.TENANT_ID!,
  process.env.CLIENT_ID!,
  process.env.CLIENT_SECRET!
);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"]
});
const graphClient = Client.initWithMiddleware({ authProvider });

// Get Loop container type ID
const types = await graphClient.api('/storage/fileStorage/containerTypes').get();
const loopContainerTypeId = types.value.find(
  (t: any) => t.ownerAppId === 'a187e399-0c36-4b98-8f04-1efc167a35d6'
)?.id;
```

### 3. Create the Workspace

```typescript
const workspace = await graphClient
  .api('/storage/fileStorage/containers')
  .post({
    displayName: projectName,
    description: projectDescription,
    containerTypeId: loopContainerTypeId
  });

console.log(`Workspace created: ${workspace.webUrl}`);
console.log(`Container ID: ${workspace.id}`);
```

### 4. Add Members

For each member:
```typescript
// owner role for project leads, writer for contributors, reader for stakeholders
await graphClient
  .api(`/storage/fileStorage/containers/${workspace.id}/permissions`)
  .post({
    roles: ['writer'],
    grantedToV2: { user: { id: userId } }
  });
```

### 5. Create Initial Page Structure

Describe the recommended initial pages for the project:
- `Kickoff.loop` — project charter, goals, team contacts
- `Planning.loop` — roadmap table, milestone tracker, task assignments
- `Decisions.loop` — decision log (Q&A component) with date, owner, outcome
- `Meeting Notes.loop` — recurring meeting notes (standup, review, retro)

Via Graph API (creates file metadata — Fluid document initializes on first open):
```typescript
const drive = await graphClient
  .api(`/storage/fileStorage/containers/${workspace.id}/drive`)
  .get();

for (const pageName of ['Kickoff.loop', 'Planning.loop', 'Decisions.loop', 'Meeting Notes.loop']) {
  await graphClient
    .api(`/drives/${drive.id}/root/children`)
    .post({ name: pageName, file: {}, "@microsoft.graph.conflictBehavior": "rename" });
}
```

### 6. Pin to Teams Channel (Optional)

```typescript
await graphClient
  .api(`/teams/${teamId}/channels/${channelId}/tabs`)
  .post({
    displayName: projectName,
    "teamsApp@odata.bind":
      "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/0d820ecd-def2-4297-adad-78056cde7c78",
    configuration: {
      entityId: workspace.id,
      contentUrl: workspace.webUrl,
      websiteUrl: workspace.webUrl
    }
  });
```

### 7. Output

Deliver a setup summary with:
- Workspace name, ID, and direct URL
- Member list with roles
- Initial pages created (with direct links)
- Teams tab link (if configured)
- Next steps: open each page in Loop app to initialize content, share workspace URL with team

```markdown
## Loop Workspace Setup — {projectName}

**Workspace URL:** {webUrl}
**Container ID:** {id}
**Created:** {timestamp}

### Members
| Name | Email | Role |
|---|---|---|
| {name} | {email} | Owner |
| {name} | {email} | Writer |

### Initial Pages
| Page | URL |
|---|---|
| Kickoff | {url} |
| Planning | {url} |
| Decisions | {url} |
| Meeting Notes | {url} |

### Next Steps
1. Open each page in Loop app to initialize content
2. Share workspace URL with team: {webUrl}
3. Teams tab pinned to #{channelName} (if configured)
4. Apply sensitivity label if required (Purview → Information Protection)
```

## Quality Checks
- Workspace created with meaningful name and description
- All team members added before sharing workspace URL
- Initial pages created to reduce "blank canvas" friction for new team
- Teams tab configured if team uses Teams as primary surface
- Container ID stored for future automation (environment variable or config file)
