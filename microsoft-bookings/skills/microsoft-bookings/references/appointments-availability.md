# Bookings Appointments & Availability — Graph API Reference

## Overview

This reference covers appointment booking, cancellation, and rescheduling; the
`getStaffAvailability` API; slots queries; customer management; reminders; and Teams meeting
link generation via Microsoft Graph API.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/solutions/bookingBusinesses/{id}/appointments` | `Bookings.Read.All` | `$filter`, `$select`, `$orderby` | List appointments |
| GET | `/solutions/bookingBusinesses/{id}/appointments/{appointmentId}` | `Bookings.Read.All` | — | Get specific appointment |
| POST | `/solutions/bookingBusinesses/{id}/appointments` | `Bookings.ReadWrite.All` | Full appointment body | Book appointment |
| PATCH | `/solutions/bookingBusinesses/{id}/appointments/{appointmentId}` | `Bookings.ReadWrite.All` | Fields to update | Reschedule or update |
| DELETE | `/solutions/bookingBusinesses/{id}/appointments/{appointmentId}` | `Bookings.Manage.All` | — | Delete appointment |
| POST | `/solutions/bookingBusinesses/{id}/appointments/{appointmentId}/cancel` | `Bookings.ReadWrite.All` | `cancellationMessage` | Cancel with message |
| POST | `/solutions/bookingBusinesses/{id}/getStaffAvailability` | `Bookings.Read.All` | `staffIds`, `startDateTime`, `endDateTime` | Check availability |
| GET | `/solutions/bookingBusinesses/{id}/customers` | `Bookings.Read.All` | `$select`, `$filter` | List customers |
| POST | `/solutions/bookingBusinesses/{id}/customers` | `Bookings.ReadWrite.All` | Customer body | Create customer |

---

## Code Snippets

### TypeScript — Book an Appointment

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

interface AppointmentRequest {
  serviceId: string;
  serviceName: string;
  startDateTime: Date;
  durationMinutes: number;
  staffId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerTimeZone?: string;
  serviceNotes?: string;
  customQuestionAnswers?: Array<{ questionId: string; question: string; answer: string }>;
}

async function bookAppointment(
  client: Client,
  businessId: string,
  req: AppointmentRequest
): Promise<string> {
  const endDateTime = new Date(
    req.startDateTime.getTime() + req.durationMinutes * 60 * 1000
  );

  const body: Record<string, unknown> = {
    serviceId: req.serviceId,
    serviceName: req.serviceName,
    startDateTime: {
      dateTime: req.startDateTime.toISOString().replace("Z", ".0000000"),
      timeZone: "UTC",
    },
    endDateTime: {
      dateTime: endDateTime.toISOString().replace("Z", ".0000000"),
      timeZone: "UTC",
    },
    staffMemberIds: [req.staffId],
    isLocationOnline: true,
    optOutOfCustomerEmail: false,
    customers: [
      {
        "@odata.type": "#microsoft.graph.bookingCustomerInformation",
        name: req.customerName,
        emailAddress: req.customerEmail,
        ...(req.customerPhone && { phone: req.customerPhone }),
        timeZone: req.customerTimeZone ?? "UTC",
        ...(req.customQuestionAnswers && {
          customQuestionAnswers: req.customQuestionAnswers,
        }),
      },
    ],
    ...(req.serviceNotes && { serviceNotes: req.serviceNotes }),
  };

  const appointment = await client
    .api(`/solutions/bookingBusinesses/${businessId}/appointments`)
    .post(body);

  console.log(`Booked appointment: ${appointment.id}`);
  if (appointment.onlineMeetingUrl) {
    console.log(`Teams link: ${appointment.onlineMeetingUrl}`);
  }

  return appointment.id;
}
```

### TypeScript — Check Staff Availability

```typescript
interface AvailabilitySlot {
  staffId: string;
  startDateTime: string;
  endDateTime: string;
  status: "available" | "busy" | "outOfOffice" | "unknown";
}

async function checkStaffAvailability(
  client: Client,
  businessId: string,
  staffIds: string[],
  startDate: Date,
  endDate: Date
): Promise<AvailabilitySlot[]> {
  const response = await client
    .api(`/solutions/bookingBusinesses/${businessId}/getStaffAvailability`)
    .post({
      staffIds,
      startDateTime: {
        dateTime: startDate.toISOString().replace("Z", ".000Z"),
        timeZone: "UTC",
      },
      endDateTime: {
        dateTime: endDate.toISOString().replace("Z", ".000Z"),
        timeZone: "UTC",
      },
    });

  const slots: AvailabilitySlot[] = [];

  for (const staffAvail of response.value) {
    for (const avail of staffAvail.availabilityItems ?? []) {
      slots.push({
        staffId: staffAvail.staffId,
        startDateTime: avail.startDateTime?.dateTime,
        endDateTime: avail.endDateTime?.dateTime,
        status: avail.status,
      });
    }
  }

  return slots.filter((s) => s.status === "available");
}
```

### TypeScript — Find Next Available Slot for a Service

```typescript
async function findNextAvailableSlot(
  client: Client,
  businessId: string,
  serviceId: string,
  durationMinutes: number,
  lookAheadDays = 7
): Promise<{ staffId: string; startDateTime: Date } | null> {
  // Get service's assigned staff
  const service = await client
    .api(`/solutions/bookingBusinesses/${businessId}/services/${serviceId}`)
    .select("staffMemberIds")
    .get();

  const staffIds: string[] = service.staffMemberIds ?? [];
  if (staffIds.length === 0) return null;

  const now = new Date();
  const endDate = new Date(now.getTime() + lookAheadDays * 24 * 60 * 60 * 1000);

  const availableSlots = await checkStaffAvailability(
    client, businessId, staffIds, now, endDate
  );

  // Find first slot long enough for the service duration
  for (const slot of availableSlots) {
    const slotStart = new Date(slot.startDateTime);
    const slotEnd = new Date(slot.endDateTime);
    const slotDurationMins = (slotEnd.getTime() - slotStart.getTime()) / 60000;

    if (slotDurationMins >= durationMinutes) {
      return { staffId: slot.staffId, startDateTime: slotStart };
    }
  }

  return null;
}
```

### TypeScript — Cancel an Appointment with Message

```typescript
async function cancelAppointment(
  client: Client,
  businessId: string,
  appointmentId: string,
  reason: string
): Promise<void> {
  await client
    .api(`/solutions/bookingBusinesses/${businessId}/appointments/${appointmentId}/cancel`)
    .post({ cancellationMessage: reason });

  console.log(`Appointment ${appointmentId} cancelled`);
}
```

### TypeScript — Reschedule an Appointment

```typescript
async function rescheduleAppointment(
  client: Client,
  businessId: string,
  appointmentId: string,
  newStartDateTime: Date,
  durationMinutes: number
): Promise<void> {
  const newEndDateTime = new Date(
    newStartDateTime.getTime() + durationMinutes * 60 * 1000
  );

  await client
    .api(`/solutions/bookingBusinesses/${businessId}/appointments/${appointmentId}`)
    .patch({
      startDateTime: {
        dateTime: newStartDateTime.toISOString().replace("Z", ".0000000"),
        timeZone: "UTC",
      },
      endDateTime: {
        dateTime: newEndDateTime.toISOString().replace("Z", ".0000000"),
        timeZone: "UTC",
      },
    });

  console.log(`Appointment ${appointmentId} rescheduled to ${newStartDateTime.toISOString()}`);
}
```

### TypeScript — List This Week's Appointments

```typescript
async function getThisWeekAppointments(
  client: Client,
  businessId: string
): Promise<unknown[]> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startStr = startOfWeek.toISOString().replace("Z", ".0000000Z");
  const endStr = endOfWeek.toISOString().replace("Z", ".0000000Z");

  const result = await client
    .api(`/solutions/bookingBusinesses/${businessId}/appointments`)
    .filter(
      `startDateTime/dateTime ge '${startStr}' and startDateTime/dateTime le '${endStr}'`
    )
    .orderby("startDateTime/dateTime")
    .select("id,serviceName,startDateTime,endDateTime,customers,staffMemberIds,onlineMeetingUrl")
    .get();

  return result.value;
}
```

### TypeScript — Create or Find Customer

```typescript
async function getOrCreateCustomer(
  client: Client,
  businessId: string,
  name: string,
  email: string,
  phone?: string
): Promise<string> {
  // Check if customer already exists
  const existing = await client
    .api(`/solutions/bookingBusinesses/${businessId}/customers`)
    .filter(`emailAddress eq '${email}'`)
    .select("id")
    .get();

  if (existing.value.length > 0) {
    return existing.value[0].id;
  }

  // Create new customer
  const customer = await client
    .api(`/solutions/bookingBusinesses/${businessId}/customers`)
    .post({
      displayName: name,
      emailAddress: email,
      ...(phone && { phone }),
    });

  return customer.id;
}
```

### PowerShell — Appointment Management

```powershell
Connect-MgGraph -Scopes "Bookings.ReadWrite.All"

$businessId = "YOUR_BUSINESS_ID"
$serviceId = "YOUR_SERVICE_ID"
$staffId = "YOUR_STAFF_ID"

# Book an appointment
$start = (Get-Date "2026-03-10 14:00:00").ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.0000000")
$end = (Get-Date "2026-03-10 14:30:00").ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.0000000")

$apptBody = @{
    serviceId = $serviceId
    serviceName = "Initial Consultation"
    startDateTime = @{ dateTime = $start; timeZone = "UTC" }
    endDateTime = @{ dateTime = $end; timeZone = "UTC" }
    staffMemberIds = @($staffId)
    isLocationOnline = $true
    optOutOfCustomerEmail = $false
    customers = @(
        @{
            "@odata.type" = "#microsoft.graph.bookingCustomerInformation"
            name = "Jane Smith"
            emailAddress = "jane@example.com"
            timeZone = "America/New_York"
        }
    )
} | ConvertTo-Json -Depth 10

$appt = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/$businessId/appointments" `
    -Body $apptBody -ContentType "application/json"

Write-Host "Appointment booked: $($appt.id)"

# Check staff availability
$availBody = @{
    staffIds = @($staffId)
    startDateTime = @{ dateTime = (Get-Date).ToString("o"); timeZone = "UTC" }
    endDateTime = @{ dateTime = (Get-Date).AddDays(7).ToString("o"); timeZone = "UTC" }
} | ConvertTo-Json -Depth 5

$availability = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/$businessId/getStaffAvailability" `
    -Body $availBody -ContentType "application/json"

$availability.value | ForEach-Object {
    Write-Host "Staff: $($_.staffId)"
    $_.availabilityItems | Where-Object { $_.status -eq "available" } | ForEach-Object {
        Write-Host "  Available: $($_.startDateTime.dateTime) - $($_.endDateTime.dateTime)"
    }
}
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Invalid date format or missing required fields | Verify ISO 8601 datetime format with `.0000000` suffix |
| 400 SlotNotAvailable | Requested time slot is not available | Check `getStaffAvailability` before booking |
| 400 InvalidTimeRange | End time before start time | Recalculate end time based on service duration |
| 403 Forbidden | Insufficient permissions | Add `Bookings.ReadWrite.All`; grant admin consent |
| 404 NotFound | Business, service, or appointment not found | Verify all IDs |
| 409 Conflict | Overlapping appointment for staff member | Check availability; use getStaffAvailability |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` header |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Appointment reads | Standard Graph limits | Use `$select` and `$filter` to minimize data |
| Availability queries | Per-call: max 10 staff IDs | Split large staff lists into multiple calls |
| Availability lookback | Up to 1 year in advance | Limit to 30-90 days for performance |
| Appointments per business | No documented limit | Archive old appointments periodically |

---

## Common Patterns and Gotchas

### 1. DateTime Format Is `.0000000` Not `Z`

The Bookings API requires datetimes in format `"2026-03-10T14:00:00.0000000"` in the `dateTime`
property (not ISO 8601 with `Z`). The timezone is in the separate `timeZone` property. Sending
`"2026-03-10T14:00:00Z"` returns a 400 error.

### 2. Teams Meeting Link Requires `isLocationOnline: true`

Set `isLocationOnline: true` on the appointment and service to get an auto-generated Teams
meeting link (`onlineMeetingUrl`). The link is returned in the appointment response. If not set,
no Teams link is generated.

### 3. `cancel` vs `delete` — Use `cancel` for Customer Notification

`DELETE /appointments/{id}` permanently removes the appointment without sending any notification.
`POST /appointments/{id}/cancel` cancels it and sends a cancellation email to the customer if
`optOutOfCustomerEmail` is `false`. Always use `cancel` for customer-facing scenarios.

### 4. `getStaffAvailability` Returns Busy Slots, Not Free Slots

The API returns a list of time blocks with their status (`available`, `busy`, `outOfOffice`).
You need to filter for `status: "available"` and check that the available duration is at least
as long as your service's `defaultDuration`.

### 5. `$filter` on `startDateTime` Requires Path Syntax

Filtering appointments by date requires the path syntax:
`startDateTime/dateTime ge 'DATETIME'` — not `startDateTime ge 'DATETIME'`. The `dateTime`
is a nested object with `dateTime` and `timeZone` properties.

### 6. Customer Emails Are Sent Automatically on Booking

When `optOutOfCustomerEmail: false` (the default), Bookings automatically sends a confirmation
email to the customer upon booking. If you're doing bulk programmatic imports, set
`optOutOfCustomerEmail: true` to prevent email floods.
