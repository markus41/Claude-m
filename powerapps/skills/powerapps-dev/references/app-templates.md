# App Template Patterns

Complete app templates for canvas and model-driven apps. Each template provides a full project structure that can be scaffolded by the `/pa-app-create` or `/pa-mda-create` commands.

---

## Canvas App Templates

### Canvas CRUD

A three-screen create-read-update-delete app for a single data source.

**Screens:**

| Screen | Purpose | Key Controls |
|---|---|---|
| `scrList` | Browse records with search and sort | Gallery, TextInput (search), Button (new) |
| `scrDetail` | View a single record | DisplayForm, Button (edit), Button (delete), Button (back) |
| `scrEdit` | Create or edit a record | EditForm, Button (save), Button (cancel) |

**Data flow:**

```
scrList (Gallery.OnSelect)
  → Set(gblSelectedRecord, ThisItem)
  → Navigate(scrDetail)

scrDetail (btnEdit.OnSelect)
  → EditForm(frmEdit)
  → Navigate(scrEdit)

scrDetail (btnNew — on scrList header)
  → NewForm(frmEdit)
  → Navigate(scrEdit)

scrEdit (frmEdit.OnSuccess)
  → Back()

scrEdit (btnDelete.OnSelect)
  → IfError(Remove(...), Notify error)
  → Navigate(scrList)
```

**Key formulas:**

```
// Gallery Items — delegation-safe filter
galRecords.Items = SortByColumns(
    Filter(DataSource, IsBlank(txtSearch.Text) || StartsWith(PrimaryColumn, txtSearch.Text)),
    "PrimaryColumn", SortOrder.Ascending
)

// Edit form — error-safe submit
btnSave.OnSelect = SubmitForm(frmEdit)
frmEdit.OnSuccess = Notify("Saved.", NotificationType.Success); Back()
frmEdit.OnFailure = Notify("Error: " & frmEdit.Error, NotificationType.Error)

// Delete with confirmation
btnDelete.OnSelect = If(
    Confirm("Delete this record?"),
    IfError(
        Remove(DataSource, gblSelectedRecord),
        Notify("Delete failed: " & FirstError.Message, NotificationType.Error),
        Notify("Deleted.", NotificationType.Success); Navigate(scrList, ScreenTransition.UnCover)
    )
)
```

---

### Canvas Dashboard

A single-screen dashboard with KPI cards, a chart gallery, and a drill-down screen.

**Screens:**

| Screen | Purpose | Key Controls |
|---|---|---|
| `scrDashboard` | KPI cards and summary chart | Container (KPI row), Gallery (chart), Dropdown (time filter) |
| `scrDrillDown` | Detail view for a KPI or chart item | Gallery (detail records), Button (back) |

**Layout:**

```
┌──────────────────────────────────────────┐
│  Header: App Title + Time Period Filter  │
├──────────┬──────────┬──────────┬─────────┤
│  KPI 1   │  KPI 2   │  KPI 3   │  KPI 4  │
│  Count   │  Sum     │  Avg     │  Status │
├──────────┴──────────┴──────────┴─────────┤
│  Chart Gallery — grouped data rows       │
│  (OnSelect → navigate to drill-down)     │
└──────────────────────────────────────────┘
```

**Key formulas:**

```
// KPI card value — count from local collection (non-delegable, so pre-cache)
lblKPI1Value.Text = CountRows(colCachedData)
lblKPI2Value.Text = Text(Sum(colCachedData, Amount), "$#,##0")

// Time filter — reload data on change
drpTimePeriod.OnChange = ClearCollect(
    colCachedData,
    Filter(DataSource, CreatedDate >= DateAdd(Today(), -Value(drpTimePeriod.Selected.Value), TimeUnit.Days))
)

// Chart gallery — grouped data
galChart.Items = GroupBy(colCachedData, "Category", "GroupedRecords")
```

---

### Canvas Approval Workflow

A four-screen app for submitting and reviewing approval requests.

**Screens:**

| Screen | Purpose | Key Controls |
|---|---|---|
| `scrSubmit` | New request form | EditForm, Attachments, Button (submit) |
| `scrMyRequests` | List of user's requests with status badges | Gallery, Status badges (color-coded) |
| `scrApproval` | Pending approvals queue (for approvers) | Gallery (filtered to pending), Button (approve), Button (reject) |
| `scrRequestDetail` | Full request detail with history | DisplayForm, Gallery (approval history), TextInput (comments) |

**Status badge pattern:**

```
// Badge color based on status
lblStatusBadge.Fill = Switch(
    ThisItem.Status.Value,
    "Pending",  RGBA(255, 185, 0, 1),
    "Approved", RGBA(16, 124, 16, 1),
    "Rejected", RGBA(209, 52, 56, 1),
    RGBA(128, 128, 128, 1)
)
lblStatusBadge.Color = RGBA(255, 255, 255, 1)
lblStatusBadge.Text = ThisItem.Status.Value
```

**Approval action:**

```
btnApprove.OnSelect = IfError(
    Patch(
        Requests,
        gblSelectedRequest,
        {
            Status: {Value: "Approved"},
            ApprovedBy: User().Email,
            ApprovedDate: Now(),
            ApprovalComments: txtComments.Text
        }
    ),
    Notify("Approval failed: " & FirstError.Message, NotificationType.Error),
    Notify("Approved.", NotificationType.Success);
    Navigate(scrApproval, ScreenTransition.UnCover)
)
```

---

### Canvas Master-Detail

A single-screen side-by-side layout with a gallery on the left and a detail panel on the right.

**Screens:**

| Screen | Purpose | Key Controls |
|---|---|---|
| `scrMasterDetail` | Split view: gallery + detail | Horizontal container, Gallery (left), Container (detail right) |

**Layout:**

```
┌─────────────────┬────────────────────────────┐
│  Search          │  Detail Panel              │
│  ┌─────────────┐ │  Name: ___________         │
│  │ Item 1    > │ │  Phone: __________         │
│  │ Item 2    > │ │  City: ___________         │
│  │ Item 3  ◆  │ │                             │
│  │ Item 4    > │ │  [Edit]  [Delete]           │
│  └─────────────┘ │                             │
└─────────────────┴────────────────────────────┘
  width: 35%         width: 65%
```

**Key formulas:**

```
// Gallery in left panel
galMaster.Items = Filter(DataSource, StartsWith(PrimaryColumn, txtSearch.Text))

// Detail panel bound to gallery selection
lblDetailName.Text = galMaster.Selected.name
lblDetailPhone.Text = galMaster.Selected.telephone1

// Responsive widths using container fill portions
conLeftPanel.FillPortions = 35
conRightPanel.FillPortions = 65
```

---

### Canvas Blank

A minimal single-screen starting point.

**Screens:**

| Screen | Purpose | Key Controls |
|---|---|---|
| `scrMain` | Empty canvas | Header container, content container |

**Structure:**

```yaml
scrMain As screen:
  Properties:
    Fill: =RGBA(245, 245, 245, 1)
  Children:
    - conHeader As groupContainer:
        Properties:
          LayoutMode: =LayoutMode.Auto
          LayoutDirection: =LayoutDirection.Horizontal
          Height: =64
          Fill: =RGBA(0, 120, 212, 1)
          AlignItems: =LayoutAlignItems.Center
          PaddingLeft: =16
        Children:
          - lblTitle As label:
              Properties:
                Text: ="My App"
                Color: =RGBA(255, 255, 255, 1)
                Size: =22
                FontWeight: =FontWeight.Bold
    - conContent As groupContainer:
        Properties:
          LayoutMode: =LayoutMode.Auto
          LayoutDirection: =LayoutDirection.Vertical
          Padding: =16
```

---

## Model-Driven App Templates

### Model-Driven CRUD

A standard model-driven app for one or more Dataverse tables.

**Components:**

| Component | Description |
|---|---|
| Site Map | Area → Group → Sub-areas (one per table) |
| Main Form | Tabs with sections, all editable fields, related sub-grids |
| Quick Create Form | Compact form with required fields only |
| Active Records View | Default view filtered to active records |
| My Records View | Filtered to `ownerid = currentuser` |
| Recently Created View | Sorted by `createdon desc`, top 50 |

**Site map structure:**

```xml
<SiteMap>
  <Area Id="MainArea" Title="Main">
    <Group Id="DataGroup" Title="Data">
      <SubArea Id="sub_table1" Entity="cr_table1" Title="Table 1" />
      <SubArea Id="sub_table2" Entity="cr_table2" Title="Table 2" />
    </Group>
  </Area>
</SiteMap>
```

**Main form structure:**

```xml
<forms>
  <systemform>
    <tabs>
      <tab name="GeneralTab" labelid="General">
        <columns>
          <column width="100%">
            <sections>
              <section name="GeneralSection" label="General Information">
                <rows>
                  <row><cell><control id="cr_name" /></cell></row>
                  <row><cell><control id="cr_description" /></cell></row>
                  <row><cell><control id="cr_status" /></cell></row>
                </rows>
              </section>
            </sections>
          </column>
        </columns>
      </tab>
    </tabs>
  </systemform>
</forms>
```

---

### Model-Driven Service Desk

A multi-table model-driven app for IT service management.

**Tables:**

| Table | Purpose | Key Columns |
|---|---|---|
| `cr_ticket` | Service requests | Title, Description, Priority, Status, AssignedTo, Category |
| `cr_ticket_comment` | Comment thread on tickets | Ticket (lookup), Body, Author, Timestamp |
| `cr_kb_article` | Knowledge base articles | Title, Body, Category, Published |

**Components:**

| Component | Description |
|---|---|
| Business Process Flow | New → Triage → In Progress → Resolved → Closed |
| Business Rules | Auto-set priority based on category; lock fields after resolution |
| SLA | Response time targets by priority (P1: 1hr, P2: 4hr, P3: 1 business day) |
| Dashboard | Open tickets by priority, average resolution time, SLA compliance |

**Business rule example — auto-set priority:**

```xml
<BusinessRule name="AutoPriority">
  <Condition field="cr_category" operator="eq" value="Security Incident" />
  <Action type="SetValue" field="cr_priority" value="1" />
</BusinessRule>
```

**BPF stage definition:**

```xml
<BusinessProcessFlow name="TicketProcess" entity="cr_ticket">
  <Stage name="New" order="1">
    <Step attribute="cr_title" required="true" />
    <Step attribute="cr_description" required="true" />
    <Step attribute="cr_category" required="true" />
  </Stage>
  <Stage name="Triage" order="2">
    <Step attribute="cr_priority" required="true" />
    <Step attribute="cr_assignedto" required="true" />
  </Stage>
  <Stage name="InProgress" order="3">
    <Step attribute="cr_resolution_notes" required="false" />
  </Stage>
  <Stage name="Resolved" order="4">
    <Step attribute="cr_resolution_notes" required="true" />
    <Step attribute="cr_resolved_date" required="true" />
  </Stage>
</BusinessProcessFlow>
```

---

## Template Selection Guide

| Need | Template | App Type |
|---|---|---|
| Simple data entry and browsing | **Canvas CRUD** | Canvas |
| Executive summary with metrics | **Canvas Dashboard** | Canvas |
| Request/approval process | **Canvas Approval Workflow** | Canvas |
| Browse and inspect records in split view | **Canvas Master-Detail** | Canvas |
| Start from scratch | **Canvas Blank** | Canvas |
| Standard line-of-business app | **Model-Driven CRUD** | Model-Driven |
| IT help desk / service management | **Model-Driven Service Desk** | Model-Driven |

**Decision factors:**

- **Canvas** when you need custom UI, pixel-level control, or mobile-first design.
- **Model-Driven** when data model is complex, you need role-based security, or business process flows are required.
- **Canvas CRUD** is the default starting point for most data-entry scenarios.
- **Canvas Dashboard** when the primary use case is viewing aggregated data, not editing individual records.
