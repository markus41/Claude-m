# Graph Client Patterns — Advanced

Advanced patterns for the Microsoft Graph SDK v3 (TypeScript) beyond the basic service class: middleware chains, JSON Batch, PageIterator, streaming large result sets, request builder vs raw HTTP, and environment-aware credential selection.

This file complements `graph-client.md` (which covers the base `GraphService` class and type definitions). Read `graph-client.md` first for the foundational client setup.

---

## Graph SDK v3 — Package References

```bash
npm install @microsoft/microsoft-graph-client
npm install @azure/identity
# Types (if not included in your @microsoft/microsoft-graph-client version)
npm install @microsoft/microsoft-graph-types
```

The v3 SDK is ESM-compatible and ships its own TypeScript types. The legacy `isomorphic-fetch` shim is no longer required in Node 18+.

---

## Middleware Chain

The Graph SDK processes requests through a configurable middleware chain. The default chain includes:

1. `RetryHandler` — automatically retries 429 and 503 responses
2. `RedirectHandler` — follows redirects
3. `FeatureUsageFlag` — internal telemetry marker

You can extend or replace this chain for custom logging, telemetry, or throttle-aware behavior.

```typescript
import {
  Client,
  RetryHandler,
  RetryHandlerOptions,
  RedirectHandler,
  RedirectHandlerOptions,
  FeatureUsageFlag,
  MiddlewareFactory,
  HTTPMessageHandler,
} from "@microsoft/microsoft-graph-client";
import {
  TokenCredentialAuthenticationProvider
} from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { TokenCredential } from "@azure/identity";

export function buildGraphClientWithMiddleware(credential: TokenCredential): Client {
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });

  // Custom retry: 5 retries, back off starting at 3 s
  const retryOptions = new RetryHandlerOptions({ maxRetries: 5, delay: 3 });

  const middleware = [
    authProvider,
    new RetryHandler(retryOptions),
    new RedirectHandler(new RedirectHandlerOptions()),
    new FeatureUsageFlag(),
    new HTTPMessageHandler(),
  ];

  return Client.initWithMiddleware({
    middleware: MiddlewareFactory.getDefaultMiddlewareChain(authProvider),
  });
}
```

### Custom Logging Middleware

```typescript
import { Middleware, Context } from "@microsoft/microsoft-graph-client";

export class LoggingMiddleware implements Middleware {
  next: Middleware | undefined;

  async execute(context: Context): Promise<void> {
    const start = Date.now();
    const url = context.request instanceof Request
      ? context.request.url
      : String(context.request);
    try {
      await this.next?.execute(context);
      console.log(`[Graph] ${context.options?.method ?? "GET"} ${url} → ${context.response?.status} (${Date.now() - start}ms)`);
    } catch (err) {
      console.error(`[Graph] ${url} failed:`, err);
      throw err;
    }
  }
}
```

---

## JSON Batch Requests

Batch up to 20 Graph requests in a single HTTP call. Reduces round-trips and improves throughput in quota-sensitive scenarios.

### Batch GET Pattern

```typescript
interface BatchRequest {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  dependsOn?: string[];
}

interface BatchResponse {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export async function batchGet<T = unknown>(
  client: Client,
  requests: Array<{ id: string; url: string }>
): Promise<Map<string, T>> {
  const batchBody = {
    requests: requests.map(r => ({
      id: r.id,
      method: "GET",
      url: r.url,
    })),
  };

  const response = await client.api("/$batch").post(batchBody);
  const resultMap = new Map<string, T>();

  for (const res of response.responses as BatchResponse[]) {
    if (res.status >= 200 && res.status < 300) {
      resultMap.set(res.id, res.body as T);
    } else {
      console.warn(`Batch request ${res.id} failed with status ${res.status}:`, res.body);
    }
  }

  return resultMap;
}
```

### Batch with Dependency Chaining

```typescript
// Create a user (id: "1"), then assign license to the new user (id: "2", dependsOn: ["1"])
const batchBody = {
  requests: [
    {
      id: "1",
      method: "POST",
      url: "/users",
      headers: { "Content-Type": "application/json" },
      body: {
        displayName: "Jane Doe",
        mailNickname: "janedoe",
        userPrincipalName: "janedoe@contoso.com",
        passwordProfile: { password: "TempPass123!" },
        accountEnabled: true,
      },
    },
    {
      id: "2",
      method: "POST",
      url: "/users/{id from response 1}/assignLicense",
      dependsOn: ["1"],
      headers: { "Content-Type": "application/json" },
      body: {
        addLicenses: [{ skuId: "your-sku-id" }],
        removeLicenses: [],
      },
    },
  ],
};

const result = await client.api("/$batch").post(batchBody);
```

### Chunked Batch Helper

```typescript
export async function batchInChunks(
  client: Client,
  requests: BatchRequest[],
  chunkSize = 20
): Promise<BatchResponse[]> {
  const allResponses: BatchResponse[] = [];

  for (let i = 0; i < requests.length; i += chunkSize) {
    const chunk = requests.slice(i, i + chunkSize);
    const result = await client.api("/$batch").post({ requests: chunk });
    allResponses.push(...(result.responses as BatchResponse[]));

    // Respect throttle: if any response was 429, pause
    const throttled = result.responses.some((r: BatchResponse) => r.status === 429);
    if (throttled) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  return allResponses;
}
```

---

## PageIterator — Stream Large Result Sets

The `PageIterator` handles `@odata.nextLink` pagination automatically, calling a callback for each item without loading the entire result set into memory.

```typescript
import { PageIterator, PageCollection } from "@microsoft/microsoft-graph-client";

export async function iterateAllUsers(
  client: Client,
  callback: (user: { id: string; displayName: string; userPrincipalName: string }) => boolean | void
): Promise<void> {
  const initialResponse: PageCollection = await client
    .api("/users")
    .select("id,displayName,userPrincipalName")
    .top(999)
    .get();

  const iterator = new PageIterator(client, initialResponse, callback);
  await iterator.iterate();
}

// Usage — stop iteration when callback returns false
await iterateAllUsers(graphClient, (user) => {
  console.log(user.userPrincipalName);
  // Return false to stop iteration early
  if (user.displayName === "Target User") return false;
});
```

### PageIterator with Accumulator

```typescript
export async function collectAllPages<T>(
  client: Client,
  url: string
): Promise<T[]> {
  const results: T[] = [];
  const response: PageCollection = await client.api(url).get();

  const iterator = new PageIterator(client, response, (item: T) => {
    results.push(item);
    return true; // continue
  });

  await iterator.iterate();
  return results;
}
```

---

## Request Builder vs Raw HTTP

The SDK provides two equivalent styles. Prefer request builders for type safety; use raw HTTP for endpoints not yet covered by the builder tree.

### Request Builder Style (Preferred)

```typescript
// Strongly typed, benefits from IDE completion
const user = await client
  .api("/users/jane@contoso.com")
  .select("id,displayName,mail,department")
  .header("ConsistencyLevel", "eventual")
  .get();

// Chainable filters
const members = await client
  .api("/groups/my-group-id/members")
  .filter("userType eq 'Member'")
  .select("id,displayName,userPrincipalName")
  .top(100)
  .get();
```

### Raw HTTP Style (for new/beta endpoints)

```typescript
// Use for beta endpoints or when builder doesn't support the parameter
const response = await client
  .api("https://graph.microsoft.com/beta/identityGovernance/accessReviews/definitions")
  .version("beta")
  .get();

// With custom headers
const count = await client
  .api("/users?$count=true&$filter=userType eq 'Guest'")
  .header("ConsistencyLevel", "eventual")
  .get();
```

---

## Environment-Based Credential Selection

`DefaultAzureCredential` tries credentials in a fixed order. For explicit control in different environments, use a factory function.

```typescript
import {
  DefaultAzureCredential,
  ClientSecretCredential,
  ManagedIdentityCredential,
  WorkloadIdentityCredential,
  AzureCliCredential,
  ChainedTokenCredential,
  TokenCredential,
} from "@azure/identity";

type GraphEnvironment = "local" | "azure-functions" | "aks" | "github-actions";

export function getGraphCredential(env?: GraphEnvironment): TokenCredential {
  const detected = env ?? detectEnvironment();

  switch (detected) {
    case "azure-functions":
      // System-assigned Managed Identity
      return new ManagedIdentityCredential();

    case "aks":
      // Workload Identity (OIDC federated)
      return new WorkloadIdentityCredential({
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
      });

    case "github-actions":
      // Client secret from GitHub secrets
      return new ClientSecretCredential(
        process.env.AZURE_TENANT_ID!,
        process.env.AZURE_CLIENT_ID!,
        process.env.AZURE_CLIENT_SECRET!
      );

    case "local":
    default:
      // In order: env vars → workload identity → managed identity → Azure CLI → Azure PowerShell
      return new DefaultAzureCredential();
  }
}

function detectEnvironment(): GraphEnvironment {
  if (process.env.FUNCTIONS_WORKER_RUNTIME) return "azure-functions";
  if (process.env.AZURE_FEDERATED_TOKEN_FILE) return "aks";
  if (process.env.GITHUB_ACTIONS) return "github-actions";
  return "local";
}
```

---

## Connection Pooling and Token Caching

The Graph SDK's underlying `fetch` implementation uses Node's global `fetch` (Node 18+). For high-throughput scenarios, configure HTTP connection keep-alive:

```typescript
import { Agent } from "node:https";

const keepAliveAgent = new Agent({ keepAlive: true, maxSockets: 50 });

// Pass as custom fetch implementation
const client = Client.initWithMiddleware({
  authProvider,
  fetchOptions: {
    // @ts-expect-error - node-fetch agent
    agent: keepAliveAgent,
  },
});
```

`@azure/identity` caches tokens in memory by default. For production, consider using the persistent token cache via `@azure/identity-cache-persistence`:

```typescript
import { TokenCachePersistenceOptions } from "@azure/identity";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential({
  tokenCachePersistenceOptions: {
    enabled: true,
    name: "graph-token-cache",
  },
});
```

---

## Error Handling Patterns

```typescript
import { GraphError } from "@microsoft/microsoft-graph-client";

export async function safeGraphCall<T>(
  fn: () => Promise<T>,
  defaultValue?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof GraphError) {
      if (err.statusCode === 404) {
        return defaultValue;
      }
      if (err.statusCode === 403) {
        throw new Error(`Graph permission denied: ${err.code} — ${err.message}`);
      }
      if (err.statusCode === 429) {
        const retryAfter = err.headers?.get("Retry-After") ?? "10";
        throw new Error(`Graph throttled. Retry after ${retryAfter}s`);
      }
    }
    throw err;
  }
}
```

---

## Error Codes Table

| HTTP Status | Graph Code | Meaning | Remediation |
|---|---|---|---|
| 400 | `Request_BadRequest` | Malformed query (bad filter, missing field) | Check OData syntax; add `ConsistencyLevel: eventual` for advanced filters |
| 401 | `InvalidAuthenticationToken` | Token expired or malformed | Re-acquire token; check credential chain |
| 403 | `Authorization_RequestDenied` | Scope not consented | Add permission in App Registration + grant admin consent |
| 404 | `Request_ResourceNotFound` | Object does not exist | Skip or return null; do not retry |
| 409 | `Conflict` | Duplicate resource | Check for existence before creating |
| 410 | `Gone` | Delta token expired | Re-run full delta from scratch |
| 422 | `UnprocessableEntity` | Semantic validation failed | Review request body properties |
| 429 | `TooManyRequests` | Throttled | Honor `Retry-After` header; use batch requests |
| 500 | `InternalServerError` | Transient Graph service error | Retry with exponential backoff |
| 503 | `ServiceUnavailable` | Graph degraded | Retry; check Microsoft 365 Service Health |

---

## Throttling Limits

| Endpoint | Limit | Notes |
|---|---|---|
| Global per app per tenant | 10,000 req / 10 min | Across all endpoints combined |
| `GET /users` | 10,000 req / 10 min | Includes paging requests |
| `POST /$batch` | 4 batch requests / sec | Each batch may contain up to 20 sub-requests |
| Mail / calendar | 10,000 req / 10 min per mailbox | Per-user limit separate from global |
| `GET /reports/*` | 2 req / sec | Report endpoints are more restrictive |
| Teams messages | 500 req / sec per app | Very high but can be hit in bulk scenarios |

---

## Common Gotchas

- **`ConsistencyLevel: eventual` is required for `$count` and advanced `$filter`**: Any query that uses `$count=true` in the URL, or `$filter` on properties not in the index (e.g., `signInActivity`, `userType eq 'Guest'` with `$count`), must include the `ConsistencyLevel: eventual` request header. Omitting it returns a 400 error.
- **Beta vs v1.0**: The `.version("beta")` call on the client builder switches the base URL for that request only. The beta endpoint is not guaranteed stable. Use v1.0 in production except where a feature is genuinely beta-only.
- **Batch `dependsOn` does not work across batch HTTP calls**: `dependsOn` only chains requests within a single `$batch` call. You cannot reference a response from a previous batch call using `dependsOn`.
- **PageIterator stops on false return**: Returning `false` from the PageIterator callback stops iteration immediately without fetching further pages. This is useful for search-and-stop scenarios but will not yield a complete dataset.
- **Token scope mismatch**: If you build the client with `https://graph.microsoft.com/.default` scope (application permissions), it cannot call delegated-only endpoints (e.g., `/me`). For delegated scenarios, use a delegated credential with the specific scopes (`User.Read`, etc.).
- **Graph SDK v3 breaking change from v2**: `Client.init()` is deprecated in v3. Always use `Client.initWithMiddleware()` with an explicit middleware chain or auth provider.
