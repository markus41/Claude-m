# Meeting Apps — Advanced Reference

## Overview

Teams meeting apps extend the meeting experience through multiple surfaces: side panel, meeting stage, content bubbles, in-meeting tabs, and pre/post-meeting experiences. This reference covers advanced patterns for building production meeting apps.

---

## Meeting App Surfaces

| Surface | When Available | Max Dimensions | Technology |
|---------|---------------|----------------|------------|
| Side panel | During meeting | 280px width (fixed) | Configurable tab |
| Meeting stage | During meeting, shared | Full viewport | Content sharing API |
| Content bubble | During meeting | Card overlay | Bot notification |
| Pre-meeting tab | Before meeting starts | Full tab width | Configurable tab |
| Post-meeting tab | After meeting ends | Full tab width | Configurable tab |
| Together mode scene | During meeting | Custom layout | Scene designer |

---

## Manifest Configuration

```json
{
  "configurableTabs": [
    {
      "configurationUrl": "https://{domain}/config",
      "canUpdateConfiguration": true,
      "scopes": ["groupChat"],
      "context": [
        "meetingSidePanel",
        "meetingStage",
        "meetingDetailsTab"
      ],
      "meetingSurfaces": {
        "sidePanel": {
          "preferredWidth": 280
        },
        "stage": {
          "preferredWidth": 1024,
          "preferredHeight": 768
        }
      }
    }
  ],
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        { "name": "OnlineMeeting.ReadBasic.Chat", "type": "Application" },
        { "name": "MeetingStage.Write.Chat", "type": "Delegated" },
        { "name": "LiveShareSession.ReadWrite.Chat", "type": "Delegated" }
      ]
    }
  }
}
```

---

## Side Panel → Stage Sharing

### Side Panel Controller

```typescript
import * as microsoftTeams from "@microsoft/teams-js";

async function shareToStage(contentUrl: string): Promise<void> {
  await microsoftTeams.app.initialize();

  const context = await microsoftTeams.app.getContext();
  const meetingId = context.meeting?.id;

  if (!meetingId) {
    console.error("Not in a meeting context");
    return;
  }

  // Share content to the meeting stage
  await microsoftTeams.meeting.shareAppContentToStage(
    (err) => {
      if (err) console.error("Share to stage failed:", err);
    },
    contentUrl,
    {
      sharingProtocol: microsoftTeams.meeting.SharingProtocol.Collaborative,
    }
  );
}

// Check if stage sharing is supported
async function canShareToStage(): Promise<boolean> {
  try {
    await microsoftTeams.meeting.getAppContentStageSharingCapabilities();
    return true;
  } catch {
    return false;
  }
}
```

### Stage Content (Shared View)

```typescript
import * as microsoftTeams from "@microsoft/teams-js";
import { LiveShareClient, LiveState } from "@microsoft/live-share";

// Initialize Live Share for real-time collaboration
const liveShare = new LiveShareClient();
const liveSession = await liveShare.joinSession();

// Create a shared state object
const sharedData = new LiveState<{ currentSlide: number; annotations: string[] }>(
  "presentation-state",
  { currentSlide: 0, annotations: [] }
);
await sharedData.initialize();

// Listen for changes from any participant
sharedData.on("stateChanged", (state, local) => {
  if (!local) {
    renderSlide(state.currentSlide);
    renderAnnotations(state.annotations);
  }
});

// Update shared state (syncs to all participants)
async function navigateToSlide(slideNumber: number): Promise<void> {
  await sharedData.set({
    ...sharedData.state,
    currentSlide: slideNumber,
  });
}
```

---

## Live Share — Real-Time Collaboration

### Shared Timer

```typescript
import { LiveTimer } from "@microsoft/live-share";

const timer = new LiveTimer("meeting-timer");
await timer.initialize();

timer.on("started", (config) => {
  startCountdown(config.duration);
});

timer.on("paused", () => {
  pauseCountdown();
});

timer.on("finished", () => {
  showTimerComplete();
});

// Presenter controls
async function startTimer(durationMs: number): Promise<void> {
  await timer.start(durationMs);
}
```

### Shared Cursor / Pointer

```typescript
import { LivePresence } from "@microsoft/live-share";

interface PresenceData {
  cursor: { x: number; y: number };
  activeElement?: string;
  isPresenting: boolean;
}

const presence = new LivePresence<PresenceData>("meeting-presence");
await presence.initialize();

// Track local cursor
document.addEventListener("mousemove", async (e) => {
  await presence.update({
    cursor: { x: e.clientX, y: e.clientY },
    isPresenting: false,
  });
});

// Render remote cursors
presence.on("presenceChanged", (user, data) => {
  renderRemoteCursor(user.userId, user.displayName, data.cursor);
});
```

### Shared Canvas (Whiteboard)

```typescript
import { LiveCanvas } from "@microsoft/live-share-canvas";

const canvas = new LiveCanvas("shared-whiteboard", document.getElementById("canvas")!);
await canvas.initialize();

// All strokes automatically sync across participants
canvas.on("strokeAdded", (stroke, isLocal) => {
  if (!isLocal) {
    console.log(`Remote user drew on canvas`);
  }
});
```

---

## Content Bubbles (In-Meeting Notifications)

### Bot-Driven Content Bubble

```typescript
class MeetingBot extends TeamsActivityHandler {
  // Send targeted notification to a specific participant
  async sendContentBubble(
    context: TurnContext,
    targetUserId: string,
    card: Attachment
  ): Promise<void> {
    const activity = MessageFactory.attachment(card);
    activity.channelData = {
      notification: {
        alertInMeeting: true,
        externalResourceUrl: `https://${process.env.BOT_DOMAIN}/meeting-detail`,
      },
    };

    // Target specific user
    const ref = TurnContext.getConversationReference(context.activity);
    ref.user = { id: targetUserId, name: "" };

    await context.adapter.continueConversationAsync(
      process.env.BOT_ID!,
      ref,
      async (ctx) => {
        await ctx.sendActivity(activity);
      }
    );
  }

  // React to meeting events
  protected async onTeamsMeetingStart(meeting: any, context: TurnContext, next: () => Promise<void>): Promise<void> {
    const card = CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        { type: "TextBlock", text: "Meeting started!", weight: "Bolder" },
        { type: "TextBlock", text: `Participants: ${meeting.members?.length ?? "unknown"}` },
      ],
      actions: [
        { type: "Action.OpenUrl", title: "Open Agenda", url: `https://${process.env.BOT_DOMAIN}/agenda/${meeting.id}` },
      ],
    });
    await this.sendContentBubble(context, context.activity.from.id, card);
    await next();
  }

  protected async onTeamsMeetingEnd(meeting: any, context: TurnContext, next: () => Promise<void>): Promise<void> {
    // Generate meeting summary and action items
    const summary = await generateMeetingSummary(meeting.id);
    await context.sendActivity(MessageFactory.text(summary));
    await next();
  }
}
```

---

## Meeting Participant API

### Get Meeting Details

```typescript
import { TeamsInfo } from "botbuilder";

// Get meeting info from bot context
const meetingInfo = await TeamsInfo.getMeetingInfo(context);
console.log("Meeting ID:", meetingInfo.details.msGraphResourceId);
console.log("Organizer:", meetingInfo.organizer.id);

// Get participant details
const participant = await TeamsInfo.getMeetingParticipant(
  context,
  meetingInfo.details.id,
  context.activity.from.id,
  context.activity.from.aadObjectId
);
console.log("Role:", participant.meeting.role); // Organizer, Presenter, Attendee
console.log("In meeting:", participant.meeting.inMeeting);
```

### Server-Side Graph API

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

// Get meeting transcript
const transcripts = await graphClient
  .api(`/me/onlineMeetings/${meetingId}/transcripts`)
  .get();

// Get meeting attendance report
const attendance = await graphClient
  .api(`/me/onlineMeetings/${meetingId}/attendanceReports`)
  .get();

// Get meeting recording
const recordings = await graphClient
  .api(`/me/onlineMeetings/${meetingId}/recordings`)
  .get();
```

---

## Pre/Post Meeting Experience

### Pre-Meeting Tab

```typescript
// Configuration page for meeting tab
microsoftTeams.pages.config.registerOnSaveHandler((saveEvent) => {
  microsoftTeams.pages.config.setConfig({
    entityId: "meeting-agenda",
    contentUrl: `https://${domain}/meeting-tab?meetingId={meeting.id}`,
    suggestedDisplayName: "Agenda & Notes",
    websiteUrl: `https://${domain}/meeting-tab`,
  });
  saveEvent.notifySuccess();
});

// Meeting tab renders differently based on meeting phase
const context = await microsoftTeams.app.getContext();
const meetingPhase = context.page?.frameContext; // "sidePanel" | "meetingStage" | "content"

switch (meetingPhase) {
  case "content": // Pre/post meeting tab
    renderFullAgenda();
    break;
  case "sidePanel": // During meeting
    renderCompactAgenda();
    break;
  case "meetingStage": // Shared to stage
    renderPresentationView();
    break;
}
```

---

## Together Mode Scenes

### Custom Scene Definition

```json
{
  "name": "Roundtable",
  "maxParticipants": 12,
  "seatMap": [
    { "seatIndex": 0, "x": 100, "y": 200, "width": 180, "height": 180 },
    { "seatIndex": 1, "x": 320, "y": 200, "width": 180, "height": 180 },
    { "seatIndex": 2, "x": 540, "y": 200, "width": 180, "height": 180 }
  ],
  "backgroundImage": "roundtable-bg.png",
  "foregroundImage": "roundtable-fg.png"
}
```

---

## Role-Based Access Control

```typescript
async function checkMeetingRole(context: TurnContext): Promise<"organizer" | "presenter" | "attendee"> {
  const participant = await TeamsInfo.getMeetingParticipant(
    context,
    context.activity.channelData?.meeting?.id,
    context.activity.from.id,
    context.activity.from.aadObjectId
  );
  return participant.meeting.role.toLowerCase() as "organizer" | "presenter" | "attendee";
}

// Gate stage sharing to presenters/organizers
app.adaptiveCard.actionExecute("shareToStage", async (ctx) => {
  const role = await checkMeetingRole(ctx);
  if (role === "attendee") {
    return ctx.reply("Only presenters can share to stage.");
  }
  await shareContent(ctx.data.contentId);
});
```

---

## Meeting App Limits

| Resource | Limit |
|---|---|
| Side panel width | 280px (fixed) |
| Content bubble card size | 28 KB |
| Meeting stage content URL | Must be in `validDomains` |
| Live Share session participants | 100 (soft limit) |
| Live Share data object size | 1 MB per object |
| Content bubble display time | Until dismissed |
| Together mode seats | 49 max |
| Meeting recording retention | 120 days (default) |
| Transcript availability | After meeting ends, async processing |
