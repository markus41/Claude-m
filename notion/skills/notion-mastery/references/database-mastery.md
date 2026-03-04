# Database Mastery — Notion Databases

Complete reference for Notion database architecture: properties, views, relations, rollups, templates, linked databases, and automations.

## Database Fundamentals

A Notion database is a structured collection of pages. Each page (row) has properties (columns) that define its schema. Databases can be displayed in multiple views and linked across pages.

### Creating Databases

**Via MCP**:
- `notion-create-database` — Create with title, parent page, and property schema
- Properties defined as JSON objects with type and configuration

**Via API** (POST `/v1/databases`):
- Specify parent page, title, and properties object
- Each property has a type and type-specific configuration

### Inline vs Full-Page

- **Inline** (`inline="true"`) — Database appears directly on the page, fully visible
- **Full-page** (`inline="false"`) — Database appears as a sub-page link
- Toggle with the database `inline` attribute

## Property Types

### Text Properties

| Type | Description | Use Case |
|------|-------------|----------|
| **Title** | Required. Page name/title. One per database. | Primary identifier |
| **Rich Text** | Multi-line formatted text | Descriptions, notes |
| **URL** | Validated URL | Links, references |
| **Email** | Validated email address | Contact info |
| **Phone** | Phone number string | Contact info |

### Selection Properties

| Type | Description | Use Case |
|------|-------------|----------|
| **Select** | Single choice from predefined options | Status, category, priority |
| **Multi-select** | Multiple choices from predefined options | Tags, skills, labels |
| **Status** | Built-in status groups (To Do, In Progress, Done) | Workflow tracking |

**Status** has three groups: Not Started, In Progress, Complete. Each group can have multiple options. Status is special — it powers Kanban boards and progress tracking.

### Numeric & Date Properties

| Type | Description | Use Case |
|------|-------------|----------|
| **Number** | Numeric value with format options | Amounts, scores, quantities |
| **Date** | Date or date range with optional time | Deadlines, events, periods |
| **Checkbox** | Boolean true/false | Completion flags, toggles |

**Number formats**: Number, Number with commas, Percent, Dollar, Euro, Pound, Yen, Ruble, Rupee, Won, Yuan, Real, Lira, Rupiah, Franc, Krone, Shekel, Peso, Rand, Dirham

### People & File Properties

| Type | Description | Use Case |
|------|-------------|----------|
| **Person** | Workspace member reference | Assignee, owner, reviewer |
| **Files & Media** | File attachments | Documents, images |

### Computed Properties

| Type | Description | Use Case |
|------|-------------|----------|
| **Formula** | Computed from other properties | Calculations, derived values |
| **Relation** | Link to another database | Cross-referencing |
| **Rollup** | Aggregate data from relations | Summaries, totals |
| **Created time** | Auto-set on creation | Audit trail |
| **Created by** | Auto-set on creation | Attribution |
| **Last edited time** | Auto-updated on edit | Activity tracking |
| **Last edited by** | Auto-updated on edit | Attribution |
| **ID** | Auto-incrementing unique ID | Reference numbers |

### AI Properties

| Type | Description | Use Case |
|------|-------------|----------|
| **AI Autofill** | AI-generated based on page content | Summaries, categorization |

## Views

Views are different visual representations of the same database data. Each view can have its own filters, sorts, and visible properties.

### Table View

The default spreadsheet-like view. Best for:
- Data entry and bulk editing
- Comparing many properties across entries
- Sorting and filtering by any column
- Detailed data work

**Configuration**: Choose visible columns, column widths, wrap text, row height.

### Board View (Kanban)

Cards organized in columns by a Select, Status, or Multi-select property. Best for:
- Workflow management (To Do → In Progress → Done)
- Visual status tracking
- Drag-and-drop prioritization
- Sprint boards, sales pipelines

**Configuration**: Group by property, sub-group, card preview size, visible properties on cards.

### Calendar View

Entries plotted on a calendar by a Date property. Best for:
- Event scheduling
- Deadline tracking
- Content calendars
- Sprint planning

**Configuration**: Date property to use, visible properties, time zone.

### Timeline View (Gantt)

Entries shown as bars on a horizontal timeline. Best for:
- Project planning with start/end dates
- Resource allocation
- Dependency visualization
- Milestone tracking

**Configuration**: Start date, end date, table properties shown on left.

### Gallery View

Cards with cover images and selected properties. Best for:
- Visual content (design assets, products)
- Portfolio displays
- Recipe collections
- Team directory with photos

**Configuration**: Card preview (page cover, page content, or specific file property), card size, visible properties.

### List View

Compact list of page titles with minimal properties. Best for:
- Simple task lists
- Bookmarks and reading lists
- Quick reference
- Navigation menus

**Configuration**: Visible properties shown beside each title.

## Filters

Filters narrow which database entries are visible in a view.

### Filter Structure

Each filter has:
- **Property** — which column to filter on
- **Condition** — comparison operator
- **Value** — what to compare against

### Common Filter Conditions

| Property Type | Conditions |
|---------------|-----------|
| Text / Title | equals, does not equal, contains, does not contain, starts with, ends with, is empty, is not empty |
| Number | equals, does not equal, greater than, less than, greater than or equal, less than or equal, is empty, is not empty |
| Select | equals, does not equal, is empty, is not empty |
| Multi-select | contains, does not contain, is empty, is not empty |
| Date | equals, before, after, on or before, on or after, is within (past week, past month, next week, next month), is empty, is not empty |
| Checkbox | equals (true/false) |
| Person | contains, does not contain, is empty, is not empty |
| Status | equals, does not equal, is empty, is not empty |

### Compound Filters

Combine with **AND** (all conditions must match) or **OR** (any condition can match).

### API Filter Object

```json
{
  "filter": {
    "and": [
      {
        "property": "Status",
        "status": { "equals": "In Progress" }
      },
      {
        "property": "Due Date",
        "date": { "on_or_before": "2024-03-31" }
      }
    ]
  }
}
```

## Sorts

Order database entries by one or more properties.

```json
{
  "sorts": [
    { "property": "Priority", "direction": "ascending" },
    { "property": "Due Date", "direction": "ascending" }
  ]
}
```

**Sort directions**: `ascending` (A→Z, 1→9, oldest→newest) and `descending` (Z→A, 9→1, newest→oldest).

**Multiple sorts**: First sort is primary, subsequent sorts break ties.

## Relations

Relations link entries across two databases (or within the same database for self-relations).

### Types

- **One-way relation** — Only the source database shows the relation property
- **Two-way relation** — Both databases show relation properties linking to each other

### Creating Relations

**Via MCP** (`notion-create-database` or `notion-update-data-source`):
```json
{
  "properties": {
    "Related Tasks": {
      "type": "relation",
      "relation": {
        "database_id": "target-database-id",
        "type": "dual_property",
        "dual_property": {
          "synced_property_name": "Related Projects"
        }
      }
    }
  }
}
```

### Relation Patterns

**One-to-Many**: Project → Tasks (one project has many tasks)
- Project database has a relation to Tasks
- Each task links back to one project

**Many-to-Many**: Tasks ↔ Tags (tasks have multiple tags, tags apply to multiple tasks)
- Both databases show relation columns
- Entries can link to multiple entries in the other database

**Self-relation**: Task → Subtasks (within the same database)
- A database relates to itself
- Useful for parent-child hierarchies

## Rollups

Rollups aggregate data from related database entries.

### Configuration

1. **Relation property** — which relation to aggregate from
2. **Target property** — which property in the related database to aggregate
3. **Aggregation function** — how to compute the result

### Aggregation Functions

| Function | Input Types | Result |
|----------|-------------|--------|
| Count all | Any | Number of related entries |
| Count values | Any | Number of non-empty values |
| Count unique values | Any | Number of distinct values |
| Count empty | Any | Number of empty values |
| Count not empty | Any | Number of non-empty values |
| Percent empty | Any | Percentage empty |
| Percent not empty | Any | Percentage non-empty |
| Sum | Number | Total of all values |
| Average | Number | Mean of all values |
| Median | Number | Median value |
| Min | Number, Date | Smallest value |
| Max | Number, Date | Largest value |
| Range | Number | Max minus min |
| Earliest date | Date | Earliest date |
| Latest date | Date | Latest date |
| Date range | Date | Days between earliest and latest |
| Show original | Any | Raw list of values |
| Show unique | Any | Deduplicated list |
| Checked | Checkbox | Count of checked items |
| Unchecked | Checkbox | Count of unchecked items |
| Percent checked | Checkbox | Percentage checked |
| Percent unchecked | Checkbox | Percentage unchecked |

### Common Rollup Patterns

**Project progress**: Roll up task checkboxes → Percent checked
**Budget tracking**: Roll up expense amounts → Sum
**Next deadline**: Roll up task due dates → Earliest date
**Team workload**: Roll up assigned tasks → Count all

## Linked Databases

A linked database is a view of an existing database embedded in another page. It shares the same underlying data but can have its own filters, sorts, and visible properties.

### Creating Linked Databases

```
<database data-source-url="{{URL}}" inline="true">Filtered Tasks</database>
```

**Via MCP**: Use `notion-create-pages` with a database block referencing the data source URL.

### Use Cases

- **Dashboard page** — Show filtered views of multiple databases on one page
- **Team page** — Show only tasks assigned to a specific team
- **Sprint board** — Filtered view of tasks for the current sprint
- **Client portal** — Show only client-relevant entries

### Rules

- Linked databases share the same schema and data as the source
- Adding/editing entries in a linked view updates the source
- Each linked view can have independent filters, sorts, and visible properties
- You cannot add new properties to a linked database (only to the source)

## Database Templates

Templates are pre-built page structures for new database entries.

### Template Features

- Pre-filled property values
- Pre-built page content (headings, callouts, checklists)
- Multiple templates per database (user selects which to use)
- Default template for new entries

### Template Design Tips

- Include structural headings and toggles for consistency
- Pre-fill common properties (status = "Not Started", priority = "Medium")
- Add checklists for standard workflows
- Include callouts with instructions that users can delete

## Automations (Notion Buttons)

Database automations trigger actions based on conditions or user clicks.

### Button Properties

Buttons in database pages can:
- Update properties on the current page
- Create new pages in any database
- Open URLs
- Show confirmation dialogs

### Automation Triggers

- **Property change** — When a property value changes (e.g., status becomes "Done")
- **New page** — When a new entry is created
- **Manual** — User clicks a button

### Common Automation Patterns

- **Auto-set dates**: When status changes to "In Progress", set Start Date to today
- **Auto-assign**: When created, assign to the person who created it
- **Archive**: When status is "Done" for 30 days, move to archive database
- **Notifications**: When priority changes to "Urgent", notify the team lead

## Database Design Best Practices

### Schema Design

1. **Start minimal** — Add properties as needed, not upfront
2. **Use Status over Select for workflows** — Status has built-in groups and powers boards
3. **Name properties clearly** — "Due Date" not "Date", "Assignee" not "Person"
4. **Use formulas for derived data** — Don't manually maintain computed values
5. **Prefer relations over duplicate data** — Link databases instead of copy-pasting

### View Design

1. **Create purpose-specific views** — "My Tasks", "This Sprint", "All Tasks"
2. **Save filters per view** — Don't make users re-filter each time
3. **Hide irrelevant properties** — Each view shows only what's needed
4. **Use board view for workflows** — Kanban boards for status tracking
5. **Use calendar for date-centric data** — Events, deadlines, schedules

### Performance

1. **Limit properties to what's used** — Extra unused properties slow rendering
2. **Use simple formulas** — Complex nested formulas slow page load
3. **Avoid excessive rollups** — Each rollup queries related data on load
4. **Archive old entries** — Move completed items to an archive database periodically
5. **Use filters in linked databases** — Don't load entire databases when only showing a subset
