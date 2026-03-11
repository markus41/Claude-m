---
name: azure-devops-orchestrator:release
description: >
  Coordinate a release: validate gates, generate release notes, tag, deploy, and close work items.
  Orchestrates the full release lifecycle from pre-flight checks through deployment and post-release
  verification.
argument-hint: "<projectName> [--version <semver>] [--env <environment>] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
---

# azure-devops-orchestrator:release

Full release coordination for Azure DevOps — validate, tag, deploy, generate notes, and close work items.

## Arguments

- `<projectName>` — Azure DevOps project name (required)
- `--version <semver>` — Release version (e.g., `1.2.0`). If omitted, auto-increments from latest tag.
- `--env <environment>` — Target deployment environment (e.g., `staging`, `production`). Default: `staging`.
- `--dry-run` — Preview the entire release plan without executing anything
- `--skip-gates` — Skip pre-release gate validation (use with caution)
- `--notes-only` — Only generate release notes, skip deployment
- `--repo <name>` — Specific repository if project has multiple repos

## Workflow

Invoke the **release-coordinator** agent to execute:

```
PRE-FLIGHT -> VALIDATE GATES -> VERSION -> RELEASE NOTES -> TAG -> DEPLOY -> VERIFY -> CLOSE ITEMS -> NOTIFY -> RELEASED
```

### Phase 1: Pre-Flight

Verify prerequisites:
- All work items in the target iteration are Closed or Resolved
- No active/open PRs targeting the release branch
- Main/release branch is clean and up to date
- Pipeline definitions exist for the target environment
- Previous deployment to this environment succeeded

### Phase 2: Validate Gates

Check release readiness gates:

| Gate | Check | Blocking |
|------|-------|----------|
| Open bugs | No Severity 1-2 bugs in iteration | Yes |
| PR status | All PRs merged or declined | Yes |
| Pipeline health | Last CI run passed | Yes |
| Test coverage | No decrease from previous release | Warning |
| Code review | All merged PRs had at least 1 reviewer | Warning |
| Documentation | README/CHANGELOG updated | Warning |

If any blocking gate fails, report and stop. Warnings are reported but do not block.

### Phase 3: Version

Determine release version:
- If `--version` provided, use it
- Otherwise, detect latest git tag and auto-increment:
  - If any work item is type Bug with Severity 1-2: patch bump
  - If any work item is type Feature: minor bump
  - If description contains "breaking change": major bump

### Phase 4: Release Notes

Generate release notes from closed work items in the iteration:

```markdown
## Release {version} — {date}

### Features
- #{id} {title} (@assignee)

### Bug Fixes
- #{id} {title} (@assignee)

### Improvements
- #{id} {title} (@assignee)

### Breaking Changes
- {description}

### Contributors
{unique assignees}
```

Save to `RELEASE_NOTES_{version}.md` or append to `CHANGELOG.md` if it exists.

### Phase 5: Tag

```bash
git tag -a v{version} -m "Release {version}"
git push origin v{version}
```

### Phase 6: Deploy

Trigger the deployment pipeline for the target environment:
```bash
az pipelines run --name "{deployPipeline}" --branch "refs/tags/v{version}" --variables "environment={env}" --project "{project}"
```

Monitor the pipeline run until completion or timeout (10 minutes).

### Phase 7: Verify

After deployment succeeds:
- Check pipeline run status
- If the project has health check endpoints, verify they respond
- Report deployment duration and status

### Phase 8: Close Work Items

For each work item in the release:
```bash
az boards work-item update --id {id} --state "Closed" --fields "Microsoft.VSTS.Common.ResolvedReason=Fixed" --output json
```

Add a comment linking to the release tag.

### Phase 9: Notify

Delegate to **teams-notifier** agent (if available) to post release notification.

## Dry Run

When `--dry-run` is passed, output the complete release plan:
- Gate validation results
- Version that would be assigned
- Generated release notes
- Work items that would be closed
- Pipeline that would be triggered
- Notifications that would be sent

No tags, deployments, or state changes are made.

## Output

```
## Release Completed — v{version}

**Project**: {project}
**Environment**: {env}
**Tag**: v{version}
**Pipeline Run**: #{runId} — Succeeded ({duration})

### Work Items Closed ({n})
| # | Work Item | Type | Assignee |
|---|-----------|------|----------|
| 1 | #{id} ... | Story | Alice |

### Release Notes
{abbreviated notes or link to file}

### Cross-Plugin Actions
- Teams: {posted release card / skipped}
- Outlook: {sent release email / skipped}

### Post-Release Checklist
- [ ] Verify production health
- [ ] Monitor error rates for 1 hour
- [ ] Update external documentation
- [ ] Notify stakeholders
```

## Examples

```bash
# Release to staging
/azure-devops-orchestrator:release platform-api --env staging

# Release specific version to production
/azure-devops-orchestrator:release platform-api --version 2.1.0 --env production

# Preview the release plan
/azure-devops-orchestrator:release platform-api --dry-run

# Generate release notes only
/azure-devops-orchestrator:release platform-api --notes-only

# Skip gate checks (emergency release)
/azure-devops-orchestrator:release platform-api --version 2.1.1 --env production --skip-gates
```

## Tips

- Always run `--dry-run` first to review the release plan
- Use `--notes-only` for generating changelogs without deploying
- For hotfixes, use `--skip-gates` cautiously and document the reason
- Pair with `/azure-devops-orchestrator:status --dora` after release to track DORA impact
