import fs from "node:fs";
import path from "node:path";

type MarketplacePlugin = {
  name: string;
  source: string | { source: string; [key: string]: unknown };
};

const repoRoot = path.resolve(__dirname, "..");
const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
const claudeDocPath = path.join(repoRoot, "CLAUDE.md");

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function getLocalMarketplacePlugins(): Array<MarketplacePlugin & { source: string }> {
  const marketplace = readJson<{ plugins: MarketplacePlugin[] }>(marketplacePath);
  return marketplace.plugins.filter(
    (plugin): plugin is MarketplacePlugin & { source: string } =>
      typeof plugin.source === "string" && plugin.source.startsWith("./")
  );
}

function getMarkdownFilesInDir(dirPath: string): string[] {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(dirPath, entry.name));
}

function parseClaudePluginTableSlugs(): Set<string> {
  const content = fs.readFileSync(claudeDocPath, "utf8");
  const slugs = new Set<string>();

  const rowRegex = /^\|\s*`([^`]+)`\s*\|/gm;
  let match: RegExpExecArray | null = null;
  while ((match = rowRegex.exec(content)) !== null) {
    slugs.add(match[1]);
  }

  return slugs;
}

function hasFrontmatter(content: string): boolean {
  return /^---\n[\s\S]*?\n---\n/.test(content);
}

function getFrontmatter(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  return match ? match[1] : "";
}

describe("Documentation quality guardrails", () => {
  const localPlugins = getLocalMarketplacePlugins();

  test("local marketplace plugins have matching directory and README", () => {
    expect(localPlugins.length).toBeGreaterThan(0);

    for (const plugin of localPlugins) {
      const directoryName = plugin.source.replace(/^\.\//, "");
      const pluginDir = path.join(repoRoot, directoryName);

      expect(directoryName).toBe(plugin.name);
      expect(fs.existsSync(pluginDir)).toBe(true);
      expect(fs.statSync(pluginDir).isDirectory()).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, "README.md"))).toBe(true);
    }
  });

  test("command files include frontmatter and minimum required sections", () => {
    const commandFiles: string[] = [];

    for (const plugin of localPlugins) {
      const pluginDir = path.join(repoRoot, plugin.source.replace(/^\.\//, ""));
      commandFiles.push(...getMarkdownFilesInDir(path.join(pluginDir, "commands")));
    }

    expect(commandFiles.length).toBeGreaterThan(0);

    for (const filePath of commandFiles) {
      const content = fs.readFileSync(filePath, "utf8");

      expect(hasFrontmatter(content)).toBe(true);
      expect(content).toMatch(/^#\s+.+/m); // title section
      const hasSecondarySection = /^##\s+.+/m.test(content);
      const hasOrderedInstructionList = /^\d+\.\s+.+/m.test(content);
      expect(hasSecondarySection || hasOrderedInstructionList).toBe(true);
    }
  });

  test("every local plugin has at least one SKILL trigger phrase section", () => {
    for (const plugin of localPlugins) {
      const pluginDir = path.join(repoRoot, plugin.source.replace(/^\.\//, ""));
      const skillsRoot = path.join(pluginDir, "skills");
      const nestedSkillDocs = fs.existsSync(skillsRoot)
        ? fs
            .readdirSync(skillsRoot, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .flatMap((entry) => getMarkdownFilesInDir(path.join(skillsRoot, entry.name)))
            .filter((file) => path.basename(file) === "SKILL.md")
        : [];

      const skillDocs = getMarkdownFilesInDir(skillsRoot).concat(nestedSkillDocs);

      expect(skillDocs.length).toBeGreaterThan(0);

      const hasTriggerSection = skillDocs.some((skillPath) => {
        const content = fs.readFileSync(skillPath, "utf8");
        const frontmatter = getFrontmatter(content);

        const hasFrontmatterTriggerList = /(?:^|\n)triggers:\s*(?:\n\s*-\s+.+)+/i.test(frontmatter);
        const hasTriggerHeading = /^##\s+(Trigger Phrases?|When to (Activate|Use))\b/im.test(content);

        return hasFrontmatterTriggerList || hasTriggerHeading;
      });

      expect(hasTriggerSection).toBe(true);
    }
  });

  test("reviewer agents include explicit output format blocks", () => {
    for (const plugin of localPlugins) {
      const pluginDir = path.join(repoRoot, plugin.source.replace(/^\.\//, ""));
      const agentsDir = path.join(pluginDir, "agents");
      const reviewerAgents = getMarkdownFilesInDir(agentsDir).filter((filePath) =>
        /review/i.test(path.basename(filePath))
      );

      for (const reviewerPath of reviewerAgents) {
        const content = fs.readFileSync(reviewerPath, "utf8");
        expect(content).toMatch(/##\s+Output Format\b/i);
        expect(content).toMatch(/##\s+Output Format\b[\s\S]*?```[\s\S]*?```/i);
      }
    }
  });

  test("install slugs are consistent across CLAUDE.md, marketplace.json, and plugin manifests", () => {
    const claudeSlugs = parseClaudePluginTableSlugs();
    const marketplace = readJson<{ plugins: MarketplacePlugin[] }>(marketplacePath);
    const marketplaceSlugs = new Set(marketplace.plugins.map((plugin) => plugin.name));

    expect(claudeSlugs).toEqual(marketplaceSlugs);

    for (const plugin of localPlugins) {
      const pluginDir = path.join(repoRoot, plugin.source.replace(/^\.\//, ""));
      const pluginManifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
      const manifest = readJson<{ name: string }>(pluginManifestPath);

      expect(manifest.name).toBe(plugin.name);
      expect(claudeSlugs.has(manifest.name)).toBe(true);
      expect(marketplaceSlugs.has(manifest.name)).toBe(true);
    }
  });
});
