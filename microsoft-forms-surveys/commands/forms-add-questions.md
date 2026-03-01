---
name: forms-add-questions
description: "Add questions to an existing Microsoft Form"
argument-hint: "<form-id> --type <choice|text|rating|date|likert> --text <question-text> [--required] [--choices <a,b,c>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Add Questions to a Microsoft Form

Add one or more questions to an existing form via the Graph beta API.

## Endpoint

```
POST https://graph.microsoft.com/beta/me/forms/{form-id}/questions
Content-Type: application/json
Authorization: Bearer {token}
```

## Instructions

1. Determine the question type from `--type` and build the appropriate request body.
2. Set `isRequired` to `true` if `--required` is specified.
3. Use `orderIndex` to control question ordering (0-based, increment for each question).
4. POST the question to the form.
5. Display the created question ID and confirmation.

## Question Type Templates

### Choice (Single Select)

```json
{
  "displayName": "What day works best for the team meeting?",
  "questionType": "choice",
  "isRequired": true,
  "orderIndex": 0,
  "choiceOptions": {
    "choices": [
      { "displayName": "Monday", "value": "monday" },
      { "displayName": "Wednesday", "value": "wednesday" },
      { "displayName": "Friday", "value": "friday" }
    ],
    "allowMultipleAnswers": false,
    "hasOtherOption": false
  }
}
```

### Choice (Multi-Select)

```json
{
  "displayName": "Which topics should we cover? (select all that apply)",
  "questionType": "choice",
  "isRequired": true,
  "orderIndex": 1,
  "choiceOptions": {
    "choices": [
      { "displayName": "Budget review", "value": "budget" },
      { "displayName": "Hiring plan", "value": "hiring" },
      { "displayName": "Product roadmap", "value": "roadmap" },
      { "displayName": "Team building", "value": "team" }
    ],
    "allowMultipleAnswers": true,
    "hasOtherOption": true
  }
}
```

### Text (Short Answer)

```json
{
  "displayName": "What is your name?",
  "questionType": "text",
  "isRequired": true,
  "orderIndex": 2,
  "textOptions": {
    "isLongAnswer": false,
    "maxLength": 100
  }
}
```

### Text (Long Answer)

```json
{
  "displayName": "Any additional comments or suggestions?",
  "questionType": "text",
  "isRequired": false,
  "orderIndex": 3,
  "textOptions": {
    "isLongAnswer": true,
    "maxLength": 4000
  }
}
```

### Rating (Star Scale)

```json
{
  "displayName": "How would you rate the onboarding experience?",
  "questionType": "rating",
  "isRequired": true,
  "orderIndex": 4,
  "ratingOptions": {
    "ratingScale": 5,
    "ratingType": "star",
    "lowScoreLabel": "Poor",
    "highScoreLabel": "Excellent"
  }
}
```

### Rating (Number Scale)

```json
{
  "displayName": "On a scale of 1-10, how likely are you to recommend us?",
  "questionType": "rating",
  "isRequired": true,
  "orderIndex": 5,
  "ratingOptions": {
    "ratingScale": 10,
    "ratingType": "number",
    "lowScoreLabel": "Not likely",
    "highScoreLabel": "Very likely"
  }
}
```

### Date

```json
{
  "displayName": "What date are you available to start?",
  "questionType": "date",
  "isRequired": true,
  "orderIndex": 6,
  "dateOptions": {
    "includeTime": false
  }
}
```

### Likert Scale

```json
{
  "displayName": "Please rate your agreement with the following statements:",
  "questionType": "likert",
  "isRequired": true,
  "orderIndex": 7,
  "likertOptions": {
    "columns": [
      { "displayName": "Strongly Disagree", "value": "1" },
      { "displayName": "Disagree", "value": "2" },
      { "displayName": "Neutral", "value": "3" },
      { "displayName": "Agree", "value": "4" },
      { "displayName": "Strongly Agree", "value": "5" }
    ],
    "rows": [
      { "displayName": "I feel supported by my manager" },
      { "displayName": "I have the tools I need to do my job" },
      { "displayName": "Communication within the team is effective" },
      { "displayName": "I understand the company's goals and priorities" }
    ]
  }
}
```

## Notes

- Parse `--choices` as a comma-separated list and map each to a `{ "displayName": ..., "value": ... }` object.
- For Likert questions, prompt the user for both row statements and column labels if not provided.
- The `orderIndex` determines display order in the form. Start at 0 and increment.
- The Forms API is beta — question type names and JSON shapes may change.
