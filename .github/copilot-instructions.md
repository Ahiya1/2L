# Copilot Instructions for 2L (quick reference)

Purpose: help AI coding agents be productive immediately in this repository.

- **Big picture:** 2L is a two-level AI agent orchestration system. Core orchestrator scripts live at the repo root (see `README.md`) and specialized agent behaviors are documented in `agents/` (e.g. `agents/2l-builder.md`, `agents/2l-planner.md`). Agents coordinate via an append-only event stream written to `.2L/events.jsonl` and are observable in the dashboard served from `.2L/dashboard/`.

- **Primary commands:**
  - `./2l.sh install` : install 2L commands/agents to `~/.claude/`
  - `/2l-mvp "..."` : run full orchestration (vision → iterations → commits)
  - `/2l-vision`, `/2l-plan` : interactive alternatives for vision & planning
  - `/2l-dashboard` / `/2l-dashboard-stop` : start/stop local dashboard (ports 8080–8099)
  - `/2l-check-mcps`, `/2l-setup-db`, `/2l-setup-mcps` : env & MCP helpers

- **Event system (critical):**
  - File: `.2L/events.jsonl` (JSONL, one JSON object per line).
  - Agents MUST emit exactly two events: `agent_start` (immediately after reading inputs) and `agent_complete` (immediately before writing report). See `agents/2l-builder.md` for the canonical shell snippet that sources `$HOME/.claude/lib/2l-event-logger.sh` and calls `log_2l_event`.

- **Agent conventions:**
  - Agent docs are authoritative: read the matching file in `agents/` before acting (e.g. `2l-builder`, `2l-planner`, `2l-validator`).
  - Builders follow `patterns.md` placed under `.2L/iteration-*/plan/` — copy-pasteable examples are required there and must be followed exactly.
  - When a task is large, agents should either `COMPLETE` or `SPLIT` (builders create a foundation and subtasks). See `agents/2l-builder.md` for the SPLIT/COMPLETE decision flow.

- **Integrations & external dependencies:**
  - MCPs (Playwright, Chrome DevTools, Supabase local, Screenshot) are optional. Agents must degrade gracefully if an MCP is unavailable and document what was tested.
  - GitHub integration uses the `gh` CLI; orchestration will continue with local git if `gh` is missing or unauthenticated.
  - Supabase local: many builder docs expect a local DB (connection strings and ports documented in `agents/2l-builder.md`).

- **Project layout to reference often:**
  - `agents/` — agent role definitions and required behaviors
  - `commands/` — high-level user-facing command docs (e.g. `2l-mvp`, `2l-dashboard`)
  - `.2L/` in project roots — runtime state: `events.jsonl`, `dashboard/`, `plan/`, iteration folders
  - `lib/` — helper scripts and tools invoked by agents (example: `lib/2l-vision-generator.py`, `lib/2l-pattern-detector.py`, `lib/2l-yaml-helpers.py`)
  - `Prod/` — example/consumer apps (each subfolder has its own package.json and build tooling)

- **Examples agents should follow (copyable):**
  - Emit `agent_start`:
    ```bash
    if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
      . "$HOME/.claude/lib/2l-event-logger.sh"
      log_2l_event "agent_start" "Planner: Starting comprehensive plan" "planning" "planner"
    fi
    ```
  - Emit `agent_complete` before final report:
    ```bash
    if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
      . "$HOME/.claude/lib/2l-event-logger.sh"
      log_2l_event "agent_complete" "Builder-1: Feature X complete" "building" "builder-1"
    fi
    ```

- **Developer workflows to preserve:**
  - To run an orchestration: create or `cd` into your project root, then run `/2l-mvp "Your vision"` — inspect `.2L/events.jsonl` and open `/2l-dashboard` in another terminal.
  - Dashboard state files: `.2L/dashboard/.server-port` and `.2L/dashboard/.server-pid` are used for port reuse and cleanup.
  - When writing code, follow `patterns.md` for exact file structure, naming, and import orders; integrators expect those patterns.

- **When merging/updating existing `.github/copilot-instructions.md`:** preserve any content that documents project-specific commands, event-format examples, and agent expectations (especially event emission snippets and `patterns.md` references). Replace or add up-to-date command examples and a short “where to look” list (see file list above).

- **What I could not discover automatically:**
  - Environment setup details for some subprojects under `Prod/` (exact `npm`/`pnpm` scripts and preferred node versions). If you want, I can scan `Prod/**/package.json` and add run/build commands.

If this looks good I will commit this file to `.github/copilot-instructions.md`. Tell me if you want more depth in any section (examples for `Prod/*` apps, CI commands, or per-agent checklist). 
