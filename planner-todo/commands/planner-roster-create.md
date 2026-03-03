---
name: planner-roster-create
description: Create a roster-based Planner plan that does not require a Microsoft 365 Group
argument-hint: "<plan-title> [--members <user-id,...>] [--buckets 'Backlog,In Progress,Done']"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Roster-Based Planner Plan

Create a Microsoft Planner plan using a **roster container** — a lightweight membership
container that does not require a Microsoft 365 Group. Roster plans are ideal for:
- Personal projects with ad-hoc collaborators
- Cross-department collaboration without creating a Group
- Temporary projects that don't need full Group infrastructure

**Container type**: `roster` — manages its own membership independently of M365 Groups.

> **Note**: Roster plans use the beta Graph API endpoint. The v1.0 API does not support
> roster container creation.

## Authentication

Requires a **delegated** token.

Required OAuth scopes:
- `Tasks.ReadWrite`

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<plan-title>` | Yes | Display name of the plan |
| `--members <user-ids>` | No | Comma-separated user object IDs to add to the roster |
| `--buckets <list>` | No | Comma-separated bucket names (default: `Backlog,In Progress,Done`) |

## Step 1: Create the Roster

```
POST https://graph.microsoft.com/beta/planner/rosters
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{}
```

The request body is empty — the roster is created with no members initially.
The signed-in user is automatically added as owner.

Expected response: `HTTP 201 Created`
```json
{
  "id": "roster-id",
  "assignedSensitivityLabel": null
}
```

Save the returned `id` as `rosterId`.

## Step 2: Add Members (if --members provided)

For each user ID in `--members`:

```
POST https://graph.microsoft.com/beta/planner/rosters/{rosterId}/members
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "@odata.type": "#microsoft.graph.plannerRosterMember",
  "userId": "<user-id>"
}
```

Collect results. Continue even if individual member additions fail (report failures at end).

## Step 3: Create the Plan with Roster Container

```
POST https://graph.microsoft.com/beta/planner/plans
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "container": {
    "@odata.type": "#microsoft.graph.plannerPlanContainer",
    "type": "roster",
    "id": "<rosterId>"
  },
  "title": "<plan-title>"
}
```

Expected response: `HTTP 201 Created`

Save the returned plan `id` as `planId`.

## Step 4: Create Buckets

Same as standard plan creation — POST each bucket using the new `planId`.

## Step 5: Retrieve Roster Member List

```
GET https://graph.microsoft.com/beta/planner/rosters/{rosterId}/members
```

Display member names in the success output.

## Error Handling

| HTTP Status | Cause | Resolution |
|---|---|---|
| 400 | Roster quota exceeded (max 2 roster plans per user in some tenants) | Use group-owned plan instead |
| 403 | Tenant policy blocks roster plan creation | Contact tenant admin to enable roster plans |
| 404 | User ID not found when adding member | Verify each user ID via `/users/{id}` |

## Success Output

```
Roster plan created
─────────────────────────────────────────────────
Plan ID:    <planId>
Title:      <plan-title>
Roster ID:  <rosterId>
Container:  roster (no M365 Group required)

Members (<n>):
  ✓ <displayName1> (<userId1>)
  ✓ <displayName2> (<userId2>)
  ✗ <userId3> — user not found

Buckets created:
  1. Backlog       → <bucketId1>
  2. In Progress   → <bucketId2>
  3. Done          → <bucketId3>
─────────────────────────────────────────────────
Note: Use Graph beta endpoint for all operations on this plan.
```
