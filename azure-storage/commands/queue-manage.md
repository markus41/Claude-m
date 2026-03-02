---
name: queue-manage
description: "Create queues, send and receive messages, configure poison message handling and visibility timeout"
argument-hint: "<create|send|receive|peek|delete> [--queue <name>] [--message <text>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Queue Management

Manage Azure Queue Storage queues and messages via Azure CLI and Node.js SDK.

## Instructions

### 1. Parse the Request

- `<action>` -- One of: `create`, `send`, `receive`, `peek`, `delete`. Ask if not provided.
- `--queue` -- Queue name (3-63 chars, lowercase letters, numbers, hyphens). Ask if not provided.
- `--message` -- Message text (for send). Ask if not provided for send.
- `--count` -- Number of messages to receive/peek (default: 1, max: 32).
- `--visibility` -- Visibility timeout in seconds (for receive, default: 30).

### 2. Create Queue

**Azure CLI**:
```bash
az storage queue create \
  --account-name <storage-name> \
  --name <queue-name> \
  --auth-mode login
```

**Node.js SDK**:
```typescript
import { QueueServiceClient } from "@azure/storage-queue";
import { DefaultAzureCredential } from "@azure/identity";

const queueService = new QueueServiceClient(
  `https://${accountName}.queue.core.windows.net`,
  new DefaultAzureCredential()
);
const queueClient = queueService.getQueueClient(queueName);
await queueClient.create();
```

### 3. Send Message

**Azure CLI**:
```bash
az storage message put \
  --account-name <storage-name> \
  --queue-name <queue-name> \
  --content "<message-text>" \
  --auth-mode login \
  --time-to-live 604800   # 7 days (default)
```

**Node.js SDK**:
```typescript
// Send a plain text message
await queueClient.sendMessage("Process order #12345");

// Send a JSON payload (base64 encoded automatically)
const payload = JSON.stringify({ orderId: 12345, action: "process" });
await queueClient.sendMessage(Buffer.from(payload).toString("base64"));

// Send with custom TTL and visibility delay
await queueClient.sendMessage("Delayed task", {
  visibilityTimeout: 60,           // Hidden for 60 seconds
  messageTimeToLive: 60 * 60 * 24, // Expires in 24 hours
});
```

### 4. Receive Messages

**Azure CLI**:
```bash
az storage message get \
  --account-name <storage-name> \
  --queue-name <queue-name> \
  --auth-mode login \
  --num-messages 1 \
  --visibility-timeout 30
```

**Node.js SDK**:
```typescript
// Receive and process messages
const response = await queueClient.receiveMessages({
  numberOfMessages: 5,
  visibilityTimeout: 30, // seconds before message becomes visible again
});

for (const message of response.receivedMessageItems) {
  console.log(`ID: ${message.messageId}`);
  console.log(`Body: ${message.messageText}`);
  console.log(`Dequeue count: ${message.dequeueCount}`);

  // Process the message...
  await processMessage(message.messageText);

  // Delete after successful processing
  await queueClient.deleteMessage(message.messageId, message.popReceipt);
}
```

### 5. Peek Messages

Peek reads messages without making them invisible to other consumers.

**Azure CLI**:
```bash
az storage message peek \
  --account-name <storage-name> \
  --queue-name <queue-name> \
  --auth-mode login \
  --num-messages 5
```

**Node.js SDK**:
```typescript
const peeked = await queueClient.peekMessages({ numberOfMessages: 5 });
for (const msg of peeked.peekedMessageItems) {
  console.log(`${msg.messageId}: ${msg.messageText} (dequeued ${msg.dequeueCount} times)`);
}
```

### 6. Poison Message Handling

Messages that fail processing repeatedly should be moved to a poison queue.

```typescript
const POISON_THRESHOLD = 5;
const poisonQueueClient = queueService.getQueueClient(`${queueName}-poison`);
await poisonQueueClient.createIfNotExists();

const response = await queueClient.receiveMessages({ numberOfMessages: 5, visibilityTimeout: 30 });

for (const message of response.receivedMessageItems) {
  if (message.dequeueCount >= POISON_THRESHOLD) {
    // Move to poison queue
    await poisonQueueClient.sendMessage(message.messageText);
    await queueClient.deleteMessage(message.messageId, message.popReceipt);
    console.warn(`Moved message ${message.messageId} to poison queue (dequeued ${message.dequeueCount} times)`);
    continue;
  }

  try {
    await processMessage(message.messageText);
    await queueClient.deleteMessage(message.messageId, message.popReceipt);
  } catch (error) {
    console.error(`Failed to process message ${message.messageId}:`, error);
    // Message becomes visible again after visibility timeout
  }
}
```

### 7. Delete Queue

**Azure CLI**:
```bash
az storage queue delete \
  --account-name <storage-name> \
  --name <queue-name> \
  --auth-mode login
```

### 8. Display Summary

Show the user:
- Action performed and result
- Queue name and message details
- Poison message handling recommendation if sending/receiving
- Comparison note: Queue Storage for simple messaging; Service Bus for advanced features (topics, sessions, dead-letter)
