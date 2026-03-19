# Security Rules

- Never commit secrets, tokens, or API keys.
- Validate and sanitize all external input (user input, API responses).
- Use parameterized queries; never concatenate SQL.
- Follow least-privilege for IAM roles and service accounts.
- Keep dependencies up to date; audit with `npm audit` or equivalent.
- PII must be encrypted at rest and masked in logs.
