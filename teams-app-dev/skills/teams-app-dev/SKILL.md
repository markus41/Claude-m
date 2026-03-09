---
name: Teams App Dev
description: >
  Deep expertise in custom Microsoft Teams app development — build apps with Teams SDK v2
  and M365 Agents SDK, design Adaptive Cards with schema 1.5, create search/action/link-unfurling
  message extensions, develop tab apps with TeamsJS v2.24+ and SSO/NAA, scaffold Custom Engine Agents,
  author Microsoft 365 app manifests v1.25, orchestrate dialogs, and manage the full dev lifecycle
  with the Microsoft 365 Agents Toolkit CLI. Targets professional TypeScript developers building
  production Teams apps.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - teams app
  - teams sdk
  - agents toolkit
  - adaptive card
  - message extension
  - teams bot
  - teams tab
  - teams manifest
  - sideload
  - teams sso
  - link unfurling
  - dialog
  - custom engine agent
  - agent 365
  - blueprint
  - agents sdk
  - agents playground
  - nested app auth
  - NAA
  - copilot plugin
  - declarative agent
  - single tenant bot
  - task module
---

# Teams App Dev

## 1. Teams App Architecture Overview

Microsoft Teams apps extend Teams (and other Microsoft 365 hosts) with custom functionality through several surface areas. The correct mental model is a **bundle of Teams capabilities** described by a single Microsoft 365 app manifest and packaged as a Microsoft 365 app.

### The Three-SDK Stack (March 2026)

Three SDKs now coexist for Teams development:

| SDK | Repo | Use When | Languages |
|-----|------|----------|-----------|
| **Teams SDK v2** (formerly Teams AI Library v2) | `microsoft/teams-sdk` | Teams-only apps: tabs, bots, message extensions, meeting apps, AI agents | TypeScript, .NET, Python |
| **M365 Agents SDK** | `microsoft/Agents` | Multi-channel agents: Teams + Web + Slack + SMS + email via Azure AI Bot Service | TypeScript, .NET |
| **Agent 365 SDK** | MS Learn docs | Enterprise agent layer: Entra agent identity, governed MCP servers, OpenTelemetry, blueprints | .NET (currently) |

**SDK Decision Matrix**:

| Scenario | Recommended SDK |
|----------|----------------|
| Tabs, personal apps, meeting extensions | Teams SDK v2 |
| Bots + message extensions (Teams-only) | Teams SDK v2 |
| AI agent (Teams-only) | Teams SDK v2 |
| AI agent (multi-channel: Teams + Web + Slack + SMS) | M365 Agents SDK |
| Enterprise agent with own identity, audit trail, governed tools | Agent 365 SDK (wraps either of the above) |
| Declarative Copilot agent | M365 Agents SDK + Copilot manifest |

### Deprecations and Breaking Changes

| Item | Status | Action |
|------|--------|--------|
| **TeamsFx SDK** | Community-only until Sep 2026; full deprecation Jul 2026 | All new projects must use Teams SDK v2 or M365 Agents SDK |
| **Bot Framework SDK** | Repository archived; LTS retired | Use M365 Agents SDK (multi-channel) or Teams SDK v2 (Teams-only) |
| **Multi-tenant bot registration** | Retiring; new registrations blocked | All new bots must use single-tenant config with `APP_TENANTID` |
| **LUIS** | Fully retired Mar 2026 | Use Azure AI Language or LLM-based intent |
| **TeamsJS v1** | Submission blocked | Minimum v2.19.0 for Store submission |
| **`tasks` namespace** | Fully replaced by `dialog` namespace in TeamsJS v2 | Use `dialog.url.open()`, `dialog.adaptiveCard.open()` |

### App Types and Surfaces

| Type | Surface | Technology |
|------|---------|-----------|
| Bot | Chat, channels, group chats | Teams SDK v2 activity handlers or M365 Agents SDK ActivityHandler |
| Message extension | Compose box, message actions | Bot-based search/action handlers (shares bot endpoint) |
| Tab (static) | Personal app | React/HTML + TeamsJS v2.24+ |
| Tab (configurable) | Channel/group chat tab | React/HTML + configuration page |
| Meeting extension | Side panel, stage, chat, details | Tabs + bots + content bubble |
| Dialog | Modal overlay from tab/bot/extension | `dialog.url.open()` or `dialog.adaptiveCard.open()` |

### Development Stack

- **Language**: TypeScript (recommended) or C#/.NET
- **Bot/agent runtime**: Teams SDK v2 (`@microsoft/teams-sdk`) or M365 Agents SDK (`@microsoft/agents-*`)
- **Client library**: TeamsJS v2.24+ (`@microsoft/teams-js`)
- **Adaptive Cards**: Schema v1.5 (Teams desktop/web), v1.2 (mobile)
- **Manifest**: Microsoft 365 app manifest v1.25
- **Tooling**: Microsoft 365 Agents Toolkit CLI (`@microsoft/m365agentstoolkit-cli`)
- **Config**: `m365agents.yml` (lifecycle), `.env` (local dev), Bicep (Azure)

---

## 2. Microsoft 365 Agents Toolkit (ATK)

The Microsoft 365 Agents Toolkit (formerly Teams Toolkit) is the primary tooling for Teams app development.

### Installation

```bash
# Install globally
npm install -g @microsoft/m365agentstoolkit-cli

# Verify
m365agents --version

# Login to M365
m365agents auth login m365

# Login to Azure
m365agents auth login azure
```

### Project Scaffolding

```bash
# Interactive
m365agents new

# Non-interactive: Teams SDK v2 bot
m365agents new --app-name MyBot --capability bot --programming-language typescript

# Non-interactive: tab
m365agents new --app-name MyTab --capability tab --programming-language typescript

# Non-interactive: Custom Engine Agent (M365 Agents SDK path)
m365agents new --app-name MyAgent --capability custom-engine-agent --programming-language typescript
```

**Template Categories in ATK**:

| Category | SDK Path | Description |
|----------|----------|-------------|
| **Teams Agents and Apps** | Teams SDK v2 | Tabs, bots, message extensions, meeting apps |
| **Custom Engine Agent** | M365 Agents SDK | Multi-channel agents |
| **Declarative Agent** | Copilot stack | Declarative manifest for Copilot |

### Teams SDK v2 CLI Alternative

```bash
# Teams SDK v2 also has its own scaffolding
teams new typescript my-agent -t <template> --atk oauth
```

### Local Development

```bash
# Start local debug session (creates tunnel + sideloads app)
m365agents preview --local

# Preview with specific environment
m365agents preview --env dev

# Preview remote deployment
m365agents preview --env production
```

**Agents Playground** (formerly Teams App Test Tool): Debug bots locally without a dev tenant, tunneling, or app/bot registration. Built into ATK.

### Config File: m365agents.yml

```yaml
# m365agents.yml (replaces teamsapp.yml)
version: 1.0.0

provision:
  - uses: botFramework/create
    with:
      botId: ${{BOT_ID}}
      name: MyBot
      messagingEndpoint: ${{BOT_ENDPOINT}}/api/messages
      channels:
        - name: msteams

deploy:
  - uses: file/createOrUpdateEnvironmentFile
    with:
      target: .env
      envs:
        MicrosoftAppId: ${{BOT_ID}}
        MicrosoftAppPassword: ${{SECRET_BOT_PASSWORD}}
        MicrosoftAppType: SingleTenant
        MicrosoftAppTenantId: ${{APP_TENANTID}}
```

### Provisioning and Deployment

```bash
# Provision Azure resources
m365agents provision --env dev

# Deploy app code
m365agents deploy --env dev

# Package the app zip
m365agents package --env dev

# Publish to org catalog
m365agents publish --env dev

# Validate manifest
m365agents validate --manifest-path ./appPackage/manifest.json
```

### Environment Management

```bash
# .env.dev — commit to source control (no secrets)
TEAMS_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
BOT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
APP_TENANTID=zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz
TAB_DOMAIN=myapp.azurewebsites.net

# .env.dev.user — NEVER commit (in .gitignore)
SECRET_BOT_PASSWORD=<actual-secret>
SECRET_AAD_APP_CLIENT_SECRET=<actual-secret>
```

### CI/CD Integration

```yaml
# .github/workflows/teams-deploy.yml
name: Deploy Teams App

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm install -g @microsoft/m365agentstoolkit-cli
      - run: npm ci
      - name: Login to M365
        run: |
          m365agents auth login m365 \
            --service-principal \
            --tenant-id ${{ secrets.M365_TENANT_ID }} \
            --client-id ${{ secrets.M365_CLIENT_ID }} \
            --client-secret ${{ secrets.M365_CLIENT_SECRET }}
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: m365agents provision --env production --no-interactive
        env:
          SECRET_BOT_PASSWORD: ${{ secrets.BOT_PASSWORD }}
      - run: m365agents deploy --env production --no-interactive
      - run: m365agents publish --env production --no-interactive
```

---

## 3. Teams SDK v2 — Bot and Agent Development

Teams SDK v2 (formerly Teams AI Library v2) is the recommended SDK for Teams-native apps. It replaces the archived Bot Framework SDK.

### Package Installation

```bash
# Teams SDK v2
npm install @microsoft/teams-sdk

# For TypeScript
npm install --save-dev typescript @types/node
```

### Activity Handler (Teams SDK v2)

```typescript
import {
  Application,
  TurnContext,
  MessageFactory,
  CardFactory,
  TeamsInfo,
} from "@microsoft/teams-sdk";

const app = new Application({
  auth: {
    appId: process.env.BOT_ID!,
    appPassword: process.env.BOT_PASSWORD!,
    appType: "SingleTenant",
    appTenantId: process.env.APP_TENANTID!,
  },
});

// Message handler
app.message("help", async (context: TurnContext) => {
  await context.sendActivity(MessageFactory.text("Available commands: help, status"));
});

// Default message handler
app.message(async (context: TurnContext) => {
  const text = TurnContext.removeRecipientMention(context.activity)?.trim() ?? "";
  await context.sendActivity(MessageFactory.text(`Echo: ${text}`));
});

// Members added
app.membersAdded(async (context: TurnContext, members) => {
  for (const member of members) {
    if (member.id !== context.activity.recipient.id) {
      await context.sendActivity(MessageFactory.text(`Welcome, ${member.name}!`));
    }
  }
});

// Adaptive Card action
app.adaptiveCardAction("approve", async (context: TurnContext, data) => {
  return {
    statusCode: 200,
    type: "application/vnd.microsoft.card.adaptive",
    value: {
      type: "AdaptiveCard",
      version: "1.5",
      body: [{ type: "TextBlock", text: `Approved! Item: ${data.itemId}`, color: "Good" }],
    },
  };
});

// Start the server
app.listen(process.env.PORT ?? 3978);
```

### Key v2 Additions

- **Agent2Agent (A2A)**: Multi-agent collaboration protocol
- **Model Context Protocol (MCP)**: Shared memory and tools across agents
- **Action Planner**: Built-in orchestrator for AI-powered agents
- **Simplified API**: Declarative routing instead of class inheritance

### Getting Team and Member Information

```typescript
import { TeamsInfo } from "@microsoft/teams-sdk";

const teamDetails = await TeamsInfo.getTeamDetails(context);
const members = await TeamsInfo.getPagedMembers(context);
const channels = await TeamsInfo.getTeamChannels(context);
const member = await TeamsInfo.getMember(context, context.activity.from.id);
```

### Proactive Messaging

```typescript
// Store conversation reference during a turn
const ref = TurnContext.getConversationReference(context.activity);
// Persist ref to DB

// Send proactive message later
await app.continueConversation(ref, async (proactiveContext) => {
  await proactiveContext.sendActivity(MessageFactory.text("Notification!"));
});
```

### Express Server Setup (Teams SDK v2)

```typescript
import express from "express";
import { Application } from "@microsoft/teams-sdk";

const expressApp = express();
expressApp.use(express.json());

const bot = new Application({
  auth: {
    appId: process.env.BOT_ID!,
    appPassword: process.env.BOT_PASSWORD!,
    appType: "SingleTenant",
    appTenantId: process.env.APP_TENANTID!,
  },
});

expressApp.post("/api/messages", async (req, res) => {
  await bot.processActivity(req, res);
});

const PORT = process.env.PORT ?? 3978;
expressApp.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
```

---

## 4. M365 Agents SDK — Multi-Channel Agents

The M365 Agents SDK is for building agent containers that work across Teams, Web, email, SMS, Slack, and more.

### Package Installation

```bash
npm install @microsoft/agents-core @microsoft/agents-hosting-express
# Node 20+ required (Node 22 recommended for --env-file support)
```

### Basic Agent (M365 Agents SDK)

```typescript
import { ActivityHandler, TurnContext, MessageFactory } from "@microsoft/agents-core";
import { createExpressHost } from "@microsoft/agents-hosting-express";

class MyAgent extends ActivityHandler {
  async onMessage(context: TurnContext) {
    const text = context.activity.text?.trim() ?? "";
    await context.sendActivity(MessageFactory.text(`Echo: ${text}`));
  }

  async onMembersAdded(context: TurnContext, membersAdded: any[]) {
    for (const member of membersAdded) {
      if (member.id !== context.activity.recipient.id) {
        await context.sendActivity(MessageFactory.text(`Welcome!`));
      }
    }
  }
}

const agent = new MyAgent();
createExpressHost(agent, { port: process.env.PORT ?? 3978 });
```

### Key Concepts

- **AI-agnostic**: Works with OpenAI, Azure OpenAI, Anthropic, LangChain, CrewAI
- **Channel-agnostic**: Same agent logic deploys to any supported channel
- **Activity protocol**: Carries forward from Bot Framework (turn context, activities, adapters)
- **State and storage**: Built-in state management with pluggable storage

---

## 5. Agent 365 SDK — Enterprise Agent Layer

Agent 365 SDK adds enterprise-grade capabilities on top of any agent SDK.

### Core Capabilities

- **Entra Agent Identity**: Agents get their own Entra ID, mailbox, and user resources
- **Notifications**: Agents receive and respond to notifications from Teams, Outlook, Word, and email
- **Observability**: OpenTelemetry tracing for auditable agent interactions
- **Governed MCP Servers**: Access M365 workloads (Mail, Calendar, SharePoint, Teams) under admin control
- **Blueprints**: IT-approved, pre-configured agent type definitions with compliance policies

### Agent 365 CLI

```bash
# Setup agent identity
agent365 identity create --name "MyAgent" --blueprint "standard-assistant"

# Configure MCP tools
agent365 mcp add --tool "mail-read" --scope "user"

# Publish agent
agent365 publish --target "teams,outlook"

# Deploy to Azure
agent365 deploy --resource-group "rg-agents" --location "eastus"
```

### Manifest Integration

Manifest v1.25 added `agenticUserTemplates` to reference an Agent 365 blueprint:

```json
{
  "agenticUserTemplates": [
    {
      "id": "standard-assistant",
      "blueprintId": "contoso.standard-assistant.v1"
    }
  ]
}
```

---

## 6. Microsoft 365 App Manifest v1.25

### Schema

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json",
  "manifestVersion": "1.25",
  "version": "1.0.0",
  "id": "{{APP_ID}}"
}
```

### Key v1.25 Properties

| Property | Purpose | Notes |
|----------|---------|-------|
| `agenticUserTemplates` | Agent 365 blueprint reference | New in v1.25 |
| `supportsChannelFeatures` | Required for team-scoped apps | Set to `"tier1"` |
| `nestedAppAuthInfo` | Prefetch NAA token on tab load | v1.22+ |
| `backgroundLoadConfiguration` | Tab precaching for faster load | v1.23+ |
| `copilot` scope for bots | New bot scope value | v1.23+ |
| `activityIcons` | Custom 32x32 PNGs for activity feed | v1.24+ |
| `semanticDescription` | For Copilot for M365 integration | v1.22+ |
| `webApplicationInfo` | SSO configuration (client ID + API URI) | Existing |

### Full Manifest Example

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json",
  "manifestVersion": "1.25",
  "version": "1.0.0",
  "id": "{{APP_ID}}",
  "name": {
    "short": "My App",
    "full": "My Application Full Name"
  },
  "description": {
    "short": "Short description (80 chars max)",
    "full": "Full description of app capabilities (4000 chars max)"
  },
  "developer": {
    "name": "Contoso",
    "websiteUrl": "https://contoso.com",
    "privacyUrl": "https://contoso.com/privacy",
    "termsOfUseUrl": "https://contoso.com/tos"
  },
  "icons": {
    "color": "color.png",
    "outline": "outline.png"
  },
  "accentColor": "#FFFFFF",
  "staticTabs": [
    {
      "entityId": "homeTab",
      "name": "Home",
      "contentUrl": "https://{{TAB_DOMAIN}}/tab/home",
      "websiteUrl": "https://{{TAB_DOMAIN}}/tab/home",
      "scopes": ["personal"]
    }
  ],
  "configurableTabs": [
    {
      "configurationUrl": "https://{{TAB_DOMAIN}}/tab/configure",
      "canUpdateConfiguration": true,
      "scopes": ["team", "groupChat"],
      "context": ["channelTab", "privateChatTab", "meetingChatTab", "meetingDetailsTab", "meetingSidePanel", "meetingStage"],
      "supportsChannelFeatures": "tier1"
    }
  ],
  "bots": [
    {
      "botId": "{{BOT_ID}}",
      "scopes": ["personal", "team", "groupChat"],
      "supportsFiles": false,
      "isNotificationOnly": false
    }
  ],
  "composeExtensions": [
    {
      "botId": "{{BOT_ID}}",
      "commands": [
        {
          "id": "searchItems",
          "type": "query",
          "title": "Search",
          "description": "Search for items",
          "initialRun": true,
          "parameters": [
            { "name": "query", "title": "Search", "description": "Search term" }
          ]
        }
      ]
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["{{TAB_DOMAIN}}"],
  "webApplicationInfo": {
    "id": "{{AAD_APP_CLIENT_ID}}",
    "resource": "api://{{TAB_DOMAIN}}/{{AAD_APP_CLIENT_ID}}"
  },
  "nestedAppAuthInfo": {
    "enableNAA": true
  }
}
```

### Known Issues (v1.25)

- Schema regex validation bug for `.xll` pattern — tracked in GitHub Issue #15340
- Developer Portal has bugs saving `supportsChannelFeatures` — use manual ZIP packaging as workaround

---

## 7. TeamsJS Client Library v2.24+

### Core API

```typescript
import * as microsoftTeams from "@microsoft/teams-js";

// MUST call app.initialize() before any other SDK call
await microsoftTeams.app.initialize();

// Get full context
const context = await microsoftTeams.app.getContext();
console.log({
  teamId: context.team?.internalId,
  channelId: context.channel?.id,
  userObjectId: context.user?.id,
  userPrincipalName: context.user?.userPrincipalName,
  theme: context.app.theme,          // "default" | "dark" | "contrast"
  hostName: context.app.host.name,   // "Teams" | "Outlook" | "Office"
  frameContext: context.page.frameContext,
  meetingId: context.meeting?.id,
});
```

### Key Namespaces

| Namespace | Purpose | Status |
|-----------|---------|--------|
| `app` | Initialization, context, lifecycle | Stable |
| `authentication` | SSO, auth flows | Stable |
| `dialog` | Modal dialogs (HTML + Adaptive Card) | Stable (replaces `tasks`) |
| `pages` | Tab navigation, config, back stack | Stable |
| `chat` | Chat interactions | Preview |
| `call` | Start calls | Stable |
| `meeting` | Meeting lifecycle, raise hand | Stable |
| `stageView` | Stage view interactions | Preview |
| `nestedAppAuth` | Nested App Authentication (NAA) | Stable (v2.24+) |
| `videoEffects` | In-meeting video effects | Preview |
| `marketplace` | App install dialog | Stable |

### Dialog Namespace (Replaces Task Modules)

The `tasks` namespace is fully replaced by `dialog`:

```typescript
// Open HTML-based dialog
microsoftTeams.dialog.url.open({
  title: "Create Item",
  url: `${window.location.origin}/dialog/create`,
  size: { height: 450, width: 600 },
});

// Open Adaptive Card dialog
microsoftTeams.dialog.adaptiveCard.open({
  title: "Quick Form",
  card: cardJson,
  size: { height: 400, width: 500 },
});

// Bot-backed dialogs
microsoftTeams.dialog.url.bot.open({ ... });
microsoftTeams.dialog.adaptiveCard.bot.open({ ... });

// Submit from HTML dialog
microsoftTeams.dialog.url.submit(resultData);
```

Dialogs can be invoked from tabs, bots, message extensions, and deep links. Results return directly to the calling surface.

### SSO Authentication

```typescript
// Get SSO token (silent, no popup)
const ssoToken = await microsoftTeams.authentication.getAuthToken();

// Exchange on server via OBO flow
const response = await fetch("/auth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ssoToken }),
});
```

### Nested App Authentication (NAA)

NAA allows apps in iframes to authenticate without pop-ups by leveraging the parent host's auth context:

```typescript
// Check if NAA is recommended for the current channel
const isRecommended = await microsoftTeams.nestedAppAuth.isNAAChannelRecommended();

// Use MSAL with NAA
import { createNestablePublicClientApplication } from "@azure/msal-browser";

const msalInstance = await createNestablePublicClientApplication({
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/common",
  },
});
```

### Tab Configuration Page

```typescript
microsoftTeams.pages.config.registerOnSaveHandler(async (saveEvent) => {
  await microsoftTeams.pages.config.setConfig({
    entityId: "tab-dashboard",
    configName: "Dashboard",
    contentUrl: `https://myapp.com/tab/dashboard`,
    websiteUrl: `https://myapp.com/tab/dashboard`,
  });
  saveEvent.notifySuccess();
});
microsoftTeams.pages.config.setValidityState(true);
```

### Deep Links

```typescript
// Navigate to a tab (TeamsJS v2)
await microsoftTeams.pages.navigateToApp({
  appId: "your-app-id",
  pageId: "homeTab",
  subPageId: "item-123",
});

// URL format
const deepLink = `https://teams.microsoft.com/l/entity/${appId}/${entityId}?context=${encodedContext}`;
```

### Meeting APIs

```typescript
const context = await microsoftTeams.app.getContext();
const isMeeting = !!context.meeting;
const frameContext = context.page.frameContext;
// "sidePanel" | "meetingStage" | "content"

// Share to meeting stage from side panel
if (frameContext === "sidePanel") {
  await microsoftTeams.meeting.shareAppContentToStage(
    (err) => { if (err) console.error("Share failed:", err); },
    `${window.location.origin}/tab/stage`
  );
}
```

---

## 8. Adaptive Cards in Teams

### Version Support

| Teams Client | Max Schema Version |
|---|---|
| Desktop (Windows/macOS) / Web | 1.5 |
| Mobile (iOS/Android) | 1.2 |
| Incoming Webhooks | 1.5 (except Action.Submit — use Action.Execute) |

**Important Teams-specific gotchas**:
- `Action.Submit` `isEnabled` property is NOT supported
- File/image uploads are NOT supported in Adaptive Cards
- Positive/destructive action styling is NOT supported
- Design for narrow screens first (mobile, meeting side panels)

### Card Layout

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "width": "auto",
          "items": [
            { "type": "Image", "url": "https://example.com/logo.png", "size": "Small", "style": "Person" }
          ]
        },
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "John Smith", "weight": "Bolder" },
            { "type": "TextBlock", "text": "Engineering", "isSubtle": true, "spacing": "None" }
          ]
        }
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Priority", "value": "${priority}" },
        { "title": "Due Date", "value": "${dueDate}" }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Execute",
      "title": "Approve",
      "verb": "approve",
      "data": { "itemId": "${itemId}" }
    },
    {
      "type": "Action.OpenUrl",
      "title": "View Details",
      "url": "${detailUrl}"
    }
  ]
}
```

### Input Elements

| Element | Use |
|---------|-----|
| `Input.Text` | Free text, multiline |
| `Input.ChoiceSet` | Dropdown, radio, multi-select |
| `Input.Date` / `Input.Time` | Date/time pickers |
| `Input.Toggle` | Boolean toggle |
| `Input.Number` | Numeric input |

### Templating SDK

```typescript
import { AdaptiveCardTemplate } from "adaptivecards-templating";

const template = new AdaptiveCardTemplate(cardJson);
const rendered = template.expand({
  $root: {
    title: "Incident Report",
    severity: "Critical",
    owner: { displayName: "On-Call Engineer" },
  },
});
```

Template expressions:
- Simple binding: `"text": "Hello, ${name}!"`
- Array iteration: `"$data": "${items}"`
- Conditional rendering: `"$when": "${status == 'active'}"`

### Universal Actions — Refresh Pattern

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "refresh": {
    "action": {
      "type": "Action.Execute",
      "verb": "refresh",
      "data": { "taskId": "123" }
    },
    "userIds": ["<user-aad-object-id>"]
  },
  "body": [...]
}
```

### Card Size and Limits

| Resource | Limit |
|---|---|
| Card JSON size | 28 KB |
| Actions per card | 6 visible; unlimited with ShowCard nesting |
| Nested containers | 5 levels |
| Input.ChoiceSet options | 100 |
| Max schema version | 1.5 (Teams) |
| Image URLs | HTTPS required |
| Refresh userIds | 60 users |

---

## 9. Message Extensions

Message extensions are implemented as bot-based handlers sharing the same `/api/messages` endpoint.

### Types

1. **Search commands** — Query-based, returns cards from your service
2. **Action commands** — Collect input via dialog, process server-side, return card
3. **Link unfurling** — Automatically preview URLs pasted in compose box

### Search Extension (Teams SDK v2)

```typescript
app.messageExtension.query("searchItems", async (context, query) => {
  const searchText = query.parameters?.[0]?.value ?? "";
  const results = await searchService(searchText);

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: results.map((item) => ({
        content: buildAdaptiveCard(item),
        contentType: "application/vnd.microsoft.card.adaptive",
        preview: CardFactory.thumbnailCard(item.title, item.subtitle),
      })),
    },
  };
});
```

### Action Extension (Teams SDK v2)

```typescript
app.messageExtension.fetchTask("createItem", async (context, action) => {
  return {
    task: {
      type: "continue",
      value: {
        title: "Create Item",
        height: 450,
        width: 500,
        card: CardFactory.adaptiveCard(formCard),
      },
    },
  };
});

app.messageExtension.submitAction("createItem", async (context, action) => {
  const { title, description } = action.data;
  const created = await createItem({ title, description });

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: [{ content: buildResultCard(created), contentType: "application/vnd.microsoft.card.adaptive" }],
    },
  };
});
```

### Link Unfurling

```typescript
app.messageExtension.linkQuery(async (context, query) => {
  const url = query.url;
  const metadata = await fetchMetadata(url);

  return {
    composeExtension: {
      type: "result",
      attachmentLayout: "list",
      attachments: [{
        content: buildUnfurlCard(metadata),
        contentType: "application/vnd.microsoft.card.adaptive",
        preview: CardFactory.thumbnailCard(metadata.title, metadata.description),
      }],
    },
  };
});
```

### Manifest Fragment

```json
{
  "composeExtensions": [{
    "botId": "{{BOT_ID}}",
    "commands": [
      {
        "id": "searchItems",
        "type": "query",
        "title": "Search",
        "description": "Search for items",
        "initialRun": true,
        "parameters": [{ "name": "query", "title": "Search", "description": "Search term" }]
      },
      {
        "id": "createItem",
        "type": "action",
        "title": "Create",
        "description": "Create a new item",
        "context": ["message", "compose"],
        "fetchTask": true
      }
    ],
    "messageHandlers": [{
      "type": "link",
      "value": { "domains": ["myapp.com", "*.myapp.com"] }
    }]
  }]
}
```

### Limits

| Resource | Limit |
|---|---|
| Commands per extension | 10 |
| Parameters per command | 5 |
| Search results returned | 25 per query |
| Query response timeout | 5 seconds |
| Link unfurl domains | 10 |
| Dialog dimensions | 16-720px height, 16-1000px width |

---

## 10. Tab Development

### Personal Tabs (Static)

Personal tabs host the full product shell: dashboards, search, settings, admin tools.

```json
{
  "staticTabs": [{
    "entityId": "homeTab",
    "name": "Home",
    "contentUrl": "https://{{TAB_DOMAIN}}/tab/home",
    "websiteUrl": "https://{{TAB_DOMAIN}}/tab/home",
    "scopes": ["personal"]
  }]
}
```

### Channel/Group Tabs (Configurable)

Collaborative context surfaces that inherit team/channel/chat context.

```json
{
  "configurableTabs": [{
    "configurationUrl": "https://{{TAB_DOMAIN}}/tab/configure",
    "canUpdateConfiguration": true,
    "scopes": ["team", "groupChat"],
    "context": ["channelTab", "privateChatTab", "meetingChatTab", "meetingDetailsTab", "meetingSidePanel", "meetingStage"],
    "supportsChannelFeatures": "tier1"
  }]
}
```

### Meeting Tabs

| Surface | Use | Context Value |
|---------|-----|---------------|
| Details tab | Pre/post meeting prep and follow-up | `meetingDetailsTab` |
| Side panel | During-meeting operator workflows | `meetingSidePanel` |
| Stage | Shared synchronized work surface | `meetingStage` |
| Chat tab | Meeting chat context | `meetingChatTab` |

### Tab Context Fields

| Field | Path | Description |
|-------|------|-------------|
| User AAD ID | `context.user?.id` | AAD Object ID |
| Tenant ID | `context.user?.tenant?.id` | Tenant ID |
| Team ID | `context.team?.internalId` | Teams internal ID |
| Channel ID | `context.channel?.id` | Current channel |
| Entity ID | `context.page.id` | `entityId` from manifest |
| Theme | `context.app.theme` | `"default"` / `"dark"` / `"contrast"` |
| Host name | `context.app.host.name` | `"Teams"` / `"Outlook"` / `"Office"` |
| Frame context | `context.page.frameContext` | `"content"` / `"sidePanel"` / `"task"` |
| Meeting ID | `context.meeting?.id` | Present only in meetings |

---

## 11. Authentication Patterns

### Tab SSO

1. TeamsJS `authentication.getAuthToken()` gets SSO token (silent)
2. Manifest `webApplicationInfo` configures client ID and API URI
3. Server exchanges SSO token via OBO flow for Graph/API token
4. `validDomains` must include all domains

### Nested App Authentication (NAA)

For iframe-based scenarios — no pop-ups required:
1. Set `nestedAppAuthInfo.enableNAA: true` in manifest
2. Use `createNestablePublicClientApplication` from MSAL
3. Token flows through parent host's auth context

### Bot Auth

- Separate from tab SSO
- Single-tenant: `MicrosoftAppType: 'SingleTenant'`, pass `APP_TENANTID`
- OAuth connection configured in Azure Bot Service
- Redirect URI: `https://token.botframework.com/.auth/web/redirect`

### Agent Identity (Agent 365)

- Agents get their own Entra ID via blueprints
- Can have mailboxes, respond to @mentions
- Admin-governed permissions and tool access

---

## 12. Dialog Orchestration

Dialogs (formerly task modules) are focused modal surfaces launched from any Teams surface.

### From Tabs

```typescript
microsoftTeams.dialog.url.open({
  title: "Create Item",
  url: `${window.location.origin}/dialog/create`,
  size: { height: 450, width: 600 },
});

// Handle result
microsoftTeams.dialog.url.open({
  title: "Edit",
  url: `${window.location.origin}/dialog/edit`,
  size: { height: 400, width: 500 },
}, (result) => {
  console.log("Dialog result:", result);
});
```

### From Bots

```typescript
// Bot returns dialog in response to invoke
app.dialogFetch(async (context, request) => {
  return {
    task: {
      type: "continue",
      value: {
        title: "Task Form",
        height: 400,
        width: 600,
        card: CardFactory.adaptiveCard(formCard),
      },
    },
  };
});

app.dialogSubmit(async (context, request) => {
  const data = request.data;
  await processSubmission(data);
  return { task: { type: "message", value: "Done!" } };
});
```

### From Deep Links

```
https://teams.microsoft.com/l/task/<appId>?url=<encodedUrl>&height=<h>&width=<w>&title=<title>
```

---

## 13. Azure Bot Service Registration

### Single-Tenant Configuration (Required)

```bicep
resource botService 'Microsoft.BotService/botServices@2022-09-15' = {
  name: 'my-teams-bot'
  location: 'global'
  sku: { name: 'F0' }
  kind: 'azurebot'
  properties: {
    displayName: 'My Teams Bot'
    endpoint: 'https://${appService.properties.defaultHostName}/api/messages'
    msaAppId: appRegistration.properties.appId
    msaAppType: 'SingleTenant'
    msaAppTenantId: subscription().tenantId
  }
}

resource teamsChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
  parent: botService
  name: 'MsTeamsChannel'
  location: 'global'
  properties: {
    channelName: 'MsTeamsChannel'
    properties: { isEnabled: true }
  }
}
```

### Environment Variables

```
BOT_ID=<microsoft-app-id>
BOT_PASSWORD=<client-secret>
APP_TENANTID=<your-tenant-id>
MicrosoftAppType=SingleTenant
```

---

## 14. Best Practices

### Architecture

- Treat the app as a **manifest-driven capability container**, not a single web app
- Centralize auth — do not let each surface (tab, bot, extension) do auth differently
- Use a shared domain API layer; tabs, bots, cards, and extensions should all call the same backend
- Build a `SurfaceRouter` / `ContextResolver` as first-class runtime services
- Keep bots/cards thin — route users into richer surfaces (tabs, dialogs) for complex tasks

### Security

- Never hardcode secrets; use `.env` + `.gitignore`
- Exchange SSO tokens server-side via OBO flow — never use raw SSO tokens to call Graph from client
- All `validDomains` must be HTTPS-capable
- Configure CORS to allow only expected origins
- Validate bot tokens and check tenant ID

### Adaptive Cards

- Always design for narrow screens first (mobile, meeting side panels)
- Use `Action.Execute` with `verb` for Teams (not `Action.Submit` for new cards)
- Keep cards under 28 KB
- Include `fallbackText` for v1.5 elements
- Test in Adaptive Cards Designer with Host App set to "Microsoft Teams"

### Performance

- Use `backgroundLoadConfiguration` in manifest for tab precaching
- Use `nestedAppAuthInfo` for NAA to avoid auth popups
- Cache auth tokens; refresh before expiry
- Return fast results for message extension queries (5-second timeout)

---

## 15. Error Codes Reference

### Bot/Agent Errors

| Error | Meaning | Fix |
|-------|---------|-----|
| `401 Unauthorized` | App ID or password incorrect | Verify `BOT_ID`, `BOT_PASSWORD`, `APP_TENANTID` |
| `403 Forbidden` | Bot not authorized for team/channel | Install bot in team; check admin policies |
| `BotNotInConversationMembership` | Proactive message where bot not installed | Install bot first or use `createConversation` |
| `429 Too Many Requests` | Rate limit | Implement exponential backoff |

### Tab Errors

| Error | Meaning | Fix |
|-------|---------|-----|
| `FailedToOpenPage` | Tab URL not in `validDomains` | Add domain to manifest `validDomains` |
| `interaction_required` | SSO consent not granted | Trigger `authentication.authenticate()` |
| `invalid_grant` | SSO OBO failed | Ensure `api://domain/clientId` in `webApplicationInfo` |

### Adaptive Card Errors

| Error | Meaning | Fix |
|-------|---------|-----|
| Card not rendering | Unsupported element for schema version | Use v1.5 max; add fallback |
| `409` on card update | Activity ID mismatch | Use original message `id` for updates |
| Input values not received | Reading `text` instead of `value` | Card submits have no text; check `context.activity.value` |

### ATK CLI Errors

| Error | Meaning | Fix |
|-------|---------|-----|
| `ERR_M365_NOT_SIGNED_IN` | Not authenticated | Run `m365agents auth login m365` |
| `ERR_PROVISION_FAILED` | Bicep deployment failed | Check Azure resource quotas |
| Manifest validation error | Schema violation | Run `m365agents validate --manifest-path` |
