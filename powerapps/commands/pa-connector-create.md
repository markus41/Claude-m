---
name: pa-connector-create
description: Generate a custom connector definition (OpenAPI/Swagger) for a REST API
argument-hint: "<api-name> --base-url <url> --auth apikey|oauth2|basic [--operations <op1,op2>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Create Custom Connector

Generate an OpenAPI 2.0 (Swagger) custom connector definition for Power Apps and Power Automate.

## Instructions

1. Scaffold the OpenAPI 2.0 structure with `info`, `host`, `basePath`, `schemes`.
2. Configure `securityDefinitions` based on `--auth`:
   - `apikey`: API key in header or query parameter.
   - `oauth2`: Authorization code flow with token URL.
   - `basic`: Basic authentication.
3. If `--operations` is provided, create path definitions for each operation.
4. Generate request/response schemas based on common REST patterns.
5. Set unique `operationId` for each operation.
6. Write the connector definition as a JSON file.
7. Provide instructions for importing into Power Platform.
