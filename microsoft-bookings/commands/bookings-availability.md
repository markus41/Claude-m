---
name: bookings-availability
description: "Check staff availability for a Bookings calendar"
argument-hint: "<business-id> --staff <staff-id> --date <YYYY-MM-DD> [--days <count>]"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# Check Staff Availability

Query staff availability for a Microsoft Bookings calendar using the Graph API. Returns available time slots for a specific staff member over a date range, useful for finding open windows before manually scheduling or coordinating with customers.

## Arguments

- `<business-id>` (required): The Bookings business ID (e.g., `Contoso@contoso.onmicrosoft.com` or a GUID)
- `--staff <staff-id>` (required): Staff member ID (GUID from the staff members list)
- `--date <YYYY-MM-DD>` (required): Start date for the availability check
- `--days <count>` (optional): Number of days to check (default: 7, max: 30)

## Step 1: Validate Inputs

- Verify `<business-id>` and `--staff` are provided.
- Parse `--date` and validate it is a valid date in `YYYY-MM-DD` format.
- Calculate the end date: start date + `--days` (default 7).
- Format both dates as ISO 8601 datetime strings with timezone: `2026-03-01T00:00:00.000Z` and `2026-03-08T00:00:00.000Z`.

## Step 2: Build the Request

Use the `getStaffAvailability` action on the Bookings business:

```
POST https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/{business-id}/getStaffAvailability
Content-Type: application/json
Authorization: Bearer {access-token}
```

**Request body**:

```json
{
  "staffIds": [
    "<staff-id>"
  ],
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

Using curl:

```bash
curl -s -X POST \
  "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${BUSINESS_ID}/getStaffAvailability" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "staffIds": ["'"$STAFF_ID"'"],
    "startDateTime": {
      "dateTime": "'"$START_DATE"'T00:00:00.000Z",
      "timeZone": "UTC"
    },
    "endDateTime": {
      "dateTime": "'"$END_DATE"'T00:00:00.000Z",
      "timeZone": "UTC"
    }
  }'
```

**Notes**:
- You can pass multiple staff IDs in the `staffIds` array to compare availability across team members.
- The `timeZone` field accepts IANA timezone names (e.g., `America/Chicago`, `Europe/Berlin`) or `UTC`.
- The response returns availability per staff member, grouped by day.

## Step 3: Parse the Response

The response contains an `availabilityItems` array with one entry per staff member. Each entry includes `availabilityItems` with `status` and `serviceId` for each time slot.

**Response structure**:
```json
{
  "value": [
    {
      "staffId": "<staff-id>",
      "availabilityItems": [
        {
          "status": "available",
          "startDateTime": {
            "dateTime": "2026-03-03T09:00:00.000Z",
            "timeZone": "UTC"
          },
          "endDateTime": {
            "dateTime": "2026-03-03T09:30:00.000Z",
            "timeZone": "UTC"
          },
          "serviceId": ""
        },
        {
          "status": "busy",
          "startDateTime": {
            "dateTime": "2026-03-03T09:30:00.000Z",
            "timeZone": "UTC"
          },
          "endDateTime": {
            "dateTime": "2026-03-03T10:00:00.000Z",
            "timeZone": "UTC"
          },
          "serviceId": "<service-id>"
        }
      ]
    }
  ]
}
```

**Status values**:
| Status | Meaning |
|---|---|
| `available` | Staff member is free during this slot |
| `busy` | Staff member has a booking or calendar event |
| `slotsAvailable` | Some sub-slots are open within this window |
| `outOfOffice` | Staff member is marked out of office |
| `unknown` | Availability cannot be determined |

## Step 4: Display Available Slots

Format the results as a readable table grouped by date:

```markdown
# Staff Availability: [Staff Name]
**Period**: 2026-03-01 to 2026-03-08

## Monday, March 3

| Time | Status |
|---|---|
| 09:00 - 09:30 | Available |
| 09:30 - 10:00 | Busy (Client Consultation) |
| 10:00 - 10:30 | Available |
| 10:30 - 11:00 | Available |
| 11:00 - 12:00 | Busy (Team Standup) |
| 13:00 - 13:30 | Available |
| 13:30 - 14:00 | Available |
| 14:00 - 17:00 | Available |

**Available slots**: 6 | **Busy slots**: 2

## Tuesday, March 4
...
```

If no available slots are found for the entire range, suggest:
- Extending the date range with `--days`
- Checking a different staff member
- Verifying the staff member's working hours are configured in the Bookings business

## Error Handling

| Status | Meaning | Action |
|---|---|---|
| 400 Bad Request | Invalid date format or staff ID | Verify ISO 8601 dates and GUID format for staff ID |
| 401 Unauthorized | Token expired or missing | Re-authenticate and retry |
| 403 Forbidden | Insufficient permissions | Verify `Bookings.Read.All` is granted |
| 404 Not Found | Business or staff member not found | List businesses/staff to find correct IDs |
