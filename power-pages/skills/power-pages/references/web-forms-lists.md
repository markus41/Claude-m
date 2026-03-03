# Web Forms and Entity Lists Reference

## Overview

Power Pages provides two primary mechanisms for rendering Dataverse data to portal users: Entity Lists (now called "Lists") for displaying multiple records in a grid, and forms for creating, editing, or viewing individual records. Basic Forms (Entity Forms) handle single-record interactions; Multi-Step Web Forms handle wizard-style workflows across multiple steps. This reference covers form modes, field validation, entity form metadata, web form steps and conditions, list filters, subgrid configuration, and the OData list endpoint.

---

## Basic Forms (Entity Forms) — adx_entityform

Basic forms render a single Dataverse record for Insert, Edit, or Read Only interaction.

### Form Modes

| Mode | Value (`adx_mode`) | Description |
|---|---|---|
| Insert | `100000000` | Create a new record |
| Edit | `100000001` | Edit an existing record |
| Read Only | `100000002` | View a record without editing |

### Create a Basic Form via Dataverse API

```json
POST /api/data/v9.2/adx_entityforms
{
  "adx_name": "Case Submission Form",
  "adx_entityname": "Case",
  "adx_entitylogicalname": "incident",
  "adx_formname": "Case - Portal Main Form",
  "adx_mode": 100000000,
  "adx_recordsourceallocationenabled": false,
  "adx_successmessage": "Your case has been submitted. We will contact you within 2 business days.",
  "adx_redirectwebpage@odata.bind": "/adx_webpages(<thank-you-page-id>)",
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

### Entity Form Metadata (Field-Level Configuration)

Entity form metadata records (`adx_entityformmetadata`) allow overriding the standard Dataverse form configuration for portal presentation — changing labels, setting default values, applying CSS classes, and configuring validation.

```json
POST /api/data/v9.2/adx_entityformmetadata
{
  "adx_entityformid@odata.bind": "/adx_entityforms(<form-id>)",
  "adx_columnname": "prioritycode",
  "adx_label": "Priority Level",
  "adx_style": "col-md-6",
  "adx_isrequired": true,
  "adx_constrained": true,
  "adx_description": "Select the urgency level for your request."
}
```

### Render Basic Form in Liquid

```liquid
{% entityform name: 'Case Submission Form' %}

<!-- With dynamic record ID from URL parameter -->
{% entityform name: 'Case Edit Form' key: request.params['id'] %}
```

---

## Multi-Step Web Forms — adx_webform / adx_webformstep

Web forms provide wizard-style multi-step form experiences. Each step maps to a Dataverse form and can specify conditions to branch to different next steps.

### Web Form Structure

```
adx_webform (container)
├── adx_webformstep (Step 1 — Contact Information)
│   └── next step → Step 2
├── adx_webformstep (Step 2 — Case Details)
│   ├── next step (if priority = Urgent) → Step 2b
│   └── next step (default) → Step 3
├── adx_webformstep (Step 2b — Escalation Details)
│   └── next step → Step 3
└── adx_webformstep (Step 3 — Confirmation)
    └── type: Redirect → /thank-you
```

### Create Web Form

```json
POST /api/data/v9.2/adx_webforms
{
  "adx_name": "Support Case Submission",
  "adx_startingwebformstepid@odata.bind": "/adx_webformsteps(<step1-id>)",
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

### Web Form Step Types

| Type | `adx_type` Value | Description |
|---|---|---|
| Load Form | `100000000` | Standard Dataverse form for Insert or Edit |
| Load Tab | `100000001` | Load a specific tab of a form |
| Redirect | `100000005` | Redirect to a URL or page on completion |
| Condition | `100000010` | Evaluate a condition to choose the next step |

### Create Web Form Step — Insert

```json
POST /api/data/v9.2/adx_webformsteps
{
  "adx_name": "Step 1 - Contact Information",
  "adx_webformid@odata.bind": "/adx_webforms(<form-id>)",
  "adx_type": 100000000,
  "adx_targetentitylogicalname": "incident",
  "adx_targetentityportaluserlookupattribute": "customerid",
  "adx_mode": 100000000,
  "adx_formname": "Case - Step 1 Form",
  "adx_nextstep@odata.bind": "/adx_webformsteps(<step2-id>)",
  "adx_movepreviousenabled": false,
  "adx_stepnumber": 1
}
```

### Create Web Form Step — Condition Branch

```json
POST /api/data/v9.2/adx_webformsteps
{
  "adx_name": "Check Priority",
  "adx_webformid@odata.bind": "/adx_webforms(<form-id>)",
  "adx_type": 100000010,
  "adx_condition": "prioritycode == 2",
  "adx_nextstep@odata.bind": "/adx_webformsteps(<urgent-step-id>)",
  "adx_conditiondefaultnextstep@odata.bind": "/adx_webformsteps(<standard-step-id>)",
  "adx_stepnumber": 2
}
```

**Condition syntax**: Uses C# expression-like syntax on Dataverse field logical names:
- `prioritycode == 2` — option set value equals
- `cr_amount > 5000` — numeric comparison
- `cr_requiresdocs == true` — boolean check
- `!string.IsNullOrEmpty(cr_notes)` — null/empty check

### Create Web Form Step — Redirect

```json
POST /api/data/v9.2/adx_webformsteps
{
  "adx_name": "Confirmation Redirect",
  "adx_webformid@odata.bind": "/adx_webforms(<form-id>)",
  "adx_type": 100000005,
  "adx_redirecturl": "/thank-you",
  "adx_stepnumber": 4
}
```

### Render Web Form in Liquid

```liquid
{% webform name: 'Support Case Submission' %}
```

---

## Client-Side Field Validation

Power Pages supports client-side validation through entity form metadata and JavaScript.

### Built-In Validation Types

| Validation Type | Applied Via |
|---|---|
| Required field | Entity form metadata `adx_isrequired: true` or Dataverse column requirement |
| Regular expression | Entity form metadata `adx_validationregularexpression` |
| Min/Max value | Entity form metadata numeric range settings |
| Date range | Entity form metadata date validation |
| Compare fields | Custom JavaScript |

### Add Custom JavaScript Validation

```javascript
// In a web template or page HTML — runs on form load
$(document).ready(function() {
  // Override the form submit to add custom validation
  var form = $('#entityFormPanel form');
  form.on('submit', function(e) {
    var email = $('#emailaddress1').val();
    var phone = $('#telephone1').val();

    // Validate at least one contact method provided
    if (!email && !phone) {
      e.preventDefault();
      var errorDiv = $('<div class="alert alert-danger">')
        .text('Please provide either an email address or phone number.');
      form.prepend(errorDiv);
      $('html, body').animate({ scrollTop: 0 }, 400);
      return false;
    }

    // Validate phone format
    if (phone && !/^\+?[\d\s\-\(\)]{7,20}$/.test(phone)) {
      e.preventDefault();
      $('#telephone1').addClass('is-invalid');
      return false;
    }

    return true;
  });
});
```

### Server-Side Validation (Dataverse Plugin)

Register a synchronous plugin on the `Create` or `Update` message for the target entity. The plugin throws `InvalidPluginExecutionException` with a user-friendly message — this message is displayed on the portal form.

```csharp
public void Execute(IServiceProvider serviceProvider)
{
    var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
    var target = (Entity)context.InputParameters["Target"];

    // Validate business rule
    if (target.Contains("cr_requestedamount"))
    {
        var amount = target.GetAttributeValue<Money>("cr_requestedamount");
        if (amount?.Value > 50000)
        {
            throw new InvalidPluginExecutionException(
                "Requests over $50,000 require executive approval. " +
                "Please contact your manager to submit via the executive approval process."
            );
        }
    }
}
```

---

## Entity Lists (Lists) — adx_entitylist

Entity lists render Dataverse view data as paginated, searchable HTML grids.

### Create Entity List via Dataverse API

```json
POST /api/data/v9.2/adx_entitylists
{
  "adx_name": "My Active Cases",
  "adx_entityname": "Case",
  "adx_entitylogicalname": "incident",
  "adx_view": "Active Cases",
  "adx_pagesize": 10,
  "adx_searchenabled": true,
  "adx_filterenabled": true,
  "adx_createbuttonenabled": true,
  "adx_detailsactionenabled": true,
  "adx_editactionenabled": false,
  "adx_deleteactionenabled": false,
  "adx_websiteid@odata.bind": "/adx_websites(<website-id>)"
}
```

### Render Entity List in Liquid

```liquid
{% entitylist name: 'My Active Cases' %}

<!-- With override parameters -->
{% entitylist name: 'Products', page_size: 5, search_enabled: false %}
```

### List Filter Expressions (OData-like)

Configure filter expressions on entity lists to scope the displayed records.

| Filter Type | Example |
|---|---|
| User's own records | `customerid eq {user.id}` |
| Active records only | `statecode eq 0` |
| Date range | `createdon ge 2026-01-01` |
| Current user's account | `_parentaccountid_value eq {user.parentcustomerid.id}` |
| Multi-value | `prioritycode eq 1 or prioritycode eq 2` |

### List Action Buttons

Entity list action buttons are configured as `adx_entitylistactionlink` records linked to the entity list.

```json
POST /api/data/v9.2/adx_entitylistactionlinks
{
  "adx_entitylistid@odata.bind": "/adx_entitylists(<list-id>)",
  "adx_name": "View Details",
  "adx_type": 100000002,
  "adx_webpageid@odata.bind": "/adx_webpages(<detail-page-id>)",
  "adx_querystring": "id={0}",
  "adx_isenabled": true,
  "adx_label": "View",
  "adx_cssclass": "btn btn-primary btn-sm"
}
```

**Action types**: `100000000` = Insert, `100000001` = Edit, `100000002` = Details, `100000003` = Delete, `100000004` = Download, `100000012` = Navigate to URL, `100000013` = Run workflow.

---

## Subgrid Configuration

Subgrids display related records within a basic form. They are configured via entity form metadata.

### Enable a Subgrid on a Basic Form

The parent Dataverse form must have a subgrid control added to it. The subgrid uses a Dataverse view to display related records.

```json
POST /api/data/v9.2/adx_entityformmetadata
{
  "adx_entityformid@odata.bind": "/adx_entityforms(<form-id>)",
  "adx_columnname": "Contacts",
  "adx_subgridname": "contact_customer_accounts",
  "adx_type": "subgrid",
  "adx_createenabled": true,
  "adx_viewenabled": true,
  "adx_editenabled": false,
  "adx_deleteenabled": false
}
```

---

## OData List Endpoint

Entity lists expose an OData-compatible JSON endpoint for client-side JavaScript data access.

### Endpoint Format

```
GET /_odata/{entity-set-name}
GET /_odata/{entity-set-name}({id})
GET /_odata/{entity-set-name}?$filter=...&$orderby=...&$top=...&$skip=...&$select=...
```

**Entity set names** use the Dataverse plural entity set name (e.g., `incidents`, `contacts`, `accounts`, `cr_requests`).

### Example OData Requests

```javascript
// Fetch active cases for current user (client-side JavaScript)
fetch('/_odata/incidents?$filter=statecode eq 0&$select=incidentid,title,statuscode&$top=25', {
  headers: {
    '__RequestVerificationToken': $('[name=__RequestVerificationToken]').val()
  }
})
.then(r => r.json())
.then(data => {
  data.value.forEach(incident => {
    console.log(incident.title);
  });
});

// Get a specific record
fetch('/_odata/incidents(00000000-0000-0000-0000-000000000001)')
.then(r => r.json())
.then(incident => console.log(incident));

// Paginate
fetch('/_odata/incidents?$top=10&$skip=20&$orderby=createdon desc')
.then(r => r.json())
.then(data => {
  console.log('Total:', data['@odata.count']);
  data.value.forEach(item => console.log(item));
});
```

**Authentication**: The OData endpoint respects table permissions — only records the user has permission to read are returned. No additional auth token is needed beyond the active portal session.

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| Form submits but record not created | Table permission lacks Create privilege for the user's web role | Add Create permission to the entity permission record |
| Edit form loads with blank fields | Wrong form mode or record ID not passed via URL parameter | Check `adx_mode` value; ensure `?id=` parameter is in URL |
| Web form does not advance to next step | Required fields on current step not filled; condition step not configured | Verify required field metadata; check `adx_nextstep` binding |
| Entity list shows no records | Table permission lacks Read; filter expression too restrictive | Verify entity permission scope and web role assignment |
| OData endpoint returns 403 | No Read table permission for anonymous or current user's role | Add Global or Contact scoped Read permission |
| Subgrid empty despite related records | Subgrid view not configured; table permission missing on related entity | Verify view name; add entity permission for related table |
| `adx_condition` on step not evaluated | Condition field name mismatch (case-sensitive) | Verify field logical name exactly matches Dataverse column name |
| Client validation fires but form still submits | `e.preventDefault()` not called; jQuery not available | Ensure jQuery is loaded before custom script; verify `return false` |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Web form steps per form | No hard limit | Practical: keep under 20 steps |
| Entity list page size max | 1,000 | Configurable; default 10 |
| OData result set per request | 5,000 | Use `$skip` for pagination |
| Basic form fields displayed | No hard limit | Performance: keep under 50 visible fields |
| File upload via form | 10 MB per file | Stored as Notes (Annotation) attachments |
| Web form session timeout | 24 hours | Incomplete forms expire |
| Subgrid records per form | 5,000 | Default; paginated |
| Attachment types allowed | Configurable via site settings | `BlockedAttachments` site setting |
