# entra-id-admin

Comprehensive Microsoft Entra ID (Azure AD) administration plugin for Claude Code. Covers the full admin surface via Microsoft Graph API v1.0 and beta — from basic user/group lifecycle to advanced governance with PIM, entitlement management, and access reviews.

## Features

- **User Management**: Create, update, disable/enable, bulk import from CSV, password reset, soft-delete restore
- **Group Management**: M365 Groups, Security Groups, Dynamic Groups, group-based licensing, batch membership
- **Directory Roles**: Assign/remove built-in and custom roles, scoped to admin units or tenant-wide
- **PIM (Privileged Identity Management)**: Eligible and active assignments, self-service role activation with justification, approval workflows
- **Authentication Methods**: View/delete MFA methods per user, Temporary Access Passes, bulk MFA enforcement, SSPR config
- **Administrative Units**: Create static/dynamic/restricted AUs, add scoped admins
- **B2B Guest Invitations**: Invite external guests, configure external collaboration policy, cross-tenant access (XTAP)
- **License Assignment**: Direct and group-based, service plan control, usage reports
- **Named Locations**: IP ranges and country-based locations for Conditional Access
- **Entitlement Management**: Access packages, catalogs, assignment policies with approval workflows and access reviews
- **Autonomous Agents**: User lifecycle orchestrator, PIM security auditor, compliance posture auditor

## Prerequisites

- Azure CLI installed and authenticated (`az login`)
- Appropriate Microsoft Entra ID role or app permissions:
  - `User.ReadWrite.All` — user management
  - `Group.ReadWrite.All` — group management
  - `RoleManagement.ReadWrite.Directory` — role assignments
  - `PrivilegedAccess.ReadWrite.AzureResources` — PIM (requires P2 license)
  - `UserAuthenticationMethod.ReadWrite.All` — MFA/auth methods
  - `Directory.ReadWrite.All` — admin units
  - `EntitlementManagement.ReadWrite.All` — access packages/reviews (requires P2 license)
  - `LicenseAssignment.ReadWrite.All` — licenses
  - `Policy.ReadWrite.ConditionalAccess` — named locations

## Installation

```bash
/plugin install entra-id-admin@claude-m-microsoft-marketplace
```

## Setup

```
/entra-id-admin:entra-admin-setup
```

Verifies authentication, checks required permissions, and detects available features (PIM, Entitlement Management).

## Commands

### User Management
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-user-create` | Create user with full property support |
| `/entra-id-admin:entra-user-update` | Update user properties |
| `/entra-id-admin:entra-user-disable` | Disable/enable account, revoke sessions |
| `/entra-id-admin:entra-user-bulk-import` | Bulk create from CSV via batch API |
| `/entra-id-admin:entra-user-get` | Full user details including licenses, groups, MFA, roles |
| `/entra-id-admin:entra-user-password-reset` | Reset password, revoke sessions |

### Group Management
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-group-create` | Create M365/Security/Dynamic group |
| `/entra-id-admin:entra-group-update` | Update group properties, owners, dynamic rule |
| `/entra-id-admin:entra-group-member-add` | Add members (batch of 20) |
| `/entra-id-admin:entra-group-member-remove` | Remove members |
| `/entra-id-admin:entra-group-list` | Filter groups by type, owner, member |

### Directory Roles
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-role-assign` | Assign role — tenant-wide or AU-scoped |
| `/entra-id-admin:entra-role-remove` | Remove role assignment |
| `/entra-id-admin:entra-role-list` | Audit all role assignments |

### PIM (Requires P2)
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-pim-assign` | Create eligible or active PIM assignment |
| `/entra-id-admin:entra-pim-activate` | Self-activate eligible role |
| `/entra-id-admin:entra-pim-list` | Audit all PIM assignments and activations |

### Authentication Methods
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-auth-methods-get` | List/delete auth methods, add TAP |
| `/entra-id-admin:entra-auth-mfa-require` | Report and bulk-enforce MFA registration |

### Admin Units
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-admin-unit-create` | Create static/dynamic/restricted AU |
| `/entra-id-admin:entra-admin-unit-add` | Add member or assign scoped role |

### External Identities
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-guest-invite` | Invite B2B guest user |
| `/entra-id-admin:entra-collab-settings` | Configure external collaboration policy |

### Licenses
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-license-assign` | Assign/remove license from user or group |
| `/entra-id-admin:entra-license-report` | Usage report with errors and gaps |

### Named Locations
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-named-location-create` | Create IP or country named location |

### Entitlement Management (Requires P2)
| Command | Description |
|---------|-------------|
| `/entra-id-admin:entra-access-package-create` | Create access package with policy |
| `/entra-id-admin:entra-access-review-create` | Create recurring access review |

## Focused Plugin Routing

Use `entra-id-admin` for broad identity administration across users, groups, roles, and governance entities. For a focused access certification lifecycle, use:

- `entra-access-reviews`: stale privileged access detection, review cycle drafting, remediation ticket generation, and status reporting.

## Agents

| Agent | Description |
|-------|-------------|
| `user-lifecycle-agent` | Automates full onboarding and offboarding workflows |
| `pim-guardian` | Audits PIM assignments for security hygiene |
| `entra-compliance-auditor` | Full tenant identity compliance posture report |

## Usage Examples

```
# Onboard a new employee
"Onboard Jane Smith as Software Engineer in Engineering, assign M365 E3 license"

# Full offboarding
"Offboard bob.jones@contoso.com — he's leaving today, revoke everything"

# Audit privileged access
"Audit our PIM assignments for security issues"

# Compliance check
"Run a full Entra ID compliance audit and give me a score"

# Direct commands
/entra-id-admin:entra-user-create --upn jane.smith@contoso.com --name "Jane Smith" --dept Engineering --location US
/entra-id-admin:entra-pim-assign --role "User Administrator" --principal jane.smith@contoso.com --duration P180D
/entra-id-admin:entra-license-report --errors
```

## License Requirements

| Feature | License |
|---------|---------|
| Users, groups, roles, auth methods, guest invitations | Microsoft 365 (any) |
| PIM (eligible assignments, activation) | Entra ID P2 or Governance |
| Entitlement Management, Access Reviews | Entra ID P2 or Governance |
| Administrative Units (basic) | Entra ID P1 |
| Restricted Management AUs | Entra ID P2 |
