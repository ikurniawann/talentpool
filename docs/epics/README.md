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

## Epic Index

| Epic | Title | Priority | Status |
| --- | --- | --- | --- |
| [EPIC-000](EPIC-000-project-bootstrap.md) | Project Bootstrap | — | done |
| [EPIC-001](EPIC-001-inventory-utilities.md) | Inventory Utility Pages | P1 | backlog |
| [EPIC-002](EPIC-002-accounting-module.md) | Accounting Module | P1 | backlog |
| [EPIC-003](EPIC-003-finance-module.md) | Finance Module | P1 | backlog |
| [EPIC-004](EPIC-004-notifikasi.md) | Email & WhatsApp Notifications | P2 | backlog |
| [EPIC-005](EPIC-005-xendit-qris.md) | Xendit QRIS Topup | P2 | backlog |
| [EPIC-006](EPIC-006-crm-fase4.md) | CRM Fase 4 | P3 | backlog |
| [EPIC-007](EPIC-007-dummy-data-dan-seed.md) | Dummy Data & Seed | Highest | done |

## Entry Point

```text
/agentic-start "Start EPIC-XXX task N"
/task-work EPIC-XXX <n>
/epic-loop
```
