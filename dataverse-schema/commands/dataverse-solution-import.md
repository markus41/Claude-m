---
name: dataverse-solution-import
description: Import a Dataverse solution zip into a target environment
argument-hint: "<solution-zip-path> [target-env-url]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Import a Dataverse Solution

You are generating code to import a Dataverse solution into a target environment. Follow these steps:

## Step 1: Gather Requirements

Ask the user for the following if not already provided:
- **Solution zip file path** (local path to the .zip file)
- **Target environment URL** (e.g., `https://org-test.crm.dynamics.com`)
- **Import options**:
  - Overwrite unmanaged customizations? (default: true)
  - Publish workflows? (default: true)
  - Import as holding solution? (for staged upgrade, default: false)
- **Script language**: TypeScript (default) or Bash/curl
- **Synchronous or Asynchronous**: Async recommended for production

## Step 2: Recommend Async Import

Always recommend `ImportSolutionAsync` over `ImportSolution`:
- Synchronous import has a timeout risk for large solutions
- Async provides a trackable operation ID for status monitoring
- Async is required for solutions that take more than 2 minutes to import

## Step 3: Generate the Import Script

Generate a script that performs these steps:

1. **Read the solution zip** file and convert to base64
2. **Submit the import request**:
   ```
   POST {envUrl}/api/data/v9.2/ImportSolutionAsync
   Body: {
     "CustomizationFile": "{base64ZipContent}",
     "OverwriteUnmanagedCustomizations": true,
     "PublishWorkflows": true,
     "ConvertToManaged": false,
     "SkipProductUpdateDependencies": false,
     "HoldingSolution": false
   }
   ```
3. **Extract the AsyncOperationId** from the response
4. **Poll for completion**:
   ```
   GET {envUrl}/api/data/v9.2/asyncoperations({asyncOpId})?$select=statuscode,message
   ```
   - Poll every 5 seconds
   - StatusCode 30 = Succeeded
   - StatusCode 31 = Failed
   - StatusCode 32 = Canceled
5. **Report the result** with success or failure details

## Step 4: Handle Connection References

If the solution contains connection references:
- Note that connection references may need manual configuration in the target environment
- Provide guidance on how to update connection references after import
- Mention the `ComponentParameters` option for pre-mapping connections during import

## Step 5: Include Error Handling

- Validate the zip file exists and is readable
- Handle import failures with the error message from the async operation
- If the import fails due to missing dependencies, suggest checking solution dependencies
- Handle timeout scenarios (if polling exceeds a reasonable limit)

## Step 6: Output

Present to the user:
1. Complete TypeScript or Bash script
2. Expected timeline for the import (depends on solution size)
3. Post-import steps:
   - Verify solution appears in the environment
   - Check for connection reference configuration needs
   - Run any post-deployment tests
4. Troubleshooting tips for common import failures
