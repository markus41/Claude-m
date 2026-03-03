# Teams Tabs — Personal, Channel, and Meeting Reference

## Overview

Teams tabs are web pages embedded inside Microsoft Teams using an iframe. There are three main tab types: personal (static), channel/group (configurable), and meeting tabs. This reference covers the manifest structure, Teams JS SDK v2, SSO authentication with MSAL, deep links, tab context objects, and Teams Toolkit scaffolding patterns.

---

## App Manifest Structure for Tabs

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.17/MicrosoftTeams.schema.json",
  "manifestVersion": "1.17",
  "version": "1.0.0",
  "id": "{{AAD_APP_CLIENT_ID}}",
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
    },
    {
      "entityId": "settingsTab",
      "name": "Settings",
      "contentUrl": "https://{{TAB_DOMAIN}}/tab/settings",
      "scopes": ["personal"]
    }
  ],

  "configurableTabs": [
    {
      "configurationUrl": "https://{{TAB_DOMAIN}}/tab/configure",
      "canUpdateConfiguration": true,
      "scopes": ["team", "groupChat"],
      "context": [
        "channelTab",
        "privateChatTab",
        "meetingChatTab",
        "meetingDetailsTab",
        "meetingSidePanel",
        "meetingStage"
      ],
      "sharePointPreviewImage": "https://{{TAB_DOMAIN}}/preview.png",
      "supportedSharePointHosts": ["sharePointFullPage", "sharePointWebPart"]
    }
  ],

  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["{{TAB_DOMAIN}}"],

  "webApplicationInfo": {
    "id": "{{AAD_APP_CLIENT_ID}}",
    "resource": "api://{{TAB_DOMAIN}}/{{AAD_APP_CLIENT_ID}}"
  }
}
```

---

## Teams JS SDK v2 — Core API

```typescript
import * as microsoftTeams from "@microsoft/teams-js";

// MUST call app.initialize() before any other SDK call
await microsoftTeams.app.initialize();

// Get full context
const context = await microsoftTeams.app.getContext();
console.log({
  teamId: context.team?.internalId,
  channelId: context.channel?.id,
  channelName: context.channel?.displayName,
  userObjectId: context.user?.id,              // AAD Object ID
  userPrincipalName: context.user?.userPrincipalName,
  locale: context.app.locale,
  theme: context.app.theme,                    // "default" | "dark" | "contrast"
  entityId: context.page.id,                  // entityId from manifest
  subPageId: context.page.subPageId,          // deep link sub-page
  sessionId: context.app.sessionId,
  hostName: context.app.host.name,            // "Teams" | "Outlook" | "Office"
  frameContext: context.page.frameContext,    // "content" | "task" | "sidePanel" etc.
  meetingId: context.meeting?.id,
});
```

---

## Tab Configuration Page (Configurable Tab)

```typescript
import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect, useState } from "react";

export const ConfigPage: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState("dashboard");

  useEffect(() => {
    (async () => {
      await microsoftTeams.app.initialize();

      // Tell Teams the configuration is valid/invalid
      microsoftTeams.pages.config.registerOnSaveHandler(async (saveEvent) => {
        await microsoftTeams.pages.config.setConfig({
          entityId: `tab-${selectedOption}`,
          configName: `My Tab - ${selectedOption}`,
          contentUrl: `https://mytabdomain.com/tab/${selectedOption}?theme={theme}&locale={locale}`,
          websiteUrl: `https://mytabdomain.com/tab/${selectedOption}`,
          removeUrl: `https://mytabdomain.com/tab/remove`,
        });
        saveEvent.notifySuccess();
      });

      microsoftTeams.pages.config.registerOnRemoveHandler((removeEvent) => {
        // Perform cleanup (delete data, etc.)
        removeEvent.notifySuccess();
      });

      microsoftTeams.pages.config.setValidityState(true);
    })();
  }, [selectedOption]);

  return (
    <div>
      <h1>Configure Tab</h1>
      <select value={selectedOption} onChange={(e) => setSelectedOption(e.target.value)}>
        <option value="dashboard">Dashboard</option>
        <option value="reports">Reports</option>
        <option value="settings">Settings</option>
      </select>
    </div>
  );
};
```

---

## SSO Authentication with MSAL

### Step 1: Server-side token exchange

```typescript
// Server endpoint: exchange Teams SSO token for a Graph token
import { ConfidentialClientApplication } from "@azure/msal-node";
import express from "express";

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AAD_APP_CLIENT_ID!,
    clientSecret: process.env.AAD_APP_CLIENT_SECRET!,
    authority: `https://login.microsoftonline.com/${process.env.AAD_APP_TENANT_ID}`,
  },
});

const router = express.Router();

router.post("/auth/token", async (req, res) => {
  const { ssoToken } = req.body as { ssoToken: string };

  try {
    const result = await msalClient.acquireTokenOnBehalfOf({
      oboAssertion: ssoToken,
      scopes: ["User.Read", "Files.Read"],
    });

    res.json({ accessToken: result!.accessToken });
  } catch (err: unknown) {
    const error = err as { errorCode?: string };
    if (error.errorCode === "interaction_required") {
      // Consent needed — client must trigger full auth flow
      res.status(403).json({ error: "consent_required" });
    } else {
      res.status(500).json({ error: "token_exchange_failed" });
    }
  }
});
```

### Step 2: Client-side SSO token acquisition

```typescript
import * as microsoftTeams from "@microsoft/teams-js";

async function getGraphAccessToken(): Promise<string> {
  await microsoftTeams.app.initialize();

  // Get the SSO token from Teams (silent, no popup)
  const ssoToken = await microsoftTeams.authentication.getAuthToken();

  // Exchange SSO token for Graph token on your server
  const response = await fetch("/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ssoToken }),
  });

  if (response.status === 403) {
    // Consent required — trigger interactive auth
    await microsoftTeams.authentication.authenticate({
      url: `${window.location.origin}/auth/start`,
      width: 600,
      height: 535,
    });
    // Retry after consent
    return getGraphAccessToken();
  }

  const data = await response.json() as { accessToken: string };
  return data.accessToken;
}
```

---

## Deep Links

Deep links navigate to specific content within Teams.

```typescript
// Navigate to a tab with a sub-page
const deepLink = `https://teams.microsoft.com/l/entity/${appId}/${entityId}?webUrl=${encodedWebUrl}&label=${encodedLabel}&context=${encodedContext}`;

// Using TeamsJS SDK v2 (recommended)
await microsoftTeams.pages.navigateToApp({
  appId: "your-app-id",
  pageId: "homeTab",
  subPageId: "item-123",
});

// Open a channel in Teams
const channelLink = `https://teams.microsoft.com/l/channel/${channelId}/${channelName}?groupId=${teamId}&tenantId=${tenantId}`;

// Open a chat
const chatLink = `https://teams.microsoft.com/l/chat/0/0?users=${userUPN}`;

// Share to Teams
const shareLink = `https://teams.microsoft.com/share?href=${encodeURIComponent(contentUrl)}&preview=true&referrer=myapp`;
```

---

## Meeting Tab Patterns

```typescript
// Detect meeting context
const context = await microsoftTeams.app.getContext();
const isMeeting = !!context.meeting;
const frameContext = context.page.frameContext;
// "sidePanel" | "meetingStage" | "content"

// Share content to meeting stage
if (frameContext === "sidePanel") {
  await microsoftTeams.meeting.shareAppContentToStage(
    (err, result) => {
      if (err) console.error("Share to stage failed:", err);
    },
    `${window.location.origin}/tab/stage`
  );
}

// Get meeting participants (requires meeting organizer permissions)
microsoftTeams.meeting.getMeetingDetails((err, details) => {
  if (details) {
    console.log("Meeting ID:", details.details.id);
    console.log("Organizer:", details.organizer.id);
  }
});
```

---

## Notification API (Tabs)

```typescript
// Show a notification in the Teams client (not a push notification)
await microsoftTeams.app.openLink(
  `https://teams.microsoft.com/l/entity/${appId}/homeTab`
);

// Send activity notification to user (via Graph API)
// POST /teams/{teamId}/channels/{channelId}/members/{memberId}/sendActivityNotification
```

---

## Tab Context Object — Key Fields

| Field | Path | Description |
|-------|------|-------------|
| User AAD ID | `context.user?.id` | AAD Object ID of the current user |
| User UPN | `context.user?.userPrincipalName` | Email/UPN |
| Tenant ID | `context.user?.tenant?.id` | Tenant where user is signed in |
| Team ID | `context.team?.internalId` | Internal Teams team ID |
| Team AAD Group ID | `context.team?.groupId` | AAD Group ID for Graph calls |
| Channel ID | `context.channel?.id` | Current channel ID |
| Entity ID | `context.page.id` | `entityId` from manifest `staticTabs` |
| Sub-page ID | `context.page.subPageId` | From deep link `subEntityId` |
| Theme | `context.app.theme` | `"default"` \| `"dark"` \| `"contrast"` |
| Locale | `context.app.locale` | BCP-47 locale string, e.g. `"en-us"` |
| Frame context | `context.page.frameContext` | `"content"` \| `"sidePanel"` \| `"task"` |
| Meeting ID | `context.meeting?.id` | Present only in meeting context |
| Host name | `context.app.host.name` | `"Teams"` \| `"Outlook"` \| `"Office"` |

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `resourceDisabled` | Tab not authorized in tenant | Admin must consent to the app in Teams admin center |
| `FailedToOpenPage` | Tab URL not in `validDomains` | Add all domains (including auth redirect domains) to `validDomains` |
| `notSupported` | SDK API not available in this host | Check `microsoftTeams.isAvailable()` before calling APIs |
| `interaction_required` | SSO consent not granted | Trigger `authentication.authenticate()` for full consent flow |
| `invalid_grant` | SSO OBO failed | Ensure `api://domain/clientId` resource is in manifest `webApplicationInfo` |
| CORS error on token exchange | Server not accepting `Origin` header | Configure CORS to allow Teams domain origins |
| Blank tab renders | `contentUrl` iframe blocked | Add `X-Frame-Options: ALLOWALL` or use `Content-Security-Policy: frame-ancestors` |
| Config page save button disabled | `setValidityState(false)` not called | Call `setValidityState(true)` in configuration page `useEffect` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Tab content URL | HTTPS only | HTTP blocked in Teams |
| `validDomains` entries | 16 | Wildcards supported: `*.contoso.com` |
| Static tabs per app | 16 | Shown in personal app side rail |
| Configurable tabs per app | 1 | One `configurableTabs` entry in manifest |
| `configurationUrl` query string | 1,024 characters | Avoid long query params |
| iFrame allowed features | No camera/microphone by default | Request via manifest `devicePermissions` |
| Meeting stage content URL | Must match `validDomains` | Same iframe restrictions apply |
| Token expiry (SSO) | 1 hour | Cache access tokens; refresh before expiry |
| `entityId` length | 64 characters | Used for deep links; keep short and URL-safe |
