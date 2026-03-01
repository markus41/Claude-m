---
name: bot-test-conversation
description: "Test a bot conversation flow with sample inputs"
argument-hint: "<bot-id> --message <test-message> [--topic <topic-name>]"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# Test a Bot Conversation

Test a Copilot Studio bot conversation flow using the Direct Line API. Send sample messages, observe topic routing, and validate that the bot responds correctly.

## Instructions

### 1. Obtain Direct Line Token

First, retrieve the bot's Direct Line secret from the bot's channel configuration in Dataverse:

```bash
# Get the bot's web channel configuration
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" \
  "${DATAVERSE_URL}/api/data/v9.2/botcomponents?\$filter=_parentbotid_value eq '${BOT_ID}' and componenttype eq 4" \
  | jq '.value[0].content' -r
```

Then exchange the Direct Line secret for a token:

```bash
DL_SECRET="<direct-line-secret>"

DL_TOKEN=$(curl -s -X POST \
  "https://directline.botframework.com/v3/directline/tokens/generate" \
  -H "Authorization: Bearer ${DL_SECRET}" \
  -H "Content-Type: application/json" \
  | jq -r '.token')

echo "Direct Line token: ${DL_TOKEN}"
```

### 2. Start a Conversation

Create a new conversation session:

```bash
CONVERSATION=$(curl -s -X POST \
  "https://directline.botframework.com/v3/directline/conversations" \
  -H "Authorization: Bearer ${DL_TOKEN}" \
  -H "Content-Type: application/json")

CONVERSATION_ID=$(echo "${CONVERSATION}" | jq -r '.conversationId')
STREAM_URL=$(echo "${CONVERSATION}" | jq -r '.streamUrl')

echo "Conversation ID: ${CONVERSATION_ID}"
```

### 3. Send a Test Message

Post the user's test message to the conversation:

```bash
TEST_MESSAGE="<test-message>"

curl -s -X POST \
  "https://directline.botframework.com/v3/directline/conversations/${CONVERSATION_ID}/activities" \
  -H "Authorization: Bearer ${DL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"message\",
    \"from\": { \"id\": \"test-user\", \"name\": \"Test User\" },
    \"text\": \"${TEST_MESSAGE}\"
  }" | jq '.'
```

### 4. Retrieve Bot Response

Poll for the bot's response activities. The bot may take 1-3 seconds to process and respond:

```bash
# Wait briefly for the bot to process
sleep 2

# Retrieve activities (bot responses come after the user message)
ACTIVITIES=$(curl -s \
  "https://directline.botframework.com/v3/directline/conversations/${CONVERSATION_ID}/activities" \
  -H "Authorization: Bearer ${DL_TOKEN}" \
  -H "Accept: application/json")

# Display the conversation flow
echo "${ACTIVITIES}" | jq '.activities[] | {
  from: .from.name,
  type: .type,
  text: .text,
  timestamp: .timestamp,
  suggestedActions: .suggestedActions
}'
```

### 5. Validate Topic Routing

When `--topic` is specified, verify that the bot routed to the expected topic:

- Check the bot's response activities for the expected greeting or first message of the target topic.
- Look for `channelData` in the response that may contain topic metadata:

```bash
echo "${ACTIVITIES}" | jq '.activities[] | select(.from.name != "Test User") | {
  text: .text,
  channelData: .channelData,
  inputHint: .inputHint
}'
```

**Expected behavior**:
- If the correct topic is triggered, the bot's first response should match the topic's initial `SendMessage` node.
- If the fallback topic is triggered instead, the trigger phrases may need refinement (too generic or missing coverage for the test message).

### 6. Multi-Turn Conversation Test

For topics with question nodes, continue the conversation by sending follow-up messages that answer the bot's prompts:

```bash
# Send follow-up response to a question node
FOLLOW_UP="user@company.com"

curl -s -X POST \
  "https://directline.botframework.com/v3/directline/conversations/${CONVERSATION_ID}/activities" \
  -H "Authorization: Bearer ${DL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"message\",
    \"from\": { \"id\": \"test-user\", \"name\": \"Test User\" },
    \"text\": \"${FOLLOW_UP}\"
  }" | jq '.'

sleep 2

# Get updated conversation activities
curl -s \
  "https://directline.botframework.com/v3/directline/conversations/${CONVERSATION_ID}/activities" \
  -H "Authorization: Bearer ${DL_TOKEN}" \
  | jq '.activities[] | {from: .from.name, text: .text}'
```

### 7. Interpret Results

Display a summary of the test conversation:

```
## Conversation Test Results

**Bot ID**: <bot-id>
**Test Message**: "<test-message>"
**Expected Topic**: <topic-name> (if specified)
**Actual Topic**: <detected from response>
**Match**: YES / NO

### Conversation Flow
1. [User]: <test-message>
2. [Bot]: <first response>
3. [User]: <follow-up if any>
4. [Bot]: <second response>

### Observations
- Topic routing: [Correct / Incorrect / Fallback triggered]
- Response quality: [Relevant / Off-topic / Generic]
- Entity extraction: [Success / Failed / N/A]
- Conversation completion: [Reached end / Stuck / Error]
```

### Common Test Scenarios

| Scenario | What to Test | Expected Behavior |
|----------|-------------|-------------------|
| Happy path | Send a clear trigger phrase | Bot enters the correct topic and completes the flow |
| Ambiguous input | Send a message that could match multiple topics | Bot picks the most relevant topic or asks for clarification |
| Out of scope | Send a message unrelated to any topic | Bot triggers fallback topic gracefully |
| Entity extraction | Send a message with an entity value (email, date, number) | Bot extracts the entity and stores it in the correct variable |
| Escalation | Say "talk to a person" or "human agent" | Bot triggers escalation topic |
| Typos and misspellings | Send a trigger phrase with typos | Bot still routes to the correct topic (NLU tolerance) |
