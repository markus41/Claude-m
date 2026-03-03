# Power Automate — Custom Connectors

## Overview
Custom connectors wrap REST APIs as Power Platform connectors, making them available in Power
Automate, Power Apps, and Logic Apps. They are defined via OpenAPI 2.0 (Swagger) specification
with extensions. Custom connectors support OAuth 2.0, API Key, Basic Auth, Windows Auth, and
custom code policies (C# script) for request/response transformation.

---

## Custom Connector Lifecycle

```
1. Define API spec (OpenAPI 2.0 or Postman collection)
2. Create connector (portal or PAC CLI)
3. Configure authentication
4. Add code policy (optional — for transformation)
5. Test actions
6. Share connector
7. Use in solutions (connection references)
8. Certify (optional — for AppSource)
```

---

## OpenAPI 2.0 Definition

```yaml
swagger: "2.0"
info:
  title: Contoso Inventory API
  description: Manage inventory levels and warehouse operations
  version: "1.0"
  x-ms-connector-metadata:
    - propertyName: Website
      propertyValue: https://contoso.com
    - propertyName: Privacy policy
      propertyValue: https://contoso.com/privacy
    - propertyName: Categories
      propertyValue: Commerce;Logistics

host: api.contoso.com
basePath: /v1
schemes:
  - https

consumes:
  - application/json
produces:
  - application/json

securityDefinitions:
  oauth2_auth:
    type: oauth2
    flow: accessCode
    authorizationUrl: https://login.microsoftonline.com/common/oauth2/v2.0/authorize
    tokenUrl: https://login.microsoftonline.com/common/oauth2/v2.0/token
    scopes:
      api://contoso-inventory/.default: Access Contoso Inventory API

security:
  - oauth2_auth: [api://contoso-inventory/.default]

paths:
  /products:
    get:
      summary: List products
      description: Returns all products with stock levels
      operationId: ListProducts
      x-ms-visibility: important
      parameters:
        - name: warehouseId
          in: query
          required: false
          type: string
          x-ms-summary: Warehouse ID
          description: Filter by specific warehouse
        - name: $top
          in: query
          required: false
          type: integer
          default: 50
          x-ms-summary: Page size
      responses:
        "200":
          description: List of products
          schema:
            type: object
            properties:
              value:
                type: array
                items:
                  $ref: "#/definitions/Product"

  /products/{productId}/restock:
    post:
      summary: Restock product
      description: Submit restock request for a product
      operationId: RestockProduct
      x-ms-visibility: important
      x-ms-no-generic-test: true
      parameters:
        - name: productId
          in: path
          required: true
          type: string
          x-ms-summary: Product ID
          x-ms-url-encoding: single
        - name: body
          in: body
          required: true
          schema:
            $ref: "#/definitions/RestockRequest"
      responses:
        "201":
          description: Restock order created
          schema:
            $ref: "#/definitions/RestockOrder"
        "400":
          description: Bad request

definitions:
  Product:
    type: object
    properties:
      id:        { type: string, x-ms-summary: Product ID }
      name:      { type: string, x-ms-summary: Name }
      sku:       { type: string, x-ms-summary: SKU }
      stock:     { type: integer, x-ms-summary: Stock Level }
      warehouse: { type: string, x-ms-summary: Warehouse }

  RestockRequest:
    type: object
    required: [quantity]
    properties:
      quantity:    { type: integer, x-ms-summary: Quantity, description: "Units to restock" }
      priority:    { type: string, x-ms-summary: Priority, enum: [low, normal, high], default: normal }
      requestedBy: { type: string, x-ms-summary: Requested By }

  RestockOrder:
    type: object
    properties:
      orderId:   { type: string }
      status:    { type: string }
      createdAt: { type: string, format: date-time }
```

---

## Authentication Types

### OAuth 2.0 (Authorization Code)
```json
{
  "type": "oauth2",
  "flow": "accessCode",
  "authorizationUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  "tokenUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  "refreshUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  "scopes": {
    "api://your-app-id/.default": "Access your API"
  },
  "clientId": "power-platform-client-id",
  "clientSecret": "stored-in-connector-secret-store"
}
```

### API Key
```yaml
securityDefinitions:
  api_key_auth:
    type: apiKey
    in: header
    name: X-API-Key
```

### Basic Auth
```yaml
securityDefinitions:
  basic_auth:
    type: basic
```

### Client Credentials (Service-to-Service)
```yaml
securityDefinitions:
  oauth2_client_creds:
    type: oauth2
    flow: application
    tokenUrl: https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
    scopes:
      api://your-app-id/.default: Access API
```

---

## PAC CLI — Connector Management

```bash
# Install PAC CLI
npm install -g @microsoft/powerplatform-cli

# Authenticate
pac auth create --url https://yourorg.crm.dynamics.com

# Download existing connector definition
pac connector download --connector-id your-connector-id --outputDirectory ./connector-output

# Create connector from file
pac connector create --solution-unique-name YourSolution --outputDirectory ./connector-output

# Update connector
pac connector update --connector-id your-connector-id --outputDirectory ./connector-output

# List connectors
pac connector list --environment-id your-env-id
```

---

## Code Policy (C# Script)

Code policies let you transform requests and responses in C#:

```csharp
// Transform request: add timestamp header
public class Script : ScriptBase
{
    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        // Add custom header to every request
        this.Context.Request.Headers.TryAddWithoutValidation(
            "X-Request-Timestamp",
            DateTimeOffset.UtcNow.ToString("o")
        );

        // Forward request
        var response = await this.Context.SendAsync(
            this.Context.Request,
            this.CancellationToken
        ).ConfigureAwait(false);

        // Transform response: normalize field names
        if (response.IsSuccessStatusCode &&
            this.Context.OperationId == "ListProducts")
        {
            var body = await response.Content.ReadAsStringAsync();
            var json = JObject.Parse(body);

            // Flatten nested structure
            foreach (var item in json["value"])
            {
                item["displayName"] = $"{item["sku"]} - {item["name"]}";
            }

            response.Content = new StringContent(
                json.ToString(),
                Encoding.UTF8,
                "application/json"
            );
        }

        return response;
    }
}
```

**Code policy execution context:**
- `this.Context.OperationId` — current action being executed
- `this.Context.Request` — HttpRequestMessage (read/modify)
- `this.Context.SendAsync()` — forward to actual API
- `this.CancellationToken` — cancellation support

---

## Webhook / Trigger Definition

```yaml
paths:
  /webhooks/register:
    post:
      summary: Subscribe to inventory alert
      operationId: SubscribeInventoryAlert
      x-ms-trigger: single
      x-ms-trigger-hint: Fires when stock drops below threshold
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
            properties:
              callbackUrl:
                type: string
                x-ms-notification-url: true
                x-ms-visibility: internal
                title: Callback URL
              threshold:
                type: integer
                x-ms-summary: Stock threshold
                description: Alert when stock drops below this level
      responses:
        "201":
          description: Subscription created
          schema:
            type: object
            properties:
              subscriptionId: { type: string }

  /webhooks/{subscriptionId}:
    delete:
      summary: Unsubscribe from inventory alert
      operationId: UnsubscribeInventoryAlert
      x-ms-trigger-unsubscribe: true
      parameters:
        - name: subscriptionId
          in: path
          required: true
          type: string
      responses:
        "204":
          description: Unsubscribed
```

---

## Sharing Connectors

```bash
# Share with specific user
pac connector share --connector-id your-id --userId user@contoso.com --role CanUse

# Share with security group (for bulk sharing)
pac connector share --connector-id your-id --groupId sg-guid --role CanUseAndShare
```

| Role | Can Use | Can Share | Can Edit |
|---|---|---|---|
| `CanUse` | ✅ | ❌ | ❌ |
| `CanUseAndShare` | ✅ | ✅ | ❌ |
| `CanEdit` | ✅ | ✅ | ✅ |

---

## Solution-Aware Connector + Connection Reference

```bash
# Add connector to solution
pac solution add-reference --solution-unique-name YourSolution --component-id your-connector-id --component-type connector

# Connection references are auto-created in solution; must be re-mapped on import:
pac solution import --path ./solution.zip --async
# Then remap connection reference:
pac connection reference update --connection-reference-id ref-id --connection-id new-connection-id
```

---

## Certifying a Connector (Microsoft AppSource)

1. Ensure connector meets [Microsoft certification requirements](https://learn.microsoft.com/connectors/custom-connectors/certification-submission)
2. Submit via Partner Center
3. Required: OpenAPI 2.0 spec, icon (1:1 ratio, 100x100px, no white background), color (#007ee5 recommended)
4. Required: Complete documentation for every action
5. Automated testing via certification pipeline
6. Manual review by Microsoft team (~2–4 weeks)

---

## Error Codes

| Error | Cause | Remediation |
|---|---|---|
| `InvalidDefinition` | OpenAPI spec invalid | Validate with Swagger editor |
| `DuplicateOperationId` | Same operationId used twice | Make all operationId values unique |
| `AuthorizationFailed` | OAuth token invalid or expired | Re-create connection; check app registration |
| `ConnectorThrottled` | 500 requests/60s exceeded | Add delay or reduce parallel calls |
| `SecurityDefinitionMissing` | No auth defined | Add `securityDefinitions` to spec |
| `SchemaValidationFailed` | Request/response doesn't match spec | Update schema or add `x-ms-no-generic-test` |
| `ConnectionReferenceNotMapped` | Not re-mapped after solution import | Run `pac connection reference update` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Actions per connector | 500 | |
| Request size | 100 MB | Per action |
| Response size | 100 MB | Per action |
| Connections per connector | 1,000 per environment | |
| Code policy execution | 5 seconds | Per action execution |
| Code policy memory | 64 MB | |
| Connector name length | 60 characters | |
| Custom connectors per environment | 1,000 | |

---

## Production Gotchas

- **OpenAPI 2.0 only** — Power Platform does not support OpenAPI 3.0 specs natively; use
  tools like `api-spec-converter` to downgrade if your API generates 3.0.
- **`x-ms-visibility: internal`** hides fields from the UI — use this for webhook callback URLs
  and other framework-managed values that end-users should not configure.
- **Code policy changes require connector update** — after changing C# policy code, export and
  re-import the connector definition; running flows continue using the old version until
  the connection is refreshed.
- **API Key connectors store credentials per connection** — users must enter their API key
  when creating a connection; consider OAuth 2.0 client credentials for service-to-service flows
  where users shouldn't need individual credentials.
- **`x-ms-no-generic-test: true`** suppresses automated test calling that action — add this
  to POST/DELETE/PATCH operations to prevent destructive calls during certification testing.
