# Agentic Workflow Runbook

This runbook keeps Claude Code and Codex handoffs consistent after development
task groups.

## Status Vocabulary

Use these status labels in workflow docs and epic Automation Logs:

- `planned`: scoped but not started.
- `in_progress`: active implementation or verification is underway.
- `blocked`: cannot continue without user input or external state.
- `needs_review`: implementation is complete and awaiting review or QA.
- `verified`: checks passed for the stated scope.
- `shipped`: merged or deployed to the intended target.

Avoid mixing these with informal variants such as `done`, `complete`,
`finished`, `wip`, or `todo` in epic status tables.

## Claude Code Handoff Checklist

After Claude Code completes a task group:

1. Update the relevant epic Automation Log with date, actor, summary, checks,
   and remaining blockers.
2. Record exact commands and outcomes for validation.
3. Note any files intentionally left dirty or out of scope.
4. Hand off to Codex only for docs hygiene, review, or the next explicit user
   task.

## Codex Docs Hygiene Checklist

For `claude-codex-docs-workflow` runs:

1. Audit `AGENTS.md`, `CLAUDE.md`, and `docs/AGENTS.md` for stale links.
2. Normalize status labels under `docs/epics/` when that directory exists.
3. Tighten this runbook only when the workflow changed.
4. Remove tracked runtime state already covered by `.gitignore`.
5. Show the diff before asking for commit or push approval.

## Current Repo Notes

- `docs/epics/` is not present yet in this repository.
- If epics are introduced later, each epic should include an `Automation Log`
  section with timestamped entries.
