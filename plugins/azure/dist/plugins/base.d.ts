import { PluginAuth, PluginResult } from "../types.js";
/**
 * Abstract base class that every Microsoft plugin extends.
 *
 * Subclasses implement {@link callTool} and may override
 * {@link getBaseUrl} to point at the correct REST endpoint.
 */
export declare abstract class BasePlugin {
    protected readonly auth: PluginAuth;
    constructor(auth: PluginAuth);
    /** Returns the bearer token to use for API calls. */
    protected get accessToken(): string;
    /**
     * Executes a named tool with the given arguments.
     *
     * @param toolName - The MCP tool name.
     * @param args     - Tool-specific arguments.
     */
    abstract callTool(toolName: string, args: Record<string, unknown>): Promise<PluginResult>;
    /** Helper: build a standard success result. */
    protected ok(data: unknown): PluginResult;
    /** Helper: build a standard error result. */
    protected fail(error: string): PluginResult;
    /**
     * Minimal fetch wrapper that attaches the bearer token and returns
     * the parsed JSON body, or throws on a non-2xx status.
     */
    protected graphGet(url: string): Promise<unknown>;
    protected graphPost(url: string, body: unknown): Promise<unknown>;
    protected graphPut(url: string, body: unknown): Promise<unknown>;
    protected graphPatch(url: string, body: unknown): Promise<unknown>;
    protected graphDelete(url: string): Promise<void>;
}
//# sourceMappingURL=base.d.ts.map