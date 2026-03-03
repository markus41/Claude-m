# Bookings Services & Staff — Graph API Reference

## Overview

This reference covers booking business CRUD, service definition (duration, pricing, buffers),
staff member management, availability windows, scheduling policies, and staff assignments via
Microsoft Graph API.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

### Booking Businesses

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/solutions/bookingBusinesses` | `Bookings.Read.All` | `$filter`, `$select` | List all businesses |
| GET | `/solutions/bookingBusinesses/{id}` | `Bookings.Read.All` | `$select` | Get specific business |
| POST | `/solutions/bookingBusinesses` | `Bookings.ReadWrite.All` | Full business body | Create business |
| PATCH | `/solutions/bookingBusinesses/{id}` | `Bookings.ReadWrite.All` | Fields to update | Update business settings |
| DELETE | `/solutions/bookingBusinesses/{id}` | `Bookings.Manage.All` | — | Delete business |
| POST | `/solutions/bookingBusinesses/{id}/publish` | `Bookings.Manage.All` | — | Publish booking page |
| POST | `/solutions/bookingBusinesses/{id}/unpublish` | `Bookings.Manage.All` | — | Unpublish booking page |

### Services

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/solutions/bookingBusinesses/{id}/services` | `Bookings.Read.All` | `$select` | List services |
| GET | `/solutions/bookingBusinesses/{id}/services/{serviceId}` | `Bookings.Read.All` | — | Get service |
| POST | `/solutions/bookingBusinesses/{id}/services` | `Bookings.ReadWrite.All` | Full service body | Create service |
| PATCH | `/solutions/bookingBusinesses/{id}/services/{serviceId}` | `Bookings.ReadWrite.All` | Fields to update | Update service |
| DELETE | `/solutions/bookingBusinesses/{id}/services/{serviceId}` | `Bookings.Manage.All` | — | Delete service |

### Staff Members

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/solutions/bookingBusinesses/{id}/staffMembers` | `Bookings.Read.All` | `$select` | List staff |
| GET | `/solutions/bookingBusinesses/{id}/staffMembers/{staffId}` | `Bookings.Read.All` | — | Get staff member |
| POST | `/solutions/bookingBusinesses/{id}/staffMembers` | `Bookings.ReadWrite.All` | Full staff body | Add staff member |
| PATCH | `/solutions/bookingBusinesses/{id}/staffMembers/{staffId}` | `Bookings.ReadWrite.All` | Fields to update | Update staff settings |
| DELETE | `/solutions/bookingBusinesses/{id}/staffMembers/{staffId}` | `Bookings.Manage.All` | — | Remove staff member |

---

## Code Snippets

### TypeScript — Create a Complete Booking Business

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday"];

function buildBusinessHours(
  startTime = "09:00:00.0000000",
  endTime = "17:00:00.0000000",
  days = DAYS_OF_WEEK
) {
  return days.map((day) => ({
    day,
    timeSlots: [{ startTime, endTime }],
  }));
}

async function createBookingBusiness(
  client: Client,
  displayName: string,
  email: string,
  phone: string,
  timeZone = "America/New_York"
): Promise<string> {
  const business = await client
    .api("/solutions/bookingBusinesses")
    .post({
      displayName,
      email,
      phone,
      defaultCurrencyIso: "USD",
      businessHours: buildBusinessHours(),
      schedulingPolicy: {
        timeSlotInterval: "PT30M",
        minimumLeadTime: "PT2H",
        maximumAdvance: "P30D",
        sendConfirmationsToOwner: true,
        allowStaffSelection: true,
      },
    });

  console.log(`Created business: ${business.id} — "${business.displayName}"`);
  return business.id;
}
```

### TypeScript — Create a Service with Buffers and Reminders

```typescript
async function createService(
  client: Client,
  businessId: string,
  params: {
    displayName: string;
    description: string;
    durationMinutes: number;
    staffIds: string[];
    priceType?: "free" | "fixedPrice" | "startingAt";
    price?: number;
    preBufferMinutes?: number;
    postBufferMinutes?: number;
    isOnline?: boolean;
  }
): Promise<string> {
  const duration = `PT${params.durationMinutes}M`;
  const preBuffer = params.preBufferMinutes
    ? `PT${params.preBufferMinutes}M`
    : "PT0S";
  const postBuffer = params.postBufferMinutes
    ? `PT${params.postBufferMinutes}M`
    : "PT0S";

  const service = await client
    .api(`/solutions/bookingBusinesses/${businessId}/services`)
    .post({
      displayName: params.displayName,
      description: params.description,
      defaultDuration: duration,
      defaultPrice: params.price ?? 0,
      defaultPriceType: params.priceType ?? "notSet",
      isLocationOnline: params.isOnline ?? true,
      staffMemberIds: params.staffIds,
      preBuffer,
      postBuffer,
      schedulingPolicy: {
        timeSlotInterval: duration,
        minimumLeadTime: "PT2H",
        maximumAdvance: "P30D",
        sendConfirmationsToOwner: true,
        allowStaffSelection: false,
      },
      defaultReminders: [
        {
          offset: "P1D",
          recipients: "allAttendees",
          message: `Reminder: Your "${params.displayName}" appointment is tomorrow.`,
        },
        {
          offset: "PT2H",
          recipients: "allAttendees",
          message: `Your "${params.displayName}" appointment is in 2 hours.`,
        },
      ],
    });

  console.log(`Created service: ${service.id} — "${service.displayName}"`);
  return service.id;
}
```

### TypeScript — Add a Staff Member with Custom Hours

```typescript
interface StaffWorkingHours {
  day: string;
  startTime: string;
  endTime: string;
}

async function addStaffMember(
  client: Client,
  businessId: string,
  displayName: string,
  email: string,
  workingHours?: StaffWorkingHours[],
  useBusinessHours = true
): Promise<string> {
  const body: Record<string, unknown> = {
    displayName,
    emailAddress: email,
    role: "member",
    useBusinessHours,
    availabilityIsAffectedByPersonalCalendar: true,
    isEmailNotificationEnabled: true,
  };

  if (!useBusinessHours && workingHours) {
    body.workingHours = workingHours.map((h) => ({
      day: h.day,
      timeSlots: [{ startTime: h.startTime, endTime: h.endTime }],
    }));
  }

  const staff = await client
    .api(`/solutions/bookingBusinesses/${businessId}/staffMembers`)
    .post(body);

  console.log(`Added staff: ${staff.id} — "${staff.displayName}"`);
  return staff.id;
}

// Staff member with non-standard hours
await addStaffMember(
  client,
  businessId,
  "Dr. Taylor",
  "taylor@clinic.com",
  [
    { day: "monday", startTime: "08:00:00.0000000", endTime: "13:00:00.0000000" },
    { day: "wednesday", startTime: "08:00:00.0000000", endTime: "13:00:00.0000000" },
    { day: "friday", startTime: "08:00:00.0000000", endTime: "13:00:00.0000000" },
  ],
  false // Override business hours
);
```

### TypeScript — Assign Staff Member to a Service

```typescript
async function addStaffToService(
  client: Client,
  businessId: string,
  serviceId: string,
  newStaffId: string
): Promise<void> {
  // Get current service
  const service = await client
    .api(`/solutions/bookingBusinesses/${businessId}/services/${serviceId}`)
    .select("staffMemberIds")
    .get();

  const currentIds: string[] = service.staffMemberIds ?? [];

  if (currentIds.includes(newStaffId)) {
    console.log("Staff already assigned to this service");
    return;
  }

  await client
    .api(`/solutions/bookingBusinesses/${businessId}/services/${serviceId}`)
    .patch({ staffMemberIds: [...currentIds, newStaffId] });

  console.log(`Staff ${newStaffId} added to service ${serviceId}`);
}
```

### TypeScript — Full Onboarding: Business + Staff + Services

```typescript
async function setupBookingSystem(client: Client): Promise<void> {
  // 1. Create business
  const businessId = await createBookingBusiness(
    client,
    "Contoso Consulting",
    "bookings@contoso.com",
    "555-0100"
  );

  // 2. Add staff members
  const staff1 = await addStaffMember(
    client, businessId, "Alex Johnson", "alex@contoso.com"
  );
  const staff2 = await addStaffMember(
    client, businessId, "Sam Patel", "sam@contoso.com"
  );

  // 3. Create services
  await createService(client, businessId, {
    displayName: "Initial Consultation",
    description: "30-minute introductory meeting",
    durationMinutes: 30,
    staffIds: [staff1, staff2],
    priceType: "free",
    postBufferMinutes: 10,
  });

  await createService(client, businessId, {
    displayName: "Strategy Session",
    description: "60-minute in-depth planning session",
    durationMinutes: 60,
    staffIds: [staff1],
    priceType: "fixedPrice",
    price: 150,
    preBufferMinutes: 5,
    postBufferMinutes: 15,
  });

  // 4. Publish the booking page
  await client.api(`/solutions/bookingBusinesses/${businessId}/publish`).post({});
  console.log("Booking system is live!");
}
```

### PowerShell — Service and Staff Management

```powershell
Connect-MgGraph -Scopes "Bookings.ReadWrite.All"

$businessId = "YOUR_BUSINESS_ID"

# Add a staff member
$staffBody = @{
    displayName = "Jordan Lee"
    emailAddress = "jordan@contoso.com"
    role = "member"
    useBusinessHours = $true
    availabilityIsAffectedByPersonalCalendar = $true
    isEmailNotificationEnabled = $true
} | ConvertTo-Json -Depth 5

$staff = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/$businessId/staffMembers" `
    -Body $staffBody -ContentType "application/json"

Write-Host "Added staff: $($staff.id)"

# Create a 30-minute service
$serviceBody = @{
    displayName = "Quick Support Call"
    description = "30-minute technical support session"
    defaultDuration = "PT30M"
    defaultPrice = 0
    defaultPriceType = "notSet"
    isLocationOnline = $true
    staffMemberIds = @($staff.id)
    preBuffer = "PT0S"
    postBuffer = "PT10M"
    schedulingPolicy = @{
        timeSlotInterval = "PT30M"
        minimumLeadTime = "PT1H"
        maximumAdvance = "P14D"
        sendConfirmationsToOwner = $true
        allowStaffSelection = $false
    }
} | ConvertTo-Json -Depth 10

$service = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/$businessId/services" `
    -Body $serviceBody -ContentType "application/json"

Write-Host "Created service: $($service.id)"

# List all services
$services = Invoke-MgGraphRequest -Method GET `
    -Uri "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/$businessId/services?`$select=id,displayName,defaultDuration,defaultPriceType"
$services.value | Format-Table id, displayName, defaultDuration, defaultPriceType
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Invalid ISO 8601 duration or malformed body | Verify `PT30M` format; check required fields |
| 400 InvalidDuration | Duration value not valid | Use ISO 8601 duration strings; minimum PT5M |
| 401 Unauthorized | Token expired | Re-acquire token; check scope |
| 403 Forbidden | Insufficient Bookings permissions | Add `Bookings.ReadWrite.All`; grant admin consent |
| 404 NotFound | Business, service, or staff ID incorrect | Verify IDs; list resources to confirm existence |
| 409 Conflict | Duplicate service name in the business | Use a unique service display name |
| 429 TooManyRequests | Rate limited | Respect `Retry-After` header |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| API calls (general) | Standard Graph throttling (~10,000/10 min) | Use `$select` to reduce payload |
| Staff members per business | No documented hard limit; practical ~100 | Keep to realistic staff counts |
| Services per business | No documented hard limit; practical ~50 | Consolidate similar services |
| Maximum buffer duration | PT6H (6 hours) | Set reasonable buffers for service type |
| Maximum advance booking | P365D (1 year) | Standard: P30D to P90D |

---

## Common Patterns and Gotchas

### 1. `availabilityIsAffectedByPersonalCalendar` Prevents Double Booking

When set to `true`, a staff member's Outlook calendar events block Bookings slots automatically.
This is the recommended setting for all internal staff. Set to `false` only for "virtual" staff
or resource-based scheduling (e.g., conference rooms).

### 2. Service Buffers Don't Show to Customers

Pre- and post-buffers are invisible to customers booking slots. They pad the internal calendar
but the customer-visible slot is exactly `defaultDuration`. A 30-minute service with 10-minute
post-buffer blocks 40 minutes on the staff calendar.

### 3. `staffMemberIds` Must Reference Existing Staff

You cannot create a service with staff IDs that don't yet exist in the business. Always create
staff members before creating services that reference them.

### 4. Publishing Requires Admin-Level Scope

`POST /solutions/bookingBusinesses/{id}/publish` requires `Bookings.Manage.All`. If you only
have `Bookings.ReadWrite.All`, the publish call returns 403.

### 5. Business Hours Override Staff Hours by Default

If `useBusinessHours: true` on a staff member, their individual `workingHours` array is ignored.
Set `useBusinessHours: false` to use the custom hours, then populate `workingHours`.

### 6. Scheduling Policy Can Be Set at Both Business and Service Level

The service-level `schedulingPolicy` overrides the business-level policy for that specific
service. This allows different lead times, advance booking windows, and slot intervals per
service type.
