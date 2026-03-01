---
name: bookings-create-service
description: "Create a new bookable service in a Bookings calendar"
argument-hint: "<business-id> --name <service-name> --duration <minutes> [--price <amount>] [--description <text>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

# Create a Bookable Service

Create a new service in a Microsoft Bookings calendar using the Graph API. Services define what customers can book — for example, a 30-minute consultation, a 1-hour demo, or a 15-minute check-in.

## Arguments

- `<business-id>` (required): The Bookings business ID (e.g., `Contoso@contoso.onmicrosoft.com` or a GUID)
- `--name <service-name>` (required): Display name for the service
- `--duration <minutes>` (required): Default appointment duration in minutes (will be converted to ISO 8601)
- `--price <amount>` (optional): Default price for the service (default: 0)
- `--description <text>` (optional): Description shown to customers when booking

## Step 1: Validate Inputs

Verify all required arguments are provided. Convert the duration from minutes to ISO 8601 format:
- 15 minutes = `PT15M`
- 30 minutes = `PT30M`
- 60 minutes = `PT1H`
- 90 minutes = `PT1H30M`

## Step 2: Build the Request Body

Construct the POST body for the new service:

```json
{
  "displayName": "<service-name>",
  "defaultDuration": "PT<duration>",
  "defaultPrice": <amount>,
  "defaultPriceType": "fixedPrice",
  "description": "<text>",
  "isLocationOnline": true,
  "defaultLocation": {
    "displayName": "Microsoft Teams Meeting",
    "locationType": "default"
  },
  "schedulingPolicy": {
    "allowStaffSelection": true,
    "minimumLeadTime": "PT2H",
    "maximumAdvance": "P30D",
    "sendConfirmationsToOwner": true,
    "timeSlotInterval": "PT<duration>"
  },
  "defaultReminders": [
    {
      "offset": "P1D",
      "recipients": "allAttendees",
      "message": "Reminder: You have an upcoming appointment."
    }
  ]
}
```

**Notes on the request body**:
- If `--price` is not provided or is 0, set `defaultPriceType` to `"notSet"` and omit `defaultPrice` or set it to 0.
- If `--price` is provided and greater than 0, set `defaultPriceType` to `"fixedPrice"`.
- `isLocationOnline: true` generates a Teams meeting link for each booking. Set to `false` for in-person services.
- `timeSlotInterval` should match the `defaultDuration` to avoid gaps or overlaps.
- `minimumLeadTime` of `PT2H` means customers must book at least 2 hours in advance. Adjust for the service type.
- `maximumAdvance` of `P30D` allows bookings up to 30 days ahead.

## Step 3: Send the Request

```
POST https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/{business-id}/services
Content-Type: application/json
Authorization: Bearer {access-token}
```

Using curl:

```bash
curl -s -X POST \
  "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${BUSINESS_ID}/services" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "'"$SERVICE_NAME"'",
    "defaultDuration": "'"$DURATION_ISO"'",
    "defaultPrice": '"$PRICE"',
    "defaultPriceType": "fixedPrice",
    "description": "'"$DESCRIPTION"'",
    "isLocationOnline": true,
    "schedulingPolicy": {
      "allowStaffSelection": true,
      "minimumLeadTime": "PT2H",
      "maximumAdvance": "P30D",
      "sendConfirmationsToOwner": true,
      "timeSlotInterval": "'"$DURATION_ISO"'"
    }
  }'
```

## Step 4: Handle the Response

**Success (201 Created)**:
Extract and display the new service details:

```markdown
## Service Created

| Field | Value |
|---|---|
| Service ID | {id} |
| Display Name | {displayName} |
| Duration | {defaultDuration} |
| Price | {defaultPrice} ({defaultPriceType}) |
| Online Meeting | {isLocationOnline} |
| Booking Page | https://outlook.office365.com/owa/calendar/{business-id}/bookings/ |
```

**Error handling**:

| Status | Meaning | Action |
|---|---|---|
| 400 Bad Request | Invalid request body — check duration format, missing required fields | Validate ISO 8601 duration and required fields |
| 401 Unauthorized | Token expired or missing | Re-authenticate and retry |
| 403 Forbidden | Insufficient permissions | Verify `Bookings.ReadWrite.All` or `Bookings.Manage.All` is granted |
| 404 Not Found | Business ID does not exist | List businesses with `GET /solutions/bookingBusinesses` to find the correct ID |
| 409 Conflict | Service with this name may already exist | Check existing services and use a unique name |

## Step 5: Verify the Service

Confirm the service was created by fetching it:

```
GET https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/{business-id}/services/{service-id}
```

Display the full service configuration, including scheduling policy and reminder settings, so the user can verify everything looks correct.
