---
name: org-app-package
description: Build and validate Fabric org app package artifacts with deterministic versioning and integrity checks.
argument-hint: "[--app <name>] [--version <semver>] [--channel <pilot|broad>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# org-app-package

## Preview Caveat

Fabric organizational app distribution APIs are preview. Validate package schema and deployment compatibility against current tenant behavior before release.

## Prerequisites and Permissions

- Integration context is valid per [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has org app packaging and publishing permissions.
- App metadata, dependency manifest, and release notes are prepared.

## Deterministic Steps

1. Validate context fields, minimum role grants, and requested target channel.
2. Resolve current package baseline and confirm version increment policy.
3. Build package with deterministic metadata: app ID, version, dependency set, and checksum.
4. Validate package manifest integrity and channel compatibility.
5. Store package artifact reference and release evidence for downstream approval.
6. Return a redacted packaging summary with validation results and release readiness status.

## Fail-Fast and Redaction

- Fail fast on invalid version progression, missing metadata, or insufficient permissions.
- Block promotion if package validation fails.
- Redact app and audience identifiers where sensitive; never output secret-bearing config.
