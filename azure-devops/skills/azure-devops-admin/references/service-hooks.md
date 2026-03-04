# Azure DevOps — Service Hooks Reference

## Overview

Azure DevOps Service Hooks enable event-driven integrations using a **publisher-consumer** model. When events occur (code pushed, build completed, work item updated), service hooks fire notifications to configured consumers (webhooks, Slack, Teams, Azure Service Bus, etc.). Subscriptions define which events trigger which consumers, with optional filters for project, repo, branch, or area path scope. This reference covers the complete REST API for subscription management, all publisher event types, consumer configurations, and security best practices.

---

## Service Hooks REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/hooks/subscriptions?api-version=7.1` | ServiceHooks (Read) | `publisherId`, `consumerId`, `eventType` | List subscriptions |
| POST | `/_apis/hooks/subscriptions?api-version=7.1` | ServiceHooks (Read & Write) | Body: full subscription object | Create subscription |
| GET | `/_apis/hooks/subscriptions/{subscriptionId}?api-version=7.1` | ServiceHooks (Read) | — | Get subscription details |
| PUT | `/_apis/hooks/subscriptions/{subscriptionId}?api-version=7.1` | ServiceHooks (Read & Write) | Body: full subscription object | Update subscription |
| DELETE | `/_apis/hooks/subscriptions/{subscriptionId}?api-version=7.1` | ServiceHooks (Read & Write) | — | Delete subscription |
| GET | `/_apis/hooks/publishers?api-version=7.1` | ServiceHooks (Read) | — | List available publishers |
| GET | `/_apis/hooks/publishers/{publisherId}/eventtypes?api-version=7.1` | ServiceHooks (Read) | — | List event types for a publisher |
| GET | `/_apis/hooks/consumers?api-version=7.1` | ServiceHooks (Read) | — | List available consumers |
| GET | `/_apis/hooks/consumers/{consumerId}/actions?api-version=7.1` | ServiceHooks (Read) | — | List actions for a consumer |
| POST | `/_apis/hooks/testnotifications/{subscriptionId}?api-version=7.1` | ServiceHooks (Read & Write) | — | Send a test notification |
| GET | `/_apis/hooks/subscriptions/{subscriptionId}/notifications?api-version=7.1` | ServiceHooks (Read) | `status`, `$top`, `$skip` | List notification history |

---

## Publisher Event Types

### Code (Git)

| Event Type | `eventType` Value | Description | Key Filter Fields |
|-----------|-------------------|-------------|-------------------|
| Code pushed | `git.push` | Commits pushed to a repo | `repository`, `branch` |
| PR created | `git.pullrequest.created` | New pull request opened | `repository`, `targetBranch`, `reviewers` |
| PR updated | `git.pullrequest.updated` | PR metadata or code updated | `repository`, `targetBranch`, `mergeStatus` |
| PR merged | `git.pullrequest.merged` | PR completed with merge | `repository`, `targetBranch` |
| PR commented | `git.pullrequest.comment` | Comment added to a PR | `repository` |

### Build

| Event Type | `eventType` Value | Description | Key Filter Fields |
|-----------|-------------------|-------------|-------------------|
| Build completed | `build.complete` | Build finished (any result) | `definitionName`, `buildStatus` |
| Build queued | `build.queued` | Build added to queue | `definitionName` |

### Work Items

| Event Type | `eventType` Value | Description | Key Filter Fields |
|-----------|-------------------|-------------|-------------------|
| Work item created | `workitem.created` | New work item created | `workItemType`, `areaPath` |
| Work item updated | `workitem.updated` | Work item fields changed | `workItemType`, `areaPath`, `changedFields` |
| Work item deleted | `workitem.deleted` | Work item moved to recycle bin | `workItemType`, `areaPath` |
| Work item restored | `workitem.restored` | Work item restored from recycle bin | `workItemType` |
| Work item commented | `workitem.commented` | Comment added to work item | `workItemType`, `areaPath` |

### Release

| Event Type | `eventType` Value | Description | Key Filter Fields |
|-----------|-------------------|-------------|-------------------|
| Release created | `ms.vss-release.release-created-event` | New release created | `releaseDefinitionId` |
| Release abandoned | `ms.vss-release.release-abandoned-event` | Release abandoned | `releaseDefinitionId` |
| Deployment started | `ms.vss-release.deployment-started-event` | Deployment to a stage started | `releaseDefinitionId`, `releaseEnvironmentId` |
| Deployment completed | `ms.vss-release.deployment-completed-event` | Deployment to a stage finished | `releaseDefinitionId`, `releaseEnvironmentId`, `releaseEnvironmentStatus` |
| Approval pending | `ms.vss-release.deployment-approval-pending-event` | Approval required for deployment | `releaseDefinitionId` |
| Approval completed | `ms.vss-release.deployment-approval-completed-event` | Approval decision made | `releaseDefinitionId` |

### Pipelines (YAML)

| Event Type | `eventType` Value | Description | Key Filter Fields |
|-----------|-------------------|-------------|-------------------|
| Run state changed | `ms.vss-pipelines.run-state-changed-event` | Pipeline run state transition | `pipelineId`, `runStateId` |
| Stage state changed | `ms.vss-pipelines.stage-state-changed-event` | Stage state transition | `pipelineId`, `stageNameId`, `stageStateId` |
| Stage approval completed | `ms.vss-pipelines.stage-approval-completed-event` | Stage approval resolved | `pipelineId` |

---

## Consumer Types

### Web Hooks

The most flexible consumer — sends HTTP POST to any URL:

```json
{
  "consumerId": "webHooks",
  "consumerActionId": "httpRequest",
  "consumerInputs": {
    "url": "https://myapp.example.com/webhooks/ado",
    "httpHeaders": "X-Custom-Header:myvalue",
    "basicAuthUsername": "",
    "basicAuthPassword": "",
    "resourceDetailsToSend": "all",
    "messagesToSend": "all"
  }
}
```

### Slack

```json
{
  "consumerId": "slack",
  "consumerActionId": "postMessageToChannel",
  "consumerInputs": {
    "url": "https://hooks.slack.com/services/T00/B00/xxxx"
  }
}
```

### Microsoft Teams

```json
{
  "consumerId": "microsoftTeams",
  "consumerActionId": "postMessageToChannel",
  "consumerInputs": {
    "url": "https://myorg.webhook.office.com/webhookb2/..."
  }
}
```

### Azure Service Bus

```json
{
  "consumerId": "azureServiceBus",
  "consumerActionId": "serviceBusQueueMessage",
  "consumerInputs": {
    "connectionString": "Endpoint=sb://mybus.servicebus.windows.net/;SharedAccessKeyName=send;SharedAccessKey=...",
    "queueName": "ado-events",
    "resourceDetailsToSend": "all"
  }
}
```

### Azure Storage Queue

```json
{
  "consumerId": "azureStorageQueue",
  "consumerActionId": "enqueue",
  "consumerInputs": {
    "accountName": "mystorageaccount",
    "accountKey": "...",
    "queueName": "ado-events"
  }
}
```

---

## Creating a Subscription

### Webhook on PR Created

```json
POST https://dev.azure.com/myorg/_apis/hooks/subscriptions?api-version=7.1
Content-Type: application/json

{
  "publisherId": "tfs",
  "eventType": "git.pullrequest.created",
  "scope": {
    "project": "<project-guid>"
  },
  "publisherInputs": {
    "projectId": "<project-guid>",
    "repository": "<repo-guid>",
    "branch": "main"
  },
  "consumerId": "webHooks",
  "consumerActionId": "httpRequest",
  "consumerInputs": {
    "url": "https://myapp.example.com/webhooks/pr-created",
    "httpHeaders": "X-API-Key:my-secret-key",
    "resourceDetailsToSend": "all",
    "messagesToSend": "all"
  }
}
```

### Build Complete to Slack

```json
{
  "publisherId": "tfs",
  "eventType": "build.complete",
  "scope": {
    "project": "<project-guid>"
  },
  "publisherInputs": {
    "projectId": "<project-guid>",
    "definitionName": "CI-Build",
    "buildStatus": "failed"
  },
  "consumerId": "slack",
  "consumerActionId": "postMessageToChannel",
  "consumerInputs": {
    "url": "https://hooks.slack.com/services/T00/B00/xxxx"
  }
}
```

### Work Item Updated to Service Bus

```json
{
  "publisherId": "tfs",
  "eventType": "workitem.updated",
  "scope": {
    "project": "<project-guid>"
  },
  "publisherInputs": {
    "projectId": "<project-guid>",
    "areaPath": "MyProject\\Backend",
    "workItemType": "Bug"
  },
  "consumerId": "azureServiceBus",
  "consumerActionId": "serviceBusQueueMessage",
  "consumerInputs": {
    "connectionString": "Endpoint=sb://mybus.servicebus.windows.net/;SharedAccessKeyName=send;SharedAccessKey=...",
    "queueName": "bug-updates",
    "resourceDetailsToSend": "all"
  }
}
```

---

## Event Filters

Filters narrow which events trigger a subscription. They are set in `publisherInputs`:

| Filter Field | Applies To | Description |
|-------------|-----------|-------------|
| `projectId` | All events | Scope to a specific project |
| `repository` | Git events | Specific repo GUID |
| `branch` | `git.push`, PR events | Branch name (e.g., `main`) |
| `targetBranch` | PR events | PR target branch |
| `definitionName` | Build events | Build definition name |
| `buildStatus` | `build.complete` | Filter by result: `succeeded`, `partiallySucceeded`, `failed` |
| `workItemType` | Work item events | `Bug`, `Task`, `User Story`, etc. |
| `areaPath` | Work item events | Area path prefix |
| `changedFields` | `workitem.updated` | Comma-separated field ref names (e.g., `System.State,System.AssignedTo`) |
| `releaseDefinitionId` | Release events | Specific release definition |
| `releaseEnvironmentId` | Deployment events | Specific stage/environment |
| `pipelineId` | Pipeline events | YAML pipeline ID |

---

## Testing a Subscription

Send a test notification to verify the consumer endpoint is reachable:

```bash
POST https://dev.azure.com/myorg/_apis/hooks/testnotifications/{subscriptionId}?api-version=7.1
```

This sends a synthetic event payload to the configured consumer. The response includes the delivery status.

### Checking Notification History

```bash
GET https://dev.azure.com/myorg/_apis/hooks/subscriptions/{subscriptionId}/notifications?api-version=7.1&$top=10
```

Response includes delivery status, response code, and response body for each notification:

```json
{
  "count": 2,
  "value": [
    {
      "id": 1,
      "status": "completed",
      "result": "succeeded",
      "details": {
        "responseCode": 200,
        "responseBody": "OK"
      },
      "createdDate": "2026-03-04T10:15:00Z"
    },
    {
      "id": 2,
      "status": "completed",
      "result": "failed",
      "details": {
        "responseCode": 500,
        "responseBody": "Internal Server Error",
        "errorMessage": "Consumer endpoint returned 500"
      },
      "createdDate": "2026-03-04T10:30:00Z"
    }
  ]
}
```

---

## Error Handling and Retry Policies

Azure DevOps retries failed webhook deliveries with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 minute |
| 2nd retry | 2 minutes |
| 3rd retry | 5 minutes |
| 4th retry | 30 minutes |

After 4 failed retries, the notification is marked as `failed` and no further attempts are made. The subscription remains active and will fire on the next matching event.

### Auto-Disable

If a subscription has **20 consecutive delivery failures**, Azure DevOps automatically disables it. The subscription's `status` changes to `disabledBySystem`. Re-enable by updating the subscription:

```json
PUT https://dev.azure.com/myorg/_apis/hooks/subscriptions/{subscriptionId}?api-version=7.1
Content-Type: application/json

{
  "status": "enabled",
  ... (full subscription object)
}
```

---

## Security Considerations

### HMAC Validation

Azure DevOps does not natively sign webhook payloads with HMAC. To verify authenticity:

1. **Use a secret header**: include a shared secret in `httpHeaders` (e.g., `X-Webhook-Secret:my-secret-token`)
2. **Validate on your server**: check the header value before processing the payload
3. **Use HTTPS**: always use `https://` URLs to prevent payload interception

### Basic Authentication

For endpoints requiring authentication:

```json
"consumerInputs": {
  "url": "https://myapp.example.com/webhooks/ado",
  "basicAuthUsername": "webhook-user",
  "basicAuthPassword": "secret-password"
}
```

### IP Allowlisting

Azure DevOps webhook requests originate from Microsoft-owned IP ranges. Consult the Azure IP Ranges JSON (published weekly) for the `AzureDevOps` service tag to configure firewall rules.

### Secret Rotation

Webhook secrets stored in `consumerInputs` (connection strings, API keys, passwords) are stored encrypted but are returned in plaintext via the GET API. Restrict `ServiceHooks (Read)` permissions to trusted administrators.

---

## Limits and Gotchas

- **Max subscriptions per project**: 500.
- **Webhook timeout**: consumers must respond within 10 seconds. Longer-running processing should accept the webhook, return 200, and process asynchronously.
- **Payload size**: webhook payloads can be up to 2 MB. Events with large resource details may be truncated.
- **`resourceDetailsToSend`**: set to `all` to include the full resource (work item, build, PR) in the payload. Set to `minimal` for just IDs and URLs.
- **Duplicate events**: in rare cases, the same event may fire twice. Design consumers to be idempotent.
- **Classic vs YAML pipeline events**: `build.complete` covers both classic builds and YAML pipelines. The `ms.vss-pipelines.*` events are YAML-specific and provide stage-level granularity.
- **Scope inheritance**: subscriptions scoped to a project do not fire for events in other projects. Use organization-level subscriptions for cross-project events (requires Collection Admin).
- **Service Bus consumer**: the connection string must include `Send` permission. `Listen` is not sufficient.
- **Consumer availability**: not all consumers are available in every Azure DevOps region. Use the `GET /consumers` endpoint to verify availability.
