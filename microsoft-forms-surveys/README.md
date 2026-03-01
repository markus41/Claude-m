# Microsoft Forms Surveys Plugin

A Claude Code knowledge plugin for Microsoft Forms via Graph API — create surveys, add questions (choice, text, rating, date, Likert), collect responses, and summarize results.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in the Microsoft Forms API so it can generate correct Graph API code for creating forms, adding question types, collecting responses, and producing result summaries. Ideal for quick team polls, customer feedback, onboarding checklists, or event RSVPs in small teams. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure authentication and verify Graph API access:

```
/setup              # Full guided setup
/setup --minimal    # Node.js dependencies only
```

## Graph API Permissions Required

| Permission | Type | Purpose |
|------------|------|---------|
| `Forms.Read` | Delegated | Read forms and responses |
| `Forms.ReadWrite` | Delegated | Create and modify forms and questions |

> **Note**: The Forms API uses the Microsoft Graph **beta** endpoint. Endpoints may change without notice.

## Commands

| Command | Description |
|---------|-------------|
| `/forms-create` | Create a new Microsoft Form with title and description |
| `/forms-add-questions` | Add questions to a form (choice, text, rating, date, Likert) |
| `/forms-results-summary` | Summarize responses with aggregated stats |
| `/forms-coverage-audit` | Compare plugin coverage against Forms beta documentation and endpoints |
| `/setup` | Configure Azure auth and verify Graph API access |

## Agent

| Agent | Description |
|-------|-------------|
| **Forms Survey Reviewer** | Reviews form configurations for question types, required fields, branching logic, and validation |

## Trigger Keywords

The skill activates automatically when conversations mention: `forms`, `surveys`, `polls`, `questionnaire`, `feedback form`, `microsoft forms`, `form responses`, `quiz`.

## Author

Markus Ahling


## Coverage against Microsoft documentation

| Feature domain | Coverage status | Evidence source |
|---|---|---|
| Form lifecycle and question authoring | Covered | SKILL question model reference + command set |
| Response retrieval and aggregation | Covered | `/forms-results-summary` + pagination guidance |
| Group-owned forms and beta change handling | Partial | Documented in SKILL, explicit gap review via `/forms-coverage-audit` |

Run `/forms-coverage-audit <form-id>` before implementing new survey scenarios so generated workflows stay aligned with current Graph beta behavior.
