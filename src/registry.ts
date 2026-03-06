import { readFileSync, readdirSync, existsSync } from "fs";
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
function loadMarketplacePlugins(): PluginManifest[] {
  const marketplacePath = join(projectRoot(), ".claude-plugin", "marketplace.json");
  if (!existsSync(marketplacePath)) return [];

  const raw = readFileSync(marketplacePath, "utf-8");
  const marketplace: MarketplaceDefinition = JSON.parse(raw);

  return marketplace.plugins.map((entry) => ({
    id: entry.name,
    name: entry.name,
    description: entry.description,
    version: "1.0.0",
    category: entry.category,
    tags: entry.tags,
  }));
}

/**
 * Load every plugin from both the registry directory and the marketplace
 * definition, deduplicate by id, and return them as an array of
 * {@link PluginManifest} objects.
 *
 * Registry files take precedence over marketplace entries when both define
 * the same plugin (by id/name), since registry files carry richer metadata.
 */
export function loadRegistry(): PluginManifest[] {
  const registryPlugins = loadRegistryFiles();
  const marketplacePlugins = loadMarketplacePlugins();

  // Index registry plugins by id for fast lookup
  const seen = new Set<string>(registryPlugins.map((p) => p.id));

  // Also match marketplace names to registry ids (e.g. "microsoft-teams-mcp" → "teams")
  const registryNameSet = new Set<string>(registryPlugins.map((p) => p.name.toLowerCase()));
  const registryDescSet = new Set<string>(registryPlugins.map((p) => p.description));

  // Merge: registry first, then marketplace entries not already present
  const merged = [...registryPlugins];
  for (const mp of marketplacePlugins) {
    // Skip if already in registry by id
    if (seen.has(mp.id)) continue;
    // Skip if the description is an exact duplicate (catches renamed variants)
    if (registryDescSet.has(mp.description)) continue;
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
