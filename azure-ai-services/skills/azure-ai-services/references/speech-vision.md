# Speech and Vision — Azure AI Reference

Azure AI Speech provides speech-to-text (STT), text-to-speech (TTS), translation, and speaker recognition. Azure AI Vision provides image analysis, OCR (read), object detection, smart crop, and custom vision. Azure Video Indexer provides video transcript and insight extraction.

---

## REST API Endpoints — Speech Service

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` | API key or managed identity | `language`, `format` | Real-time STT (WebSocket preferred) |
| POST | `https://{region}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions` | API key or managed identity | Body: transcription config | Batch transcription (async) |
| GET | `https://{region}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions/{id}` | API key | — | Poll batch transcription |
| GET | `https://{region}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions/{id}/files` | API key | — | Get result files |
| POST | `https://{region}.tts.speech.microsoft.com/cognitiveservices/v1` | API key | SSML body | Synthesize speech (TTS) |
| GET | `https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list` | API key | — | List available voices |
| POST | `https://{region}.api.cognitive.microsoft.com/speaker/verification/v2.0/text-independent/profiles` | API key | Body: `{ "locale": "en-US" }` | Create speaker profile |
| POST | `https://{region}.api.cognitive.microsoft.com/speaker/identification/v2.0/text-independent/profiles/{id}/enrollments` | API key | Body: audio | Enroll speaker voice print |

## REST API Endpoints — Computer Vision

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `https://{endpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01` | API key or `Cognitive Services User` | `features`, `language`, `modelVersion` | Image analysis v4.0 |
| POST | `https://{endpoint}/computervision/imageanalysis:segment?api-version=2023-02-01-preview` | API key | `mode=backgroundRemoval` | Background removal |
| POST | `https://{endpoint}/vision/v3.2/read/analyze` | API key | `language`, `readingOrder` | OCR (Read) — triggers async job |
| GET | `https://{endpoint}/vision/v3.2/read/analyzeResults/{operationId}` | API key | — | Poll OCR result |

## REST API Endpoints — Custom Vision

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `https://{endpoint}/customvision/v3.3/training/projects` | Training API key | Body: project config | Create Custom Vision project |
| POST | `https://{endpoint}/customvision/v3.3/training/projects/{id}/images` | Training API key | Body: image URLs | Add training images |
| POST | `https://{endpoint}/customvision/v3.3/training/projects/{id}/train` | Training API key | — | Train model iteration |
| POST | `https://{endpoint}/customvision/v3.3/Prediction/{id}/classify/iterations/{iterationId}/url` | Prediction API key | Body: `{ "url": "..." }` | Classify image |

---

## Speech SDK — Key Patterns (TypeScript)

```typescript
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.SPEECH_KEY!,
  process.env.SPEECH_REGION!
);

// --- Speech to Text (real-time) ---
async function transcribeFromMicrophone(): Promise<string> {
  return new Promise((resolve, reject) => {
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizeOnceAsync(result => {
      if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        resolve(result.text);
      } else if (result.reason === sdk.ResultReason.NoMatch) {
        reject(new Error('No speech recognized'));
      } else {
        reject(new Error(`Error: ${result.errorDetails}`));
      }
      recognizer.close();
    });
  });
}

// --- Continuous STT with interim results ---
async function continuousTranscription(audioFilePath: string): Promise<string[]> {
  const results: string[] = [];
  speechConfig.speechRecognitionLanguage = 'en-US';

  return new Promise((resolve, reject) => {
    const audioConfig = sdk.AudioConfig.fromWavFileInput(
      require('fs').readFileSync(audioFilePath)
    );
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognized = (_, event) => {
      if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
        results.push(event.result.text);
      }
    };

    recognizer.sessionStopped = () => {
      recognizer.stopContinuousRecognitionAsync();
      resolve(results);
    };

    recognizer.startContinuousRecognitionAsync(
      () => {},
      reject
    );
  });
}

// --- Text to Speech ---
async function synthesizeSpeech(text: string, outputPath: string): Promise<void> {
  speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;

  return new Promise((resolve, reject) => {
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    // SSML for rich control over prosody, style, emphasis
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="en-US-JennyNeural">
          <prosody rate="0.9" pitch="+2%">
            ${text}
          </prosody>
        </voice>
      </speak>`;

    synthesizer.speakSsmlAsync(ssml, result => {
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        resolve();
      } else {
        reject(new Error(result.errorDetails));
      }
      synthesizer.close();
    });
  });
}

// --- Speech Translation ---
async function translateSpeech(
  fromLanguage: string,
  toLanguages: string[]
): Promise<Record<string, string>> {
  const translationConfig = sdk.SpeechTranslationConfig.fromSubscription(
    process.env.SPEECH_KEY!,
    process.env.SPEECH_REGION!
  );
  translationConfig.speechRecognitionLanguage = fromLanguage;
  toLanguages.forEach(lang => translationConfig.addTargetLanguage(lang));

  return new Promise((resolve, reject) => {
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new sdk.TranslationRecognizer(translationConfig, audioConfig);

    recognizer.recognizeOnceAsync(result => {
      if (result.reason === sdk.ResultReason.TranslatedSpeech) {
        const translations: Record<string, string> = {};
        toLanguages.forEach(lang => {
          translations[lang] = result.translations.get(lang);
        });
        resolve(translations);
      } else {
        reject(new Error(result.errorDetails));
      }
      recognizer.close();
    });
  });
}
```

---

## Batch Transcription (REST API)

```typescript
// Submit batch transcription job
async function submitBatchTranscription(
  region: string,
  apiKey: string,
  audioUrls: string[],
  language: string = 'en-US'
): Promise<string> {
  const response = await fetch(
    `https://${region}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contentUrls: audioUrls,
        locale: language,
        displayName: `Batch transcription ${new Date().toISOString()}`,
        properties: {
          diarizationEnabled: true,       // Speaker separation
          wordLevelTimestampsEnabled: true,
          punctuationMode: 'DictatedAndAutomatic',
          profanityFilterMode: 'Masked',
          timeToLive: 'PT24H'             // Auto-delete after 24h
        }
      })
    }
  );

  const data = await response.json();
  return data.self.split('/').pop(); // Extract transcription ID
}

// Poll for completion
async function waitForTranscription(
  region: string,
  apiKey: string,
  transcriptionId: string
): Promise<any> {
  const url = `https://${region}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions/${transcriptionId}`;

  while (true) {
    const response = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey }
    });
    const data = await response.json();

    if (data.status === 'Succeeded') {
      // Get the result files
      const filesResponse = await fetch(data.links.files, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey }
      });
      return filesResponse.json();
    } else if (data.status === 'Failed') {
      throw new Error(`Transcription failed: ${JSON.stringify(data.properties?.error)}`);
    }

    await new Promise(r => setTimeout(r, 5000));
  }
}
```

---

## Computer Vision v4.0 — Image Analysis

```typescript
// Analyze image with multiple features
async function analyzeImage(
  endpoint: string,
  apiKey: string,
  imageUrl: string
): Promise<any> {
  const features = [
    'caption',        // Generate natural language description
    'denseCaptions',  // Multiple captions for image regions
    'tags',           // Keyword tags
    'objects',        // Detected objects with bounding boxes
    'read',           // OCR text extraction
    'smartCrops',     // Suggested crop regions
    'people'          // Detected people (bounding boxes only — no identification)
  ].join(',');

  const response = await fetch(
    `${endpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=${features}&language=en&modelVersion=latest`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: imageUrl })
    }
  );

  return response.json();
}

// Result structure:
// result.captionResult.text = "A woman working at a laptop in a coffee shop"
// result.tagsResult.values = [{ name: "laptop", confidence: 0.99 }, ...]
// result.objectsResult.values = [{ tags: [{name:"laptop"}], boundingBox: {...} }]
// result.readResult.blocks[0].lines[0].text = "Sale 50% off"
// result.smartCropsResult.values = [{ aspectRatio: 1.78, boundingBox: {...} }]
```

---

## OCR (Read API v3.2)

```typescript
// For documents requiring line-by-line text extraction with layout
async function extractTextFromDocument(
  endpoint: string,
  apiKey: string,
  documentUrl: string
): Promise<string[]> {
  // Start OCR analysis
  const startResponse = await fetch(
    `${endpoint}/vision/v3.2/read/analyze?readingOrder=natural`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: documentUrl })
    }
  );

  const operationId = startResponse.headers
    .get('Operation-Location')!
    .split('/').pop()!;

  // Poll for results
  let result: any;
  while (true) {
    const pollResponse = await fetch(
      `${endpoint}/vision/v3.2/read/analyzeResults/${operationId}`,
      { headers: { 'Ocp-Apim-Subscription-Key': apiKey } }
    );
    result = await pollResponse.json();

    if (result.status === 'succeeded') break;
    if (result.status === 'failed') throw new Error('OCR failed');
    await new Promise(r => setTimeout(r, 2000));
  }

  // Extract all lines of text
  const lines: string[] = [];
  for (const page of result.analyzeResult.readResults) {
    for (const line of page.lines) {
      lines.push(line.text);
    }
  }
  return lines;
}
```

---

## Face API Deprecation Notes

> **Important:** The Face API's person identification and similar face search capabilities were retired in June 2025 as part of Microsoft's Responsible AI commitments. These capabilities required specific use case approval and are no longer available for new customers.

**What remains available:**
- Face detection (presence, bounding box, landmarks)
- Face attribute detection (mask, glasses, head pose)
- Face verification (1:1 — are these two images the same person?)

**What is retired:**
- Person identification (1:N — who is this person?)
- Large-scale face similarity search
- Emotion recognition (retired separately)

**Alternatives for biometric identity:**
- Azure AI Video Indexer for video transcript speaker labeling
- Speaker recognition in Speech Service (audio-only)
- For access control: Use FIDO2 hardware keys, not biometrics

---

## Responsible AI Requirements

| Capability | Requirement |
|-----------|-------------|
| OCR / Read | No approval required |
| Image captioning | No approval required |
| Object detection | No approval required |
| Face detection (detection only) | No approval required |
| Face identification | Retired — not available |
| Custom Vision | No approval required |
| Speech to Text | No approval required |
| Custom Neural Voice | Limited access — approval required |
| Speaker recognition in sensitive scenarios | Review usage policy |

---

## Azure Video Indexer API

```typescript
// Get video insights (transcript, labels, topics, OCR)
async function getVideoInsights(
  accountId: string,
  videoId: string,
  accessToken: string
): Promise<any> {
  const response = await fetch(
    `https://api.videoindexer.ai/trial/Accounts/${accountId}/Videos/${videoId}/Index?language=en-US&includedInsights=Transcript,Labels,Topics,Faces,Keywords,Sentiments,Scenes`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return response.json();
}

// Transcript result includes:
// - Utterances with timestamps (id, start, end, text, confidence, speakerId)
// - Speaker diarization (multiple speakers labeled)
// - Topics detected (education, sports, tech, etc.)
// - Visual labels (objects seen in frames)
// - Keywords extracted from transcript
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidImageFormat` | Unsupported image format | Convert to JPEG, PNG, GIF, BMP, TIFF, or WebP |
| 400 `InvalidImageSize` | Image too small or too large | Min 50x50 px; max 20 MB for Vision; 6 MB for Face |
| 400 `InvalidAudioFormat` | Unsupported audio codec | Convert to WAV (PCM), MP3, OGG, or FLAC |
| 401 `Unauthorized` | Invalid API key | Verify subscription key in Azure portal |
| 403 `OperationNotAllowed` | Feature requires special access | Check Responsible AI limited access status |
| 404 `OperationNotFound` | Async operation ID not found | Wait 2+ seconds before first poll |
| 429 `TooManyRequests` | Rate limit exceeded | Use batch APIs; implement exponential backoff |
| 503 `ServiceUnavailable` | Regional outage | Check Azure status; retry with backoff |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Vision: image size | 20 MB (URL), 4 MB (binary) | For analysis; OCR: 50 MB for large files |
| Vision: image dimensions | Min 50x50 px | No maximum defined |
| Speech STT: audio length (real-time) | 15 seconds per recognition | Use continuous recognition for longer |
| Speech STT: batch job size | 1,000 files per job | Each file up to 1 GB |
| Speech TTS: SSML text | 1,000 characters per request | Use batching for long text |
| Speaker recognition: enrollment | 20 seconds of audio minimum | Per voice profile |
| Video Indexer: video duration | Up to 4 hours | — |
| Video Indexer: file size | Up to 30 GB | — |
| Custom Vision: training images | 5,000 per project | 50 tags per project |
| Transcription concurrent jobs | 200 | Per region |

---

## Common Patterns and Gotchas

1. **Speech SDK vs REST for real-time STT** — The Speech SDK uses WebSocket streaming for real-time transcription, which provides much lower latency than REST polling. Use the SDK for interactive applications and the REST batch API for file processing.

2. **Diarization requires >= 2 speakers** — Speaker diarization (identifying who said what) requires at least two distinct speakers in the audio. Single-speaker audio still works but produces only one speaker label.

3. **Neural TTS voices** — Use Neural voices (names ending in "Neural" like `en-US-JennyNeural`) instead of Standard voices. Neural voices are more natural and Standard voices will be deprecated.

4. **Vision v4.0 vs v3.2** — Vision 4.0 uses a unified `imageanalysis:analyze` endpoint. Vision 3.2 had separate endpoints per feature. For new projects, always use v4.0. Read (OCR) for documents still uses v3.2 endpoints.

5. **Smart crop aspect ratios** — Computer Vision smart crop suggests crop regions for specified aspect ratios (e.g., 1:1 for profile photos, 16:9 for banners). Specify multiple `smartCropsAspectRatios` in one request.

6. **Video Indexer access token expiry** — Video Indexer access tokens expire after 1 hour. Implement token refresh for long-running video processing pipelines.

7. **OCR language detection** — The Read API automatically detects document language. For mixed-language documents, specify `readingOrder=natural` to preserve logical reading order across language boundaries.

8. **Custom Vision export** — Custom Vision models can be exported as ONNX, CoreML, TensorFlow, or Docker container for offline/edge inference. This is ideal for IoT or bandwidth-constrained environments.

9. **Face verification vs identification** — Face verification (is face A the same as face B?) is still available and requires no approval. Face identification (who is this person?) is retired. Design solutions around verification for security use cases.

10. **Responsible AI content filtering** — Azure AI Vision and Speech services do not provide Responsible AI content filtering. For generated content governance, use Azure OpenAI content filters. Vision and Speech are for perception (input analysis), not generation.
