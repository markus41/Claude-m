# Microsoft Forms Creation — Graph API Reference

## Overview

This reference covers Forms Graph API (beta endpoints) — creating, updating, and deleting forms;
form types (quiz vs survey); settings including who can fill, response limits, and start/end dates.

Base URL: `https://graph.microsoft.com/beta`

**Important**: All Forms endpoints are in the beta endpoint only. They are not available at
`/v1.0`. Schema and behavior may change without notice.

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/me/forms` | `Forms.Read` | `$select`, `$top`, `$orderby` | List user's forms |
| GET | `/me/forms/{formId}` | `Forms.Read` | `$select` | Get form metadata |
| POST | `/me/forms` | `Forms.ReadWrite` | `title`, `description` | Create form |
| PATCH | `/me/forms/{formId}` | `Forms.ReadWrite` | Any form fields | Update form |
| DELETE | `/me/forms/{formId}` | `Forms.ReadWrite` | — | Delete form |
| GET | `/groups/{groupId}/forms` | `Forms.Read`, `Group.Read.All` | — | Group-owned forms |
| POST | `/groups/{groupId}/forms` | `Forms.ReadWrite`, `Group.ReadWrite.All` | `title` | Create group form |

### Form Status Values

| Status | Description | Accepts Responses |
|--------|-------------|-------------------|
| `draft` | Not yet published | No |
| `active` | Published and accepting responses | Yes |
| `closed` | Published but no longer accepting | No |

---

## Code Snippets

### TypeScript — Create a Basic Survey

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function createSurvey(
  client: Client,
  title: string,
  description: string
): Promise<{ id: string; webUrl: string }> {
  const form = await client
    .api("/me/forms")
    .version("beta")
    .post({
      title,
      description,
    });

  console.log(`Created survey: ${form.id}`);
  console.log(`Web URL: ${form.webUrl}`);
  return { id: form.id, webUrl: form.webUrl };
}
```

### TypeScript — Create a Quiz

```typescript
async function createQuiz(
  client: Client,
  title: string,
  description: string
): Promise<{ id: string; webUrl: string }> {
  const form = await client
    .api("/me/forms")
    .version("beta")
    .post({
      title,
      description,
      isQuiz: true,
    });

  return { id: form.id, webUrl: form.webUrl };
}
```

### TypeScript — Publish a Form (Make Active)

```typescript
async function publishForm(client: Client, formId: string): Promise<void> {
  await client
    .api(`/me/forms/${formId}`)
    .version("beta")
    .patch({ status: "active" });

  console.log(`Form ${formId} published`);
}

async function closeForm(client: Client, formId: string): Promise<void> {
  await client
    .api(`/me/forms/${formId}`)
    .version("beta")
    .patch({ status: "closed" });

  console.log(`Form ${formId} closed`);
}
```

### TypeScript — Set Response Limit and Date Range

```typescript
async function setFormSettings(
  client: Client,
  formId: string,
  settings: {
    maxResponseCount?: number;
    startDateTime?: Date;
    endDateTime?: Date;
    isRecordingNames?: boolean;
    isAnonymous?: boolean;
  }
): Promise<void> {
  const patch: Record<string, unknown> = {};

  if (settings.maxResponseCount !== undefined) {
    patch.responseCount = settings.maxResponseCount;
  }
  if (settings.startDateTime) {
    patch.startDateTime = settings.startDateTime.toISOString();
  }
  if (settings.endDateTime) {
    patch.endDateTime = settings.endDateTime.toISOString();
  }
  if (settings.isRecordingNames !== undefined) {
    patch.isRecordingNames = settings.isRecordingNames;
  }
  if (settings.isAnonymous !== undefined) {
    patch.isAnonymous = settings.isAnonymous;
  }

  await client
    .api(`/me/forms/${formId}`)
    .version("beta")
    .patch(patch);

  console.log(`Form settings updated for ${formId}`);
}

// Example: Close form after 100 responses, open for 7 days
const now = new Date();
const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

await setFormSettings(client, formId, {
  maxResponseCount: 100,
  startDateTime: now,
  endDateTime: weekLater,
});
```

### TypeScript — Create a Group-Owned Form (Shared Editing)

```typescript
async function createGroupForm(
  client: Client,
  groupId: string,
  title: string,
  description: string
): Promise<{ id: string; webUrl: string }> {
  const form = await client
    .api(`/groups/${groupId}/forms`)
    .version("beta")
    .post({ title, description });

  return { id: form.id, webUrl: form.webUrl };
}
```

### TypeScript — List All User Forms with Status

```typescript
interface FormSummary {
  id: string;
  title: string;
  status: string;
  createdDateTime: string;
  responseCount: number;
  webUrl: string;
}

async function listForms(client: Client): Promise<FormSummary[]> {
  let url = "/me/forms?$select=id,title,status,createdDateTime,responseCount,webUrl&$top=50";
  const forms: FormSummary[] = [];

  while (url) {
    const response = await client.api(url).version("beta").get();
    forms.push(...response.value);
    url = response["@odata.nextLink"] ?? null;
  }

  return forms;
}
```

### TypeScript — Duplicate a Form (Create Copy Pattern)

```typescript
async function duplicateForm(
  client: Client,
  sourceFormId: string,
  newTitle: string
): Promise<string> {
  // Get source form structure
  const sourceForm = await client
    .api(`/me/forms/${sourceFormId}`)
    .version("beta")
    .select("title,description,isQuiz")
    .get();

  const sourceQuestions = await client
    .api(`/me/forms/${sourceFormId}/questions`)
    .version("beta")
    .get();

  // Create new form
  const newForm = await client
    .api("/me/forms")
    .version("beta")
    .post({
      title: newTitle,
      description: sourceForm.description,
      isQuiz: sourceForm.isQuiz ?? false,
    });

  // Re-create questions in order
  const sortedQuestions = [...sourceQuestions.value].sort(
    (a: any, b: any) => a.orderIndex - b.orderIndex
  );

  for (const question of sortedQuestions) {
    const { id: _id, formId: _formId, ...questionBody } = question;
    await client
      .api(`/me/forms/${newForm.id}/questions`)
      .version("beta")
      .post(questionBody);
  }

  console.log(`Duplicated form to: ${newForm.id}`);
  return newForm.id;
}
```

### TypeScript — Delete a Form

```typescript
async function deleteForm(client: Client, formId: string): Promise<void> {
  await client
    .api(`/me/forms/${formId}`)
    .version("beta")
    .delete();

  console.log(`Form ${formId} deleted`);
}
```

### PowerShell — Form Lifecycle Management

```powershell
# NOTE: Microsoft.Graph PowerShell module uses v1.0 by default
# For beta, use Invoke-MgGraphRequest with explicit beta URL

Connect-MgGraph -Scopes "Forms.ReadWrite"

# Create a form
$formBody = @{
    title = "Q2 Employee Feedback"
    description = "Share your thoughts on Q2 initiatives"
} | ConvertTo-Json

$form = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/beta/me/forms" `
    -Body $formBody -ContentType "application/json"

Write-Host "Created form: $($form.id)"
Write-Host "Web URL: $($form.webUrl)"

# Publish the form
$publishBody = @{ status = "active" } | ConvertTo-Json
Invoke-MgGraphRequest -Method PATCH `
    -Uri "https://graph.microsoft.com/beta/me/forms/$($form.id)" `
    -Body $publishBody -ContentType "application/json"

Write-Host "Form published"

# List all forms with their status
$forms = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/beta/me/forms?`$select=id,title,status,responseCount,createdDateTime"
$forms.value | Sort-Object createdDateTime -Descending | `
    Select-Object title, status, responseCount, createdDateTime | Format-Table

# Close a form
$closeBody = @{ status = "closed" } | ConvertTo-Json
Invoke-MgGraphRequest -Method PATCH `
    -Uri "https://graph.microsoft.com/beta/me/forms/$($form.id)" `
    -Body $closeBody -ContentType "application/json"
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Malformed form body or invalid status value | Valid statuses: `draft`, `active`, `closed` |
| 400 InvalidRequest | Missing title field | `title` is required on form creation |
| 403 AccessDenied | User does not own the form | Only the form owner can update/delete |
| 403 Forbidden | Missing `Forms.ReadWrite` scope | Ensure delegated permission is granted |
| 404 ItemNotFound | Form ID does not exist | Verify form ID; may have been deleted |
| 405 MethodNotAllowed | Wrong HTTP method | Check API docs for supported methods |
| 429 QuotaExceeded | Rate limited | Respect `Retry-After` header |
| 500 GeneralException | Server error | Retry with exponential backoff |
| 502 BadGateway | Upstream service error | Forms beta can be intermittently unstable; retry |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Form reads per user | ~600 per 10 minutes | Cache form metadata |
| Form writes per user | ~300 per 10 minutes | Queue form creation/updates |
| Maximum forms per user | No documented limit; practical ~200 | Archive old forms |
| Maximum form title length | 255 characters | Keep titles concise |
| Maximum description length | 1000 characters | Summarize in description |
| Maximum response count setting | Configurable; no platform limit | Set based on use case |

---

## Common Patterns and Gotchas

### 1. Beta Endpoint Only — Breaking Changes Expected

All Forms Graph API endpoints are at `https://graph.microsoft.com/beta`. This means Microsoft
may change request bodies, response schemas, or deprecate endpoints without the usual v1.0
deprecation notice. Always document the API version in your code and monitor Microsoft 365
developer blog for beta endpoint changes.

### 2. New Forms Start in Draft Status

A newly created form is in `draft` status and will NOT accept responses. Always call
`PATCH /me/forms/{id}` with `status: "active"` before sharing the `webUrl` with respondents.

### 3. `responseCount` Is the Response Limit, Not the Current Count

The `responseCount` property on forms is used to SET a maximum response limit (how many
submissions are allowed). It is not a counter of current responses. Use
`GET /me/forms/{formId}/responses` and count the `value` array for the current count.

### 4. Forms API Requires Delegated Permissions Only

Application permissions are not available for the Forms beta API. All operations must be
performed on behalf of a signed-in user (delegated context). Daemon/service automation
of form creation is not supported without a user principal.

### 5. Group Forms Require `Group.ReadWrite.All`

Creating a form under a Microsoft 365 Group requires both `Forms.ReadWrite` and
`Group.ReadWrite.All` permissions. The form is owned by the group, enabling shared editing
by all group members.

### 6. `webUrl` is the Respondent URL — Not the Editor URL

The `webUrl` returned in the form response is the URL for respondents to fill out the form.
The editing URL (for form owners) is different and only accessible via the Forms web application
at `forms.office.com`. There is no Graph API property for the editor URL.

### 7. Deleting a Form Deletes All Responses

`DELETE /me/forms/{formId}` permanently deletes the form AND all its responses. This is
irreversible. Export responses before deleting if the data is needed.
