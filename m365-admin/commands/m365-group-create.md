---
name: m365-group-create
description: Create an M365 group — security group, M365 (Unified) group, or distribution list. Optionally add initial members from CSV.
argument-hint: "<groupName> --type <security|m365|distribution> [--members <csvPath>] [--owner <upn>] [--description <text>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Create M365 Group

Create a group in the Microsoft 365 tenant with optional initial member population.

## Group Types

### Security Group (via Graph)
- `mailEnabled: false`, `securityEnabled: true`
- Used for access control (SharePoint permissions, app assignments, conditional access)
- No mailbox, no Teams

### M365 (Unified) Group (via Graph)
- `mailEnabled: true`, `securityEnabled: false`, `groupTypes: ["Unified"]`
- Includes mailbox, SharePoint site, Planner, Teams-ready
- `visibility`: "Private" or "Public"

### Distribution List (via Exchange Online PowerShell)
- Cannot be created via Graph API
- Uses `New-DistributionGroup` cmdlet
- Mail-only group for email distribution

## Arguments

- `groupName` (required): Display name for the group
- `--type <security|m365|distribution>`: Group type (default: security)
- `--alias <mailNickname>`: Mail alias (auto-generated from name if omitted)
- `--description <text>`: Group description
- `--owner <upn>`: Group owner UPN
- `--visibility <Private|Public>`: For M365 groups only (default: Private)
- `--members <csvPath>`: CSV with `userPrincipalName` column to add as initial members
- `--email <address>`: Primary SMTP address (for distribution lists)

## Workflow

1. **Validate** -- Check group name uniqueness, owner exists, member UPNs exist
2. **Create group** -- POST `/groups` (security/M365) or `New-DistributionGroup` (DL)
3. **Set owner** -- POST `/groups/{id}/owners/$ref`
4. **Add members** -- POST `/groups/{id}/members/$ref` for each member (batch if >20)
5. **Report** -- Group details, member count, any failures

## Important Notes

- Distribution lists require Exchange Online PowerShell -- Graph API does not support DL creation
- M365 groups automatically provision: mailbox, SharePoint site, OneNote notebook
- Security groups have no mail capability by default
- For mail-enabled security groups, use Exchange Online PowerShell: `New-DistributionGroup -Type Security`
- Adding members via Graph uses `$ref` to link directory objects
- Batch member additions in groups of 20 via `$batch` endpoint
- Reference: `skills/m365-admin/references/entra-id.md` for group creation endpoints
- Reference: `skills/m365-admin/references/exchange-online.md` for distribution list management
