---
name: Copilot Studio Bots
description: >
  Deep expertise in Microsoft Copilot Studio (formerly Power Virtual Agents) — design bot topics
  with trigger phrases, build conversation flows with message, question, condition, and action nodes,
  configure generative AI orchestration, test via Direct Line API, and publish chatbots to Teams,
  web, and custom channels. Optimized for small teams building internal helpdesk, FAQ, and
  onboarding bots.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - copilot studio
  - power virtual agents
  - chatbot
  - bot topic
  - trigger phrases
  - conversation flow
  - bot publish
  - pva
  - virtual agent
---

# Copilot Studio Bots

## Overview

Microsoft Copilot Studio (formerly Power Virtual Agents) is a low-code platform for building conversational AI chatbots. It is part of the Microsoft Power Platform family alongside Power Apps, Power Automate, and Power BI. Copilot Studio enables teams to create bots without writing traditional code by defining topics (conversational intents), authoring trigger phrases, and building conversation flows using a visual node editor.

**Key capabilities**:
- Build bots with a visual topic editor — no coding required for basic scenarios.
- Use natural language understanding (NLU) for intent recognition from trigger phrases.
- Integrate generative AI (Azure OpenAI) to answer questions from knowledge bases.
- Connect to back-end systems via Power Automate flows and custom connectors.
- Deploy to Microsoft Teams, websites, mobile apps, and third-party channels.
- Manage bots as Dataverse components within Power Platform solutions.

**Ideal use cases for small teams (20 or fewer people)**:
- **IT helpdesk**: Password resets, VPN setup, software requests, account provisioning.
- **HR FAQ**: Leave policies, benefits enrollment, onboarding checklists, expense reporting.
- **Customer support**: Product FAQs, order status, appointment scheduling, return processing.
- **Internal tools**: Meeting room booking, inventory lookup, approval routing.

## Architecture

### Bots

A bot is the top-level entity. It contains topics, entities, variables, and channel configurations. In Dataverse, bots are stored in the `bot` table.

**Dataverse entity**: `bot`
**Key fields**:
| Field | Type | Description |
|-------|------|-------------|
| `botid` | GUID | Unique bot identifier |
| `name` | String | Display name |
| `description` | String | Bot description |
| `schemaname` | String | Logical name |
| `language` | Int | Primary language code (1033 = English) |
| `statecode` | Int | 0 = Active, 1 = Inactive |
| `statuscode` | Int | 1 = Provisioned, 2 = Deprovisioned |
| `publishedon` | DateTime | Last publish timestamp |

### Topics

Topics are the fundamental building blocks of a bot. Each topic represents a conversational intent (e.g., "Password Reset", "Check Order Status"). A topic consists of trigger phrases and a conversation flow (a directed graph of nodes).

**Topic types**:
- **Custom topics**: Created by the bot author for specific intents.
- **System topics**: Built-in topics for common scenarios:
  - `Greeting` — Activated when the user starts a conversation.
  - `Escalate` — Hands off to a human agent.
  - `End of Conversation` — Closes the conversation gracefully.
  - `Fallback` — Triggered when no custom topic matches the user's input.
  - `Multiple Topics Matched` — Asks for disambiguation when input is ambiguous.
  - `On Error` — Handles runtime errors in the conversation.

**Dataverse entity**: `botcomponent` (with `componenttype = 1` for topics)

### Trigger Phrases

Trigger phrases are example utterances that train the NLU model to recognize when a user's message matches a particular topic. The NLU model uses these phrases to generalize and match variations the user may type.

**Best practices**:
- Include 8-15 trigger phrases per topic for reliable intent matching.
- Use diverse wording: synonyms, different sentence structures, varying lengths.
- Mix questions ("How do I...?"), commands ("Reset my..."), and statements ("I need to...").
- Include both formal and informal phrasing.
- Avoid overlapping phrases across topics — if two topics share similar triggers, the NLU will struggle to disambiguate.
- Do not use single-word triggers (too generic) or extremely long phrases (too specific).
- Test trigger phrases by sending them as messages and verifying correct topic routing.

### Conversation Nodes

Topics are built from a sequence of nodes that form the conversation flow. Each node performs a specific action.

#### Trigger Node (`OnRecognizedIntent`)

The entry point of the topic. Contains the trigger phrases and intent name.

```yaml
- kind: OnRecognizedIntent
  intent: PasswordReset
  triggerQueries:
    - "Reset my password"
    - "I forgot my password"
    - "Change my login credentials"
```

#### Message Node (`SendMessage`)

Displays a message to the user. Supports plain text, rich text, and variable interpolation with `{Variable.Name}` syntax.

```yaml
- kind: SendMessage
  message: "Hello {System.User.FirstName}, I can help you reset your password."
```

**Message variations**: Provide multiple message variants for a natural conversational experience. The bot randomly selects one.

```yaml
- kind: SendMessage
  messageVariations:
    - "Sure thing! Let me help you with that."
    - "Absolutely, I'll walk you through the process."
    - "No problem! Here's what we need to do."
```

#### Question Node (`AskQuestion`)

Prompts the user for input and stores the response in a variable. Supports entity extraction, input validation, and re-prompting.

```yaml
- kind: AskQuestion
  variable: Topic.UserEmail
  prompt: "What email address is associated with your account?"
  entity: StringPrebuiltEntity
  validations:
    - condition: "contains(Topic.UserEmail, '@')"
      message: "That doesn't look like a valid email. Please try again."
  repromptCount: 2
  fallback:
    kind: RedirectToTopic
    topicName: "Escalate"
```

**Built-in entities**: `StringPrebuiltEntity`, `BooleanPrebuiltEntity`, `NumberPrebuiltEntity`, `DateTimePrebuiltEntity`, `EmailPrebuiltEntity`, `URLPrebuiltEntity`, `PhoneNumberPrebuiltEntity`, `PersonNamePrebuiltEntity`, `CityPrebuiltEntity`, `ZipCodePrebuiltEntity`.

**Custom entities**: Define custom closed-list or regex entities for domain-specific values (e.g., product names, department codes).

#### Condition Node (`ConditionGroup`)

Branches the conversation based on variable values or expressions.

```yaml
- kind: ConditionGroup
  conditions:
    - condition: "Topic.Department = 'IT'"
      actions:
        - kind: RedirectToTopic
          topicName: "IT Support"
    - condition: "Topic.Department = 'HR'"
      actions:
        - kind: RedirectToTopic
          topicName: "HR FAQ"
  elseActions:
    - kind: SendMessage
      message: "I'm not sure which department can help with that. Let me connect you with someone."
    - kind: RedirectToTopic
      topicName: "Escalate"
```

#### Action Node (`InvokeAction`)

Calls a Power Automate cloud flow or connector action. Used to interact with external systems (create tickets, send emails, query databases).

```yaml
- kind: InvokeAction
  actionName: "CreateITTicket"
  inputs:
    subject: "=Topic.IssueDescription"
    requesterEmail: "=Topic.UserEmail"
    priority: "=Topic.Priority"
  outputs:
    ticketNumber: Topic.TicketNumber
```

#### Redirect Node (`RedirectToTopic`)

Transfers the conversation to another topic. Enables modular topic design where common flows (escalation, confirmation) are reused.

```yaml
- kind: RedirectToTopic
  topicName: "Escalate"
```

#### End Conversation Node (`EndConversation`)

Terminates the conversation. Optionally triggers a satisfaction survey.

```yaml
- kind: EndConversation
  survey: true
```

#### Set Variable Node (`SetVariable`)

Assigns a value to a topic-scoped or global variable.

```yaml
- kind: SetVariable
  variable: Topic.AttemptCount
  value: "=Topic.AttemptCount + 1"
```

#### Generative Answers Node (`GenerativeAnswers`)

Uses Azure OpenAI to generate a response grounded in configured knowledge sources. This is the core of generative AI orchestration in Copilot Studio.

```yaml
- kind: GenerativeAnswers
  variable: Topic.AIResponse
  systemMessage: >
    You are a helpful assistant for Contoso's IT department.
    Answer questions about password resets, VPN setup, and software requests.
    Only use information from the provided knowledge sources.
    If you cannot find an answer, say "I don't have that information"
    and offer to connect the user with a human agent.
  knowledgeSources:
    - kind: SharePointSource
      siteUrl: "https://contoso.sharepoint.com/sites/ITKnowledgeBase"
    - kind: WebsiteSource
      urls:
        - "https://support.contoso.com/faq"
    - kind: DocumentSource
      documentIds: ["<guid>"]
  contentModeration:
    enabled: true
    blockHarmfulContent: true
  fallback:
    kind: RedirectToTopic
    topicName: "Escalate"
```

### Entities

Entities are data types that the bot recognizes in user input. They enable the bot to extract structured information from natural language.

**Prebuilt entities**: Provided by the platform — string, boolean, number, date/time, email, phone, city, zip code, URL, person name, and more.

**Custom entities**:
- **Closed-list**: A fixed set of values with synonyms (e.g., `Department`: IT, HR, Finance, Marketing).
- **Regex**: Pattern-based extraction (e.g., ticket number: `TICK-\d{6}`).

### Variables

Variables store data within a conversation. They are scoped to topics or globally across the bot.

**Topic variables** (`Topic.VariableName`): Scoped to a single topic. Reset when the topic ends. Used for collecting user input and intermediate values within a topic.

**Global variables** (`Global.VariableName`): Persist across topic boundaries for the entire conversation session. Used for user identity, preferences, and shared state.

**System variables** (`System.User.FirstName`, `System.Conversation.Id`, etc.): Read-only variables populated by the platform.

## Dataverse Web API Endpoints

All bot management operations use the Dataverse Web API. Base URL: `{DATAVERSE_URL}/api/data/v9.2/`.

### Bot CRUD

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List bots | GET | `/bots` |
| Get bot | GET | `/bots(<botid>)` |
| Create bot | POST | `/bots` |
| Update bot | PATCH | `/bots(<botid>)` |
| Delete bot | DELETE | `/bots(<botid>)` |
| Publish bot | POST | `/bots(<botid>)/Microsoft.Dynamics.CRM.PublishBot` |

### Bot Components (Topics, Entities, Variables)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List components | GET | `/botcomponents?$filter=_parentbotid_value eq '<botid>'` |
| Get component | GET | `/botcomponents(<componentid>)` |
| Create component | POST | `/botcomponents` |
| Update component | PATCH | `/botcomponents(<componentid>)` |
| Delete component | DELETE | `/botcomponents(<componentid>)` |

**Component types** (`componenttype` field):
| Value | Type |
|-------|------|
| 0 | Topic |
| 1 | Skill topic |
| 2 | Entity |
| 3 | Variable |
| 4 | Channel configuration |
| 5 | Language |
| 6 | Bot setting |

### Useful OData Queries

```bash
# List all topics for a bot
GET /botcomponents?$filter=_parentbotid_value eq '<botid>' and componenttype eq 0

# Get a specific topic by name
GET /botcomponents?$filter=_parentbotid_value eq '<botid>' and name eq 'Password Reset'

# Get all bots in the environment
GET /bots?$select=botid,name,description,publishedon,statecode

# Get bot with its components expanded
GET /bots(<botid>)?$expand=bot_botcomponent($select=name,componenttype)
```

## Direct Line API for Testing

The Direct Line API provides a REST-based interface for testing bot conversations outside of a channel.

**Base URL**: `https://directline.botframework.com/v3/directline/`

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Generate token | POST | `/tokens/generate` |
| Refresh token | POST | `/tokens/refresh` |
| Start conversation | POST | `/conversations` |
| Send activity | POST | `/conversations/{id}/activities` |
| Get activities | GET | `/conversations/{id}/activities` |
| Upload attachment | POST | `/conversations/{id}/upload` |

**Authentication**: Use the Direct Line secret (from channel config) in the `Authorization: Bearer` header. For production, exchange the secret for a short-lived token using `/tokens/generate`.

**Activity format**:
```json
{
  "type": "message",
  "from": { "id": "user-id", "name": "User Name" },
  "text": "Hello, I need help with my password"
}
```

## Generative AI Orchestration

Copilot Studio integrates Azure OpenAI for generative AI capabilities:

### Generative Answers

- Automatically generate responses from uploaded knowledge sources (SharePoint, websites, documents).
- Responses are grounded in the provided content — the AI cites sources.
- Configure a system message to define the bot's persona, scope, and boundaries.
- Content moderation filters block harmful, offensive, or off-topic content.

### Generative Actions (Plugin Actions)

- The bot can dynamically select and invoke Power Automate flows or connectors based on the user's intent.
- No explicit topic mapping is needed — the AI determines which action to call based on the action's description.
- Configure allowed actions to limit what the AI can invoke.

### Knowledge Sources

| Source Type | Description | Best For |
|-------------|-------------|----------|
| SharePoint sites | Index content from SharePoint sites and document libraries | Internal knowledge bases, policy documents |
| Uploaded documents | PDF, Word, PowerPoint files uploaded directly | Quick FAQ setup, product manuals |
| Website URLs | Crawl and index web pages | Public FAQs, support documentation |
| Dataverse tables | Query Dataverse data for dynamic answers | Employee directories, inventory lookups |

### Safety Configuration

- **Content moderation**: Enable or disable. Controls whether the AI filters harmful content.
- **Scope restriction**: Define what topics the AI can and cannot discuss via the system message.
- **Citation requirement**: When enabled, the AI must cite the knowledge source for each answer.
- **Fallback behavior**: Define what happens when the AI cannot produce a confident answer (escalate, redirect, or show a default message).

## Channel Deployment

### Microsoft Teams

The most common channel for internal bots. Deployment options:
- **Personal chat**: Users interact with the bot in a 1:1 chat.
- **Team channel**: Bot responds to @mentions in a team channel.
- **Group chat**: Bot participates in group conversations.

Requires a Teams app manifest (`manifest.json`) packaged as a ZIP with icons. Upload via Teams Admin Center or Microsoft Graph API.

### Web Widget

Embed the bot on any website using the Bot Framework Web Chat component. Provides:
- Customizable styling (colors, avatar, layout).
- Responsive design for mobile and desktop.
- Support for rich cards, adaptive cards, and suggested actions.

### Custom Direct Line

For integrations beyond Teams and web:
- Mobile apps (iOS, Android) via Direct Line SDK.
- Kiosk applications.
- Voice interfaces (integrate with Azure Speech Services).
- Third-party messaging platforms (via custom middleware).

### Facebook, Slack, and Others

Copilot Studio supports additional channels through the Bot Framework channel registration. Configure in the Azure Bot resource associated with the Copilot Studio bot.

## Best Practices for Small Team Bots

### Topic Design

- **Start small**: Begin with 5-10 high-impact topics that address the most common user questions. Expand based on conversation analytics.
- **Modular topics**: Keep topics focused on a single intent. Use `RedirectToTopic` to chain related topics.
- **Consistent naming**: Use a `Category - Action` naming pattern (e.g., `IT - Password Reset`, `HR - Leave Request`, `Office - Room Booking`).
- **Fallback strategy**: Always customize the fallback topic with a helpful message that lists what the bot can do, rather than the generic "I didn't understand."

### Trigger Phrases

- **Quality over quantity**: 8-15 well-crafted trigger phrases outperform 30 poorly written ones.
- **Avoid overlap**: Ensure no two topics share highly similar trigger phrases.
- **Test coverage**: After authoring triggers, test with 5-10 messages that a real user might type. Include typos and informal language.
- **Iterate from analytics**: Review the "unrecognized" sessions in Copilot Studio analytics to discover missing trigger phrases.

### Conversation Flow

- **Keep flows short**: Aim for 3-5 nodes per topic. If a flow exceeds 8-10 nodes, consider splitting into subtopics.
- **Always provide an exit**: Every question node should have a way to cancel, go back, or escalate.
- **Confirm before acting**: For destructive or irreversible actions (deleting data, submitting requests), add a confirmation question node.
- **Handle errors gracefully**: Wrap action nodes with condition checks for failure responses.

### Generative AI

- **Start with structured topics**: Build key topics with explicit conversation flows first. Add generative AI for long-tail questions that do not justify a dedicated topic.
- **Constrain the AI**: Write a clear system message that limits the AI's scope. A narrow, focused AI produces better answers than a broad one.
- **Curate knowledge sources**: Only index high-quality, up-to-date content. Outdated documents produce outdated answers.
- **Monitor AI answers**: Review generative answer sessions regularly. Promote frequently asked AI questions to dedicated structured topics for better control.

### Maintenance

- **Review analytics weekly**: Check topic triggering accuracy, escalation rate, and session completion rate.
- **Version topics**: Use Dataverse solutions to version and promote bots between environments (dev, test, production).
- **Document topics**: Maintain a simple spreadsheet or list mapping each topic to its owner, last-updated date, and status.
- **Assign topic owners**: In a small team, assign 1-2 people per topic area (IT topics to IT admin, HR topics to HR lead).

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Topic structure, trigger phrases, entity types, slot filling, topic chaining, fallback, escalation | [`references/topics-trigger-phrases.md`](./references/topics-trigger-phrases.md) |
| Generative AI orchestration, knowledge sources, system messages, safety settings, citations | [`references/generative-ai-orchestration.md`](./references/generative-ai-orchestration.md) |
| Teams deployment, web chat embedding, Direct Line API, custom channels, mobile SDK, IVR | [`references/channel-integration.md`](./references/channel-integration.md) |
| Test bot canvas, transcript analysis, CSAT, session metrics API, topic analytics, Power BI | [`references/testing-analytics.md`](./references/testing-analytics.md) |
