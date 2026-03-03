import { PluginAuth, PluginResult } from "../types.js";

/**
 * Abstract base class that every Microsoft plugin extends.
 *
 * Subclasses implement {@link callTool} and may override
 * {@link getBaseUrl} to point at the correct REST endpoint.
 */
export abstract class BasePlugin {
  protected readonly auth: PluginAuth;

  constructor(auth: PluginAuth) {
    this.auth = auth;
  }

  /** Returns the bearer token to use for API calls. */
  protected get accessToken(): string {
    if (!this.auth.accessToken) {
      throw new Error(
        "No accessToken provided. Complete the OAuth flow before calling plugin tools."
      );
    }
    return this.auth.accessToken;
  }

  /**
   * Executes a named tool with the given arguments.
   *
   * @param toolName - The MCP tool name.
   * @param args     - Tool-specific arguments.
   */
  abstract callTool(toolName: string, args: Record<string, unknown>): Promise<PluginResult>;

  /** Helper: build a standard success result. */
  protected ok(data: unknown): PluginResult {
    return { success: true, data };
  }

  /** Helper: build a standard error result. */
  protected fail(error: string): PluginResult {
    return { success: false, error };
  }

  /**
   * Minimal fetch wrapper that attaches the bearer token and returns
   * the parsed JSON body, or throws on a non-2xx status.
   */
  protected async graphGet(url: string): Promise<unknown> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    return response.json() as Promise<unknown>;
  }

  protected async graphPost(url: string, body: unknown): Promise<unknown> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    return response.json() as Promise<unknown>;
  }

  protected async graphPut(url: string, body: unknown): Promise<unknown> {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  protected async graphPatch(url: string, body: unknown): Promise<unknown> {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  protected async graphDelete(url: string): Promise<void> {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  }
}
