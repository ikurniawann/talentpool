<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses a recent Next.js release with breaking changes across APIs,
conventions, and generated file structure. Before changing framework-sensitive
code, read the relevant guide in `node_modules/next/dist/docs/` and heed
deprecation notices.
<!-- END:nextjs-agent-rules -->

## Workflow Hygiene

- Keep implementation changes separate from workflow-document cleanup.
- After Claude Code task groups, update the related epic Automation Log before
  running docs hygiene.
- For docs-only hygiene runs, limit edits to `AGENTS.md`, `CLAUDE.md`,
  `docs/AGENTIC-WORKFLOW.md`, and files under `docs/epics/` when they exist.
- Do not deploy, push, or run Claude Code slash commands as part of docs hygiene.
- Remove tracked runtime state that is already covered by `.gitignore`.
