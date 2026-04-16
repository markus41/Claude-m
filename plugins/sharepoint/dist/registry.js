import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
/**
 * Resolve the registry directory relative to this file at runtime.
 * Works in both ESM (Node 18+, import.meta.url) and CJS (ts-jest, __dirname).
 *
 * Node 22 flags files that mention both __dirname and top-level await (in the
 * import graph) with ERR_AMBIGUOUS_MODULE_SYNTAX. We keep the __dirname
 * reference behind an `eval` so the static scanner doesn't see it in ESM.
 */
function registryDir() {
    try {
        // ESM: import.meta.url accessed via Function() so ts-jest CJS compile
        // doesn't reject the syntax.
        // eslint-disable-next-line no-new-func
        const url = new Function("return import.meta.url")();
        const filePath = decodeURIComponent(url.replace(/^file:\/\//, ""));
        return join(dirname(filePath), "..", "registry");
    }
    catch {
        // CJS / ts-jest: __dirname via eval() so the static scanner in ESM Node
        // doesn't flag this file as ambiguous.
        // eslint-disable-next-line no-eval
        const dir = eval("typeof __dirname !== 'undefined' ? __dirname : ''");
        return join(dir, "..", "registry");
    }
}
/**
 * Resolve the project root (one level above the registry directory).
 */
function projectRoot() {
    return join(registryDir(), "..");
}
const REGISTRY_DIR = registryDir();
/**
 * Load plugin manifests from individual JSON files in the registry directory.
 */
function loadRegistryFiles() {
    if (!existsSync(REGISTRY_DIR))
        return [];
    const files = readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".json"));
    return files.map((file) => {
        const raw = readFileSync(join(REGISTRY_DIR, file), "utf-8");
        return JSON.parse(raw);
    });
}
/**
 * Load plugin entries from .claude-plugin/marketplace.json and convert them
 * to PluginManifest objects so they appear alongside registry plugins.
 */
/**
 * Read the version from a plugin's own .claude-plugin/plugin.json manifest.
 * Falls back to the marketplace.json mtime so callers can still detect changes.
 */
function readPluginVersion(pluginDirName, marketplaceMtime) {
    // Try reading version from the plugin's own manifest
    const manifestPath = join(projectRoot(), pluginDirName, ".claude-plugin", "plugin.json");
    if (existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
            if (manifest.version)
                return manifest.version;
        }
        catch {
            // Malformed manifest — fall through
        }
    }
    // Fall back to marketplace file mtime so the version changes on any edit
    return `0.0.0+${marketplaceMtime}`;
}
function loadMarketplacePlugins() {
    const marketplacePath = join(projectRoot(), ".claude-plugin", "marketplace.json");
    if (!existsSync(marketplacePath))
        return [];
    const raw = readFileSync(marketplacePath, "utf-8");
    const marketplace = JSON.parse(raw);
    // Use mtime as a change-detection fallback for plugins without their own version
    const mtime = statSync(marketplacePath).mtimeMs.toString(36);
    return marketplace.plugins.map((entry) => {
        // Derive the plugin directory from the source path if available
        const source = entry.source;
        const pluginDir = typeof source === "object" && "path" in source
            ? source.path
            : entry.name;
        return {
            id: entry.name,
            name: entry.name,
            description: entry.description,
            version: readPluginVersion(pluginDir, mtime),
            category: entry.category,
            tags: entry.tags,
        };
    });
}
/**
 * Load every plugin from both the registry directory and the marketplace
 * definition, deduplicate by id, and return them as an array of
 * {@link PluginManifest} objects.
 *
 * Registry files take precedence over marketplace entries when both define
 * the same plugin (by id/name), since registry files carry richer metadata.
 */
export function loadRegistry() {
    const registryPlugins = loadRegistryFiles();
    const marketplacePlugins = loadMarketplacePlugins();
    // Index registry plugins by id for fast lookup
    const seen = new Set(registryPlugins.map((p) => p.id));
    // Also match marketplace names to registry ids (e.g. "microsoft-teams-mcp" → "teams")
    const registryNameSet = new Set(registryPlugins.map((p) => p.name.toLowerCase()));
    const registryDescSet = new Set(registryPlugins.map((p) => p.description));
    // Merge: registry first, then marketplace entries not already present
    const merged = [...registryPlugins];
    for (const mp of marketplacePlugins) {
        // Skip if already in registry by id
        if (seen.has(mp.id))
            continue;
        // Skip if the description is an exact duplicate (catches renamed variants)
        if (registryDescSet.has(mp.description))
            continue;
        merged.push(mp);
    }
    return merged;
}
/**
 * Find a single plugin manifest by its ID, or `undefined` if not found.
 */
export function findPlugin(id) {
    return loadRegistry().find((p) => p.id === id);
}
//# sourceMappingURL=registry.js.map