# Testing Standards

## Required Tests
- Unit tests for all public functions and methods.
- Integration tests for API endpoints and external service calls.
- Snapshot or contract tests for serialized outputs.

## Running Tests
```bash
npm test           # unit tests
npm run test:e2e   # integration / end-to-end
```

## Coverage
- Aim for 80%+ line coverage on new code.
- Never reduce coverage on existing modules.
