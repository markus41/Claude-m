#!/usr/bin/env node
/**
 * deploy-setup.mjs
 *
 * One-command setup and update for the Claude Code expert project structure.
 * Can be run repeatedly — idempotent. Creates missing files and directories
 * without overwriting existing content.
 *
 * Usage:
 *   node scripts/deploy-setup.mjs                 # setup/update current project
 *   node scripts/deploy-setup.mjs --target /path  # setup/update a specific project
 *   node scripts/deploy-setup.mjs --scan-repos    # also scan sub-dirs for git repos
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const targetIdx = args.indexOf("--target");
const rootDir = targetIdx !== -1 && args[targetIdx + 1]
  ? path.resolve(args[targetIdx + 1])
  : process.cwd();
const scanRepos = args.includes("--scan-repos");

console.log(`\n  Claude Code Project Setup/Update`);
console.log(`  Target: ${rootDir}\n`);

// ── Step 1: Sync marketplace (if in the Claude-m repo) ───────────────────────

const syncScript = path.join(rootDir, "scripts", "sync-marketplace.mjs");
if (fs.existsSync(syncScript)) {
  console.log("1. Syncing marketplace descriptions...");
  try {
    execSync(`node "${syncScript}" --write`, { cwd: rootDir, stdio: "inherit" });
  } catch {
    console.warn("   ⚠ Marketplace sync had warnings (continuing)");
  }
} else {
  console.log("1. No marketplace sync needed (not a marketplace repo)");
}

// ── Step 2: Scaffold .claude directory structure ──────────────────────────────

console.log("\n2. Scaffolding .claude directory structure...");
scaffoldClaudeDir(rootDir);

// ── Step 3: Scaffold docs/context directory ───────────────────────────────────

console.log("\n3. Scaffolding docs/context directory...");
scaffoldDocsContext(rootDir);

// ── Step 4: Ensure CLAUDE.md exists and is well-structured ───────────────────

console.log("\n4. Checking CLAUDE.md...");
ensureClaudeMd(rootDir);

// ── Step 5: Ensure README.md exists ──────────────────────────────────────────

console.log("\n5. Checking README.md...");
ensureReadme(rootDir);

// ── Step 6: Scan sub-directories for git repos ──────────────────────────────

if (scanRepos) {
  console.log("\n6. Scanning for sub-repositories...");
  scanSubRepos(rootDir);
} else {
  console.log("\n6. Sub-repo scan skipped (pass --scan-repos to enable)");
}

// ── Step 7: Check for LSP/tooling requirements ──────────────────────────────

console.log("\n7. Checking tooling...");
checkTooling(rootDir);

console.log("\n  Setup complete.\n");

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function scaffoldClaudeDir(dir) {
  const claudeDir = path.join(dir, ".claude");

  // Rules
  const rules = {
    "rules/coding.md": `# Coding Conventions

## Language & Framework
- Follow existing project conventions for naming, layout, and imports.
- Prefer explicit over implicit; avoid magic strings and numbers.
- Use structured logging; never log secrets or PII.
- Handle errors at the boundary; propagate typed errors internally.
`,
    "rules/testing.md": `# Testing Standards

## Required Tests
- Unit tests for all public functions and methods.
- Integration tests for API endpoints and external service calls.
- Snapshot or contract tests for serialized outputs.

## Running Tests
\`\`\`bash
npm test           # unit tests
npm run test:e2e   # integration / end-to-end
\`\`\`

## Coverage
- Aim for 80%+ line coverage on new code.
- Never reduce coverage on existing modules.
`,
    "rules/security.md": `# Security Rules

- Never commit secrets, tokens, or API keys.
- Validate and sanitize all external input (user input, API responses).
- Use parameterized queries; never concatenate SQL.
- Follow least-privilege for IAM roles and service accounts.
- Keep dependencies up to date; audit with \`npm audit\` or equivalent.
- PII must be encrypted at rest and masked in logs.
`,
    "rules/infra.md": `# Infrastructure Conventions

- Infrastructure as Code (Terraform, Bicep, ARM) for all cloud resources.
- Use consistent naming and tagging across environments.
- Separate environments: dev, staging, production.
- Blue-green or canary deployments for production changes.
`,
    "rules/review.md": `# Code Review Checklist

- [ ] Changes are scoped and focused (single responsibility).
- [ ] Tests cover new and changed behavior.
- [ ] No secrets or credentials in the diff.
- [ ] Error handling is appropriate and consistent.
- [ ] Documentation updated if public API changed.
- [ ] No unnecessary dependencies added.
`,
    "rules/product.md": `# Product & UX Guardrails

- Preserve existing user workflows unless explicitly changing them.
- Maintain backward compatibility for public APIs.
- Accessibility: WCAG 2.1 AA compliance for UI changes.
- Performance: no regressions in page load or API response times.
`,
  };

  // Skills
  const skills = {
    "skills/code-review/SKILL.md": `# Code Review Skill

## Purpose
Perform structured, thorough code reviews.

## Inputs
- Pull request diff or file list.

## Steps
1. Read changed files and understand context.
2. Check against \`@.claude/rules/coding.md\` and \`@.claude/rules/security.md\`.
3. Use \`@.claude/skills/code-review/checklist.md\` for systematic evaluation.
4. Output review using \`@.claude/templates/pr-description.md\` format.
`,
    "skills/code-review/checklist.md": `# Code Review Checklist

## Correctness
- [ ] Logic is correct and handles edge cases.
- [ ] No off-by-one errors or null pointer issues.

## Security
- [ ] No injection vulnerabilities (SQL, XSS, command).
- [ ] Secrets are not exposed.

## Performance
- [ ] No N+1 queries or unbounded loops.
- [ ] Appropriate caching and pagination.

## Maintainability
- [ ] Code is readable and well-named.
- [ ] No unnecessary complexity or duplication.
- [ ] Tests are meaningful, not just coverage padding.
`,
    "skills/release-notes/SKILL.md": `# Release Notes Skill

## Purpose
Generate changelog entries from commit history or PR diffs.

## Inputs
- Git log or PR description.

## Steps
1. Categorize changes: features, fixes, breaking changes, deprecations.
2. Write user-facing descriptions (not internal jargon).
3. Output using \`@.claude/skills/release-notes/template.md\` format.
`,
    "skills/release-notes/template.md": `# Release Notes Template

## [version] - YYYY-MM-DD

### Added
- New feature description.

### Changed
- Enhancement description.

### Fixed
- Bug fix description.

### Breaking Changes
- Migration steps if applicable.
`,
    "skills/migration-planner/SKILL.md": `# Migration Planner Skill

## Purpose
Plan safe schema, API, or infrastructure migrations.

## Steps
1. Document current state and target state.
2. Identify breaking changes and dependencies.
3. Create step-by-step migration playbook with rollback plan.
4. Validate with dry-run or staging environment.
`,
    "skills/bug-triage/SKILL.md": `# Bug Triage Skill

## Purpose
Categorize and prioritize bug reports.

## Steps
1. Reproduce or understand the reported behavior.
2. Classify severity: critical / high / medium / low.
3. Identify affected component and likely root cause.
4. Suggest immediate workaround if available.
5. Estimate effort and recommend priority.
`,
  };

  // Templates
  const templates = {
    "templates/pr-description.md": `# Pull Request Template

## Summary
<!-- 1-3 bullet points describing what this PR does -->

## Changes
<!-- List of specific changes -->

## Test Plan
<!-- How to verify these changes -->

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or migration documented)
`,
    "templates/design-doc.md": `# Design Document Template

## Title
<!-- Short descriptive title -->

## Context
<!-- Why is this change needed? -->

## Decision
<!-- What approach was chosen and why? -->

## Alternatives Considered
<!-- What other approaches were evaluated? -->

## Consequences
<!-- What are the trade-offs? -->
`,
    "templates/test-plan.md": `# Test Plan Template

## Feature Under Test
<!-- What is being tested? -->

## Test Scenarios
1. Happy path: ...
2. Edge cases: ...
3. Error handling: ...
4. Performance: ...

## Environment Requirements
<!-- Any specific setup needed -->
`,
    "templates/incident-report.md": `# Incident Report Template

## Summary
<!-- One-line description -->

## Timeline
<!-- Key events with timestamps -->

## Impact
<!-- Users/systems affected -->

## Root Cause
<!-- What caused the incident -->

## Resolution
<!-- How it was fixed -->

## Action Items
<!-- Preventive measures -->
`,
  };

  // Agents
  const agents = {
    "agents/backend-architect.md": `# Backend Architect Agent

## Persona
Senior backend engineer focused on API design, data modeling, and system reliability.

## Priorities
1. Correctness and data integrity first.
2. Clear API contracts and error handling.
3. Performance and scalability.
4. Observability (logging, metrics, tracing).

## Heuristics
- Prefer explicit over clever.
- Design for failure; assume external services will be unavailable.
- Use idempotent operations where possible.
`,
    "agents/frontend-specialist.md": `# Frontend Specialist Agent

## Persona
Senior frontend engineer focused on UI/UX quality, accessibility, and performance.

## Priorities
1. Accessibility (WCAG 2.1 AA).
2. Responsive design across device sizes.
3. Performance (Core Web Vitals).
4. Consistent design system usage.

## Heuristics
- Component composition over inheritance.
- Minimize client-side state.
- Lazy load below-the-fold content.
`,
    "agents/infra-guardian.md": `# Infrastructure Guardian Agent

## Persona
Conservative infrastructure engineer focused on reliability, security, and cost.

## Priorities
1. Security posture — never weaken it.
2. Availability and disaster recovery.
3. Cost efficiency.
4. Operational simplicity.

## Heuristics
- Smallest blast radius for every change.
- Immutable infrastructure; avoid in-place mutations.
- Always have a rollback plan.
`,
    "agents/qa-analyst.md": `# QA Analyst Agent

## Persona
Quality assurance engineer focused on test coverage, edge cases, and regression prevention.

## Priorities
1. Identify untested paths and edge cases.
2. Ensure regression tests exist for fixed bugs.
3. Validate error handling and boundary conditions.
4. Performance regression detection.
`,
  };

  // Hooks
  const hooks = {
    "hooks/post-refactor/run-tests.yaml": `# Post-Refactor: Run Tests
description: After any refactor, run the full test suite.
trigger: post-refactor
commands:
  - npm test
  - npm run lint
`,
    "hooks/post-refactor/update-docs.yaml": `# Post-Refactor: Update Docs
description: After refactoring, check if documentation needs updating.
trigger: post-refactor
checks:
  - Review docs/context files for stale references.
  - Update API docs if public interfaces changed.
  - Update CLAUDE.md if project structure changed.
`,
    "hooks/pre-merge/sanity-checks.yaml": `# Pre-Merge: Sanity Checks
description: Quick sanity checks before marking a change as done.
trigger: pre-merge
commands:
  - npm test
  - npm run lint
checks:
  - No TODO/FIXME comments in changed files.
  - No console.log or debug statements in production code.
  - All new files have appropriate headers/licenses.
`,
  };

  // CLAUDE.local.md
  const localMd = {
    "CLAUDE.local.md": `# Local Overrides (gitignored)

# Add personal preferences, local paths, or environment-specific notes here.
# This file is gitignored and will not be committed.
`,
  };

  const allFiles = { ...rules, ...skills, ...templates, ...agents, ...hooks, ...localMd };

  for (const [relPath, content] of Object.entries(allFiles)) {
    const fullPath = path.join(claudeDir, relPath);
    ensureFile(fullPath, content);
  }
}

function scaffoldDocsContext(dir) {
  const docsDir = path.join(dir, "docs", "context");

  const contextFiles = {
    "project-overview.md": `# Project Overview

## What This System Is
<!-- Describe the project, its purpose, and target users -->

## High-Level Capabilities
<!-- Key features and capabilities -->

## Non-Goals
<!-- What this project intentionally does NOT do -->
`,
    "vision-and-roadmap.md": `# Vision and Roadmap

## Vision
<!-- Where is this project heading? -->

## Current Phase
<!-- What phase of development is this in? -->

## Upcoming Milestones
<!-- Key milestones and priorities -->
`,
    "domain-glossary.md": `# Domain Glossary

## Terms
<!-- Define canonical terms used in this project -->

| Term | Definition |
|------|-----------|
| | |
`,
    "architecture.md": `# Architecture

## System Overview
<!-- Top-level architecture diagram and narrative -->

## Components
<!-- Key components and their responsibilities -->

## Boundaries
<!-- System boundaries and external integrations -->
`,
    "architecture-runtime.md": `# Runtime Architecture

## Request Flow
<!-- How requests flow through the system -->

## Background Jobs
<!-- Batch jobs, queues, scheduled tasks -->

## External Services
<!-- Third-party dependencies and their roles -->
`,
    "architecture-deployment.md": `# Deployment Architecture

## Environments
<!-- dev, staging, production -->

## Scaling
<!-- Horizontal/vertical scaling strategy -->

## Feature Flags
<!-- Feature flag system and conventions -->
`,
    "data-model.md": `# Data Model

## Core Entities
<!-- Main entities and their relationships -->

## Invariants
<!-- Business rules that must always hold -->
`,
    "data-migrations.md": `# Data Migration Playbook

## Patterns
<!-- Standard migration patterns used in this project -->

## Safety Checklist
- [ ] Backup taken before migration.
- [ ] Migration tested in staging.
- [ ] Rollback plan documented.
- [ ] Zero-downtime migration where possible.
`,
    "api-contracts.md": `# API Contracts

## Endpoints
<!-- Key endpoints, request/response shapes, status codes -->

## Versioning
<!-- API versioning strategy -->
`,
    "api-guidelines.md": `# API Guidelines

## Patterns
- RESTful resource naming.
- Consistent pagination (cursor or offset).
- Structured error responses.
- Idempotency keys for write operations.

## Authentication
<!-- Auth mechanism and token format -->
`,
    "security-rules.md": `# Security Rules

## Authentication & Authorization
<!-- AuthN/AuthZ approach -->

## Secrets Management
<!-- How secrets are stored and rotated -->

## PII Handling
<!-- Data classification and handling rules -->
`,
    "testing-strategy.md": `# Testing Strategy

## Test Pyramid
- Unit tests: fast, isolated, high coverage.
- Integration tests: service boundaries and external calls.
- E2E tests: critical user flows only.

## When to Write Tests
- Every bug fix gets a regression test.
- Every new feature gets unit + integration tests.
`,
    "constraints.md": `# Constraints

## Technical Constraints
<!-- Platform, language, framework requirements -->

## SLAs / SLOs
<!-- Uptime, latency, throughput targets -->
`,
    "performance.md": `# Performance

## Budgets
<!-- Response time budgets, page load targets -->

## Known Hotspots
<!-- Areas that need performance attention -->
`,
    "ops-and-runbooks.md": `# Operations & Runbooks

## Common Procedures
<!-- Deployment, rollback, scaling -->

## Incident Handling
<!-- How to respond to incidents -->

## Common Failures
<!-- Known failure modes and mitigations -->
`,
    "changelog.md": `# Changelog

## [Unreleased]
<!-- Changes in the current development cycle -->
`,
    "plan.md": `# Current Plan

## Active Work
<!-- What is currently being worked on -->

## Next Up
<!-- Upcoming tasks and priorities -->
`,
    "personas-and-use-cases.md": `# Personas & Use Cases

## Key User Types
<!-- Primary personas -->

## Primary Use Cases
<!-- Most important user workflows -->
`,
    "compliance.md": `# Compliance

## Applicable Regulations
<!-- GDPR, HIPAA, SOC2, etc. -->

## Data Retention
<!-- Retention policies -->

## Audit Requirements
<!-- Logging and audit trail requirements -->
`,
    "ux-flows.md": `# UX Flows

## Primary Flows
<!-- Step-by-step narratives for key user journeys -->
`,
    "ux-principles.md": `# UX Principles

## Design Principles
<!-- Core UX principles to preserve during development -->
`,
    "lessons-learned.md": `# Lessons Learned

## Architecture Decisions
<!-- What worked, what didn't, and why -->

## Process Improvements
<!-- Development process lessons -->

## Incident Retrospectives
<!-- Key takeaways from incidents -->
`,
  };

  // ADR directory
  const adrDir = path.join(docsDir, "decisions");
  ensureDir(adrDir);
  ensureFile(
    path.join(adrDir, "adr-0001-template.md"),
    `# ADR-0001: Decision Record Template

## Status
Accepted

## Context
<!-- What is the issue or decision to be made? -->

## Decision
<!-- What was decided? -->

## Consequences
<!-- What are the positive and negative effects? -->
`
  );

  for (const [fileName, content] of Object.entries(contextFiles)) {
    ensureFile(path.join(docsDir, fileName), content);
  }
}

function ensureClaudeMd(dir) {
  const claudeMdPath = path.join(dir, "CLAUDE.md");
  if (fs.existsSync(claudeMdPath)) {
    const content = fs.readFileSync(claudeMdPath, "utf8");

    // Check for key sections and report
    const sections = [
      { name: "Project summary", pattern: /^#\s/m },
      { name: "Rules references", pattern: /rules\//i },
      { name: "Context references", pattern: /docs\/context/i },
      { name: "Skills references", pattern: /skills\//i },
    ];

    for (const s of sections) {
      if (s.pattern.test(content)) {
        console.log(`   ✓ ${s.name} found`);
      } else {
        console.log(`   ⚠ Missing: ${s.name} — consider adding references`);
      }
    }
    return;
  }

  // Create a new CLAUDE.md with the full reference structure
  const projectName = path.basename(dir);
  const content = `# ${projectName}

## Project Summary
<!-- Describe the project stack and purpose -->

## How to Work Here
- Branch from \`main\`, use feature branches.
- Run \`npm test\` before committing.
- Follow conventions in \`@.claude/rules/coding.md\`.

## Reference Documents

### Rules
- Code conventions: \`@.claude/rules/coding.md\`
- Testing standards: \`@.claude/rules/testing.md\`
- Security rules: \`@.claude/rules/security.md\`
- Infrastructure: \`@.claude/rules/infra.md\`
- Code review checklist: \`@.claude/rules/review.md\`
- Product guardrails: \`@.claude/rules/product.md\`

### Context
- Project overview: \`@docs/context/project-overview.md\`
- Architecture: \`@docs/context/architecture.md\`
- Domain glossary: \`@docs/context/domain-glossary.md\`
- API contracts: \`@docs/context/api-contracts.md\`
- Data model: \`@docs/context/data-model.md\`
- Security rules: \`@docs/context/security-rules.md\`
- Testing strategy: \`@docs/context/testing-strategy.md\`
- Operations: \`@docs/context/ops-and-runbooks.md\`
- Lessons learned: \`@docs/context/lessons-learned.md\`

### Skills & Templates
- Code review: \`@.claude/skills/code-review/SKILL.md\` (uses \`@.claude/skills/code-review/checklist.md\`)
- Release notes: \`@.claude/skills/release-notes/SKILL.md\`
- Migration planning: \`@.claude/skills/migration-planner/SKILL.md\`
- Bug triage: \`@.claude/skills/bug-triage/SKILL.md\`
- PR template: \`@.claude/templates/pr-description.md\`
- Design doc: \`@.claude/templates/design-doc.md\`

### Read-When Triggers
- Before big refactors: read \`@docs/context/architecture.md\` and \`@docs/context/data-model.md\`.
- Before API changes: read \`@docs/context/api-contracts.md\` and \`@docs/context/api-guidelines.md\`.
- Before security work: read \`@.claude/rules/security.md\` and \`@docs/context/security-rules.md\`.
- Before releases: use the release-notes skill.

## Commands & Workflows

\`\`\`bash
npm test              # Run tests
npm run lint          # Type-check / lint
npm run build         # Build
npm run deploy        # Sync, validate, build, test
\`\`\`
`;

  fs.writeFileSync(claudeMdPath, content, "utf8");
  console.log("   ✓ Created CLAUDE.md with full reference structure");
}

function ensureReadme(dir) {
  const readmePath = path.join(dir, "README.md");
  if (fs.existsSync(readmePath)) {
    const content = fs.readFileSync(readmePath, "utf8");
    const lines = content.split("\n").length;
    console.log(`   ✓ README.md exists (${lines} lines)`);
    return;
  }

  const projectName = path.basename(dir);
  fs.writeFileSync(readmePath, `# ${projectName}

## Overview
<!-- Project description -->

## Quick Start

\`\`\`bash
npm install
npm run build
npm test
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── CLAUDE.md              # Claude Code instructions
├── .claude/               # Claude rules, skills, templates, agents
│   ├── rules/             # Coding, testing, security conventions
│   ├── skills/            # Reusable skill definitions
│   ├── templates/         # Output format templates
│   ├── agents/            # Persona/context packs
│   └── hooks/             # Automation triggers
├── docs/context/          # Project context documents
│   ├── architecture.md
│   ├── data-model.md
│   ├── api-contracts.md
│   └── decisions/         # Architecture Decision Records
└── src/                   # Source code
\`\`\`

## Development

See \`CLAUDE.md\` for development conventions and reference documents.
`, "utf8");
  console.log("   ✓ Created README.md");
}

function scanSubRepos(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let found = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    const subDir = path.join(dir, entry.name);
    const gitDir = path.join(subDir, ".git");

    if (fs.existsSync(gitDir)) {
      found++;
      console.log(`   Found repo: ${entry.name}`);

      const subClaudeDir = path.join(subDir, ".claude");
      if (!fs.existsSync(subClaudeDir)) {
        console.log(`     ⚠ Missing .claude directory — scaffolding...`);
        scaffoldClaudeDir(subDir);
        console.log(`     ✓ .claude directory created`);
      } else {
        console.log(`     ✓ .claude directory exists`);
      }

      // Check for CLAUDE.md
      const subClaudeMd = path.join(subDir, "CLAUDE.md");
      if (!fs.existsSync(subClaudeMd)) {
        console.log(`     ⚠ Missing CLAUDE.md — creating...`);
        ensureClaudeMd(subDir);
      } else {
        console.log(`     ✓ CLAUDE.md exists`);
      }
    }
  }

  if (found === 0) {
    console.log("   No sub-repositories found.");
  } else {
    console.log(`   Processed ${found} sub-repositor${found === 1 ? "y" : "ies"}.`);
  }
}

function checkTooling(dir) {
  const packageJson = path.join(dir, "package.json");
  if (fs.existsSync(packageJson)) {
    const pkg = JSON.parse(fs.readFileSync(packageJson, "utf8"));

    // Check for TypeScript
    const hasTsc = pkg.devDependencies?.typescript || pkg.dependencies?.typescript;
    if (hasTsc) {
      console.log("   ✓ TypeScript detected");
      // Check for tsconfig
      if (!fs.existsSync(path.join(dir, "tsconfig.json"))) {
        console.log("   ⚠ tsconfig.json missing");
      }
    }

    // Check for ESLint
    const hasEslint = pkg.devDependencies?.eslint || pkg.dependencies?.eslint;
    if (hasEslint) {
      console.log("   ✓ ESLint detected");
    } else {
      console.log("   ℹ Consider adding ESLint for code quality");
    }

    // Check for test runner
    const hasJest = pkg.devDependencies?.jest || pkg.dependencies?.jest;
    const hasVitest = pkg.devDependencies?.vitest || pkg.dependencies?.vitest;
    if (hasJest) console.log("   ✓ Jest test runner detected");
    else if (hasVitest) console.log("   ✓ Vitest test runner detected");
    else console.log("   ℹ Consider adding a test runner (jest, vitest)");
  }

  // Check .gitignore includes .claude/CLAUDE.local.md
  const gitignorePath = path.join(dir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf8");
    if (!content.includes("CLAUDE.local.md")) {
      console.log("   ⚠ Add .claude/CLAUDE.local.md to .gitignore");
      fs.appendFileSync(gitignorePath, "\n# Claude Code local overrides\n.claude/CLAUDE.local.md\n");
      console.log("   ✓ Added to .gitignore");
    }
  }
}

// ── File utilities ────────────────────────────────────────────────────────────

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) return; // Never overwrite
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
  const rel = path.relative(rootDir, filePath);
  console.log(`   + ${rel}`);
}
