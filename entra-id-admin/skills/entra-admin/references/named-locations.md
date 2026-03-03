# Named Locations — Reference

## Overview

Named locations define IP ranges or country/region sets that can be used in Conditional Access policies.
Two types: **IP-based** and **Country/region-based**.

## IP-Based Named Location

```
POST /identity/conditionalAccess/namedLocations
{
  "@odata.type": "#microsoft.graph.ipNamedLocation",
  "displayName": "Contoso HQ — Seattle",
  "isTrusted": true,
  "ipRanges": [
    {
      "@odata.type": "#microsoft.graph.iPv4CidrRange",
      "cidrAddress": "203.0.113.0/24"
    },
    {
      "@odata.type": "#microsoft.graph.iPv4CidrRange",
      "cidrAddress": "198.51.100.0/28"
    },
    {
      "@odata.type": "#microsoft.graph.iPv6CidrRange",
      "cidrAddress": "2001:db8::/48"
    }
  ]
}
```

`isTrusted: true` marks this location as trusted — affects MFA requirements and sign-in risk calculations.

## Country/Region-Based Named Location

```
POST /identity/conditionalAccess/namedLocations
{
  "@odata.type": "#microsoft.graph.countryNamedLocation",
  "displayName": "Allowed Countries",
  "includeUnknownCountriesAndRegions": false,
  "countriesAndRegions": ["US", "GB", "DE", "AU", "CA"]
}
```

`includeUnknownCountriesAndRegions: true` includes IPs that cannot be mapped to a country.

## List Named Locations

```
GET /identity/conditionalAccess/namedLocations
  ?$select=id,displayName,modifiedDateTime,createdDateTime
```

Filter by type:
```
GET /identity/conditionalAccess/namedLocations
  ?$filter=isOf('microsoft.graph.ipNamedLocation')

GET /identity/conditionalAccess/namedLocations
  ?$filter=isOf('microsoft.graph.countryNamedLocation')
```

## Update Named Location

```
PATCH /identity/conditionalAccess/namedLocations/{locationId}
{
  "@odata.type": "#microsoft.graph.ipNamedLocation",
  "displayName": "Contoso HQ — Seattle (Updated)",
  "isTrusted": true,
  "ipRanges": [
    { "@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "203.0.113.0/24" },
    { "@odata.type": "#microsoft.graph.iPv4CidrRange", "cidrAddress": "203.0.114.0/24" }
  ]
}
```

## Delete Named Location

```
DELETE /identity/conditionalAccess/namedLocations/{locationId}
```

Named locations referenced by active CA policies cannot be deleted — remove all policy references first.

## Using Named Locations in CA Policies

Reference a named location in a CA policy:

**Include only known locations** (block everything else):
```json
"conditions": {
  "locations": {
    "includeLocations": ["AllTrusted"],
    "excludeLocations": []
  }
}
```

**Block specific countries**:
```json
"conditions": {
  "locations": {
    "includeLocations": ["<country-named-location-id>"],
    "excludeLocations": ["AllTrusted"]
  }
},
"grantControls": {
  "operator": "OR",
  "builtInControls": ["block"]
}
```

**Require MFA except from trusted IPs**:
```json
"conditions": {
  "locations": {
    "includeLocations": ["All"],
    "excludeLocations": ["AllTrusted"]
  }
},
"grantControls": {
  "operator": "OR",
  "builtInControls": ["mfa"]
}
```

## GPS-Based Named Location (Preview)

```
POST /beta/identity/conditionalAccess/namedLocations
{
  "@odata.type": "#microsoft.graph.physicalOfficeNamedLocation",
  "displayName": "Seattle Office GPS",
  "address": {
    "street": "1 Microsoft Way",
    "city": "Redmond",
    "state": "WA",
    "postalCode": "98052",
    "countryOrRegion": "US"
  },
  "radius": 50
}
```

Requires the GPS location claims in the sign-in token (Microsoft Entra Internet Access or Global Secure Access).

## Trusted IPs (Legacy MFA — Multi-Factor Auth Service)

Note: The modern approach uses Named Locations with `isTrusted: true` in CA policies.
Legacy MFA server trusted IPs are configured separately in the legacy MFA portal — not via Graph API.
