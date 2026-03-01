# Exchange Mail Flow & Deliverability Helper

Guided diagnostics for "email not received" and mail flow issues in Exchange Online. Checks transport rules, quarantine, connectors, and DNS (SPF/DKIM/DMARC), then generates client-safe explanations.

## What this plugin helps with
- Diagnose "email not received" problems step by step
- Check transport rules, quarantine, and connector configurations
- Validate SPF, DKIM, and DMARC DNS records
- Convert technical findings into client-safe explanations with next actions

## Included commands
- `/mailflow-setup` — Configure Exchange Online Management module
- `/mailflow-diagnose` — Guided "email not received" diagnosis
- `/mailflow-explain` — Convert findings into client-safe explanation

## Skill
- `skills/exchange-mailflow/SKILL.md` — Mail flow diagnostics knowledge

## Agent
- `agents/mailflow-reviewer.md` — Reviews mail flow configurations and DNS recommendations
