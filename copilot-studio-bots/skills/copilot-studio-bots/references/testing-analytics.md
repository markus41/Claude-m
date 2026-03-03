# Testing and Analytics Reference

## Overview

Copilot Studio provides a Test Bot canvas for interactive testing, conversation transcript analysis, CSAT tracking, session metrics, topic analytics, and A/B testing patterns. This reference covers the test canvas, transcript analysis, CSAT configuration, session metrics API, key analytics metrics (trigger rate, resolution rate, escalation rate), A/B testing via topic variants, and Power BI dashboard integration.

---

## Test Bot Canvas

### Test Bot Features

The Test Bot canvas in Copilot Studio allows real-time testing of bot conversations before publishing.

| Feature | Description |
|---|---|
| Chat with bot | Send messages and see responses in real time |
| Reset conversation | Clear session state and start fresh |
| Topic tracking | See which topic matched each message |
| Variable inspector | View all variable values during the conversation |
| Trigger phrases test | Type a phrase and see confidence score + matched topic |
| Verbose mode | Show NLU confidence scores for all topic candidates |

### Testing Workflow

```
1. Author topic in Copilot Studio designer
2. Save topic (auto-saves work in progress)
3. Open Test Bot panel (right side)
4. Click "Reset" to start fresh conversation
5. Type test phrases from multiple perspectives:
   a. Exact trigger phrases (should score > 90%)
   b. Paraphrased variations (should still match)
   c. Borderline phrases (test disambiguation)
   d. Out-of-scope phrases (should hit Fallback)
6. Check variable values in the inspector
7. Verify action outputs in the Variables panel
8. Test error paths (simulate action failures)
9. Verify escalation flow triggers correctly
```

### Testing Checklist per Topic

```markdown
## Topic Test Checklist: {Topic Name}

### Trigger Coverage
- [ ] All exact trigger phrases match correctly
- [ ] 5 natural language variations match
- [ ] Similar phrases from OTHER topics do NOT trigger this one
- [ ] Edge cases and misspellings still match

### Conversation Flow
- [ ] Happy path completes without errors
- [ ] All question nodes accept valid input
- [ ] All question nodes reject invalid input (validation fires)
- [ ] Re-prompt appears after invalid input
- [ ] No-response fallback triggers after {maxReprompts} failures

### Conditions
- [ ] Each condition branch tested with appropriate values
- [ ] Else branch tested
- [ ] Edge conditions (null, empty, boundary values) tested

### Actions
- [ ] Action invoked with correct input values
- [ ] Action output bound to correct variables
- [ ] Action failure handled (check error path)

### Variables
- [ ] All expected variables populated after completion
- [ ] Global variables set correctly for cross-topic use
- [ ] No variable names conflict with system variables

### Escalation
- [ ] Escalation path tested
- [ ] Conversation summary/context passed to agent
```

---

## Conversation Transcripts

### Access Transcripts via Dataverse

Conversation transcripts are stored in Dataverse in the `conversationtranscript` table.

```json
GET /api/data/v9.2/conversationtranscripts
    ?$filter=_bot_conversationtranscriptid_value eq '<botid>'
    &$select=name,createdon,content,conversationstarttimeutc,conversationendtimeutc
    &$orderby=createdon desc
    &$top=100
```

### Transcript Schema

| Field | Type | Description |
|---|---|---|
| `conversationtranscriptid` | GUID | Unique transcript ID |
| `name` | String | Conversation ID |
| `content` | String (JSON) | Full conversation activity log |
| `conversationstarttimeutc` | DateTime | Start time |
| `conversationendtimeutc` | DateTime | End time |
| `_bot_conversationtranscriptid_value` | GUID | Bot ID |

### Parse Transcript Content

```javascript
// The 'content' field is a JSON string of Bot Framework activities
const transcript = JSON.parse(transcriptRecord.content);
const userMessages = transcript.activities.filter(a => a.from.role === 'user');
const botMessages = transcript.activities.filter(a => a.from.role === 'bot');

// Identify escalated sessions
const wasEscalated = transcript.activities.some(a =>
  a.type === 'handoff.initiate' ||
  (a.type === 'message' && a.text?.includes('transferring to an agent'))
);

// Find which topic was last active
const intentActivities = transcript.activities.filter(a =>
  a.type === 'trace' && a.name === 'RecognizedIntentRecord'
);
const lastTopic = intentActivities[intentActivities.length - 1]?.value?.IntentName;
```

---

## CSAT (Customer Satisfaction) Tracking

### Enable CSAT Survey

CSAT is enabled on `EndConversation` nodes with `survey: true`.

```yaml
- kind: EndConversation
  id: endWithSurvey
  survey: true
```

The CSAT survey appears after the conversation ends and asks: "Did I resolve your question today?" with Yes/No options. Users can optionally provide additional comments.

### CSAT Data in Dataverse

CSAT responses are stored in the `msdyn_csatsurvey` table.

```json
GET /api/data/v9.2/msdyn_csatsurveys
    ?$filter=_msdyn_bot_value eq '<botid>'
    &$select=msdyn_surveyresult,msdyn_surveycomments,msdyn_sessionid,createdon
    &$orderby=createdon desc
```

| `msdyn_surveyresult` Value | Meaning |
|---|---|
| `1` | Positive (Yes — resolved) |
| `2` | Negative (No — not resolved) |
| `3` | Neutral / No response |

### CSAT Score Calculation

```javascript
// CSAT = (Positive responses / Total responses) * 100
const surveys = await fetchCSATSurveys(botId, dateRange);
const positive = surveys.filter(s => s.msdyn_surveyresult === 1).length;
const total = surveys.filter(s => s.msdyn_surveyresult !== 3).length; // Exclude non-responses
const csatScore = total > 0 ? (positive / total) * 100 : 0;
console.log(`CSAT: ${csatScore.toFixed(1)}%`);
```

**Industry benchmarks**:
- Internal IT helpdesk: 85%+ is good
- Customer service: 80%+ is good
- Below 70%: investigate common failure patterns

---

## Session Metrics API

### Copilot Studio Analytics API

Copilot Studio exposes analytics data through the Dataverse Web API via the `botanalyticsconversation` entity and via the dedicated Copilot Studio analytics page.

```json
// Bot session analytics summary
GET /api/data/v9.2/msdyn_botanalyticsdatas
    ?$filter=_msdyn_bot_value eq '<botid>' and msdyn_logdate ge 2026-01-01
    &$select=msdyn_logdate,msdyn_totalsessions,msdyn_engagedsessions,
             msdyn_resolvedsessions,msdyn_escalatedsessions,msdyn_abandonedsessions
    &$orderby=msdyn_logdate desc
```

### Session Analytics Fields

| Field | Description |
|---|---|
| `msdyn_totalsessions` | Total conversations started |
| `msdyn_engagedsessions` | Sessions where user engaged beyond the first message |
| `msdyn_resolvedsessions` | Sessions that ended with `EndConversation` (not escalated) |
| `msdyn_escalatedsessions` | Sessions that triggered the Escalate topic |
| `msdyn_abandonedsessions` | Sessions that ended without resolution or escalation |

---

## Key Metrics

### Trigger Rate

Percentage of sessions where a topic was triggered (vs hitting Fallback).

```
Trigger Rate = (Sessions with topic match / Total sessions) × 100
```

**Target**: > 80% trigger rate indicates good NLU coverage.

**How to improve**:
- Review Fallback sessions — look for common unanswered questions.
- Add new topics for frequently asked unmatched questions.
- Add trigger phrases to existing topics to capture variations.

### Resolution Rate

Percentage of sessions that ended via `EndConversation` (not escalation or abandonment).

```
Resolution Rate = (Resolved sessions / Engaged sessions) × 100
```

**Target**: > 70% resolution rate for internal helpdesk; > 60% for customer-facing bots.

**How to improve**:
- Identify topics with high abandonment rates.
- Check if question nodes are too complex or have too many steps.
- Verify action integrations are reliable (low error rate).

### Escalation Rate

Percentage of sessions that transferred to a live agent.

```
Escalation Rate = (Escalated sessions / Engaged sessions) × 100
```

**Target**: < 20% escalation rate (varies by bot purpose — triage bots intentionally escalate more).

**How to improve**:
- Add more self-service resolution paths.
- Improve generative AI coverage for long-tail questions.
- Analyze escalation transcripts to identify fixable gaps.

### Topic-Level Analytics

```json
GET /api/data/v9.2/msdyn_boptopicanalyticsdatas
    ?$filter=_msdyn_bot_value eq '<botid>' and msdyn_logdate ge 2026-01-01
    &$select=msdyn_logdate,msdyn_topicname,msdyn_triggeredcount,
             msdyn_resolvedcount,msdyn_escalatedcount,msdyn_abandonedcount
    &$orderby=msdyn_triggeredcount desc
```

| Metric | Formula | Good Target |
|---|---|---|
| Topic trigger rate | `msdyn_triggeredcount / msdyn_totalsessions` | Top topics: > 10% each |
| Topic resolution rate | `msdyn_resolvedcount / msdyn_triggeredcount` | > 70% |
| Topic escalation rate | `msdyn_escalatedcount / msdyn_triggeredcount` | < 20% |
| Topic abandonment rate | `msdyn_abandonedcount / msdyn_triggeredcount` | < 15% |

---

## A/B Testing via Topic Variants

Copilot Studio does not have native A/B testing — implement it via conditional logic and session variables.

### A/B Test Pattern

```yaml
# In the target topic — split users into two groups
- kind: SetVariable
  id: assignVariant
  variable: Topic.ABVariant
  value: "=if(mod(int(substring(System.Conversation.Id, 0, 8), 16), 2) == 0, 'A', 'B')"
  # Deterministic split based on conversation ID — same user always gets same variant

- kind: ConditionGroup
  id: routeVariant
  conditions:
    - condition: "Topic.ABVariant == 'A'"
      actions:
        # Variant A: Short, direct instructions
        - kind: SendMessage
          message: "Click: https://aka.ms/reset-password"
        - kind: EndConversation
          id: endA
          survey: true

    - condition: "Topic.ABVariant == 'B'"
      actions:
        # Variant B: Step-by-step guided instructions
        - kind: SendMessage
          message: "Let me walk you through the password reset process step by step."
        - kind: InvokeAction
          actionName: GuidedPasswordReset
          inputs:
            email: =System.User.Email
        - kind: EndConversation
          id: endB
          survey: true
```

### Track Variant Performance

```javascript
// Query CSAT and transcripts filtered by variant
// Store variant in a Dataverse custom column via Power Automate
// when conversation ends — then compare CSAT scores per variant

const variantAResults = await fetchCSATByVariant(botId, 'A', dateRange);
const variantBResults = await fetchCSATByVariant(botId, 'B', dateRange);

console.log('Variant A CSAT:', calculateCSAT(variantAResults));
console.log('Variant B CSAT:', calculateCSAT(variantBResults));
console.log('Variant A Resolution Rate:', calculateResolutionRate(variantAResults));
console.log('Variant B Resolution Rate:', calculateResolutionRate(variantBResults));
```

---

## Power BI Analytics Dashboard

### Connect Power BI to Copilot Studio Analytics

1. In Power BI Desktop: **Get data** → **Dataverse**.
2. Connect to your Power Platform environment.
3. Select tables: `msdyn_botanalyticsdatas`, `msdyn_boptopicanalyticsdatas`, `conversationtranscripts`, `msdyn_csatsurveys`.
4. Build relationships and create calculated measures.

### Key DAX Measures

```dax
// Total Sessions
Total Sessions = SUM(msdyn_botanalyticsdatas[msdyn_totalsessions])

// Resolution Rate
Resolution Rate =
DIVIDE(
    SUM(msdyn_botanalyticsdatas[msdyn_resolvedsessions]),
    SUM(msdyn_botanalyticsdatas[msdyn_engagedsessions]),
    0
)

// Escalation Rate
Escalation Rate =
DIVIDE(
    SUM(msdyn_botanalyticsdatas[msdyn_escalatedsessions]),
    SUM(msdyn_botanalyticsdatas[msdyn_engagedsessions]),
    0
)

// CSAT Score
CSAT Score =
DIVIDE(
    CALCULATE(COUNTROWS(msdyn_csatsurveys), msdyn_csatsurveys[msdyn_surveyresult] = 1),
    CALCULATE(
        COUNTROWS(msdyn_csatsurveys),
        msdyn_csatsurveys[msdyn_surveyresult] IN {1, 2}
    ),
    0
)

// Top Topics by Volume
Top Topics =
TOPN(
    10,
    msdyn_boptopicanalyticsdatas,
    [msdyn_triggeredcount],
    DESC
)
```

### Recommended Dashboard Visuals

| Visual | Metric | Chart Type |
|---|---|---|
| Session trend | Daily sessions over 30 days | Line chart |
| Resolution funnel | Total → Engaged → Resolved | Funnel |
| CSAT trend | Weekly CSAT % | Area chart |
| Top topics | Topic trigger count | Bar chart (horizontal) |
| Escalation heatmap | Escalation rate by topic | Matrix |
| Abandonment topics | Topics with high abandonment | Bar chart |

---

## Error Codes and Conditions

| Condition | Meaning | Remediation |
|---|---|---|
| Test bot shows "topic not found" | Topic not published to Test | Save topic and click Reset in test canvas |
| Topic matches in test but not production | Unpublished changes | Publish bot after testing |
| CSAT survey not appearing | `EndConversation` node has `survey: false`; CSAT disabled in bot settings | Set `survey: true`; verify CSAT is enabled in bot configuration |
| Analytics data not populating | Bot not published; no real sessions yet | Publish bot; generate test sessions via Direct Line API |
| Transcript `content` field is null | Conversation ended abnormally | Filter for non-null content; check for bot errors in run |
| Resolution rate below 50% | High abandonment or escalation | Review transcripts for common failure points; add fallback handling |
| Trigger rate below 60% | Many sessions hitting Fallback | Analyze Fallback transcripts; add new topics or trigger phrases |
| A/B variant assignment uneven | Conversation ID entropy too low in test | Use random number in production; test assignment logic with diverse IDs |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Conversation transcripts retention | 30 days (default) | Configurable up to 90 days via Dataverse data retention policy |
| Analytics data granularity | Daily | No hourly breakdown in standard analytics |
| CSAT survey response rate | Typically 10-30% | Not all users respond to survey |
| Sessions per day (analytics API) | No query limit | Use `$top` and pagination for large datasets |
| Topics in analytics view | Top 100 | By trigger count; less popular topics in "Other" |
| Power BI refresh frequency | Up to 8 times/day (shared capacity) | Premium capacity: 48 times/day |
| Transcript content max size | 4 MB | Per conversation; large attachments excluded |
