---
name: dataverse-solution-export
description: Export a Dataverse solution as managed or unmanaged zip
argument-hint: "<solution-name> [managed|unmanaged]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Export a Dataverse Solution

You are generating code to export a Dataverse solution. Follow these steps:

## Step 1: Gather Requirements

Ask the user for the following if not already provided:
- **Solution unique name** (e.g., `ContosoProjectManagement`)
- **Export type**: Managed or Unmanaged (default: both)
- **Output directory** for the zip file
- **Script language**: TypeScript (default) or Bash/curl
- **Environment URL**

### Guidance on managed vs unmanaged:
- **Managed**: For deployment to test/production environments. Components are locked.
- **Unmanaged**: For backup or sharing with other developers. Components are editable.
- **Best practice**: Export both — unmanaged for source control, managed for deployment.

## Step 2: Generate the Export Script

Generate a script that performs these steps:

1. **Publish all customizations** before export:
   ```
   POST {envUrl}/api/data/v9.2/PublishAllXml
   ```

2. **Optionally bump the version** (if requested):
   ```
   PATCH {envUrl}/api/data/v9.2/solutions({solutionId})
   Body: { "version": "1.0.1.0" }
   ```

3. **Call ExportSolution action**:
   ```
   POST {envUrl}/api/data/v9.2/ExportSolution
   Body: {
     "SolutionName": "{solutionUniqueName}",
     "Managed": true/false,
     ...settings flags
   }
   ```

4. **Decode the base64 response** to a binary zip file

5. **Write to disk** with a descriptive filename (include version and managed/unmanaged)

## Step 3: Include Error Handling

- Check if the solution exists before exporting
- Handle API errors with meaningful messages
- Validate the output file was written correctly (file size check)

## Step 4: Output

Present to the user:
1. Complete TypeScript or Bash script
2. The expected output file name and location
3. Notes about what "publish" does and why it is needed before export
4. If both managed and unmanaged: explain the difference and when to use each
