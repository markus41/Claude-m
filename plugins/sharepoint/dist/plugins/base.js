/**
 * Abstract base class that every Microsoft plugin extends.
 *
 * Subclasses implement {@link callTool} and may override
 * {@link getBaseUrl} to point at the correct REST endpoint.
 */
export class BasePlugin {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    /** Returns the bearer token to use for API calls. */
    get accessToken() {
        if (!this.auth.accessToken) {
            throw new Error("No accessToken provided. Complete the OAuth flow before calling plugin tools.");
        }
        return this.auth.accessToken;
    }
    /** Helper: build a standard success result. */
    ok(data) {
        return { success: true, data };
    }
    /** Helper: build a standard error result. */
    fail(error) {
        return { success: false, error };
    }
    /**
     * Minimal fetch wrapper that attaches the bearer token and returns
     * the parsed JSON body, or throws on a non-2xx status.
     */
    async graphGet(url) {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        return response.json();
    }
    async graphPost(url, body) {
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
        return response.json();
    }
    async graphPut(url, body) {
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
    async graphPatch(url, body) {
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
    async graphDelete(url) {
        const response = await fetch(url, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
    }
}
//# sourceMappingURL=base.js.map