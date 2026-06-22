# Agentic Workflow Runbook

This runbook keeps Claude Code and Codex handoffs consistent after development
task groups.

## Entry Points

| Scenario | Command |
| --- | --- |
| Raw task or enhancement | `/agentic-start "<task>"` |
| Work one epic task | `/task-work EPIC-XXX <n>` |
| Loop all on-progress tasks | `/epic-loop` |
| Docs hygiene pass | `/claude-codex-docs-workflow` |

## Status Vocabulary

Use these status labels in workflow docs and epic Automation Logs:

| Status | Meaning |
| --- | --- |
| `backlog` | Planned, not yet started |
| `on-progress` | Ready for automation/execution |
| `coding` | Implementation actively underway |
| `review` | Review gate running |
| `testing` | Test gate running |
| `deploying-dev` | DEV-only deploy running |
| `ready-for-qa` | Automation passed, human QA next |
| `blocked` | Needs human decision or external state |
| `done` | Completed |

Avoid informal variants: `planned`, `in_progress`, `needs_review`, `verified`,
`shipped`, `done`, `complete`, `wip`, `todo`.

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

## Epics

- [`docs/epics/EPIC-000-project-bootstrap.md`](epics/EPIC-000-project-bootstrap.md) — baseline workflow setup (`done`)
