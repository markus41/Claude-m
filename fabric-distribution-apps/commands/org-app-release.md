---
name: org-app-release
description: Execute staged Fabric org app release with deterministic approval gates, rollout checks, and rollback readiness verification.
argument-hint: "[--app <name>] [--version <semver>] [--stage <pilot|broad>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# org-app-release

## Preview Caveat

Fabric org app release workflows are preview and can change. Revalidate release endpoints and stage behavior before production promotion.

## Prerequisites and Permissions

- Integration context is valid per [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has release authority for target rollout stage.
- Approved package version and permission model are already in place.

## Deterministic Steps

1. Validate context, release permissions, and target stage (`pilot` or `broad`).
2. Confirm package checksum, dependency status, and approval evidence.
3. Validate audience scope and rollback plan before mutation.
4. Execute release to target stage and capture operation references.
5. Verify post-release status, package assignment health, and access outcomes.
6. Return a redacted release report with success criteria, issues, and rollback recommendations.

## Fail-Fast and Redaction

- Fail fast on missing approvals, invalid stage transitions, or permission gaps.
- Block broad release if pilot validation criteria are not met.
- Redact tenant, app, audience, and principal identifiers in release output.
