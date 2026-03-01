# Dataverse Operations Examples

Common Dataverse Web API operations using the typed client.

## 1. CRUD on a Custom Table

```typescript
import { getCredential } from "../auth/tokenProvider";
import { DataverseClient } from "../clients/dataverseClient";

const client = new DataverseClient(
  { environmentUrl: process.env.DATAVERSE_ENV_URL! },
  getCredential()
);

async function projectCrud() {
  // Create
  const projectId = await client.create("new_projects", {
    new_name: "Project Alpha",
    new_status: 1, // Active
    new_budget: 150000,
    new_startdate: "2024-06-01T00:00:00Z",
    new_description: "Customer onboarding project"
  });
  console.log("Created project:", projectId);

  // Read
  const project = await client.getById("new_projects", projectId, "new_name,new_status,new_budget");
  console.log("Project:", project);

  // Update
  await client.patch("new_projects", projectId, {
    new_status: 2, // In Progress
    new_actualspend: 25000
  });

  // Delete
  await client.delete("new_projects", projectId);
}
```

## 2. Query with Filters

```typescript
async function queryExamples(client: DataverseClient) {
  // Active accounts with revenue > $1M
  const highValueAccounts = await client.query("accounts",
    "$filter=statecode eq 0 and revenue gt 1000000&$select=name,revenue,telephone1&$orderby=revenue desc&$top=50"
  );
  console.log(`Found ${highValueAccounts.value.length} high-value accounts`);

  // Contacts by company
  const contacts = await client.query("contacts",
    "$filter=_parentcustomerid_value eq 'account-guid'&$select=fullname,emailaddress1,jobtitle"
  );

  // Full-text search
  const searchResults = await client.query("accounts",
    "$filter=contains(name,'Contoso')&$select=name,accountnumber"
  );

  // Date range
  const recentRecords = await client.query("new_projects",
    "$filter=createdon gt 2024-01-01T00:00:00Z and createdon lt 2024-07-01T00:00:00Z"
  );

  // Null check
  const unassigned = await client.query("new_projects",
    "$filter=_ownerid_value eq null"
  );

  // Count only (no records returned)
  const count = await client.query("accounts", "$count=true&$top=0");
  console.log("Total accounts:", count["@odata.count"]);
}
```

## 3. Create with Lookup Binding

```typescript
async function createWithLookup(client: DataverseClient) {
  // Create a contact linked to an account
  const contactId = await client.create("contacts", {
    firstname: "John",
    lastname: "Doe",
    emailaddress1: "john.doe@contoso.com",
    jobtitle: "Engineering Manager",
    // Bind to existing account via lookup
    "parentcustomerid_account@odata.bind": `/accounts(${accountId})`
  });

  // Create a task assigned to a user
  const taskId = await client.create("tasks", {
    subject: "Review proposal",
    description: "Review the Q3 sales proposal",
    scheduledend: "2024-07-15T17:00:00Z",
    // Bind to user
    "ownerid@odata.bind": `/systemusers(${userId})`,
    // Bind to regarding record
    "regardingobjectid_account@odata.bind": `/accounts(${accountId})`
  });
}
```

## 4. Expand Related Records

```typescript
async function expandExamples(client: DataverseClient) {
  // Account with primary contact details
  const account = await client.getById("accounts", accountId,
    "name,revenue&$expand=primarycontactid($select=fullname,emailaddress1)"
  );

  // Account with all related contacts
  const accountWithContacts = await client.query("accounts",
    `$filter=accountid eq '${accountId}'&$select=name&$expand=contact_customer_accounts($select=fullname,emailaddress1;$top=100)`
  );
}
```

## 5. Workflow (Cloud Flow) Management

```typescript
async function manageFlows(client: DataverseClient) {
  // List all cloud flows
  const flows = await client.query("workflows",
    "$filter=category eq 5&$select=name,statecode,statuscode,createdon&$orderby=createdon desc"
  );

  for (const flow of flows.value) {
    const f = flow as { name: string; statecode: number; createdon: string };
    console.log(`${f.name} — ${f.statecode === 1 ? "Active" : "Draft"} — ${f.createdon}`);
  }

  // Create a flow (see excel-office-scripts plugin for clientdata details)
  const flowId = await client.create("workflows", {
    category: 5,
    type: 1,
    primaryentity: "none",
    name: "My Automated Flow",
    clientdata: JSON.stringify({ /* flow definition */ })
  });

  // Enable the flow
  await client.patch("workflows", flowId, { statecode: 1, statuscode: 2 });

  // Disable
  await client.patch("workflows", flowId, { statecode: 0, statuscode: 1 });
}
```

## 6. Bulk Operations

```typescript
async function bulkCreate(
  client: DataverseClient,
  entitySet: string,
  records: Record<string, unknown>[]
): Promise<string[]> {
  const ids: string[] = [];

  // Process in batches of 50 (practical limit for parallel creation)
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(record => client.create(entitySet, record))
    );
    ids.push(...results);
    console.log(`Created ${Math.min(i + batchSize, records.length)}/${records.length}`);
  }

  return ids;
}

// Usage
const newAccounts = [
  { name: "Company A", revenue: 500000 },
  { name: "Company B", revenue: 750000 },
  { name: "Company C", revenue: 1200000 }
];
const accountIds = await bulkCreate(client, "accounts", newAccounts);
```

## 7. Connection Test

```typescript
async function testConnection(client: DataverseClient): Promise<void> {
  try {
    const whoAmI = await client.whoAmI();
    console.log("Connection successful!");
    console.log("User ID:", whoAmI.UserId);
    console.log("Business Unit:", whoAmI.BusinessUnitId);
    console.log("Organization:", whoAmI.OrganizationId);
  } catch (error) {
    console.error("Connection failed:", error);
    throw error;
  }
}
```
