---
name: pa-component-create
description: Generate a reusable canvas component with input/output properties
argument-hint: "<component-name> --inputs <prop1:type,prop2:type> --outputs <prop1:type>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Create Canvas Component

Generate a reusable canvas component definition for a component library.

## Instructions

1. Create the component structure with specified input and output properties.
2. Map property types: `text`, `number`, `boolean`, `color`, `table`, `record`, `screen`.
3. Generate default property values and descriptions.
4. Include sample usage formula showing how to use the component in an app.
5. Add behavior properties for common events (OnSelect, OnChange) if applicable.
