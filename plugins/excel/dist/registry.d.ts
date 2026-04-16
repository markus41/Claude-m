import { PluginManifest } from "./types.js";
/**
 * Load every plugin from both the registry directory and the marketplace
 * definition, deduplicate by id, and return them as an array of
 * {@link PluginManifest} objects.
 *
 * Registry files take precedence over marketplace entries when both define
 * the same plugin (by id/name), since registry files carry richer metadata.
 */
export declare function loadRegistry(): PluginManifest[];
/**
 * Find a single plugin manifest by its ID, or `undefined` if not found.
 */
export declare function findPlugin(id: string): PluginManifest | undefined;
//# sourceMappingURL=registry.d.ts.map