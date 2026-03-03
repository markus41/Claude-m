# OneDrive Large File Upload — Graph API Reference

## Overview

This reference covers resumable upload sessions for files larger than 4 MB (up to 250 GB) in
OneDrive via Microsoft Graph API. It covers session creation, chunked upload mechanics,
resuming interrupted uploads, progress tracking, timeout handling, and production patterns.

Base URL: `https://graph.microsoft.com/v1.0`

---

## API Endpoint Table

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/me/drive/items/{parentId}:/{filename}:/createUploadSession` | `Files.ReadWrite` | `item` (metadata), `deferCommit` | Create upload session |
| POST | `/me/drive/root:/{path}:/createUploadSession` | `Files.ReadWrite` | `item` (metadata) | Create session by path |
| PUT | `{uploadUrl}` | None (URL contains auth token) | `Content-Range`, `Content-Length` | Upload a chunk |
| GET | `{uploadUrl}` | None | — | Query upload status / get expected ranges |
| DELETE | `{uploadUrl}` | None | — | Cancel upload session |

### Session Lifecycle

| Step | Action | Returns |
|------|--------|---------|
| 1 | POST createUploadSession | `uploadUrl`, `expirationDateTime`, `nextExpectedRanges` |
| 2 | PUT chunks to uploadUrl | 202 Accepted (intermediate) or 201 Created (final chunk) |
| 3 | Resume (on failure) | GET uploadUrl returns `nextExpectedRanges` |
| 4 | Completion | 201 Created with the completed `driveItem` object |

---

## Code Snippets

### TypeScript — Complete Large File Upload with Chunking

```typescript
import * as fs from "fs";
import { Client } from "@microsoft/microsoft-graph-client";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB — must be multiple of 320 KiB (327,680 bytes)

interface UploadSession {
  uploadUrl: string;
  expirationDateTime: string;
  nextExpectedRanges: string[];
}

async function createUploadSession(
  client: Client,
  parentId: string,
  filename: string,
  fileSizeBytes: number
): Promise<UploadSession> {
  const session = await client
    .api(`/me/drive/items/${parentId}:/${encodeURIComponent(filename)}:/createUploadSession`)
    .post({
      item: {
        "@microsoft.graph.conflictBehavior": "replace",
        name: filename,
      },
    });

  console.log(`Session created. Expires: ${session.expirationDateTime}`);
  return session as UploadSession;
}

async function uploadChunk(
  uploadUrl: string,
  chunkData: Buffer,
  startByte: number,
  totalBytes: number
): Promise<unknown> {
  const endByte = startByte + chunkData.length - 1;
  const contentRange = `bytes ${startByte}-${endByte}/${totalBytes}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Range": contentRange,
      "Content-Length": chunkData.length.toString(),
      "Content-Type": "application/octet-stream",
    },
    body: chunkData,
  });

  if (!response.ok && response.status !== 202 && response.status !== 201) {
    const error = await response.text();
    throw new Error(`Chunk upload failed (${response.status}): ${error}`);
  }

  if (response.status === 201 || response.status === 200) {
    // Final chunk — returns completed driveItem
    return await response.json();
  }

  // 202 — more chunks needed
  return null;
}

async function uploadLargeFile(
  client: Client,
  parentId: string,
  filename: string,
  filePath: string,
  onProgress?: (percent: number) => void
): Promise<unknown> {
  const stat = fs.statSync(filePath);
  const totalBytes = stat.size;

  console.log(`Starting upload: ${filename} (${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);

  const session = await createUploadSession(client, parentId, filename, totalBytes);
  const fileHandle = fs.openSync(filePath, "r");

  try {
    let offset = 0;

    while (offset < totalBytes) {
      const remaining = totalBytes - offset;
      const chunkSize = Math.min(CHUNK_SIZE, remaining);
      const chunkBuffer = Buffer.alloc(chunkSize);

      fs.readSync(fileHandle, chunkBuffer, 0, chunkSize, offset);

      const result = await uploadChunk(session.uploadUrl, chunkBuffer, offset, totalBytes);

      offset += chunkSize;

      const percent = Math.round((offset / totalBytes) * 100);
      onProgress?.(percent);
      console.log(`Progress: ${percent}% (${(offset / 1024 / 1024).toFixed(1)} MB / ${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);

      if (result) {
        console.log(`Upload complete! Item ID: ${(result as any).id}`);
        return result;
      }
    }
  } finally {
    fs.closeSync(fileHandle);
  }

  throw new Error("Upload ended without receiving a completed driveItem");
}
```

### TypeScript — Resume an Interrupted Upload

```typescript
async function resumeUpload(
  uploadUrl: string,
  filePath: string
): Promise<unknown> {
  // Query session for expected ranges
  const statusResponse = await fetch(uploadUrl, { method: "GET" });

  if (statusResponse.status === 404) {
    throw new Error("Upload session expired or not found. Must restart upload.");
  }

  const status = await statusResponse.json();
  const nextRanges: string[] = status.nextExpectedRanges;

  if (!nextRanges || nextRanges.length === 0) {
    throw new Error("No expected ranges returned — upload may already be complete");
  }

  // Parse the first expected range: "startByte-" or "startByte-endByte"
  const [startStr] = nextRanges[0].split("-");
  const resumeFrom = parseInt(startStr, 10);

  console.log(`Resuming from byte ${resumeFrom}`);

  const stat = fs.statSync(filePath);
  const totalBytes = stat.size;
  const fileHandle = fs.openSync(filePath, "r");

  try {
    let offset = resumeFrom;

    while (offset < totalBytes) {
      const remaining = totalBytes - offset;
      const chunkSize = Math.min(CHUNK_SIZE, remaining);
      const chunkBuffer = Buffer.alloc(chunkSize);

      fs.readSync(fileHandle, chunkBuffer, 0, chunkSize, offset);

      const result = await uploadChunk(uploadUrl, chunkBuffer, offset, totalBytes);
      offset += chunkSize;

      if (result) {
        console.log("Resume upload complete!");
        return result;
      }
    }
  } finally {
    fs.closeSync(fileHandle);
  }

  throw new Error("Resume ended without completion");
}
```

### TypeScript — Upload with Retry Logic

```typescript
async function uploadChunkWithRetry(
  uploadUrl: string,
  chunkData: Buffer,
  startByte: number,
  totalBytes: number,
  maxRetries = 3
): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await uploadChunk(uploadUrl, chunkData, startByte, totalBytes);
    } catch (err: any) {
      lastError = err;

      // On 429, respect Retry-After
      if (err.message?.includes("429")) {
        const retryAfter = 30; // Default 30s if header not parseable
        console.log(`Rate limited. Waiting ${retryAfter}s before retry...`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
      } else if (attempt < maxRetries - 1) {
        // Exponential backoff for other transient errors
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Chunk failed (attempt ${attempt + 1}). Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("Upload failed after max retries");
}
```

### TypeScript — Cancel an Upload Session

```typescript
async function cancelUploadSession(uploadUrl: string): Promise<void> {
  const response = await fetch(uploadUrl, { method: "DELETE" });
  if (response.status === 204) {
    console.log("Upload session cancelled.");
  } else {
    console.warn(`Cancel returned status: ${response.status}`);
  }
}
```

### PowerShell — Large File Upload via Graph REST

```powershell
Connect-MgGraph -Scopes "Files.ReadWrite"

$filePath = "C:\Temp\large-file.zip"
$filename = [System.IO.Path]::GetFileName($filePath)
$totalBytes = (Get-Item $filePath).Length
$chunkSizeBytes = 10 * 1024 * 1024  # 10 MB

# Create upload session
$sessionBody = @{
    item = @{
        "@microsoft.graph.conflictBehavior" = "replace"
        name = $filename
    }
} | ConvertTo-Json -Depth 5

$sessionResponse = Invoke-MgGraphRequest `
    -Uri "https://graph.microsoft.com/v1.0/me/drive/root:/$($filename):/createUploadSession" `
    -Method POST `
    -Body $sessionBody `
    -ContentType "application/json"

$uploadUrl = $sessionResponse.uploadUrl
Write-Host "Session created. URL: $uploadUrl"

# Upload in chunks
$fileStream = [System.IO.File]::OpenRead($filePath)
$offset = 0

try {
    while ($offset -lt $totalBytes) {
        $remaining = $totalBytes - $offset
        $chunkSize = [Math]::Min($chunkSizeBytes, $remaining)
        $buffer = New-Object byte[] $chunkSize
        $null = $fileStream.Read($buffer, 0, $chunkSize)

        $endByte = $offset + $chunkSize - 1
        $headers = @{
            "Content-Range" = "bytes $offset-$endByte/$totalBytes"
            "Content-Length" = "$chunkSize"
        }

        $chunkResponse = Invoke-WebRequest -Uri $uploadUrl -Method PUT `
            -Headers $headers -Body $buffer -ContentType "application/octet-stream"

        $offset += $chunkSize
        $percent = [Math]::Round(($offset / $totalBytes) * 100)
        Write-Progress -Activity "Uploading $filename" -PercentComplete $percent

        if ($chunkResponse.StatusCode -eq 201) {
            $item = $chunkResponse.Content | ConvertFrom-Json
            Write-Host "Upload complete! Item ID: $($item.id)"
        }
    }
} finally {
    $fileStream.Close()
}
```

---

## Error Codes Table

| HTTP Status / Code | Meaning | Remediation |
|--------------------|---------|-------------|
| 400 BadRequest | Malformed `Content-Range` header | Verify format: `bytes {start}-{end}/{total}`; end = start + chunkSize - 1 |
| 400 fragmentOverlap | Chunk range overlaps already-uploaded data | Check `nextExpectedRanges` from session query |
| 400 fragmentLengthMismatch | `Content-Length` doesn't match body size | Ensure chunk buffer size matches declared Content-Length |
| 404 Not Found | Upload session expired or deleted | Restart upload from beginning |
| 409 invalidRange | Chunk range doesn't match expected range | Query session for `nextExpectedRanges` and resume from correct offset |
| 416 RangeNotSatisfiable | Requested range outside file bounds | Verify total file size hasn't changed |
| 429 TooManyRequests | Rate limited | Back off per `Retry-After`; reduce concurrent uploads |
| 500 InternalServerError | Server error during chunk processing | Retry chunk; do not abandon session |
| 503 ServiceUnavailable | Service temporarily unavailable | Retry with exponential backoff |
| sessionExpired | Upload session has expired (24-hour limit) | Create a new session; re-upload from byte 0 |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|----------------|
| Upload session lifetime | 24 hours from creation | Upload continuously; do not let sessions idle |
| Maximum file size | 250 GB per file | Split files larger than 250 GB if needed |
| Minimum chunk size | 320 KiB (327,680 bytes) — MUST be multiple | Non-compliant chunks return 400 |
| Recommended chunk size | 5–10 MB | 10 MB balances throughput and reliability |
| Maximum chunk size | 60 MB | Larger chunks increase risk from network interruptions |
| Concurrent upload sessions | No hard limit; recommend <5 concurrent | Queue large uploads serially to avoid throttling |
| Simple upload size limit | 4 MB maximum | Use sessions for anything above 4 MB |

---

## Common Patterns and Gotchas

### 1. Chunk Size MUST Be a Multiple of 320 KiB

The API strictly requires each chunk (except the final one) to be an exact multiple of
327,680 bytes. Non-compliant sizes return a 400 error. Calculate chunk sizes as:
`chunkSize = N * 327680` where N is a positive integer. 10 MB = 32 * 327,680 = 10,485,760 bytes.

### 2. Upload Sessions Expire After 24 Hours of Inactivity

If you do not upload any chunks for 24 hours, the session is deleted. Always persist the
`uploadUrl` to storage immediately after creation so interrupted uploads can be resumed
(rather than restarted). On resume, query the session URL to get `nextExpectedRanges`.

### 3. The `uploadUrl` Contains an Embedded Access Token

The `uploadUrl` returned by `createUploadSession` is pre-authenticated — it contains a
time-limited anonymous access token. This URL should be treated as a secret. Do NOT include
it in logs, client-side code, or shared configurations. Store it in secure storage only.

### 4. Content-Range Header Format for Final Chunk

The final chunk uses the same format: `bytes {start}-{end}/{total}`. For a 15 MB file
uploaded in 10 MB + 5 MB chunks:
- Chunk 1: `bytes 0-10485759/15728640`
- Chunk 2 (final): `bytes 10485760-15728639/15728640`

The final chunk returns HTTP 201 with the completed `driveItem` in the response body.

### 5. Verify File Integrity After Upload

After upload completes, verify the file was received correctly by comparing the uploaded item's
`file.hashes.quickXorHash` or `file.hashes.sha256Hash` with a locally-computed hash of the
original file. Graph includes SHA-256 for OneDrive for Business files.

### 6. `deferCommit` for Staged Uploads

Use `"deferCommit": true` in the session creation body to upload chunks without immediately
creating the driveItem. After all chunks are uploaded, explicitly commit the upload with a
final PUT containing an empty body. This allows atomic file creation after verifying all
chunks were received successfully.

### 7. Do Not Retry Successful Chunks

If a chunk upload returns 202 (success, more chunks needed), the bytes were accepted. Do not
re-upload the same range. Only re-upload if you receive an error response. Over-uploading the
same bytes wastes bandwidth and can cause `fragmentOverlap` errors.

### 8. Track Progress with Byte Offsets, Not Percentages

Internally, track upload progress using byte offsets (`currentOffset / totalSize`). Convert to
percentage for display only. If the user closes and reopens a progress UI, reconstruct the
percentage from the saved byte offset.

### 9. Network Interruption Recovery

If the network drops mid-chunk, the PUT request will fail. Query the session URL to get
`nextExpectedRanges` — this tells you exactly which byte range the server expects next.
Do not assume the interrupted chunk was partially accepted.

### 10. OneDrive for Business vs Personal Account Behavior

Session-based uploads work identically for both account types. The key difference is that
OneDrive for Business files get `quickXorHash` AND `sha256Hash` in the response, while
personal OneDrive files may only get `quickXorHash`. Always check which hash properties are
populated before attempting integrity verification.
