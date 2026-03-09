# Teams Tabs — Personal, Channel, Meeting, and NAA Reference

## Overview

Teams tabs are web pages embedded inside Microsoft Teams using an iframe. Tab types include personal (static), channel/group (configurable), and meeting tabs. This reference covers the manifest structure, TeamsJS v2.24+, SSO authentication, Nested App Authentication (NAA), deep links, dialog invocation from tabs, and meeting surface patterns.

---

## App Manifest Structure for Tabs (v1.25)

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json",
  "manifestVersion": "1.25",
  "version": "1.0.0",
  "id": "{{AAD_APP_CLIENT_ID}}",
  "name": {
    "short": "My App",
    "full": "My Application Full Name"
  },
  "description": {
    "short": "Short description (80 chars max)",
    "full": "Full description (4000 chars max)"
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
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["{{TAB_DOMAIN}}"],
  "webApplicationInfo": {
    "id": "{{AAD_APP_CLIENT_ID}}",
    "resource": "api://{{TAB_DOMAIN}}/{{AAD_APP_CLIENT_ID}}"
  },
  "nestedAppAuthInfo": {
    "enableNAA": true
  },
  "backgroundLoadConfiguration": {
    "contentUrl": "https://{{TAB_DOMAIN}}/tab/preload"
  }
}
```

---

## TeamsJS v2.24+ — Core API

```typescript
import * as microsoftTeams from "@microsoft/teams-js";

// MUST call app.initialize() before any other SDK call
await microsoftTeams.app.initialize();

const context = await microsoftTeams.app.getContext();
console.log({
  teamId: context.team?.internalId,
  channelId: context.channel?.id,
  userObjectId: context.user?.id,
  userPrincipalName: context.user?.userPrincipalName,
  locale: context.app.locale,
  theme: context.app.theme,           // "default" | "dark" | "contrast"
  entityId: context.page.id,
  subPageId: context.page.subPageId,
  hostName: context.app.host.name,    // "Teams" | "Outlook" | "Office"
  frameContext: context.page.frameContext,
  meetingId: context.meeting?.id,
});
```

**Minimum version for Store submission**: TeamsJS v2.19.0

---

## Tab Configuration Page

```typescript
useEffect(() => {
  (async () => {
    await microsoftTeams.app.initialize();

    microsoftTeams.pages.config.registerOnSaveHandler(async (saveEvent) => {
      await microsoftTeams.pages.config.setConfig({
        entityId: `tab-${selectedOption}`,
        configName: `My Tab - ${selectedOption}`,
        contentUrl: `https://myapp.com/tab/${selectedOption}`,
        websiteUrl: `https://myapp.com/tab/${selectedOption}`,
        removeUrl: `https://myapp.com/tab/remove`,
      });
      saveEvent.notifySuccess();
    });

    microsoftTeams.pages.config.registerOnRemoveHandler((removeEvent) => {
      removeEvent.notifySuccess();
    });

    microsoftTeams.pages.config.setValidityState(true);
  })();
}, [selectedOption]);
```

---

## SSO Authentication

### Client-side SSO token

```typescript
const ssoToken = await microsoftTeams.authentication.getAuthToken();
```

### Server-side OBO exchange

```typescript
import { ConfidentialClientApplication } from "@azure/msal-node";

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AAD_APP_CLIENT_ID!,
    clientSecret: process.env.AAD_APP_CLIENT_SECRET!,
    authority: `https://login.microsoftonline.com/${process.env.AAD_APP_TENANT_ID}`,
  },
});

const result = await msalClient.acquireTokenOnBehalfOf({
  oboAssertion: ssoToken,
  scopes: ["User.Read", "Files.Read"],
});
```

---

## Nested App Authentication (NAA)

NAA allows apps in iframes to authenticate without pop-ups by leveraging the parent host's auth context. Available since TeamsJS v2.24+.

### Check NAA availability

```typescript
const isRecommended = await microsoftTeams.nestedAppAuth.isNAAChannelRecommended();
```

### Use MSAL with NAA

```typescript
import { createNestablePublicClientApplication } from "@azure/msal-browser";

const msalInstance = await createNestablePublicClientApplication({
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/common",
  },
});

const tokenResponse = await msalInstance.acquireTokenSilent({
  scopes: ["User.Read"],
});
```

### Manifest configuration

```json
{
  "nestedAppAuthInfo": {
    "enableNAA": true
  }
}
```

---

## Dialog Invocation from Tabs

The `dialog` namespace replaces the deprecated `tasks` namespace:

```typescript
// Open HTML dialog
microsoftTeams.dialog.url.open({
  title: "Create Item",
  url: `${window.location.origin}/dialog/create`,
  size: { height: 450, width: 600 },
}, (result) => {
  console.log("Result:", result.result);
});

// Open Adaptive Card dialog
microsoftTeams.dialog.adaptiveCard.open({
  title: "Quick Form",
  card: cardJson,
  size: { height: 400, width: 500 },
});

// Submit from dialog page
microsoftTeams.dialog.url.submit(resultData);
```

**Note**: `dialog.submit()` was removed in TeamsJS v2.18.0. Use `dialog.url.submit()` instead.

---

## Deep Links

```typescript
// Navigate to a tab (TeamsJS v2)
await microsoftTeams.pages.navigateToApp({
  appId: "your-app-id",
  pageId: "homeTab",
  subPageId: "item-123",
});

// URL format
const deepLink = `https://teams.microsoft.com/l/entity/${appId}/${entityId}?webUrl=${encodedUrl}&context=${encodedContext}`;

// Open a chat
const chatLink = `https://teams.microsoft.com/l/chat/0/0?users=${userUPN}`;
```

---

## Meeting Tab Patterns

```typescript
const context = await microsoftTeams.app.getContext();
const isMeeting = !!context.meeting;
const frameContext = context.page.frameContext;

// Share to meeting stage from side panel
if (frameContext === "sidePanel") {
  await microsoftTeams.meeting.shareAppContentToStage(
    (err, result) => {
      if (err) console.error("Share to stage failed:", err);
    },
    `${window.location.origin}/tab/stage`
  );
}

microsoftTeams.meeting.getMeetingDetails((err, details) => {
  if (details) {
    console.log("Meeting ID:", details.details.id);
  }
});
```

### Meeting Surface Guide

| Surface | Use | frameContext |
|---------|-----|-------------|
| Details tab | Pre/post meeting prep | `"content"` |
| Side panel | During-meeting controls | `"sidePanel"` |
| Stage | Shared synchronized workspace | `"meetingStage"` |

---

## Tab Context Object — Key Fields

| Field | Path | Description |
|-------|------|-------------|
| User AAD ID | `context.user?.id` | AAD Object ID |
| User UPN | `context.user?.userPrincipalName` | Email/UPN |
| Tenant ID | `context.user?.tenant?.id` | Tenant ID |
| Team ID | `context.team?.internalId` | Internal Teams team ID |
| Channel ID | `context.channel?.id` | Current channel ID |
| Entity ID | `context.page.id` | `entityId` from manifest |
| Theme | `context.app.theme` | `"default"` / `"dark"` / `"contrast"` |
| Host name | `context.app.host.name` | `"Teams"` / `"Outlook"` / `"Office"` |
| Frame context | `context.page.frameContext` | `"content"` / `"sidePanel"` / `"task"` |
| Meeting ID | `context.meeting?.id` | Present only in meetings |

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `FailedToOpenPage` | Tab URL not in `validDomains` | Add domain to `validDomains` |
| `notSupported` | API not available in host | Check `microsoftTeams.isAvailable()` |
| `interaction_required` | SSO consent not granted | Trigger `authentication.authenticate()` |
| `invalid_grant` | SSO OBO failed | Ensure `api://domain/clientId` in `webApplicationInfo` |
| Config save disabled | `setValidityState(false)` | Call `setValidityState(true)` |

---

## Limits

| Resource | Limit |
|---|---|
| Tab content URL | HTTPS only |
| `validDomains` entries | 16 |
| Static tabs per app | 16 |
| Configurable tabs per app | 1 |
| `entityId` length | 64 characters |
| Token expiry (SSO) | 1 hour |
