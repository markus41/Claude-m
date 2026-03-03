---
name: security-setup
description: Prepare Fabric security governance by confirming role model, data classification, and policy owners.
argument-hint: "[--workspace <name>] [--policy-bundle <baseline>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Security Setup

Establish governance foundations before implementing or changing security controls.

## Prerequisites

- Fabric admin or security governance permissions for target workspaces.
- Documented data classification policy and sensitivity label taxonomy.
- Identity groups mapped to business roles for access control.
- Audit and compliance stakeholders for policy review and sign-off.

## Steps

1. Identify workspace owners, security approvers, and responders.
2. Map data domains to sensitivity classes and control levels.
3. Baseline current permissions and detect broad overexposure.
4. Define control implementation order and evidence requirements.

## Output

- Security governance baseline with assigned ownership.
- Remediation backlog for high-risk access or policy gaps.
