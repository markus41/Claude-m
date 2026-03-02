---
name: action-configure
description: "Configure an action (email, Teams, Power Automate, webhook) on a Data Activator trigger"
argument-hint: "--trigger <trigger-name> --type <email|teams|flow|webhook> [--recipient <address>] [--url <webhook-url>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Configure a Trigger Action

Add an action to a Data Activator trigger that executes when the trigger condition is met.

## Instructions

### 1. Validate Inputs

- `--trigger` — Name of the trigger to attach the action to. Ask if not provided.
- `--type` — Action type: `email`, `teams`, `flow`, or `webhook`. Ask if not provided.
- `--recipient` — Email address or Teams channel (for `email` and `teams` types). Ask if not provided.
- `--url` — Webhook URL or Power Automate flow URL (for `webhook` and `flow` types). Ask if not provided.

### 2. Configure by Action Type

**For `email` action**:
- **To**: Validate email address format. Support comma-separated multiple recipients.
- **Subject**: Ask the user for a subject line. Suggest including dynamic tokens: `Alert: {ObjectName} — {PropertyName} is {PropertyValue}`.
- **Body**: Ask for body content. Suggest a template:
  ```
  Trigger "{TriggerName}" fired at {TriggerTime}.

  Object: {ObjectName} (Key: {ObjectKey})
  Property: {PropertyName} = {PropertyValue}

  Workspace: {WorkspaceName}
  ```
- **Dynamic recipients**: Ask if the recipient should come from an object property (e.g., `assignedEngineer` field). If yes, configure dynamic recipient mapping.

**For `teams` action**:
- **Target**: Ask for the Teams channel (team name + channel name) or individual user.
- **Message**: Ask for the message content with dynamic tokens.
- **Mention**: Ask if specific users should be @mentioned in the message.

**For `flow` (Power Automate) action**:
- **Flow URL**: The HTTP trigger URL of a Power Automate cloud flow.
- **Input schema**: Show the expected JSON payload that the flow will receive:
  ```json
  {
    "triggerName": "{TriggerName}",
    "triggerTime": "{TriggerTime}",
    "objectType": "{ObjectType}",
    "objectKey": "{ObjectKey}",
    "properties": { ... }
  }
  ```
- Guide the user to create a flow with an HTTP request trigger if they do not have one.

**For `webhook` action**:
- **URL**: Must be HTTPS. Flag HTTP URLs as insecure.
- **Headers**: Ask if custom headers are needed (e.g., `Authorization`, `X-API-Key`). Warn against putting secrets in the URL.
- **Payload**: Show the default JSON payload structure. Ask if customization is needed.

### 3. Configure Throttling

- Ask if action throttling is needed (recommended for high-frequency data sources).
- Suggest: Maximum N actions per hour per object instance.
- Default: Follow the trigger's cooldown period.

### 4. Validate Configuration

- **Email**: Verify recipient format (contains `@` and a domain).
- **Teams**: Verify channel exists (if possible via API).
- **Flow**: Verify URL is reachable with a test OPTIONS request.
- **Webhook**: Verify URL is HTTPS and reachable.

### 5. Display Action Summary

```
Action added to trigger "High Temperature Alert":
  Type: Email
  To: ops-team@contoso.com
  Subject: ALERT: Machine {machineId} temperature is {temperature}C
  Throttling: Max 4 per hour per machine

Next steps:
  - Start the trigger to begin monitoring
  - Add additional actions with /action-configure --trigger "High Temperature Alert" --type teams
  - Monitor trigger activity with /reflex-monitor
```
