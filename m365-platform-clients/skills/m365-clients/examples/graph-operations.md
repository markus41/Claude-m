# Graph Operations Examples

Common Microsoft Graph operations using the typed service class.

## 1. User Management

```typescript
import { getCredential } from "../auth/tokenProvider";
import { GraphService } from "../clients/graphClient";

const graph = new GraphService(getCredential());

async function userOperations() {
  // Get a user by UPN or ID
  const user = await graph.getUser("john.doe@contoso.com");
  console.log(`${user.displayName} (${user.mail}) — ${user.department}`);

  // List all users (with filter)
  const engineers = await graph.listUsers("department eq 'Engineering'", 100);
  console.log(`Found ${engineers.length} engineers`);

  // Get user photo
  const photo = await graph.getUserPhoto(user.id);
  if (photo) {
    console.log("Photo retrieved");
  }
}
```

## 2. Teams Channel Operations

```typescript
async function teamsOperations(graph: GraphService) {
  const teamId = "your-team-id";

  // List channels
  const channels = await graph.listTeamChannels(teamId);
  for (const ch of channels) {
    console.log(`#${ch.displayName} (${ch.membershipType})`);
  }

  // Create a project channel
  const newChannel = await graph.createTeamsChannel(
    teamId,
    "Project Alpha",
    "Discussion channel for Project Alpha",
    "standard"
  );
  console.log(`Created channel: ${newChannel.id}`);

  // Post a message
  await graph.postChannelMessage(
    teamId,
    newChannel.id,
    "<h3>Project Alpha Launched</h3><p>Welcome to the project channel!</p>",
    "html"
  );

  // Delete channel (cleanup)
  // await graph.deleteTeamsChannel(teamId, newChannel.id);
}
```

## 3. SharePoint Folder Operations

```typescript
async function sharePointOperations(graph: GraphService) {
  // Get site by URL
  const site = await graph.getSiteByUrl("contoso.sharepoint.com", "sites/Projects");
  console.log(`Site: ${site.displayName} (${site.id})`);

  // List drives
  const drives = await graph.listDrives(site.id);
  const docDrive = drives.find(d => d.name === "Documents");
  if (!docDrive) throw new Error("Documents drive not found");

  // Create a project folder
  const folder = await graph.createSharePointFolder(
    site.id,
    docDrive.id,
    "root",
    "Project Alpha"
  );
  console.log(`Folder created: ${folder.webUrl}`);

  // Create subfolders
  const subfolders = ["Plans", "Reports", "Assets"];
  for (const name of subfolders) {
    await graph.createSharePointFolder(site.id, docDrive.id, folder.id, name);
  }
  console.log("Subfolders created");

  // List items in folder
  const items = await graph.listDriveItems(site.id, docDrive.id, folder.id);
  for (const item of items) {
    console.log(`${item.folder ? "📁" : "📄"} ${item.name}`);
  }

  // Upload a file
  await graph.uploadFile(
    site.id,
    docDrive.id,
    "Project Alpha",
    "README.md",
    "# Project Alpha\n\nProject documentation goes here."
  );
}
```

## 4. Send Email

```typescript
async function sendNotification(graph: GraphService) {
  // Send from a service account or shared mailbox
  const senderId = "serviceaccount@contoso.com";

  await graph.sendMail(
    senderId,
    ["team@contoso.com", "manager@contoso.com"],
    "Weekly Report Generated",
    `
      <h2>Weekly Report</h2>
      <p>The automated weekly report has been generated.</p>
      <ul>
        <li>New accounts: 12</li>
        <li>Revenue: $450,000</li>
        <li>Active projects: 8</li>
      </ul>
      <p>View the full report in <a href="https://contoso.sharepoint.com/sites/Reports">SharePoint</a>.</p>
    `,
    "HTML"
  );
}
```

## 5. Group Membership

```typescript
async function groupOperations(graph: GraphService) {
  const groupId = "your-group-id";

  // List current members
  const members = await graph.listGroupMembers(groupId);
  console.log("Current members:");
  for (const member of members) {
    console.log(`  ${member.displayName} (${member.mail})`);
  }

  // Add a member
  const newUserId = "user-to-add-id";
  await graph.addGroupMember(groupId, newUserId);
  console.log("Member added");

  // Remove a member
  // await graph.removeGroupMember(groupId, newUserId);
}
```

## 6. Calendar Event

```typescript
async function createMeeting(graph: GraphService) {
  const event = await graph.createEvent(
    "organizer@contoso.com",
    "Project Alpha Kickoff",
    "2024-07-01T14:00:00",
    "2024-07-01T15:00:00",
    ["john@contoso.com", "jane@contoso.com"],
    "<p>Let's kick off Project Alpha. Please review the <a href='#'>proposal</a> beforehand.</p>"
  );
  console.log("Meeting created:", event);
}
```

## 7. Batch Operations with Error Handling

```typescript
async function parallelGraphOps(graph: GraphService) {
  // Run multiple Graph operations in parallel with error isolation
  const results = await Promise.allSettled([
    graph.getUser("user1@contoso.com"),
    graph.getUser("user2@contoso.com"),
    graph.getUser("nonexistent@contoso.com"),
    graph.listGroupMembers("group-id")
  ]);

  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      console.log(`Operation ${index}: Success`);
    } else {
      console.error(`Operation ${index}: Failed — ${result.reason}`);
    }
  }
}
```
