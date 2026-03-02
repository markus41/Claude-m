# Fabric Data Activator Plugin

Microsoft Fabric Data Activator — create Reflex items with tracked objects, define trigger conditions (threshold, state change, absence, trend), configure actions (email, Teams, Power Automate, webhook), integrate with eventstreams and Power BI visuals, and build event-driven automation on real-time Fabric data.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Fabric Data Activator so it can design Reflex items, define trigger conditions, configure actions, integrate with eventstreams and Power BI, and guide monitoring and debugging. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to verify Fabric workspace access and configure Azure identity:

```
/setup              # Full guided setup
/setup --minimal    # Workspace verification only
```

Requires an Azure subscription with access to a Fabric-enabled workspace.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Verify Fabric workspace access, configure Azure identity, prepare eventstream connectivity |
| `/reflex-create` | Create a new Reflex item with objects and data source binding |
| `/trigger-define` | Define a trigger condition (threshold, state change, absence detection) |
| `/action-configure` | Configure an action (email, Teams, Power Automate, webhook) on a trigger |
| `/reflex-from-report` | Create a Reflex trigger from a Power BI report visual (no-code) |
| `/reflex-monitor` | Monitor trigger health, view execution history, diagnose issues |

## Agent

| Agent | Description |
|-------|-------------|
| **Activator Reviewer** | Reviews Reflex configurations for object model correctness, trigger condition validity, action setup, data source integration, and security |

## Trigger Keywords

The skill activates automatically when conversations mention: `data activator`, `reflex`, `fabric trigger`, `fabric alert`, `data alert`, `condition trigger`, `real time action`, `fabric notification`, `reflex item`, `activator`, `fabric automation`, `event driven fabric`.

## Author

Markus Ahling
