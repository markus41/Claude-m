---
name: alm-solution-export
description: Export a Power Platform solution as managed or unmanaged zip, with optional version setting and solution checker validation.
argument-hint: "<solution-name> [--managed] [--path output.zip] [--check]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Export Power Platform Solution

Export a solution from a Power Platform environment as a managed or unmanaged zip file.

## PAC CLI

```bash
# Export as managed (for deployment to downstream environments)
pac solution export --name {SolutionName} --path ./exports/{SolutionName}_managed.zip --managed

# Export as unmanaged (for source control)
pac solution export --name {SolutionName} --path ./exports/{SolutionName}.zip
```

## Steps

1. Determine the solution unique name (not display name)
2. Determine managed vs. unmanaged:
   - **Managed** — for deployment to test/production
   - **Unmanaged** — for source control, development sharing
3. Optionally set the solution version before export: `pac solution version --buildversion X.Y.Z.W`
4. Generate the export command
5. If `--check` is requested, also generate a solution checker command
6. If the user wants source control, also generate unpack command: `pac solution unpack`

## Options

| Flag | Description |
|------|-------------|
| `--name` | Solution unique name |
| `--path` | Output zip file path |
| `--managed` | Export as managed (omit for unmanaged) |
| `--include` | Optional components to include |
| `--max-async-wait-time` | Timeout in minutes |

## Post-Export

- Run solution checker: `pac solution check --path ./exports/{name}.zip --geo UnitedStates`
- Unpack for source control: `pac solution unpack --zipfile ./exports/{name}.zip --folder ./src/{name}`
- Verify: check zip file size and contents
