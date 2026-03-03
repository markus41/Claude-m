---
name: m365-domain-management
description: Manage tenant domains — add custom domains, retrieve DNS verification records, verify domains, set default domain, and manage SAML/WS-Fed federation.
argument-hint: "<action> [--domain <domain>] [--federation <saml|wsFed>] [--issuerUri <uri>] [--signingCert <base64>] [--dry-run]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Domain and Federation Management

Manage custom domains and federation configuration via Microsoft Graph API.

## Actions

- `list-domains` — List all domains with verification and service status
- `add-domain` — Add a new custom domain (creates in unverified state)
- `get-verification-records` — Get DNS records needed to verify the domain
- `verify-domain` — Trigger domain verification after DNS records are added
- `get-service-records` — Get DNS records required for M365 services (MX, SPF, etc.)
- `set-default` — Set a domain as the default for new users
- `delete-domain` — Delete a custom domain (only if no active users)
- `get-federation` — Get SAML/WS-Fed federation configuration for a domain
- `create-federation` — Convert a domain to federated (requires IdP details)
- `update-federation` — Update federation settings (e.g., rotate signing certificate)
- `delete-federation` — Convert domain back to managed (removes federation)
- `list-domain-users` — List users with UPNs on the specified domain

## Workflow

1. **Validate context** — Confirm `tenantId` is set; verify scope `Domain.ReadWrite.All`
2. **Parse arguments** — Determine action and domain name
3. **Safety checks** — For `delete-federation`, warn about authentication impact; confirm intent
4. **Execute** — Call appropriate Graph endpoint
5. **Report** — Output DNS records as formatted table or federation status summary

## Key Endpoints

| Action | Method | Endpoint |
|---|---|---|
| List domains | GET | `/domains` |
| Add domain | POST | `/domains` |
| Get domain | GET | `/domains/{domain}` |
| Verify domain | POST | `/domains/{domain}/verify` |
| DNS verification records | GET | `/domains/{domain}/verificationDnsRecords` |
| DNS service records | GET | `/domains/{domain}/serviceConfigurationRecords` |
| Set default | PATCH | `/domains/{domain}` (`isDefault: true`) |
| Delete domain | DELETE | `/domains/{domain}` |
| Get federation | GET | `/domains/{domain}/federationConfiguration` |
| Create federation | POST | `/domains/{domain}/federationConfiguration` |
| Update federation | PATCH | `/domains/{domain}/federationConfiguration/{id}` |
| Delete federation | DELETE | `/domains/{domain}/federationConfiguration/{id}` |
| Domain users | GET | `/domains/{domain}/domainNameReferences` |

## Domain Verification Flow

Complete sequence:
1. `add-domain` — POST to `/domains` with `{ "id": "example.com" }`
2. `get-verification-records` — Display TXT/MX records for admin to add to DNS
3. Wait for DNS propagation (typically 5-30 minutes, up to 48 hours)
4. `verify-domain` — POST to `/domains/example.com/verify`
5. `get-service-records` — Display M365 service DNS records to configure

## Federation Configuration Fields

| Field | Description |
|---|---|
| `issuerUri` | IdP entity ID / issuer URI |
| `metadataExchangeUri` | MEX endpoint URL |
| `signingCertificate` | Base64-encoded token-signing certificate |
| `passiveSignInUri` | Sign-in page URL |
| `preferredAuthenticationProtocol` | `saml` or `wsFed` |
| `federatedIdpMfaBehavior` | `acceptIfMfaDoneByFederatedIdp` / `enforceMfaByFederatedIdp` |

## Safety Rules

- **`delete-federation`**: Warn that removing federation will prevent all users on the domain from signing in with on-premises credentials. Confirm that password hash sync or pass-through auth is active before proceeding. Require explicit user confirmation.
- **`delete-domain`**: Check `domainNameReferences` first — fail if any users or groups are on the domain.
- **`set-default`**: Display current default domain and new domain before changing.

## Important Notes

- The initial `.onmicrosoft.com` domain cannot be deleted or federated
- Subdomains require separate verification from the parent domain
- Domain federation requires `Domain Name Administrator` or `Global Administrator` role
- `serviceConfigurationRecords` should be added to DNS for full M365 service functionality
- Reference: `skills/m365-admin/references/domain-management.md`
