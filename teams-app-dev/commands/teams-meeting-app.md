---
name: teams-meeting-app
description: "Scaffold a full Teams meeting app with side panel, stage sharing, Live Share collaboration, content bubbles, and pre/post meeting tabs"
argument-hint: "--name <AppName> --scenario <agenda|whiteboard|polls|qa|custom> [--live-share] [--recording]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold a Teams Meeting App

Create a production Teams meeting app with multiple surfaces (side panel, stage, content bubbles) and optional Live Share real-time collaboration.

## Instructions

### 1. Validate Inputs

- `--name` — App name (e.g., `MeetingAgenda`). Ask if not provided.
- `--scenario` — Meeting app template:
  - `agenda` — Collaborative agenda with time tracking, action items, and note-taking
  - `whiteboard` — Shared canvas with drawing tools, sticky notes, and shape library
  - `polls` — Real-time polls and Q&A with live results visualization
  - `qa` — Audience Q&A with upvoting, moderation, and AI-powered clustering
  - `custom` — Blank meeting app skeleton with all surfaces configured
- `--live-share` — Enable Live Share SDK for real-time synchronization across participants.
- `--recording` — Enable post-meeting features: transcript access, recording integration, and AI-generated summary.

Ask for the scenario if not provided.

### 2. Generate Project Structure

```
<app-name>/
├── m365agents.yml
├── appPackage/
│   ├── manifest.json              # v1.25 with meeting surfaces
│   ├── color.png
│   └── outline.png
├── src/
│   ├── server/
│   │   ├── index.ts               # Express server + bot adapter
│   │   ├── bot.ts                 # Meeting event handler + content bubbles
│   │   └── api/                   # REST API for meeting data
│   │       ├── meeting-data.ts    # CRUD for meeting-specific data
│   │       └── graph-proxy.ts     # Graph API proxy for transcript/recording
│   ├── client/
│   │   ├── index.tsx              # React app entry point
│   │   ├── App.tsx                # Router: side panel vs stage vs tab
│   │   ├── contexts/
│   │   │   ├── TeamsContext.tsx    # Teams JS SDK context provider
│   │   │   └── LiveShareContext.tsx # Live Share session provider (when --live-share)
│   │   ├── panels/
│   │   │   ├── SidePanel.tsx      # Side panel controller (280px)
│   │   │   ├── StageView.tsx      # Full-viewport shared stage
│   │   │   ├── PreMeeting.tsx     # Pre-meeting tab (setup/config)
│   │   │   └── PostMeeting.tsx    # Post-meeting tab (summary/actions)
│   │   ├── components/
│   │   │   ├── ShareToStage.tsx   # Stage sharing button
│   │   │   ├── LiveCursors.tsx    # Remote cursor overlay (when --live-share)
│   │   │   ├── Timer.tsx          # Shared timer component
│   │   │   └── RoleGate.tsx       # Role-based access (organizer/presenter/attendee)
│   │   └── scenario/             # Scenario-specific components
│   │       └── ...
│   └── shared/
│       └── types.ts
├── .env
├── package.json
├── tsconfig.json
├── vite.config.ts                # Vite for client build
└── webpack.config.js             # Webpack for server (if needed)
```

### 3. Manifest Configuration

Generate `manifest.json` with all meeting surfaces:

- `configurableTabs[0].context`: `["meetingSidePanel", "meetingStage", "meetingDetailsTab"]`
- `meetingSurfaces.sidePanel.preferredWidth`: 280
- `meetingSurfaces.stage.preferredWidth`: 1024, `preferredHeight`: 768
- RSC permissions: `OnlineMeeting.ReadBasic.Chat`, `MeetingStage.Write.Chat`, `LiveShareSession.ReadWrite.Chat`
- Bot section for content bubble notifications
- `webApplicationInfo` for SSO with `nestedAppAuthInfo`

### 4. Surface Router (`src/client/App.tsx`)

```typescript
// Detect which meeting surface the app is rendered in
const context = await microsoftTeams.app.getContext();
const frameContext = context.page?.frameContext;

switch (frameContext) {
  case "sidePanel":
    return <SidePanel />;
  case "meetingStage":
    return <StageView />;
  case "content": // Pre/post meeting tab
    return context.meeting?.id ? <PreMeeting /> : <PostMeeting />;
  default:
    return <SidePanel />;
}
```

### 5. Side Panel Features

The side panel (280px width) must include:
- Compact controls for stage content
- "Share to Stage" button (only visible to presenters/organizers)
- Real-time participant indicator
- Quick actions relevant to the scenario
- Adaptive layout that works at 280px

### 6. Stage Sharing

Implement collaborative stage view:
- Presenter shares content from side panel to stage
- All participants see the same shared view
- When `--live-share`: real-time cursor tracking, concurrent editing, shared state
- Role-based controls: presenters can navigate, attendees view only

### 7. Live Share Integration (when --live-share)

```typescript
// Initialize Live Share session
const liveShare = new LiveShareClient();
const session = await liveShare.joinSession();

// Shared state for scenario data
const sharedState = new LiveState("scenario-state", initialState);
await sharedState.initialize();

// Shared cursor tracking
const presence = new LivePresence("cursors");
await presence.initialize();

// Shared timer (for agenda time-boxing)
const timer = new LiveTimer("agenda-timer");
await timer.initialize();
```

### 8. Content Bubble Bot

The bot handler sends in-meeting notifications:
- Meeting start: Welcome card with agenda summary
- Timer expiry: "Time's up for agenda item X" alert
- New action item: Action item assigned notification to specific participant
- Meeting end: Summary card with action items and next steps

### 9. Post-Meeting Features (when --recording)

After the meeting ends:
- Fetch transcript via Graph API
- Fetch recording metadata
- Generate AI summary of key discussion points
- Extract action items with assigned owners
- Display in post-meeting tab with export options

### 10. Scenario-Specific Components

**agenda**: Agenda item list, time-box timer per item, note-taking area, action item collector, share agenda item to stage for focus.

**whiteboard**: Canvas with pen/eraser/shape tools, sticky notes, text boxes, image paste, infinite scroll canvas, export to PNG/PDF.

**polls**: Poll creation form, live voting with results bar chart, word cloud for open text, timer for voting window, share results to stage.

**qa**: Question submission form, upvote/downvote, moderator queue, AI-powered duplicate detection, answered/unanswered filter, share top questions to stage.

### 11. Display Summary

Show the user:
- Created files and architecture
- Meeting surfaces configured and how to test each
- Live Share capabilities (if enabled)
- Bot content bubble configuration
- How to test: `m365agents preview --local` with meeting context
- How to sideload into a Teams meeting
- Post-meeting feature setup (Graph API permissions needed)
