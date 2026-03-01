---
name: alm-pcf-build
description: Build a PCF control and optionally deploy it to a development environment or package it in a solution.
argument-hint: "[--push] [--solution] [--publisher-prefix cr]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Build and Deploy PCF Control

Build a PCF control, test it locally, push to a dev environment, or package into a solution for ALM transport.

## Commands

```bash
# Build the control
npm run build

# Test in browser harness
npm start

# Push to dev environment (quick iteration, not for production)
pac pcf push --publisher-prefix {prefix}

# Package in a solution for formal deployment
pac solution init --publisher-name {Publisher} --publisher-prefix {prefix}
pac solution add-reference --path ../{ControlFolder}
dotnet build
```

## Steps

1. Determine the current state:
   - Is there a PCF project with `ControlManifest.Input.xml`?
   - Is there a solution project with `.cdsproj`?
2. Build the control: `npm run build`
3. Based on the user's goal:
   - **Test locally** → `npm start` (opens browser harness)
   - **Quick push to dev** → `pac pcf push --publisher-prefix {prefix}`
   - **Package for ALM** → create/use solution project, `dotnet build`
   - **Import solution** → `pac solution import --path ./bin/Debug/{SolutionProject}.zip`

## Build Modes

| Mode | Command | Output |
|------|---------|--------|
| Development | `npm run build` | `out/controls/{namespace}.{name}/` |
| Production | `npm run build -- --mode production` | Minified output |
| Test Harness | `npm start` | Local dev server on port 8181 |

## Solution Packaging

```bash
# One-time setup
mkdir SolutionProject && cd SolutionProject
pac solution init --publisher-name Contoso --publisher-prefix cr
pac solution add-reference --path ../MyControl

# Build solution zip
dotnet build

# Output: bin/Debug/SolutionProject.zip
```

## Troubleshooting

- **Build fails with TypeScript errors**: check `tsconfig.json` and `generated/ManifestTypes.d.ts`
- **Harness shows blank**: check browser console for errors, verify `init` method
- **Push fails**: verify `pac auth` is configured and publisher prefix matches
- **Solution build fails**: ensure .NET SDK is installed, `dotnet restore` first
