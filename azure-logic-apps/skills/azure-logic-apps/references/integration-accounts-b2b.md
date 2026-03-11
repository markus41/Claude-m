# Integration Accounts and B2B Reference

## Overview

Integration accounts store B2B artifacts (partners, agreements, schemas, maps, certificates) and enable XML validation, XSLT transforms, flat file processing, and EDI (AS2, X12, EDIFACT) operations.

## Tiers and Limits

| Feature | Free | Basic | Standard |
|---|---|---|---|
| Monthly cost | $0 | ~$0.80/hour | ~$2.40/hour |
| Trading partners | 25 | 2 | 500 |
| Agreements | 10 | 1 | 1,000 |
| Schemas | 25 | 500 | 1,000 |
| Maps | 25 | 500 | 1,000 |
| Certificates | 25 | 2 | 1,000 |
| Assemblies | 10 | 25 | 50 |
| Batch configurations | 5 | 1 | 50 |
| Max artifact size | 8 MB | 8 MB | 8 MB |
| B2B tracking / SLA | No | Yes | Yes |

Free tier: No SLA, dev/test only.

## Linking to Logic App

### Consumption

```json
{ "type": "Microsoft.Logic/workflows", "properties": { "integrationAccount": { "id": "[resourceId('Microsoft.Logic/integrationAccounts', 'my-ia')]" }, "definition": { "..." : "..." } } }
```

Must be same region. Standard Logic Apps can reference cross-region accounts.

### Standard

Set app setting: `WORKFLOWS_INTEGRATION_ACCOUNT_ID=/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/integrationAccounts/{name}`

## Trading Partners

```json
{
  "type": "Microsoft.Logic/integrationAccounts/partners",
  "apiVersion": "2019-05-01",
  "name": "[concat(parameters('iaName'), '/ContosoPartner')]",
  "properties": {
    "partnerType": "B2B",
    "content": { "b2b": { "businessIdentities": [
      { "qualifier": "AS2Identity", "value": "Contoso" },
      { "qualifier": "ZZ", "value": "CONTOSO01" },
      { "qualifier": "14", "value": "1234567890123" }
    ] } }
  }
}
```

### Business Identity Qualifiers

| Qualifier | Standard | Description |
|---|---|---|
| `AS2Identity` | AS2 | AS2 partner identifier |
| `ZZ` | X12 | Mutually defined |
| `01` | X12 | DUNS number |
| `14` | X12 | DUNS+4 |
| `ZZZ` | EDIFACT | Mutually defined |
| `9` | EDIFACT | EAN International |
| `14` | EDIFACT | EAN (GS1) |

## AS2 Agreement

```json
{
  "type": "Microsoft.Logic/integrationAccounts/agreements",
  "properties": {
    "agreementType": "AS2",
    "hostPartner": "HostOrg", "guestPartner": "ContosoPartner",
    "hostIdentity": { "qualifier": "AS2Identity", "value": "HostOrg" },
    "guestIdentity": { "qualifier": "AS2Identity", "value": "Contoso" },
    "content": { "aS2": {
      "receiveAgreement": { "protocolSettings": {
        "mdnSettings": { "needMDN": true, "signMDN": true, "sendMDNAsynchronously": false, "micHashingAlgorithm": "SHA2256" },
        "securitySettings": { "encryptionCertificateName": "ContosoCert", "enableNRRForInboundEncodedMessages": false },
        "validationSettings": { "encryptMessage": true, "signMessage": true, "checkDuplicateMessage": true, "interchangeDuplicatesValidityDays": 5, "encryptionAlgorithm": "AES256" },
        "envelopeSettings": { "messageContentType": "text/plain", "transmitFileNameInMimeHeader": true },
        "errorSettings": { "resendIfMDNNotReceived": true }
      },
      "senderBusinessIdentity": { "qualifier": "AS2Identity", "value": "Contoso" },
      "receiverBusinessIdentity": { "qualifier": "AS2Identity", "value": "HostOrg" } },
      "sendAgreement": { "protocolSettings": { "...same structure..." : "..." },
        "senderBusinessIdentity": { "qualifier": "AS2Identity", "value": "HostOrg" },
        "receiverBusinessIdentity": { "qualifier": "AS2Identity", "value": "Contoso" } }
    }}
  }
}
```

## X12 Agreement (Key Settings)

```json
{
  "properties": {
    "agreementType": "X12",
    "content": { "x12": { "receiveAgreement": { "protocolSettings": {
      "validationSettings": { "validateCharacterSet": true, "checkDuplicateInterchangeControlNumber": true, "interchangeControlNumberValidityDays": 30, "validateEDITypes": true, "trailingSeparatorPolicy": "NotAllowed" },
      "framingSettings": { "dataElementSeparator": 42, "componentSeparator": 58, "segmentTerminator": 126, "characterSet": "UTF8" },
      "envelopeSettings": { "controlVersionNumber": "00501", "rolloverInterchangeControlNumber": true, "rolloverGroupControlNumber": true },
      "acknowledgementSettings": { "needTechnicalAcknowledgement": true, "needFunctionalAcknowledgement": true, "sendSynchronousAcknowledgement": true },
      "schemaReferences": [{ "messageId": "810", "schemaVersion": "00501", "schemaName": "X12_00501_810" }]
    }}}}
  }
}
```

### EDIFACT

EDIFACT follows the same pattern with UNB segment config, `syntaxIdentifier` (UNOA/UNOB/UNOC), `decimalPointIndicator`, `releaseIndicator` (default `?`), and message types (ORDERS, INVOIC, DESADV).

## Schemas

```bash
# Upload schema via REST API
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/integrationAccounts/{ia}/schemas/X12_00501_810?api-version=2019-05-01" \
  --body '{ "properties": { "schemaType": "Xml", "content": "<xs:schema ...>...</xs:schema>", "contentType": "application/xml" } }'
```

### Validation Action

```json
"Validate_XML": { "type": "XmlValidation", "inputs": { "content": "@triggerBody()", "integrationAccount": { "schema": { "name": "OrderSchema" } } }, "runAfter": {} }
```

### Schema References in Agreements

```json
"schemaReferences": [
  { "messageId": "810", "schemaVersion": "00501", "schemaName": "X12_00501_810" },
  { "messageId": "850", "schemaVersion": "00501", "schemaName": "X12_00501_850" }
]
```

## Maps

Map types: `Xslt` (1.0), `Xslt20`, `Xslt30`, `Liquid`.

### Liquid Template Example

```liquid
{% assign order = content %}
{
  "invoiceNumber": "INV-{{ order.orderId }}",
  "customer": "{{ order.customerName | upcase }}",
  "lineItems": [{% for item in order.items %}
    { "sku": "{{ item.sku }}", "amount": {{ item.price | times: item.quantity }} }{% unless forloop.last %},{% endunless %}{% endfor %}
  ]
}
```

### Transform Actions

```json
"Transform_XML": { "type": "Xslt", "inputs": { "content": "@body('Decode_X12')", "integrationAccount": { "map": { "name": "OrderToInvoice" } } }, "runAfter": {} },
"Transform_JSON": { "type": "Liquid", "kind": "JsonToJson", "inputs": { "content": "@triggerBody()", "integrationAccount": { "map": { "name": "OrderTransform" } } }, "runAfter": {} }
```

Liquid `kind` values: `JsonToJson`, `JsonToText`, `XmlToJson`, `XmlToText`.

## Certificates

### Public (Partner Verification)

```json
{ "type": "Microsoft.Logic/integrationAccounts/certificates", "name": "[concat(parameters('iaName'), '/ContosoCert')]",
  "properties": { "publicCertificate": "[parameters('certBase64')]" } }
```

### Private (Signing/Decryption -- Key Vault Integration)

```json
{ "type": "Microsoft.Logic/integrationAccounts/certificates", "name": "[concat(parameters('iaName'), '/HostCert')]",
  "properties": {
    "publicCertificate": "[parameters('publicCertBase64')]",
    "key": { "keyVault": { "id": "[resourceId('Microsoft.KeyVault/vaults', parameters('kvName'))]" }, "keyName": "[parameters('keyName')]", "keyVersion": "[parameters('keyVersion')]" }
  } }
```

## Batch Operations

```json
{ "type": "Microsoft.Logic/integrationAccounts/batchConfigurations",
  "name": "[concat(parameters('iaName'), '/InvoiceBatch')]",
  "properties": { "batchGroupName": "InvoiceBatch",
    "releaseCriteria": { "messageCount": 100, "batchSize": 10485760,
      "recurrence": { "frequency": "Hour", "interval": 1 } } } }
```

Release fires when ANY criterion is met (count OR size OR schedule).

## REST API

```bash
# List partners
az rest --method GET --uri "https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/integrationAccounts/{ia}/partners?api-version=2019-05-01"
# Create agreement
az rest --method PUT --uri ".../{ia}/agreements/{name}?api-version=2019-05-01" --body @agreement.json
# List schemas
az rest --method GET --uri ".../{ia}/schemas?api-version=2019-05-01"
# Get schema content URL
az rest --method POST --uri ".../{ia}/schemas/{name}/listContentCallbackUrl?api-version=2019-05-01" --body '{}'
```

## Common B2B Pipeline Pattern

```
1. AS2 Decode    -- Strip envelope, verify signature, decrypt
2. X12 Decode    -- Parse EDI interchange, validate against schema
3. XSLT Transform -- Convert X12 XML to internal canonical format
4. Business Logic -- Process order, update database
5. XSLT Transform -- Convert canonical to outbound X12 XML
6. X12 Encode    -- Generate EDI envelope with control numbers
7. AS2 Encode    -- Apply signing, encryption, AS2 headers
8. HTTP Send     -- POST to partner AS2 endpoint
9. Process MDN   -- Handle acknowledgement
```

### B2B Workflow Actions

```json
"AS2_Decode": { "type": "ApiConnection", "inputs": { "host": { "connection": { "name": "@parameters('$connections')['as2']['connectionId']" } }, "method": "post", "path": "/decode", "body": "@triggerBody()", "headers": "@triggerOutputs()['headers']" }, "runAfter": {} },
"Send_MDN": { "type": "Response", "inputs": { "statusCode": 200, "headers": "@body('AS2_Decode')?['OutgoingMDN']?['OutboundHeaders']", "body": "@body('AS2_Decode')?['OutgoingMDN']?['Content']" }, "runAfter": { "AS2_Decode": ["Succeeded"] } },
"Decode_X12": { "type": "ApiConnection", "inputs": { "host": { "connection": { "name": "@parameters('$connections')['x12']['connectionId']" } }, "method": "post", "path": "/decode", "body": "@body('AS2_Decode')?['Content']" }, "runAfter": { "AS2_Decode": ["Succeeded"] } }
```

## B2B Message Tracking

Enable in agreement settings to capture control numbers and transaction IDs for audit. Tracked properties appear in Application Insights and Log Analytics.
