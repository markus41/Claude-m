# Azure Logic Apps Plugin

Azure Logic Apps enterprise integration development -- build automated workflows with Workflow Definition Language, connectors, B2B/EDI integration accounts, and deploy across Standard and Consumption hosting models.

## Setup

```
/plugin install azure-logic-apps@claude-m-microsoft-marketplace
```

## Commands

| Command | Description |
|---------|-------------|
| `/la-setup` | Install Azure CLI, Logic Apps extension, create a Logic App resource, and configure local project settings |
| `/la-create` | Create a new Logic App workflow with trigger selection (HTTP, Recurrence, Service Bus, Event Grid, etc.) |
| `/la-deploy` | Deploy workflows to Azure via CLI, ARM/Bicep templates, or generate GitHub Actions CI/CD pipelines |
| `/la-troubleshoot` | Diagnose failed workflow runs, inspect run history, check trigger status, and resolve connector errors |
| `/la-connector-config` | Configure managed, custom, and built-in connectors with connection references and managed identity auth |
| `/la-integration-account` | Set up B2B integration accounts with trading partners, agreements, schemas, maps, and certificates |
| `/la-migrate-ise` | Migrate Integration Service Environment (ISE) Logic Apps to Logic Apps Standard with connector compatibility checks |
| `/la-expression-helper` | Build and validate Workflow Definition Language expressions, functions, and dynamic content references |

## Agent

| Agent | Description |
|-------|-------------|
| **Logic Apps Reviewer** | Reviews Azure Logic Apps projects for WDL workflow structure, connector configuration, error handling patterns, security best practices, B2B integration correctness, and deployment readiness |

## Trigger Keywords

The skill activates automatically when conversations mention: `azure logic apps`, `logic app`, `workflow definition language`, `WDL`, `enterprise integration`, `integration account`, `B2B integration`, `EDI`, `logic app standard`, `logic app consumption`, `connector configuration`, `workflow automation`, `runAfter`, `logic app trigger`.

## Prompt Examples

- "Use `azure-logic-apps` to scaffold a Standard Logic App with an HTTP trigger that calls a SQL connector and sends results to a Service Bus queue."
- "Use `azure-logic-apps` to review my workflow.json files for missing error handling, hardcoded secrets, and deployment readiness."
- "Use `azure-logic-apps` to migrate my ISE-hosted Logic Apps to Standard tier and identify connectors that need replacement."
- "Use `azure-logic-apps` to set up a B2B integration account with AS2 agreements, X12 schemas, and partner certificates for EDI message processing."

## Related Plugins

| Plugin | Relationship |
|--------|-------------|
| `azure-functions` | Logic Apps can call Azure Functions as inline actions; Functions can trigger Logic App workflows |
| `power-automate` | Power Automate uses the same connector ecosystem; migration paths exist between Logic Apps and Power Automate flows |
| `azure-api-management` | Expose Logic App workflows as managed APIs with policies, rate limiting, and developer portal publishing |
| `azure-service-bus` | Service Bus triggers and actions are core to Logic Apps messaging patterns; dead-letter and session handling integration |

## Author

Markus Ahling
