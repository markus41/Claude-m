# Desktop Flows Reference

## Overview

Desktop flows are robotic process automation (RPA) components built with Power Automate Desktop (PAD). They automate interactions with legacy applications, desktop software, and web browsers. This reference covers the PAD recorder, UI automation vs web automation, attended vs unattended execution modes, machine and machine group configuration, input/output variables, error handling, and SAP/Citrix automation.

---

## Power Automate Desktop — Recorder

The recorder captures interactions with the desktop and web browser and converts them into PAD actions automatically.

### Recording Methods

| Method | Best For |
|---|---|
| Desktop recorder | Windows applications, legacy software, ERP clients |
| Web recorder | Browser-based applications, web portals |
| Image-based recorder | Applications that cannot be inspected (e.g., remote desktops, locked apps) |

### Recorder Output (PAD Action Syntax)

```
// Captured interaction with a Windows form
Launch application 'C:\Program Files\LegacyERP\erp.exe' with parameters ''
Wait for process 'erp' to be ready
Click UI element 'Window:Main Form > Text Box:Username'
Populate text field UI element 'Window:Main Form > Text Box:Username' with 'contoso_svc'
Click UI element 'Window:Main Form > Text Box:Password'
Populate text field UI element 'Window:Main Form > Text Box:Password' with '%UserPassword%'
Click UI element 'Window:Main Form > Button:Login'
Wait for UI element 'Window:Dashboard' to exist with timeout of 30
```

### Recorder Best Practices

- Record on a stable baseline environment — avoid recording on a laptop with variable window sizes.
- After recording, review each captured selector and simplify over-specific selectors (remove position-based attributes when possible).
- Use `Wait for UI element` after every navigation or page load — do not use fixed `Wait` delays.
- Parameterize all input values immediately after recording — replace hardcoded strings with variables.

---

## UI Automation (Desktop)

### Key PAD Actions for Windows UI

```
// Click an element
Click UI element 'Window:MyApp > Button:Submit'

// Get text from a UI element
Get details of UI element 'Window:Report > Text:TotalAmount'
→ Stores in: %AttributeValue%

// Set text input
Set text of text field UI element 'Window:Form > Input:CustomerID' to '%CustomerID%'

// Select dropdown option
Set selected option of drop-down list UI element 'Window:Form > Combo:Status' to 'Approved'

// Check a checkbox
Check/Uncheck checkbox UI element 'Window:Form > Check:Active'

// Get all items from a list
Get items of list UI element 'Window:Report > List:Results'
→ Stores in: %ListItems%

// Take screenshot for diagnostics
Take screenshot and save to file '%Desktop%\debug_%CurrentDateTime%.png'
```

### Selectors

PAD selectors are XPath-like paths to UI elements. The Selector Builder simplifies creation and validation.

```xml
<!-- Robust selector — uses Name and class, not position -->
<node tag=":Window" Name="Customer Portal" />
<node tag=":DataItem" AutomationId="CustomerNameField" />

<!-- Fragile selector — avoid position-based attributes -->
<node tag=":Window" Index="0" />
<node tag=":DataItem" Index="3" />
```

**Selector stability tips**:
- Prefer `AutomationId` over `Name` (Name can be localized; AutomationId is set by developers).
- Use `Title/regex:.*Customer.*` for windows with dynamic titles.
- Remove `ClassName` if it changes across application versions.

### Wait Strategies

```
// Wait for element to appear (up to 60 seconds)
Wait for UI element 'Window:App > Button:Submit' to exist
    Fail with timeout error: true
    Timeout: 60

// Wait for element to NOT exist (useful after submitting a form)
Wait for UI element 'Window:App > Dialog:Processing' to not exist
    Timeout: 120

// Wait for image on screen (image-based fallback)
Wait for image 'SubmitButton.png' to appear on screen
    Timeout: 30
```

---

## Web Automation

PAD includes a browser automation engine that works with Chrome, Edge, and Firefox.

### Key Web Automation Actions

```
// Launch browser
Launch new Chrome
→ Stores in: %Browser%

// Navigate to URL
Go to web page 'https://portal.contoso.com' on tab 0 of %Browser%

// Click web element
Click link 'Submit Order' on web page %Browser%
Click web element 'id:submitBtn' on web page %Browser%

// Fill input
Populate text field 'id:customerName' with '%CustomerName%' on web page %Browser%

// Select dropdown
Select option 'Approved' in drop-down list 'id:statusSelect' on web page %Browser%

// Get element text
Get details of web element 'css:.total-amount' on web page %Browser%
→ Stores in: %WebElementText%

// Wait for element
Wait for web element 'id:loadingSpinner' to not exist on web page %Browser%

// Extract table data
Extract data from web page %Browser%
→ Data extraction wizard selects table → stores in: %DataFromWebPage%

// Execute JavaScript
Run JavaScript function on web page %Browser%
    JavaScript function:
        function ExecuteScript() {
            return document.querySelector('.order-id').textContent;
        }
→ Stores in: %Result%

// Close browser
Close web browser %Browser%
```

### Web Selector Format

PAD web selectors support `id:`, `css:`, `xpath:`, and `name:` prefixes:

```
id:submitButton                          // By element ID
css:#main-form .submit-btn               // CSS selector
xpath://button[@data-action='submit']    // XPath
name:submitButton                        // By name attribute
```

---

## Attended vs Unattended Mode

| Aspect | Attended | Unattended |
|---|---|---|
| Requires logged-in user | Yes | No |
| Screen interaction | Visible on user's screen | On background/virtual session |
| License | Power Automate Premium | Power Automate Process (per flow) |
| Machine requirement | User's physical machine | Registered machine or hosted machine |
| Trigger | Manual, from cloud flow | Cloud flow, schedule, or API |
| Concurrent runs per machine | 1 | Multiple (up to machine capacity) |
| Use case | User-initiated, user-present automation | Overnight batch, server-side automation |
| Credential handling | Session user credentials | Stored/managed credentials via Azure Key Vault |

---

## Machine Configuration

### Register a Machine

1. Install **Power Automate for Desktop** on the machine (Windows 10/11 or Server 2016+).
2. In the PAD application: **Settings** → **Machine** → **Register**.
3. Sign in with the service account that will run unattended flows.
4. The machine appears in [make.powerautomate.com](https://make.powerautomate.com) → **Monitor** → **Machines**.

### Machine Group

Machine groups pool multiple machines for load distribution and high availability.

```powershell
# PowerShell — Register machine to machine group via Dataverse
# Machine groups are managed via Power Platform admin center or Dataverse API

# Get machine groups in environment
GET /api/data/v9.2/flowmachinegroups
    ?$select=name,flowmachinegroupid,description

# Add machine to machine group
POST /api/data/v9.2/flowmachines({machineId})/flowmachinegroup_flowmachine/$ref
{
  "@odata.id": "/api/data/v9.2/flowmachinegroups({groupId})"
}
```

### Machine Group Settings

| Setting | Description |
|---|---|
| Max concurrent runs | Maximum simultaneous desktop flow executions on the group |
| Load balancing | Distribute runs across machines in the group |
| Timeout | Max wait time for a machine to become available |
| Run queue priority | Priority when multiple flows are queued |

---

## Input and Output Variables

Desktop flows exchange data with cloud flows via input and output variables.

### Declare Variables in PAD

```
// Input variable — provided by the cloud flow trigger
INPUT VARIABLE CustomerID
    Description: Dataverse contact ID to process
    Type: Text
    Default value: ''
    Sensitive: false

INPUT VARIABLE OrderAmount
    Description: Order value
    Type: Decimal
    Sensitive: false

// Output variable — returned to the cloud flow
OUTPUT VARIABLE ProcessedOrderNumber
    Description: ERP-assigned order number
    Type: Text

OUTPUT VARIABLE ErrorMessage
    Description: Error details if processing failed
    Type: Text
```

### Pass Variables from Cloud Flow

In the cloud flow's **Run a desktop flow** action:

```json
{
  "Run_desktop_flow": {
    "type": "ApiConnection",
    "inputs": {
      "host": { "connection": { "name": "@parameters('$connections')['uiflow']['connectionId']" } },
      "method": "post",
      "path": "/api/v2/desktopFlows/{desktopFlowId}/runs",
      "body": {
        "runMode": "unattended",
        "machine": {
          "connectionName": "@parameters('$connections')['desktopFlow_machine']['connectionId']"
        },
        "inputs": {
          "CustomerID": "@{triggerBody()?['customerid']}",
          "OrderAmount": "@{triggerBody()?['amount']}"
        }
      }
    }
  }
}
```

### Consume Output in Cloud Flow

```json
// After desktop flow completes, access outputs
"@body('Run_desktop_flow')?['outputs']?['ProcessedOrderNumber']"
"@body('Run_desktop_flow')?['outputs']?['ErrorMessage']"
```

---

## Error Handling in Desktop Flows

### On Block Error (PAD Syntax)

```
ON BLOCK ERROR
    LABEL: ErrorHandler

    // Log the error details
    SET %ErrorMessage% TO %LastErrorMessage%
    SET %ErrorLocation% TO %LastErrorLocation%
    SET %ErrorLine% TO %LastErrorLine%

    // Take screenshot for diagnostics
    TAKE SCREENSHOT AND SAVE TO FILE '%Desktop%\error_%CurrentDateTime%.png'

    // Close any open applications to clean up
    IF WINDOW EXISTS 'Window:LegacyERP'
        CLOSE WINDOW 'Window:LegacyERP'
    END IF

    // Jump to end of flow (will trigger OutputVariables with error status)
    GOTO: EndOfFlow

END ON BLOCK ERROR
```

### Try-Catch Pattern via Labels

```
// PAD does not have native try-catch; use ON BLOCK ERROR + GOTO
LABEL: TryBlock
    // Main automation steps
    Click UI element 'Window:App > Button:Process'
    Wait for UI element 'Window:App > Label:Success' to exist timeout 30
    GET DETAILS OF UI ELEMENT 'Window:App > Label:OrderNumber'
    → Stores in: %ProcessedOrderNumber%
    SET %ErrorMessage% TO ''
    GOTO: EndOfFlow

LABEL: ErrorHandler
    SET %ErrorMessage% TO %LastErrorMessage%
    SET %ProcessedOrderNumber% TO 'FAILED'

LABEL: EndOfFlow
    // Output variables are now set — cloud flow reads them
```

### Error-Causing Actions to Handle

| Action Type | Common Error | Handling |
|---|---|---|
| `Click UI element` | Element not found | Add `Wait for UI element` first; check selector |
| `Populate text field` | Read-only field | Check field state with `Get details` first |
| `Launch application` | App already running | Check `If process running` before launch |
| `Wait for UI element` | Timeout | Increase timeout; add screenshot before timeout |
| `Go to web page` | Network error | Wrap in `ON BLOCK ERROR`; implement retry counter |
| Data extraction | Table structure changed | Validate row count after extraction; alert on zero rows |

---

## SAP Automation

PAD includes a dedicated SAP GUI scripting integration.

### Enable SAP GUI Scripting

1. In SAP GUI client: **Options** → **Accessibility & Scripting** → **Scripting** → Enable scripting.
2. In SAP server: Set profile parameter `sapgui/user_scripting = TRUE`.
3. In PAD: use **SAP GUI** action group.

### Key SAP PAD Actions

```
// Login to SAP
Launch SAP application '%SAPPath%'
Login to SAP with username '%SAPUsername%' and password '%SAPPassword%'
    Client: '100'
    Language: 'EN'

// Navigate using transaction code
Start transaction 'ME21N' in SAP

// Interact with SAP controls
Click SAP element '/app/con[0]/ses[0]/wnd[0]/tbar[1]/btn[8]'
Set text of SAP text field '/app/con[0]/ses[0]/wnd[0]/usr/txtBSNKZ' to '%OrderNumber%'
Press SAP button 'Execute (F8)' in SAP

// Extract SAP grid data
Extract SAP table data from '/app/con[0]/ses[0]/wnd[0]/usr/cntlGRID1/shellcont/shell'
→ Stores in: %SAPTableData%

// Logout
Logout from SAP
```

---

## Citrix Automation

For Citrix Virtual Apps/Desktops, PAD uses image-based and text recognition automation since the Citrix session renders as a remote bitmap.

### Citrix Automation Actions

```
// Connect to Citrix session
Connect to Citrix session %CitrixSessionName%

// Image-based click (fallback for non-inspectable apps)
Move mouse to image 'SubmitButton.png' on screen
    Tolerance: 0.8
Click mouse

// OCR-based text extraction
Extract text from screen region with OCR
    Region: (100, 200, 600, 400)  // x, y, width, height
    → Stores in: %ExtractedText%

// Wait for image
Wait for image 'LoginSuccess.png' to appear on screen
    Timeout: 30
    Search area: entire screen

// Keyboard input (reliable in Citrix when mouse clicks aren't)
Set the keyboard keys '{Tab}'
Type text '%CustomerID%'
Set the keyboard keys '{Tab}'
Type text '%OrderAmount%'
Set the keyboard keys '{Enter}'
```

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| `UI element not found` | Selector no longer matches any element | Update selector in Selector Builder; add wait before interaction |
| `Wait for element timeout` | Element did not appear within timeout | Increase timeout; check if app is slow or hung; add screenshot |
| `Application launch failed` | EXE path missing or application crashed on start | Verify path; check Windows Event Log; run as administrator if needed |
| `Unattended run failed: no machine available` | All machines in group are busy or offline | Add more machines to group; check machine online status |
| `Invalid credentials` (unattended) | Stored credentials expired or changed | Update credentials in the machine connection; check Azure Key Vault |
| `Cannot interact with locked screen` (attended) | Attended flow ran while screen was locked | Ensure user is logged in and screen is unlocked for attended runs |
| Desktop flow run stuck in `Running` | PAD process hung or crashed on machine | Restart PAD service on machine; check Windows Task Manager |
| Citrix OCR returns empty text | Resolution too low or DPI mismatch | Increase Citrix session resolution; calibrate OCR region |
| SAP scripting disabled | SAP server profile parameter not set | Enable `sapgui/user_scripting` with Basis team |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Concurrent unattended runs per machine | 1 by default | Configurable with machine group settings |
| Concurrent attended runs per machine | 1 | Cannot run multiple attended sessions simultaneously |
| Desktop flow run timeout | 24 hours | Hard limit; split long processes |
| Input/output variable payload | 2 MB | Combined size of all input and output values |
| Machines per machine group | No hard limit | Practical: 20 machines per group for manageability |
| Machine group concurrent run slots | Configurable | Based on hardware capacity |
| PAD action count per flow | No hard limit | Performance degrades above ~5,000 actions |
| OCR text extraction size | No hard limit | Large regions slow processing |
| Image matching tolerance | 0.0 – 1.0 | 0.8 recommended; lower = more flexible |
