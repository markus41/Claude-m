# Combined Dataverse + Graph Workflows

Patterns for orchestrating operations across Dataverse and Microsoft Graph.

## 1. Project Provisioning Workflow

Creates a Dataverse record, provisions Teams channel and SharePoint folder, then links them back.

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { DataverseClient } from "../clients/dataverseClient";
import { GraphService } from "../clients/graphClient";

const credential = new DefaultAzureCredential();
const dvClient = new DataverseClient(
  { environmentUrl: process.env.DATAVERSE_ENV_URL! },
  credential
);
const graph = new GraphService(credential);

interface ProjectInput {
  name: string;
  description: string;
  ownerUpn: string;
  teamId: string;
  siteId: string;
  driveId: string;
  budget?: number;
}

interface ProjectResult {
  projectId: string;
  channelId: string;
  channelWebUrl: string;
  folderUrl: string;
}

async function provisionProject(input: ProjectInput): Promise<ProjectResult> {
  console.log(`Provisioning project: ${input.name}`);

  // Step 1: Resolve owner from Graph
  const owner = await graph.getUser(input.ownerUpn);
  console.log(`Owner: ${owner.displayName}`);

  // Step 2: Create Dataverse project record
  const projectId = await dvClient.create("new_projects", {
    new_name: input.name,
    new_description: input.description,
    new_status: "provisioning",
    new_budget: input.budget ?? 0,
    "new_owner@odata.bind": `/systemusers(${owner.id})`
  });
  console.log(`Dataverse record: ${projectId}`);

  // Step 3: Provision M365 resources in parallel
  const [channel, folder] = await Promise.all([
    graph.createTeamsChannel(
      input.teamId,
      input.name,
      input.description,
      "standard"
    ),
    graph.createSharePointFolder(
      input.siteId,
      input.driveId,
      "root",
      input.name
    )
  ]);
  console.log(`Teams channel: ${channel.id}`);
  console.log(`SP folder: ${folder.webUrl}`);

  // Step 4: Create subfolders in SharePoint
  const subfolders = ["Documents", "Reports", "Deliverables"];
  await Promise.all(
    subfolders.map(name =>
      graph.createSharePointFolder(input.siteId, input.driveId, folder.id, name)
    )
  );

  // Step 5: Post welcome message to Teams channel
  await graph.postChannelMessage(
    input.teamId,
    channel.id,
    `<h3>Welcome to ${input.name}</h3>
     <p>Owner: ${owner.displayName}</p>
     <p>SharePoint: <a href="${folder.webUrl}">Project Files</a></p>
     <p>Budget: $${(input.budget ?? 0).toLocaleString()}</p>`,
    "html"
  );

  // Step 6: Write resource IDs back to Dataverse
  await dvClient.patch("new_projects", projectId, {
    new_status: "active",
    new_teams_channel_id: channel.id,
    new_teams_channel_url: channel.webUrl ?? "",
    new_sharepoint_folder_id: folder.id,
    new_sharepoint_folder_url: folder.webUrl
  });
  console.log("Project provisioned successfully!");

  return {
    projectId,
    channelId: channel.id,
    channelWebUrl: channel.webUrl ?? "",
    folderUrl: folder.webUrl
  };
}

// Usage
provisionProject({
  name: "Project Alpha",
  description: "Customer onboarding automation",
  ownerUpn: "john.doe@contoso.com",
  teamId: process.env.TEAM_ID!,
  siteId: process.env.SITE_ID!,
  driveId: process.env.DRIVE_ID!,
  budget: 150000
}).then(result => {
  console.log("Result:", JSON.stringify(result, null, 2));
}).catch(console.error);
```

## 2. User Onboarding Workflow

Creates a Dataverse employee record, adds to Teams/groups, creates personal folder.

```typescript
interface OnboardingInput {
  upn: string;
  department: string;
  teamId: string;
  groupIds: string[];
  siteId: string;
  driveId: string;
}

async function onboardUser(input: OnboardingInput): Promise<void> {
  // Get user details from Graph
  const user = await graph.getUser(input.upn);

  // Create Dataverse record
  const employeeId = await dvClient.create("new_employees", {
    new_name: user.displayName,
    new_email: user.mail,
    new_department: input.department,
    new_entra_id: user.id,
    new_status: "onboarding",
    new_start_date: new Date().toISOString()
  });

  // Add to groups in parallel
  await Promise.all(
    input.groupIds.map(groupId =>
      graph.addGroupMember(groupId, user.id).catch(err => {
        console.warn(`Failed to add to group ${groupId}:`, err);
      })
    )
  );

  // Create personal folder
  const folder = await graph.createSharePointFolder(
    input.siteId,
    input.driveId,
    "root",
    `${user.displayName} - Onboarding`
  );

  // Post Teams welcome
  const generalChannel = (await graph.listTeamChannels(input.teamId))
    .find(ch => ch.displayName === "General");

  if (generalChannel) {
    await graph.postChannelMessage(
      input.teamId,
      generalChannel.id,
      `<p>Welcome <b>${user.displayName}</b> to the ${input.department} team! 🎉</p>`,
      "html"
    );
  }

  // Update Dataverse record
  await dvClient.patch("new_employees", employeeId, {
    new_status: "active",
    new_onboarding_folder_url: folder.webUrl
  });

  console.log(`Onboarded: ${user.displayName}`);
}
```

## 3. Reporting Pipeline

Query Dataverse for metrics, enrich with Graph data, generate and distribute report.

```typescript
interface ReportRow {
  projectName: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  budget: number;
  actualSpend: number;
  channelUrl: string;
}

async function generateWeeklyReport(): Promise<void> {
  // Step 1: Query all active projects from Dataverse
  const projects = await dvClient.query(
    "new_projects",
    "$filter=new_status eq 'active'&$select=new_name,new_budget,new_actualspend,new_status,_new_owner_value,new_teams_channel_url"
  );

  // Step 2: Enrich with owner info from Graph
  const rows: ReportRow[] = [];
  for (const project of projects.value) {
    const p = project as Record<string, unknown>;
    const ownerId = p["_new_owner_value"] as string;

    let ownerName = "Unknown";
    let ownerEmail = "";
    if (ownerId) {
      try {
        const user = await graph.getUser(ownerId);
        ownerName = user.displayName;
        ownerEmail = user.mail ?? "";
      } catch {
        // User might not be in Graph (system user)
      }
    }

    rows.push({
      projectName: p["new_name"] as string,
      ownerName,
      ownerEmail,
      status: p["new_status"] as string,
      budget: (p["new_budget"] as number) ?? 0,
      actualSpend: (p["new_actualspend"] as number) ?? 0,
      channelUrl: (p["new_teams_channel_url"] as string) ?? ""
    });
  }

  // Step 3: Generate HTML report
  const totalBudget = rows.reduce((sum, r) => sum + r.budget, 0);
  const totalSpend = rows.reduce((sum, r) => sum + r.actualSpend, 0);

  const tableRows = rows.map(r => `
    <tr>
      <td>${r.projectName}</td>
      <td>${r.ownerName}</td>
      <td>$${r.budget.toLocaleString()}</td>
      <td>$${r.actualSpend.toLocaleString()}</td>
      <td>${((r.actualSpend / r.budget) * 100).toFixed(1)}%</td>
    </tr>
  `).join("");

  const html = `
    <h2>Weekly Project Report</h2>
    <p>Generated: ${new Date().toISOString()}</p>
    <p><b>Active Projects:</b> ${rows.length} | <b>Total Budget:</b> $${totalBudget.toLocaleString()} | <b>Total Spend:</b> $${totalSpend.toLocaleString()}</p>
    <table border="1" cellpadding="8">
      <tr><th>Project</th><th>Owner</th><th>Budget</th><th>Spend</th><th>Used</th></tr>
      ${tableRows}
    </table>
  `;

  // Step 4: Send via email
  await graph.sendMail(
    "reports@contoso.com",
    ["leadership@contoso.com"],
    `Weekly Project Report — ${new Date().toLocaleDateString()}`,
    html,
    "HTML"
  );

  console.log(`Report sent: ${rows.length} projects`);
}
```

## 4. Cleanup / Decommission Workflow

Reverse of provisioning — archives resources when a project ends.

```typescript
async function decommissionProject(projectId: string): Promise<void> {
  // Get project details from Dataverse
  const project = await dvClient.getById("new_projects", projectId,
    "new_name,new_teams_channel_id,new_teams_channel_url,new_sharepoint_folder_id"
  ) as Record<string, unknown>;

  const projectName = project["new_name"] as string;
  const channelId = project["new_teams_channel_id"] as string;

  console.log(`Decommissioning: ${projectName}`);

  // Post final message to Teams channel (before archiving)
  if (channelId) {
    const teamId = process.env.TEAM_ID!;
    try {
      await graph.postChannelMessage(
        teamId,
        channelId,
        `<p><b>Project ${projectName} has been completed.</b></p>
         <p>This channel will be archived. Thank you for your contributions!</p>`,
        "html"
      );
    } catch (err) {
      console.warn("Could not post final message:", err);
    }
  }

  // Note: Channel deletion requires explicit user confirmation
  // For safety, just mark as archived in Dataverse
  await dvClient.patch("new_projects", projectId, {
    new_status: "archived",
    new_archived_date: new Date().toISOString()
  });

  // Send notification
  await graph.sendMail(
    "reports@contoso.com",
    ["pmo@contoso.com"],
    `Project Archived: ${projectName}`,
    `<p>Project <b>${projectName}</b> has been archived.</p>
     <p>Dataverse record ID: ${projectId}</p>`,
    "HTML"
  );

  console.log(`Project ${projectName} archived`);
}
```

## 5. Factory Pattern — Production Setup

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { DataverseClient } from "../clients/dataverseClient";
import { GraphService } from "../clients/graphClient";

interface ServiceContext {
  dataverse: DataverseClient;
  graph: GraphService;
  config: {
    teamId: string;
    siteId: string;
    driveId: string;
  };
}

function createServices(): ServiceContext {
  const credential = new DefaultAzureCredential();

  return {
    dataverse: new DataverseClient(
      { environmentUrl: process.env.DATAVERSE_ENV_URL! },
      credential
    ),
    graph: new GraphService(credential),
    config: {
      teamId: process.env.TEAM_ID!,
      siteId: process.env.SITE_ID!,
      driveId: process.env.DRIVE_ID!
    }
  };
}

// Single initialization, shared across your application
const services = createServices();

// Use in any function
async function doWork() {
  const whoAmI = await services.dataverse.whoAmI();
  const user = await services.graph.getUser("admin@contoso.com");
  // ...
}
```
