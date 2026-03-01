---
name: Microsoft Bookings
description: >
  Deep expertise in Microsoft Bookings via Graph API — manage booking businesses, services,
  staff members, customer appointments, availability checks, and scheduling policies
  for small teams that schedule client meetings, demos, and consultations.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - bookings
  - appointments
  - scheduling
  - staff availability
  - booking calendar
  - book appointment
  - service booking
---

# Microsoft Bookings via Graph API

Microsoft Bookings is a scheduling tool in Microsoft 365 that lets organizations manage appointment-based services. Customers can self-schedule through a public booking page, and staff receive calendar integrations with Teams meeting links. This skill covers the full Graph API surface for Bookings.

## Base URL

```
https://graph.microsoft.com/v1.0
```

All endpoints below are relative to this base URL.

## API Endpoints

### Booking Businesses

A booking business represents a company or team that offers bookable services.

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List businesses | GET | `/solutions/bookingBusinesses` |
| Get business | GET | `/solutions/bookingBusinesses/{id}` |
| Create business | POST | `/solutions/bookingBusinesses` |
| Update business | PATCH | `/solutions/bookingBusinesses/{id}` |
| Delete business | DELETE | `/solutions/bookingBusinesses/{id}` |
| Publish booking page | POST | `/solutions/bookingBusinesses/{id}/publish` |
| Unpublish booking page | POST | `/solutions/bookingBusinesses/{id}/unpublish` |

**Create business body**:
```json
{
  "displayName": "Contoso Consulting",
  "address": {
    "street": "123 Main St",
    "city": "Seattle",
    "state": "WA",
    "postalCode": "98101",
    "countryOrRegion": "US"
  },
  "phone": "555-0100",
  "email": "bookings@contoso.com",
  "webSiteUrl": "https://contoso.com",
  "defaultCurrencyIso": "USD",
  "businessType": "Financial services",
  "businessHours": [
    {
      "day": "monday",
      "timeSlots": [
        {
          "startTime": "08:00:00.0000000",
          "endTime": "17:00:00.0000000"
        }
      ]
    },
    {
      "day": "tuesday",
      "timeSlots": [
        {
          "startTime": "08:00:00.0000000",
          "endTime": "17:00:00.0000000"
        }
      ]
    },
    {
      "day": "wednesday",
      "timeSlots": [
        {
          "startTime": "08:00:00.0000000",
          "endTime": "17:00:00.0000000"
        }
      ]
    },
    {
      "day": "thursday",
      "timeSlots": [
        {
          "startTime": "08:00:00.0000000",
          "endTime": "17:00:00.0000000"
        }
      ]
    },
    {
      "day": "friday",
      "timeSlots": [
        {
          "startTime": "08:00:00.0000000",
          "endTime": "17:00:00.0000000"
        }
      ]
    }
  ],
  "schedulingPolicy": {
    "timeSlotInterval": "PT30M",
    "minimumLeadTime": "PT2H",
    "maximumAdvance": "P30D",
    "sendConfirmationsToOwner": true,
    "allowStaffSelection": true
  }
}
```

### Services

Services define what customers can book (consultations, demos, onboarding sessions, etc.).

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List services | GET | `/solutions/bookingBusinesses/{id}/services` |
| Get service | GET | `/solutions/bookingBusinesses/{id}/services/{serviceId}` |
| Create service | POST | `/solutions/bookingBusinesses/{id}/services` |
| Update service | PATCH | `/solutions/bookingBusinesses/{id}/services/{serviceId}` |
| Delete service | DELETE | `/solutions/bookingBusinesses/{id}/services/{serviceId}` |

**Create service body**:
```json
{
  "displayName": "Initial Consultation",
  "description": "30-minute introductory meeting to discuss your needs and how we can help.",
  "defaultDuration": "PT30M",
  "defaultPrice": 0,
  "defaultPriceType": "notSet",
  "isLocationOnline": true,
  "defaultLocation": {
    "displayName": "Microsoft Teams Meeting",
    "locationType": "default"
  },
  "staffMemberIds": ["<staff-id-1>", "<staff-id-2>"],
  "schedulingPolicy": {
    "allowStaffSelection": true,
    "minimumLeadTime": "PT2H",
    "maximumAdvance": "P30D",
    "sendConfirmationsToOwner": true,
    "timeSlotInterval": "PT30M"
  },
  "preBuffer": "PT0S",
  "postBuffer": "PT10M",
  "defaultReminders": [
    {
      "offset": "P1D",
      "recipients": "allAttendees",
      "message": "Reminder: You have an upcoming appointment tomorrow."
    }
  ],
  "customQuestions": [
    {
      "questionId": "",
      "question": "What topics would you like to discuss?",
      "answerInputType": "text",
      "isRequired": false
    }
  ]
}
```

**Price types**: `undefined`, `notSet`, `free`, `fixedPrice`, `startingAt`, `hourly`, `callUs`.

**Duration format**: ISO 8601 durations — `PT15M` (15 min), `PT30M` (30 min), `PT1H` (1 hour), `PT1H30M` (90 min).

### Staff Members

Staff members are the people who deliver services and have their availability managed.

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List staff members | GET | `/solutions/bookingBusinesses/{id}/staffMembers` |
| Get staff member | GET | `/solutions/bookingBusinesses/{id}/staffMembers/{staffId}` |
| Create staff member | POST | `/solutions/bookingBusinesses/{id}/staffMembers` |
| Update staff member | PATCH | `/solutions/bookingBusinesses/{id}/staffMembers/{staffId}` |
| Delete staff member | DELETE | `/solutions/bookingBusinesses/{id}/staffMembers/{staffId}` |

**Create staff member body**:
```json
{
  "displayName": "Alex Johnson",
  "emailAddress": "alex@contoso.com",
  "role": "member",
  "useBusinessHours": true,
  "workingHours": [
    {
      "day": "monday",
      "timeSlots": [
        {
          "startTime": "09:00:00.0000000",
          "endTime": "17:00:00.0000000"
        }
      ]
    }
  ],
  "availabilityIsAffectedByPersonalCalendar": true,
  "isEmailNotificationEnabled": true,
  "timeZone": "America/Chicago"
}
```

**Staff roles**: `administrator`, `viewer`, `externalGuest`, `member`, `scheduler`.

**Important**: When `availabilityIsAffectedByPersonalCalendar` is `true`, the staff member's Outlook calendar events block Bookings slots. This prevents double-booking.

### Appointments

Appointments represent confirmed bookings between a customer and a staff member for a specific service.

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List appointments | GET | `/solutions/bookingBusinesses/{id}/appointments` |
| Get appointment | GET | `/solutions/bookingBusinesses/{id}/appointments/{appointmentId}` |
| Create appointment | POST | `/solutions/bookingBusinesses/{id}/appointments` |
| Update appointment | PATCH | `/solutions/bookingBusinesses/{id}/appointments/{appointmentId}` |
| Delete (cancel) appointment | DELETE | `/solutions/bookingBusinesses/{id}/appointments/{appointmentId}` |
| Cancel appointment | POST | `/solutions/bookingBusinesses/{id}/appointments/{appointmentId}/cancel` |

**Create appointment body**:
```json
{
  "serviceId": "<service-id>",
  "serviceName": "Initial Consultation",
  "startDateTime": {
    "dateTime": "2026-03-10T14:00:00.0000000",
    "timeZone": "America/Chicago"
  },
  "endDateTime": {
    "dateTime": "2026-03-10T14:30:00.0000000",
    "timeZone": "America/Chicago"
  },
  "staffMemberIds": ["<staff-id>"],
  "customers": [
    {
      "@odata.type": "#microsoft.graph.bookingCustomerInformation",
      "name": "Jane Smith",
      "emailAddress": "jane@customer.com",
      "phone": "555-0123",
      "timeZone": "America/New_York",
      "customQuestionAnswers": [
        {
          "questionId": "<question-id>",
          "question": "What topics would you like to discuss?",
          "answer": "Pricing and onboarding timeline"
        }
      ]
    }
  ],
  "serviceNotes": "First-time client, referred by partner program.",
  "isLocationOnline": true,
  "optOutOfCustomerEmail": false
}
```

**Cancel appointment body**:
```json
{
  "cancellationMessage": "We apologize, but we need to reschedule this appointment. We will contact you shortly with new options."
}
```

### Customers

Customers are the people who book appointments.

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List customers | GET | `/solutions/bookingBusinesses/{id}/customers` |
| Get customer | GET | `/solutions/bookingBusinesses/{id}/customers/{customerId}` |
| Create customer | POST | `/solutions/bookingBusinesses/{id}/customers` |
| Update customer | PATCH | `/solutions/bookingBusinesses/{id}/customers/{customerId}` |
| Delete customer | DELETE | `/solutions/bookingBusinesses/{id}/customers/{customerId}` |

**Create customer body**:
```json
{
  "displayName": "Jane Smith",
  "emailAddress": "jane@customer.com",
  "phone": "555-0123",
  "addresses": [
    {
      "street": "456 Oak Ave",
      "city": "Portland",
      "state": "OR",
      "postalCode": "97201",
      "countryOrRegion": "US",
      "type": "business"
    }
  ]
}
```

### Staff Availability

Check when staff members are available for bookings.

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get staff availability | POST | `/solutions/bookingBusinesses/{id}/getStaffAvailability` |

**Request body**:
```json
{
  "staffIds": ["<staff-id-1>", "<staff-id-2>"],
  "startDateTime": {
    "dateTime": "2026-03-01T00:00:00.000Z",
    "timeZone": "UTC"
  },
  "endDateTime": {
    "dateTime": "2026-03-08T00:00:00.000Z",
    "timeZone": "UTC"
  }
}
```

**Response availability statuses**: `available`, `busy`, `slotsAvailable`, `outOfOffice`, `unknown`.

### Custom Questions

Custom questions can be attached to services to collect information from customers at booking time.

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List custom questions | GET | `/solutions/bookingBusinesses/{id}/customQuestions` |
| Get custom question | GET | `/solutions/bookingBusinesses/{id}/customQuestions/{questionId}` |
| Create custom question | POST | `/solutions/bookingBusinesses/{id}/customQuestions` |
| Update custom question | PATCH | `/solutions/bookingBusinesses/{id}/customQuestions/{questionId}` |
| Delete custom question | DELETE | `/solutions/bookingBusinesses/{id}/customQuestions/{questionId}` |

**Create custom question body**:
```json
{
  "displayName": "What topics would you like to discuss?",
  "answerInputType": "text",
  "answerOptions": []
}
```

**Answer input types**: `text`, `radioButton`, `unknownFutureValue`.

For `radioButton`, provide `answerOptions`:
```json
{
  "displayName": "How did you hear about us?",
  "answerInputType": "radioButton",
  "answerOptions": ["Website", "Referral", "Social Media", "Other"]
}
```

## Common Patterns for Small Teams

### Pattern 1: Set Up a New Booking Business

1. `POST /solutions/bookingBusinesses` — create the business with hours and scheduling policy
2. `POST /solutions/bookingBusinesses/{id}/staffMembers` — add each team member
3. `POST /solutions/bookingBusinesses/{id}/services` — create each bookable service
4. `POST /solutions/bookingBusinesses/{id}/customQuestions` — add intake questions
5. `POST /solutions/bookingBusinesses/{id}/publish` — make the booking page live

### Pattern 2: Weekly Schedule Review

1. `GET /solutions/bookingBusinesses/{id}/appointments?$filter=startDateTime/dateTime ge '{monday}' and startDateTime/dateTime le '{friday}'&$orderby=startDateTime/dateTime` — fetch this week's appointments
2. Group by day and staff member for a clear overview
3. `POST /solutions/bookingBusinesses/{id}/getStaffAvailability` — check remaining open slots

### Pattern 3: Onboard a New Staff Member

1. `POST /solutions/bookingBusinesses/{id}/staffMembers` — add the staff member with working hours
2. `GET /solutions/bookingBusinesses/{id}/services` — list existing services
3. For each relevant service: `PATCH /solutions/bookingBusinesses/{id}/services/{serviceId}` — add the new staff member's ID to `staffMemberIds`
4. Verify with `POST /solutions/bookingBusinesses/{id}/getStaffAvailability`

### Pattern 4: Reschedule an Appointment

1. `GET /solutions/bookingBusinesses/{id}/appointments/{appointmentId}` — get current details
2. `POST /solutions/bookingBusinesses/{id}/getStaffAvailability` — find open slots
3. `PATCH /solutions/bookingBusinesses/{id}/appointments/{appointmentId}` — update `startDateTime` and `endDateTime`
4. The customer receives an automatic update email if `optOutOfCustomerEmail` is `false`

### Pattern 5: Bulk Cancel Appointments

1. `GET /solutions/bookingBusinesses/{id}/appointments?$filter=startDateTime/dateTime ge '{start}' and startDateTime/dateTime le '{end}'` — fetch appointments in the range
2. For each appointment: `POST /solutions/bookingBusinesses/{id}/appointments/{appointmentId}/cancel` with a cancellation message
3. Customers receive cancellation emails automatically

## Authentication

### Required Permissions

| Permission | Type | Purpose |
|---|---|---|
| `Bookings.Read.All` | Delegated | Read businesses, services, staff, appointments, and customers |
| `Bookings.ReadWrite.All` | Delegated | Create and update all Bookings resources |
| `Bookings.Manage.All` | Delegated | Full management including delete, publish/unpublish, and business settings |

### Authentication Flow

For server-to-server (daemon) scenarios, use client credentials:

```javascript
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"]
});
const client = Client.initWithMiddleware({ authProvider });
```

For interactive (user-delegated) scenarios, use device code or authorization code flow with `@azure/identity`.

## Error Handling

| Status Code | Meaning | Common Cause |
|---|---|---|
| 400 Bad Request | Malformed request body | Invalid ISO 8601 duration, missing required fields, bad date format |
| 401 Unauthorized | Authentication failure | Expired token, missing `Authorization` header |
| 403 Forbidden | Insufficient permissions | App lacks required Bookings permissions or admin consent |
| 404 Not Found | Resource does not exist | Wrong business ID, service ID, or appointment ID |
| 409 Conflict | Resource conflict | Duplicate service name, overlapping appointment |
| 429 Too Many Requests | Throttled | Implement exponential backoff, check `Retry-After` header |

### Retry Strategy

For 429 responses, read the `Retry-After` header (value in seconds) and wait before retrying:

```javascript
async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.statusCode === 429 && attempt < maxRetries - 1) {
        const retryAfter = parseInt(err.headers?.["retry-after"] || "5", 10);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
      } else {
        throw err;
      }
    }
  }
}
```

## Scheduling Policy Reference

The `schedulingPolicy` object controls how customers can book:

| Property | Type | Description |
|---|---|---|
| `timeSlotInterval` | Duration (ISO 8601) | Interval between available booking slots (e.g., `PT30M`) |
| `minimumLeadTime` | Duration (ISO 8601) | Minimum time before an appointment can be booked (e.g., `PT2H`) |
| `maximumAdvance` | Duration (ISO 8601) | How far in advance customers can book (e.g., `P30D`) |
| `sendConfirmationsToOwner` | Boolean | Send booking confirmations to the business owner |
| `allowStaffSelection` | Boolean | Let customers choose a specific staff member |

## ISO 8601 Duration Quick Reference

| Duration | ISO 8601 |
|---|---|
| 15 minutes | `PT15M` |
| 30 minutes | `PT30M` |
| 45 minutes | `PT45M` |
| 1 hour | `PT1H` |
| 1.5 hours | `PT1H30M` |
| 2 hours | `PT2H` |
| 1 day | `P1D` |
| 7 days | `P7D` |
| 30 days | `P30D` |
| No duration | `PT0S` |
