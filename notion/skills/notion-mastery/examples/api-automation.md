# API Automation — TypeScript Examples for Notion

Production-ready TypeScript examples for common Notion automation patterns using the official SDK.

## Setup

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
```

## Example 1: Bulk Create Pages from CSV Data

Import structured data into a Notion database.

```typescript
import { Client } from '@notionhq/client';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

interface CsvRow {
  name: string;
  status: string;
  priority: string;
  due_date: string;
  assignee_email: string;
}

async function importCsvToDatabase(databaseId: string, csvPath: string) {
  const csv = fs.readFileSync(csvPath, 'utf-8');
  const rows: CsvRow[] = parse(csv, { columns: true, skip_empty_lines: true });

  // Look up workspace users for assignee matching
  const users = await notion.users.list({});
  const userMap = new Map(
    users.results
      .filter((u): u is Extract<typeof u, { type: 'person' }> => u.type === 'person')
      .map(u => [u.person?.email, u.id])
  );

  let created = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const properties: Record<string, any> = {
        Name: { title: [{ text: { content: row.name } }] },
        Status: { status: { name: row.status } },
        Priority: { select: { name: row.priority } },
      };

      if (row.due_date) {
        properties['Due Date'] = { date: { start: row.due_date } };
      }

      const userId = userMap.get(row.assignee_email);
      if (userId) {
        properties['Assignee'] = { people: [{ id: userId }] };
      }

      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      });

      created++;

      // Rate limit: 3 requests/second
      await new Promise(r => setTimeout(r, 350));
    } catch (error) {
      console.error(`Failed to create "${row.name}":`, error);
      failed++;
    }
  }

  console.log(`Import complete: ${created} created, ${failed} failed`);
}
```

## Example 2: Database Query with Complex Filters

Query a database with compound filters, pagination, and sorting.

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

interface TaskResult {
  id: string;
  name: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

async function getOverdueTasks(databaseId: string): Promise<TaskResult[]> {
  const allResults: TaskResult[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'Status',
            status: { does_not_equal: 'Done' },
          },
          {
            property: 'Due Date',
            date: { on_or_before: new Date().toISOString().split('T')[0] },
          },
          {
            property: 'Due Date',
            date: { is_not_empty: true },
          },
        ],
      },
      sorts: [
        { property: 'Priority', direction: 'ascending' },
        { property: 'Due Date', direction: 'ascending' },
      ],
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      if (!('properties' in page)) continue;

      const props = page.properties;
      const titleProp = props['Name'];
      const statusProp = props['Status'];
      const priorityProp = props['Priority'];
      const dateProp = props['Due Date'];

      allResults.push({
        id: page.id,
        name: titleProp.type === 'title' ? titleProp.title[0]?.plain_text ?? '' : '',
        status: statusProp.type === 'status' ? statusProp.status?.name ?? '' : '',
        priority: priorityProp.type === 'select' ? priorityProp.select?.name ?? '' : '',
        dueDate: dateProp.type === 'date' ? dateProp.date?.start ?? null : null,
      });
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return allResults;
}

// Usage
async function main() {
  const tasks = await getOverdueTasks('database-id-here');
  console.log(`Found ${tasks.length} overdue tasks:`);
  for (const task of tasks) {
    console.log(`  [${task.priority}] ${task.name} — due ${task.dueDate}`);
  }
}
```

## Example 3: Create a Professional Page with Rich Content

Build a formatted page using the block API.

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function createProjectPage(parentPageId: string, projectName: string) {
  const page = await notion.pages.create({
    parent: { page_id: parentPageId },
    icon: { type: 'emoji', emoji: '🚀' },
    properties: {
      title: [{ text: { content: projectName } }],
    },
    children: [
      // Hero callout
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [
            { text: { content: projectName }, annotations: { bold: true } },
            { text: { content: ' — Project overview, timeline, and team assignments.' } },
          ],
          icon: { type: 'emoji', emoji: '🚀' },
          color: 'blue_background',
        },
      },
      // Divider
      { object: 'block', type: 'divider', divider: {} },
      // Toggle heading: Overview
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📋 Overview' } }],
          is_toggleable: true,
          color: 'default',
        },
      },
      // Toggle heading: Timeline
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '📅 Timeline' } }],
          is_toggleable: true,
          color: 'default',
        },
      },
      // Toggle heading: Team
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '👥 Team' } }],
          is_toggleable: true,
          color: 'default',
        },
      },
      // Toggle heading: Risks
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '🚧 Risks & Blockers' } }],
          is_toggleable: true,
          color: 'default',
        },
      },
    ],
  });

  console.log(`Created page: ${page.id}`);
  return page;
}
```

## Example 4: Sync External Data to Notion Database

Keep a Notion database in sync with an external API.

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

interface ExternalItem {
  externalId: string;
  title: string;
  status: string;
  updatedAt: string;
}

async function syncToNotion(databaseId: string, items: ExternalItem[]) {
  // Step 1: Get existing entries mapped by external ID
  const existingMap = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      if (!('properties' in page)) continue;
      const extIdProp = page.properties['External ID'];
      if (extIdProp.type === 'rich_text' && extIdProp.rich_text[0]) {
        existingMap.set(extIdProp.rich_text[0].plain_text, page.id);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  let created = 0;
  let updated = 0;

  for (const item of items) {
    const existingPageId = existingMap.get(item.externalId);

    const properties: Record<string, any> = {
      Name: { title: [{ text: { content: item.title } }] },
      Status: { status: { name: item.status } },
      'External ID': { rich_text: [{ text: { content: item.externalId } }] },
      'Last Synced': { date: { start: new Date().toISOString() } },
    };

    if (existingPageId) {
      // Update existing entry
      await notion.pages.update({
        page_id: existingPageId,
        properties,
      });
      updated++;
    } else {
      // Create new entry
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      });
      created++;
    }

    await new Promise(r => setTimeout(r, 350)); // Rate limiting
  }

  console.log(`Sync complete: ${created} created, ${updated} updated`);
}
```

## Example 5: Generate Weekly Report from Database

Aggregate database data into a formatted report page.

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function generateWeeklyReport(
  taskDbId: string,
  reportParentId: string
) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStr = weekAgo.toISOString().split('T')[0];

  // Query completed tasks this week
  const completed = await notion.databases.query({
    database_id: taskDbId,
    filter: {
      and: [
        { property: 'Status', status: { equals: 'Done' } },
        { property: 'Last Edited', last_edited_time: { on_or_after: weekStr } },
      ],
    },
  });

  // Query in-progress tasks
  const inProgress = await notion.databases.query({
    database_id: taskDbId,
    filter: {
      property: 'Status',
      status: { equals: 'In Progress' },
    },
  });

  // Query blocked tasks
  const blocked = await notion.databases.query({
    database_id: taskDbId,
    filter: {
      property: 'Status',
      status: { equals: 'Blocked' },
    },
  });

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Build report blocks
  const children: any[] = [
    {
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          { text: { content: 'Weekly Status Report' }, annotations: { bold: true } },
          { text: { content: ` — ${formatDate(weekAgo)} to ${formatDate(now)}` } },
        ],
        icon: { type: 'emoji', emoji: '📊' },
        color: 'blue_background',
      },
    },
    { object: 'block', type: 'divider', divider: {} },
    // Summary
    {
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          { text: { content: `✅ ${completed.results.length} completed  ` } },
          { text: { content: `🔄 ${inProgress.results.length} in progress  ` } },
          { text: { content: `🔴 ${blocked.results.length} blocked` } },
        ],
        icon: { type: 'emoji', emoji: '📋' },
        color: 'gray_background',
      },
    },
    // Completed section
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '✅ Completed This Week' } }],
        is_toggleable: true,
      },
    },
  ];

  // Add completed task items
  for (const page of completed.results) {
    if (!('properties' in page)) continue;
    const titleProp = page.properties['Name'];
    const title = titleProp.type === 'title' ? titleProp.title[0]?.plain_text ?? 'Untitled' : 'Untitled';

    children.push({
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: [{ text: { content: title } }],
        checked: true,
      },
    });
  }

  // Create the report page
  const report = await notion.pages.create({
    parent: { page_id: reportParentId },
    icon: { type: 'emoji', emoji: '📊' },
    properties: {
      title: [{ text: { content: `Weekly Report — ${formatDate(now)}` } }],
    },
    children,
  });

  console.log(`Report created: ${report.id}`);
  return report;
}
```

## Example 6: Archive Completed Items

Move old completed items to an archive database.

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function archiveOldItems(
  sourceDatabaseId: string,
  archiveDatabaseId: string,
  daysOld: number = 30
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Find completed items older than cutoff
  const response = await notion.databases.query({
    database_id: sourceDatabaseId,
    filter: {
      and: [
        { property: 'Status', status: { equals: 'Done' } },
        {
          property: 'Last Edited',
          last_edited_time: { on_or_before: cutoffDate.toISOString() },
        },
      ],
    },
    page_size: 100,
  });

  let archived = 0;

  for (const page of response.results) {
    if (!('properties' in page)) continue;

    // Read properties from source
    const props = page.properties;
    const titleProp = props['Name'];
    const title = titleProp.type === 'title' ? titleProp.title[0]?.plain_text ?? '' : '';

    // Create in archive database
    await notion.pages.create({
      parent: { database_id: archiveDatabaseId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        'Archived From': { rich_text: [{ text: { content: 'Tasks' } }] },
        'Archive Date': { date: { start: new Date().toISOString().split('T')[0] } },
      },
    });

    // Archive (soft-delete) from source
    await notion.pages.update({
      page_id: page.id,
      archived: true,
    });

    archived++;
    await new Promise(r => setTimeout(r, 700)); // Two API calls per item
  }

  console.log(`Archived ${archived} items older than ${daysOld} days`);
}
```

## Example 7: Rate-Limited Request Helper

Reusable utility for handling Notion API rate limits.

```typescript
class NotionRateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;
  private readonly minDelay = 340; // ~3 requests per second

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error: any) {
          if (error?.status === 429) {
            const retryAfter = parseInt(error.headers?.['retry-after'] || '1');
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            try {
              const result = await fn();
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          } else {
            reject(error);
          }
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        await new Promise(r => setTimeout(r, this.minDelay));
      }
    }

    this.processing = false;
  }
}

// Usage
const limiter = new NotionRateLimiter();

async function bulkCreate(databaseId: string, items: string[]) {
  const results = await Promise.all(
    items.map(item =>
      limiter.execute(() =>
        notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            Name: { title: [{ text: { content: item } }] },
          },
        })
      )
    )
  );
  return results;
}
```
