# Triggers and Conditions — Complete Reference

This reference covers all trigger condition types, comparison operators, duration settings, compound logic, and the REST API for programmatic trigger management in Microsoft Fabric Data Activator.

---

## Trigger Condition Types

### 1. Value Comparison

Fires when a property value meets a comparison criterion at the moment of evaluation.

| Behavior | Description |
|----------|-------------|
| Evaluation | On every incoming event for the object instance |
| Fire frequency | Can fire on every event that matches — use cooldown to reduce noise |
| State | Stateless — no memory of previous values |

```
// Syntax examples
temperature > 85
orderTotal >= 10000
status == "Error"
region != "North"
batteryLevel between (10, 20)
```

**Numeric operators**:
| Operator | Description | Example |
|----------|-------------|---------|
| `>` | Greater than | `temperature > 85` |
| `<` | Less than | `pressure < 10` |
| `>=` | Greater than or equal to | `errorCount >= 5` |
| `<=` | Less than or equal to | `stockLevel <= 100` |
| `==` | Equal to | `priority == 1` |
| `!=` | Not equal to | `statusCode != 200` |
| `between` | Inclusive range | `humidity between (40, 60)` |

**String operators**:
| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match (case-insensitive) | `status equals "Error"` |
| `not equals` | Does not match | `region not equals "Unknown"` |
| `contains` | Substring match | `message contains "timeout"` |
| `starts with` | Prefix match | `deviceId starts with "MCH-"` |
| `ends with` | Suffix match | `eventType ends with "_FAILED"` |

**Boolean operators**:
| Operator | Description |
|----------|-------------|
| `is true` | Property value is true |
| `is false` | Property value is false |

---

### 2. Value Change

Fires when a property transitions to a specific value or changes at all.

| Behavior | Description |
|----------|-------------|
| Evaluation | Compares current value to the previous value received |
| Fire frequency | Once per distinct state change |
| State | Stateful — tracks previous value per object instance |

```
// Fire when status changes from any value to "Cancelled"
status changes to "Cancelled"

// Fire whenever status changes (any transition)
status changes

// Fire when isAlarmActive transitions to true
isAlarmActive changes to true
```

**"Changes to" with numeric values**: Fires when the property value becomes exactly equal to the specified value. For continuous numeric signals, use "Value comparison" instead — exact equality on floating-point values is unreliable.

**"Changes" (any change)**: Useful for status fields with multiple possible values. Fires on every state transition regardless of the new value. Pair with dynamic action recipients (e.g., `assignedAgent`) to route notifications to the responsible party.

---

### 3. Becomes True

Fires when a boolean expression transitions from false to true. Unlike "Value comparison," this fires only on the transition, not on every event while the condition is true.

| Behavior | Description |
|----------|-------------|
| Evaluation | Evaluates expression on each event |
| Fire frequency | Once per false-to-true transition per object instance |
| State | Stateful — tracks whether condition was previously true |
| Reset | After the condition becomes false, the trigger can fire again when it becomes true |

```
// Fires once when temperature first crosses 85 (not on every high-temp event)
temperature > 85 becomes true

// Fires once when multiple conditions become simultaneously true
temperature > 85 AND pressure > 200 becomes true
```

**Comparison with "Value comparison"**:
- "Value comparison" + no cooldown → fires on every matching event (can be hundreds per minute for IoT)
- "Becomes true" → fires once when the condition first becomes true (much less noisy)

Use "Becomes true" as the default for threshold alerts. Use "Value comparison" only when you need to capture every event (e.g., for audit log purposes).

---

### 4. Remains True

Fires when a condition stays continuously true for a specified duration. If the condition becomes false at any point during the window, the timer resets.

| Behavior | Description |
|----------|-------------|
| Evaluation | Tracks the condition start time and checks if it has persisted |
| Fire frequency | Once per sustained condition period (respects cooldown) |
| State | Stateful — tracks condition start time per object instance |
| Timer reset | Any event where condition is false resets the duration timer |

```
// Fire when temperature stays above 85 for 10 consecutive minutes
temperature > 85 remains true for 10 minutes

// Fire when a service stays in degraded state for 30 minutes
healthStatus equals "Degraded" remains true for 30 minutes

// Compound — both conditions must remain true
temperature > 80 AND humidity > 70 remains true for 5 minutes
```

**Duration options**:
| Duration | Use Case |
|----------|----------|
| 1 minute | Very sensitive alerts (high-frequency data, critical processes) |
| 5 minutes | Standard IoT alert debouncing |
| 10 minutes | Operational threshold alerts |
| 30 minutes | Business process SLA breach alerts |
| 1 hour | Long-running process monitoring |
| Custom | Any value in minutes or hours |

**Why "remains true" is preferred over "becomes true" for IoT**:
Sensor data often has transient spikes that are not genuine alerts. A temperature of 87°C for one reading is a spike; 87°C for 5 minutes is a real problem. "Remains true for 5 minutes" eliminates false positives from transient noise.

---

### 5. Absence Detection

Fires when no events are received for a specified duration. Used to detect offline devices, stalled pipelines, or missing heartbeats.

| Behavior | Description |
|----------|-------------|
| Evaluation | Tracks time since last event received per object instance |
| Fire frequency | Once per absence window (respects cooldown) |
| Recovery | When events resume, the absence window resets — does NOT auto-fire a recovery notification |
| State | Stateful — tracks last event timestamp per object instance |

```
// Fire when a device stops sending events for 5 minutes
No events received for 5 minutes

// Fire when a machine heartbeat is missing for 10 minutes
No events received for 10 minutes
```

**Absence detection caveats**:
1. The timer starts from the last received event, not from trigger start time. A device that was already offline when the trigger was started will fire immediately after the absence window elapses.
2. Data Activator must have received at least one event for an object instance before absence detection applies. Newly registered devices that have never sent data will not trigger absence alerts.
3. For recovery notifications (device comes back online), add a second trigger with condition `status changes` or create a webhook receiver that fires on the first event after an absence.

---

## Compound Conditions

### AND Logic

All sub-conditions must be true simultaneously for the trigger to fire.

```
// Both temperature AND pressure must exceed limits
temperature > 85 AND pressure > 200

// Status error AND the error has been active long enough
status equals "Error" AND errorCode != 0

// Works with "remains true" wrapper
temperature > 85 AND pressure > 200 remains true for 5 minutes
```

**AND evaluation**: For compound AND conditions, ALL sub-conditions are evaluated on each incoming event for the object instance. If any sub-condition uses columns from different event schemas (e.g., temperature comes from one event type and pressure from another), the values used are the last received values for each property.

### OR Logic

At least one sub-condition must be true.

```
// Temperature OR pressure exceeds safe limits
temperature > 85 OR pressure > 200

// Multiple critical statuses
status equals "Error" OR status equals "Critical" OR status equals "Offline"
```

### Mixing AND / OR

Group conditions using parentheses conceptually (the UI presents nested conditions):

```
// (temperature > 85 AND location equals "Server Room") OR (temperature > 90)
// Meaning: Server room alert at 85, anywhere else at 90
```

---

## Cooldown Configuration

Cooldown prevents repeated trigger firings for the same object instance within a time window. Cooldowns are per-object-instance — Machine-001 and Machine-002 have independent cooldowns.

| Cooldown | Recommended For |
|----------|----------------|
| None | State change triggers (each transition is meaningful) |
| 5 minutes | High-frequency IoT sensor monitoring |
| 15 minutes | Operational threshold alerts |
| 1 hour | Business KPI alerts |
| 4 hours | Escalation triggers |
| 24 hours | Daily report triggers |

**Interaction with "Remains true"**: After a "remains true" trigger fires, the cooldown starts. If the condition remains true throughout the cooldown, the trigger will fire again after the cooldown expires. This behavior continues until the condition becomes false.

**Action throttling vs Cooldown**:
- **Cooldown**: Prevents the trigger logic from re-evaluating and firing during the cooldown period.
- **Action throttling**: A separate setting that limits the maximum number of action executions per hour. Configure both for defense in depth.

---

## Trigger Management REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{wId}/reflexes/{rId}/triggers` | Workspace Viewer | — | Lists all triggers in a Reflex |
| GET | `/workspaces/{wId}/reflexes/{rId}/triggers/{tId}` | Workspace Viewer | — | Returns trigger definition and status |
| POST | `/workspaces/{wId}/reflexes/{rId}/triggers/{tId}/start` | Workspace Contributor | — | Starts trigger monitoring |
| POST | `/workspaces/{wId}/reflexes/{rId}/triggers/{tId}/stop` | Workspace Contributor | — | Stops trigger monitoring |

```bash
# Start a trigger
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/reflexes/${REFLEX_ID}/triggers/${TRIGGER_ID}/start" \
  -H "Authorization: Bearer ${TOKEN}"

# Stop a trigger
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/reflexes/${REFLEX_ID}/triggers/${TRIGGER_ID}/stop" \
  -H "Authorization: Bearer ${TOKEN}"

# List all triggers and their status
curl \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/reflexes/${REFLEX_ID}/triggers" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Error Codes and Remediation

| Error / Issue | Meaning | Remediation |
|---|---|---|
| `Trigger never fires` | Condition too strict; data not flowing; trigger not started | Check data preview for current property values; verify trigger is in "Started" state via API |
| `Trigger fires on every event` | No cooldown configured; "Value comparison" used instead of "Becomes true" | Add cooldown; switch to "Becomes true" condition type |
| `Absent trigger fires immediately` | Device was already offline when trigger started | Expected behavior — absence timer starts from last received event, not trigger start time |
| `State change not detected` | Key column has duplicate values causing cross-object state pollution | Verify key column uniqueness in data preview |
| `"Remains true" fires too early` | Data source events arrive with gaps > duration window | Smooth data upstream with eventstream aggregation; increase duration threshold |
| `Compound AND not firing` | Properties come from different event schemas; one property stale | All properties in AND condition use last-known values; verify all properties are regularly updated |
| `403 on trigger start/stop` | Caller lacks Contributor role | Assign Workspace Contributor role |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Triggers per Reflex item | 100 | |
| Conditions per trigger | 10 | AND/OR combinations |
| Objects per Reflex item | 50 | |
| Object instances tracked | 100,000 per object | e.g., 100K distinct DeviceId values |
| Minimum cooldown | 1 minute | Cannot be set to zero for "Remains true" triggers |
| Maximum absence window | 7 days | |
| Maximum "remains true" duration | 7 days | |
| Action throttle maximum | 1,000 per hour per object instance | Hard limit |
| Trigger history retention | 30 days | |
