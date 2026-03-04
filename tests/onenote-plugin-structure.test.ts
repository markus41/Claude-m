import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const pluginSlug = "onenote-knowledge-base";
const pluginDir = path.join(repoRoot, pluginSlug);
const manifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");

function read(rel: string): string {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("OneNote plugin structure", () => {
  test("includes expanded advanced command set", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const commands: string[] = manifest.commands ?? [];

    expect(manifest.name).toBe(pluginSlug);
    expect(commands).toEqual(
      expect.arrayContaining([
        "./commands/onenote-template-library.md",
        "./commands/onenote-bulk-style-rollout.md",
        "./commands/onenote-navigation-index.md"
      ])
    );
    expect(commands.length).toBeGreaterThanOrEqual(13);
  });

  test("all declared command docs have required frontmatter and deterministic steps", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    for (const rel of manifest.commands as string[]) {
      const content = read(path.join(pluginSlug, rel.replace("./", "")));
      const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);

      expect(fm).not.toBeNull();
      const frontmatter = fm?.[1] ?? "";
      expect(frontmatter).toMatch(/^name:/m);
      expect(frontmatter).toMatch(/^description:/m);
      expect(frontmatter).toMatch(/^allowed-tools:/m);

      const body = content.slice((fm?.[0] ?? "").length);
      expect(body).toMatch(/^##\s+/m);
      expect(body).toMatch(/^(\d+\.\s+|[-*]\s+)/m);
      expect(body.toLowerCase()).toMatch(/fail fast|fail-fast/);
      expect(body.toLowerCase()).toMatch(/redact|redaction/);
    }
  });

  test("skill references nested documentation", () => {
    const skill = read("onenote-knowledge-base/skills/onenote-knowledge-base/SKILL.md");
    expect(skill).toContain("references/nested/architecture/nested-information-architecture.md");
    expect(skill).toContain("references/nested/templates/template-catalog.md");
    expect(skill).toContain("references/nested/operations/headless-operations-runbook.md");
  });
});
