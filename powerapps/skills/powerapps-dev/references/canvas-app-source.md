# Canvas App Source Format Reference

## Format History

Power Apps canvas apps can be represented as source files for version control and team development. Two formats exist:

| Format | File Extension | Status | Workflow |
|---|---|---|---|
| **`.pa.yaml`** (Source Code v3.0) | `.pa.yaml` | **Current — recommended** | Power Platform Git Integration (bidirectional sync) |
| **`.fx.yaml`** (legacy) | `.fx.yaml` | **Retired** | `pac canvas pack/unpack` (preview, will be deprecated) |

**Always use `.pa.yaml`** for new projects. The `.fx.yaml` format is only relevant for maintaining older apps that have not migrated.

---

## `.pa.yaml` Schema (Source Code v3.0)

### Top-Level Structure

A canvas app project using `.pa.yaml` consists of these files:

```
MyApp/
  src/
    App.pa.yaml               # App-level properties, StartScreen, formulas
    Screens/
      Screen1.pa.yaml          # Each screen in its own file
      Screen2.pa.yaml
    Components/
      MyComponent.pa.yaml      # Custom component definitions
    DataSources/
      DataSource1.pa.yaml      # Data source connection metadata
    Assets/
      Images/                  # Embedded media
  CanvasManifest.json          # App manifest (for pac canvas pack workflow only)
```

### App.pa.yaml

Defines app-level settings, the start screen, and named formulas.

```yaml
App As appinfo:
  Properties:
    StartScreen: =Screen1
    Theme: =PowerAppsTheme
    OnStart: |-
      =Set(gblCurrentUser, User());
       ClearCollect(colConfig, Filter(AppSettings, IsActive = true))
    Formulas: |-
      =AccountsFiltered = Filter(Accounts, statuscode = 1);
       CurrentUserEmail = User().Email
```

### Screen Definition

Each screen file defines the screen and its child control tree.

```yaml
Screen1 As screen:
  Properties:
    Fill: =RGBA(245, 245, 245, 1)
    OnVisible: =ClearCollect(colAccounts, Filter(Accounts, statuscode = 1))
  Children:
    - HeaderContainer As groupContainer:
        Properties:
          LayoutMode: =LayoutMode.Auto
          LayoutDirection: =LayoutDirection.Horizontal
          Height: =80
          Fill: =RGBA(0, 120, 212, 1)
        Children:
          - lblTitle As label:
              Properties:
                Text: ="My App"
                Color: =RGBA(255, 255, 255, 1)
                Size: =24
    - galAccounts As gallery:
        Properties:
          Items: |-
            =SortByColumns(
                Filter(Accounts, StartsWith(name, txtSearch.Text)),
                "name", SortOrder.Ascending
            )
          TemplateFill: =If(ThisItem.IsSelected, RGBA(0, 120, 212, 0.1), Transparent)
          TemplateSize: =72
        Children:
          - lblAccountName As label:
              Properties:
                Text: =ThisItem.name
                Size: =16
          - lblPhone As label:
              Properties:
                Text: =ThisItem.telephone1
                Size: =12
                Color: =RGBA(100, 100, 100, 1)
```

### Control Definition Syntax

Controls follow this pattern:

```yaml
ControlName As ControlType:
  Properties:
    PropertyName: =FormulaValue
```

**Key rules:**

- **Formula prefix**: All property values that are expressions start with `=`. Literal strings also use `=` followed by a quoted string: `="Hello"`.
- **Multiline formulas**: Use YAML block scalar `|-` followed by `=` on the next line:
  ```yaml
  OnSelect: |-
    =Set(gblSelected, ThisItem);
     Navigate(DetailScreen, ScreenTransition.Fade)
  ```
- **Children**: Nested controls go under a `Children:` key as a YAML sequence (`-` items).
- **Control type suffix**: Some controls use versioned type references: `As gallery`, `As label`, `As button`, etc.

### Control Type Catalog

| Control Type | YAML Type | Required Properties | Optional Properties |
|---|---|---|---|
| **Label** | `label` | `Text` | `Color`, `Size`, `FontWeight`, `Align`, `X`, `Y`, `Width`, `Height` |
| **Button** | `button` | `Text`, `OnSelect` | `Fill`, `Color`, `BorderColor`, `DisabledFill`, `HoverFill` |
| **TextInput** | `textInput` | — | `Default`, `HintText`, `OnChange`, `Format` (Text, Number, Email) |
| **Gallery** | `gallery` | `Items` | `TemplateFill`, `TemplateSize`, `OnSelect`, `WrapCount` |
| **EditForm** | `formViewer` | `DataSource`, `Item` | `OnSuccess`, `OnFailure`, `DefaultMode` (New, Edit, View) |
| **DisplayForm** | `formViewer` | `DataSource`, `Item` | `DefaultMode` (View) |
| **Container** | `groupContainer` | — | `LayoutMode` (Auto, Manual), `LayoutDirection`, `Fill`, `Gap` |
| **Dropdown** | `dropdown` | `Items` | `Default`, `OnChange`, `OnSelect` |
| **DatePicker** | `datePicker` | — | `DefaultDate`, `OnChange`, `Format` |
| **Toggle** | `toggle` | — | `Default`, `OnCheck`, `OnUncheck`, `OnChange` |
| **Image** | `image` | `Image` | `ImagePosition`, `OnSelect` |
| **Icon** | `icon` | `Icon` | `Color`, `OnSelect` |
| **Rectangle** | `rectangle` | — | `Fill`, `BorderColor`, `BorderThickness` |
| **Timer** | `timer` | — | `Duration`, `OnTimerEnd`, `AutoStart`, `Repeat` |
| **Checkbox** | `checkbox` | — | `Default`, `OnCheck`, `OnUncheck` |
| **HtmlViewer** | `htmlViewer` | `HtmlText` | `Width`, `Height` |
| **ComboBox** | `comboBox` | `Items` | `DefaultSelectedItems`, `SelectMultiple`, `OnChange` |

### DataSources

Data source files declare connection metadata:

```yaml
DataSources:
  Accounts:
    Type: Dataverse
    TableLogicalName: account
  SharePointList:
    Type: SharePoint
    SiteUrl: https://contoso.sharepoint.com/sites/team
    ListName: Tasks
```

### ComponentDefinitions

Custom canvas components are defined with input/output properties:

```yaml
MyButton As component:
  CustomProperties:
    ButtonText:
      PropertyKind: Input
      DataType: Text
      Default: ="Click me"
    WasClicked:
      PropertyKind: Output
      DataType: Boolean
  Children:
    - btnInner As button:
        Properties:
          Text: =MyButton.ButtonText
          OnSelect: =Set(MyButton.WasClicked, true)
```

---

## CanvasManifest.json

Used only with the `pac canvas pack` workflow (legacy). Not needed for Git Integration.

```json
{
  "FormatVersion": "1.332",
  "Properties": {
    "Name": "MyApp",
    "Id": "/providers/Microsoft.PowerApps/apps/00000000-0000-0000-0000-000000000000",
    "LocalDatabaseReferences": {},
    "LibraryDependencies": "[]",
    "Author": "user@contoso.com",
    "FileID": ""
  },
  "PublishInfo": {
    "AppCreationSource": "AppFromScratch",
    "PublishTarget": "Player",
    "UniqueId": "/providers/Microsoft.PowerApps/apps/{appId}"
  },
  "ScreenOrder": [
    "Screen1",
    "Screen2"
  ]
}
```

---

## Complete Example: Two-Screen CRUD App

### App.pa.yaml

```yaml
App As appinfo:
  Properties:
    StartScreen: =scrList
    Theme: =PowerAppsTheme
    Formulas: |-
      =ActiveAccounts = Filter(Accounts, statuscode = 1);
       CurrentUser = User()
```

### scrList.pa.yaml

```yaml
scrList As screen:
  Properties:
    Fill: =RGBA(245, 245, 245, 1)
  Children:
    - conHeader As groupContainer:
        Properties:
          LayoutMode: =LayoutMode.Auto
          LayoutDirection: =LayoutDirection.Horizontal
          Height: =64
          Fill: =RGBA(0, 120, 212, 1)
          PaddingLeft: =16
          PaddingRight: =16
          AlignItems: =LayoutAlignItems.Center
        Children:
          - lblTitle As label:
              Properties:
                Text: ="Accounts"
                Color: =RGBA(255, 255, 255, 1)
                Size: =22
                FontWeight: =FontWeight.Bold
          - btnNew As button:
              Properties:
                Text: ="+ New"
                OnSelect: |-
                  =NewForm(frmEdit);
                   Navigate(scrEdit, ScreenTransition.Cover)
                Fill: =RGBA(255, 255, 255, 1)
                Color: =RGBA(0, 120, 212, 1)
    - txtSearch As textInput:
        Properties:
          HintText: ="Search accounts..."
          Width: =Parent.Width - 32
          X: =16
          OnChange: =Reset(galAccounts)
    - galAccounts As gallery:
        Properties:
          Items: |-
            =SortByColumns(
                Filter(
                    ActiveAccounts,
                    IsBlank(txtSearch.Text) || StartsWith(name, txtSearch.Text)
                ),
                "name", SortOrder.Ascending
            )
          TemplateFill: =If(ThisItem.IsSelected, RGBA(0, 120, 212, 0.08), Transparent)
          TemplateSize: =72
          OnSelect: |-
            =Set(gblSelectedAccount, ThisItem);
             EditForm(frmEdit);
             Navigate(scrEdit, ScreenTransition.Cover)
        Children:
          - lblName As label:
              Properties:
                Text: =ThisItem.name
                Size: =16
                FontWeight: =FontWeight.Semibold
          - lblCity As label:
              Properties:
                Text: =ThisItem.address1_city
                Size: =12
                Color: =RGBA(100, 100, 100, 1)
          - icoChevron As icon:
              Properties:
                Icon: =Icon.ChevronRight
                Color: =RGBA(150, 150, 150, 1)
```

### scrEdit.pa.yaml

```yaml
scrEdit As screen:
  Properties:
    Fill: =RGBA(245, 245, 245, 1)
  Children:
    - conEditHeader As groupContainer:
        Properties:
          LayoutMode: =LayoutMode.Auto
          LayoutDirection: =LayoutDirection.Horizontal
          Height: =64
          Fill: =RGBA(0, 120, 212, 1)
          PaddingLeft: =16
          PaddingRight: =16
          AlignItems: =LayoutAlignItems.Center
        Children:
          - icoBack As icon:
              Properties:
                Icon: =Icon.BackArrow
                Color: =RGBA(255, 255, 255, 1)
                OnSelect: |-
                  =ResetForm(frmEdit);
                   Back()
          - lblEditTitle As label:
              Properties:
                Text: =If(frmEdit.Mode = FormMode.New, "New Account", "Edit Account")
                Color: =RGBA(255, 255, 255, 1)
                Size: =22
                FontWeight: =FontWeight.Bold
          - btnSave As button:
              Properties:
                Text: ="Save"
                OnSelect: =SubmitForm(frmEdit)
                Fill: =RGBA(255, 255, 255, 1)
                Color: =RGBA(0, 120, 212, 1)
    - frmEdit As formViewer:
        Properties:
          DataSource: =Accounts
          Item: =gblSelectedAccount
          DefaultMode: =FormMode.Edit
          OnSuccess: |-
            =Notify("Saved successfully.", NotificationType.Success);
             Back()
          OnFailure: |-
            =Notify("Save failed: " & frmEdit.Error, NotificationType.Error)
    - btnDelete As button:
        Properties:
          Text: ="Delete"
          Visible: =frmEdit.Mode = FormMode.Edit
          OnSelect: |-
            =IfError(
                Remove(Accounts, gblSelectedAccount),
                Notify("Delete failed: " & FirstError.Message, NotificationType.Error),
                Notify("Deleted.", NotificationType.Success);
                Back()
            )
          Fill: =RGBA(209, 52, 56, 1)
          Color: =RGBA(255, 255, 255, 1)
```

---

## Git Integration Workflow (Recommended)

Power Platform Git Integration syncs `.pa.yaml` files bidirectionally with a Git repository (Azure DevOps or GitHub).

**Setup:**

1. In the Power Platform admin center, enable **Git Integration** for the environment.
2. Connect a Git repository (Azure DevOps repo or GitHub repo) to the environment.
3. Configure branch policies (main branch protection, PR reviews).

**Workflow:**

```
Maker Portal ←→ Git repo (pa.yaml files)
     ↓                    ↓
Edit in Studio    Edit in VS Code / Claude Code
     ↓                    ↓
 Commit to Git    Commit & push
     ↓                    ↓
     ←── PR review & merge ──→
              ↓
     Sync to environment
```

**Key commands:**

| Action | Method |
|---|---|
| Initial export | Power Platform admin center → Git Integration → Commit |
| Edit source | Modify `.pa.yaml` files in your IDE |
| Validate | `pac canvas validate --path <src-dir>` |
| Sync back | Push to connected branch → automatic sync |

---

## PAC CLI Pack/Unpack Workflow (Legacy)

For environments without Git Integration, use `pac canvas pack/unpack` with `.fx.yaml` files.

**Unpack an existing app:**

```bash
pac canvas unpack --msapp MyApp.msapp --sources ./src
```

This produces `.fx.yaml` files in the `./src` directory.

**Pack source files into .msapp:**

```bash
pac canvas pack --msapp MyApp.msapp --sources ./src
```

**Import the packed app:**

```bash
# Wrap in a solution for import
pac solution init --publisher-name Contoso --publisher-prefix cr
pac solution add-reference --path ./MyApp.msapp
pac solution pack --zipfile MyApp_solution.zip
pac solution import --path MyApp_solution.zip
```

---

## Validation

```bash
# Validate .pa.yaml source files
pac canvas validate --path ./src

# Validate a packed .msapp file
pac canvas validate --msapp ./MyApp.msapp
```

### Common Validation Error Codes

| Error Code | Meaning | Fix |
|---|---|---|
| `PA2001` | Invalid YAML syntax | Check indentation and YAML escaping |
| `PA2002` | Unknown control type | Verify the control type name in the catalog |
| `PA2003` | Missing required property | Add the required property (e.g., `Items` for Gallery) |
| `PA2004` | Invalid formula syntax | Check Power Fx formula after the `=` prefix |
| `PA2005` | Duplicate control name | Rename one of the conflicting controls |
| `PA2006` | Screen reference not found | Verify `Navigate()` targets exist in the project |
| `PA2007` | Data source not declared | Add the data source to DataSources/ |
| `PA3001` | CanvasManifest.json missing | Required for `pac canvas pack` workflow only |
| `PA3002` | Screen order mismatch | Update `ScreenOrder` in CanvasManifest.json |

---

## Known Limitations

- **Code components (PCF)**: PCF controls referenced in `.pa.yaml` must be installed in the target environment before import. They cannot be fully represented in YAML source.
- **Schema changes**: When Microsoft updates the `.pa.yaml` schema version, re-export from the maker portal to pick up structural changes. Pin your tooling to a specific `pac` CLI version to avoid surprise migrations.
- **Media assets**: Binary files (images, videos) in `Assets/` are referenced by filename. If the file is missing during pack, the control renders a broken image placeholder.
- **Component libraries**: Shared component libraries are referenced by ID, not by source. The library must be published in the environment.
- **Git Integration regions**: Git Integration is available in all production regions but may have limited support in sovereign clouds (GCC, China).
