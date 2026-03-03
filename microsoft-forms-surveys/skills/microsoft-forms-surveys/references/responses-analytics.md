# Forms Responses & Analytics — Graph API Reference

## Overview

This reference covers getting form responses, individual response details, summary statistics,
exporting to Excel, Power Automate triggers for new responses, and the Forms insights API via
Microsoft Graph beta endpoint.

Base URL: `https://graph.microsoft.com/beta`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/forms/{formId}/responses` | `Forms.Read` | `$top`, `$skip`, `$orderby`, `$filter`, `$select` | List all responses |
| GET | `/me/forms/{formId}/responses/{responseId}` | `Forms.Read` | — | Get individual response |
| GET | `/me/forms/{formId}/questions` | `Forms.Read` | `$select` | Get questions (for answer key mapping) |
| GET | `/me/forms/{formId}` | `Forms.Read` | `$select=responseCount` | Get total response count |

---

## Code Snippets

### TypeScript — Fetch All Responses with Pagination

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface FormResponse {
  id: string;
  submitDateTime: string;
  answers: Array<{
    questionId: string;
    value?: string | string[];
    textValue?: string;
  }>;
  respondent?: {
    displayName?: string;
    id?: string;
    email?: string;
  };
}

async function getAllResponses(
  client: Client,
  formId: string
): Promise<FormResponse[]> {
  const responses: FormResponse[] = [];
  let url = `/me/forms/${formId}/responses?$top=100&$orderby=submitDateTime asc`;

  while (url) {
    const page = await client.api(url).version("beta").get();
    responses.push(...page.value);
    url = page["@odata.nextLink"] ?? null;
  }

  console.log(`Total responses: ${responses.length}`);
  return responses;
}
```

### TypeScript — Get Questions Map for Answer Key

```typescript
interface QuestionInfo {
  id: string;
  displayName: string;
  questionType: string;
  orderIndex: number;
}

async function getQuestionsMap(
  client: Client,
  formId: string
): Promise<Map<string, QuestionInfo>> {
  const result = await client
    .api(`/me/forms/${formId}/questions`)
    .version("beta")
    .select("id,displayName,questionType,orderIndex")
    .get();

  const map = new Map<string, QuestionInfo>();
  for (const q of result.value) {
    map.set(q.id, q);
  }
  return map;
}
```

### TypeScript — Aggregate Choice Question Results

```typescript
function aggregateChoiceResults(
  responses: FormResponse[],
  questionId: string
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const response of responses) {
    const answer = response.answers.find((a) => a.questionId === questionId);
    if (!answer) continue;

    const values = Array.isArray(answer.value)
      ? answer.value
      : answer.value
      ? [answer.value]
      : [];

    for (const v of values) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }

  return counts;
}

function printChoiceResults(
  counts: Map<string, number>,
  questionText: string,
  total: number
): void {
  console.log(`\nQuestion: "${questionText}" (${total} responses)`);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [option, count] of sorted) {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
    const bar = "#".repeat(Math.round(count / total * 20));
    console.log(`  ${option.padEnd(30)} ${bar.padEnd(20)} ${count} (${pct}%)`);
  }
}
```

### TypeScript — Calculate Average Rating and Distribution

```typescript
function aggregateRatingResults(
  responses: FormResponse[],
  questionId: string,
  maxRating: number
): { avg: number; median: number; distribution: Map<number, number> } {
  const distribution = new Map<number, number>();
  for (let i = 1; i <= maxRating; i++) distribution.set(i, 0);

  const values: number[] = [];

  for (const response of responses) {
    const answer = response.answers.find((a) => a.questionId === questionId);
    if (!answer?.value) continue;

    const rating = parseInt(String(answer.value), 10);
    if (!isNaN(rating) && rating >= 1 && rating <= maxRating) {
      values.push(rating);
      distribution.set(rating, (distribution.get(rating) ?? 0) + 1);
    }
  }

  if (values.length === 0) return { avg: 0, median: 0, distribution };

  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  return { avg: Math.round(avg * 10) / 10, median, distribution };
}
```

### TypeScript — Calculate NPS Score

```typescript
function calculateNPS(responses: FormResponse[], questionId: string): {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
} {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let total = 0;

  for (const response of responses) {
    const answer = response.answers.find((a) => a.questionId === questionId);
    if (!answer?.value) continue;

    const rating = parseInt(String(answer.value), 10);
    if (isNaN(rating)) continue;

    total++;
    if (rating >= 9) promoters++;
    else if (rating >= 7) passives++;
    else detractors++;
  }

  const score = total > 0
    ? Math.round(((promoters - detractors) / total) * 100)
    : 0;

  return { score, promoters, passives, detractors, total };
}
```

### TypeScript — Aggregate Likert Results

```typescript
function aggregateLikertResults(
  responses: FormResponse[],
  questionId: string
): Map<string, { avg: number; count: number }> {
  const rowStats = new Map<string, { sum: number; count: number }>();

  for (const response of responses) {
    const answer = response.answers.find((a) => a.questionId === questionId);
    if (!answer) continue;

    // Likert answers are typically key-value pairs: rowId -> columnValue
    const answerObj = answer as any;
    if (typeof answerObj.value === "object" && !Array.isArray(answerObj.value)) {
      for (const [rowId, colValue] of Object.entries(answerObj.value)) {
        const score = parseInt(String(colValue), 10);
        if (!isNaN(score)) {
          const existing = rowStats.get(rowId) ?? { sum: 0, count: 0 };
          rowStats.set(rowId, { sum: existing.sum + score, count: existing.count + 1 });
        }
      }
    }
  }

  const result = new Map<string, { avg: number; count: number }>();
  for (const [rowId, stats] of rowStats) {
    result.set(rowId, {
      avg: Math.round((stats.sum / stats.count) * 10) / 10,
      count: stats.count,
    });
  }
  return result;
}
```

### TypeScript — Full Response Report Generation

```typescript
async function generateFormReport(
  client: Client,
  formId: string
): Promise<string> {
  const [questionsMap, responses, formMeta] = await Promise.all([
    getQuestionsMap(client, formId),
    getAllResponses(client, formId),
    client.api(`/me/forms/${formId}`).version("beta").select("title,responseCount").get(),
  ]);

  const lines: string[] = [];
  lines.push(`# Form Report: ${formMeta.title}`);
  lines.push(`Total Responses: ${responses.length}`);
  lines.push(`Generated: ${new Date().toISOString()}\n`);

  for (const [questionId, question] of questionsMap) {
    lines.push(`## ${question.orderIndex + 1}. ${question.displayName}`);

    if (question.questionType === "choice") {
      const counts = aggregateChoiceResults(responses, questionId);
      for (const [option, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
        const pct = responses.length > 0
          ? ((count / responses.length) * 100).toFixed(1)
          : "0.0";
        lines.push(`- ${option}: ${count} (${pct}%)`);
      }
    } else if (question.questionType === "rating") {
      const { avg, median } = aggregateRatingResults(responses, questionId, 10);
      lines.push(`- Average: ${avg}`);
      lines.push(`- Median: ${median}`);
    } else if (question.questionType === "text") {
      const textAnswers = responses
        .map((r) => r.answers.find((a) => a.questionId === questionId)?.textValue)
        .filter(Boolean);
      lines.push(`- ${textAnswers.length} text responses`);
      textAnswers.slice(0, 5).forEach((t) => lines.push(`  > "${t}"`));
      if (textAnswers.length > 5) {
        lines.push(`  ... and ${textAnswers.length - 5} more`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}
```

### PowerShell — Export Responses Analysis

```powershell
Connect-MgGraph -Scopes "Forms.Read"

$formId = "YOUR_FORM_ID"

# Get form metadata
$form = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/beta/me/forms/$formId?`$select=title,responseCount,status"
Write-Host "Form: $($form.title) | Status: $($form.status) | Responses: $($form.responseCount)"

# Fetch all responses (paginated)
$allResponses = @()
$url = "https://graph.microsoft.com/beta/me/forms/$formId/responses?`$top=100&`$orderby=submitDateTime asc"

do {
    $page = Invoke-MgGraphRequest -Method GET -Uri $url
    $allResponses += $page.value
    $url = $page.'@odata.nextLink'
} while ($url)

Write-Host "Fetched $($allResponses.Count) responses"

# Get questions for mapping
$questions = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/beta/me/forms/$formId/questions?`$select=id,displayName,questionType,orderIndex"
$qMap = @{}
$questions.value | ForEach-Object { $qMap[$_.id] = $_ }

# Summarize responses by submission date
$allResponses | Group-Object {
    [DateTime]$_.submitDateTime | Get-Date -Format "yyyy-MM-dd"
} | Sort-Object Name | Select-Object Name, Count | Format-Table

# For choice questions, count each option
foreach ($question in ($questions.value | Where-Object { $_.questionType -eq "choice" })) {
    Write-Host "`nQuestion: $($question.displayName)"
    $optionCounts = @{}
    foreach ($response in $allResponses) {
        $answer = $response.answers | Where-Object { $_.questionId -eq $question.id }
        if ($answer -and $answer.value) {
            $vals = if ($answer.value -is [array]) { $answer.value } else { @($answer.value) }
            foreach ($v in $vals) {
                if (-not $optionCounts.ContainsKey($v)) { $optionCounts[$v] = 0 }
                $optionCounts[$v]++
            }
        }
    }
    $optionCounts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
        $pct = if ($allResponses.Count -gt 0) { [Math]::Round($_.Value / $allResponses.Count * 100, 1) } else { 0 }
        Write-Host "  $($_.Key): $($_.Value) ($pct%)"
    }
}
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 403 AccessDenied | Not form owner or responses sharing not enabled | Verify form ownership; check sharing settings |
| 404 ItemNotFound | Form or response not found | Verify form ID and response ID |
| 429 QuotaExceeded | Rate limited | Use `$top=100` and paginate; add delays |
| 500 GeneralException | Server error | Retry with backoff |
| 502 BadGateway | Beta endpoint instability | Retry; consider implementing circuit breaker |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Response reads | ~600 requests/10 min | Use `$top=100` max per page |
| Maximum responses per form | No documented limit; Forms UI recommends <5000 | Export to Excel for large data sets |
| Response retention | Responses persist as long as form exists | Export before deleting forms |
| `$skip` pagination limit | Use `@odata.nextLink` instead of manual skip | Always follow `nextLink` |

---

## Common Patterns and Gotchas

### 1. Answer Format Varies by Question Type

Response answer objects have different shapes per question type:
- Choice: `answer.value` is a string (single) or array of strings (multi-select)
- Text: `answer.textValue` is a string
- Rating: `answer.value` is a numeric string (e.g., `"4"`)
- Date: `answer.value` is an ISO date string
- Likert: `answer.value` is an object mapping row IDs to column values

Always check `question.questionType` before parsing answer values.

### 2. `responseCount` on the Form Is Eventually Consistent

The `responseCount` property on the form object is updated asynchronously and may lag a few
minutes behind the actual count of response objects. For accurate counts, fetch responses and
count programmatically.

### 3. Anonymous Forms Have No Respondent Info

If `isAnonymous: true` on the form, the `respondent` property on responses will be null or empty.
If you need respondent identification, ensure `isRecordingNames: true` is set on the form.

### 4. Power Automate Trigger Is More Reliable Than Polling

For real-time response processing, use the "When a new response is submitted" Power Automate
trigger rather than polling the Graph API. Power Automate processes each submission immediately
without rate limit concerns.

### 5. Export to Excel Is a Web-Only Feature

The Microsoft Forms web application offers a built-in "Open in Excel" export. This feature is
not available via the Graph API. For programmatic Excel export, fetch all responses via the API
and use `exceljs` or similar to generate the workbook.

### 6. Text Responses Require Careful Handling for PII

Long-text answers may contain personally identifiable information (PII) from respondents. When
storing or processing text responses, ensure your data handling complies with your organization's
data governance policies and applicable regulations (GDPR, HIPAA, etc.).
