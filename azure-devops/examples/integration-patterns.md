# Integration Patterns

Patterns for integrating Azure DevOps with external services using service hooks, webhooks, and APIs.

---

## Pattern 1: Service Hook to Teams Channel

Send build completion notifications to a Microsoft Teams channel via Incoming Webhook.

### Architecture

```
┌──────────────┐     Service Hook      ┌─────────────────┐
│ Azure DevOps │ ──────────────────────>│ Teams Incoming   │
│ Build        │   POST (JSON payload) │ Webhook Connector│
│ Complete     │                        │                  │
└──────────────┘                        └────────┬─────────┘
                                                 │
                                                 v
                                        ┌─────────────────┐
                                        │ Teams Channel    │
                                        │ (Adaptive Card)  │
                                        └─────────────────┘
```

### Setup

1. **Create Incoming Webhook in Teams**: Channel > Connectors > Incoming Webhook > Configure > Copy URL.

2. **Create Service Hook in Azure DevOps**:

```bash
# Create a service hook subscription for build.complete
az devops invoke \
  --area hooks --resource subscriptions \
  --http-method POST \
  --in-file - <<'EOF'
{
  "publisherId": "tfs",
  "eventType": "build.complete",
  "consumerId": "webHooks",
  "consumerActionId": "httpRequest",
  "publisherInputs": {
    "projectId": "<project-id>",
    "buildStatus": "failed"
  },
  "consumerInputs": {
    "url": "https://your-org.webhook.office.com/webhookb2/...",
    "httpHeaders": "Content-Type: application/json",
    "resourceDetailsToSend": "all"
  }
}
EOF
```

3. **Custom Adaptive Card** (use an Azure Function as middleware for rich formatting):

```typescript
// teams-webhook-formatter/index.ts
// Azure Function that receives DevOps webhook and posts Adaptive Card to Teams.

interface DevOpsPayload {
  resource: {
    buildNumber: string;
    result: string;
    definition: { name: string };
    requestedFor: { displayName: string };
    _links: { web: { href: string } };
  };
}

export async function handler(request: Request): Promise<Response> {
  const payload: DevOpsPayload = await request.json();
  const build = payload.resource;
  const statusColor = build.result === "succeeded" ? "good" : "attention";

  const card = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            {
              type: "TextBlock",
              text: `Build ${build.result.toUpperCase()}: ${build.definition.name}`,
              weight: "bolder",
              size: "medium",
              color: statusColor,
            },
            {
              type: "FactSet",
              facts: [
                { title: "Build", value: build.buildNumber },
                { title: "Triggered by", value: build.requestedFor.displayName },
                { title: "Result", value: build.result },
              ],
            },
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "View Build",
              url: build._links.web.href,
            },
          ],
        },
      },
    ],
  };

  const teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL!;
  await fetch(teamsWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });

  return new Response("OK", { status: 200 });
}
```

---

## Pattern 2: Service Hook to Slack

Send pull request notifications to a Slack channel.

### Architecture

```
┌──────────────┐     Service Hook      ┌─────────────────┐
│ Azure DevOps │ ──────────────────────>│ Slack Incoming   │
│ PR Created / │   POST (JSON payload) │ Webhook          │
│ PR Updated   │                        │                  │
└──────────────┘                        └────────┬─────────┘
                                                 │
                                                 v
                                        ┌─────────────────┐
                                        │ Slack Channel    │
                                        │ (#dev-reviews)   │
                                        └─────────────────┘
```

### Setup

1. **Create Slack App**: api.slack.com > Create App > Incoming Webhooks > Add to channel > Copy webhook URL.

2. **Azure Function middleware** for Slack Block Kit formatting:

```typescript
// slack-pr-notifier/index.ts

interface PrPayload {
  eventType: string;
  resource: {
    pullRequestId: number;
    title: string;
    description: string;
    status: string;
    createdBy: { displayName: string };
    reviewers: Array<{ displayName: string; vote: number }>;
    repository: { name: string };
    _links: { web: { href: string } };
  };
}

const VOTE_LABELS: Record<number, string> = {
  10: "Approved",
  5: "Approved with suggestions",
  0: "No vote",
  [-5]: "Waiting for author",
  [-10]: "Rejected",
};

export async function handler(request: Request): Promise<Response> {
  const payload: PrPayload = await request.json();
  const pr = payload.resource;

  const reviewerList = pr.reviewers
    .map((r) => `${r.displayName}: ${VOTE_LABELS[r.vote] ?? "Pending"}`)
    .join("\n");

  const slackMessage = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `PR #${pr.pullRequestId}: ${pr.title}`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Repo:*\n${pr.repository.name}` },
          { type: "mrkdwn", text: `*Author:*\n${pr.createdBy.displayName}` },
          { type: "mrkdwn", text: `*Status:*\n${pr.status}` },
          {
            type: "mrkdwn",
            text: `*Reviewers:*\n${reviewerList || "None assigned"}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View PR" },
            url: pr._links.web.href,
            style: "primary",
          },
        ],
      },
    ],
  };

  const slackUrl = process.env.SLACK_WEBHOOK_URL!;
  await fetch(slackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackMessage),
  });

  return new Response("OK", { status: 200 });
}
```

3. **Create Service Hook**:

```bash
az devops invoke \
  --area hooks --resource subscriptions \
  --http-method POST \
  --in-file - <<'EOF'
{
  "publisherId": "tfs",
  "eventType": "git.pullrequest.created",
  "consumerId": "webHooks",
  "consumerActionId": "httpRequest",
  "publisherInputs": {
    "projectId": "<project-id>",
    "repository": "<repo-id>"
  },
  "consumerInputs": {
    "url": "https://my-function.azurewebsites.net/api/slack-pr-notifier",
    "resourceDetailsToSend": "all"
  }
}
EOF
```

---

## Pattern 3: Webhook to Azure Function

Build completion webhook triggering custom processing (e.g., deployment tracking, metrics collection).

### Architecture

```
┌──────────────┐     Service Hook      ┌─────────────────┐     ┌──────────────┐
│ Azure DevOps │ ──────────────────────>│ Azure Function   │────>│ Cosmos DB /  │
│ Build        │   POST (JSON payload) │ (HTTP Trigger)   │    │ App Insights │
│ Complete     │                        └─────────┬────────┘    └──────────────┘
└──────────────┘                                  │
                                                  v
                                         ┌─────────────────┐
                                         │ Custom logic:    │
                                         │ - Track metrics  │
                                         │ - Notify teams   │
                                         │ - Trigger deploy │
                                         └─────────────────┘
```

### Azure Function Implementation

```typescript
// deployment-tracker/index.ts
// Tracks build completions in Cosmos DB and reports metrics to App Insights.

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { TelemetryClient } from "applicationinsights";

const cosmos = new CosmosClient(process.env.COSMOS_CONNECTION!);
const container = cosmos.database("devops").container("deployments");
const telemetry = new TelemetryClient(process.env.APPINSIGHTS_INSTRUMENTATIONKEY);

interface BuildPayload {
  id: string;
  eventType: string;
  resource: {
    id: number;
    buildNumber: string;
    result: string;
    startTime: string;
    finishTime: string;
    definition: { name: string; id: number };
    project: { name: string };
    sourceBranch: string;
    sourceVersion: string;
    requestedFor: { displayName: string; uniqueName: string };
  };
}

app.http("deployment-tracker", {
  methods: ["POST"],
  authLevel: "function",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const payload: BuildPayload = (await request.json()) as BuildPayload;
    const build = payload.resource;

    // Calculate duration
    const start = new Date(build.startTime).getTime();
    const finish = new Date(build.finishTime).getTime();
    const durationMinutes = (finish - start) / 60000;

    // Store in Cosmos DB
    const record = {
      id: `${build.id}-${build.buildNumber}`,
      buildNumber: build.buildNumber,
      pipeline: build.definition.name,
      pipelineId: build.definition.id,
      project: build.project.name,
      result: build.result,
      branch: build.sourceBranch,
      commit: build.sourceVersion,
      triggeredBy: build.requestedFor.displayName,
      durationMinutes: Math.round(durationMinutes * 100) / 100,
      timestamp: build.finishTime,
    };

    await container.items.create(record);

    // Track metrics in Application Insights
    telemetry.trackMetric({
      name: "BuildDuration",
      value: durationMinutes,
      properties: {
        pipeline: build.definition.name,
        result: build.result,
      },
    });

    telemetry.trackEvent({
      name: "BuildCompleted",
      properties: {
        pipeline: build.definition.name,
        result: build.result,
        branch: build.sourceBranch,
      },
    });

    context.log(`Tracked build ${build.buildNumber}: ${build.result}`);
    return { status: 200, body: "OK" };
  },
});
```

### Testing

```bash
# Send a test payload to the Azure Function
curl -X POST "https://my-function.azurewebsites.net/api/deployment-tracker?code=<function-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "eventType": "build.complete",
    "resource": {
      "id": 1234,
      "buildNumber": "20240101.1",
      "result": "succeeded",
      "startTime": "2024-01-01T10:00:00Z",
      "finishTime": "2024-01-01T10:05:30Z",
      "definition": { "name": "CI Build", "id": 42 },
      "project": { "name": "MyProject" },
      "sourceBranch": "refs/heads/main",
      "sourceVersion": "abc123",
      "requestedFor": { "displayName": "Test User", "uniqueName": "user@example.com" }
    }
  }'
```

---

## Pattern 4: OData Feed to Power BI

Connect the Azure DevOps Analytics OData feed to Power BI for custom dashboards.

### Architecture

```
┌──────────────────┐     OData v4      ┌─────────────────┐
│ Azure DevOps     │ ◄────────────────  │ Power BI         │
│ Analytics Service│   GET (filtered)   │ Desktop / Service│
│ (OData endpoint) │                    │                  │
└──────────────────┘                    └────────┬─────────┘
                                                 │
                                                 v
                                        ┌─────────────────┐
                                        │ Dashboard:       │
                                        │ - Velocity       │
                                        │ - Cycle time     │
                                        │ - Build health   │
                                        └─────────────────┘
```

### OData Feed URL

```
https://analytics.dev.azure.com/{org}/{project}/_odata/v4.0-preview/
```

### Power Query M — Work Item Velocity

```powerquery
let
    Org = "myorg",
    Project = "myproject",
    BaseUrl = "https://analytics.dev.azure.com/" & Org & "/" & Project & "/_odata/v4.0-preview/",
    Source = OData.Feed(
        BaseUrl & "WorkItems?"
        & "$filter=WorkItemType eq 'User Story' "
        & "and StateCategory eq 'Completed' "
        & "and CompletedDate ge 2024-01-01Z"
        & "&$select=WorkItemId,Title,StoryPoints,CompletedDate,IterationPath"
        & "&$orderby=CompletedDate desc",
        null,
        [Implementation = "2.0", ODataVersion = 4]
    )
in
    Source
```

### Power Query M — Pipeline Pass Rate

```powerquery
let
    Org = "myorg",
    Project = "myproject",
    BaseUrl = "https://analytics.dev.azure.com/" & Org & "/" & Project & "/_odata/v4.0-preview/",
    Source = OData.Feed(
        BaseUrl & "PipelineRuns?"
        & "$filter=CompletedDate ge 2024-01-01Z"
        & "&$apply=groupby("
        & "(PipelineName,RunOutcome),"
        & "aggregate($count as RunCount))"
        & "&$orderby=PipelineName",
        null,
        [Implementation = "2.0", ODataVersion = 4]
    )
in
    Source
```

### Authentication in Power BI

1. Open Power BI Desktop > Get Data > OData Feed.
2. Enter the OData URL.
3. Select **Organizational account** and sign in with Entra credentials.
4. The account must have **Analytics views** permission in the Azure DevOps project.

---

## Pattern 5: CLI with Scheduled Automation

Azure Function Timer trigger running `az devops` CLI commands on a schedule.

### Architecture

```
┌──────────────────┐    Timer Trigger    ┌─────────────────┐
│ Azure Functions  │ ◄───── (cron) ────  │ Azure Scheduler  │
│ (Python/Bash)    │                     │ (built-in)       │
│                  │                     └─────────────────┘
│  az devops CLI   │──── REST API ─────> Azure DevOps
│                  │
└──────────────────┘
```

### Implementation (Python Azure Function)

```python
# function_app.py
import azure.functions as func
import subprocess
import json
import os

app = func.FunctionApp()

@app.schedule(
    schedule="0 0 8 * * 1-5",  # 8 AM UTC, weekdays
    arg_name="timer",
    run_on_startup=False
)
def daily_stale_pr_check(timer: func.TimerRequest) -> None:
    """Check for stale PRs (open > 7 days) and post summary."""
    org = os.environ["AZDO_ORG"]
    project = os.environ["AZDO_PROJECT"]
    pat = os.environ["AZDO_PAT"]

    # Configure CLI
    os.environ["AZURE_DEVOPS_EXT_PAT"] = pat

    # List open PRs
    result = subprocess.run(
        [
            "az", "repos", "pr", "list",
            "--org", f"https://dev.azure.com/{org}",
            "--project", project,
            "--status", "active",
            "--query",
            "[?creationDate < '{}'].{{id:pullRequestId, title:title, author:createdBy.displayName, created:creationDate}}".format(
                _days_ago(7)
            ),
            "--output", "json",
        ],
        capture_output=True,
        text=True,
    )

    stale_prs = json.loads(result.stdout) if result.returncode == 0 else []

    if stale_prs:
        summary = "Stale PRs (open > 7 days):\n"
        for pr in stale_prs:
            summary += f"  - PR #{pr['id']}: {pr['title']} (by {pr['author']}, created {pr['created']})\n"
        # Post to Teams webhook or send email
        _notify(summary)

def _days_ago(n: int) -> str:
    from datetime import datetime, timedelta, timezone
    return (datetime.now(timezone.utc) - timedelta(days=n)).strftime("%Y-%m-%dT%H:%M:%SZ")

def _notify(message: str) -> None:
    import urllib.request
    webhook_url = os.environ.get("TEAMS_WEBHOOK_URL")
    if webhook_url:
        data = json.dumps({"text": message}).encode()
        req = urllib.request.Request(
            webhook_url,
            data=data,
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req)
```

---

## Pattern 6: Event Grid to Logic App

Azure DevOps events routed through Event Grid to a Logic App for approval workflows.

### Architecture

```
┌──────────────┐    Service Hook    ┌──────────────┐    Subscription    ┌──────────────┐
│ Azure DevOps │ ──────────────────>│ Event Grid   │ ──────────────────>│ Logic App    │
│ (PR Created) │  Custom Topic     │ Custom Topic │  Event trigger     │              │
└──────────────┘                    └──────────────┘                    │ - Parse event│
                                                                       │ - Send email │
                                                                       │ - Wait reply │
                                                                       │ - Approve PR │
                                                                       └──────────────┘
```

### Setup

1. **Create Event Grid Custom Topic**:

```bash
# Create the Event Grid topic
az eventgrid topic create \
  --name devops-events \
  --resource-group rg-integrations \
  --location eastus

# Get the topic endpoint and key
TOPIC_ENDPOINT=$(az eventgrid topic show \
  --name devops-events \
  --resource-group rg-integrations \
  --query "endpoint" -o tsv)

TOPIC_KEY=$(az eventgrid topic key list \
  --name devops-events \
  --resource-group rg-integrations \
  --query "key1" -o tsv)
```

2. **Create Azure Function as webhook relay** (DevOps Service Hook to Event Grid):

```typescript
// devops-to-eventgrid/index.ts
import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { EventGridPublisherClient, AzureKeyCredential } from "@azure/eventgrid";

const client = new EventGridPublisherClient(
  process.env.EVENTGRID_ENDPOINT!,
  "EventGrid",
  new AzureKeyCredential(process.env.EVENTGRID_KEY!)
);

app.http("devops-relay", {
  methods: ["POST"],
  authLevel: "function",
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const payload = await request.json();

    await client.send([
      {
        eventType: `AzureDevOps.${(payload as Record<string, string>).eventType}`,
        subject: `/devops/pr/${(payload as Record<string, Record<string, number>>).resource?.pullRequestId ?? "unknown"}`,
        dataVersion: "1.0",
        data: payload,
      },
    ]);

    return { status: 200, body: "Event published" };
  },
});
```

3. **Create Logic App** with Event Grid trigger:

```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "triggers": {
      "When_a_resource_event_occurs": {
        "type": "ApiConnectionWebhook",
        "inputs": {
          "host": {
            "connection": { "name": "@parameters('$connections')['azureeventgrid']['connectionId']" }
          },
          "body": {
            "properties": {
              "topic": "/subscriptions/<sub-id>/resourceGroups/rg-integrations/providers/Microsoft.EventGrid/topics/devops-events",
              "destination": {
                "endpointType": "WebHook"
              },
              "filter": {
                "includedEventTypes": ["AzureDevOps.git.pullrequest.created"]
              }
            }
          }
        }
      }
    },
    "actions": {
      "Send_approval_email": {
        "type": "ApiConnectionWebhook",
        "inputs": {
          "host": {
            "connection": { "name": "@parameters('$connections')['office365']['connectionId']" }
          },
          "body": {
            "NotificationUrl": "@{listCallbackUrl()}",
            "Message": {
              "To": "approvers@example.com",
              "Subject": "PR Review Required: @{triggerBody()?['data']?['resource']?['title']}",
              "Options": "Approve, Reject",
              "Body": "PR #@{triggerBody()?['data']?['resource']?['pullRequestId']} needs review."
            }
          }
        }
      }
    }
  }
}
```

### Testing

```bash
# Publish a test event to the Event Grid topic
az eventgrid topic event publish \
  --name devops-events \
  --resource-group rg-integrations \
  --events '[{
    "id": "test-1",
    "eventType": "AzureDevOps.git.pullrequest.created",
    "subject": "/devops/pr/123",
    "dataVersion": "1.0",
    "data": {
      "resource": {
        "pullRequestId": 123,
        "title": "Test PR",
        "createdBy": { "displayName": "Test User" }
      }
    }
  }]'
```
