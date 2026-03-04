# Defender Endpoint API Reference

## Required Permissions

- `SecurityAlert.Read.All`
- `SecurityIncident.Read.All`
- `ThreatHunting.Read.All`
- `Machine.Isolate`

## Workflow Entry Points

- `defender-endpoint-setup`
- `defender-endpoint-triage`
- `defender-endpoint-isolate-machine`
- `defender-endpoint-live-response-metadata`
- `defender-endpoint-evidence-summary`

## Validation Checklist

1. Confirm integration context is complete before execution.
2. Confirm required scopes or roles are granted.
3. Confirm destructive actions include explicit approval.
4. Confirm all output is redacted.
