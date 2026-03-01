# Microsoft Bookings Plugin

Manage Microsoft Bookings calendars, services, staff availability, and customer appointments via the Microsoft Graph API. Designed for small companies (up to 20 people) that schedule client meetings, demos, or consultations.

## What this plugin helps with
- Create and manage bookable services (consultations, demos, onboarding calls)
- Check staff availability across date ranges
- List and filter upcoming customer appointments
- Review Bookings configurations for correctness and completeness

## Included commands
- `/setup` — Install dependencies, configure Azure Entra app registration, and verify Graph API access
- `/bookings-create-service` — Create a new bookable service in a Bookings calendar
- `/bookings-availability` — Check staff availability for a given date range
- `/bookings-upcoming` — List upcoming appointments with optional filtering
- `/bookings-coverage-audit` — Compare plugin coverage against Microsoft Learn + Graph endpoint families

## Skill
- `skills/microsoft-bookings/SKILL.md` — Comprehensive Microsoft Bookings Graph API reference

## Agent
- `agents/bookings-reviewer.md` — Reviews Bookings configurations for correctness and best practices

## Required Graph API Permissions
| Permission | Type | Purpose |
|---|---|---|
| `Bookings.Read.All` | Delegated | Read booking businesses, services, and appointments |
| `Bookings.ReadWrite.All` | Delegated | Create and update services, appointments, and staff |
| `Bookings.Manage.All` | Delegated | Full management including delete operations and business settings |


## Coverage against Microsoft documentation

| Feature domain | Coverage status | Evidence source |
|---|---|---|
| Businesses and scheduling policy | Covered | SKILL endpoint tables + `/bookings-coverage-audit` checks |
| Services and staffing availability | Covered | Existing commands + Graph v1.0 API verification |
| Appointment lifecycle and customer data | Partial | Documented in SKILL, limited command surface today |

Use `/bookings-coverage-audit <business-id>` before large automation changes to identify feature gaps and safe next command additions.
