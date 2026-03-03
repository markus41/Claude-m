# Teams Templates & Cloning — Graph API Reference

## Overview

This reference covers team template creation (`teamTemplateDefinition`), cloning existing teams,
copying channels/apps/settings/tabs, template management in Teams admin center, and EDU templates
via Microsoft Graph API.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/teamwork/teamTemplates` | `Team.ReadBasic.All` | `$filter`, `$select`, `$top` | List available templates |
| GET | `/teamwork/teamTemplates/{templateId}` | `Team.ReadBasic.All` | — | Get template details |
| GET | `/teamwork/teamTemplates/{templateId}/definitions` | `Team.ReadBasic.All` | — | Get template definitions |
| POST | `/teams` | `Team.Create` | `template@odata.bind`, team body | Create team from template |
| POST | `/teams/{teamId}/clone` | `Team.Create`, `Team.ReadBasic.All` | `displayName`, `partsToClone` | Clone existing team |
| GET | `/teams/{teamId}` | `Team.ReadBasic.All` | `$select` | Get team (poll async operation) |

### Built-in Template IDs

| Template ID | Display Name | Use Case |
|-------------|-------------|----------|
| `standard` | Standard team | General purpose; default channels |
| `educationClass` | Class | Assignments, OneNote class notebook |
| `educationStaff` | Staff | School staff collaboration |
| `educationProfessionalLearningCommunity` | PLC | Educator professional communities |
| `healthcareWard` | Ward | Clinical team collaboration |
| `healthcareHospital` | Hospital | Hospital-wide teams |
| `retailStore` | Retail Store | Frontline worker store teams |
| `retailManagerCollaboration` | Retail Manager | Manager district collaboration |
| `retailerCommunications` | Retail Communications | Retailer broadcasts |
| `smallBusinessOwner` | Manage a Project | Small business project teams |

---

## Code Snippets

### TypeScript — Create Team from Standard Template

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function createTeamFromTemplate(
  client: Client,
  displayName: string,
  description: string,
  ownerId: string,
  templateId = "standard",
  visibility: "private" | "public" | "hiddenMembership" = "private"
): Promise<string> {
  // Teams creation is async — returns 202 Accepted
  const response = await client
    .api("/teams")
    .responseType("raw")
    .post({
      "template@odata.bind": `https://graph.microsoft.com/v1.0/teamsTemplates('${templateId}')`,
      displayName,
      description,
      visibility,
      members: [
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${ownerId}')`,
        },
      ],
    });

  const operationUrl = response.headers.get("Location");
  if (!operationUrl) throw new Error("No Location header in team creation response");

  console.log(`Team creation started. Polling: ${operationUrl}`);
  return operationUrl;
}

async function pollTeamCreation(
  client: Client,
  operationUrl: string,
  pollIntervalMs = 3000,
  maxAttempts = 20
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const operation = await client.api(operationUrl).get();
    console.log(`Team creation status: ${operation.status}`);

    if (operation.status === "succeeded") {
      // Extract team ID from the targetResourceId
      return operation.targetResourceId as string;
    } else if (operation.status === "failed") {
      throw new Error(`Team creation failed: ${JSON.stringify(operation.error)}`);
    }
  }

  throw new Error("Team creation timed out");
}
```

### TypeScript — Clone a Team

```typescript
type ClonePart = "apps" | "tabs" | "settings" | "channels" | "members";

async function cloneTeam(
  client: Client,
  sourceTeamId: string,
  newDisplayName: string,
  newDescription: string,
  partsToClone: ClonePart[] = ["apps", "tabs", "settings", "channels"],
  visibility: "private" | "public" = "private"
): Promise<string> {
  const response = await client
    .api(`/teams/${sourceTeamId}/clone`)
    .responseType("raw")
    .post({
      displayName: newDisplayName,
      description: newDescription,
      visibility,
      partsToClone: partsToClone.join(","),
    });

  const operationUrl = response.headers.get("Location");
  if (!operationUrl) throw new Error("No Location header in clone response");

  return await pollTeamCreation(client, operationUrl);
}
```

### TypeScript — List Available Templates

```typescript
interface TeamTemplate {
  id: string;
  displayName: string;
  description: string;
  channelCount: number;
  appCount: number;
}

async function listTeamTemplates(client: Client): Promise<TeamTemplate[]> {
  const result = await client
    .api("/teamwork/teamTemplates")
    .select("id,displayName,description")
    .get();

  return result.value;
}
```

### TypeScript — Create EDU Class Team

```typescript
async function createClassTeam(
  client: Client,
  className: string,
  description: string,
  teacherId: string,
  visibility: "hiddenmembership" | "private" = "hiddenmembership"
): Promise<string> {
  const operationUrl = await createTeamFromTemplate(
    client,
    className,
    description,
    teacherId,
    "educationClass",
    visibility
  );

  return await pollTeamCreation(client, operationUrl);
}
```

### TypeScript — Full Project Team Setup (Clone + Customize)

```typescript
async function setupProjectTeam(
  client: Client,
  templateTeamId: string,
  projectName: string,
  projectCode: string,
  ownerIds: string[],
  memberIds: string[]
): Promise<string> {
  // 1. Clone the reference team
  const newTeamId = await cloneTeam(
    client,
    templateTeamId,
    `PRJ-${projectCode}-${projectName}`,
    `Project team for ${projectName}`,
    ["apps", "tabs", "settings", "channels"],
    "private"
  );

  console.log(`New team created: ${newTeamId}`);

  // 2. Add additional owners
  for (const ownerId of ownerIds) {
    await client
      .api(`/groups/${newTeamId}/owners/$ref`)
      .post({
        "@odata.id": `https://graph.microsoft.com/v1.0/users/${ownerId}`,
      });
  }

  // 3. Add members
  for (const memberId of memberIds) {
    await client
      .api(`/teams/${newTeamId}/members`)
      .post({
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: [],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${memberId}')`,
      });
  }

  return newTeamId;
}
```

### TypeScript — Get Template Definitions (Channel Structure)

```typescript
async function getTemplateChannelStructure(
  client: Client,
  templateId: string
): Promise<Array<{ displayName: string; description: string }>> {
  const definitions = await client
    .api(`/teamwork/teamTemplates/${templateId}/definitions`)
    .get();

  if (definitions.value.length === 0) return [];

  const firstDef = definitions.value[0];
  return (firstDef.teamDefinition?.channels ?? []).map((c: any) => ({
    displayName: c.displayName,
    description: c.description ?? "",
  }));
}
```

### PowerShell — Template and Clone Operations

```powershell
Connect-MgGraph -Scopes "Team.Create", "Team.ReadBasic.All"

# List available templates
$templates = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/teamwork/teamTemplates?`$select=id,displayName,description"
$templates.value | Format-Table id, displayName

# Create a team from the standard template
$ownerId = "USER_OBJECT_ID"
$teamBody = @{
    "template@odata.bind" = "https://graph.microsoft.com/v1.0/teamsTemplates('standard')"
    displayName = "PRJ-OPS-Q2Campaign-2026"
    description = "Q2 marketing campaign operations"
    visibility = "private"
    members = @(
        @{
            "@odata.type" = "#microsoft.graph.aadUserConversationMember"
            roles = @("owner")
            "user@odata.bind" = "https://graph.microsoft.com/v1.0/users('$ownerId')"
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/teams" `
    -Body $teamBody -ContentType "application/json" `
    -OutputType HttpResponseMessage

$operationUrl = $response.Headers.Location.ToString()
Write-Host "Polling: $operationUrl"

# Poll for completion
$maxAttempts = 20
$attempt = 0
do {
    Start-Sleep -Seconds 3
    $attempt++
    $operation = Invoke-MgGraphRequest -Method GET -Uri $operationUrl
    Write-Host "Status: $($operation.status)"
} while ($operation.status -eq "notStarted" -or $operation.status -eq "running" -and $attempt -lt $maxAttempts)

if ($operation.status -eq "succeeded") {
    Write-Host "Team created: $($operation.targetResourceId)"
} else {
    Write-Host "Team creation failed: $($operation.error | ConvertTo-Json)"
}

# Clone a team
$cloneBody = @{
    displayName = "PRJ-OPS-Q3Campaign-2026"
    description = "Cloned from Q2 campaign team"
    visibility = "private"
    partsToClone = "apps,tabs,settings,channels"
} | ConvertTo-Json

$cloneResponse = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/teams/$($operation.targetResourceId)/clone" `
    -Body $cloneBody -ContentType "application/json" `
    -OutputType HttpResponseMessage

Write-Host "Clone operation URL: $($cloneResponse.Headers.Location)"
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Missing required fields or invalid template ID | Verify `template@odata.bind` URL; check `displayName` is provided |
| 403 Forbidden | Missing `Team.Create` permission | Ensure `Team.Create` or `Group.ReadWrite.All` is granted with admin consent |
| 404 NotFound | Template ID not found | List `/teamwork/teamTemplates` to get valid IDs |
| 409 Conflict | Team with same name or display name conflict | Use unique display names; check for existing teams |
| 429 TooManyRequests | Rate limited | Respect `Retry-After`; team creation is expensive |
| 503 ServiceUnavailable | Teams service temporarily down | Retry; team operations can be slow during provisioning |
| OperationFailed | Async operation failed | Check `error` property in operation response for details |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Team creation | ~20 teams per minute per tenant | Queue team creation; avoid bursts |
| Clone operations | Same as team creation | Sequential cloning recommended |
| Template listing | Standard read limits | Cache template list |
| Async operation poll | Poll every 3-5 seconds; timeout after 60s | Use exponential backoff if consistently slow |

---

## Common Patterns and Gotchas

### 1. Team Creation Is Always Asynchronous

`POST /teams` and `POST /teams/{id}/clone` return `202 Accepted` — never `201 Created`.
The team is not ready to use until the polling URL returns `status: "succeeded"`. Typical
creation time is 10-30 seconds, but can take up to 60 seconds under load.

### 2. Clone Does Not Copy Member Messages or Files

Cloning copies structure (channels, apps, tabs, settings) but NOT chat messages, files, or
SharePoint document library content. Plan for a separate data migration step if historical
content needs to be preserved.

### 3. `partsToClone` Options Must Be Comma-Separated, No Spaces

The `partsToClone` value is a comma-separated string: `"apps,tabs,settings,channels"` — not
an array. Including `"members"` copies the original team's membership list; exclude it if you
want a fresh team without carrying over all members.

### 4. EDU Templates Require Education License

`educationClass` and `educationStaff` templates only work in tenants with Microsoft 365
Education licenses. Using them in commercial tenants returns a 403 error.

### 5. Template Channel Structure Is Fixed After Team Creation

The channels created from a template are standard channels. You cannot create private or shared
channels via the template mechanism — those must be added after team creation with separate
`POST /teams/{id}/channels` calls.

### 6. Custom Templates Are Only Available in Teams Admin Center

Custom team templates (created in the Teams admin center) are listed in the `/teamwork/teamTemplates`
endpoint but require the correct license. They are identified by a different ID format from
built-in templates. Use `GET /teamwork/teamTemplates` and filter by `type ne 'default'`.

### 7. Team Creation Needs at Least One Owner

Every team must have at least one owner. If the creating application is a daemon (app-only context),
you must explicitly add an owner via the `members` array in the creation body. Teams without
owners are immediately flagged as orphaned.
