---
description: "Generate a Power Automate flow definition JSON from a description"
argument-hint: "Description of the flow to create (trigger, actions, connectors)"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Skill
---

# /create-flow — Generate a Power Automate Flow Definition

## Purpose

Generates a complete, valid `clientdata` JSON payload for creating a Power Automate cloud flow via the Dataverse Web API. The output can be used directly with `POST /api/data/v9.2/workflows`.

## Instructions

When this command is invoked:

1. **Load the power-automate-flows skill** for reference on the definition schema, trigger types, action types, and connection references.

2. **Analyze the user's description** to determine:
   - **Trigger type**: Manual button, HTTP webhook, recurrence/schedule, or connector-based (SharePoint, Forms, etc.)
   - **Actions needed**: Run Office Script, HTTP call, send email, Teams notification, condition, loop, compose, approval, etc.
   - **Connectors required**: Excel Online Business, Office 365 Outlook, SharePoint, Teams, Forms, Approvals, etc.
   - **Parameters**: Does the trigger accept input? What schema?
   - **Return value**: Does the flow need a Response action (for HTTP triggers)?

3. **Generate a complete `clientdata` JSON** that:
   - Has the correct `$schema` URL for Logic Apps 2016-06-01
   - Includes `$connections` and `$authentication` standard parameters
   - Has exactly one trigger with the correct `type` and `kind`
   - Has all actions with proper `runAfter` sequencing
   - Includes all required `connectionReferences` with correct API IDs
   - Uses correct expression syntax (`@triggerBody()`, `@outputs()`, `@utcNow()`, etc.)
   - Sets `schemaVersion: "1.0.0.0"`

4. **Also generate the Dataverse API call** showing the complete `POST /workflows` request body with `category: 5`, `type: 1`, `primaryentity: "none"`, and the `clientdata` as an escaped JSON string.

5. **If the flow runs an Office Script**, also generate:
   - The corresponding Office Script (`.ts` file) with proper `main()` signature
   - JSDoc `@param` comments for Power Automate parameters
   - Return type interface for the script's result

6. **Write the output** to a `.json` file (flow definition) and optionally a `.ts` file (Office Script).

## Checklist Before Output

- [ ] `$schema` is `https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#`
- [ ] `contentVersion` is `"1.0.0.0"`
- [ ] Both `$connections` and `$authentication` parameters are present
- [ ] Exactly one trigger defined
- [ ] All actions have correct `runAfter` (first action: `{}`, subsequent: reference predecessor)
- [ ] All connector actions include `"authentication": "@parameters('$authentication')"`
- [ ] `connectionReferences` includes every connector used in actions
- [ ] API IDs match the correct connector (e.g., `shared_excelonlinebusiness` for Excel)
- [ ] Expression syntax is correct (`@triggerBody()`, not `triggerBody()`)
- [ ] `schemaVersion` is `"1.0.0.0"` at the top level
- [ ] If HTTP trigger: Response actions for success and error paths
- [ ] If Office Script: script parameters match `ScriptParameters/` keys in the action

## Example Usage

```bash
# Scheduled report
/create-flow Run my SalesReport Office Script every weekday at 8 AM and email the team

# HTTP API endpoint
/create-flow HTTP endpoint that accepts order data, writes it to Excel via script, and returns the result

# Event-driven
/create-flow When a new file appears in SharePoint /Reports folder, run the DataCleanup script and post to Teams

# Approval workflow
/create-flow Manual button to run analysis script, then request manager approval, then publish
```
