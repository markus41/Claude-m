# Task Capture Reference

## Overview

Task mining captures user desktop interactions to discover how knowledge workers perform repetitive tasks. Microsoft's task mining solution is embedded in Power Automate Desktop. This reference covers Power Automate Desktop task capture, recording user interactions, OCR metadata, report generation, privacy compliance, consent management, and agent deployment patterns.

---

## Power Automate Task Mining Architecture

```
User Desktop
    │
    ▼
Power Automate Desktop Agent (installed on device)
    │  Records: mouse clicks, keyboard input, app focus changes,
    │           window titles, UI element metadata, screenshots
    ▼
Power Platform Environment (cloud storage)
    │
    ▼
Task Mining Analysis (PA Process Mining / Power BI)
    │
    ▼
Report: Task variants, automation candidates, ROI estimates
```

---

## Power Automate Task Mining API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `https://api.powerplatform.com/taskMining/v1/environments/{envId}/projects` | `Flow.Read.All` | `api-version=2022-03-01-preview` | List task mining projects |
| POST | `https://api.powerplatform.com/taskMining/v1/environments/{envId}/projects` | `Flow.ReadWrite.All` | Body: `name`, `description` | Create a new project |
| GET | `https://api.powerplatform.com/taskMining/v1/environments/{envId}/projects/{projectId}` | `Flow.Read.All` | — | Get project details |
| GET | `https://api.powerplatform.com/taskMining/v1/environments/{envId}/projects/{projectId}/recordings` | `Flow.Read.All` | `$top`, `$skip` | List recordings for a project |
| GET | `https://api.powerplatform.com/taskMining/v1/environments/{envId}/projects/{projectId}/recordings/{recordingId}` | `Flow.Read.All` | — | Get recording metadata |
| DELETE | `https://api.powerplatform.com/taskMining/v1/environments/{envId}/projects/{projectId}/recordings/{recordingId}` | `Flow.ReadWrite.All` | — | Delete a recording |
| POST | `https://api.powerplatform.com/taskMining/v1/environments/{envId}/projects/{projectId}/analyze` | `Flow.ReadWrite.All` | Body: `{}` | Trigger analysis of recordings |
| GET | `https://api.powerplatform.com/taskMining/v1/environments/{envId}/projects/{projectId}/report` | `Flow.Read.All` | — | Get analysis report |

### Authentication

```bash
TOKEN=$(az account get-access-token \
  --resource "https://api.powerplatform.com" \
  --query accessToken -o tsv)

ENV_ID="Default-<tenantId>"
```

---

## Recording User Interactions

### Power Automate Desktop Task Recorder

The task recorder is embedded in Power Automate Desktop. It captures:

| Interaction Type | Captured Data |
|---|---|
| Mouse click | Target UI element, coordinates, timestamp |
| Double click | Target UI element, coordinates |
| Right click | Target UI element, context menu selection |
| Keyboard input | Keystrokes (masked for password fields), target element |
| App focus | Window title, application name, process name |
| Scroll | Direction, scroll amount, target region |
| Screen transition | Before/after screenshot (if screenshots enabled) |
| Copy/Paste | Operation type (not clipboard content by default) |

### Invoking Task Recorder Programmatically

```powershell
# Launch Power Automate Desktop with task recording
Start-Process "ms-flow-task-recorder:" -ArgumentList @(
    "--project-id", "<projectId>",
    "--environment-id", "<envId>"
)

# The agent uses COM automation for UI element detection:
# Internally uses UIA3 (UI Automation v3) to identify elements:
# - ControlType (Button, TextBox, etc.)
# - AutomationId
# - Name (visible text label)
# - ClassName
# - BoundingRectangle (screen coordinates)
```

### Power Automate Desktop Recording Configuration

```json
{
  "RecordingSettings": {
    "CaptureScreenshots": true,
    "ScreenshotInterval": "OnAction",
    "MaskSensitiveData": true,
    "SensitiveFieldPatterns": ["password", "ssn", "credit", "pin"],
    "CaptureKeyboardInput": true,
    "MaskKeyboardInput": false,
    "CaptureClipboard": false,
    "MinimumActionDuration": 0.5,
    "MaxRecordingDuration": 3600
  }
}
```

---

## OCR for UI Element Identification

When UIA3 accessibility APIs cannot identify an element (e.g., in legacy applications or web pages without accessibility attributes), Power Automate Desktop falls back to OCR.

```python
# Python simulation of OCR-based element identification
# (used in custom task capture analysis pipelines)
import pytesseract
from PIL import Image
import cv2
import numpy as np

def identify_ui_elements_via_ocr(screenshot_path: str) -> list[dict]:
    """Extract text regions from a screenshot for UI element mapping."""
    img = cv2.imread(screenshot_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Threshold to isolate text regions
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

    # Get bounding boxes for text
    ocr_data = pytesseract.image_to_data(
        Image.fromarray(thresh),
        output_type=pytesseract.Output.DICT,
        config="--psm 11"  # Sparse text
    )

    elements = []
    for i, text in enumerate(ocr_data["text"]):
        if int(ocr_data["conf"][i]) > 60 and text.strip():
            elements.append({
                "text": text.strip(),
                "left": ocr_data["left"][i],
                "top": ocr_data["top"][i],
                "width": ocr_data["width"][i],
                "height": ocr_data["height"][i],
                "confidence": ocr_data["conf"][i],
            })

    return elements


def match_action_to_ui_element(action_coords: tuple[int, int], elements: list[dict]) -> dict | None:
    """Find the UI element closest to an action's screen coordinates."""
    x, y = action_coords
    for el in elements:
        if (el["left"] <= x <= el["left"] + el["width"] and
                el["top"] <= y <= el["top"] + el["height"]):
            return el
    return None
```

---

## Task Mining Report Generation

```python
import pandas as pd
import json

def parse_task_mining_report(report_json: dict) -> dict:
    """Parse a Power Automate task mining report into structured sections."""
    return {
        "summary": {
            "total_recordings": report_json.get("recordingCount", 0),
            "unique_variants": report_json.get("variantCount", 0),
            "automation_potential_pct": report_json.get("automationPotential", 0),
            "estimated_time_saved_hours": report_json.get("estimatedTimeSavedHours", 0),
        },
        "top_variants": [
            {
                "variant_id": v["id"],
                "steps": v["steps"],
                "frequency": v["caseCount"],
                "avg_duration_sec": v["avgDurationSeconds"],
                "automation_complexity": v.get("automationComplexity", "unknown"),
            }
            for v in report_json.get("variants", [])[:10]
        ],
        "application_breakdown": [
            {
                "application": app["name"],
                "time_spent_pct": app["timeSpentPercentage"],
                "action_count": app["actionCount"],
            }
            for app in report_json.get("applicationBreakdown", [])
        ],
        "automation_candidates": [
            {
                "task_sequence": candidate["steps"],
                "roi_score": candidate["roiScore"],
                "suggested_flow_type": candidate.get("suggestedFlowType", "Desktop flow"),
            }
            for candidate in report_json.get("automationCandidates", [])[:5]
        ],
    }


def export_report_to_excel(report: dict, output_path: str) -> None:
    """Export parsed report to Excel for stakeholder review."""
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame([report["summary"]]).to_excel(writer, sheet_name="Summary", index=False)
        pd.DataFrame(report["top_variants"]).to_excel(writer, sheet_name="Variants", index=False)
        pd.DataFrame(report["application_breakdown"]).to_excel(writer, sheet_name="Applications", index=False)
        pd.DataFrame(report["automation_candidates"]).to_excel(writer, sheet_name="Automation Candidates", index=False)
```

---

## Privacy and Compliance Considerations

| Consideration | Requirement | Implementation |
|---|---|---|
| Employee consent | Required before recording | Consent form signed and stored; opt-out always available |
| Data minimization | Capture only task-relevant interactions | Configure `MaskSensitiveData: true`; disable clipboard capture |
| PII masking | Mask passwords, SSNs, financial data | Use `SensitiveFieldPatterns` in recording config |
| Data retention | Task recordings should not be retained indefinitely | Configure automatic deletion after analysis completes |
| Geographic data residency | Recordings stored in Power Platform environment | Set environment region to match data residency requirements |
| Access control | Only project managers and analysts should access recordings | Use Power Platform environment roles; restrict via AAD security groups |
| GDPR/CCPA right to erasure | Users can request deletion of their recordings | Use `DELETE /recordings/{id}` API; implement request workflow |
| Audit trail for access | Who accessed which recording and when | Enable Power Platform admin activity logging |

---

## Consent Management

```python
# Consent management workflow
import requests
from datetime import datetime

class ConsentManager:
    def __init__(self, token: str, env_id: str):
        self.token = token
        self.env_id = env_id
        self.base = f"https://api.powerplatform.com/taskMining/v1/environments/{env_id}"

    def record_consent(self, user_id: str, project_id: str, consent_given: bool) -> dict:
        """Record user consent for task mining participation."""
        # Store consent in Dataverse or a custom table
        return {
            "userId": user_id,
            "projectId": project_id,
            "consentGiven": consent_given,
            "consentTimestamp": datetime.utcnow().isoformat() + "Z",
            "consentVersion": "1.0",
        }

    def check_consent(self, user_id: str, project_id: str, consent_records: list[dict]) -> bool:
        """Check if a user has given consent for a project."""
        user_consents = [
            r for r in consent_records
            if r["userId"] == user_id and r["projectId"] == project_id
        ]
        if not user_consents:
            return False
        latest = max(user_consents, key=lambda r: r["consentTimestamp"])
        return latest["consentGiven"]

    def delete_user_recordings(self, project_id: str, user_recordings: list[str]) -> list[str]:
        """Delete all recordings for a user (GDPR erasure)."""
        deleted = []
        headers = {"Authorization": f"Bearer {self.token}"}
        for rec_id in user_recordings:
            url = f"{self.base}/projects/{project_id}/recordings/{rec_id}"
            resp = requests.delete(url, headers=headers)
            if resp.status_code == 204:
                deleted.append(rec_id)
        return deleted
```

---

## Task Capture Agent Deployment

```powershell
# Deploy Power Automate Desktop agent silently (enterprise deployment)
# Requires: PAD installer from Power Platform admin center

# Silent install with specific environment binding
Start-Process -FilePath "PowerAutomateDesktop.Setup.exe" -ArgumentList @(
    "/quiet",
    "/install",
    "/environment", "<envId>",
    "/tenant", "<tenantId>",
    "/log", "C:\install-logs\pad-install.log"
) -Wait -NoNewWindow

# Verify agent registration
Get-Service -Name "UIFlowService" | Select-Object Name, Status, StartType

# Configure agent for task mining specifically
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\PowerAutomateDesktop" `
    -Name "TaskMiningEnabled" -Value 1 -Type DWORD

# Group Policy for bulk deployment
# GPO path: Computer Configuration > Administrative Templates > Power Automate Desktop
# Setting: Enable Task Mining Recording = Enabled
```

---

## Data Retention for Task Logs

```python
# Automated cleanup of old task recordings
import requests
from datetime import datetime, timedelta

def delete_old_recordings(
    token: str, env_id: str, project_id: str, max_age_days: int = 90
) -> dict:
    """Delete recordings older than max_age_days."""
    headers = {"Authorization": f"Bearer {token}"}
    base = f"https://api.powerplatform.com/taskMining/v1/environments/{env_id}/projects/{project_id}"
    cutoff = datetime.utcnow() - timedelta(days=max_age_days)

    # List recordings
    recordings_url = f"{base}/recordings?api-version=2022-03-01-preview&$top=200"
    all_recordings: list[dict] = []
    while recordings_url:
        resp = requests.get(recordings_url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        all_recordings.extend(data.get("value", []))
        recordings_url = data.get("@odata.nextLink")

    deleted, skipped = [], []
    for rec in all_recordings:
        created_at = datetime.fromisoformat(rec["createdDateTime"].replace("Z", "+00:00"))
        if created_at.replace(tzinfo=None) < cutoff:
            del_resp = requests.delete(
                f"{base}/recordings/{rec['id']}?api-version=2022-03-01-preview",
                headers=headers
            )
            if del_resp.status_code == 204:
                deleted.append(rec["id"])
            else:
                skipped.append(rec["id"])
        else:
            skipped.append(rec["id"])

    return {"deleted": len(deleted), "skipped": len(skipped), "deleted_ids": deleted}
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `403 Forbidden` on project list | `Flow.Read.All` not consented | Grant `Flow.Read.All` with admin consent |
| `409 Conflict` creating project | Project name already exists | Use a unique project name |
| Recording stuck in `Analyzing` | Analysis job timed out | Re-trigger via `POST /analyze` |
| Agent not sending recordings | Agent not registered to correct environment | Reinstall agent with correct environment binding |
| OCR confidence too low | Low-contrast or small UI text | Adjust screen DPI; use accessibility-aware apps |
| Consent check fails | Consent table not populated | Implement consent collection before deploying agents |
| GDPR deletion fails | Recording in use by active analysis | Wait for analysis to complete before deletion |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Recordings per project | 1,000 | Archive analyzed recordings to stay under limit |
| Recording duration | 8 hours per session | Split long tasks into shorter sessions |
| Maximum screenshot resolution | 1920×1080 (downsampled) | Higher res screens are downsampled |
| Task mining projects per environment | 100 | Contact Microsoft for increase |
| OCR confidence threshold | Configurable (default 60%) | Lower = more detections, more noise |
| Sensitive data patterns | 20 regex patterns | Extend by configuring custom patterns |
| Agent simultaneous recordings | 1 per machine | Agents record one session at a time |
| Analysis processing time | ~1 hour per 100 recordings | Larger datasets take proportionally longer |
| Data residency | Power Platform environment region | Set during environment creation; not changeable |
