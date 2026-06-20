# Docs Agent Rules

The canonical project agent rules live in `../AGENTS.md`.

For documentation-only hygiene work:

- Do not change application implementation code.
- Do not run deployments or push changes without explicit approval.
- Keep status terms consistent with the vocabulary in
  `docs/AGENTIC-WORKFLOW.md`.
- If `docs/epics/` exists, update the relevant epic Automation Log before
  marking work complete.
- Remove tracked runtime state only when it is already covered by `.gitignore`.
