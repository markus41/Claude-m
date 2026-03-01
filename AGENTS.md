# AGENTS.md

## Scope
Applies to the entire `/workspace/Claude-m` repository unless a deeper `AGENTS.md` overrides it.

## Mission
Build and maintain high-quality Claude plugins and marketplace metadata with first-class Codex compatibility.
Use root `CLAUDE.md` as the canonical marketplace source for plugin names, install slugs, categories, and validation flow.

## Required Build Workflow (Claude Plugins + Marketplace)
1. Read root `CLAUDE.md` first.
2. Confirm/update plugin metadata consistency across:
   - plugin folder name
   - install slug
   - category/description
   - README capability claims
3. Ensure plugin structure includes (where applicable):
   - `.claude-plugin/plugin.json`
   - `skills/<name>/SKILL.md`
   - `commands/*.md`
   - `agents/*.md`
   - `README.md`
4. Validate that command docs are executable and deterministic.
5. Validate reviewer agents have explicit output format and actionable checks.

## Codex Documentation Expectations
When authoring docs for Codex use:
- Prefer precise paths and exact command examples.
- Keep SKILL docs concise and use progressive disclosure.
- Reference only needed files from `SKILL.md` (avoid broad, deep reference chasing).
- Encode clear trigger phrases so capability routing is predictable.
- State prerequisites (auth, tenant, subscription, permissions) explicitly.

## Marketplace Correctness Rules
- Installation pattern must remain:
  - `/plugin install <plugin-name>@claude-m-microsoft-marketplace`
- Marketplace bootstrap must remain:
  - `/plugin marketplace add markus41/Claude-m`
- Any new/renamed plugin requires root catalog updates in `CLAUDE.md`.
- Do not publish contradictory names/slugs across docs.

## Writing Standards
- Use short imperative instructions.
- Keep sections skimmable with headings and bullets.
- Include: purpose, when to use, inputs/prereqs, outputs, and validation.
- Avoid over-claiming runtime behavior not represented by repository assets.

## Quality Gates Before Merge
- Cross-file consistency check passes (`CLAUDE.md` ↔ plugin READMEs ↔ skills/commands/agents).
- Trigger keywords in `SKILL.md` reflect natural user prompts.
- Validation commands are present and accurate.
- Examples are relevant to Microsoft ecosystems and safe by default.

## Safety / Non-goals
- Do not fabricate APIs, MCP tools, or command support.
- Do not duplicate large references across multiple plugins; link to canonical docs.
- Do not add extra process docs unless requested; prefer concise, maintainable guidance.
