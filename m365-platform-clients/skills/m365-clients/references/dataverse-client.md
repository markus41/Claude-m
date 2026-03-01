# Dataverse Client

Full TypeScript client for the Dataverse Web API with typed CRUD operations, OData queries, and batch support.

## Dependencies

```bash
npm install @azure/identity
```

## Complete DataverseClient Class

```typescript
import { TokenCredential } from "@azure/identity";

export interface DataverseConfig {
  environmentUrl: string; // e.g., "https://contoso.crm.dynamics.com"
}

export interface ODataCollection<T> {
  value: T[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

export class DataverseClient {
  private readonly baseUrl: string;
  private readonly scope: string;

  constructor(
    private readonly config: DataverseConfig,
    private readonly credential: TokenCredential
  ) {
    // Remove trailing slash if present
    const envUrl = config.environmentUrl.replace(/\/$/, "");
    this.baseUrl = `${envUrl}/api/data/v9.2`;
    this.scope = `${envUrl}/.default`;
  }

  private async headers(): Promise<Record<string, string>> {
    const tokenResponse = await this.credential.getToken(this.scope);
    if (!tokenResponse?.token) {
      throw new Error("Failed to acquire Dataverse token");
    }
    return {
      "Authorization": `Bearer ${tokenResponse.token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Accept": "application/json"
    };
  }

  // ─── READ ──────────────────────────────────────────────

  /**
   * Query an entity set with OData options.
   * @param entitySet Table logical plural name (e.g., "accounts", "contacts")
   * @param options OData query string (e.g., "$filter=name eq 'Contoso'&$select=name,revenue")
   */
  async query<T = Record<string, unknown>>(
    entitySet: string,
    options?: string
  ): Promise<ODataCollection<T>> {
    const url = options
      ? `${this.baseUrl}/${entitySet}?${options}`
      : `${this.baseUrl}/${entitySet}`;

    const response = await fetch(url, { headers: await this.headers() });
    if (!response.ok) {
      throw new Error(`Dataverse GET ${entitySet} failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }

  /**
   * Get a single record by ID.
   */
  async getById<T = Record<string, unknown>>(
    entitySet: string,
    id: string,
    select?: string
  ): Promise<T> {
    const options = select ? `?$select=${select}` : "";
    const url = `${this.baseUrl}/${entitySet}(${id})${options}`;

    const response = await fetch(url, { headers: await this.headers() });
    if (!response.ok) {
      throw new Error(`Dataverse GET ${entitySet}(${id}) failed: ${response.status}`);
    }
    return response.json();
  }

  // ─── CREATE ────────────────────────────────────────────

  /**
   * Create a new record. Returns the new record's ID.
   */
  async create(entitySet: string, body: Record<string, unknown>): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${entitySet}`, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Dataverse POST ${entitySet} failed: ${response.status} ${await response.text()}`);
    }

    // Extract ID from OData-EntityId header
    const entityId = response.headers.get("OData-EntityId") ?? "";
    const match = entityId.match(/\(([^)]+)\)/);
    if (!match) {
      throw new Error("Could not extract record ID from response");
    }
    return match[1];
  }

  /**
   * Create a record and return the full record (uses Prefer: return=representation).
   */
  async createAndReturn<T = Record<string, unknown>>(
    entitySet: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const hdrs = await this.headers();
    hdrs["Prefer"] = "return=representation";

    const response = await fetch(`${this.baseUrl}/${entitySet}`, {
      method: "POST",
      headers: hdrs,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Dataverse POST ${entitySet} failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }

  // ─── UPDATE ────────────────────────────────────────────

  /**
   * Update (partial) a record by ID.
   */
  async patch(entitySet: string, id: string, body: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${entitySet}(${id})`, {
      method: "PATCH",
      headers: await this.headers(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Dataverse PATCH ${entitySet}(${id}) failed: ${response.status} ${await response.text()}`);
    }
  }

  /**
   * Upsert: create if not exists, update if exists.
   */
  async upsert(entitySet: string, id: string, body: Record<string, unknown>): Promise<void> {
    const hdrs = await this.headers();
    // If-Match: * → update only; If-None-Match: * → create only
    // No header → upsert (create or update)

    const response = await fetch(`${this.baseUrl}/${entitySet}(${id})`, {
      method: "PATCH",
      headers: hdrs,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Dataverse UPSERT ${entitySet}(${id}) failed: ${response.status}`);
    }
  }

  // ─── DELETE ────────────────────────────────────────────

  /**
   * Delete a record by ID.
   */
  async delete(entitySet: string, id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${entitySet}(${id})`, {
      method: "DELETE",
      headers: await this.headers()
    });

    if (!response.ok) {
      throw new Error(`Dataverse DELETE ${entitySet}(${id}) failed: ${response.status}`);
    }
  }

  // ─── FUNCTIONS & ACTIONS ───────────────────────────────

  /**
   * Call a Dataverse function (GET).
   */
  async callFunction<T = unknown>(functionName: string, params?: string): Promise<T> {
    const url = params
      ? `${this.baseUrl}/${functionName}(${params})`
      : `${this.baseUrl}/${functionName}`;

    const response = await fetch(url, { headers: await this.headers() });
    if (!response.ok) {
      throw new Error(`Dataverse function ${functionName} failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Call a Dataverse action (POST).
   */
  async callAction<T = unknown>(
    actionName: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${actionName}`, {
      method: "POST",
      headers: await this.headers(),
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Dataverse action ${actionName} failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * WhoAmI — test connection and get current user info.
   */
  async whoAmI(): Promise<{ UserId: string; BusinessUnitId: string; OrganizationId: string }> {
    return this.callFunction("WhoAmI");
  }

  // ─── BATCH ─────────────────────────────────────────────

  /**
   * Execute multiple operations in a single HTTP request.
   * Returns array of response bodies.
   */
  async batch(requests: BatchRequest[]): Promise<unknown[]> {
    const batchId = `batch_${crypto.randomUUID()}`;
    const changesetId = `changeset_${crypto.randomUUID()}`;

    let body = "";
    body += `--${batchId}\r\n`;
    body += `Content-Type: multipart/mixed; boundary=${changesetId}\r\n\r\n`;

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      body += `--${changesetId}\r\n`;
      body += `Content-Type: application/http\r\n`;
      body += `Content-Transfer-Encoding: binary\r\n`;
      body += `Content-ID: ${i + 1}\r\n\r\n`;
      body += `${req.method} ${this.baseUrl}/${req.url} HTTP/1.1\r\n`;
      body += `Content-Type: application/json\r\n\r\n`;
      if (req.body) {
        body += JSON.stringify(req.body);
      }
      body += `\r\n`;
    }

    body += `--${changesetId}--\r\n`;
    body += `--${batchId}--\r\n`;

    const hdrs = await this.headers();
    hdrs["Content-Type"] = `multipart/mixed; boundary=${batchId}`;

    const response = await fetch(`${this.baseUrl}/$batch`, {
      method: "POST",
      headers: hdrs,
      body
    });

    if (!response.ok) {
      throw new Error(`Batch request failed: ${response.status}`);
    }

    // Parse multipart response (simplified — for production use a proper parser)
    const responseText = await response.text();
    return [responseText]; // Simplified: return raw for now
  }
}

export interface BatchRequest {
  method: "POST" | "PATCH" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
}
```

## OData Query Patterns

### Filtering

```typescript
// Equals
const accounts = await client.query("accounts", "$filter=name eq 'Contoso'");

// Contains
const accounts = await client.query("accounts", "$filter=contains(name,'Corp')");

// Greater than
const accounts = await client.query("accounts", "$filter=revenue gt 1000000");

// Date comparison
const recent = await client.query("accounts", "$filter=createdon gt 2024-01-01T00:00:00Z");

// Multiple conditions
const filtered = await client.query("accounts",
  "$filter=statecode eq 0 and revenue gt 500000&$orderby=name asc"
);

// Lookup field
const contacts = await client.query("contacts",
  "$filter=_parentcustomerid_value eq 'account-guid-here'"
);
```

### Select and Expand

```typescript
// Select specific columns
const accounts = await client.query("accounts", "$select=name,revenue,telephone1");

// Expand related records
const accounts = await client.query("accounts",
  "$select=name&$expand=primarycontactid($select=fullname,emailaddress1)"
);

// Count
const accounts = await client.query("accounts", "$count=true&$top=0");
// Access: accounts["@odata.count"]
```

### Pagination

```typescript
async function getAllRecords<T>(
  client: DataverseClient,
  entitySet: string,
  options: string
): Promise<T[]> {
  const allRecords: T[] = [];
  let nextLink: string | undefined = undefined;
  let isFirst = true;

  while (isFirst || nextLink) {
    isFirst = false;
    const result: ODataCollection<T> = isFirst || !nextLink
      ? await client.query<T>(entitySet, options)
      : await (async () => {
          // nextLink is a full URL
          const response = await fetch(nextLink!, { headers: /* ... */ });
          return response.json();
        })();

    allRecords.push(...result.value);
    nextLink = result["@odata.nextLink"];
  }

  return allRecords;
}
```

## Lookup and Relationship Binding

```typescript
// Set a lookup field (bind to related record)
await client.create("contacts", {
  firstname: "John",
  lastname: "Doe",
  "parentcustomerid_account@odata.bind": `/accounts(${accountId})`
});

// Disassociate a lookup
await client.patch("contacts", contactId, {
  "parentcustomerid_account@odata.bind": null
});
```

## Error Handling

```typescript
try {
  await client.create("accounts", { name: "Test" });
} catch (error) {
  if (error instanceof Error) {
    // Parse Dataverse error format
    try {
      const parsed = JSON.parse(error.message.split(": ").slice(1).join(": "));
      console.error("Dataverse error:", parsed.error?.message);
      console.error("Error code:", parsed.error?.code);
    } catch {
      console.error("Raw error:", error.message);
    }
  }
}
```
