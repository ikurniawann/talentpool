# Epics

This directory contains all epic task groups for Arkiv OS.

## Naming Convention

```
EPIC-000-project-bootstrap.md
EPIC-001-<short-slug>.md
EPIC-002-<short-slug>.md
```

## Status Vocabulary

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

## Entry Point

```text
/agentic-start "Start EPIC-XXX task N"
/task-work EPIC-XXX <n>
/epic-loop
```
