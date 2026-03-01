---
name: bookings-coverage-audit
description: "Audit Microsoft Bookings feature coverage against official Microsoft Graph docs"
argument-hint: "<business-id> [--include-preview]"
allowed-tools:
  - Read
  - Bash
  - Glob
---

# Audit Bookings Feature Coverage

Compare this plugin's current guidance and commands against official Microsoft documentation so Claude can identify feature gaps before implementing automation.

## Inputs

- `<business-id>` (required): Bookings business ID used for live endpoint checks.
- `--include-preview` (optional): Include beta-only endpoints in the gap report.

## Prerequisites

- Valid Microsoft Graph token with `Bookings.Read.All`.
- Access to Microsoft Learn docs:
  - `https://learn.microsoft.com/graph/api/resources/booking-api-overview`
  - `https://learn.microsoft.com/graph/api/resources/bookingbusiness`
  - `https://learn.microsoft.com/graph/api/resources/bookingservice`
  - `https://learn.microsoft.com/graph/api/resources/bookingappointment`

## Step 1: Build the feature matrix

Create a matrix with these feature domains and mark each as `covered`, `partial`, or `missing`.

| Domain | Required API families |
|---|---|
| Business profile and scheduling policy | `bookingBusinesses` CRUD, publish/unpublish |
| Services and service options | `services` CRUD, reminders, buffers, pricing |
| Staff and availability | `staffMembers` CRUD, `getStaffAvailability` |
| Appointments lifecycle | `appointments` CRUD, cancel/reschedule patterns |
| Customers and reminders | `customers` CRUD, SMS/email reminder constraints |
| Custom questions and booking page settings | custom questions, booking page policy fields |

## Step 2: Verify endpoint reachability

Run deterministic checks using the business ID:

```bash
curl -s "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${BUSINESS_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '{id, displayName, schedulingPolicy}'

curl -s "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${BUSINESS_ID}/services?$top=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.value[] | {id, displayName, defaultDuration}'

curl -s "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${BUSINESS_ID}/appointments?$top=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.value[] | {id, serviceId, startDateTime, endDateTime}'
```

If `--include-preview` is set, also check beta-only shapes and explicitly label them preview.

## Step 3: Produce the gap report

Output exactly this format:

```markdown
# Microsoft Bookings Coverage Report

## Coverage Summary
| Domain | Status | Evidence | Action |
|---|---|---|---|
| Business profile and scheduling policy | covered | SKILL endpoint table + live GET check | none |
| Customers and reminders | partial | API supports customers, command coverage limited | add `/bookings-customers-sync` |

## High-priority gaps
1. [gap]
2. [gap]

## Safe next commands
- `/bookings-create-service`
- `/bookings-availability`
- `/bookings-upcoming`
```

## Validation

- Confirm every `partial` or `missing` item references one Microsoft Learn URL.
- Confirm recommended command names do not claim unsupported runtime code.
