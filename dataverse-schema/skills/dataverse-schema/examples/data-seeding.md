# Data Seeding — Complete Examples

## Prerequisites

All examples use the shared types and helpers from `table-operations.md`.

---

## Example 1: Seed a Table from CSV File

Read a CSV file and create records in Dataverse via the Web API.

### Input CSV (`projects.csv`)

```csv
name,description,start_date,end_date,budget,priority
Alpha Platform,Next-gen platform rebuild,2025-03-01,2025-12-31,500000,100002
Beta Integration,Third-party API integration,2025-04-15,2025-09-30,150000,100001
Gamma Migration,Legacy data migration,2025-05-01,2025-08-31,200000,100003
Delta Analytics,Business analytics dashboard,2025-06-01,2026-03-31,350000,100001
Epsilon Security,Security audit and remediation,2025-02-01,2025-06-30,100000,100002
```

### TypeScript Implementation

```typescript
import * as fs from "fs";
import * as path from "path";

interface CsvRow {
  [key: string]: string;
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

interface SeedResult {
  row: number;
  name: string;
  success: boolean;
  recordId?: string;
  error?: string;
}

async function seedFromCsv(
  config: DataverseConfig,
  csvPath: string,
  entitySetName: string,
  columnMapping: Record<string, string | ((value: string) => unknown)>
): Promise<SeedResult[]> {
  const rows = parseCsv(csvPath);
  const results: SeedResult[] = [];

  console.log(`Seeding ${rows.length} records into ${entitySetName}...`);

  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const batchPromises = batch.map(async (row, batchIndex) => {
      const rowIndex = i + batchIndex + 1;
      const record: Record<string, unknown> = {};

      // Map CSV columns to Dataverse columns
      for (const [csvCol, dvMapping] of Object.entries(columnMapping)) {
        if (typeof dvMapping === "function") {
          const result = dvMapping(row[csvCol]);
          if (result !== null && result !== undefined) {
            Object.assign(record, typeof result === "object" ? result : { [csvCol]: result });
          }
        } else {
          record[dvMapping] = row[csvCol];
        }
      }

      try {
        const response = await fetch(
          `${config.envUrl}/api/data/v9.2/${entitySetName}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.token}`,
              "OData-MaxVersion": "4.0",
              "OData-Version": "4.0",
              Prefer: "return=representation",
            },
            body: JSON.stringify(record),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return {
            row: rowIndex,
            name: row.name ?? `Row ${rowIndex}`,
            success: false,
            error: JSON.stringify(error.error?.message ?? error),
          };
        }

        const created = await response.json();
        const idField = Object.keys(created).find((k) => k.endsWith("id") && !k.includes("_"));
        return {
          row: rowIndex,
          name: row.name ?? `Row ${rowIndex}`,
          success: true,
          recordId: idField ? created[idField] : undefined,
        };
      } catch (err) {
        return {
          row: rowIndex,
          name: row.name ?? `Row ${rowIndex}`,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    const succeeded = batchResults.filter((r) => r.success).length;
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${succeeded}/${batch.length} succeeded`);
  }

  // Summary
  const totalSuccess = results.filter((r) => r.success).length;
  const totalFailed = results.filter((r) => !r.success).length;
  console.log(`\nSeeding complete: ${totalSuccess} succeeded, ${totalFailed} failed`);

  if (totalFailed > 0) {
    console.log("\nFailed records:");
    for (const r of results.filter((r) => !r.success)) {
      console.log(`  Row ${r.row} (${r.name}): ${r.error}`);
    }
  }

  return results;
}

// Usage
async function seedProjects(config: DataverseConfig): Promise<void> {
  await seedFromCsv(
    config,
    "./data/projects.csv",
    `${config.prefix}_projects`,
    {
      name: `${config.prefix}_name`,
      description: `${config.prefix}_description`,
      start_date: (value: string) => ({ [`${config.prefix}_startdate`]: value || null }),
      end_date: (value: string) => ({ [`${config.prefix}_enddate`]: value || null }),
      budget: (value: string) => ({ [`${config.prefix}_budget`]: parseFloat(value) || null }),
      priority: (value: string) => ({ [`${config.prefix}_priority`]: parseInt(value, 10) }),
    }
  );
}
```

---

## Example 2: Bulk Import from JSON with Relationship Binding

Import records from a JSON file that includes lookup references.

### Input JSON (`tasks.json`)

```json
[
  {
    "name": "Design database schema",
    "description": "Design the initial database schema for the platform",
    "estimated_hours": 40,
    "priority": 100002,
    "project_name": "Alpha Platform",
    "assigned_to_email": "alice@contoso.com"
  },
  {
    "name": "Implement REST API",
    "description": "Build the core REST API endpoints",
    "estimated_hours": 120,
    "priority": 100002,
    "project_name": "Alpha Platform",
    "assigned_to_email": "bob@contoso.com"
  },
  {
    "name": "Configure OAuth provider",
    "description": "Set up third-party OAuth integration",
    "estimated_hours": 24,
    "priority": 100001,
    "project_name": "Beta Integration",
    "assigned_to_email": "alice@contoso.com"
  },
  {
    "name": "Map legacy data fields",
    "description": "Create field mapping document for migration",
    "estimated_hours": 16,
    "priority": 100001,
    "project_name": "Gamma Migration",
    "assigned_to_email": "charlie@contoso.com"
  }
]
```

### TypeScript Implementation

```typescript
import * as fs from "fs";

interface TaskInput {
  name: string;
  description: string;
  estimated_hours: number;
  priority: number;
  project_name: string;
  assigned_to_email: string;
}

interface LookupCache {
  projects: Map<string, string>;    // name -> id
  users: Map<string, string>;       // email -> id
}

async function buildLookupCache(config: DataverseConfig): Promise<LookupCache> {
  // Fetch all projects
  const projectsResponse = await apiRequest<{ value: Array<{ [key: string]: string }> }>(
    config,
    "GET",
    `${config.prefix}_projects?$select=${config.prefix}_name,${config.prefix}_projectid`
  );

  const projects = new Map<string, string>();
  for (const p of projectsResponse.value) {
    projects.set(p[`${config.prefix}_name`], p[`${config.prefix}_projectid`]);
  }

  // Fetch all system users
  const usersResponse = await apiRequest<{ value: Array<{ systemuserid: string; internalemailaddress: string }> }>(
    config,
    "GET",
    "systemusers?$select=systemuserid,internalemailaddress&$filter=isdisabled eq false"
  );

  const users = new Map<string, string>();
  for (const u of usersResponse.value) {
    if (u.internalemailaddress) {
      users.set(u.internalemailaddress.toLowerCase(), u.systemuserid);
    }
  }

  console.log(`Lookup cache built: ${projects.size} projects, ${users.size} users`);
  return { projects, users };
}

async function seedTasksFromJson(
  config: DataverseConfig,
  jsonPath: string
): Promise<void> {
  const tasks: TaskInput[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const cache = await buildLookupCache(config);

  console.log(`\nSeeding ${tasks.length} tasks...`);

  const batchSize = 50;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    const promises = batch.map(async (task) => {
      // Resolve lookups
      const projectId = cache.projects.get(task.project_name);
      const userId = cache.users.get(task.assigned_to_email.toLowerCase());

      if (!projectId) {
        console.warn(`  Skipping "${task.name}": project "${task.project_name}" not found`);
        return false;
      }

      const record: Record<string, unknown> = {
        [`${config.prefix}_name`]: task.name,
        [`${config.prefix}_description`]: task.description,
        [`${config.prefix}_estimatedhours`]: task.estimated_hours,
        [`${config.prefix}_priority`]: task.priority,
        // Lookup binding: use @odata.bind with the navigation property
        [`${config.prefix}_ProjectId@odata.bind`]: `/${config.prefix}_projects(${projectId})`,
      };

      // Optionally bind assigned user
      if (userId) {
        record[`${config.prefix}_AssignedToId@odata.bind`] = `/systemusers(${userId})`;
      }

      try {
        await apiRequest(config, "POST", `${config.prefix}_projecttasks`, record);
        return true;
      } catch (error) {
        console.error(`  Failed: "${task.name}" - ${error}`);
        return false;
      }
    });

    const results = await Promise.all(promises);
    successCount += results.filter(Boolean).length;
    failCount += results.filter((r) => !r).length;
  }

  console.log(`\nTask seeding complete: ${successCount} succeeded, ${failCount} failed`);
}
```

---

## Example 3: Generate Random Test Records

Generate N random test records for a table using configurable field generators.

```typescript
interface FieldGenerator {
  field: string;
  generate: () => unknown;
}

interface LookupBindingGenerator {
  navigationProperty: string;
  entitySetName: string;
  generate: () => string; // returns GUID
}

// Simple random data generators
const generators = {
  firstName: (): string => {
    const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank", "Iris", "Jack"];
    return names[Math.floor(Math.random() * names.length)];
  },

  lastName: (): string => {
    const names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller", "Wilson", "Moore", "Taylor"];
    return names[Math.floor(Math.random() * names.length)];
  },

  email: (firstName: string, lastName: string): string => {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@contoso.com`;
  },

  dateInRange: (startDate: Date, endDate: Date): string => {
    const start = startDate.getTime();
    const end = endDate.getTime();
    const random = new Date(start + Math.random() * (end - start));
    return random.toISOString().split("T")[0];
  },

  intInRange: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  decimalInRange: (min: number, max: number, precision: number): number => {
    const value = min + Math.random() * (max - min);
    return parseFloat(value.toFixed(precision));
  },

  pickOne: <T>(options: T[]): T => {
    return options[Math.floor(Math.random() * options.length)];
  },

  sentence: (): string => {
    const subjects = ["The team", "We", "The project", "The client", "Management"];
    const verbs = ["needs", "requires", "expects", "planned", "requested"];
    const objects = [
      "a new dashboard",
      "better reporting",
      "more resources",
      "additional testing",
      "updated documentation",
    ];
    return `${generators.pickOne(subjects)} ${generators.pickOne(verbs)} ${generators.pickOne(objects)}.`;
  },
};

async function generateTestRecords(
  config: DataverseConfig,
  entitySetName: string,
  count: number,
  buildRecord: () => Record<string, unknown>
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;
  const batchSize = 50;

  console.log(`Generating ${count} test records in ${entitySetName}...`);

  for (let i = 0; i < count; i += batchSize) {
    const batchCount = Math.min(batchSize, count - i);
    const promises: Promise<boolean>[] = [];

    for (let j = 0; j < batchCount; j++) {
      const record = buildRecord();
      promises.push(
        apiRequest(config, "POST", entitySetName, record)
          .then(() => true)
          .catch((err) => {
            console.error(`  Record ${i + j + 1} failed: ${err}`);
            return false;
          })
      );
    }

    const results = await Promise.all(promises);
    const batchCreated = results.filter(Boolean).length;
    created += batchCreated;
    failed += batchCount - batchCreated;

    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batchCreated}/${batchCount} created (total: ${created})`);
  }

  console.log(`\nGeneration complete: ${created} created, ${failed} failed`);
  return { created, failed };
}

// Usage: Generate 100 test project tasks
async function generateTestTasks(
  config: DataverseConfig,
  projectIds: string[]
): Promise<void> {
  await generateTestRecords(
    config,
    `${config.prefix}_projecttasks`,
    100,
    () => {
      const firstName = generators.firstName();
      const lastName = generators.lastName();

      return {
        [`${config.prefix}_name`]: `Task: ${generators.sentence()}`,
        [`${config.prefix}_description`]: `${generators.sentence()} ${generators.sentence()}`,
        [`${config.prefix}_estimatedhours`]: generators.intInRange(1, 200),
        [`${config.prefix}_priority`]: generators.pickOne([100000, 100001, 100002, 100003]),
        [`${config.prefix}_startdate`]: generators.dateInRange(new Date("2025-01-01"), new Date("2025-06-30")),
        [`${config.prefix}_duedate`]: generators.dateInRange(new Date("2025-07-01"), new Date("2025-12-31")),
        [`${config.prefix}_progresspercent`]: generators.intInRange(0, 100),
        [`${config.prefix}_ProjectId@odata.bind`]: `/${config.prefix}_projects(${generators.pickOne(projectIds)})`,
      };
    }
  );
}
```

---

## Example 4: Seed Option Set Values from a Config File

Read option set definitions from a configuration file and create or update them.

### Input Config (`option-sets.json`)

```json
{
  "optionSets": [
    {
      "name": "cr123_taskstatus",
      "displayName": "Task Status",
      "isGlobal": true,
      "options": [
        { "value": 100000, "label": "Not Started", "color": "#cccccc" },
        { "value": 100001, "label": "In Progress", "color": "#3498db" },
        { "value": 100002, "label": "In Review", "color": "#f39c12" },
        { "value": 100003, "label": "Completed", "color": "#2ecc71" },
        { "value": 100004, "label": "On Hold", "color": "#95a5a6" },
        { "value": 100005, "label": "Cancelled", "color": "#e74c3c" }
      ]
    },
    {
      "name": "cr123_projectphase",
      "displayName": "Project Phase",
      "isGlobal": true,
      "options": [
        { "value": 100000, "label": "Initiation", "color": "#1abc9c" },
        { "value": 100001, "label": "Planning", "color": "#3498db" },
        { "value": 100002, "label": "Execution", "color": "#f39c12" },
        { "value": 100003, "label": "Monitoring", "color": "#e67e22" },
        { "value": 100004, "label": "Closure", "color": "#2ecc71" }
      ]
    }
  ]
}
```

### TypeScript Implementation

```typescript
import * as fs from "fs";

interface OptionSetConfig {
  name: string;
  displayName: string;
  isGlobal: boolean;
  options: Array<{
    value: number;
    label: string;
    color?: string;
  }>;
}

interface OptionSetsFile {
  optionSets: OptionSetConfig[];
}

async function seedOptionSets(
  config: DataverseConfig,
  configPath: string
): Promise<void> {
  const file: OptionSetsFile = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  for (const optionSetConfig of file.optionSets) {
    console.log(`\nProcessing option set: ${optionSetConfig.name}`);

    // Check if option set already exists
    let exists = false;
    try {
      await apiRequest(
        config,
        "GET",
        `GlobalOptionSetDefinitions(Name='${optionSetConfig.name}')`
      );
      exists = true;
      console.log("  Option set exists. Checking for new options...");
    } catch {
      console.log("  Option set does not exist. Creating...");
    }

    if (!exists && optionSetConfig.isGlobal) {
      // Create the global option set
      const createPayload = {
        "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
        Name: optionSetConfig.name,
        DisplayName: label(optionSetConfig.displayName),
        IsGlobal: true,
        OptionSetType: "Picklist",
        Options: optionSetConfig.options.map((opt) => ({
          Value: opt.value,
          Label: label(opt.label),
          ...(opt.color ? { Color: opt.color } : {}),
        })),
      };

      await apiRequest(config, "POST", "GlobalOptionSetDefinitions", createPayload);
      console.log(`  Created global option set with ${optionSetConfig.options.length} options.`);
    } else if (exists) {
      // Get existing options
      const existing = await apiRequest<{
        Options: Array<{ Value: number; Label: { LocalizedLabels: Array<{ Label: string }> } }>;
      }>(
        config,
        "GET",
        `GlobalOptionSetDefinitions(Name='${optionSetConfig.name}')`
      );

      const existingValues = new Set(existing.Options.map((o) => o.Value));

      // Add missing options
      for (const opt of optionSetConfig.options) {
        if (!existingValues.has(opt.value)) {
          console.log(`  Adding option: ${opt.label} (${opt.value})`);
          await apiRequest(config, "POST", "InsertOptionValue", {
            OptionSetName: optionSetConfig.name,
            Value: opt.value,
            Label: label(opt.label),
            SolutionUniqueName: config.solutionName,
          });
        }
      }

      // Reorder options to match config
      const orderedValues = optionSetConfig.options.map((o) => o.value);
      await apiRequest(config, "POST", "OrderOption", {
        OptionSetName: optionSetConfig.name,
        Values: orderedValues,
        SolutionUniqueName: config.solutionName,
      });

      console.log(`  Option order updated.`);
    }
  }

  // Publish changes
  await apiRequest(config, "POST", "PublishAllXml");
  console.log("\nAll option sets seeded and published.");
}
```

---

## Example 5: Seed Data Using $batch for Performance

Use OData batch requests to create multiple records in a single HTTP call.

```typescript
async function batchCreateRecords(
  config: DataverseConfig,
  entitySetName: string,
  records: Array<Record<string, unknown>>
): Promise<{ succeeded: number; failed: number }> {
  const batchSize = 50; // Max recommended per changeset
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchId = `batch_${Date.now()}_${i}`;
    const changesetId = `changeset_${Date.now()}_${i}`;

    let batchBody = `--${batchId}\r\n`;
    batchBody += `Content-Type: multipart/mixed; boundary=${changesetId}\r\n\r\n`;

    for (let j = 0; j < batch.length; j++) {
      batchBody += `--${changesetId}\r\n`;
      batchBody += `Content-Type: application/http\r\n`;
      batchBody += `Content-Transfer-Encoding: binary\r\n`;
      batchBody += `Content-ID: ${j + 1}\r\n\r\n`;
      batchBody += `POST ${config.envUrl}/api/data/v9.2/${entitySetName} HTTP/1.1\r\n`;
      batchBody += `Content-Type: application/json\r\n\r\n`;
      batchBody += `${JSON.stringify(batch[j])}\r\n`;
    }

    batchBody += `--${changesetId}--\r\n`;
    batchBody += `--${batchId}--\r\n`;

    const response = await fetch(`${config.envUrl}/api/data/v9.2/$batch`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/mixed; boundary=${batchId}`,
        Authorization: `Bearer ${config.token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: batchBody,
    });

    if (response.ok) {
      succeeded += batch.length;
    } else {
      failed += batch.length;
      const errorText = await response.text();
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed: ${errorText.substring(0, 200)}`);
    }

    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
  }

  console.log(`\nBatch seeding complete: ${succeeded} succeeded, ${failed} failed`);
  return { succeeded, failed };
}
```
