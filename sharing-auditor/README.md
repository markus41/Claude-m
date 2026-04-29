<!-- claude-m:premium-header:start -->
<div align="center">

<a id="top"></a>

# sharing-auditor

### SharePoint and OneDrive external sharing auditor — find overshared links, anonymous access, stale guest users, and auto-generate approval tasks for safe revocation

<sub>Protect identity, endpoints, data, and information.</sub>

<br />

<table align="center">
<tr>
<td align="center"><b>Category</b><br /><code>Security</code></td>
<td align="center"><b>Surfaces</b><br /><sub>Microsoft Graph · Defender · Sentinel · Purview · Entra</sub></td>
<td align="center"><b>Version</b><br /><code>1.0.0</code></td>
<td align="center"><b>Marketplace</b><br /><code>claude-m-microsoft-marketplace</code></td>
</tr>
</table>

<sub><code>microsoft</code> &nbsp;·&nbsp; <code>sharepoint</code> &nbsp;·&nbsp; <code>onedrive</code> &nbsp;·&nbsp; <code>sharing</code> &nbsp;·&nbsp; <code>external-access</code> &nbsp;·&nbsp; <code>guest-users</code></sub>

<a href="#install"><b>Install</b></a> &nbsp;·&nbsp;
<a href="#overview"><b>Overview</b></a> &nbsp;·&nbsp;
<a href="#architecture"><b>Architecture</b></a> &nbsp;·&nbsp;
<a href="#related-plugins"><b>Related plugins</b></a> &nbsp;·&nbsp;
<a href="../README.md"><b>Marketplace</b></a>

</div>

---

> [!TIP]
> **One-line install** — `/plugin install sharing-auditor@claude-m-microsoft-marketplace`



## Overview

> SharePoint and OneDrive external sharing auditor — find overshared links, anonymous access, stale guest users, and auto-generate approval tasks for safe revocation

<details>
<summary><b>What ships in this plugin</b> (commands, agents, skills)</summary>

| Component | Items |
|---|---|
| **Commands** | `/sharing-remediate` · `/sharing-scan` · `/sharing-setup` |
| **Agents** | `sharing-auditor-reviewer` |
| **Skills** | `sharing-auditor` |

</details>


<details>
<summary><b>Quick example</b></summary>

```text
Use sharing-auditor to investigate, contain, and harden against threats.
```

</details>

<a id="architecture"></a>

## Architecture

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#0078D4','primaryTextColor':'#FFFFFF','lineColor':'#5B9BD5','fontFamily':'Segoe UI, Arial, sans-serif'}}}%%
flowchart LR
    classDef user fill:#1E1E1E,stroke:#FFFFFF,color:#FFFFFF,stroke-width:2px
    classDef cc fill:#D97757,stroke:#7A3E2A,color:#FFFFFF
    classDef plugin fill:#0078D4,stroke:#003E6B,color:#FFFFFF,stroke-width:2px
    classDef msft fill:#FFB900,stroke:#B07F00,color:#000000

    U["You"]:::user
    CC["Claude Code"]:::cc
    PG["sharing-auditor<br/>(plugin)"]:::plugin

    subgraph MS[" Microsoft surfaces "]
        direction TB
        S0["Microsoft Graph"]:::msft
        S1["Defender XDR"]:::msft
        S2["Sentinel"]:::msft
    end

    U -->|prompts| CC
    CC -->|loads| PG
    PG ==> S0
    PG ==> S1
    PG ==> S2
```

<a id="install"></a>

## Install

```bash
/plugin marketplace add markus41/Claude-m
/plugin install sharing-auditor@claude-m-microsoft-marketplace
```

> [!IMPORTANT]
> This plugin operates against **Microsoft Graph · Defender · Sentinel · Purview · Entra**. Configure credentials via environment variables — never commit secrets.

[Back to top](#top)

---

<!-- claude-m:premium-header:end -->

Find overshared links, anonymous access, and stale guest users across SharePoint and OneDrive. Generate approval tasks for safe revocation instead of immediate hard deletes.

## What this plugin helps with
- Scan for overshared and anonymous sharing links
- Identify stale guest users who haven't signed in recently
- Audit external sharing policies across site collections
- Generate approval-based revocation tasks (no accidental hard deletes)

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Sharing scans and remediation plans | required | optional | `AzureCloud`\* | `delegated-user` | `Sites.Read.All`, `Sites.FullControl.All`, `User.Read.All`, `AuditLog.Read.All` |

\* Use sovereign cloud values from the contract when applicable.

Commands must fail fast before Graph/SharePoint calls when required context fields are missing.
Results must redact sensitive IDs according to the shared redaction rules.

## Included commands
- `/sharing-setup` — Configure SharePoint admin and Graph access
- `/sharing-scan` — Scan for overshared links, anonymous access, and stale guests
- `/sharing-remediate` — Generate approval tasks for link revocation

## Skill
- `skills/sharing-auditor/SKILL.md` — Sharing links API and external access auditing

## Agent
- `agents/sharing-auditor-reviewer.md` — Reviews remediation actions for safety
<!-- claude-m:premium-footer:start -->

---

<a id="related-plugins"></a>

## Related plugins

<table>
<tr><th>Plugin</th><th>What it does</th></tr>
<tr><td><a href="../graph-investigator/README.md"><code>graph-investigator</code></a></td><td>Microsoft Graph Investigator — unified user investigation, mailbox forensics, activity timelines, device correlation, and forensic reporting across all M365 services</td></tr>
<tr><td><a href="../azure-key-vault/README.md"><code>azure-key-vault</code></a></td><td>Azure Key Vault — secrets, keys, and certificates management with RBAC, rotation policies, and managed identity integration</td></tr>
<tr><td><a href="../azure-policy-security/README.md"><code>azure-policy-security</code></a></td><td>Evaluate Azure policy compliance and security posture — policy assignments, drift analysis, remediation planning, and guardrail recommendations</td></tr>
<tr><td><a href="../defender-sentinel/README.md"><code>defender-sentinel</code></a></td><td>Microsoft Sentinel SIEM/SOAR and Defender XDR — incident triage, KQL threat hunting, analytics rules, SOAR playbooks, advanced hunting, and unified security operations center workflows</td></tr>
<tr><td><a href="../entra-id-admin/README.md"><code>entra-id-admin</code></a></td><td>Microsoft Entra ID administration via Graph API — full user/group lifecycle, directory roles, PIM, authentication methods, admin units, B2B guest management, license assignment, named locations, and entitlement management</td></tr>
<tr><td><a href="../entra-id-security/README.md"><code>entra-id-security</code></a></td><td>Microsoft Entra ID identity governance and security — app registrations, service principals, conditional access, sign-in logs, and risk detection</td></tr>
</table>


<details>
<summary><b>Composable stacks that include <code>sharing-auditor</code></b></summary>

Combine with sibling plugins to build cross-surface runbooks. Browse the full [marketplace catalog](../README.md#plugin-catalog) for a tailored selection.

</details>

---

<div align="center">

<sub>Part of <a href="../README.md"><b>Claude-m</b></a> — the Microsoft plugin marketplace for Claude Code.</sub>

<sub>Licensed under <a href="../LICENSE">MIT</a>. Built for engineers, MSPs, SOC teams, and analytics leaders.</sub>

</div>

<!-- claude-m:premium-footer:end -->

