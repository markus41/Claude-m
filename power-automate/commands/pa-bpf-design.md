---
name: pa-bpf-design
description: Design a Business Process Flow (BPF) for a Dataverse entity — stages, steps, branching logic, required fields, cloud flow triggers at stage transitions, and solution packaging.
argument-hint: "<process-name> [--entity <lead|opportunity|case|custom-table>] [--stages <count>] [--branching] [--trigger-flows]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Business Process Flow Design

## Purpose
Design a complete Business Process Flow: stages with required/recommended steps, branching
logic, cloud flow automation at stage transitions, and solution-aware deployment.
Uses `references/business-process-flows.md`.

## Required Inputs
- Process name and Dataverse entity it runs on (lead, opportunity, case, or custom table)
- Number of stages and stage names
- Required fields per stage (data quality gates)
- Whether branching is needed (different paths based on data)
- Whether cloud flows should trigger on stage transitions
- Whether this is part of an existing solution

## Steps

### 1. Map Business Process to Stages
For each stage:
- Stage name (max 50 chars, user-visible)
- Stage category (from: Qualify, Develop, Propose, Close, Identify, Research, Resolve, Approve)
- Purpose: what must be accomplished in this stage
- Exit criteria: what data must be captured to advance

Example for Lead-to-Opportunity:
```
Stage 1: Qualify       → Budget confirmed, decision maker identified
Stage 2: Develop       → Requirements gathered, stakeholders mapped
Stage 3: Propose       → Proposal sent, pricing agreed
Stage 4: Close         → Contract signed or lost reason documented
```

### 2. Define Steps per Stage
For each stage, classify steps as Required / Recommended / Optional:
- **Required**: Block stage advance if empty (e.g., "Estimated revenue")
- **Recommended**: Show warning but allow advance (e.g., "Next follow-up date")
- **Optional**: Informational only

Produce step table:
```
Stage | Field Name | Table Field | Requirement | Notes
Qualify | Budget Confirmed | budgetamount | Required | Must be > 0
Qualify | Decision Maker | contactid | Recommended | Primary contact
Develop | Requirements Doc | description | Required | Min 50 chars
```

### 3. Design Branching Logic (If Applicable)
For conditional routing:
- Identify branching condition (field value, amount threshold, record type)
- Map condition to diverging stage paths
- Ensure all branches converge back or have valid end states

Example:
```
Stage 1: Qualify
  → if dealType = "Enterprise" (budget > $100K): → Stage 2a: Enterprise Develop
  → if dealType = "SMB": → Stage 2b: SMB Fast Track
Stage 2a / 2b both → Stage 3: Propose
```

### 4. Cloud Flow Automation at Stage Transitions
For each stage where automation is needed:
- Trigger: Dataverse "When row is added/modified" on `processsession` table, filtered on `activestageid`
- Actions per stage entry event:
  - Stage 1 → Qualify: Assign to inside sales queue (Teams notification)
  - Stage 3 → Propose: Generate proposal document from template
  - Stage 4 → Close (Won): Create customer onboarding case, update revenue forecast
  - Stage 4 → Close (Lost): Log lost reason, trigger win/loss survey

Produce flow trigger configuration:
```json
{
  "trigger": {
    "type": "OpenApiConnection",
    "inputs": {
      "parameters": {
        "entityName": "processsessions",
        "subscriptionRequest": {
          "message": 2,
          "entityname": "processsession",
          "filteringattributes": "activestageid,statecode"
        }
      }
    }
  }
}
```

### 5. Permissions and RBAC
- Identify roles that need `prvReadProcessSession` + `prvWriteProcessSession`
- For service accounts running cloud flows: list required privileges
- Security roles to assign (system-generated roles vs custom)

### 6. Solution Packaging
```bash
# Add BPF to solution (after creating in make.powerapps.com)
pac solution add-reference \
  --solution-unique-name YourSolution \
  --component-id bpf-workflow-id \
  --component-type workflow

# Verify BPF is in solution
pac solution component list --solution-unique-name YourSolution | grep "workflow"
```

**Important:** Export the BPF in the same solution as the entity it runs on, or deployment fails with dependency errors.

### 7. Output
Deliver:
- Stage/step table with requirement levels
- Branching logic diagram (text-based)
- Cloud flow trigger specifications per stage transition
- RBAC requirements table
- Solution packaging commands
- Testing checklist:
  - [ ] All required steps block stage advance
  - [ ] Branching routes to correct stage based on data
  - [ ] Cloud flows fire within 60 seconds of stage change
  - [ ] Service account can read/write processsession
  - [ ] BPF exports and imports without dependency errors

## Quality Checks
- Fewer than 10 required steps per stage (cognitive overload risk if more)
- All branching paths have a defined end state
- Cloud flow triggers are idempotent (safe to replay)
- No hardcoded stage IDs in flows (use environment variables)
- BPF tested in dev before exporting to test/production
