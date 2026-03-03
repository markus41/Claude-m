---
name: entra-named-location-create
description: Create an IP-based or country-based named location for use in Conditional Access policies
argument-hint: "<display-name> [--ip <cidr1,cidr2>] [--countries <US,GB,DE>] [--trusted] [--list]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Create Named Location

Create a named location (IP ranges or countries) for use in Conditional Access policies.
IP-based locations can be marked as trusted to affect sign-in risk calculations.

## Steps

### Mode: List Existing (--list)

```
GET https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations
  ?$select=id,displayName,createdDateTime,modifiedDateTime
```

Display type, trusted status, and usage in CA policies.

### Mode: Create IP-Based Location (--ip)

Parse `--ip` as comma-separated CIDR notation (IPv4 and IPv6 supported):

```
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations
{
  "@odata.type": "#microsoft.graph.ipNamedLocation",
  "displayName": "<display-name>",
  "isTrusted": <true if --trusted>,
  "ipRanges": [
    { "@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "203.0.113.0/24" },
    { "@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "198.51.100.0/28" }
  ]
}
```

### Mode: Create Country-Based Location (--countries)

Parse `--countries` as comma-separated ISO 3166-1 alpha-2 codes:

```
POST https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations
{
  "@odata.type": "#microsoft.graph.countryNamedLocation",
  "displayName": "<display-name>",
  "includeUnknownCountriesAndRegions": false,
  "countriesAndRegions": ["US", "GB", "DE"]
}
```

### Display Output

**IP location created:**
```
Named location created
─────────────────────────────────────────────────────────────────
Name:     Contoso HQ — Seattle
ID:       <location-id>
Type:     IP Ranges
Trusted:  Yes ✓
Ranges:
  203.0.113.0/24
  198.51.100.0/28
─────────────────────────────────────────────────────────────────
Use in Conditional Access:
  CA Usage: "excludeLocations": ["<location-id>"] to exclude trusted IPs from MFA
  Require MFA from all except trusted: include this in a CA policy exclusion
─────────────────────────────────────────────────────────────────
```

**Country location created:**
```
Named location created
─────────────────────────────────────────────────────────────────
Name:      Allowed Countries
ID:        <location-id>
Type:      Countries
Countries: US, GB, DE (3 countries)
Unknown:   Excluded
─────────────────────────────────────────────────────────────────
```

## Error Handling

| Code | Fix |
|------|-----|
| `400 InvalidCidr` | Invalid CIDR notation — check IP range format |
| `400 InvalidCountry` | Invalid country code — use ISO 3166-1 alpha-2 (2-letter code) |
| `400 DuplicateName` | Named location with this display name already exists |
| `403` | Add `Policy.ReadWrite.ConditionalAccess` scope |
