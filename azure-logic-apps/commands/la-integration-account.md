---
name: la-integration-account
description: "Set up B2B integration account — create account, add partners, agreements, schemas, maps"
argument-hint: "[--tier <free|basic|standard>] [--link-to <logic-app-name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Set Up B2B Integration Account

Create and configure an Azure Integration Account for B2B enterprise integration scenarios including trading partners, agreements, schemas, and maps.

## Instructions

### 1. Create Integration Account

Ask for `--tier` if not provided. Tiers: `Free` (limited to 1 agreement, dev/test only), `Basic` (message processing only), `Standard` (full B2B with maps, schemas, and flat file encoding).

```bash
az integration-account create \
  --resource-group <rg-name> \
  --name <integration-account-name> \
  --location <region> \
  --sku <Free|Basic|Standard>
```

Verify creation:
```bash
az integration-account show \
  --resource-group <rg-name> \
  --name <integration-account-name> \
  --output table
```

### 2. Link to Logic App

**For Consumption Logic Apps**:
```bash
az logic workflow update \
  --resource-group <rg-name> \
  --name <logic-app-name> \
  --integration-account "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>"
```

**For Standard Logic Apps**: Add the integration account reference in the Logic App application settings:
```bash
az logicapp config appsettings set \
  --name <logic-app-name> \
  --resource-group <rg-name> \
  --settings "WORKFLOWS_INTEGRATION_ACCOUNT_ID=/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>"
```

If `--link-to` is provided, use the specified Logic App name.

### 3. Add Trading Partners

Create trading partners with business identities:

```bash
az integration-account partner create \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --partner-name <partner-name> \
  --partner-type "B2B" \
  --content '{
    "b2b": {
      "businessIdentities": [
        {
          "qualifier": "AS2Identity",
          "value": "<partner-as2-identity>"
        },
        {
          "qualifier": "ZZ",
          "value": "<partner-edi-identifier>"
        }
      ]
    }
  }'
```

Create at least two partners (your organization and the trading partner) for an agreement.

List existing partners:
```bash
az integration-account partner list \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --output table
```

### 4. Create Agreements

Create an agreement between two trading partners. Ask the user which protocol to use: `AS2`, `X12`, or `EDIFACT`.

**AS2 Agreement**:
```bash
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>/agreements/<agreement-name>?api-version=2019-05-01" \
  --body '{
    "properties": {
      "agreementType": "AS2",
      "hostPartner": "<host-partner-name>",
      "guestPartner": "<guest-partner-name>",
      "hostIdentity": {
        "qualifier": "AS2Identity",
        "value": "<host-as2-identity>"
      },
      "guestIdentity": {
        "qualifier": "AS2Identity",
        "value": "<guest-as2-identity>"
      },
      "content": {
        "aS2": {
          "receiveAgreement": {
            "senderBusinessIdentity": { "qualifier": "AS2Identity", "value": "<guest>" },
            "receiverBusinessIdentity": { "qualifier": "AS2Identity", "value": "<host>" },
            "protocolSettings": {
              "messageConnectionSettings": { "ignoreCertificateNameMismatch": false, "supportHttpStatusCodeContinue": true, "keepHttpConnectionAlive": true, "unfoldHttpHeaders": true },
              "acknowledgementConnectionSettings": { "ignoreCertificateNameMismatch": false, "supportHttpStatusCodeContinue": false, "keepHttpConnectionAlive": false, "unfoldHttpHeaders": false },
              "mdnSettings": { "needMDN": true, "signMDN": false, "sendMDNAsynchronously": false },
              "securitySettings": { "overrideGroupSigningCertificate": false },
              "validationSettings": { "overrideMessageProperties": false, "encryptMessage": false, "signMessage": false, "compressMessage": false, "checkDuplicateMessage": true, "interchangeDuplicatesValidityDays": 5, "checkCertificateRevocationListOnSend": false, "checkCertificateRevocationListOnReceive": false, "encryptionAlgorithm": "DES3" },
              "envelopeSettings": { "messageContentType": "text/plain", "transmitFileNameInMimeHeader": false, "fileNameTemplate": "%FILE().ReceivedFileName%" }
            }
          },
          "sendAgreement": {
            "senderBusinessIdentity": { "qualifier": "AS2Identity", "value": "<host>" },
            "receiverBusinessIdentity": { "qualifier": "AS2Identity", "value": "<guest>" },
            "protocolSettings": {
              "messageConnectionSettings": { "ignoreCertificateNameMismatch": false, "supportHttpStatusCodeContinue": true, "keepHttpConnectionAlive": true, "unfoldHttpHeaders": true },
              "acknowledgementConnectionSettings": { "ignoreCertificateNameMismatch": false, "supportHttpStatusCodeContinue": false, "keepHttpConnectionAlive": false, "unfoldHttpHeaders": false },
              "mdnSettings": { "needMDN": true, "signMDN": false, "sendMDNAsynchronously": false },
              "securitySettings": { "overrideGroupSigningCertificate": false },
              "validationSettings": { "overrideMessageProperties": false, "encryptMessage": false, "signMessage": false, "compressMessage": false, "checkDuplicateMessage": true, "interchangeDuplicatesValidityDays": 5, "checkCertificateRevocationListOnSend": false, "checkCertificateRevocationListOnReceive": false, "encryptionAlgorithm": "DES3" },
              "envelopeSettings": { "messageContentType": "text/plain", "transmitFileNameInMimeHeader": false, "fileNameTemplate": "%FILE().ReceivedFileName%" }
            }
          }
        }
      }
    }
  }'
```

For **X12** and **EDIFACT**, the structure is similar but with protocol-specific settings. Ask the user for the required EDI parameters (ISA qualifiers for X12, UNB identifiers for EDIFACT).

### 5. Upload Schemas (XSD)

Upload XSD schemas for message validation:

```bash
az integration-account schema create \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --schema-name <schema-name> \
  --schema-type "Xml" \
  --content-type "application/xml" \
  --input-file-path <path-to-xsd-file>
```

List schemas:
```bash
az integration-account schema list \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --output table
```

For Standard Logic Apps, schemas can also be placed in the project's `Artifacts/Schemas/` directory for local development.

### 6. Upload Maps (XSLT)

Upload XSLT maps for message transformation:

```bash
az integration-account map create \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --map-name <map-name> \
  --map-type "Xslt" \
  --content-type "application/xml" \
  --input-file-path <path-to-xslt-file>
```

Supported map types: `Xslt`, `Xslt20`, `Xslt30`, `Liquid`.

List maps:
```bash
az integration-account map list \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --output table
```

For Standard Logic Apps, maps can also be placed in the project's `Artifacts/Maps/` directory.

### 7. Upload Certificates (If Needed)

For signed or encrypted AS2 messages, upload certificates:

```bash
# Upload public certificate
az integration-account certificate create \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --certificate-name <cert-name> \
  --public-certificate <path-to-cer-file>

# For private certificates, store in Key Vault first, then reference
az integration-account certificate create \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --certificate-name <cert-name> \
  --key-name <key-vault-key-name> \
  --key-vault-id "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.KeyVault/vaults/<vault-name>" \
  --key-version <key-version>
```

### 8. Show and Delete Assets

**Partners**:
```bash
# Show partner details
az integration-account partner show \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --partner-name <partner-name>

# Delete partner
az integration-account partner delete \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --partner-name <partner-name> --yes
```

**Schemas**:
```bash
# Show schema details
az integration-account schema show \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --schema-name <schema-name>

# Delete schema
az integration-account schema delete \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --schema-name <schema-name> --yes
```

**Maps**:
```bash
# Show map details
az integration-account map show \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --map-name <map-name>

# Delete map
az integration-account map delete \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --map-name <map-name> --yes
```

**Certificates**:
```bash
# List certificates
az integration-account certificate list \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --output table

# Show certificate details
az integration-account certificate show \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --certificate-name <cert-name>

# Delete certificate
az integration-account certificate delete \
  --resource-group <rg-name> \
  --integration-account-name <integration-account-name> \
  --certificate-name <cert-name> --yes
```

**Agreements** (via REST — no direct CLI command):
```bash
# Show agreement details
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>/agreements/<agreement-name>?api-version=2019-05-01"

# Delete agreement
az rest --method DELETE \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>/agreements/<agreement-name>?api-version=2019-05-01"

# List agreements
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>/agreements?api-version=2019-05-01"
```

**Assemblies** (for custom .NET code in maps):
```bash
# Create assembly
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>/assemblies/<assembly-name>?api-version=2019-05-01" \
  --body '{
    "properties": {
      "assemblyName": "<assembly-name>",
      "content": "<base64-encoded-dll>",
      "contentType": "application/octet-stream"
    }
  }'

# Delete assembly
az rest --method DELETE \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>/assemblies/<assembly-name>?api-version=2019-05-01"
```

**Batch Configurations**:
```bash
# Create batch configuration
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>/batchConfigurations/<batch-name>?api-version=2019-05-01" \
  --body '{
    "properties": {
      "batchGroupName": "<batch-name>",
      "releaseCriteria": {
        "messageCount": 100,
        "batchSize": 10485760,
        "recurrence": { "frequency": "Minute", "interval": 15 }
      }
    }
  }'

# Delete batch configuration
az rest --method DELETE \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.Logic/integrationAccounts/<integration-account-name>/batchConfigurations/<batch-name>?api-version=2019-05-01"
```

**Delete entire integration account**:
```bash
az integration-account delete \
  --resource-group <rg-name> \
  --name <integration-account-name> --yes
```

### 9. Verify B2B Workflow End-to-End

Test the integration account setup by creating a workflow that uses B2B actions:

1. Create a workflow with an HTTP Request trigger.
2. Add an **XML Validation** action referencing the uploaded schema.
3. Add a **Transform XML** action referencing the uploaded map.
4. Add an **Encode X12 message** or **Encode AS2 message** action referencing the agreement.
5. Run the workflow with sample data and verify each step succeeds.

```bash
# Check integration account status
az integration-account show \
  --resource-group <rg-name> \
  --name <integration-account-name> \
  --query "{name:name, sku:sku.name, partners:properties.partnersCount, agreements:properties.agreementsCount, schemas:properties.schemasCount, maps:properties.mapsCount}" \
  --output table
```

Display summary with all configured resources and next steps.
