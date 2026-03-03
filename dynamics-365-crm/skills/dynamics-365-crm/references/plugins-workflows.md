# Plugins, Workflows, and Custom APIs Reference — Dataverse

## Overview

This reference covers Dataverse plugin development (pre/post operation hooks), Power Automate modern flows replacing classic workflows, Custom APIs, Custom Process Actions, and Business Process Flows. These are the primary extensibility mechanisms for CRM automation.

---

## Plugin Architecture

Plugins are .NET assemblies that execute synchronously or asynchronously in the Dataverse event pipeline.

### Plugin Pipeline Stages

| Stage | Type | Timing | Use Case |
|-------|------|--------|----------|
| Pre-Validation (10) | Sync | Before security checks | Validate input before any DB access |
| Pre-Operation (20) | Sync | After security, before DB write | Modify input data before save |
| Main Operation (30) | System | Database operation | Not available to plugins |
| Post-Operation (40) | Sync/Async | After DB write | Trigger downstream actions |

**Stage 10 (Pre-Validation):** Runs in the caller's security context. Can throw exceptions to abort the operation before any DB work is done. Best for input validation.

**Stage 20 (Pre-Operation):** Can modify the `Target` entity before it is written. Use to default field values, enforce business rules, or canonicalize data.

**Stage 40 (Post-Operation):** Entity is already written. Use for notifications, creating related records, or async background work. Async plugins here do not block the caller.

---

## IPlugin Interface

```csharp
using Microsoft.Xrm.Sdk;
using System;

/// <summary>
/// Plugin that defaults the Owner and Priority on Opportunity create.
/// Register on: opportunity, Create, Pre-Operation (stage 20), Sync
/// </summary>
public class OpportunityPreCreate : IPlugin
{
    public void Execute(IServiceProvider serviceProvider)
    {
        // 1. Get execution context
        var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

        // Only run on Create of Opportunity
        if (context.MessageName.ToLower() != "create"
            || context.PrimaryEntityName.ToLower() != "opportunity")
        {
            return;
        }

        // 2. Get the target entity (the record being created)
        if (!context.InputParameters.Contains("Target")
            || context.InputParameters["Target"] is not Entity target)
        {
            return;
        }

        // 3. Get the organization service
        var serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
        // Run as system (null) or as the initiating user (context.UserId)
        var service = serviceFactory.CreateOrganizationService(null);

        // 4. Get the tracing service for logging
        var tracer = (ITracingService)serviceProvider.GetService(typeof(ITracingService));

        try
        {
            // Set default priority if not provided
            if (!target.Contains("prioritycode"))
            {
                target["prioritycode"] = new OptionSetValue(2); // Normal
                tracer.Trace("Defaulted prioritycode to Normal (2)");
            }

            // Default close date to 90 days from now
            if (!target.Contains("estimatedclosedate"))
            {
                target["estimatedclosedate"] = DateTime.UtcNow.AddDays(90);
            }

            // Validate required fields
            if (!target.Contains("name") || string.IsNullOrWhiteSpace(target.GetAttributeValue<string>("name")))
            {
                throw new InvalidPluginExecutionException("Opportunity name is required.");
            }

            tracer.Trace("OpportunityPreCreate completed successfully.");
        }
        catch (InvalidPluginExecutionException)
        {
            throw; // Re-throw user-facing errors
        }
        catch (Exception ex)
        {
            tracer.Trace($"Unexpected error: {ex.Message}");
            throw new InvalidPluginExecutionException($"Plugin error: {ex.Message}", ex);
        }
    }
}
```

---

## Post-Operation Plugin (with Related Record Creation)

```csharp
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

/// <summary>
/// When a Lead is qualified, create a follow-up Task for the owner.
/// Register on: lead, QualifyLead, Post-Operation (stage 40), Async
/// </summary>
public class LeadQualifiedPostOperation : IPlugin
{
    public void Execute(IServiceProvider serviceProvider)
    {
        var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

        if (context.MessageName.ToLower() != "qualifylead")
            return;

        var serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
        var service = serviceFactory.CreateOrganizationService(null);
        var tracer = (ITracingService)serviceProvider.GetService(typeof(ITracingService));

        try
        {
            // Get the created opportunity ID from OutputParameters
            var opportunityId = context.OutputParameters.Contains("CreatedEntities")
                ? ExtractOpportunityId(context.OutputParameters["CreatedEntities"])
                : null;

            if (opportunityId == null)
            {
                tracer.Trace("No opportunity created during lead qualification.");
                return;
            }

            // Create a follow-up task linked to the opportunity
            var followupTask = new Entity("task")
            {
                ["subject"] = "Initial outreach call",
                ["scheduledend"] = DateTime.UtcNow.AddDays(2),
                ["regardingobjectid"] = new EntityReference("opportunity", opportunityId.Value),
                ["prioritycode"] = new OptionSetValue(2), // Normal
                ["description"] = "Follow up with the newly qualified lead.",
            };

            var taskId = service.Create(followupTask);
            tracer.Trace($"Created follow-up task {taskId} for opportunity {opportunityId}");
        }
        catch (Exception ex)
        {
            tracer.Trace($"LeadQualifiedPostOperation error: {ex.Message}");
            // Do NOT re-throw from async post-operation — it would rollback the lead qualification
        }
    }

    private Guid? ExtractOpportunityId(object param)
    {
        // OutputParameters from QualifyLead contain EntityReferenceCollection
        if (param is EntityReferenceCollection refs)
        {
            foreach (var r in refs)
            {
                if (r.LogicalName == "opportunity")
                    return r.Id;
            }
        }
        return null;
    }
}
```

---

## Plugin Registration via Plugin Registration Tool

```powershell
# Install the Plugin Registration Tool via NuGet / PRT
# Connect to Dataverse:
# URL: https://myorg.crm.dynamics.com
# Auth: OAuth (recommended) or Username/Password

# Step by step:
# 1. Register Assembly → Browse to .dll → Register Selected Plugins
# 2. Register New Step:
#    - Message: Create
#    - Primary Entity: opportunity
#    - Event Pipeline Stage: Pre-operation (20) or Post-operation (40)
#    - Execution Mode: Synchronous or Asynchronous
#    - Deployment: Server
#    - Run in User's Context: Calling User or System (null user)
# 3. Register Filtering Attributes (optional): Only trigger for specific field changes
```

---

## IOrganizationService Common Operations

```csharp
// Retrieve a single record
var account = service.Retrieve("account", accountId, new ColumnSet("name", "emailaddress1", "telephone1"));

// Create a record
var newContact = new Entity("contact")
{
    ["firstname"] = "Jane",
    ["lastname"] = "Smith",
    ["emailaddress1"] = "jane.smith@contoso.com",
    ["parentcustomerid"] = new EntityReference("account", accountId),
};
var contactId = service.Create(newContact);

// Update a record (partial update — only set fields are modified)
var update = new Entity("contact", contactId)
{
    ["jobtitle"] = "Senior Engineer",
    ["mobilephone"] = "+1-555-0100",
};
service.Update(update);

// Delete a record
service.Delete("contact", contactId);

// Associate records (N:N relationship)
service.Associate("account", accountId,
    new Relationship("contact_customer_accounts"),
    new EntityReferenceCollection { new EntityReference("contact", contactId) });

// Execute a message
var req = new Microsoft.Crm.Sdk.Messages.QualifyLeadRequest
{
    LeadId = new EntityReference("lead", leadId),
    CreateAccount = true,
    CreateContact = true,
    CreateOpportunity = true,
    Status = new OptionSetValue(3), // Qualified
};
var resp = (Microsoft.Crm.Sdk.Messages.QualifyLeadResponse)service.Execute(req);

// Query with QueryExpression
var query = new QueryExpression("opportunity")
{
    ColumnSet = new ColumnSet("name", "estimatedvalue", "closedate"),
    Criteria =
    {
        Conditions =
        {
            new ConditionExpression("statecode", ConditionOperator.Equal, 0),
            new ConditionExpression("estimatedvalue", ConditionOperator.GreaterThan, 10000),
        }
    },
    TopCount = 50,
};
var results = service.RetrieveMultiple(query);
```

---

## Power Automate Cloud Flows (replacing Classic Workflows)

Classic Dataverse workflows are deprecated in favor of Power Automate cloud flows. Use the Dataverse connector triggers.

```
Trigger: When a row is added, modified, or deleted
  → Table: Opportunities
  → Change type: Modified
  → Select columns: statecode, statuscode

Condition: If statecode equals 1 (Won)
  → Action: Add a row into a table (Dataverse)
    → Table: Tasks
    → Subject: "Send contract to customer"
    → ScheduledEnd: addDays(utcNow(), 3)
    → RegardingObjectId: opportunityid (dynamic content)
```

**Power Automate Dataverse Connector Triggers:**

| Trigger | Description |
|---|---|
| When a row is added, modified, or deleted | Real-time CDC trigger |
| When an action is performed | Responds to Custom API calls |
| When a flow step is run from a business process flow | BPF stage action |

---

## Custom API

Custom APIs provide named HTTP endpoints backed by plugin code. They replace deprecated Custom Process Actions.

```csharp
// Custom API plugin — handles the "prefix_CalculateDiscount" message
public class CalculateDiscountPlugin : IPlugin
{
    public void Execute(IServiceProvider serviceProvider)
    {
        var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

        // Read input parameters (defined in Custom API registration)
        var totalAmount = context.InputParameters.Contains("TotalAmount")
            ? (decimal)context.InputParameters["TotalAmount"]
            : 0m;
        var customerTier = context.InputParameters.Contains("CustomerTier")
            ? (string)context.InputParameters["CustomerTier"]
            : "Standard";

        // Calculate discount
        var discountRate = customerTier switch
        {
            "Gold" => 0.15m,
            "Silver" => 0.10m,
            _ => 0.05m,
        };
        var discountAmount = totalAmount * discountRate;

        // Set output parameters
        context.OutputParameters["DiscountAmount"] = discountAmount;
        context.OutputParameters["DiscountRate"] = discountRate;
    }
}
```

**Calling a Custom API from the Web API:**

```python
def call_custom_api(token: str, org_url: str, action_name: str, body: dict) -> dict:
    """Call a Dataverse Custom API (unbound action)."""
    url = f"{org_url}/api/data/v9.2/{action_name}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
    }
    resp = requests.post(url, json=body, headers=headers)
    resp.raise_for_status()
    return resp.json()

# Example: Call CalculateDiscount
result = call_custom_api(token, org_url, "prefix_CalculateDiscount", {
    "TotalAmount": 50000,
    "CustomerTier": "Gold",
})
print(result["DiscountAmount"])  # 7500
```

---

## Business Process Flows (BPF)

BPFs guide users through multi-stage processes within a CRM form.

```python
# Get BPF stages for an opportunity
def get_opportunity_bpf_stages(token: str, org_url: str, opportunity_id: str) -> dict:
    url = (
        f"{org_url}/api/data/v9.2/opportunitysalesprocesses"
        f"?$filter=opportunityid eq {opportunity_id}"
        f"&$select=activestageid,traversedpath,bpf_name,statecode"
    )
    headers = {"Authorization": f"Bearer {token}", "OData-Version": "4.0"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json().get("value", [{}])[0]

# Move to the next BPF stage
def advance_bpf_stage(token: str, org_url: str, process_id: str, next_stage_id: str) -> None:
    url = f"{org_url}/api/data/v9.2/opportunitysalesprocesses({process_id})"
    body = {
        "activestageid@odata.bind": f"/processstages({next_stage_id})"
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
    }
    resp = requests.patch(url, json=body, headers=headers)
    resp.raise_for_status()
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `InvalidPluginExecutionException` | Plugin threw user-facing error | Message shown in CRM UI; keep messages clear and actionable |
| `0x80040203` | Security privilege check failed in plugin | Plugin runs as system user; check entity-level security roles |
| `0x80044501` | Plugin assembly not found in database | Re-register the plugin assembly |
| `0x8004d201` | Plugin isolated sandbox timeout | Default 2-minute limit; optimize queries and reduce HTTP calls |
| `0x80040265` | Circular reference in plugin execution | Avoid plugins that trigger themselves; use depth check |
| `0x8006040a` | Custom API not found | Verify Custom API registration and unique name |
| BPF entity not found | BPF not activated or not enabled on entity | Activate the BPF in Process → Activate |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Plugin execution timeout (sandbox) | 2 minutes | Async plugins have longer but undocumented limits |
| Plugin assembly size | 16 MB | Including all dependencies in the assembly |
| Plugin depth limit | 8 | Prevents infinite loops from plugin-triggered chains |
| Custom API request size | 16 MB | For large payloads, use blob storage |
| Async plugin retry | 3 attempts | Failed async plugins retry with backoff |
| BPF stages per process | 30 | Practical UX limit is much lower |
| BPF instances per record | 1 per BPF type | Multiple BPF types can run on the same record |
| Power Automate flow run history | 28 days | Older runs are purged; export for long-term audit |
| Classic workflow deprecation | Deprecated | Migrate to Power Automate by March 2026 |
