---
name: bot-publish
description: "Publish a Copilot Studio bot to channels"
argument-hint: "<bot-id> --channel <teams|web|custom> [--environment <env-name>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Publish a Copilot Studio Bot

Publish a Copilot Studio bot to production and deploy it to the specified channel (Microsoft Teams, web embed widget, or custom Direct Line integration).

## Instructions

### 1. Trigger Bot Publish

Publishing compiles all topic definitions, entity configurations, and AI settings into the bot's runtime. Use the Dataverse Web API to trigger the publish action:

```bash
# Trigger publish action on the bot
curl -s -X POST \
  "${DATAVERSE_URL}/api/data/v9.2/bots(${BOT_ID})/Microsoft.Dynamics.CRM.PublishBot" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0"
```

The publish action is asynchronous. Check publish status:

```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" \
  "${DATAVERSE_URL}/api/data/v9.2/bots(${BOT_ID})?$select=publishedon,statecode,statuscode" \
  | jq '{publishedon, statecode, statuscode}'
```

- `statecode: 0` = Active
- `statuscode: 1` = Provisioned (published successfully)

Wait until `publishedon` is updated to the current time before proceeding with channel deployment.

### 2a. Deploy to Microsoft Teams

Teams is the most common channel for internal helpdesk and FAQ bots in small organizations.

**Step 1**: Retrieve the bot's Teams channel configuration:

```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" \
  "${DATAVERSE_URL}/api/data/v9.2/botcomponents?\$filter=_parentbotid_value eq '${BOT_ID}' and componenttype eq 4 and schemaname eq 'TeamsChannel'" \
  | jq '.value[0]'
```

**Step 2**: Generate the Teams app manifest. Create a `manifest.json` for the Teams app package:

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "<bot-app-id>",
  "developer": {
    "name": "<company-name>",
    "websiteUrl": "https://www.example.com",
    "privacyUrl": "https://www.example.com/privacy",
    "termsOfUseUrl": "https://www.example.com/terms"
  },
  "name": {
    "short": "<bot-display-name>",
    "full": "<bot-full-name>"
  },
  "description": {
    "short": "<short-description>",
    "full": "<full-description>"
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#6264A7",
  "bots": [
    {
      "botId": "<bot-app-id>",
      "scopes": ["personal", "team", "groupChat"],
      "commandLists": [
        {
          "scopes": ["personal"],
          "commands": [
            { "title": "Help", "description": "Show available commands" },
            { "title": "Start", "description": "Start a conversation" }
          ]
        }
      ]
    }
  ]
}
```

**Step 3**: Package and upload to Teams:

```bash
# Create the Teams app package
mkdir -p teams-app
cp manifest.json teams-app/
# Add 32x32 outline.png and 192x192 color.png icons to teams-app/
cd teams-app && zip -r ../bot-teams-app.zip . && cd ..

echo "Upload bot-teams-app.zip to Teams Admin Center > Manage Apps > Upload new app"
echo "Or use Graph API to publish:"
```

```bash
# Upload via Microsoft Graph API (requires Teams app management permissions)
GRAPH_TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token" \
  -d "client_id=${AZURE_CLIENT_ID}" \
  -d "client_secret=${AZURE_CLIENT_SECRET}" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

curl -s -X POST "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps" \
  -H "Authorization: Bearer ${GRAPH_TOKEN}" \
  -H "Content-Type: application/zip" \
  --data-binary @bot-teams-app.zip | jq '.'
```

**Step 4**: Make the bot available to users. In Teams Admin Center, go to Manage Apps, find the uploaded app, and set its availability (everyone, specific groups, or blocked).

### 2b. Deploy as Web Widget

Embed the bot on an intranet page or customer-facing website.

**Step 1**: Retrieve the web channel token endpoint:

```bash
curl -s -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" \
  "${DATAVERSE_URL}/api/data/v9.2/botcomponents?\$filter=_parentbotid_value eq '${BOT_ID}' and componenttype eq 4 and schemaname eq 'WebChatChannel'" \
  | jq '.value[0].content' -r
```

**Step 2**: Generate the embed snippet. Write an HTML file with the web chat embed code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Bot</title>
  <style>
    #webchat {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 600px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <div id="webchat"></div>

  <script src="https://cdn.botframework.com/botframework-webchat/latest/webchat.js"></script>
  <script>
    const TOKEN_ENDPOINT = '<your-token-endpoint-url>';
    const STYLE_OPTIONS = {
      hideUploadButton: true,
      botAvatarInitials: 'Bot',
      userAvatarInitials: 'You',
      bubbleBackground: '#f0f0f0',
      bubbleFromUserBackground: '#0078d4',
      bubbleFromUserTextColor: '#ffffff',
    };

    async function initChat() {
      const response = await fetch(TOKEN_ENDPOINT);
      const { token } = await response.json();

      window.WebChat.renderWebChat(
        {
          directLine: window.WebChat.createDirectLine({ token }),
          styleOptions: STYLE_OPTIONS,
        },
        document.getElementById('webchat')
      );
    }

    initChat();
  </script>
</body>
</html>
```

**Step 3**: Deploy the HTML file to the target website or intranet. Ensure the hosting domain is added to the bot's allowed origins in Copilot Studio (Settings > Security > Web channel security).

### 2c. Deploy via Custom Direct Line

For custom integrations (mobile apps, kiosks, or third-party platforms):

**Step 1**: Obtain the Direct Line secret from the bot's channel configuration.

**Step 2**: Use the Direct Line API to integrate:

```bash
# Generate a token from the secret (tokens are scoped and expire)
curl -s -X POST \
  "https://directline.botframework.com/v3/directline/tokens/generate" \
  -H "Authorization: Bearer ${DL_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"user": {"id": "custom-user-id", "name": "Custom User"}}'
```

**Step 3**: Use the token in your application to create conversations and exchange messages via the Direct Line REST API or WebSocket stream.

### 3. Verify Deployment

After deploying to any channel, verify the bot is responding:

- **Teams**: Open the bot in Teams, send "Hello", and verify the greeting topic activates.
- **Web**: Load the embed page, send a test message, and verify the response.
- **Custom**: POST a test message via Direct Line and check the response activities.

### 4. Environment Promotion

When `--environment` is specified, the bot is published in a non-default environment. For promoting bots from development to production:

1. Export the bot as part of a Dataverse solution:
   ```bash
   curl -s -X POST "${DATAVERSE_URL}/api/data/v9.2/ExportSolution" \
     -H "Authorization: Bearer ${TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"SolutionName": "<solution-name>", "Managed": true}' \
     | jq -r '.ExportSolutionFile' | base64 -d > solution.zip
   ```

2. Import the managed solution into the target environment:
   ```bash
   SOLUTION_B64=$(base64 -w 0 solution.zip)
   curl -s -X POST "${TARGET_DATAVERSE_URL}/api/data/v9.2/ImportSolution" \
     -H "Authorization: Bearer ${TARGET_TOKEN}" \
     -H "Content-Type: application/json" \
     -d "{\"CustomizationFile\": \"${SOLUTION_B64}\", \"PublishWorkflows\": true}"
   ```

3. Publish the bot in the target environment and configure channel deployment there.
