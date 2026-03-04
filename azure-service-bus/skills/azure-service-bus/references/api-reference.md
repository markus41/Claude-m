# Azure Service Bus API Reference

## Required Permissions

- `Azure Service Bus Data Owner`
- `Reader`

## Workflow Entry Points

- `service-bus-setup`
- `service-bus-lag-scan`
- `service-bus-deadletter-replay-plan`
- `service-bus-stale-subscription-cleanup`
- `service-bus-namespace-quota-check`

## Validation Checklist

1. Confirm integration context is complete before execution.
2. Confirm required scopes or roles are granted.
3. Confirm destructive actions include explicit approval.
4. Confirm all output is redacted.
