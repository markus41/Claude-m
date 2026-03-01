# Microsoft Graph Client

Full TypeScript service class for Microsoft Graph using `@microsoft/microsoft-graph-client` with Azure Identity auth.

## Dependencies

```bash
npm install @microsoft/microsoft-graph-client @azure/identity
npm install @microsoft/microsoft-graph-client/authProviders/azureTokenCredentials
```

## Graph Client Setup

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import {
  TokenCredentialAuthenticationProvider
} from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { TokenCredential } from "@azure/identity";

export function buildGraphClient(credential: TokenCredential): Client {
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"]
  });
  return Client.initWithMiddleware({ authProvider });
}
```

## Complete GraphService Class

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import {
  TokenCredentialAuthenticationProvider
} from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { TokenCredential } from "@azure/identity";

export class GraphService {
  private readonly client: Client;

  constructor(credential: TokenCredential) {
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ["https://graph.microsoft.com/.default"]
    });
    this.client = Client.initWithMiddleware({ authProvider });
  }

  // ─── USERS ─────────────────────────────────────────────

  async getUser(userIdOrUpn: string): Promise<GraphUser> {
    return this.client
      .api(`/users/${userIdOrUpn}`)
      .select("id,displayName,mail,userPrincipalName,jobTitle,department")
      .get();
  }

  async listUsers(filter?: string, top?: number): Promise<GraphUser[]> {
    let request = this.client.api("/users").select("id,displayName,mail,userPrincipalName");
    if (filter) request = request.filter(filter);
    if (top) request = request.top(top);
    const result = await request.get();
    return result.value;
  }

  async getUserPhoto(userId: string): Promise<Blob | null> {
    try {
      return await this.client.api(`/users/${userId}/photo/$value`).get();
    } catch {
      return null;
    }
  }

  // ─── GROUPS ────────────────────────────────────────────

  async getGroup(groupId: string): Promise<GraphGroup> {
    return this.client
      .api(`/groups/${groupId}`)
      .select("id,displayName,description,mail,groupTypes")
      .get();
  }

  async listGroupMembers(groupId: string): Promise<GraphUser[]> {
    const result = await this.client
      .api(`/groups/${groupId}/members`)
      .select("id,displayName,mail,userPrincipalName")
      .get();
    return result.value;
  }

  async addGroupMember(groupId: string, userId: string): Promise<void> {
    await this.client.api(`/groups/${groupId}/members/$ref`).post({
      "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
    });
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await this.client.api(`/groups/${groupId}/members/${userId}/$ref`).delete();
  }

  // ─── TEAMS ─────────────────────────────────────────────

  async getTeam(teamId: string): Promise<GraphTeam> {
    return this.client
      .api(`/teams/${teamId}`)
      .select("id,displayName,description,webUrl")
      .get();
  }

  async listTeamChannels(teamId: string): Promise<GraphChannel[]> {
    const result = await this.client
      .api(`/teams/${teamId}/channels`)
      .select("id,displayName,description,membershipType")
      .get();
    return result.value;
  }

  async createTeamsChannel(
    teamId: string,
    displayName: string,
    description?: string,
    membershipType?: "standard" | "private" | "shared"
  ): Promise<GraphChannel> {
    return this.client.api(`/teams/${teamId}/channels`).post({
      displayName,
      description: description ?? "",
      membershipType: membershipType ?? "standard"
    });
  }

  async deleteTeamsChannel(teamId: string, channelId: string): Promise<void> {
    await this.client.api(`/teams/${teamId}/channels/${channelId}`).delete();
  }

  async postChannelMessage(
    teamId: string,
    channelId: string,
    content: string,
    contentType?: "text" | "html"
  ): Promise<unknown> {
    return this.client.api(`/teams/${teamId}/channels/${channelId}/messages`).post({
      body: {
        content,
        contentType: contentType ?? "html"
      }
    });
  }

  // ─── SHAREPOINT / DRIVES ──────────────────────────────

  async getSite(siteId: string): Promise<GraphSite> {
    return this.client
      .api(`/sites/${siteId}`)
      .select("id,displayName,webUrl,name")
      .get();
  }

  async getSiteByUrl(hostname: string, sitePath: string): Promise<GraphSite> {
    return this.client
      .api(`/sites/${hostname}:/${sitePath}`)
      .select("id,displayName,webUrl,name")
      .get();
  }

  async listDrives(siteId: string): Promise<GraphDrive[]> {
    const result = await this.client
      .api(`/sites/${siteId}/drives`)
      .select("id,name,webUrl,driveType")
      .get();
    return result.value;
  }

  async listDriveItems(
    siteId: string,
    driveId: string,
    itemId?: string
  ): Promise<GraphDriveItem[]> {
    const path = itemId
      ? `/sites/${siteId}/drives/${driveId}/items/${itemId}/children`
      : `/sites/${siteId}/drives/${driveId}/root/children`;
    const result = await this.client.api(path).get();
    return result.value;
  }

  async createSharePointFolder(
    siteId: string,
    driveId: string,
    parentItemId: string,
    folderName: string
  ): Promise<GraphDriveItem> {
    const path = parentItemId === "root"
      ? `/sites/${siteId}/drives/${driveId}/root/children`
      : `/sites/${siteId}/drives/${driveId}/items/${parentItemId}/children`;

    return this.client.api(path).post({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename"
    });
  }

  async uploadFile(
    siteId: string,
    driveId: string,
    parentPath: string,
    fileName: string,
    content: ArrayBuffer | string
  ): Promise<GraphDriveItem> {
    return this.client
      .api(`/sites/${siteId}/drives/${driveId}/root:/${parentPath}/${fileName}:/content`)
      .put(content);
  }

  async getDriveItemByPath(
    siteId: string,
    driveId: string,
    path: string
  ): Promise<GraphDriveItem> {
    return this.client
      .api(`/sites/${siteId}/drives/${driveId}/root:/${path}`)
      .get();
  }

  // ─── MAIL ──────────────────────────────────────────────

  async sendMail(
    fromUserId: string,
    to: string[],
    subject: string,
    body: string,
    contentType?: "Text" | "HTML"
  ): Promise<void> {
    await this.client.api(`/users/${fromUserId}/sendMail`).post({
      message: {
        subject,
        body: {
          contentType: contentType ?? "HTML",
          content: body
        },
        toRecipients: to.map(email => ({
          emailAddress: { address: email }
        }))
      },
      saveToSentItems: true
    });
  }

  // ─── CALENDAR ──────────────────────────────────────────

  async createEvent(
    userId: string,
    subject: string,
    start: string,
    end: string,
    attendees?: string[],
    body?: string
  ): Promise<unknown> {
    return this.client.api(`/users/${userId}/events`).post({
      subject,
      body: body ? { contentType: "HTML", content: body } : undefined,
      start: { dateTime: start, timeZone: "UTC" },
      end: { dateTime: end, timeZone: "UTC" },
      attendees: attendees?.map(email => ({
        emailAddress: { address: email },
        type: "required"
      }))
    });
  }

  // ─── GENERIC ───────────────────────────────────────────

  /**
   * Raw GET for any Graph endpoint not covered above.
   */
  async rawGet<T = unknown>(path: string): Promise<T> {
    return this.client.api(path).get();
  }

  /**
   * Raw POST for any Graph endpoint not covered above.
   */
  async rawPost<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.client.api(path).post(body);
  }
}

// ─── TYPE DEFINITIONS ──────────────────────────────────────

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
}

export interface GraphGroup {
  id: string;
  displayName: string;
  description: string | null;
  mail: string | null;
  groupTypes: string[];
}

export interface GraphTeam {
  id: string;
  displayName: string;
  description: string | null;
  webUrl: string;
}

export interface GraphChannel {
  id: string;
  displayName: string;
  description: string | null;
  membershipType: string;
  webUrl?: string;
}

export interface GraphSite {
  id: string;
  displayName: string;
  webUrl: string;
  name: string;
}

export interface GraphDrive {
  id: string;
  name: string;
  webUrl: string;
  driveType: string;
}

export interface GraphDriveItem {
  id: string;
  name: string;
  webUrl: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
}
```

## Error Handling

```typescript
try {
  const user = await graphService.getUser("nonexistent@contoso.com");
} catch (error) {
  // Graph SDK throws GraphError objects
  if (error && typeof error === "object" && "statusCode" in error) {
    const graphError = error as { statusCode: number; code: string; message: string };
    console.error(`Graph error ${graphError.statusCode}: ${graphError.code}`);
    console.error(graphError.message);
  }
}
```

Common Graph error codes:

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `BadRequest` | Malformed request |
| 401 | `Unauthorized` | Token expired or invalid |
| 403 | `Authorization_RequestDenied` | Missing permission |
| 404 | `Request_ResourceNotFound` | User/group/item not found |
| 409 | `Conflict` | Resource already exists |
| 429 | `TooManyRequests` | Rate limited — retry after header |
