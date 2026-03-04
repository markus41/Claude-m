---
name: ado-service-hook
description: Create webhook subscriptions and service hook notifications
argument-hint: "--event <event-type> --target <webhook|slack|teams|servicebus> --url <url> [--action create|list|test|delete]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Service Hooks

Create webhook subscriptions for Azure DevOps events. Route notifications to webhook URLs, Slack, Teams, Service Bus, and other consumers.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Edit subscriptions` permission

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--event` | Yes | Event type (see list below) |
| `--target` | Yes | Consumer: `webhook`, `slack`, `teams`, `servicebus`, `azurefunction` |
| `--url` | No | Target URL (for webhook, Slack incoming webhook, etc.) |
| `--action` | No | `create` (default), `list`, `test`, `delete` |
| `--subscription-id` | No | Subscription ID (for test/delete) |
| `--filters` | No | Event filters as JSON (e.g., `{"repository":"my-repo"}`) |

### Event Types

| Event | Publisher | Description |
|-------|-----------|-------------|
| `build.complete` | `tfs` | Build completed |
| `git.push` | `tfs` | Code pushed |
| `git.pullrequest.created` | `tfs` | PR created |
| `git.pullrequest.updated` | `tfs` | PR updated |
| `git.pullrequest.merged` | `tfs` | PR merged |
| `workitem.created` | `tfs` | Work item created |
| `workitem.updated` | `tfs` | Work item updated |
| `workitem.commented` | `tfs` | Comment added to work item |
| `ms.vss-release.deployment-completed-event` | `tfs` | Release deployment completed |

## Instructions

1. **Create subscription** — `POST /_apis/hooks/subscriptions?api-version=7.1`:
   ```json
   {
     "publisherId": "tfs",
     "eventType": "git.push",
     "resourceVersion": "1.0",
     "consumerId": "webHooks",
     "consumerActionId": "httpRequest",
     "publisherInputs": {
       "projectId": "{projectId}",
       "repository": "{repoId}"
     },
     "consumerInputs": {
       "url": "https://example.com/webhook"
     }
   }
   ```

2. **Configure consumers**:
   - **Webhook**: `consumerId: "webHooks"`, `consumerActionId: "httpRequest"`, inputs: `url`, `httpHeaders`, `basicAuthUsername`, `basicAuthPassword`
   - **Slack**: `consumerId: "slack"`, `consumerActionId: "postMessageToChannel"`, inputs: `url` (incoming webhook URL)
   - **Teams**: `consumerId: "microsoftTeams"`, `consumerActionId: "postMessageToChannel"`, inputs: `url` (Teams webhook URL)
   - **Service Bus**: `consumerId: "azureServiceBus"`, inputs: `connectionString`, `queueName`

3. **Apply event filters** — use `publisherInputs` to filter:
   - Repository: `"repository": "{repoId}"`
   - Branch: `"branch": "refs/heads/main"`
   - Build definition: `"definitionName": "CI Build"`
   - Work item type: `"workItemType": "Bug"`

4. **Test subscription** — `POST /_apis/hooks/testnotifications?api-version=7.1`:
   ```json
   { "subscriptionId": "{subId}" }
   ```
   Verify the target received the test payload.

5. **List subscriptions** — `GET /_apis/hooks/subscriptions?api-version=7.1`
   Display: ID, Event, Consumer, Status, Created date.

6. **Delete subscription** — `DELETE /_apis/hooks/subscriptions/{subId}?api-version=7.1`.

## Examples

```bash
/ado-service-hook --event build.complete --target webhook --url https://api.example.com/builds
/ado-service-hook --event git.pullrequest.created --target slack --url https://hooks.slack.com/services/T.../B.../xxx
/ado-service-hook --event workitem.updated --target teams --url https://contoso.webhook.office.com/webhookb2/...
/ado-service-hook --action list
/ado-service-hook --action test --subscription-id abc-123
```

## Error Handling

- **Invalid consumer**: Consumer ID not recognized — list consumers with `GET /_apis/hooks/consumers`.
- **Target unreachable**: Webhook URL returned error — verify URL and network access.
- **Duplicate subscription**: Same event+consumer already exists — offer to update or delete existing.
