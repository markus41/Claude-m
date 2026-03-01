---
name: forms-results-summary
description: "Summarize responses for a Microsoft Form"
argument-hint: "<form-id> [--format table|json]"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# Summarize Form Responses

Retrieve all responses for a Microsoft Form and produce an aggregated summary.

## Instructions

### 1. Fetch Form Metadata

```
GET https://graph.microsoft.com/beta/me/forms/{form-id}
```

Extract the form title, total question count, and status.

### 2. Fetch All Questions

```
GET https://graph.microsoft.com/beta/me/forms/{form-id}/questions
```

Build a question map: `{ questionId: { displayName, questionType, choices } }`.

### 3. Fetch All Responses

```
GET https://graph.microsoft.com/beta/me/forms/{form-id}/responses
```

Handle pagination if there are more than 100 responses — follow `@odata.nextLink` until all pages are fetched.

**Example response**:
```json
{
  "value": [
    {
      "id": "resp-001",
      "submitDateTime": "2026-03-01T14:30:00Z",
      "answers": [
        {
          "questionId": "q1",
          "value": "monday"
        },
        {
          "questionId": "q2",
          "value": "4"
        }
      ]
    }
  ]
}
```

### 4. Aggregate Results by Question Type

**Choice questions**: Count occurrences of each option, calculate percentage of total responses.

```
Q: What day works best?
  Monday     ████████████░░░░  8/15 (53.3%)
  Wednesday  ████░░░░░░░░░░░░  4/15 (26.7%)
  Friday     ███░░░░░░░░░░░░░  3/15 (20.0%)
```

**Rating questions**: Calculate mean, median, and distribution.

```
Q: How would you rate the onboarding? (1-5 stars)
  Average: 4.2 / 5.0
  Median:  4
  Distribution: ★1: 0  ★2: 1  ★3: 2  ★4: 6  ★5: 6
```

**Text questions**: List all responses (for small teams, up to 20), or show the first 10 with a count of remaining.

```
Q: Any additional comments?
  Responses (12 total):
  1. "Great onboarding, very thorough"
  2. "Would like more hands-on exercises"
  3. "The Entra ID section was confusing"
  ...
```

**Date questions**: Show earliest, latest, and most common date.

```
Q: What date are you available?
  Earliest: 2026-03-10
  Latest:   2026-03-24
  Most common: 2026-03-15 (5 responses)
```

**Likert questions**: Show average score per row statement.

```
Q: Rate your agreement:
  "I feel supported by my manager"           Avg: 4.1 / 5.0
  "I have the tools I need"                  Avg: 3.8 / 5.0
  "Communication is effective"               Avg: 3.5 / 5.0
  "I understand the company's goals"         Avg: 4.3 / 5.0
```

### 5. Output Format

If `--format table` (default), display a Markdown table summary:

```markdown
## Form: Team Lunch Preferences
**Responses**: 15 | **Created**: 2026-03-01 | **Status**: active

| # | Question | Type | Summary |
|---|----------|------|---------|
| 1 | What day works best? | choice | Monday: 53%, Wednesday: 27%, Friday: 20% |
| 2 | Rate the onboarding | rating | Avg: 4.2/5.0 (15 responses) |
| 3 | Additional comments | text | 12 responses collected |
```

If `--format json`, output the raw aggregated data as a JSON object suitable for further processing.

### 6. Completion Rate

Calculate and display the overall completion rate:
- Total responses received vs. form views (if available).
- Per-question response rate (responses to that question / total submissions).
- Flag questions with low completion rates (below 80% for required questions).
