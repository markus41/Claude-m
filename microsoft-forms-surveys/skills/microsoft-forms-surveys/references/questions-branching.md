# Forms Questions & Branching Logic — Graph API Reference

## Overview

This reference covers all Microsoft Forms question types (choice, text, rating, date, ranking,
Likert, NPS, file upload) via the Graph beta API, including branching logic, required fields,
shuffle options, and subtitles.

Base URL: `https://graph.microsoft.com/beta`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/forms/{formId}/questions` | `Forms.Read` | `$select`, `$orderby` | List all questions |
| GET | `/me/forms/{formId}/questions/{questionId}` | `Forms.Read` | — | Get specific question |
| POST | `/me/forms/{formId}/questions` | `Forms.ReadWrite` | Question body | Add question to form |
| PATCH | `/me/forms/{formId}/questions/{questionId}` | `Forms.ReadWrite` | Fields to update | Update question |
| DELETE | `/me/forms/{formId}/questions/{questionId}` | `Forms.ReadWrite` | — | Remove question |

---

## Question Type Reference

### Choice (Single or Multi-Select)

```typescript
// Single select (radio button)
const choiceQuestion = {
  displayName: "Which office location do you prefer?",
  questionType: "choice",
  isRequired: true,
  orderIndex: 0,
  subtitle: "Select the location that works best for you",
  choiceOptions: {
    choices: [
      { displayName: "Downtown HQ", value: "downtown" },
      { displayName: "Eastside Campus", value: "eastside" },
      { displayName: "Remote", value: "remote" },
    ],
    allowMultipleAnswers: false,
    hasOtherOption: true,
    isShuffle: false,
  },
};

// Multi-select (checkboxes)
const multiChoiceQuestion = {
  displayName: "Which tools do you use daily?",
  questionType: "choice",
  isRequired: false,
  orderIndex: 1,
  choiceOptions: {
    choices: [
      { displayName: "Microsoft Teams", value: "teams" },
      { displayName: "Outlook", value: "outlook" },
      { displayName: "SharePoint", value: "sharepoint" },
      { displayName: "Azure DevOps", value: "ado" },
    ],
    allowMultipleAnswers: true,
    hasOtherOption: false,
    isShuffle: true, // Randomize option order
  },
};
```

### Text (Short or Long Answer)

```typescript
const shortTextQuestion = {
  displayName: "What is your employee ID?",
  questionType: "text",
  isRequired: true,
  orderIndex: 2,
  textOptions: {
    isLongAnswer: false,
    maxLength: 20,
  },
};

const longTextQuestion = {
  displayName: "Describe your biggest challenge this quarter",
  questionType: "text",
  isRequired: false,
  orderIndex: 3,
  textOptions: {
    isLongAnswer: true,
    maxLength: 4000,
  },
};
```

### Rating (Star or Number)

```typescript
const starRatingQuestion = {
  displayName: "Rate your overall experience",
  questionType: "rating",
  isRequired: true,
  orderIndex: 4,
  ratingOptions: {
    ratingScale: 5,
    ratingType: "star",
    lowScoreLabel: "Very Poor",
    highScoreLabel: "Excellent",
  },
};

const npsRatingQuestion = {
  displayName: "How likely are you to recommend us to a colleague?",
  questionType: "rating",
  isRequired: true,
  orderIndex: 5,
  ratingOptions: {
    ratingScale: 10,
    ratingType: "number",
    lowScoreLabel: "Not at all likely",
    highScoreLabel: "Extremely likely",
  },
};
```

### Date

```typescript
const dateQuestion = {
  displayName: "When is your preferred start date?",
  questionType: "date",
  isRequired: true,
  orderIndex: 6,
  dateOptions: {
    includeTime: false,
  },
};

const dateTimeQuestion = {
  displayName: "When would you like to schedule your call?",
  questionType: "date",
  isRequired: true,
  orderIndex: 7,
  dateOptions: {
    includeTime: true,
  },
};
```

### Ranking

```typescript
const rankingQuestion = {
  displayName: "Rank these features by importance to you",
  questionType: "ranking",
  isRequired: false,
  orderIndex: 8,
  rankingOptions: {
    choices: [
      { displayName: "Performance", value: "performance" },
      { displayName: "Security", value: "security" },
      { displayName: "Ease of Use", value: "ease" },
      { displayName: "Cost", value: "cost" },
      { displayName: "Support", value: "support" },
    ],
  },
};
```

### Likert Scale

```typescript
const likertQuestion = {
  displayName: "Please rate your agreement with the following statements",
  questionType: "likert",
  isRequired: true,
  orderIndex: 9,
  likertOptions: {
    columns: [
      { displayName: "Strongly Disagree", value: "1" },
      { displayName: "Disagree", value: "2" },
      { displayName: "Neutral", value: "3" },
      { displayName: "Agree", value: "4" },
      { displayName: "Strongly Agree", value: "5" },
    ],
    rows: [
      { displayName: "I have the tools I need to do my job effectively" },
      { displayName: "My manager provides clear direction and support" },
      { displayName: "I feel my contributions are valued" },
      { displayName: "I have opportunities for professional growth" },
    ],
  },
};
```

### Net Promoter Score (NPS-Style Choice)

```typescript
// NPS via rating (0-10 scale)
const npsQuestion = {
  displayName: "On a scale of 0-10, how likely are you to recommend our product?",
  questionType: "rating",
  isRequired: true,
  orderIndex: 10,
  ratingOptions: {
    ratingScale: 10,
    ratingType: "number",
    lowScoreLabel: "0 — Not at all likely",
    highScoreLabel: "10 — Extremely likely",
  },
};
```

---

## Code Snippets

### TypeScript — Add Multiple Questions to a Form

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

type QuestionBody = Record<string, unknown>;

async function addQuestion(
  client: Client,
  formId: string,
  question: QuestionBody
): Promise<string> {
  const result = await client
    .api(`/me/forms/${formId}/questions`)
    .version("beta")
    .post(question);

  return result.id;
}

async function buildRetrospectiveForm(
  client: Client,
  formId: string
): Promise<void> {
  const questions: QuestionBody[] = [
    {
      displayName: "What went well this sprint?",
      questionType: "text",
      isRequired: true,
      orderIndex: 0,
      textOptions: { isLongAnswer: true, maxLength: 2000 },
    },
    {
      displayName: "What could be improved?",
      questionType: "text",
      isRequired: true,
      orderIndex: 1,
      textOptions: { isLongAnswer: true, maxLength: 2000 },
    },
    {
      displayName: "Rate this sprint's productivity (1-5 stars)",
      questionType: "rating",
      isRequired: true,
      orderIndex: 2,
      ratingOptions: {
        ratingScale: 5,
        ratingType: "star",
        lowScoreLabel: "Very Low",
        highScoreLabel: "Excellent",
      },
    },
    {
      displayName: "How do you feel about team communication?",
      questionType: "choice",
      isRequired: true,
      orderIndex: 3,
      choiceOptions: {
        choices: [
          { displayName: "Great — clear and timely", value: "great" },
          { displayName: "Good — mostly effective", value: "good" },
          { displayName: "Needs improvement", value: "needs-improvement" },
          { displayName: "Poor — major gaps", value: "poor" },
        ],
        allowMultipleAnswers: false,
        hasOtherOption: false,
      },
    },
  ];

  for (const q of questions) {
    await addQuestion(client, formId, q);
    console.log(`Added question: ${q.displayName}`);
  }
}
```

### TypeScript — Add Branching Logic

```typescript
async function addBranchingToChoiceQuestion(
  client: Client,
  formId: string,
  questionId: string,
  rules: Array<{
    matchValue: string;
    targetQuestionId: string;
  }>
): Promise<void> {
  await client
    .api(`/me/forms/${formId}/questions/${questionId}`)
    .version("beta")
    .patch({
      branching: {
        rules: rules.map((r) => ({
          matchValue: r.matchValue,
          targetQuestionId: r.targetQuestionId,
        })),
      },
    });

  console.log(`Branching added to question ${questionId}`);
}

// Example: RSVP form with branching
async function buildRsvpFormWithBranching(
  client: Client,
  formId: string
): Promise<void> {
  // Q1: Are you attending in person?
  const q1 = await addQuestion(client, formId, {
    displayName: "Are you attending in person or remotely?",
    questionType: "choice",
    isRequired: true,
    orderIndex: 0,
    choiceOptions: {
      choices: [
        { displayName: "In person", value: "in-person" },
        { displayName: "Remotely", value: "remote" },
        { displayName: "Not attending", value: "not-attending" },
      ],
      allowMultipleAnswers: false,
      hasOtherOption: false,
    },
  });

  // Q2: Dietary restrictions (for in-person only)
  const q2 = await addQuestion(client, formId, {
    displayName: "Do you have any dietary restrictions?",
    questionType: "text",
    isRequired: false,
    orderIndex: 1,
    textOptions: { isLongAnswer: false, maxLength: 200 },
  });

  // Q3: Time zone (for remote only)
  const q3 = await addQuestion(client, formId, {
    displayName: "What time zone are you in?",
    questionType: "choice",
    isRequired: false,
    orderIndex: 2,
    choiceOptions: {
      choices: [
        { displayName: "US Eastern (ET)", value: "ET" },
        { displayName: "US Pacific (PT)", value: "PT" },
        { displayName: "Central European (CET)", value: "CET" },
        { displayName: "Other", value: "other" },
      ],
      allowMultipleAnswers: false,
      hasOtherOption: false,
    },
  });

  // Q4: Reason for not attending
  const q4 = await addQuestion(client, formId, {
    displayName: "Please let us know why you cannot attend (optional)",
    questionType: "text",
    isRequired: false,
    orderIndex: 3,
    textOptions: { isLongAnswer: false, maxLength: 500 },
  });

  // Add branching to Q1
  await addBranchingToChoiceQuestion(client, formId, q1, [
    { matchValue: "in-person", targetQuestionId: q2 },
    { matchValue: "remote", targetQuestionId: q3 },
    { matchValue: "not-attending", targetQuestionId: q4 },
  ]);
}
```

### TypeScript — Update Question (Make Required / Change Order)

```typescript
async function updateQuestion(
  client: Client,
  formId: string,
  questionId: string,
  updates: {
    isRequired?: boolean;
    displayName?: string;
    orderIndex?: number;
    subtitle?: string;
  }
): Promise<void> {
  await client
    .api(`/me/forms/${formId}/questions/${questionId}`)
    .version("beta")
    .patch(updates);
}
```

### TypeScript — Shuffle and Configure Choice Options

```typescript
async function toggleShuffleOptions(
  client: Client,
  formId: string,
  questionId: string,
  shuffle: boolean
): Promise<void> {
  // Get current question to preserve choiceOptions
  const question = await client
    .api(`/me/forms/${formId}/questions/${questionId}`)
    .version("beta")
    .get();

  const updatedChoiceOptions = {
    ...question.choiceOptions,
    isShuffle: shuffle,
  };

  await client
    .api(`/me/forms/${formId}/questions/${questionId}`)
    .version("beta")
    .patch({ choiceOptions: updatedChoiceOptions });
}
```

### PowerShell — Add Questions to a Form

```powershell
Connect-MgGraph -Scopes "Forms.ReadWrite"

$formId = "YOUR_FORM_ID"

# Add a required choice question
$choiceQ = @{
    displayName = "What team are you on?"
    questionType = "choice"
    isRequired = $true
    orderIndex = 0
    choiceOptions = @{
        choices = @(
            @{ displayName = "Engineering"; value = "eng" }
            @{ displayName = "Product"; value = "product" }
            @{ displayName = "Design"; value = "design" }
            @{ displayName = "Operations"; value = "ops" }
        )
        allowMultipleAnswers = $false
        hasOtherOption = $false
        isShuffle = $false
    }
} | ConvertTo-Json -Depth 10

Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/beta/me/forms/$formId/questions" `
    -Body $choiceQ -ContentType "application/json"

# Add a Likert question
$likertQ = @{
    displayName = "Rate your satisfaction with each area:"
    questionType = "likert"
    isRequired = $true
    orderIndex = 1
    likertOptions = @{
        columns = @(
            @{ displayName = "Very Dissatisfied"; value = "1" }
            @{ displayName = "Dissatisfied"; value = "2" }
            @{ displayName = "Neutral"; value = "3" }
            @{ displayName = "Satisfied"; value = "4" }
            @{ displayName = "Very Satisfied"; value = "5" }
        )
        rows = @(
            @{ displayName = "Work-life balance" }
            @{ displayName = "Manager support" }
            @{ displayName = "Career growth opportunities" }
        )
    }
} | ConvertTo-Json -Depth 10

Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/beta/me/forms/$formId/questions" `
    -Body $likertQ -ContentType "application/json"

# List all questions
$questions = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/beta/me/forms/$formId/questions?`$select=id,displayName,questionType,isRequired,orderIndex"
$questions.value | Sort-Object orderIndex | Format-Table id, displayName, questionType, isRequired
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Missing required fields for question type | Check type-specific required options (e.g., `choiceOptions.choices` for choice type) |
| 400 InvalidQuestionType | Unrecognized `questionType` value | Use supported types: `choice`, `text`, `rating`, `date`, `ranking`, `likert` |
| 400 InvalidBranchingTarget | Target question ID not found in form | Verify target question was created and belongs to the same form |
| 403 AccessDenied | Not form owner | Only the form creator can modify questions |
| 404 ItemNotFound | Form or question not found | Verify IDs; check form still exists |
| 429 QuotaExceeded | Rate limited | Respect `Retry-After`; add delays between bulk question additions |
| 500 GeneralException | Server error | Retry; Forms beta has intermittent availability |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Questions per form | Maximum 100 questions | Split into multiple forms if needed |
| Choice options per question | Maximum 100 options | Keep to <20 for usability |
| Likert rows | Maximum 10 rows | Split large matrices |
| Ranking options | Maximum 10 options | Keep ranking lists manageable |
| Question text length | 255 characters for `displayName` | Keep questions concise |

---

## Common Patterns and Gotchas

### 1. `orderIndex` Controls Display Order — Not Position in Response

Questions are displayed in ascending `orderIndex` order. However, the API returns them in
creation order by default. Always sort by `orderIndex` when rendering questions in sequence.
There are no gaps required between indexes — using 0, 1, 2, 3 is fine.

### 2. Branching Only Works on Single-Select Choice Questions

Branching logic is only supported for `choice` questions with `allowMultipleAnswers: false`.
Multi-select choice questions, text, rating, date, and Likert questions do not support branching.

### 3. `isShuffle: true` Randomizes Per Respondent — Not Globally

When `isShuffle` is set on choice options, each respondent sees the options in a different random
order. The shuffle is per-response, not a single randomized ordering applied to all. This is
useful for preventing systematic response bias.

### 4. `subtitle` is Displayed Under the Question Text

The `subtitle` property provides additional context shown below the question's `displayName`.
Use it to clarify ambiguous questions or provide examples without making the question text too long.

### 5. Quiz Questions Require a `grading` Block for Scoring

For `isQuiz: true` forms, add a `grading` property to each question with `correctAnswers` and
`points`. Without this, the question is included in the quiz but not scored. Text questions can
be left ungraded for manual review.

### 6. Deleting a Question Renumbers Subsequent Questions

After deleting a question, the remaining questions' `orderIndex` values do not automatically
update. To maintain correct sequencing, explicitly PATCH the `orderIndex` of remaining questions
after a delete operation.
