# Plugin Prioritization Roadmap (Fabric Expansion)

This roadmap replaces prior backlog scoring for the current Fabric marketplace expansion.

## Goals

1. Cover all listed Fabric item types with explicit ownership.
2. Extend existing Fabric plugins before introducing new plugin bundles.
3. Include preview items with explicit guardrails and deterministic runbooks.
4. Keep marketplace metadata, docs, and validation gates consistent.

## Scope Strategy

- Domain-bundle packaging (not one plugin per Fabric item).
- Hybrid mirroring ownership:
  - Azure sources: `fabric-mirroring-azure`
  - External sources: `fabric-mirroring-external`
- Existing Fabric plugins remain and are extended where already aligned.

## Phase A - Coverage Baseline (Existing Plugin Parity)

1. Add `docs/fabric-item-coverage-matrix.md`.
2. Extend existing plugins with explicit missing commands:
   - `fabric-data-factory`: `copy-job-manage`, `dataflow-gen2-manage`
   - `fabric-data-engineering`: `spark-job-definition-manage`
   - `fabric-data-warehouse`: `sample-warehouse-bootstrap`
   - `fabric-real-time-analytics`: `kql-queryset-manage`
   - `powerbi-fabric`: `pbi-dashboard-create`, `pbi-report-create`, `pbi-scorecard-manage`
3. Document overlap routing in broad plugins.

## Phase B - Mirroring Split + Store/Prep Foundations

1. `fabric-mirroring-azure`
2. `fabric-mirroring-external`
3. `fabric-data-store`
4. `fabric-data-prep-jobs`

## Phase C - AI, Graph/Geo, Runtime

1. `fabric-ai-agents`
2. `fabric-graph-geo`
3. `fabric-developer-runtime`

## Phase D - Distribution + Final Catalog Pass

1. `fabric-distribution-apps`
2. Finalize `CLAUDE.md`, `.claude-plugin/marketplace.json`, and coverage docs.
3. Run validations and publish final coverage report.

## New Slugs in This Roadmap

1. `fabric-data-prep-jobs` (`analytics`)
2. `fabric-data-store` (`analytics`)
3. `fabric-ai-agents` (`analytics`)
4. `fabric-graph-geo` (`analytics`)
5. `fabric-developer-runtime` (`devops`)
6. `fabric-distribution-apps` (`productivity`)
7. `fabric-mirroring-azure` (`analytics`)
8. `fabric-mirroring-external` (`analytics`)

## Canonical Files Updated in Relevant PRs

1. `CLAUDE.md`
2. `.claude-plugin/marketplace.json`
3. `docs-plugin-prioritization.md`
4. `docs/fabric-item-coverage-matrix.md`

## Validation Gates

1. `npm run validate:marketplace`
2. `npm run validate:knowledge-plugins`
3. `npm run validate:command-frontmatter`
4. `npm run validate:capability-graph`
5. `npm run validate:all` (informational when pre-existing global failures exist)

## Acceptance Criteria

1. Slug consistency across folder name, plugin manifest, marketplace entry, and `CLAUDE.md`.
2. Category and description alignment between marketplace and `CLAUDE.md`.
3. At least one skill with trigger phrases per plugin.
4. Deterministic command docs with required YAML frontmatter.
5. Reviewer agents include explicit `## Output Format`.
6. Overlap routing exists in `fabric-mirroring`, `fabric-data-factory`, `powerbi-fabric`, and related focused plugin READMEs.
