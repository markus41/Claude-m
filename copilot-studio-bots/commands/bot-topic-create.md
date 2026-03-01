---
name: bot-topic-create
description: "Create a new topic for a Copilot Studio bot"
argument-hint: "<bot-id> --name <topic-name> --triggers <phrase1,phrase2,phrase3> [--ai-enabled]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Create a Bot Topic

Create a new topic definition for a Copilot Studio bot with trigger phrases, conversation nodes, and optional generative AI orchestration.

## Instructions

### 1. Validate Inputs

- `<bot-id>` — The GUID of the target bot (from `GET /api/data/v9.2/bots`).
- `--name` — Human-readable topic name (e.g., `IT - Password Reset`, `HR - Leave Balance`).
- `--triggers` — Comma-separated trigger phrases. Minimum 5 recommended for reliable intent matching.
- `--ai-enabled` — When set, include a generative AI (GPT) answer node in the conversation flow.

### 2. Author Trigger Phrases

Generate a diverse set of trigger phrases based on the user-provided seeds. For each seed phrase, produce variations that cover:

- **Synonyms**: Replace key verbs/nouns with synonyms (e.g., "reset password" / "change password" / "update password").
- **Sentence structures**: Mix questions ("How do I reset my password?"), commands ("Reset my password"), and statements ("I need to reset my password").
- **Formality levels**: Include both formal ("I would like to request a password reset") and informal ("can't log in, need new password").
- **Short and long**: Include both terse (2-3 words) and descriptive (5-10 words) variants.

Aim for 8-15 trigger phrases per topic for optimal intent matching.

### 3. Build the Topic Definition

Construct the topic as a bot component using the Dataverse Web API.

**Endpoint**: `POST {DATAVERSE_URL}/api/data/v9.2/botcomponents`

**Request body**:
```json
{
  "name": "<topic-name>",
  "componenttype": 1,
  "schemaname": "new_topic_<sanitized_name>",
  "category": 0,
  "content": "<topic-YAML-as-string>",
  "_parentbotid_value": "<bot-id>"
}
```

The `content` field contains the topic definition in YAML format (serialized as a JSON string). Structure it as follows:

```yaml
kind: AdaptiveDialog
modelDescription: "<brief description of what this topic does>"
triggers:
  - kind: OnRecognizedIntent
    intent: <topic-intent-name>
    triggerQueries:
      - "How do I reset my password?"
      - "Reset my password"
      - "I need to change my password"
      - "Can't log in, need new password"
      - "Password reset help"
      - "I forgot my password"
      - "Update my login credentials"
      - "Help me change my password"
    actions:
      - kind: SendMessage
        message: "I can help you with that! Let me walk you through the process."

      - kind: AskQuestion
        variable: Topic.UserEmail
        prompt: "What is your email address associated with the account?"
        entity: StringPrebuiltEntity
        validations:
          - condition: "contains(Topic.UserEmail, '@')"
            message: "That doesn't look like a valid email address. Please enter your work email."

      - kind: AskQuestion
        variable: Topic.ConfirmReset
        prompt: "I'll send a password reset link to {Topic.UserEmail}. Would you like to proceed?"
        entity: BooleanPrebuiltEntity
        choices:
          - value: true
            synonyms: ["yes", "yeah", "sure", "go ahead", "please"]
          - value: false
            synonyms: ["no", "nope", "cancel", "never mind"]

      - kind: ConditionGroup
        conditions:
          - condition: "Topic.ConfirmReset = true"
            actions:
              - kind: InvokeAction
                actionName: "SendPasswordResetEmail"
                inputs:
                  email: "=Topic.UserEmail"
              - kind: SendMessage
                message: "Done! A password reset link has been sent to {Topic.UserEmail}. It expires in 24 hours."
              - kind: EndConversation
          - condition: "Topic.ConfirmReset = false"
            actions:
              - kind: SendMessage
                message: "No problem. Let me know if there's anything else I can help with."
              - kind: RedirectToTopic
                topicName: "End of Conversation"
```

### 4. Add Generative AI Node (when --ai-enabled)

When `--ai-enabled` is set, insert a generative answers node into the conversation flow. This node uses Azure OpenAI to generate responses grounded in configured knowledge sources.

Insert the following node after the initial message and before structured question nodes:

```yaml
      - kind: GenerativeAnswers
        variable: Topic.AIResponse
        systemMessage: >
          You are a helpful IT support assistant for a small company.
          Only answer questions related to IT support, password resets,
          and account access. If you are unsure, say so and offer to
          connect the user with a human agent. Do not make up information.
        knowledgeSources:
          - kind: SharePointSource
            siteUrl: "https://contoso.sharepoint.com/sites/ITKnowledgeBase"
          - kind: DocumentSource
            documentIds: ["<document-guid>"]
        contentModeration:
          enabled: true
          blockHarmfulContent: true
        fallback:
          kind: RedirectToTopic
          topicName: "Escalate"
```

### 5. Associate Topic with Bot

After creating the bot component, associate it with the bot using:

```
POST {DATAVERSE_URL}/api/data/v9.2/botcomponent_parent_bot/$ref
```

Request body:
```json
{
  "@odata.id": "{DATAVERSE_URL}/api/data/v9.2/bots(<bot-id>)"
}
```

### 6. Verify Topic Creation

Retrieve the topic to confirm it was created:

```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" \
  "${DATAVERSE_URL}/api/data/v9.2/botcomponents?\$filter=_parentbotid_value eq '${BOT_ID}' and name eq '${TOPIC_NAME}'" \
  | jq '.value[0] | {botcomponentid, name, componenttype, createdon}'
```

### Node Type Reference

Use these node types when building conversation flows:

| Node Kind | Purpose | Key Properties |
|-----------|---------|----------------|
| `SendMessage` | Display a message to the user | `message` (supports variable interpolation) |
| `AskQuestion` | Prompt user for input and store in a variable | `variable`, `prompt`, `entity`, `validations` |
| `ConditionGroup` | Branch based on conditions | `conditions[]` with `condition` and `actions` |
| `InvokeAction` | Call a Power Automate flow or connector | `actionName`, `inputs`, `outputs` |
| `RedirectToTopic` | Hand off to another topic | `topicName` |
| `EndConversation` | End the conversation | (none) |
| `GenerativeAnswers` | AI-generated response from knowledge sources | `systemMessage`, `knowledgeSources`, `fallback` |
| `SetVariable` | Assign a value to a variable | `variable`, `value` |
