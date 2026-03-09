# Teams Tabs — Personal, Channel, and Meeting Reference

## Overview

Teams tabs are web pages embedded inside Microsoft Teams using an iframe. There are three main tab types: personal (static), channel/group (configurable), and meeting tabs. This reference covers manifest v1.25 structure, TeamsJS SDK v2.19+, NAA authentication, deep links, and meeting tab patterns.

> **Requirement**: New app submissions and updates require **TeamsJS v2.19.0 or later**. TeamsJS v1.13.0 receives no new features.

---

## App Manifest Structure for Tabs (v1.25)

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json",
  "manifestVersion": "1.25",
  "version": "1.0.0",
  "id": "{{AAD_APP_CLIENT_ID}}",
  "name": { "short": "My App", "full": "My Application Full Name" },
  "description": { "short": "Short description (80 chars max)", "full": "Full description (4000 chars max)" },
  "developer": {
    "name": "Contoso",
    "websiteUrl": "https://contoso.com",
    "privacyUrl": "https://contoso.com/privacy",
    "termsOfUseUrl": "https://contoso.com/tos"
  },
  "icons": { "color": "color.png", "outline": "outline.png" },
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
      "context": [
        "channelTab",
        "privateChatTab",
        "meetingChatTab",
        "meetingDetailsTab",
        "meetingSidePanel",
        "meetingStage"
      ],
      "supportsChannelFeatures": true
    }
  ],

  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["{{TAB_DOMAIN}}"],

  "webApplicationInfo": {
    "id": "{{AAD_APP_CLIENT_ID}}",
    "resource": "api://{{TAB_DOMAIN}}/{{AAD_APP_CLIENT_ID}}"
  },
  "nestedAppAuthInfo": {
    "oidcScopes": ["openid", "profile", "email", "offline_access"],
    "accessTokenAcceptedVersion": 2
  }
}
```

---

## TeamsJS SDK v2 — Core API

```bash
npm install @microsoft/teams-js@latest  # Must be >= 2.19.0
```

```typescript
import * as microsoftTeams from "@microsoft/teams-js";

await microsoftTeams.app.initialize();
const context = await microsoftTeams.app.getContext();

console.log({
  teamId: context.team?.internalId,
  channelId: context.channel?.id,
  userObjectId: context.user?.id,
  theme: context.app.theme,            // "default" | "dark" | "contrast"
  hostName: context.app.host.name,    // "Teams" | "Outlook" | "Office"
  frameContext: context.page.frameContext, // "content" | "sidePanel" | "meetingStage"
  meetingId: context.meeting?.id,
});
```

---

## Nested App Authentication (NAA) — Recommended Default

NAA enables pop-up-free token acquisition using MSAL.js. No TeamsJS `getAuthToken` needed. NAA is GA across Teams, Outlook, and M365 hosts for personal tab apps.

```typescript
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.APP_TENANTID}`,
    supportsNestedAppAuth: true,  // Enable NAA
  },
};

const pca = new PublicClientApplication(msalConfig);
await pca.initialize();

// Acquire token silently — no popup
const accounts = pca.getAllAccounts();
const tokenResponse = await pca.acquireTokenSilent({
  scopes: ["User.Read", "Files.Read"],
  account: accounts[0],
});

// Use tokenResponse.accessToken for Graph calls directly
// No server-side OBO exchange needed with NAA
```

### Traditional SSO (Fallback)

If NAA is not available (older clients), fall back to TeamsJS SSO + server-side OBO:

```typescript
import { authentication } from "@microsoft/teams-js";

const ssoToken = await authentication.getAuthToken();
// Exchange server-side via OBO flow
```

---

## Meeting Tab Patterns

```typescript
import { meeting, app } from "@microsoft/teams-js";

const context = await app.getContext();
const isMeeting = !!context.meeting;
const frameContext = context.page.frameContext;

// Share to meeting stage from side panel
if (frameContext === "sidePanel") {
  meeting.shareAppContentToStage(
    (err, result) => {
      if (err) console.error("Share to stage failed:", err);
    },
    `${window.location.origin}/tab/stage`
  );
}

// Get meeting details
meeting.getMeetingDetails((err, details) => {
  if (details) {
    console.log("Meeting ID:", details.details.id);
    console.log("Organizer:", details.organizer.id);
  }
});
```

---

## Deep Links

```typescript
// Using TeamsJS SDK v2 (recommended)
await microsoftTeams.pages.navigateToApp({
  appId: "your-app-id",
  pageId: "homeTab",
  subPageId: "item-123",
});
```

---

## Dialog Namespace (Replaces Task Modules)

```typescript
import { dialog, app } from "@microsoft/teams-js";

// Open URL dialog (replaces tasks.startTask)
dialog.url.open({
  url: `${window.location.origin}/dialog/form`,
  title: "Create Item",
  size: { width: "large", height: "large" },
}, (result) => {
  console.log("Dialog result:", result.result);
});

// Open Adaptive Card dialog
dialog.adaptiveCard.open({
  card: JSON.stringify(cardPayload),
  title: "Feedback",
  size: { width: "medium", height: "medium" },
}, (result) => {
  console.log("Card result:", result.result);
});

// Submit from inside a dialog iframe
dialog.url.submit(JSON.stringify(formData));
```

---

## Adaptive Card Client Compatibility

| Client | Max Schema | Notes |
|--------|-----------|-------|
| Teams Desktop (Windows/Mac) | 1.6 | Full feature set |
| Teams Web | 1.6 | Full feature set |
| Teams Mobile (iOS) | 1.2 | Cards >1.2 may not render correctly |
| Teams Mobile (Android) | 1.2 | Cards >1.2 may not render correctly |
| Outlook | 1.4 | Avoid 1.5+ elements |

> **Mobile limitation**: Teams mobile supports Adaptive Cards up to v1.2. Cards later than 1.2 might not render correctly. `isEnabled` on `Action.Submit`, file/image uploads, and positive/destructive action styling are not supported.

---

## supportsChannelFeatures

For apps that work in shared and private channels, set `supportsChannelFeatures: true` on configurable tabs. Note:
- Private/shared channels have their own SharePoint sites
- Don't assume packaging or membership equivalence across channel types
- The Dev Portal may drop this field on save — always author in code

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `FailedToOpenPage` | Tab URL not in `validDomains` | Add all domains to `validDomains` |
| `notSupported` | SDK API not available in this host | Check capability before calling |
| `interaction_required` | SSO consent not granted | Use `authentication.authenticate()` or NAA fallback |
| CORS error | Server not accepting origin | Configure CORS for Teams domains |
| Blank tab | iframe blocked | Use `Content-Security-Policy: frame-ancestors` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Tab content URL | HTTPS only | HTTP blocked |
| `validDomains` entries | 16 | Wildcards supported |
| Static tabs per app | 16 | |
| Configurable tabs per app | 1 | |
| Meeting stage content URL | Must match `validDomains` | |
| Token expiry (SSO) | 1 hour | Cache and refresh |
