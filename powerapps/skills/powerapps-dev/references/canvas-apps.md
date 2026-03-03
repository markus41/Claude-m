# Canvas Apps Reference

## Overview

Canvas apps give makers full pixel-level control over UI layout. Screens, controls, and formulas are combined to create apps that connect to Dataverse, SharePoint, SQL, and hundreds of other connectors. This reference covers the PAC CLI workflow, screen navigation patterns, Gallery control wiring, Patch-based Dataverse writes, form submission, delegation limits, offline patterns, and ALM export/import.

---

## PAC CLI — App Lifecycle Commands

> **Format deprecation notice**: The `.fx.yaml` source format produced by `pac canvas unpack` is **retired**. Microsoft's current active format is **`.pa.yaml`** (Source Code v3.0), used with Power Platform Git Integration. For the current format reference, see [`references/canvas-app-source.md`](./canvas-app-source.md). The commands below still work for legacy `.fx.yaml` projects but new apps should use `.pa.yaml` with Git Integration.

| Command | Purpose |
|---|---|
| `pac auth create --environment <env-url>` | Authenticate against a Power Platform environment |
| `pac solution init --publisher-name <name> --publisher-prefix <prefix>` | Initialize a new solution folder |
| `pac solution add-reference --path <project.cdsproj>` | Add a project reference to the solution |
| `pac canvas pack --msapp <output.msapp> --sources <src-dir>` | Pack `.fx.yaml` source files into an `.msapp` binary (legacy workflow) |
| `pac canvas unpack --msapp <input.msapp> --sources <src-dir>` | Unpack an `.msapp` into `.fx.yaml` source files (legacy workflow) |
| `pac canvas download --environment <env-url> --name "AppName" --outputDirectory <dir>` | Download a canvas app's source files from an environment |
| `pac canvas validate --path <src-dir>` | Validate `.pa.yaml` or `.fx.yaml` source files for errors |
| `pac canvas validate --msapp <file.msapp>` | Validate a packed `.msapp` file |
| `pac solution export --path <solution.zip> --name <SolutionName> --managed false` | Export an unmanaged solution |
| `pac solution import --path <solution.zip>` | Import a solution into the connected environment |
| `pac solution publish` | Publish all customizations in the environment |
| `pac canvas create --msapp <output.msapp> --name "MyApp" --environment <env-url>` | Create a new blank canvas app |

**Unpack directory structure — `.fx.yaml` (legacy, from `pac canvas unpack`):**
```
src/
  App.fx.yaml         # App-level formulas, OnStart, Formulas
  Screens/
    HomeScreen.fx.yaml
    DetailScreen.fx.yaml
  CanvasManifest.json # App metadata (name, icon, screen order)
  Connections/        # Connection references
  Assets/
    Images/
```

**Source directory structure — `.pa.yaml` (current, for Git Integration):**
```
src/
  App.pa.yaml         # App-level properties, StartScreen, named formulas
  Screens/
    HomeScreen.pa.yaml
    DetailScreen.pa.yaml
  DataSources/        # Data source connection metadata
  Components/         # Custom component definitions
  Assets/
    Images/
```

For full `.pa.yaml` schema documentation, control type catalog, and examples, see [`references/canvas-app-source.md`](./canvas-app-source.md).

---

## Screen Navigation Patterns

### Navigate with Context
```powerapps
// Navigate to DetailScreen and pass a record as context
Navigate(
    DetailScreen,
    ScreenTransition.Fade,
    { selectedRecord: Gallery1.Selected }
)
```

### Back Navigation with Confirmation
```powerapps
// Button OnSelect — ask before leaving unsaved changes
If(
    IsEmpty(Errors(DataSource)),
    Back(),
    If(
        Confirm("You have unsaved changes. Leave anyway?"),
        Back()
    )
)
```

### Multi-Screen Wizard Pattern
```powerapps
// Set wizard step in global var; navigate to single WizardScreen
Set(gblWizardStep, 1);
Navigate(WizardScreen, ScreenTransition.None)

// WizardScreen shows different containers based on gblWizardStep
// Container1.Visible = gblWizardStep = 1
// Container2.Visible = gblWizardStep = 2
```

### Screen Transition Types
| Transition | Value | Description |
|---|---|---|
| None | `ScreenTransition.None` | Instant switch — fastest |
| Fade | `ScreenTransition.Fade` | Cross-fade — smooth |
| Cover | `ScreenTransition.Cover` | New screen slides in |
| CoverRight | `ScreenTransition.CoverRight` | Slides in from right |
| UnCover | `ScreenTransition.UnCover` | Old screen slides away |

---

## Gallery Control Patterns

### Basic Dataverse Gallery
```powerapps
// Gallery.Items property — delegable filter
Filter(
    Accounts,
    StartsWith(name, txtSearch.Text)
)
```

### Gallery with Sort and Search
```powerapps
// Gallery.Items — combined search + sort (fully delegable on Dataverse)
SortByColumns(
    Filter(
        Accounts,
        IsBlank(txtSearch.Text) || StartsWith(name, txtSearch.Text)
    ),
    "name",
    If(tglSortDesc.Value, SortOrder.Descending, SortOrder.Ascending)
)
```

### Gallery Selection Pattern
```powerapps
// Set selectedItem on gallery row tap (gallery OnSelect)
Set(gblSelectedAccount, ThisItem)

// Detail form uses the global variable
DetailForm.Item = gblSelectedAccount
```

### Nested Gallery (Sub-records)
```powerapps
// Inner gallery Items — filter by parent gallery's selected item
Filter(
    Contacts,
    'Account Name'.account = Gallery1.Selected.accountid
)
```

### Gallery Performance Tips
- Set `Gallery.LoadingSpinner = LoadingSpinner.Data` to show loading indicator.
- Use `Gallery.TemplateSize` to fix row height — dynamic sizing causes layout recalculation on every render.
- For large datasets, page with `Gallery.AllItems` count; use a `FirstN`/`LastN` slice on a cached collection.

---

## Patch Function — Dataverse CRUD

### Create a New Record
```powerapps
// Patch with Defaults() creates a new record
Patch(
    Accounts,
    Defaults(Accounts),
    {
        name: txtName.Text,
        telephone1: txtPhone.Text,
        'Account Source': 'Account Source'.Web
    }
)
```

### Update an Existing Record
```powerapps
// Patch with an existing record object updates in-place
Patch(
    Accounts,
    Gallery1.Selected,
    {
        telephone1: txtPhone.Text,
        address1_city: txtCity.Text
    }
)
```

### Batch Patch with ForAll
```powerapps
// Write a local collection to Dataverse in one ForAll loop
ForAll(
    colPendingItems,
    Patch(
        Opportunities,
        Defaults(Opportunities),
        {
            name: ThisRecord.title,
            estimatedvalue: ThisRecord.amount,
            'Potential Customer': LookUp(Accounts, name = ThisRecord.accountName)
        }
    )
)
```

### Error-Safe Patch Pattern
```powerapps
// Wrap in IfError; collect failures for review
ClearCollect(colPatchErrors, []);
ForAll(
    colPendingItems,
    IfError(
        Patch(Opportunities, Defaults(Opportunities), ThisRecord),
        Collect(colPatchErrors, { item: ThisRecord, error: FirstError.Message })
    )
);
If(
    !IsEmpty(colPatchErrors),
    Notify("Some records failed to save. Check the error list.", NotificationType.Error),
    Notify("All records saved successfully.", NotificationType.Success)
)
```

---

## Form Control — Submit and Reset

### EditForm Submission
```powerapps
// Submit button OnSelect
SubmitForm(EditForm1);

// EditForm.OnSuccess — navigate after save
Navigate(HomeScreen, ScreenTransition.Fade)

// EditForm.OnFailure — show error
Notify("Save failed: " & EditForm1.Error, NotificationType.Error)
```

### Form Mode Switching
```powerapps
// New record form
NewForm(EditForm1)

// Edit existing record
EditForm(EditForm1)

// Set form item before editing
Set(gblEditItem, Gallery1.Selected);
EditForm(EditForm1);
Navigate(EditScreen, ScreenTransition.Cover)

// Reset form to discard changes
ResetForm(EditForm1)
```

### Custom Field Validation Before Submit
```powerapps
// Validate before submitting
If(
    IsBlank(txtName.Text),
    Notify("Name is required.", NotificationType.Warning),
    If(
        !IsMatch(txtEmail.Text, Match.Email),
        Notify("Please enter a valid email address.", NotificationType.Warning),
        SubmitForm(EditForm1)
    )
)
```

---

## Delegation Warnings and Limits

### Delegation Limit Table

| Data Source | Default Row Limit | Max Configurable | Notes |
|---|---|---|---|
| SharePoint | 500 | 2,000 | Set in App Settings > Data row limit |
| Dataverse | 500 | 2,000 | Best delegation support overall |
| SQL Server | 500 | 2,000 | Delegation on filter/sort |
| Excel (OneDrive) | 500 | 2,000 | No delegation — all local |
| Common Data Model | 500 | 2,000 | Full delegation via OData |

**Warning**: The yellow triangle delegation warning appears in Power Apps Studio when a formula cannot be fully delegated. The app will silently truncate results to the row limit.

### Delegation-Safe Function Alternatives

| Non-Delegable (avoid on large sets) | Delegable Alternative |
|---|---|
| `CountRows(Filter(...))` | Use Dataverse `$count` OData query or accept limit |
| `Sum(Filter(...), column)` | Use a Power Automate flow to aggregate server-side |
| `Distinct(Table, column)` | Pre-compute distinct values in a helper collection at startup |
| `First(Sort(Table, col))` | `LookUp(Table, true, col)` — delegable on Dataverse |
| `AddColumns` on data source | Project columns with `ShowColumns` or `$select` in OData |

### OData $select to Reduce Payload
```powerapps
// Use OData $select to fetch only needed columns — reduces payload and delegation issues
ClearCollect(
    colAccountsLite,
    ShowColumns(
        Filter(Accounts, statuscode = 1),
        "accountid", "name", "telephone1", "address1_city"
    )
)
```

---

## Offline Mode

### Offline Detection
```powerapps
// Check connectivity state
If(
    Connection.Connected,
    "Online",
    "Offline — changes will sync when reconnected"
)
```

### Offline-First Pattern
```powerapps
// App.OnStart — load data into collection; works offline from cache
If(
    Connection.Connected,
    ClearCollect(colAccounts, Filter(Accounts, statuscode = 1)),
    // Else: colAccounts retains its last cached state from SaveData
    LoadData(colAccounts, "AccountsCache", true)
);

// Save collection to local device storage for offline use
SaveData(colAccounts, "AccountsCache")
```

### Sync Queue
```powerapps
// When user is offline, queue changes to colOfflineQueue
Collect(colOfflineQueue, {
    operation: "create",
    table: "incident",
    data: { title: txtTitle.Text, description: txtDesc.Text },
    timestamp: Now()
});
SaveData(colOfflineQueue, "OfflineQueue");
Notify("Saved locally. Will sync when online.", NotificationType.Information)
```

### SaveData / LoadData Limits

| Resource | Limit | Notes |
|---|---|---|
| SaveData storage per app | 1 MB | Total across all saved collections in the app |
| LoadData item count | No hard limit | Performance degrades above ~5,000 records |
| Supported control types | All canvas controls | Not available in Teams Power Apps tab |

---

## ALM Export and Import

### Export App Standalone
```powershell
# Export a canvas app as .msapp via PowerShell (Power Apps admin module)
Add-PowerAppsAccount
$app = Get-PowerApp -AppName "MyApp"
Get-PowerAppVersion -AppName $app.AppName | Export-PowerApp -Path ./MyApp.msapp
```

### Solution Export (Recommended for ALM)
```bash
# Export solution containing the app
pac solution export \
  --path ./solutions/MyApp_1_0_0_1.zip \
  --name MyAppSolution \
  --managed false

# Import to target environment
pac solution import \
  --path ./solutions/MyApp_1_0_0_1.zip \
  --environment https://target.crm.dynamics.com
```

### Environment Variables in Canvas Apps

Environment variables allow app configuration to differ per environment without modifying the app.

```powerapps
// Reference environment variable in a formula
// The variable schema name is used directly as a named parameter
// Use the 'Param' function pattern via a site setting or connector
// Best approach: store env var values in a Dataverse table and load at startup

ClearCollect(
    colConfig,
    Filter(cr_appsettings, cr_environment = "production")
);
Set(gblApiBaseUrl, LookUp(colConfig, cr_key = "ApiBaseUrl", cr_value))
```

**Proper environment variable reference via Power Automate**: Create a scheduled or manually triggered flow that reads the environment variable and returns its value to the app. The app calls the flow on startup.

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| Delegation warning (yellow triangle) | Formula not fully delegable — results capped at row limit | Rewrite formula using delegable functions or move aggregation to Power Automate |
| `Error in SubmitForm` | Form field validation failed or data source error | Check `EditForm1.Error` for message; verify required fields and data types |
| `Notify — 403 Forbidden` from Patch | User lacks Dataverse security role to write to the table | Assign appropriate security role in the Power Platform admin center |
| `Connection timeout` | Data source unreachable or slow network | Implement `IfError` with a retry flag; check connector service health |
| `SaveData — QuotaExceeded` | 1 MB local storage limit exceeded | Reduce collection size; remove unused columns with `ShowColumns` |
| `ForAll — partial failure` | Some records in batch Patch failed | Check `Errors(DataSource)` after the ForAll; collect failures to `colErrors` |
| `Gallery — empty due to delegation` | Row limit reached before returning matching records | Add explicit `Filter` to reduce dataset before displaying in gallery |
| `ParseJSON — missing field` | Expected JSON key not present | Use `IsBlank` check after parse; provide default values |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Controls per screen | 500 | Performance degrades above ~200; split to multiple screens |
| Screens per app | No hard limit | Performance degrades above ~50 screens |
| App size (uncompressed) | 200 MB | Includes media assets; compress images |
| Collections (total size in memory) | 128 MB | Per app session |
| ForAll concurrent calls | 1 (sequential by default) | Use `Concurrent` for parallel independent calls |
| Max data row limit (configurable) | 2,000 | In App Settings; does not affect delegation |
| Component library size | 200 MB (shared with app) | Published separately; versioned |
| Environment variables per solution | 200 | Hard platform limit |
| Named formulas (App.Formulas) | No hard limit | Evaluated lazily; recommended over OnStart |
| Offline SaveData storage | 1 MB per app | Across all SaveData calls in the app |

---

## Common Patterns and Gotchas

### Use App.Formulas Instead of OnStart
`App.Formulas` evaluates named formulas lazily and in parallel — unlike `OnStart`, which is sequential and blocks app load. Prefer:
```powerapps
// App.Formulas
AccountsFiltered = Filter(Accounts, statuscode = 1);
CurrentUser = User()
```
Over:
```powerapps
// App.OnStart (older pattern — sequential, slower)
ClearCollect(colAccounts, Filter(Accounts, statuscode = 1));
Set(gblUser, User())
```

### Concurrent Loading
```powerapps
// Load multiple data sources in parallel (only in OnStart, not Formulas)
Concurrent(
    ClearCollect(colAccounts, Accounts),
    ClearCollect(colContacts, Contacts),
    Set(gblCurrentUser, User())
)
```

### Avoid Nested ForAll
Nested `ForAll` loops are slow and non-delegable. Instead, use `AddColumns` to join data, or pre-join in a Power Automate flow and pass a single collection to the app.

### Collections vs Variables
Use collections when you need a table of records for a Gallery or form. Use variables (`Set`) for scalar values (booleans, strings, selected records). Overusing `ClearCollect` for single-value lookups wastes memory.

### Patch vs SubmitForm
Use `Patch` when writing programmatically from a non-form context (gallery action buttons, background sync). Use `SubmitForm` when the user is editing a form — it handles validation, error display, and the OnSuccess/OnFailure events automatically.

### PCF Controls in Canvas Apps
PCF controls created for canvas apps must be built with `pac pcf init --template dataset` (not `field`) for gallery-style controls. Dataset PCF controls receive the full `Records` dataset from the canvas app's Items property.

### Gallery FlexHeight Performance
Setting `Gallery.Height = Gallery.AllItemsCount * Gallery.TemplateSize` for a scrollable gallery inside a vertical container can cause expensive recalculation on every data change. Use fixed heights where possible, or use the built-in scroll behavior of the gallery.
