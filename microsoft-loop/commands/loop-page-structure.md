---
name: loop-page-structure
description: Design a Loop page layout with optimal component placement — choose component types for the use case, define sections, specify column schemas for tables, and produce a ready-to-build page blueprint.
argument-hint: "<page-purpose> [--type <planning|standup|retro|decisions|onboarding|custom>] [--components <task-list|table|q-and-a|voting|progress>] [--team-size <count>]"
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
---

# Loop Page Structure Design

## Purpose
Design a detailed Loop page blueprint: section layout, component types, table column schemas,
and team collaboration patterns. Uses `references/loop-components.md` and `references/workspaces-pages.md`.

## Required Inputs
- Page purpose / use case (planning, standup, retrospective, decision log, onboarding, etc.)
- Team size (affects how many table columns / assignee fields to plan for)
- Which Loop component types to use
- How this page will be shared (embedded in Teams, Outlook, or standalone)

## Steps

### 1. Classify the Use Case

Map the page purpose to a page archetype:

| Archetype | Best Components | Typical Sections |
|---|---|---|
| **Sprint Planning** | Table, Task list, Paragraph | Goals, Backlog items, Capacity |
| **Standup** | Task list per day, Paragraph | Mon-Fri (daily sections) |
| **Retrospective** | Voting table × 2, Task list | What went well, Improve, Action items |
| **Decision Log** | Q&A, Table | Open questions, Decisions made |
| **Project Kickoff** | Paragraph, Table, Task list | Charter, Team contacts, Milestones |
| **Onboarding** | Numbered list, Task list, Table | Week 1/2/3 checklists, Resources |
| **Meeting Notes** | Paragraph, Task list | Agenda, Notes, Action items |
| **Risk Register** | Table | Risk, Likelihood, Impact, Owner, Mitigation |

### 2. Design Component Configuration

For each component on the page, specify:

**Task List configuration:**
- Who fills it out (everyone vs. specific owner)
- Column additions: assignee (yes/no), due date (yes/no), priority (yes/no)
- Estimated number of items
- Whether to embed as a standalone component or keep on-page

**Table column schema:**
Produce a table definition:
```
| Column Name | Type   | Options / Notes         |
|-------------|--------|-------------------------|
| Item        | Text   | Required — description  |
| Owner       | Person | M365 user picker        |
| Status      | Choice | Not started, In progress, Done |
| Due Date    | Date   | Date picker             |
| Priority    | Choice | High, Medium, Low       |
| Notes       | Text   | Optional free-form      |
```

**Q&A component:**
- Is it moderated (one "answer" per question) or open (multiple answers)?
- Should questions be pre-seeded (list the initial questions)?
- Visibility: workspace only or embed in external email?

**Voting table:**
- What options will be pre-populated?
- How many columns (one per team member or named choices)?
- Is there a deadline for voting?

### 3. Section Layout Blueprint

Produce a complete page blueprint:

```markdown
# [Page Title]

## [Section 1 — e.g., Goals]
[Loop task list: 3-5 sprint goals, one per row, owner + due date columns]

---

## [Section 2 — e.g., Backlog Items]
[Loop table: Item | Owner | Status | Story Points | Sprint | Notes]

---

## [Section 3 — e.g., Decisions Needed]
[Loop Q&A: pre-seed with 2-3 open questions from the team]

---

## [Section 4 — e.g., Links & Resources]
[Paragraph: design doc link, repo link, previous sprint link, team contacts]
```

### 4. Embedding Recommendations

Based on how the page will be shared:

**In Teams channel:**
- Create the most-used component (e.g., standup task list) as a standalone Loop component
- Share component link in the channel pinned message
- Also pin the full page as a Teams tab

**In Outlook:**
- For action-item tracking: embed the task list component in a recurring email
- For decision request: embed Q&A component so recipients answer inline

**Standalone Loop page:**
- No embedding needed — share the workspace link
- Set workspace permissions before sharing

### 5. Output

Deliver:
- Page purpose summary (1 paragraph)
- Section-by-section blueprint (headings + component types + column schemas)
- Component creation steps (in what order to create for optimal flow)
- Embedding instructions if applicable
- Tips for keeping the page useful long-term:
  - Archive completed task items weekly (move to "Done" section)
  - Limit tables to 200 rows for performance
  - Use "copy link" on high-value components for embedding rather than re-creating

```markdown
## Loop Page Blueprint — {pagePurpose}

**Page type:** {archetype}
**Use in workspace:** {workspaceName}
**Embedding:** {Teams / Outlook / Standalone}

### Sections

#### 1. {Section Name}
- Component: {type}
- Columns: {list}
- Pre-seeded with: {content}

#### 2. {Section Name}
...

### Component Creation Order
1. Create table first (most complex setup)
2. Create task list
3. Add Q&A component
4. Link all components in a paragraph at the top for navigation

### Embedding
- Copy link from component `...` menu → paste in Teams #{channelName}
- Or: Insert in Outlook compose → Loop component → select existing
```

## Quality Checks
- Each section has exactly one primary component (avoid multi-component confusion)
- Table column count ≤ 8 (more columns = horizontal scroll = poor UX)
- Task lists have assignee + due date columns if team accountability is needed
- Voting tables have options pre-seeded so team doesn't face a blank component
- Q&A has at least 2-3 seed questions to prompt participation
