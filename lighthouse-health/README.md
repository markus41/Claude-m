# Lighthouse Tenant Health Scorecard

Multi-tenant health dashboard for MSPs/CSPs using Microsoft 365 Lighthouse. Provides green/yellow/red scoring for security, MFA, stale accounts, backup posture, and licensing.

## What this plugin helps with
- Run health scans across managed customer tenants
- Green/yellow/red scorecard for security posture, MFA coverage, stale accounts, licensing anomalies
- One-click remediation plan generation from scorecard findings
- GDAP-aware multi-tenant operations

## Included commands
- `/lighthouse-setup` — Configure Lighthouse access and GDAP relationships
- `/lighthouse-health-scan` — Scan tenants and produce health scorecard
- `/lighthouse-remediation` — Generate remediation plan from scan findings

## Skill
- `skills/lighthouse-health/SKILL.md` — Lighthouse API and health scoring knowledge

## Agent
- `agents/lighthouse-health-reviewer.md` — Reviews multi-tenant operations for GDAP compliance and safety
