# Microsoft Loop — Loop Components

## What Is a Loop Component?

A Loop component is a **portable, live content block** that:
- Is created once, embedded everywhere
- Stays in sync across all surfaces in real time (Teams, Outlook, OneNote, Word, Loop app)
- Can be edited by anyone with access, directly in the surface where it's embedded
- Survives context switches — the same component in a Teams chat is identical to the one in an Outlook email

Components are stored as `.fluid` files in the creator's OneDrive for Business.
The **Loop component link** (`https://loop.microsoft.com/r/c/...`) is what gets shared.

---

## Component Types

### Task List

The most-used Loop component. Supports:
- Assignee (person field)
- Due date (date picker)
- Priority (choice field)
- Check/uncheck completion

**Best for:** Action items from meetings, shared todo lists, project task tracking.

**Create in Loop app:**
1. Open any Loop page → Insert → Task list
2. Copy link → paste in Teams/Outlook

**In Teams:** Pasted link renders as live task list. Team members check off items inline.

---

### Table

A structured data component with typed columns:

| Column type | Data |
|---|---|
| Text | Free-form string |
| Number | Numeric values with optional formatting |
| Date | Date picker |
| Person | M365 user picker (resolves to AAD user) |
| Choice | Dropdown options (predefined list) |
| Yes/No | Boolean toggle |
| URL | Clickable link |

**Best for:** Tracking multiple items across dimensions (resource tracker, risk register, feature matrix).

**Design tip:** Keep tables under 10 columns — more than that, use a shared Excel or Fabric table.

---

### Voting Table

A special table where each row is a proposal and columns are team members.
Each person clicks their column to vote. Tally is visible to all.

**Best for:** Retrospective action prioritization, feature ranking, decision making.

---

### Q&A

Displays a question at the top; team members add answers in threaded replies below.
Can be used for FAQ pages, decision logs, or async discussions.

**Best for:** Capturing decisions with rationale, FAQ for a project, open issues tracking.

---

### Progress Tracker

A table variant with a built-in status column (Not started, In progress, Blocked, Done).
Color-coded rows update in real time as statuses change.

**Best for:** Project milestone tracking, release readiness, onboarding checklists.

---

### Paragraph / Rich Text

A portable rich text block. Supports:
- Bold, italic, underline, code
- Headings (H1-H3)
- Hyperlinks
- Bullet and numbered lists

**Best for:** Shared definitions, team agreements, policy text that appears on multiple pages.

---

### Bulleted / Numbered List

A simple shared list component. All collaborators can add/remove items.

**Best for:** Meeting notes bullet points, shared grocery/feature wish lists.

---

## Creating a Component

### From the Loop App

1. Open a workspace page.
2. Click `+` (Insert block) → choose component type.
3. Click the `...` menu on the component → **Copy link**.
4. Paste the link in Teams, Outlook, or OneNote.

### From Teams

In any Teams chat or channel message compose box:
- Click the **Loop** icon (∞) in the toolbar.
- Choose component type → creates a new component and inserts it inline.

### From Outlook

In Outlook compose (new email or reply):
- Insert tab → **Loop Component** → choose type.
- Component is embedded in the email body.

---

## Embedding Patterns

### Teams Chat / Channel

When a Loop component link is pasted into a Teams message:
- Teams auto-unfurls it into a live, editable card.
- Anyone in the conversation can edit inline (subject to workspace permissions).
- Edits made in Teams are immediately reflected in the Loop app and Outlook.

**Best practice:** Pin high-traffic components (daily standup task list) as a tab in the Teams channel.

### Outlook Email

Loop components embedded in Outlook emails:
- Render as live cards in the reading pane.
- Editable by anyone who has been granted access.
- Recipients without Loop license see a static read-only view.

**Gotcha:** Loop components in Outlook require the recipient to have an Exchange Online mailbox in
the same Microsoft 365 tenant OR a supported guest configuration. External recipients cannot
edit components.

### OneNote

Paste a Loop component link into a OneNote page — it renders as an embedded live component.
Supports all component types (task list, table, voting, Q&A).

### Word (Desktop + Web)

Copy a Loop component link → paste in Word document → renders as a live object.
Available in Word for the web and modern desktop Word (M365 subscription required).

---

## Sharing and Permissions

Loop components inherit permissions from the workspace where they were created.
When sharing a component link externally:

| Recipient | Can edit | Can view |
|---|---|---|
| Workspace member | Yes | Yes |
| Anyone with link (if enabled) | Yes (if link type = edit) | Yes |
| Guest user (if guests enabled) | Depends on workspace guest policy | Yes |
| External (different tenant) | No (tenant boundary) | Read-only via web |

### Changing Component Sharing

In the Loop app:
- `...` menu on component → **Sharing settings**
- Options: `Workspace members only`, `Anyone with the link (view)`, `Anyone with the link (edit)`

Via Graph API — components are files in OneDrive; use standard sharing API:
```http
POST https://graph.microsoft.com/v1.0/drives/{driveId}/items/{componentItemId}/createLink
Content-Type: application/json

{
  "type": "edit",
  "scope": "organization"
}
```

---

## Component Lifecycle

```
Create → Embed (share link) → Collaborate (real-time sync) → Archive / Delete
```

**Archiving:** No built-in archive — move the source `.fluid` file to an archive folder in OneDrive.
All embedded links still work but the file is now in the archive location.

**Deleting:** Delete the `.fluid` file in OneDrive → all embeds show "This content was removed."
Recoverable from OneDrive Recycle Bin within 93 days.

---

## Power Automate — Component Automation

Loop components don't have direct API creation (content is Fluid-framework managed), but
automation patterns include:

| Pattern | Implementation |
|---|---|
| Notify team when component is modified | Power Automate: SharePoint trigger on `.fluid` file change → Teams notification |
| Create component on project creation | Deep link to Loop with template parameter |
| Archive old components | Power Automate: Move `.fluid` files older than 90 days to archive folder |
| Snapshot component content | Graph API: Export `.fluid` file content to SharePoint list item |

**Power Automate trigger:** "When a file is created or modified (SharePoint)" on the OneDrive drive
backing the workspace — filter for `.fluid` files.

---

## Teams App Integration

Loop components can be surfaced as **Teams tabs** (static tabs pinned to a channel):

1. In Teams channel → `+` Add tab → **Loop**.
2. Select an existing workspace or page.
3. The tab renders the Loop page/component directly in Teams.

**Programmatic tab creation via Teams Graph API:**

```http
POST https://graph.microsoft.com/v1.0/teams/{teamId}/channels/{channelId}/tabs
Content-Type: application/json

{
  "displayName": "Sprint Planning",
  "teamsApp@odata.bind": "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/0d820ecd-def2-4297-adad-78056cde7c78",
  "configuration": {
    "entityId": "{loopPageId}",
    "contentUrl": "https://loop.microsoft.com/r/s/{encodedWorkspaceId}",
    "websiteUrl": "https://loop.microsoft.com/r/s/{encodedWorkspaceId}",
    "removeUrl": "https://loop.microsoft.com/r/s/{encodedWorkspaceId}"
  }
}
```

---

## Component Usage Analytics

No native analytics API for Loop component usage. Proxy approaches:
- Monitor `.fluid` file modification events via SharePoint/OneDrive audit logs
- Use Microsoft 365 Audit Log (Purview) → search for `LoopComponentCreated`, `LoopComponentModified`
- Microsoft 365 Usage Reports (Graph API) — no Loop-specific report as of 2026; check for updates

```http
GET https://graph.microsoft.com/v1.0/reports/getOffice365ActiveUserDetail(period='D30')
```

---

## Limits

| Resource | Limit |
|---|---|
| Component file size | 50 MB per `.fluid` file |
| Components per page | No published limit (practical limit ~20 before performance degrades) |
| Real-time collaborators | Up to 100 simultaneous editors per component |
| Component link expiry | Never (permanent, unless deleted) |
| Embed locations | Teams, Outlook, OneNote, Word, Loop app (5 surfaces) |

---

## Error Codes / Known Issues

| Issue | Cause | Fix |
|---|---|---|
| "This component isn't available" in Teams | Loop app permission policy disabled for user | Enable in Teams admin center → App permission policies |
| Component shows read-only in Outlook | Recipient is external or Loop in Outlook not enabled | Enable Loop in Outlook in M365 admin center |
| Component link returns 404 | Source `.fluid` file was deleted | Restore from OneDrive Recycle Bin |
| "Sign in required" for guest | Guest access not enabled on workspace | Enable guest access in Loop admin settings |
| Edits not syncing | Fluid framework connectivity issue | Check network / tenant Loop service health in M365 admin center |
| Loop tab missing in Teams `+` menu | Loop app not approved for tenant | Approve Microsoft Loop in Teams admin center → Manage apps |

---

## Production Gotchas

- **Component links are permanent** — once shared, a Loop component link never expires.
  If sensitive content is in a component, manage access via workspace permissions, not link expiry.
- **`.fluid` files in OneDrive** — Loop components are stored in the creator's OneDrive for Business
  under `Microsoft Loop` folder. If the creator leaves the org, components are orphaned.
  Mitigate by creating components from a shared workspace, not from personal context.
- **No component-level version history in UI** — version history is available via OneDrive file
  version history on the `.fluid` file (Graph API or OneDrive web).
- **External sharing boundary** — Loop components cannot be edited across tenant boundaries.
  Cross-tenant collaboration must use SharePoint or Teams guest access at the document level.
- **Loop in Outlook requires Exchange Online** — on-premises Exchange or hybrid configurations
  cannot render Loop components in Outlook.
