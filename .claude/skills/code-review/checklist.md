# Code Review Checklist

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
