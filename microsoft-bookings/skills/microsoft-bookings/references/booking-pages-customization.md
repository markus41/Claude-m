# Bookings Page Customization — Graph API Reference

## Overview

This reference covers self-service booking page configuration, custom questions, color and
language settings, staff photos, published vs unpublished state, and tracking pixel configuration
via Microsoft Graph API.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/solutions/bookingBusinesses/{id}` | `Bookings.Read.All` | `$select` | Get page settings |
| PATCH | `/solutions/bookingBusinesses/{id}` | `Bookings.ReadWrite.All` | Page config fields | Update page settings |
| POST | `/solutions/bookingBusinesses/{id}/publish` | `Bookings.Manage.All` | — | Make booking page live |
| POST | `/solutions/bookingBusinesses/{id}/unpublish` | `Bookings.Manage.All` | — | Take booking page offline |
| GET | `/solutions/bookingBusinesses/{id}/customQuestions` | `Bookings.Read.All` | `$select` | List custom questions |
| POST | `/solutions/bookingBusinesses/{id}/customQuestions` | `Bookings.ReadWrite.All` | Question body | Create custom question |
| PATCH | `/solutions/bookingBusinesses/{id}/customQuestions/{questionId}` | `Bookings.ReadWrite.All` | Fields to update | Update question |
| DELETE | `/solutions/bookingBusinesses/{id}/customQuestions/{questionId}` | `Bookings.Manage.All` | — | Delete question |

---

## Business Settings Properties

### Page Configuration

| Property | Type | Description |
|----------|------|-------------|
| `displayName` | string | Business name on booking page |
| `email` | string | Contact email shown on page |
| `phone` | string | Contact phone shown on page |
| `webSiteUrl` | string | Link to company website |
| `publicUrl` | string | (Read-only) URL of the published booking page |
| `isPublished` | boolean | Whether the booking page is currently live |
| `defaultCurrencyIso` | string | Currency code (e.g., `"USD"`, `"EUR"`, `"GBP"`) |
| `languageTag` | string | Language for the booking page (e.g., `"en-US"`, `"fr-FR"`) |
| `businessType` | string | Business category (e.g., `"Financial services"`, `"Healthcare"`) |

### Scheduling Policy Properties

| Property | Type | Description |
|----------|------|-------------|
| `timeSlotInterval` | ISO 8601 duration | Interval between available booking slots |
| `minimumLeadTime` | ISO 8601 duration | Min time before a booking can be made |
| `maximumAdvance` | ISO 8601 duration | How far in advance customers can book |
| `sendConfirmationsToOwner` | boolean | Send email notifications to business owner |
| `allowStaffSelection` | boolean | Let customers choose which staff member |
| `sendConfirmationsToStaff` | boolean | Notify assigned staff on booking |

---

## Code Snippets

### TypeScript — Configure Booking Page Settings

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function configureBookingPage(
  client: Client,
  businessId: string,
  settings: {
    displayName?: string;
    email?: string;
    phone?: string;
    webSiteUrl?: string;
    languageTag?: string;
    defaultCurrencyIso?: string;
    businessType?: string;
  }
): Promise<void> {
  const patch: Record<string, unknown> = {};

  if (settings.displayName) patch.displayName = settings.displayName;
  if (settings.email) patch.email = settings.email;
  if (settings.phone) patch.phone = settings.phone;
  if (settings.webSiteUrl) patch.webSiteUrl = settings.webSiteUrl;
  if (settings.languageTag) patch.languageTag = settings.languageTag;
  if (settings.defaultCurrencyIso) patch.defaultCurrencyIso = settings.defaultCurrencyIso;
  if (settings.businessType) patch.businessType = settings.businessType;

  await client
    .api(`/solutions/bookingBusinesses/${businessId}`)
    .patch(patch);

  console.log(`Updated booking page settings for business ${businessId}`);
}

// Example usage
await configureBookingPage(client, businessId, {
  displayName: "Contoso Support Services",
  email: "support@contoso.com",
  phone: "+1-555-0100",
  webSiteUrl: "https://contoso.com",
  languageTag: "en-US",
  defaultCurrencyIso: "USD",
  businessType: "Professional services",
});
```

### TypeScript — Update Scheduling Policy

```typescript
async function updateSchedulingPolicy(
  client: Client,
  businessId: string,
  policy: {
    timeSlotInterval?: string;
    minimumLeadTime?: string;
    maximumAdvance?: string;
    sendConfirmationsToOwner?: boolean;
    allowStaffSelection?: boolean;
  }
): Promise<void> {
  await client
    .api(`/solutions/bookingBusinesses/${businessId}`)
    .patch({ schedulingPolicy: policy });

  console.log("Scheduling policy updated");
}

// Example: Allow booking up to 60 days in advance, 4h minimum lead time
await updateSchedulingPolicy(client, businessId, {
  minimumLeadTime: "PT4H",
  maximumAdvance: "P60D",
  timeSlotInterval: "PT30M",
  allowStaffSelection: true,
  sendConfirmationsToOwner: true,
});
```

### TypeScript — Create Custom Question (Text Input)

```typescript
async function createTextQuestion(
  client: Client,
  businessId: string,
  questionText: string,
  isRequired = false
): Promise<string> {
  const question = await client
    .api(`/solutions/bookingBusinesses/${businessId}/customQuestions`)
    .post({
      displayName: questionText,
      answerInputType: "text",
      answerOptions: [],
    });

  console.log(`Created text question: ${question.id}`);
  return question.id;
}
```

### TypeScript — Create Custom Question (Radio Button / Choice)

```typescript
async function createChoiceQuestion(
  client: Client,
  businessId: string,
  questionText: string,
  options: string[],
  isRequired = false
): Promise<string> {
  const question = await client
    .api(`/solutions/bookingBusinesses/${businessId}/customQuestions`)
    .post({
      displayName: questionText,
      answerInputType: "radioButton",
      answerOptions: options,
    });

  console.log(`Created choice question: ${question.id}`);
  return question.id;
}

// Example
await createChoiceQuestion(
  client,
  businessId,
  "How did you hear about us?",
  ["Website", "Referral", "Social Media", "Search Engine", "Other"]
);
```

### TypeScript — Attach Custom Questions to a Service

```typescript
async function addQuestionsToService(
  client: Client,
  businessId: string,
  serviceId: string,
  questionConfigs: Array<{
    questionId: string;
    isRequired: boolean;
  }>
): Promise<void> {
  const service = await client
    .api(`/solutions/bookingBusinesses/${businessId}/services/${serviceId}`)
    .select("customQuestions")
    .get();

  const existingQuestions = service.customQuestions ?? [];

  const updatedQuestions = [
    ...existingQuestions,
    ...questionConfigs.map(({ questionId, isRequired }) => ({
      questionId,
      question: "", // Will be resolved from the question definition
      isRequired,
      answerInputType: "text",
      answerOptions: [],
    })),
  ];

  await client
    .api(`/solutions/bookingBusinesses/${businessId}/services/${serviceId}`)
    .patch({ customQuestions: updatedQuestions });

  console.log(`Questions added to service ${serviceId}`);
}
```

### TypeScript — Publish / Unpublish Booking Page

```typescript
async function setBookingPageState(
  client: Client,
  businessId: string,
  published: boolean
): Promise<void> {
  const endpoint = published ? "publish" : "unpublish";

  await client
    .api(`/solutions/bookingBusinesses/${businessId}/${endpoint}`)
    .post({});

  console.log(`Booking page ${published ? "published" : "unpublished"} for ${businessId}`);
}

// Get the public URL after publishing
async function getPublicBookingUrl(
  client: Client,
  businessId: string
): Promise<string | null> {
  const business = await client
    .api(`/solutions/bookingBusinesses/${businessId}`)
    .select("publicUrl,isPublished")
    .get();

  if (!business.isPublished) {
    console.warn("Booking page is not published — publicUrl may not be accessible");
  }

  return business.publicUrl ?? null;
}
```

### TypeScript — List and Audit Custom Questions

```typescript
interface CustomQuestion {
  id: string;
  displayName: string;
  answerInputType: string;
  answerOptions: string[];
}

async function auditCustomQuestions(
  client: Client,
  businessId: string
): Promise<CustomQuestion[]> {
  const result = await client
    .api(`/solutions/bookingBusinesses/${businessId}/customQuestions`)
    .select("id,displayName,answerInputType,answerOptions")
    .get();

  console.log(`Business ${businessId} has ${result.value.length} custom questions:`);
  for (const q of result.value) {
    const typeInfo = q.answerInputType === "radioButton"
      ? `choice (${(q.answerOptions ?? []).join(", ")})`
      : "text";
    console.log(`  - "${q.displayName}" [${typeInfo}]`);
  }

  return result.value;
}
```

### TypeScript — Full Booking Page Setup Workflow

```typescript
async function setupBookingPage(
  client: Client,
  businessId: string
): Promise<void> {
  // 1. Configure basic page settings
  await configureBookingPage(client, businessId, {
    displayName: "Contoso Support Portal",
    email: "support@contoso.com",
    languageTag: "en-US",
  });

  // 2. Set scheduling policy
  await updateSchedulingPolicy(client, businessId, {
    minimumLeadTime: "PT2H",
    maximumAdvance: "P30D",
    allowStaffSelection: false,
    sendConfirmationsToOwner: true,
  });

  // 3. Create intake questions
  const questionId1 = await createTextQuestion(
    client, businessId, "Please describe your issue briefly", false
  );
  const questionId2 = await createChoiceQuestion(
    client, businessId, "Issue category",
    ["Technical", "Billing", "Account", "Other"], false
  );

  // 4. Publish the page
  await setBookingPageState(client, businessId, true);

  // 5. Get the public URL
  const url = await getPublicBookingUrl(client, businessId);
  console.log(`Booking page live at: ${url}`);
}
```

### PowerShell — Booking Page Configuration

```powershell
Connect-MgGraph -Scopes "Bookings.Manage.All"

$businessId = "YOUR_BUSINESS_ID"

# Update page settings
$settingsBody = @{
    displayName = "Contoso IT Support"
    email = "itsupport@contoso.com"
    phone = "+1-555-0199"
    languageTag = "en-US"
    defaultCurrencyIso = "USD"
    schedulingPolicy = @{
        minimumLeadTime = "PT2H"
        maximumAdvance = "P30D"
        timeSlotInterval = "PT30M"
        allowStaffSelection = $true
        sendConfirmationsToOwner = $true
    }
} | ConvertTo-Json -Depth 10

Invoke-MgGraphRequest -Method PATCH `
    -Uri "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/$businessId" `
    -Body $settingsBody -ContentType "application/json"

# Create a custom text question
$questionBody = @{
    displayName = "Please describe the issue you need help with"
    answerInputType = "text"
    answerOptions = @()
} | ConvertTo-Json

Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/$businessId/customQuestions" `
    -Body $questionBody -ContentType "application/json"

# Publish the booking page
Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/$businessId/publish"

# Get the public URL
$business = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/$businessId?`$select=publicUrl,isPublished"
Write-Host "Public URL: $($business.publicUrl)"
Write-Host "Is Published: $($business.isPublished)"
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Invalid property value (e.g., invalid languageTag) | Check supported language codes and currency ISO codes |
| 400 InvalidQuestionType | Unsupported `answerInputType` | Use `"text"` or `"radioButton"` only |
| 403 Forbidden | Publish requires `Bookings.Manage.All` | Grant higher permission scope |
| 403 pageAlreadyPublished | Cannot publish already-published page | No action needed; page is already live |
| 404 NotFound | Business ID not found | Verify business exists via GET list |
| 409 Conflict | Setting change conflicts with existing data | Review business state before patching |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Settings updates | Standard Graph limits | Batch settings into a single PATCH call |
| Custom questions per business | No documented hard limit; practical ~20 | Keep questions focused; re-use across services |
| Languages supported | All M365-supported locales | Check Microsoft Learn for full list |

---

## Common Patterns and Gotchas

### 1. `publicUrl` Is Read-Only — Set by the Server

The `publicUrl` of the booking page is automatically generated by Bookings when the business is
created. You cannot set a custom URL. After publishing, retrieve it with `GET /solutions/bookingBusinesses/{id}?$select=publicUrl`.

### 2. Custom Questions Require Re-Attachment to Services

Creating a custom question at the business level does NOT automatically add it to services.
You must separately PATCH each service to include the `customQuestions` array with the
question's ID.

### 3. `answerInputType` Only Supports Two Values

Only `"text"` (free text) and `"radioButton"` (multiple choice) are currently supported. The
`"unknownFutureValue"` placeholder exists in the schema but should not be used.

### 4. `languageTag` Affects All Customer-Facing Content

The `languageTag` setting changes the language of confirmation emails, reminder emails, and
the booking page UI. It does not affect the Graph API response language, which is always
in the content of the properties you set.

### 5. `isPublished` Is Read-Only — Use publish/unpublish Actions

You cannot set `isPublished: true` via PATCH. Use the dedicated `publish` and `unpublish`
action endpoints. Attempting to set `isPublished` directly in a PATCH body is silently ignored.

### 6. Staff Photos Are Set via Microsoft 365 Admin Center

The Bookings API does not support setting staff member photos. Staff photos on the booking
page come from the user's Microsoft 365 profile photo. Update staff photos in the Microsoft 365
Admin Center or via `PATCH /users/{userId}/photo/$value` in the User API.

### 7. Tracking Pixel Is Not Exposed via Graph API

The Microsoft Bookings web UI allows adding a tracking pixel to the booking page. This setting
is NOT available via the Graph API and can only be configured through the Bookings web application
at `outlook.office.com/bookings`.
