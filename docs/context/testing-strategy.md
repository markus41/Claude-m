# Testing Strategy

## Test Pyramid
- Unit tests: fast, isolated, high coverage.
- Integration tests: service boundaries and external calls.
- E2E tests: critical user flows only.

## When to Write Tests
- Every bug fix gets a regression test.
- Every new feature gets unit + integration tests.
