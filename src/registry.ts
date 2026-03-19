import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { PluginManifest, MarketplaceDefinition } from "./types.js";

/**
 * Resolve the registry directory relative to this file at runtime.
 * Works in both ESM (Node 18+, import.meta.url) and CJS (ts-jest, __dirname).
 */
function registryDir(): string {
  // ESM – import.meta is defined
  // Use Function constructor to prevent ts-jest / tsc from rejecting the
  // syntax in CJS mode; the branch is only reached at runtime in ESM.
  try {
    // eslint-disable-next-line no-new-func
    const url: string = new Function("return import.meta.url")() as string;
    const { fileURLToPath } = require("url") as { fileURLToPath: (u: string) => string };
    const { dirname } = require("path") as { dirname: (p: string) => string };
    return join(dirname(fileURLToPath(url)), "..", "registry");
  } catch {
    // CJS / ts-jest – fall back to __dirname (injected by Node's CJS wrapper)
    return join(__dirname, "..", "registry");
  }
}

/**
 * Resolve the project root (one level above the registry directory).
 */
function projectRoot(): string {
  return join(registryDir(), "..");
}

const REGISTRY_DIR = registryDir();

/**
 * Load plugin manifests from individual JSON files in the registry directory.
 */
function loadRegistryFiles(): PluginManifest[] {
  if (!existsSync(REGISTRY_DIR)) return [];
  const files = readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const raw = readFileSync(join(REGISTRY_DIR, file), "utf-8");
    return JSON.parse(raw) as PluginManifest;
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
function readPluginVersion(pluginDirName: string, marketplaceMtime: string): string {
  // Try reading version from the plugin's own manifest
  const manifestPath = join(projectRoot(), pluginDirName, ".claude-plugin", "plugin.json");
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      if (manifest.version) return manifest.version as string;
    } catch {
      // Malformed manifest — fall through
    }
  }
  // Fall back to marketplace file mtime so the version changes on any edit
  return `0.0.0+${marketplaceMtime}`;
}

function loadMarketplacePlugins(): PluginManifest[] {
  const marketplacePath = join(projectRoot(), ".claude-plugin", "marketplace.json");
  if (!existsSync(marketplacePath)) return [];

  const raw = readFileSync(marketplacePath, "utf-8");
  const marketplace: MarketplaceDefinition = JSON.parse(raw);

  // Use mtime as a change-detection fallback for plugins without their own version
  const mtime = statSync(marketplacePath).mtimeMs.toString(36);

  return marketplace.plugins.map((entry) => {
    // Derive the plugin directory from the source path if available
    const source = entry.source;
    const pluginDir = typeof source === "object" && "path" in source
      ? (source as { path: string }).path
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
 * Check whether a marketplace plugin ID is a known variant of a registry
 * plugin.  Covers the "microsoft-{id}-mcp" naming convention used by the
 * five core plugins (e.g. registry id "teams" ↔ marketplace "microsoft-teams-mcp").
 */
function isRegistryDuplicate(marketplaceId: string, registryIds: Set<string>): boolean {
  // Direct match
  if (registryIds.has(marketplaceId)) return true;

  // Convention: "microsoft-<registryId>-mcp"
  const match = marketplaceId.match(/^microsoft-(.+)-mcp$/);
  if (match && registryIds.has(match[1])) return true;

  return false;
}

/**
 * Load every plugin from both the registry directory and the marketplace
 * definition, deduplicate by id, and return them as an array of
 * {@link PluginManifest} objects.
 *
 * Registry files take precedence over marketplace entries when both define
 * the same plugin (by id/name), since registry files carry richer metadata.
 * Matching works across naming schemes: registry "teams" / "Microsoft Teams"
 * will match marketplace "microsoft-teams-mcp".
 */
export function loadRegistry(): PluginManifest[] {
  const registryPlugins = loadRegistryFiles();
  const marketplacePlugins = loadMarketplacePlugins();

  // Index registry plugins by id for fast lookup
  const registryIds = new Set<string>(registryPlugins.map((p) => p.id));

  // Merge: registry first, then marketplace entries not already present
  const merged = [...registryPlugins];
  for (const mp of marketplacePlugins) {
    if (isRegistryDuplicate(mp.id, registryIds)) continue;
    merged.push(mp);
  }

  return merged;
}

/**
 * Find a single plugin manifest by its ID, or `undefined` if not found.
 */
export function findPlugin(id: string): PluginManifest | undefined {
  return loadRegistry().find((p) => p.id === id);
}
