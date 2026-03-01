---
name: bookings-upcoming
description: "List upcoming appointments for a Bookings calendar"
argument-hint: "<business-id> [--days <count>] [--staff <staff-id>]"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# List Upcoming Appointments

Retrieve and display upcoming appointments from a Microsoft Bookings calendar. Useful for daily/weekly reviews, preparing for upcoming client meetings, and checking team schedules.

## Arguments

- `<business-id>` (required): The Bookings business ID (e.g., `Contoso@contoso.onmicrosoft.com` or a GUID)
- `--days <count>` (optional): Number of days ahead to look (default: 7, max: 90)
- `--staff <staff-id>` (optional): Filter appointments by a specific staff member ID

## Step 1: Build the Request

Calculate the date range from now to `--days` ahead. Format as ISO 8601 datetime strings.

```
GET https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/{business-id}/appointments
    ?$filter=startDateTime/dateTime ge '2026-03-01T00:00:00Z' and startDateTime/dateTime le '2026-03-08T00:00:00Z'
    &$orderby=startDateTime/dateTime
    &$top=50
```

Using curl:

```bash
START_DATE=$(date -u +"%Y-%m-%dT00:00:00Z")
END_DATE=$(date -u -d "+${DAYS:-7} days" +"%Y-%m-%dT23:59:59Z")

curl -s -G \
  "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${BUSINESS_ID}/appointments" \
  --data-urlencode "\$filter=startDateTime/dateTime ge '${START_DATE}' and startDateTime/dateTime le '${END_DATE}'" \
  --data-urlencode "\$orderby=startDateTime/dateTime" \
  --data-urlencode "\$top=50" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Notes**:
- The `$filter` parameter narrows results to the desired date range.
- `$orderby=startDateTime/dateTime` sorts appointments chronologically.
- `$top=50` limits results per page. Use `@odata.nextLink` for pagination if there are more.
- If `--staff` is provided, add an additional filter: `and staffMemberIds/any(s: s eq '{staff-id}')`.

## Step 2: Parse the Response

Each appointment in the `value` array contains:

```json
{
  "id": "<appointment-id>",
  "serviceId": "<service-id>",
  "serviceName": "Initial Consultation",
  "startDateTime": {
    "dateTime": "2026-03-03T10:00:00.0000000Z",
    "timeZone": "UTC"
  },
  "endDateTime": {
    "dateTime": "2026-03-03T10:30:00.0000000Z",
    "timeZone": "UTC"
  },
  "duration": "PT30M",
  "customers": [
    {
      "name": "Jane Smith",
      "emailAddress": "jane@customer.com",
      "phone": "555-0123"
    }
  ],
  "staffMemberIds": ["<staff-id>"],
  "isLocationOnline": true,
  "onlineMeetingUrl": "https://teams.microsoft.com/l/meetup-join/...",
  "serviceNotes": "First-time client, referred by partner program.",
  "priceType": "fixedPrice",
  "price": 0
}
```

## Step 3: Display as a Formatted Table

Group appointments by date and present them clearly:

```markdown
# Upcoming Appointments
**Business**: Contoso Consulting
**Period**: March 1 - March 8, 2026
**Total appointments**: 12

## Monday, March 3 (3 appointments)

| Time | Service | Customer | Staff | Location |
|---|---|---|---|---|
| 10:00 - 10:30 | Initial Consultation | Jane Smith | Alex Johnson | Teams |
| 11:00 - 12:00 | Product Demo | Acme Corp (Bob Lee) | Maria Garcia | Teams |
| 14:00 - 14:30 | Follow-up Call | Jane Smith | Alex Johnson | Teams |

## Tuesday, March 4 (2 appointments)

| Time | Service | Customer | Staff | Location |
|---|---|---|---|---|
| 09:00 - 09:30 | Check-in | Widget Inc (Sam Park) | Alex Johnson | Teams |
| 15:00 - 16:00 | Onboarding | NewClient LLC (Pat Chen) | Maria Garcia | In-person |

## Wednesday, March 5
No appointments scheduled.
```

## Step 4: Handle Pagination

If the response includes `@odata.nextLink`, there are more appointments beyond the `$top` limit. Fetch subsequent pages:

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "${NEXT_LINK_URL}"
```

Continue until there is no `@odata.nextLink` in the response, then combine all results before displaying.

## Step 5: Summary Statistics

After the appointment table, include a summary:

```markdown
## Summary

| Metric | Value |
|---|---|
| Total appointments | 12 |
| Unique customers | 8 |
| Most booked service | Initial Consultation (5) |
| Busiest day | Monday (3 appointments) |
| Staff utilization | Alex: 7, Maria: 5 |
```

## Error Handling

| Status | Meaning | Action |
|---|---|---|
| 400 Bad Request | Invalid filter syntax or date format | Check OData filter syntax and ISO 8601 dates |
| 401 Unauthorized | Token expired or missing | Re-authenticate and retry |
| 403 Forbidden | Insufficient permissions | Verify `Bookings.Read.All` is granted |
| 404 Not Found | Business ID does not exist | List businesses with `GET /solutions/bookingBusinesses` |
