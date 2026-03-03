---
name: Microsoft Forms Surveys
description: >
  Deep expertise in Microsoft Forms via the Graph API beta endpoint — create forms and surveys,
  add questions (choice, text, rating, date, Likert), collect and paginate responses,
  aggregate results, and manage form lifecycle for team polls, feedback, and event RSVPs.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - forms
  - surveys
  - polls
  - questionnaire
  - feedback form
  - microsoft forms
  - form responses
  - quiz
  - coverage audit
  - feature gap
  - documentation coverage
---

# Microsoft Forms Surveys

## Overview

Microsoft Forms is a lightweight survey and quiz tool included in Microsoft 365. It supports choice questions, text input, rating scales, date pickers, and Likert matrices. The Graph API for Forms is available only on the **beta** endpoint — it is not yet in v1.0. This means endpoint paths, request bodies, and response shapes may change without notice.

Forms are well suited for small-team scenarios (up to 20 people): quick polls, event RSVPs, onboarding checklists, customer feedback, retrospective surveys, and internal quizzes.

## Documentation Coverage Audit

Use `/forms-coverage-audit <form-id>` when users ask for full feature coverage validation. This workflow compares SKILL guidance to Microsoft Forms Graph beta documentation and live endpoint responses.

Always label beta-dependent capabilities explicitly and include mitigation steps when endpoint schemas may change.

## Base URL

```
https://graph.microsoft.com/beta
```

All Forms endpoints below are relative to this base URL.

## API Endpoint Reference

### Forms

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List user's forms | GET | `/me/forms` |
| Get form | GET | `/me/forms/{formId}` |
| Create form | POST | `/me/forms` |
| Update form | PATCH | `/me/forms/{formId}` |
| Delete form | DELETE | `/me/forms/{formId}` |
| List group forms | GET | `/groups/{groupId}/forms` |
| Create group form | POST | `/groups/{groupId}/forms` |

**Create form body**:
```json
{
  "title": "Team Retrospective — Sprint 12",
  "description": "Share what went well, what didn't, and ideas for improvement"
}
```

**Response** includes `id`, `webUrl`, `status` (draft/active), and `createdDateTime`.

### Questions

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List questions | GET | `/me/forms/{formId}/questions` |
| Get question | GET | `/me/forms/{formId}/questions/{questionId}` |
| Add question | POST | `/me/forms/{formId}/questions` |
| Update question | PATCH | `/me/forms/{formId}/questions/{questionId}` |
| Delete question | DELETE | `/me/forms/{formId}/questions/{questionId}` |

### Responses

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List responses | GET | `/me/forms/{formId}/responses` |
| Get response | GET | `/me/forms/{formId}/responses/{responseId}` |

Responses are paginated — follow `@odata.nextLink` for additional pages. Default page size is 100.

## Question Type Reference

### Choice (Single or Multi-Select)

Use for polls, preference picks, or any closed-ended question.

```json
{
  "displayName": "Which office location do you prefer?",
  "questionType": "choice",
  "isRequired": true,
  "orderIndex": 0,
  "choiceOptions": {
    "choices": [
      { "displayName": "Downtown HQ", "value": "downtown" },
      { "displayName": "Eastside Campus", "value": "eastside" },
      { "displayName": "Remote", "value": "remote" }
    ],
    "allowMultipleAnswers": false,
    "hasOtherOption": true
  }
}
```

- Set `allowMultipleAnswers: true` for "select all that apply" behavior.
- Set `hasOtherOption: true` to add a free-text "Other" option at the end.

### Text (Short Answer)

Use for names, emails, or brief open-ended input.

```json
{
  "displayName": "What is your email address?",
  "questionType": "text",
  "isRequired": true,
  "orderIndex": 1,
  "textOptions": {
    "isLongAnswer": false,
    "maxLength": 100
  }
}
```

### Text (Long Answer)

Use for detailed feedback, comments, or explanations.

```json
{
  "displayName": "Describe what went well this sprint",
  "questionType": "text",
  "isRequired": false,
  "orderIndex": 2,
  "textOptions": {
    "isLongAnswer": true,
    "maxLength": 4000
  }
}
```

### Rating (Star or Number)

Use for satisfaction scores, NPS, or experience ratings.

**Star rating (1-5)**:
```json
{
  "displayName": "Rate your overall satisfaction with the event",
  "questionType": "rating",
  "isRequired": true,
  "orderIndex": 3,
  "ratingOptions": {
    "ratingScale": 5,
    "ratingType": "star",
    "lowScoreLabel": "Very Dissatisfied",
    "highScoreLabel": "Very Satisfied"
  }
}
```

**Number rating (1-10)** — useful for NPS-style questions:
```json
{
  "displayName": "How likely are you to recommend this training to a colleague?",
  "questionType": "rating",
  "isRequired": true,
  "orderIndex": 4,
  "ratingOptions": {
    "ratingScale": 10,
    "ratingType": "number",
    "lowScoreLabel": "Not at all likely",
    "highScoreLabel": "Extremely likely"
  }
}
```

### Date

Use for availability checks, scheduling, or event RSVPs.

```json
{
  "displayName": "What date works best for the offsite?",
  "questionType": "date",
  "isRequired": true,
  "orderIndex": 5,
  "dateOptions": {
    "includeTime": false
  }
}
```

Set `includeTime: true` if you need a time component (e.g., appointment scheduling).

### Likert Scale

Use for agreement matrices, satisfaction batteries, or multi-statement evaluations.

```json
{
  "displayName": "Rate your agreement with each statement below:",
  "questionType": "likert",
  "isRequired": true,
  "orderIndex": 6,
  "likertOptions": {
    "columns": [
      { "displayName": "Strongly Disagree", "value": "1" },
      { "displayName": "Disagree", "value": "2" },
      { "displayName": "Neutral", "value": "3" },
      { "displayName": "Agree", "value": "4" },
      { "displayName": "Strongly Agree", "value": "5" }
    ],
    "rows": [
      { "displayName": "The meeting cadence is appropriate" },
      { "displayName": "I receive feedback in a timely manner" },
      { "displayName": "My workload is manageable" },
      { "displayName": "I feel included in team decisions" }
    ]
  }
}
```

## Common Patterns for Small Teams

### Quick Team Poll

Create a single-question choice form for fast decisions:

1. `POST /me/forms` with title "Friday Lunch Poll".
2. Add one choice question with 3-5 options and `isRequired: true`.
3. Share the `webUrl` in a Teams channel.
4. After the deadline, GET responses and tally votes.

### Event RSVP

1. Create a form with title "Team Offsite RSVP".
2. Add questions: text (name), choice (attending yes/no), date (preferred date), text (dietary restrictions).
3. Mark attendance choice as required.
4. Summarize responses: headcount, date preferences, special requirements.

### Onboarding Checklist

1. Create a form with title "New Hire Onboarding Checklist".
2. Add choice questions (yes/no) for each onboarding step: laptop received, accounts created, buddy assigned, first-week training completed.
3. Add a rating question for overall onboarding experience.
4. Add a long-text question for suggestions.

### Sprint Retrospective

1. Create a form titled "Sprint 12 Retro".
2. Add three long-text questions: "What went well?", "What could be improved?", "Action items for next sprint?".
3. Add a rating question for sprint satisfaction (1-5 stars).
4. Add a Likert question for process health (communication, planning, code review, deployment).

### Customer Feedback

1. Create a form titled "Product Feedback — Q1 2026".
2. Add a rating question (NPS 1-10).
3. Add choice questions for feature satisfaction.
4. Add long-text for open-ended feedback.
5. Aggregate: calculate NPS score (promoters minus detractors), feature satisfaction percentages, and common themes from text responses.

## Response Aggregation

### Choice Questions
Count each option, compute percentages:
```
Option A: 8/15 (53.3%)
Option B: 4/15 (26.7%)
Option C: 3/15 (20.0%)
```

### Rating Questions
Compute mean, median, and distribution:
```
Average: 4.2 / 5.0
Median: 4
Distribution: 1★=0, 2★=1, 3★=2, 4★=6, 5★=6
```

For NPS (1-10 scale):
- Promoters (9-10), Passives (7-8), Detractors (0-6).
- NPS = %Promoters - %Detractors.

### Likert Questions
Compute average score per row statement:
```
"Meeting cadence is appropriate"    Avg: 4.1
"Feedback is timely"                Avg: 3.5
"Workload is manageable"            Avg: 3.8
```

### Text Questions
For small teams (up to 20), list all responses verbatim. For larger sets, show the first 10 and a count of remaining.

## Authentication & Permissions

| Permission | Type | Description |
|------------|------|-------------|
| `Forms.Read` | Delegated | Read forms, questions, and responses |
| `Forms.ReadWrite` | Delegated | Create and modify forms, add/edit questions |

These are delegated permissions — they act on behalf of the signed-in user. Application permissions for Forms are not yet available in the beta API.

### Token Acquisition

Use `@azure/identity` with `ClientSecretCredential` or `InteractiveBrowserCredential`:

```javascript
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"]
});

const graphClient = Client.initWithMiddleware({ authProvider });

// Use beta endpoint
const forms = await graphClient.api("/me/forms").version("beta").get();
```

## Quiz Mode

Forms supports a quiz mode that adds scoring, correct answers, and feedback to questions.

**Create a quiz**:
```json
POST /me/forms
{
  "title": "Cloud Fundamentals Quiz",
  "description": "Test your knowledge of Azure basics",
  "isQuiz": true
}
```

**Quiz choice question with correct answer and points**:
```json
{
  "displayName": "Which Azure service provides serverless compute?",
  "questionType": "choice",
  "isRequired": true,
  "orderIndex": 0,
  "choiceOptions": {
    "choices": [
      { "displayName": "Azure Functions", "value": "functions" },
      { "displayName": "Azure VMs", "value": "vms" },
      { "displayName": "Azure SQL", "value": "sql" }
    ],
    "allowMultipleAnswers": false
  },
  "grading": {
    "correctAnswers": ["functions"],
    "points": 10
  }
}
```

When `isQuiz` is true, the form displays scores to respondents after submission. Each question can have a `grading` block with `correctAnswers` (array of matching values) and `points` (numeric score). Text questions can also be graded manually after submission.

## Form Publish API

New forms are created in `draft` status. To make a form available to respondents, publish it:

```
PATCH /me/forms/{formId}
```

**Publish body**:
```json
{
  "status": "active"
}
```

**Unpublish** (close form to new responses):
```json
{
  "status": "closed"
}
```

Valid status values: `draft`, `active`, `closed`. A form must be `active` for the `webUrl` to accept submissions.

## OData Filter Examples

Responses and questions support OData query parameters for efficient data retrieval:

| Parameter | Example | Purpose |
|-----------|---------|---------|
| `$top` | `GET /me/forms/{id}/responses?$top=25` | Limit to first 25 responses |
| `$orderby` | `GET /me/forms/{id}/responses?$orderby=submitDateTime desc` | Sort by newest first |
| `$filter` | `GET /me/forms/{id}/responses?$filter=submitDateTime ge 2026-03-01T00:00:00Z` | Responses after a date |
| `$select` | `GET /me/forms/{id}/responses?$select=submitDateTime,respondent` | Return only specific fields |
| `$skip` | `GET /me/forms/{id}/responses?$skip=100&$top=100` | Paginate results (page 2) |

**Combined example**: Get the 10 most recent responses with only answers and timestamps:
```
GET /me/forms/{formId}/responses?$top=10&$orderby=submitDateTime desc&$select=submitDateTime,answers
```

## Error Response Shape

Forms endpoints return the standard Graph error envelope:

```json
{
  "error": {
    "code": "ItemNotFound",
    "message": "The specified form was not found.",
    "innerError": {
      "date": "2026-03-01T12:00:00",
      "request-id": "abc-123-def",
      "client-request-id": "client-456"
    }
  }
}
```

**Forms-specific error codes**:

| Code | Status | Meaning |
|------|--------|---------|
| `ItemNotFound` | 404 | Form, question, or response does not exist |
| `AccessDenied` | 403 | User does not own the form or lacks Forms.ReadWrite |
| `InvalidRequest` | 400 | Malformed question body (e.g., choice question with no choices) |
| `QuotaExceeded` | 429 | Too many requests — retry after `Retry-After` header |
| `GeneralException` | 500 | Server error — retry with exponential backoff |
| `BadGateway` | 502 | Upstream service error — Forms beta can be intermittently unstable |

## Branching Logic

Forms supports conditional question display based on prior answers. Branching lets you show or skip questions depending on what the respondent selected.

**Branch definition** (on a choice question):
```json
{
  "displayName": "Are you attending in person?",
  "questionType": "choice",
  "isRequired": true,
  "orderIndex": 3,
  "choiceOptions": {
    "choices": [
      { "displayName": "Yes — in person", "value": "in-person" },
      { "displayName": "No — remote", "value": "remote" }
    ],
    "allowMultipleAnswers": false
  },
  "branching": {
    "rules": [
      {
        "matchValue": "in-person",
        "targetQuestionId": "<dietary-question-id>"
      },
      {
        "matchValue": "remote",
        "targetQuestionId": "<timezone-question-id>"
      }
    ]
  }
}
```

**Branching rules**:
- Each `rule` maps a `matchValue` (the selected choice value) to a `targetQuestionId` (the next question to display).
- If no rule matches, the form proceeds to the next question in `orderIndex` order.
- Branching only works on choice questions (single-select).
- Use branching for event RSVPs (in-person → dietary, remote → timezone), conditional feedback (satisfied → thanks, unsatisfied → details), or skip-logic surveys.

## Important Notes

- **Beta only**: All Forms endpoints are under `/beta`. They are not available in `/v1.0`.
- **Form status**: New forms are created in `draft` status. They must be published (set `status` to `active` or use the Forms web UI) before respondents can submit.
- **Pagination**: Response lists follow standard OData pagination. Always check for `@odata.nextLink`.
- **Rate limits**: Graph API enforces per-app and per-user throttling. Handle 429 responses with retry-after headers.
- **Group forms**: To create a form owned by a Microsoft 365 Group (shared editing), use `/groups/{groupId}/forms` and ensure the `Group.ReadWrite.All` permission is also granted.

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Forms Graph API (beta), create/update/delete forms, quiz vs survey, settings, response limits, date ranges | [`references/form-creation.md`](./references/form-creation.md) |
| Question types (choice, text, rating, date, ranking, Likert, NPS), branching logic, shuffle, subtitles | [`references/questions-branching.md`](./references/questions-branching.md) |
| Get responses, individual detail, summary statistics, NPS calculation, export patterns, Power Automate trigger | [`references/responses-analytics.md`](./references/responses-analytics.md) |
