---
name: teams-workflow-bot
description: "Scaffold an enterprise workflow bot with multi-step approval chains, Adaptive Card state machines, and Service Bus integration"
argument-hint: "--name <BotName> --workflow <approval|onboarding|incident|custom> [--queue <servicebus|storage>] [--ai]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Workflow Bot

Create an enterprise-grade Teams bot that orchestrates multi-step workflows with approval chains, state machines, and external system integration.

## Instructions

### 1. Validate Inputs

- `--name` — Bot class name (e.g., `ApprovalBot`). Ask if not provided.
- `--workflow` — Workflow template:
  - `approval` — Multi-level approval chain with escalation and delegation
  - `onboarding` — Employee onboarding checklist with parallel tasks and owner assignments
  - `incident` — IT incident management with severity routing and SLA tracking
  - `custom` — Blank workflow skeleton for custom logic
- `--queue` — Message queue for async steps: `servicebus` (Azure Service Bus) or `storage` (Azure Queue Storage). Default: `servicebus`.
- `--ai` — Include AI-powered decision routing and natural language command parsing.

Ask the user for the workflow type if not provided.

### 2. Generate Project Structure

```
<bot-name>/
├── m365agents.yml
├── appPackage/
│   ├── manifest.json
│   ├── color.png
│   └── outline.png
├── src/
│   ├── index.ts                 # Express server + single-tenant adapter
│   ├── bot.ts                   # TeamsActivityHandler with workflow routing
│   ├── workflows/
│   │   ├── engine.ts            # Workflow state machine engine
│   │   ├── types.ts             # Workflow step, state, transition types
│   │   └── <workflow-type>.ts   # Specific workflow definition
│   ├── cards/
│   │   ├── approval-card.ts     # Adaptive Card builders for each workflow step
│   │   ├── status-card.ts       # Workflow status summary card
│   │   └── escalation-card.ts   # Escalation notification card
│   ├── queue/
│   │   ├── producer.ts          # Enqueue workflow events
│   │   └── consumer.ts          # Process async workflow steps
│   ├── storage/
│   │   └── workflow-store.ts    # Cosmos DB workflow state persistence
│   └── ai/                      # (when --ai)
│       ├── router.ts            # AI-powered intent classification
│       └── summarizer.ts        # AI workflow status summarization
├── infra/
│   ├── main.bicep               # Azure resources (Bot, Cosmos, Service Bus)
│   └── parameters.json
├── .env
├── package.json
└── tsconfig.json
```

### 3. Workflow Engine (`src/workflows/engine.ts`)

Generate a finite state machine engine:

```typescript
interface WorkflowStep {
  id: string;
  name: string;
  type: "approval" | "task" | "notification" | "condition" | "parallel";
  assignee?: string | ((context: WorkflowContext) => Promise<string>);
  timeoutMs?: number;
  escalateTo?: string;
  onApprove?: string;  // next step ID
  onReject?: string;   // next step ID
  onTimeout?: string;  // step ID on timeout
  condition?: (context: WorkflowContext) => Promise<boolean>;
  parallelSteps?: string[]; // for type: "parallel"
}

interface WorkflowInstance {
  id: string;
  workflowType: string;
  currentStepId: string;
  state: "active" | "completed" | "rejected" | "cancelled" | "escalated";
  data: Record<string, any>;
  history: WorkflowEvent[];
  createdAt: Date;
  updatedAt: Date;
  slaDeadline?: Date;
}
```

The engine must support:
- Step transitions with guard conditions
- Parallel step execution (fan-out/fan-in)
- Timeout-based escalation with configurable deadlines
- Delegation (reassign step to another user)
- Rollback to previous step
- Audit trail of all state transitions

### 4. Adaptive Card State Machine

Each workflow step renders a different Adaptive Card via `Action.Execute`:

**Approval step card**: Shows request details, approver info, approve/reject/delegate buttons with `verb` routing.
**Task step card**: Shows task description, checklist items, file upload, complete/block buttons.
**Status card**: Shows full workflow timeline, current step highlight, SLA countdown.
**Escalation card**: Shows escalation reason, original assignee, new assignee, override buttons.

All cards must use Universal Actions (`Action.Execute` with `verb`) so the card updates in-place when actioned.

### 5. Bot Handler (`src/bot.ts`)

```typescript
// Route Adaptive Card actions to workflow engine
protected async onAdaptiveCardInvoke(context: TurnContext, invokeValue: any) {
  const { verb, data } = invokeValue.action;
  const { workflowId, stepId } = data;

  switch (verb) {
    case "approve":
      return await this.engine.transition(workflowId, stepId, "approved", context);
    case "reject":
      return await this.engine.transition(workflowId, stepId, "rejected", context);
    case "delegate":
      return await this.engine.delegate(workflowId, stepId, data.delegateTo, context);
    case "escalate":
      return await this.engine.escalate(workflowId, stepId, context);
    case "complete-task":
      return await this.engine.completeTask(workflowId, stepId, data, context);
    case "view-status":
      return await this.engine.getStatusCard(workflowId);
  }
}
```

Natural language commands (always):
- "start approval for <request>" → Create new workflow instance
- "status of <workflow-id>" → Show workflow status card
- "my pending approvals" → List all workflows awaiting user action

When `--ai`: Use AI router to classify freeform messages into workflow intents.

### 6. Queue Integration

**Service Bus** (default): Workflow step transitions emit events to a topic. Consumers handle async operations (email notifications, external API calls, SLA monitoring).

**Storage Queue**: Simpler queue for lower-volume workflows with visibility timeout for retry.

Generate the producer/consumer pair with dead-letter handling and retry policies.

### 7. Workflow Templates

**approval** workflow steps:
1. `submit` → Requester submits request
2. `manager-review` → Direct manager approves/rejects (timeout: 24h, escalate to skip-level)
3. `finance-review` → Finance team approves if amount > threshold (condition gate)
4. `final-approval` → VP approval for amount > $50k (condition gate)
5. `provision` → Auto-provision approved resource (task)
6. `notify-complete` → Notify requester of outcome

**onboarding** workflow steps:
1. `initiate` → HR creates onboarding request
2. `parallel-setup` → Fan-out: IT setup, badge, workspace, accounts (parallel)
3. `manager-welcome` → Manager sends welcome package (task)
4. `day-one-checklist` → New hire completes orientation tasks (task)
5. `30-day-check` → Scheduled follow-up (timeout: 30 days)

**incident** workflow steps:
1. `report` → User reports incident with severity
2. `triage` → On-call engineer triages (timeout: 15min for P1)
3. `investigate` → Assigned engineer investigates (SLA-tracked)
4. `resolve` → Engineer marks resolved with root cause
5. `verify` → Reporter confirms resolution
6. `post-mortem` → Auto-create post-mortem doc for P1/P2

### 8. Infrastructure

Generate Bicep templates for:
- Azure Bot Service (single-tenant, F0 SKU)
- Azure Cosmos DB (serverless, workflow state)
- Azure Service Bus namespace (Standard tier)
- Azure App Service (B1 for bot hosting)

### 9. Display Summary

Show the user:
- Created files and project structure
- Workflow steps and transitions diagram (ASCII)
- Environment variables to configure
- How to test: `m365agents preview --local`
- How to trigger workflows: natural language or slash commands
- Queue monitoring setup
- SLA configuration guidance
