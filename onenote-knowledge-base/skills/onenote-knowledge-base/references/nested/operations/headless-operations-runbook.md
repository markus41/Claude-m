# Headless Operations Runbook

## Purpose

Operate OneNote automation reliably in non-interactive environments.

## Auth Mode Priority

1. Managed Identity
2. Service principal (certificate)
3. Service principal (secret)
4. Device code fallback only when necessary

## Deployment Checklist

1. Verify required Graph scopes are granted.
2. Verify tenant and cloud context mapping.
3. Verify notebook/section IDs are resolvable.
4. Run read-only smoke checks.
5. Execute dry-run for bulk commands.

## Incident Response

If rollout fails:

1. capture page-level failure list
2. stop further writes
3. run quality audit on changed pages
4. re-run with reduced scope

## Observability

Track:

1. pages changed per run
2. patch failure rate
3. style drift score
4. stale-task trend
