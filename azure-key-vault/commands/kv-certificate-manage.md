---
name: kv-certificate-manage
description: "Create self-signed or CA-integrated certificates, configure auto-renewal, and export"
argument-hint: "<create-self-signed|create-ca|list|show|export|delete> --vault <vault-name> --name <cert-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Key Vault Certificates

Create, manage, and export certificates in Azure Key Vault.

## Instructions

### 1. Validate Inputs

- `<action>` -- One of: `create-self-signed`, `create-ca`, `list`, `show`, `export`, `delete`. Ask if not provided.
- `--vault` -- Key Vault name. Ask if not provided.
- `--name` -- Certificate name (required for all except `list`). Ask if not provided.

### 2. Action: Create a Self-Signed Certificate

Create a certificate issuance policy and issue:

```bash
az keyvault certificate create \
  --vault-name <vault-name> \
  --name <cert-name> \
  --policy "$(cat <<'POLICY'
{
  "issuerParameters": { "name": "Self" },
  "keyProperties": {
    "exportable": true,
    "keySize": 2048,
    "keyType": "RSA",
    "reuseKey": false
  },
  "secretProperties": { "contentType": "application/x-pkcs12" },
  "x509CertificateProperties": {
    "subject": "CN=<common-name>",
    "subjectAlternativeNames": {
      "dnsNames": ["<domain1>", "<domain2>"]
    },
    "validityInMonths": 12,
    "keyUsage": ["digitalSignature", "keyEncipherment"]
  },
  "lifetimeActions": [
    {
      "trigger": { "daysBeforeExpiry": 30 },
      "action": { "actionType": "AutoRenew" }
    }
  ]
}
POLICY
)"
```

Ask the user for:
- **Subject (CN)** -- Common name for the certificate (e.g., `*.contoso.com`, `api.contoso.com`).
- **SANs** -- Subject alternative names (additional DNS names).
- **Validity** -- Duration in months. Default: 12.
- **Key size** -- 2048 or 4096. Default: 2048.
- **Auto-renew** -- Days before expiry to trigger renewal. Default: 30 days.

### 3. Action: Create a CA-Integrated Certificate

For certificates issued by an integrated CA (DigiCert, GlobalSign):

```bash
# First, configure the CA issuer (one-time setup)
az keyvault certificate issuer create \
  --vault-name <vault-name> \
  --issuer-name <issuer-name> \
  --provider-name <DigiCert|GlobalSign> \
  --account-id <ca-account-id> \
  --password <ca-password>

# Then create the certificate with the CA issuer
az keyvault certificate create \
  --vault-name <vault-name> \
  --name <cert-name> \
  --policy "$(cat <<'POLICY'
{
  "issuerParameters": { "name": "<issuer-name>" },
  "keyProperties": {
    "exportable": true,
    "keySize": 2048,
    "keyType": "RSA"
  },
  "secretProperties": { "contentType": "application/x-pkcs12" },
  "x509CertificateProperties": {
    "subject": "CN=<common-name>",
    "validityInMonths": 12
  },
  "lifetimeActions": [
    {
      "trigger": { "daysBeforeExpiry": 60 },
      "action": { "actionType": "AutoRenew" }
    }
  ]
}
POLICY
)"
```

Note: CA-integrated certificates may take time to issue depending on the CA's validation process.

### 4. Action: List Certificates

```bash
# List all certificates
az keyvault certificate list \
  --vault-name <vault-name> \
  --query "[].{name:name, expires:attributes.expires, enabled:attributes.enabled}" \
  -o table

# List versions of a specific certificate
az keyvault certificate list-versions \
  --vault-name <vault-name> \
  --name <cert-name> \
  -o table
```

### 5. Action: Show Certificate Details

```bash
az keyvault certificate show \
  --vault-name <vault-name> \
  --name <cert-name> \
  --query "{name:name, subject:policy.x509CertificateProperties.subject, issuer:policy.issuerParameters.name, expires:attributes.expires, thumbprint:x509Thumbprint, keyId:kid, secretId:sid}"
```

### 6. Action: Export Certificate

```bash
# Export as PEM (certificate only)
az keyvault certificate download \
  --vault-name <vault-name> \
  --name <cert-name> \
  --file <output-path>.pem \
  --encoding PEM

# Export as PFX/PKCS12 (certificate + private key)
az keyvault secret show \
  --vault-name <vault-name> \
  --name <cert-name> \
  --query value -o tsv | base64 -d > <output-path>.pfx

# Export as DER
az keyvault certificate download \
  --vault-name <vault-name> \
  --name <cert-name> \
  --file <output-path>.der \
  --encoding DER
```

Warn the user:
- PFX export includes the private key -- handle securely.
- The secret backing the certificate uses the same name as the certificate.

### 7. Action: Delete Certificate

```bash
# Soft-delete
az keyvault certificate delete \
  --vault-name <vault-name> \
  --name <cert-name>

# Recover soft-deleted
az keyvault certificate recover \
  --vault-name <vault-name> \
  --name <cert-name>

# Purge (permanent)
az keyvault certificate purge \
  --vault-name <vault-name> \
  --name <cert-name>
```

### 8. Display Summary

Show the user:
- Action performed and result
- Certificate thumbprint and expiration date
- Relevant next steps (e.g., bind to App Service with `/kv-app-integration`, audit access with `/kv-access-audit`)
