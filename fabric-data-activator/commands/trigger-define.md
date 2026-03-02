---
name: trigger-define
description: "Define a trigger condition on a Reflex object property with threshold, state change, or absence detection"
argument-hint: "--object <ObjectName> --property <propertyName> --condition <condition-expression> [--duration <minutes>] [--cooldown <minutes>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Define a Trigger

Create a trigger condition on a Data Activator object property within a Reflex item.

## Instructions

### 1. Validate Inputs

- `--object` — Name of the object to monitor (e.g., `Machine`). Ask if not provided.
- `--property` — Property to evaluate (e.g., `temperature`). Ask if not provided.
- `--condition` — Condition expression (e.g., `> 85`, `changes to "Error"`, `no events for 5 minutes`). Ask if not provided.
- `--duration` — Optional "remains true for" duration in minutes. Omit for immediate firing.
- `--cooldown` — Optional cooldown period in minutes between firings for the same object instance. Default: 15 minutes.

### 2. Parse the Condition

Determine the condition type from the expression:

| Expression format | Condition type | Example |
|-------------------|---------------|---------|
| `> N`, `< N`, `>= N`, `<= N`, `== N` | Threshold comparison | `temperature > 85` |
| `between N and M` | Range comparison | `temperature between 60 and 85` |
| `changes to "value"` | State change | `status changes to "Error"` |
| `equals "value"` | String comparison | `region equals "West"` |
| `contains "value"` | Substring match | `errorMessage contains "timeout"` |
| `no events for N minutes` | Absence detection | No data for 5 minutes |
| `is true` / `is false` | Boolean check | `isOverdue is true` |

### 3. Validate Condition Against Property Type

- Numeric operators (`>`, `<`, `>=`, `<=`, `between`) require a numeric property. Flag if used with a string property.
- String operators (`equals`, `contains`, `starts with`, `ends with`) require a string property. Flag if used with a numeric property.
- `changes to` works with both string and numeric properties.
- `no events for` applies to the object as a whole, not a specific property.

### 4. Configure Duration (Optional)

If `--duration` is provided:
- Add a "remains true for X minutes" qualifier.
- Explain: The condition must stay continuously true for the specified duration. If it becomes false at any point, the timer resets.
- Recommend durations based on data frequency:
  - IoT (events every second): 1-5 minutes
  - Business data (events every minute): 5-15 minutes
  - Batch data (hourly/daily refresh): 30-60 minutes

### 5. Configure Cooldown

Apply the cooldown period (default 15 minutes):
- Explain: After firing, the trigger will not fire again for the same object instance until the cooldown elapses.
- Recommend cooldowns based on scenario:
  - Critical alerts: 5-15 minutes
  - Warning alerts: 30-60 minutes
  - Daily reports: 24 hours (1440 minutes)

### 6. Display Trigger Summary

```
Trigger: High Temperature Alert
  Object: Machine
  Condition: temperature > 85
  Duration: remains true for 2 minutes
  Cooldown: 15 minutes per instance
  Status: Not started (use /action-configure to add actions, then start)
```

### 7. Next Steps

- Use `/action-configure` to add an action (email, Teams, Power Automate, webhook) to this trigger.
- Multiple triggers can be defined on the same object with different conditions.
- Remind the user that the trigger must be **started** after configuration to begin monitoring.
