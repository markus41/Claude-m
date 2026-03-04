# Database Schemas — Production-Ready Notion Database Designs

Complete database schema definitions for common use cases. Use with `notion-create-database` MCP tool.

## Task Tracker

**Use case**: Team task management with sprint tracking and priority scoring.

### Schema

```json
{
  "Name": { "type": "title" },
  "Status": {
    "type": "status",
    "status": {
      "options": [
        { "name": "Backlog", "color": "default" },
        { "name": "To Do", "color": "gray" },
        { "name": "In Progress", "color": "blue" },
        { "name": "In Review", "color": "purple" },
        { "name": "Done", "color": "green" },
        { "name": "Blocked", "color": "red" }
      ]
    }
  },
  "Priority": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Urgent", "color": "red" },
        { "name": "High", "color": "orange" },
        { "name": "Medium", "color": "yellow" },
        { "name": "Low", "color": "green" }
      ]
    }
  },
  "Assignee": { "type": "people" },
  "Sprint": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Sprint 1", "color": "blue" },
        { "name": "Sprint 2", "color": "purple" },
        { "name": "Sprint 3", "color": "green" }
      ]
    }
  },
  "Due Date": { "type": "date" },
  "Estimate (hours)": { "type": "number", "number": { "format": "number" } },
  "Tags": {
    "type": "multi_select",
    "multi_select": {
      "options": [
        { "name": "Frontend", "color": "blue" },
        { "name": "Backend", "color": "green" },
        { "name": "Design", "color": "purple" },
        { "name": "Bug", "color": "red" },
        { "name": "Feature", "color": "yellow" },
        { "name": "Tech Debt", "color": "gray" }
      ]
    }
  },
  "Project": {
    "type": "relation",
    "relation": { "database_id": "projects-database-id" }
  },
  "Created": { "type": "created_time" },
  "Last Edited": { "type": "last_edited_time" }
}
```

### Recommended Views

- **Board**: Group by Status → Kanban workflow
- **My Tasks**: Filter by Assignee = Me, Sort by Priority
- **This Sprint**: Filter by Sprint = current, Group by Status
- **Overdue**: Filter by Due Date before today, Status != Done

### Formulas

**Days Until Due**:
```
if(empty(prop("Due Date")), "",
  let(days, dateBetween(prop("Due Date"), now(), "days"),
    if(days < 0, "🔴 " + format(abs(days)) + "d overdue",
      if(days == 0, "⚠️ Due today",
        if(days <= 3, "🟡 " + format(days) + "d",
          "🟢 " + format(days) + "d")))))
```

## CRM / Contact Database

**Use case**: Customer relationship management with deal pipeline.

### Contacts Schema

```json
{
  "Name": { "type": "title" },
  "Email": { "type": "email" },
  "Phone": { "type": "phone_number" },
  "Company": {
    "type": "relation",
    "relation": { "database_id": "companies-database-id" }
  },
  "Role": { "type": "rich_text" },
  "Type": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Lead", "color": "yellow" },
        { "name": "Prospect", "color": "orange" },
        { "name": "Customer", "color": "green" },
        { "name": "Partner", "color": "blue" },
        { "name": "Churned", "color": "red" }
      ]
    }
  },
  "Source": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Website", "color": "blue" },
        { "name": "Referral", "color": "green" },
        { "name": "Conference", "color": "purple" },
        { "name": "Cold Outreach", "color": "gray" },
        { "name": "Social Media", "color": "orange" }
      ]
    }
  },
  "Last Contact": { "type": "date" },
  "Notes": { "type": "rich_text" },
  "Deals": {
    "type": "relation",
    "relation": { "database_id": "deals-database-id" }
  },
  "Total Deal Value": {
    "type": "rollup",
    "rollup": {
      "relation_property_name": "Deals",
      "rollup_property_name": "Value",
      "function": "sum"
    }
  }
}
```

### Deals Schema

```json
{
  "Deal Name": { "type": "title" },
  "Stage": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Discovery", "color": "gray" },
        { "name": "Qualified", "color": "yellow" },
        { "name": "Proposal", "color": "orange" },
        { "name": "Negotiation", "color": "blue" },
        { "name": "Closed Won", "color": "green" },
        { "name": "Closed Lost", "color": "red" }
      ]
    }
  },
  "Value": { "type": "number", "number": { "format": "dollar" } },
  "Contact": {
    "type": "relation",
    "relation": { "database_id": "contacts-database-id" }
  },
  "Close Date": { "type": "date" },
  "Probability": { "type": "number", "number": { "format": "percent" } },
  "Owner": { "type": "people" },
  "Next Action": { "type": "rich_text" },
  "Created": { "type": "created_time" }
}
```

### Recommended Views

- **Pipeline Board**: Group Deals by Stage
- **My Deals**: Filter by Owner = Me
- **Closing This Month**: Filter by Close Date within current month
- **Contacts Gallery**: Gallery view with name, company, type

## Content Calendar

**Use case**: Marketing and editorial content planning.

### Schema

```json
{
  "Title": { "type": "title" },
  "Status": {
    "type": "status",
    "status": {
      "options": [
        { "name": "Idea", "color": "default" },
        { "name": "Outlined", "color": "gray" },
        { "name": "Writing", "color": "blue" },
        { "name": "Editing", "color": "purple" },
        { "name": "Ready", "color": "yellow" },
        { "name": "Published", "color": "green" },
        { "name": "Archived", "color": "red" }
      ]
    }
  },
  "Type": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Blog Post", "color": "blue" },
        { "name": "Newsletter", "color": "green" },
        { "name": "Social Media", "color": "purple" },
        { "name": "Video", "color": "red" },
        { "name": "Podcast", "color": "orange" },
        { "name": "Case Study", "color": "yellow" }
      ]
    }
  },
  "Author": { "type": "people" },
  "Publish Date": { "type": "date" },
  "Channel": {
    "type": "multi_select",
    "multi_select": {
      "options": [
        { "name": "Blog", "color": "blue" },
        { "name": "Twitter", "color": "default" },
        { "name": "LinkedIn", "color": "blue" },
        { "name": "YouTube", "color": "red" },
        { "name": "Newsletter", "color": "green" }
      ]
    }
  },
  "Topic": {
    "type": "multi_select",
    "multi_select": {
      "options": [
        { "name": "Product", "color": "purple" },
        { "name": "Engineering", "color": "blue" },
        { "name": "Culture", "color": "yellow" },
        { "name": "Tutorial", "color": "green" },
        { "name": "News", "color": "gray" }
      ]
    }
  },
  "URL": { "type": "url" },
  "Word Count": { "type": "number", "number": { "format": "number" } },
  "AI Summary": {
    "type": "ai_autofill",
    "ai_autofill": { "prompt": "Summarize this content piece in 1-2 sentences" }
  }
}
```

### Recommended Views

- **Calendar**: Publish Date on calendar view
- **Board**: Group by Status
- **By Author**: Filter by Author, Sort by Publish Date
- **Published**: Filter by Status = Published, Sort by date descending

## Bug Tracker

**Use case**: Software bug tracking with severity and resolution workflow.

### Schema

```json
{
  "Title": { "type": "title" },
  "Severity": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Critical", "color": "red" },
        { "name": "Major", "color": "orange" },
        { "name": "Minor", "color": "yellow" },
        { "name": "Trivial", "color": "gray" }
      ]
    }
  },
  "Status": {
    "type": "status",
    "status": {
      "options": [
        { "name": "New", "color": "red" },
        { "name": "Triaged", "color": "orange" },
        { "name": "In Progress", "color": "blue" },
        { "name": "Fixed", "color": "green" },
        { "name": "Verified", "color": "green" },
        { "name": "Won't Fix", "color": "gray" },
        { "name": "Duplicate", "color": "gray" }
      ]
    }
  },
  "Assignee": { "type": "people" },
  "Reporter": { "type": "people" },
  "Component": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Frontend", "color": "blue" },
        { "name": "Backend", "color": "green" },
        { "name": "Mobile", "color": "purple" },
        { "name": "Infrastructure", "color": "orange" },
        { "name": "Database", "color": "yellow" }
      ]
    }
  },
  "Environment": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Production", "color": "red" },
        { "name": "Staging", "color": "yellow" },
        { "name": "Development", "color": "green" }
      ]
    }
  },
  "Steps to Reproduce": { "type": "rich_text" },
  "Related Task": {
    "type": "relation",
    "relation": { "database_id": "tasks-database-id" }
  },
  "Reported Date": { "type": "created_time" },
  "Resolved Date": { "type": "date" },
  "ID": { "type": "unique_id", "unique_id": { "prefix": "BUG" } }
}
```

### Recommended Views

- **Triage Board**: Filter Status = New, Sort by Severity
- **My Bugs**: Filter Assignee = Me, Status != Fixed/Verified
- **Critical Bugs**: Filter Severity = Critical, Status != Fixed
- **Resolution Timeline**: Timeline view with Reported Date → Resolved Date

## Knowledge Base / Documentation

**Use case**: Internal documentation and reference wiki.

### Schema

```json
{
  "Title": { "type": "title" },
  "Category": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Getting Started", "color": "green" },
        { "name": "How-To Guide", "color": "blue" },
        { "name": "Reference", "color": "purple" },
        { "name": "Troubleshooting", "color": "orange" },
        { "name": "FAQ", "color": "yellow" },
        { "name": "Architecture", "color": "red" }
      ]
    }
  },
  "Tags": {
    "type": "multi_select",
    "multi_select": {
      "options": [
        { "name": "API", "color": "blue" },
        { "name": "Frontend", "color": "purple" },
        { "name": "Backend", "color": "green" },
        { "name": "DevOps", "color": "orange" },
        { "name": "Security", "color": "red" },
        { "name": "Database", "color": "yellow" }
      ]
    }
  },
  "Owner": { "type": "people" },
  "Last Reviewed": { "type": "date" },
  "Status": {
    "type": "select",
    "select": {
      "options": [
        { "name": "Draft", "color": "gray" },
        { "name": "Published", "color": "green" },
        { "name": "Needs Update", "color": "yellow" },
        { "name": "Deprecated", "color": "red" }
      ]
    }
  },
  "Verified": { "type": "checkbox" },
  "AI Summary": {
    "type": "ai_autofill",
    "ai_autofill": { "prompt": "Summarize this documentation page in 1-2 sentences for search results" }
  },
  "Created": { "type": "created_time" },
  "Last Edited": { "type": "last_edited_time" }
}
```

### Recommended Views

- **Gallery**: Card preview with title, category, summary
- **By Category**: Group by Category
- **Needs Review**: Filter Last Reviewed > 90 days ago or Status = Needs Update
- **Search**: Table view with all properties visible for filtering
