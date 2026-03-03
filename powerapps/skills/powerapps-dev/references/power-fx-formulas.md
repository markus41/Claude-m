# Power Fx Formulas Reference

## Overview

Power Fx is the declarative formula language used in canvas apps (and increasingly across Power Platform). It is inspired by Excel and evaluates reactively — formulas re-evaluate automatically when their dependencies change. This reference covers core functions, delegation-safe patterns, type coercion, error handling, named formulas, user context, concurrent execution, date/time, and JSON parsing.

---

## Core Data Functions

### Filter

Returns all records matching a condition. Delegable on Dataverse, SharePoint, and SQL Server for supported predicates.

```powerapps
// Simple equality filter — delegable
Filter(Accounts, statuscode = 1)

// Multiple conditions — delegable (AND)
Filter(
    Accounts,
    statuscode = 1 && address1_country = "USA"
)

// StartsWith — delegable on Dataverse and SharePoint
Filter(Accounts, StartsWith(name, txtSearch.Text))

// Combined search with blank guard — allows empty search to return all
Filter(
    Accounts,
    IsBlank(txtSearch.Text) || StartsWith(name, txtSearch.Text)
)
```

**Delegation-safe operators** (vary by data source):
`=`, `<>`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`, `in`, `exactin`, `StartsWith`, `EndsWith` (Dataverse only)

### LookUp

Returns the first record matching a condition. Optionally returns a specific column.

```powerapps
// Return the full record
LookUp(Accounts, accountid = gblSelectedId)

// Return a specific column
LookUp(Accounts, name = "Contoso", telephone1)

// With fallback for no match
LookUp(Contacts, emailaddress1 = User().Email, fullname) & " (not found)"
// Better with Coalesce:
Coalesce(
    LookUp(Contacts, emailaddress1 = User().Email, fullname),
    "Unknown User"
)
```

### Patch

Create or update a record. The most important write function in canvas apps.

```powerapps
// Create new record
Patch(
    Incidents,
    Defaults(Incidents),
    {
        title: "Server down",
        description: txtDesc.Text,
        prioritycode: 1,
        'Customer': LookUp(Accounts, name = "Contoso")
    }
)

// Update existing record
Patch(
    Incidents,
    LookUp(Incidents, incidentid = gblCaseId),
    { statuscode: 5 }  // Resolved
)

// Patch a Lookup column (navigation property)
Patch(
    Contacts,
    Defaults(Contacts),
    {
        firstname: "Jane",
        lastname: "Smith",
        'Company Name': LookUp(Accounts, accountid = gblAccountId)
    }
)
```

### Collect / ClearCollect

```powerapps
// Add to an existing collection
Collect(colSelectedItems, Gallery1.Selected)

// Replace collection contents
ClearCollect(
    colAccounts,
    Filter(Accounts, statuscode = 1)
)

// Build a collection from scratch
ClearCollect(
    colRoleOptions,
    { Value: "Admin", Label: "Administrator" },
    { Value: "User", Label: "Standard User" },
    { Value: "Viewer", Label: "Read Only" }
)

// Collect multiple tables in one call (appends all)
Collect(colAll, Table1, Table2, Table3)
```

### Remove / RemoveIf

```powerapps
// Remove a specific record from a data source (uses record identity)
Remove(Incidents, Gallery1.Selected)

// Remove from a collection
Remove(colSelectedItems, LookUp(colSelectedItems, id = gblRemoveId))

// Remove all records matching a condition
RemoveIf(colSelectedItems, status = "Cancelled")

// Remove from data source by condition (delegable on Dataverse)
RemoveIf(Incidents, statuscode = 2 && createdon < DateAdd(Today(), -365, TimeUnit.Days))
```

### Clear

Removes all records from a collection (not a data source).

```powerapps
Clear(colSelectedItems)
// Equivalent to:
ClearCollect(colSelectedItems, [])
```

---

## Delegation-Safe Function Reference

| Function | Delegable? | Notes |
|---|---|---|
| `Filter` | Yes (on supported predicates) | Use delegable operators only |
| `Sort` / `SortByColumns` | Yes | Column must be a native data source column |
| `LookUp` | Yes | Returns first match server-side |
| `Search` | Dataverse only | Full-text search against multiple text columns |
| `FirstN` | Yes | Server-side TOP N |
| `CountRows` | No | Always local; max at row limit |
| `Sum` / `Average` / `Min` / `Max` | No | Move to Power Automate for large sets |
| `GroupBy` | No | Local only |
| `AddColumns` | No | Applied after data retrieval |
| `DropColumns` | No | Local transform |
| `ShowColumns` | No | Local projection (use `$select` via OData instead) |
| `RenameColumns` | No | Local rename |
| `Distinct` | No | Use a Dataverse view with distinct |
| `ForAll` | No (as aggregate) | Sequential local evaluation |
| `Concat` | No | String aggregation from table |
| `First` / `Last` | Partial | `First(Sort(...))` may not delegate; use `LookUp` |
| `SortByColumns(..., SortOrder.Descending)` | Yes | Fully delegable on Dataverse |

---

## Type Coercion

Power Fx uses a mostly dynamic type system, but explicit coercion avoids runtime errors.

```powerapps
// Number to Text
Text(42)                     // "42"
Text(3.14159, "[$-en-US]#,##0.00")  // "3.14"
Text(Today(), "yyyy-MM-dd")  // "2026-03-03"

// Text to Number
Value("42")     // 42
Value("3.14")   // 3.14

// Text to Date
DateValue("2026-03-03")        // Date value
DateTimeValue("2026-03-03T10:00:00Z")  // DateTime value

// Date to Text
Text(Now(), DateTimeFormat.LongDateTime)
Text(Today(), "[$-en-US]mmmm d, yyyy")

// Boolean to Text
Text(true)   // "true"
// Number to Boolean (implicit)
// 0 = false, non-zero = true

// GUID handling (Dataverse record IDs)
// Record IDs are returned as text GUIDs — no explicit conversion needed
// To compare: Gallery1.Selected.accountid = "00000000-0000-0000-0000-000000000001"

// Option Set (choice) value
// Access integer value: Accounts.Selected.'Industry'.Value
// Access label text: Accounts.Selected.'Industry'
```

---

## Error Handling

### IfError

Returns a fallback value when the expression results in an error.

```powerapps
// Fallback on parse error
IfError(Value("not a number"), 0)

// Wrap Patch
IfError(
    Patch(Incidents, Defaults(Incidents), { title: txtTitle.Text }),
    Notify("Save failed: " & FirstError.Message, NotificationType.Error)
)

// Nested IfError with multiple fallbacks
IfError(
    BooleanResult,
    IfError(SecondAttempt, DefaultValue)
)
```

### IsError

Test whether an expression produced an error without triggering the error.

```powerapps
If(
    IsError(LookUp(Accounts, name = txtName.Text)),
    Notify("Account lookup failed.", NotificationType.Warning),
    Set(gblFoundAccount, LookUp(Accounts, name = txtName.Text))
)
```

### FirstError

Available inside `IfError` — provides details about the error.

| Property | Type | Description |
|---|---|---|
| `FirstError.Kind` | ErrorKind | Enumeration of error category |
| `FirstError.Message` | Text | Human-readable error description |
| `FirstError.Source` | Text | Formula source that produced the error |
| `FirstError.Observed` | Text | Full observed expression |

### ErrorKind Enum Values
| Value | Name | Description |
|---|---|---|
| `0` | `None` | No error |
| `1` | `Sync` | Network sync error |
| `2` | `MissingRequired` | Required field blank |
| `3` | `CreatePermission` | Insufficient create permission |
| `4` | `ReadPermission` | Insufficient read permission |
| `5` | `EditPermission` | Insufficient edit permission |
| `6` | `DeletePermission` | Insufficient delete permission |
| `25` | `Validation` | Dataverse validation rule violated |
| `26` | `Unknown` | Uncategorized error |

### Errors Function (Data Source Errors)

```powerapps
// After a Patch, check for data source errors
Patch(Accounts, Defaults(Accounts), { name: txtName.Text });
If(
    !IsEmpty(Errors(Accounts)),
    Notify(
        "Error: " & First(Errors(Accounts)).Message,
        NotificationType.Error
    )
)
```

---

## Named Formulas (App.Formulas)

Named formulas (declared in `App.Formulas`) are evaluated lazily and re-evaluated automatically when dependencies change. They replace `OnStart` patterns and improve app startup performance.

```powerapps
// App.Formulas — declare named formulas
ActiveAccounts = Filter(Accounts, statuscode = 1);
CurrentUserEmail = User().Email;
CurrentUserContact = LookUp(Contacts, emailaddress1 = User().Email);
TodayFormatted = Text(Today(), "yyyy-MM-dd");
IsAdminUser = "Administrators" in User().Groups;

// Reference named formulas anywhere in the app
// Gallery.Items = ActiveAccounts
// Label.Text = TodayFormatted
// Button.Visible = IsAdminUser
```

**Named formula limitations**:
- Cannot call imperative functions (`Patch`, `Collect`, `Navigate`, `Set`) — named formulas are pure expressions.
- Cannot reference `context variables` set by `UpdateContext` outside the declaring screen.
- Circular dependencies cause a compilation error.

---

## User() Function

Returns information about the signed-in user.

```powerapps
User().Email         // "jane.smith@contoso.com"
User().FullName      // "Jane Smith"
User().Image         // Profile image as an image reference

// Common patterns
Set(gblCurrentUser, User());

// Lookup current user's Dataverse contact record
Set(
    gblCurrentContact,
    LookUp(Contacts, emailaddress1 = User().Email)
);

// Check if user is in a specific group (requires Azure AD groups in app)
// Note: User().Groups is only available if group claims are configured
If("IT Admins" in User().Groups, "Admin View", "Standard View")
```

---

## Concurrent()

Executes multiple formulas in parallel. Use in `OnStart` or button actions to speed up independent data loads.

```powerapps
// Load multiple collections simultaneously
Concurrent(
    ClearCollect(colAccounts, Accounts),
    ClearCollect(colContacts, Contacts),
    ClearCollect(colProducts, Products),
    Set(gblCurrentUser, User())
)
// Total load time = slowest single operation, not sum of all

// Concurrent with SaveData for offline
Concurrent(
    ClearCollect(colAccounts, Filter(Accounts, statuscode = 1)),
    LoadData(colOfflineQueue, "OfflineQueue", true)
)
```

**Limitations**:
- `Concurrent` cannot be used inside `ForAll`.
- Order of side effects (Set, Collect) within `Concurrent` is non-deterministic.
- Do not use `Concurrent` when later formulas depend on results from earlier ones.

---

## Today() and Now()

```powerapps
Today()        // Current date (no time component) — Date type
Now()          // Current date and time — DateTime type

// Date arithmetic
DateAdd(Today(), 7, TimeUnit.Days)    // 7 days from today
DateAdd(Today(), -30, TimeUnit.Days)  // 30 days ago
DateAdd(Today(), 1, TimeUnit.Months)  // 1 month from today
DateAdd(Today(), 1, TimeUnit.Years)   // 1 year from today

// DateDiff — difference between dates
DateDiff(dteStart, Today(), TimeUnit.Days)    // Days between start and today
DateDiff(dteStart, Now(), TimeUnit.Hours)     // Hours between two date-times

// TimeUnit values
// Milliseconds, Seconds, Minutes, Hours, Days, Months, Quarters, Years

// Format date for display
Text(Today(), "dd/MM/yyyy")
Text(Now(), "yyyy-MM-dd HH:mm")
Text(Today(), DateTimeFormat.ShortDate)
Text(Now(), DateTimeFormat.LongDateTime24)

// Extract parts
Day(Today())     // Day of month (1-31)
Month(Today())   // Month (1-12)
Year(Today())    // Year (e.g., 2026)
Hour(Now())      // Hour (0-23)
Minute(Now())    // Minute (0-59)

// Build a date from parts
Date(2026, 3, 3)         // March 3, 2026
DateTime(2026, 3, 3, 10, 0, 0)  // March 3, 2026 10:00:00
```

---

## ParseJSON

Parses a JSON string and returns an untyped object. Available in Power Fx for working with JSON responses from HTTP connectors and actions.

```powerapps
// Parse a simple JSON string
Set(gblParsed, ParseJSON("{""name"":""Contoso"",""count"":42}"));
Text(gblParsed.name)       // "Contoso"
Value(gblParsed.count)     // 42

// Parse JSON from an HTTP connector response
Set(gblApiResponse, ParseJSON(HttpConnector.GetData().Body));

// Access nested properties
Text(gblApiResponse.data.items.First.id)

// Parse JSON array into a typed table
// ParseJSON returns UntypedObject; use ForAll with explicit type coercion
ClearCollect(
    colParsedItems,
    ForAll(
        Table(ParseJSON(gblApiResponse.items)),  // wrap array in Table()
        {
            id: Text(ThisRecord.Value.id),
            name: Text(ThisRecord.Value.name),
            count: Value(ThisRecord.Value.count)
        }
    )
)

// Check for missing keys
If(
    IsBlank(Text(gblParsed.optionalField)),
    "Field not present",
    Text(gblParsed.optionalField)
)
```

---

## Additional Utility Functions

### String Functions

```powerapps
Len("Hello World")                 // 11
Left("Hello World", 5)            // "Hello"
Right("Hello World", 5)           // "World"
Mid("Hello World", 7, 5)          // "World"
Upper("hello")                    // "HELLO"
Lower("HELLO")                    // "hello"
Trim("  spaces  ")               // "spaces"
TrimEnds("  spaces  ")           // "spaces"
Find("World", "Hello World")      // 7 (1-indexed)
Substitute("Hello World", "World", "Power Fx")  // "Hello Power Fx"
Replace("Hello World", 7, 5, "Power Fx")        // "Hello Power Fx"
Concatenate("Hello", " ", "World")              // "Hello World"
Char(10)                          // Newline character
IsMatch("user@contoso.com", Match.Email)        // true
```

### Math Functions

```powerapps
Round(3.567, 2)   // 3.57
RoundUp(3.1, 0)   // 4
RoundDown(3.9, 0) // 3
Int(3.9)          // 3
Abs(-5)           // 5
Mod(10, 3)        // 1
Power(2, 10)      // 1024
Sqrt(16)          // 4
Rand()            // Random number 0.0 to 1.0 (exclusive)
RandBetween(1, 6) // Random integer 1-6 inclusive
```

---

## Error Codes and Conditions

| Condition | Meaning | Remediation |
|---|---|---|
| Yellow delegation warning | Formula non-delegable; results capped | Use delegable operators or move computation to Power Automate |
| `#Error` in label | Formula evaluation error at design time | Check for missing required arguments or null dereference |
| `IsError` returns true on Patch | Data write failed (permission, validation) | Wrap in `IfError`; check `FirstError.Message` |
| `Value()` returns error | Input string not parseable as number | Guard with `IsMatch(str, Match.Decimal)` before calling `Value` |
| `ParseJSON` returns `Blank()` | JSON string is null or malformed | Check source; wrap access in `IsBlank` guards |
| `DateValue()` returns error | String not in expected date format | Validate date string format; use `DateTimeValue` for ISO 8601 |
| `Concurrent()` side effects undefined | Non-deterministic order in concurrent block | Only use `Concurrent` for truly independent, side-effect-free loads |
| `ForAll` not updating data source | `ForAll` with `Patch` does not return errors automatically | Check `Errors(DataSource)` after `ForAll` completes |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Formula length per property | 2,000 characters | Refactor long formulas into named formulas |
| Nested function depth | 50 | Refactor deeply nested formulas |
| ForAll concurrency | 1 (sequential) | Use `Concurrent` for parallel independent loads |
| Concurrent() max items | No hard limit | Practical limit ~10 parallel calls before diminishing returns |
| Collection memory | 128 MB per session | Across all collections in the app |
| Named formulas (App.Formulas) | No hard limit | Lazy evaluated — minimal memory when not used |
| ParseJSON depth | No documented limit | Performance degrades with deeply nested objects |
| Regex pattern length (IsMatch) | No documented limit | Keep patterns simple; complex regex degrades performance |
