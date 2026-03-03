# Topics and Trigger Phrases Reference

## Overview

Topics are the fundamental building blocks of Copilot Studio bots. Each topic represents a conversational intent — a specific user need or question the bot can address. Topics are composed of trigger phrases (training utterances for the NLU model) and a conversation flow (a directed graph of nodes). This reference covers topic structure, authoring best practices, entity types, slot filling, topic chaining, the fallback topic, and escalation to live agents.

---

## Topic Structure

A topic in Copilot Studio YAML format:

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Password Reset
    triggerQueries:
      - Reset my password
      - I forgot my password
      - Can't sign in to my account
      - How do I change my password
      - My password expired
      - Reset password please
      - Help with password
      - Locked out of my account
      - Account credentials issue
      - Login problem

  actions:
    - kind: SendMessage
      id: greeting
      message: "I can help you reset your password. I'll need to verify your identity first."

    - kind: AskQuestion
      id: askEmail
      prompt: "What is the email address on your account?"
      entity: EmailPrebuiltEntity
      output:
        binding: Topic.UserEmail
      reprompt:
        message: "Please enter a valid email address (example@contoso.com)"
        maxReprompts: 2
      invalidPrompt:
        message: "That doesn't look like a valid email. Please try again."
      noResponse:
        kind: RedirectToTopic
        topicName: Escalate

    - kind: ConditionGroup
      id: checkDomain
      conditions:
        - id: isCorporateDomain
          condition: "endsWith(Topic.UserEmail, '@contoso.com')"
          actions:
            - kind: InvokeAction
              id: callResetFlow
              actionName: ResetPasswordFlow
              inputs:
                email: =Topic.UserEmail
              outputs:
                resetStatus: Topic.ResetStatus
                tempPassword: Topic.TempPassword
        - id: isPersonalDomain
          condition: "endsWith(Topic.UserEmail, '@gmail.com') || endsWith(Topic.UserEmail, '@yahoo.com')"
          actions:
            - kind: SendMessage
              id: personalDomainMsg
              message: "I can only reset corporate passwords. For personal accounts, please use the provider's self-service reset."
            - kind: EndConversation
              id: end1
              survey: false
      elseActions:
        - kind: SendMessage
          id: unknownDomainMsg
          message: "I don't recognize that domain. Let me connect you with support."
        - kind: RedirectToTopic
          topicName: Escalate

    - kind: ConditionGroup
      id: checkResult
      conditions:
        - id: success
          condition: "Topic.ResetStatus == 'Success'"
          actions:
            - kind: SendMessage
              id: successMsg
              message: "Done! Your temporary password is **{Topic.TempPassword}**. You'll be prompted to change it on first login."
            - kind: EndConversation
              id: endSuccess
              survey: true
      elseActions:
        - kind: SendMessage
          id: failedMsg
          message: "I wasn't able to reset your password automatically. Let me connect you with an agent."
        - kind: RedirectToTopic
          topicName: Escalate
```

---

## Node Types Reference

### Trigger Node (OnRecognizedIntent)

```yaml
kind: OnRecognizedIntent
intent:
  displayName: "Topic Name"
  triggerQueries:
    - "phrase 1"
    - "phrase 2"
```

### Message Node (SendMessage)

```yaml
kind: SendMessage
message: "Plain text message with {Topic.VariableName} interpolation."

# With message variations (bot picks one randomly)
kind: SendMessage
messageVariations:
  - "Sure, I can help with that!"
  - "Absolutely, let me take care of that."
  - "No problem! Here's what to do."

# With rich card
kind: SendMessage
attachments:
  - kind: AdaptiveCard
    content:
      type: AdaptiveCard
      version: "1.5"
      body:
        - type: TextBlock
          text: "Your Request Summary"
          weight: Bolder
      actions:
        - type: Action.OpenUrl
          title: Track Status
          url: "https://portal.contoso.com/track/{Topic.TicketId}"
```

### Question Node (AskQuestion)

```yaml
kind: AskQuestion
prompt: "What is your employee ID?"
entity: StringPrebuiltEntity
output:
  binding: Topic.EmployeeId

# With validation
validations:
  - id: formatCheck
    condition: "matches(Topic.EmployeeId, '^E\\d{6}$')"
    message: "Employee IDs start with 'E' followed by 6 digits (e.g., E123456)."

reprompt:
  maxReprompts: 3
  message: "Let me try again — what's your employee ID?"

noResponse:
  kind: RedirectToTopic
  topicName: Escalate
```

### Condition Node (ConditionGroup)

```yaml
kind: ConditionGroup
conditions:
  - id: highPriority
    condition: "Topic.Priority == 'Critical'"
    actions: [...]
  - id: mediumPriority
    condition: "Topic.Priority == 'High' || Topic.Priority == 'Medium'"
    actions: [...]
elseActions:
  - kind: SendMessage
    message: "I'll add this to the standard queue."
```

### Action Node (InvokeAction)

```yaml
kind: InvokeAction
actionName: CreateITTicket
inputs:
  title: =Topic.IssueTitle
  description: =Topic.IssueDescription
  priority: =Topic.Priority
  requesterEmail: =System.User.Email
outputs:
  ticketNumber: Topic.TicketNumber
  estimatedResolution: Topic.ETA
```

### Redirect Node (RedirectToTopic)

```yaml
kind: RedirectToTopic
topicName: Escalate
# Pass input to the target topic
inputs:
  - name: EscalationReason
    value: =Topic.IssueDescription
```

### Set Variable Node (SetVariable)

```yaml
kind: SetVariable
variable: Topic.AttemptCount
value: "=Topic.AttemptCount + 1"
```

### End Conversation Node

```yaml
kind: EndConversation
survey: true    # Show CSAT survey
# or
survey: false   # End silently
```

---

## Trigger Phrase Best Practices

### Quantity and Quality

| Guideline | Target |
|---|---|
| Minimum trigger phrases per topic | 5 (functional minimum) |
| Recommended trigger phrases per topic | 8–15 |
| Maximum useful trigger phrases | 25 (diminishing returns above this) |

### Diversity Requirements

Include all of the following styles for each topic:

```yaml
# Good: diverse trigger phrase set for "Submit Expense Report"
triggerQueries:
  # Questions
  - "How do I submit an expense report?"
  - "Where do I submit my expenses?"
  # Commands
  - "Submit my expenses"
  - "Expense report help"
  # Statements
  - "I need to file an expense report"
  - "I have receipts to submit"
  # Informal
  - "expenses"
  - "reimburse me"
  - "expense claim"
  # Variations
  - "how to get reimbursed"
  - "claim travel expenses"
  - "upload my receipts"
```

### Anti-Patterns to Avoid

```yaml
# Bad: too generic — will conflict with many topics
triggerQueries:
  - "help"
  - "question"
  - "I need something"

# Bad: too specific — won't match natural variations
triggerQueries:
  - "I need to submit expense report number 42 from last Tuesday for the Chicago trip"

# Bad: overlapping with another topic
# Topic A: "Reset password" and Topic B: "Change password"
# — these are too similar; merge into one topic
```

---

## Entity Types

### Prebuilt Entities

| Entity | YAML Name | Extracts | Example Input |
|---|---|---|---|
| String | `StringPrebuiltEntity` | Any text | "any text here" |
| Boolean | `BooleanPrebuiltEntity` | Yes/no | "yes", "no", "true", "nope" |
| Number | `NumberPrebuiltEntity` | Integers and decimals | "42", "3.14", "one hundred" |
| Date/Time | `DateTimePrebuiltEntity` | Dates and times | "tomorrow", "next Monday", "March 5" |
| Email | `EmailPrebuiltEntity` | Email addresses | "user@contoso.com" |
| URL | `URLPrebuiltEntity` | Web URLs | "https://contoso.com" |
| Phone Number | `PhoneNumberPrebuiltEntity` | Phone numbers | "+1-555-0100" |
| Person Name | `PersonNamePrebuiltEntity` | Names | "John Smith" |
| City | `CityPrebuiltEntity` | City names | "Seattle", "New York" |
| Zip Code | `ZipCodePrebuiltEntity` | Postal codes | "98101" |

### Custom Closed-List Entity

```yaml
kind: Entity
displayName: Department
type: ClosedList
items:
  - id: it
    displayName: IT
    synonyms:
      - Information Technology
      - tech support
      - IT department
      - helpdesk
  - id: hr
    displayName: HR
    synonyms:
      - Human Resources
      - people team
      - personnel
  - id: finance
    displayName: Finance
    synonyms:
      - Accounting
      - accounts
      - payroll
  - id: facilities
    displayName: Facilities
    synonyms:
      - Office management
      - building services
      - maintenance
```

### Custom Regex Entity

```yaml
kind: Entity
displayName: TicketNumber
type: Regex
pattern: "TICK-\\d{6}"
description: "IT ticket number in format TICK-123456"
# Matches: TICK-000042, TICK-987654
```

---

## Slot Filling

Slot filling allows the bot to extract multiple entities from a single user message without asking each question separately.

### Configure Slot Filling

```yaml
kind: AskQuestion
id: collectOrderInfo
prompt: "What would you like to order, and how many?"

# If user says "I'd like 3 widgets"
# Bot extracts: quantity=3, product=widgets simultaneously
slotFilling:
  enabled: true
  slots:
    - id: productSlot
      entity: ProductEntity
      output:
        binding: Topic.ProductName
      prompt: "What product would you like?"
    - id: quantitySlot
      entity: NumberPrebuiltEntity
      output:
        binding: Topic.Quantity
      prompt: "How many units?"
```

When slot filling is enabled, the bot extracts all available entities from the user's message and only asks for missing slots.

---

## Topic Chaining

Use `RedirectToTopic` to create modular, reusable topics.

### Common Reusable Topics to Create

```yaml
# Shared "Collect User Info" topic
# Other topics redirect here to get user's name and email
kind: OnRecognizedIntent
intent:
  displayName: Collect User Info
  triggerQueries: []  # Empty — this topic is called only via redirect

actions:
  - kind: AskQuestion
    id: askName
    prompt: "What's your full name?"
    entity: PersonNamePrebuiltEntity
    output:
      binding: Global.UserFullName

  - kind: AskQuestion
    id: askEmail
    prompt: "What's your email address?"
    entity: EmailPrebuiltEntity
    output:
      binding: Global.UserEmail
```

### Chain to Shared Topic

```yaml
# In any topic that needs user info:
- kind: ConditionGroup
  conditions:
    - condition: "!IsNullOrEmpty(Global.UserEmail)"
      actions:
        - kind: SendMessage
          message: "Using your email: {Global.UserEmail}"
  elseActions:
    - kind: RedirectToTopic
      topicName: Collect User Info
    - kind: SendMessage
      message: "Thanks, {Global.UserFullName}. Continuing with your request..."
```

---

## Fallback Topic

The Fallback topic fires when the NLU cannot match the user's input to any topic with sufficient confidence.

### Best Fallback Topic Design

```yaml
kind: OnUnknownIntent

actions:
  - kind: SendMessage
    id: fallbackGreeting
    message: "I didn't quite understand that."

  - kind: SendMessage
    id: capabilities
    message: |
      Here's what I can help with:
      • **IT Support**: Password resets, VPN setup, software requests
      • **HR**: Leave requests, expense reports, benefits questions
      • **Facilities**: Room bookings, maintenance requests

      Or type **talk to agent** to connect with a person.

  # Optionally attempt generative AI answer for long-tail questions
  - kind: GenerativeAnswers
    id: genAiFallback
    variable: Topic.GenAIResponse
    systemMessage: >
      You are the Contoso internal helpdesk assistant.
      Answer only questions about IT, HR, and facilities.
      If you cannot answer, say "I'll connect you with an agent."

  - kind: ConditionGroup
    conditions:
      - condition: "!IsNullOrEmpty(Topic.GenAIResponse)"
        actions:
          - kind: SendMessage
            message: "=Topic.GenAIResponse"
          - kind: EndConversation
            survey: true
    elseActions:
      - kind: RedirectToTopic
        topicName: Escalate
```

---

## Escalation to Live Agent

### Standard Escalation Topic

```yaml
kind: OnRecognizedIntent
intent:
  displayName: Escalate
  triggerQueries:
    - talk to a person
    - human agent
    - live agent
    - speak to someone
    - connect me with support
    - I want to talk to a human
    - real person please
    - agent

actions:
  - kind: SendMessage
    id: ackEscalation
    message: "No problem, I'm connecting you with a support agent now."

  - kind: InvokeAction
    id: createTicket
    actionName: CreateEscalationTicket
    inputs:
      conversationId: =System.Conversation.Id
      transcript: =System.Conversation.Transcript
      userEmail: =System.User.Email
    outputs:
      queuePosition: Topic.QueuePosition
      estimatedWait: Topic.EstimatedWait

  - kind: SendMessage
    id: queueInfo
    message: "You're #{Topic.QueuePosition} in queue. Estimated wait: {Topic.EstimatedWait} minutes."

  # Transfer to agent using channel-specific escalation
  - kind: TransferConversation
    id: handoff
    message: "Transferring you now. Sharing our conversation history with the agent."
    escalationSummary: "User issue: {Topic.LastUserMessage}. Category: {Topic.Category}."
```

### TransferConversation Node

| Property | Description |
|---|---|
| `message` | Message shown to user before transfer |
| `escalationSummary` | Context passed to agent (visible in agent console) |
| `transferTarget` | Queue, team, or individual agent identifier (channel-specific) |

---

## Error Codes and Conditions

| Condition | Meaning | Remediation |
|---|---|---|
| Topic never triggers despite matching input | Trigger phrases conflict with higher-confidence topic | Review topic trigger phrase overlap; use Test bot to see matched topic |
| `AskQuestion` reprompts indefinitely | No `noResponse` configured; `maxReprompts` not set | Add `noResponse` with redirect to escalate or end |
| `InvokeAction` fails silently | Flow action returned an error; no output variable check | Check Power Automate flow run history; add condition checking for empty output |
| Slot filling captures wrong entity | Entity boundaries overlap with adjacent text | Narrow entity patterns; test with verbose mode in test canvas |
| Fallback topic fires too often | Not enough trigger phrases; NLU confidence threshold too low | Add more diverse trigger phrases; consider lowering required confidence |
| `RedirectToTopic` causes loop | Topic A redirects to Topic B which redirects to Topic A | Review redirect chains; add depth counter variable |
| Variable value empty after question | User's answer not recognized by entity | Verify entity type matches expected input format; add fallback entity `StringPrebuiltEntity` |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Topics per bot | 1,000 | Hard limit |
| Trigger phrases per topic | 10,000 | Practical: 8–25 for reliable NLU |
| Nodes per topic flow | 500 | Performance degrades above ~100 nodes; split to subtopics |
| Entities per bot | 500 | Includes prebuilt + custom |
| Closed-list entity items | 20,000 | Per entity |
| Regex entity pattern length | No hard limit | Keep patterns simple |
| Global variables per bot | 128 | Stored in conversation session |
| Topic variables | No hard limit | Scoped to single topic execution |
| Reprompt max count | Configurable | No platform limit; practical: 3 |
