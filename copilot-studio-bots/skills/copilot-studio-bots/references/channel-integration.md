# Channel Integration Reference

## Overview

Copilot Studio bots can be deployed across multiple channels — Microsoft Teams, web chat embedded on websites, Direct Line API for custom integrations, and telephony/IVR systems. Each channel has specific configuration requirements, capability constraints, and adaptive card versions it supports. This reference covers Teams deployment, web chat embedding, Direct Line API usage, custom channel configuration via Azure Bot Service, mobile SDK, and IVR/telephony integration.

---

## Microsoft Teams Channel

### Deployment Options

| Deployment Type | Audience | Description |
|---|---|---|
| Personal app (1:1 chat) | Individual users | Bot appears in Teams left rail; users interact in private chat |
| Team channel | Channel members | Bot responds to @mentions in a public or private channel |
| Group chat | Chat participants | Bot participates in ad-hoc group conversations |
| Messaging extension | All users | Bot appears in compose box for triggering searches |

### Teams App Manifest

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.17/MicrosoftTeams.schema.json",
  "manifestVersion": "1.17",
  "version": "1.0.0",
  "id": "{bot-app-id}",
  "packageName": "com.contoso.helpdesk-bot",
  "name": {
    "short": "IT Helpdesk",
    "full": "Contoso IT Helpdesk Bot"
  },
  "description": {
    "short": "Get IT help instantly",
    "full": "Ask questions about passwords, VPN, software, and hardware. Get instant answers from the Contoso IT knowledge base."
  },
  "icons": {
    "color": "color-192.png",
    "outline": "outline-32.png"
  },
  "accentColor": "#0078d4",
  "bots": [
    {
      "botId": "{bot-app-id}",
      "scopes": ["personal", "team", "groupchat"],
      "commandLists": [
        {
          "scopes": ["personal", "groupchat"],
          "commands": [
            { "title": "Help", "description": "Show what I can do" },
            { "title": "Reset Password", "description": "Start password reset flow" },
            { "title": "Submit Ticket", "description": "Create a new IT ticket" }
          ]
        }
      ],
      "supportsFiles": false,
      "isNotificationOnly": false
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": [
    "*.botframework.com",
    "token.botframework.com",
    "contoso.powerva.microsoft.com"
  ]
}
```

### Upload to Teams Admin Center

```powershell
# Via PowerShell (Teams module)
New-TeamsApp -DistributionMethod OrganizationCatalog -Path ./contoso-helpdesk-bot.zip

# Or via Teams Admin Center UI:
# Teams apps → Manage apps → Upload → Upload app file (.zip)
```

### Publish via Microsoft Graph

```json
POST https://graph.microsoft.com/v1.0/appCatalogs/teamsApps
Content-Type: application/zip
Authorization: Bearer <token>

[Binary ZIP content of the app package]
```

**Required permissions**: `AppCatalog.ReadWrite.All` (admin-restricted)

### Teams-Specific Adaptive Cards

Teams supports Adaptive Card schema version up to 1.5. Newer schema features (version 1.6+) are not rendered.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "IT Ticket #{Topic.TicketNumber} Created",
      "weight": "Bolder",
      "size": "Large",
      "color": "Accent"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Status", "value": "Open" },
        { "title": "Priority", "value": "{Topic.Priority}" },
        { "title": "Category", "value": "{Topic.Category}" },
        { "title": "ETA", "value": "{Topic.ETA}" }
      ]
    },
    {
      "type": "ActionSet",
      "actions": [
        {
          "type": "Action.OpenUrl",
          "title": "View in Portal",
          "url": "https://portal.contoso.com/tickets/{Topic.TicketNumber}"
        },
        {
          "type": "Action.Submit",
          "title": "Add Comment",
          "data": { "action": "addComment", "ticketId": "{Topic.TicketId}" }
        }
      ]
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
}
```

### Proactive Messages in Teams

Send proactive messages (notifications) to users without them initiating a conversation.

```json
// Power Automate flow: Post message as bot to Teams
POST /teams/{teamId}/channels/{channelId}/messages
{
  "body": {
    "contentType": "html",
    "content": "<at id=\"0\">{user}</at> Your ticket <b>INC-2026-0042</b> has been resolved."
  },
  "mentions": [
    {
      "id": 0,
      "mentionText": "{user-display-name}",
      "mentioned": {
        "user": {
          "id": "{user-aad-id}",
          "displayName": "{user-display-name}",
          "userIdentityType": "aadUser"
        }
      }
    }
  ]
}
```

---

## Web Chat Embedding

### Embed Code (Minimal)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Chat</title>
  <style>
    #chatWidget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 600px;
      border: none;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.2);
      z-index: 9999;
    }
  </style>
</head>
<body>
  <!-- Copilot Studio Web Chat embed -->
  <iframe
    id="chatWidget"
    src="https://web.powerva.microsoft.com/environments/{environment-id}/bots/{bot-id}/webchat"
    allow="microphone;"
    title="IT Helpdesk Chat">
  </iframe>
</body>
</html>
```

### Custom Web Chat with Bot Framework Web Chat Component

For full UI customization, use the Bot Framework Web Chat NPM package.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contoso Support</title>
  <script src="https://cdn.botframework.com/botframework-webchat/latest/webchat.js"></script>
  <style>
    #webchat { height: 600px; width: 400px; }
  </style>
</head>
<body>
  <div id="webchat" role="main"></div>

  <script>
    const BOT_TOKEN_ENDPOINT = 'https://contoso.com/api/bot-token';

    async function initializeWebChat() {
      // Fetch a short-lived Direct Line token from your server
      // (Never expose the Direct Line secret in client-side code)
      const response = await fetch(BOT_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-' + Math.random().toString(36).substr(2) })
      });
      const { token } = await response.json();

      const directLine = window.WebChat.createDirectLine({ token });

      window.WebChat.renderWebChat(
        {
          directLine,
          userID: 'user123',
          username: 'Portal User',
          locale: 'en-US',
          styleOptions: {
            primaryFont: "'Segoe UI', sans-serif",
            accent: '#0078d4',
            botAvatarImage: 'https://contoso.com/assets/bot-avatar.png',
            botAvatarInitials: 'IT',
            userAvatarImage: '',
            bubbleBorderRadius: 8,
            sendBoxHeight: 48
          }
        },
        document.getElementById('webchat')
      );

      // Send initial greeting to start the conversation
      directLine.postActivity({
        type: 'event',
        name: 'startConversation',
        from: { id: 'user123' }
      }).subscribe();
    }

    initializeWebChat();
  </script>
</body>
</html>
```

---

## Direct Line API

Direct Line provides a REST API for building custom channel integrations.

**Base URL**: `https://directline.botframework.com/v3/directline/`

### Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Generate token from secret | POST | `/tokens/generate` |
| Refresh token | POST | `/tokens/refresh` |
| Start conversation | POST | `/conversations` |
| Send activity | POST | `/conversations/{conversationId}/activities` |
| Get activities (polling) | GET | `/conversations/{conversationId}/activities?watermark={watermark}` |
| Upload attachment | POST | `/conversations/{conversationId}/upload` |

### Token Generation (Server-Side — Never Expose Secret to Client)

```javascript
// Node.js — server-side token exchange
const axios = require('axios');

app.post('/api/bot-token', async (req, res) => {
  const DIRECT_LINE_SECRET = process.env.DIRECT_LINE_SECRET;

  try {
    const response = await axios.post(
      'https://directline.botframework.com/v3/directline/tokens/generate',
      {},
      {
        headers: {
          'Authorization': `Bearer ${DIRECT_LINE_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ token: response.data.token });
  } catch (err) {
    res.status(500).json({ error: 'Token generation failed' });
  }
});
```

### Start Conversation and Send Message

```javascript
// Start a Direct Line conversation
const startResp = await fetch('https://directline.botframework.com/v3/directline/conversations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${directLineToken}`,
    'Content-Type': 'application/json'
  }
});
const { conversationId, streamUrl } = await startResp.json();

// Send a user message
await fetch(`https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${directLineToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'message',
    from: { id: 'user-123', name: 'Test User' },
    text: 'Reset my password'
  })
});

// Poll for bot responses
const activitiesResp = await fetch(
  `https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities?watermark=0`,
  { headers: { 'Authorization': `Bearer ${directLineToken}` } }
);
const { activities, watermark } = await activitiesResp.json();
const botActivities = activities.filter(a => a.from.role === 'bot');
```

### WebSocket Streaming (Real-Time)

```javascript
const socket = new WebSocket(streamUrl);

socket.onmessage = (event) => {
  const { activities } = JSON.parse(event.data);
  activities
    .filter(a => a.from.role === 'bot')
    .forEach(activity => {
      console.log('Bot:', activity.text);
      if (activity.attachments) {
        activity.attachments.forEach(a => console.log('Card:', a));
      }
    });
};
```

---

## Azure Bot Service — Custom Channel Relay

For channels not natively supported by Copilot Studio, create a relay using Azure Bot Service.

### Architecture

```
Custom Channel (WhatsApp, Slack, SMS)
        │  POST messages
        ▼
Azure Function / Azure Bot Service Middleware
        │  Direct Line API
        ▼
Copilot Studio Bot (via Direct Line)
        │  Responses
        ▼
Azure Function → Custom Channel
```

### Azure Function Relay (Node.js)

```javascript
const { BotFrameworkAdapter } = require('botbuilder');
const fetch = require('node-fetch');

// Receive from custom channel
module.exports = async function(context, req) {
  const incomingMessage = req.body;

  // Translate to Bot Framework activity format
  const activity = {
    type: 'message',
    channelId: 'custom',
    serviceUrl: process.env.BOT_SERVICE_URL,
    from: { id: incomingMessage.userId, name: incomingMessage.userName },
    conversation: { id: incomingMessage.conversationId },
    text: incomingMessage.text,
    timestamp: new Date().toISOString()
  };

  // Forward to Copilot Studio via Direct Line
  const dlResp = await fetch(
    `https://directline.botframework.com/v3/directline/conversations/${incomingMessage.conversationId}/activities`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECT_LINE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activity)
    }
  );

  // Poll for response and send back to custom channel
  const botResponse = await getBotResponse(incomingMessage.conversationId);
  await sendToCustomChannel(incomingMessage.userId, botResponse);

  context.res = { status: 200 };
};
```

---

## Mobile SDK

The Bot Framework mobile SDK enables embedding the bot in iOS and Android apps.

### React Native Integration

```javascript
import React, { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';

const BotChat = ({ userId }) => {
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Fetch token from your server
    fetch(`https://api.contoso.com/bot-token?userId=${userId}`)
      .then(r => r.json())
      .then(data => setToken(data.token));
  }, [userId]);

  if (!token) return null;

  const webChatUrl = `https://web.powerva.microsoft.com/webchat?token=${token}&userId=${userId}`;

  return (
    <WebView
      source={{ uri: webChatUrl }}
      style={{ flex: 1 }}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback={true}
    />
  );
};
```

---

## IVR and Telephony Integration

Copilot Studio bots can be connected to voice channels via Azure Communication Services or third-party telephony providers.

### Azure Communication Services (Phone Number)

```json
// Configure telephony channel in Copilot Studio (portal configuration)
// Requires: Azure Communication Services phone number + Azure Bot Resource

// Channel configuration settings
{
  "channelType": "Telephony",
  "phoneNumber": "+15551234567",
  "cognitiveServicesSpeechResourceId": "/subscriptions/{id}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{name}",
  "botServiceEndpoint": "https://{bot}.azurewebsites.net/api/messages"
}
```

### Voice Activity Format (Speech SDK)

```json
// Incoming voice activity
{
  "type": "message",
  "channelId": "telephony",
  "from": { "id": "+15559876543" },
  "text": "I need to reset my password",
  "speak": "",
  "inputHint": "expectingInput",
  "locale": "en-US",
  "channelData": {
    "callerId": "+15559876543",
    "callId": "call-uuid-1234"
  }
}

// Bot response with SSML for voice
{
  "type": "message",
  "text": "I can help you reset your password.",
  "speak": "<speak version='1.0' xml:lang='en-US'><voice name='en-US-JennyNeural'>I can help you reset your password. What is your employee ID?</voice></speak>",
  "inputHint": "expectingInput"
}
```

### DTMF (Touch-Tone) Input

For IVR scenarios, map DTMF input to bot responses:

```yaml
# Topic: Main Menu IVR
- kind: AskQuestion
  prompt: "Press 1 for password reset, 2 for VPN help, 3 to speak with an agent."
  speak: "<speak>Press 1 for password reset, press 2 for VPN help, press 3 to speak with an agent.</speak>"
  entity: NumberPrebuiltEntity
  output:
    binding: Topic.MenuChoice
  validations:
    - condition: "Topic.MenuChoice >= 1 && Topic.MenuChoice <= 3"
      message: "Please press 1, 2, or 3."

- kind: ConditionGroup
  conditions:
    - condition: "Topic.MenuChoice == 1"
      actions:
        - kind: RedirectToTopic
          topicName: Password Reset
    - condition: "Topic.MenuChoice == 2"
      actions:
        - kind: RedirectToTopic
          topicName: VPN Help
    - condition: "Topic.MenuChoice == 3"
      actions:
        - kind: RedirectToTopic
          topicName: Escalate
```

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| Teams app upload fails — manifest validation error | Manifest JSON schema violation | Validate manifest at https://dev.teams.microsoft.com/validation |
| Bot not visible in Teams after upload | App not approved by Teams admin; app sideloading disabled | Request admin approval; check Teams admin center app policies |
| Direct Line token expired | Tokens expire after 30 minutes of inactivity | Implement token refresh before expiry; use `/tokens/refresh` endpoint |
| Web chat shows blank iframe | Site blocked by Content Security Policy (CSP) | Add `*.botframework.com` to CSP `frame-src` directive |
| Adaptive card not rendering in Teams | Card schema version above 1.5 | Downgrade to Adaptive Card version 1.5 |
| `Action.Submit` not firing in Teams | Bot not properly registered; webhook misconfigured | Verify bot app ID matches in manifest and Bot Framework registration |
| Mobile WebView CORS error | Token fetch blocked by CORS | Add mobile app domain to CORS allowed origins on token endpoint |
| Telephony: no audio after connection | Azure Communication Services not linked | Verify ACS resource is linked in channel configuration |
| IVR: DTMF not recognized | Voice input being captured instead of DTMF | Configure channel for DTMF mode; check telephony provider settings |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Teams channels per bot | 1 | One Teams channel configuration per bot |
| Direct Line concurrent conversations | 1,000 | Per Direct Line secret |
| Direct Line token lifetime | 30 minutes | Refreshable before expiry |
| Web Chat sessions per hour | No hard limit | Subject to bot throughput limits |
| Adaptive Card version (Teams) | 1.5 maximum | Teams does not support 1.6+ |
| Teams message size | 28 KB | Per message payload |
| Proactive message rate (Teams) | 50 messages/second per bot | Per tenant |
| Azure Communication Services calls | Subject to ACS service limits | Region-specific |
| Custom channel relay latency | Adds 100-500ms | For Azure Function relay |
