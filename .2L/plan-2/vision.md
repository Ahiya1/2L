# Project Vision: 2L Observability & Reliability Improvements

**Created:** 2025-10-08T14:37:00Z
**Plan:** plan-2

---

## Problem Statement

The 2L system has three critical gaps that impact developer experience and system reliability:

1. **Event system is broken** - Dashboard and observability don't work because agent event emission is undefined and inconsistent
2. **MCP connectivity is unclear** - New machine setup lacks verification steps, unclear which MCPs are connected
3. **GitHub integration needs validation** - Recently switched from GitHub MCP to `gh` CLI, needs verification and documentation

**Current pain points:**
- Developers can't observe orchestration progress in real-time
- Dashboard shows no data because events aren't being emitted properly
- Setting up 2L on new machines is confusing (which MCPs are needed/connected?)
- Unclear if GitHub integration works correctly after switching to `gh` CLI
- README doesn't reflect current architecture decisions

---

## Target Users

**Primary user:** 2L developers and users
- Setting up 2L on new machines
- Monitoring orchestration progress
- Understanding system architecture
- Debugging orchestration issues

**Secondary users:** Future 2L contributors
- Need clear documentation to understand event flow
- Need setup guides for development environment

---

## Core Value Proposition

A reliable, observable 2L system where developers can see what's happening during orchestration and quickly verify their setup works.

**Key benefits:**
1. Real-time orchestration visibility through working dashboard
2. Clear setup verification for new machines
3. Documented, reliable GitHub integration
4. Up-to-date README reflecting actual architecture

---

## Feature Breakdown

### Must-Have (MVP)

1. **Event System Redesign**
   - Description: Implement clean, predictable event emission pattern
   - User story: As a 2L user, I want to see orchestration progress in real-time so that I can monitor what's happening
   - Acceptance criteria:
     - [ ] Orchestrator emits events on every phase transition
     - [ ] Orchestrator emits events on iteration start/complete
     - [ ] Each agent emits exactly 2 events: agent_start and agent_complete
     - [ ] Events include: timestamp, event_type, phase, agent_id, data
     - [ ] All events written to `.2L/events.jsonl`
     - [ ] Event format matches dashboard expectations

2. **Update Agent Templates**
   - Description: Add event emission to all 10 agent markdown files
   - User story: As an agent, I need clear instructions on when to emit events so that my work is observable
   - Acceptance criteria:
     - [ ] All 10 agents have "Event Emission" section
     - [ ] Instructions for agent_start event (after reading context, before work)
     - [ ] Instructions for agent_complete event (after work, before writing report)
     - [ ] Example bash commands using `log_2l_event` function
     - [ ] Clear placement in agent workflow

3. **Update Orchestrator Documentation**
   - Description: Document event emission points in `/2l-mvp` command
   - User story: As someone reading 2L code, I want to understand where events are emitted so that I can debug issues
   - Acceptance criteria:
     - [ ] `/2l-mvp.md` has all orchestrator event emission points documented
     - [ ] Phase transition events clearly marked
     - [ ] Iteration lifecycle events documented
     - [ ] Complexity decision events included
     - [ ] Examples of event payload structure

4. **MCP Connection Verification**
   - Description: Create utility to check MCP connectivity and guide setup
   - User story: As a new 2L user, I want to verify which MCPs are connected so that I know my environment is ready
   - Acceptance criteria:
     - [ ] New command: `/2l-check-mcps` or similar
     - [ ] Checks for: Playwright, Chrome DevTools, Supabase, Screenshot MCPs
     - [ ] Reports: Connected ✅, Missing ⚠️, How to connect
     - [ ] Documents which MCPs are optional vs required
     - [ ] Clear setup instructions for each MCP

5. **GitHub CLI Verification**
   - Description: Verify and document `gh` CLI integration works correctly
   - User story: As a 2L user, I want automatic GitHub repo creation to work reliably so that my work is backed up
   - Acceptance criteria:
     - [ ] Test `setup_github_repo()` function logic
     - [ ] Verify `gh` CLI detection works
     - [ ] Verify repo creation from plan directory name
     - [ ] Verify commit pushing works
     - [ ] Verify tag pushing works
     - [ ] Document the GitHub workflow in README

6. **README Updates**
   - Description: Update README to reflect current architecture and decisions
   - User story: As someone learning 2L, I want accurate documentation so that I understand how it actually works
   - Acceptance criteria:
     - [ ] Event system architecture documented
     - [ ] MCP requirements clarified (which are optional/required)
     - [ ] GitHub integration using `gh` CLI documented (not GitHub MCP)
     - [ ] Setup verification steps included
     - [ ] Architecture decisions explained (why gh CLI, why this event pattern)
     - [ ] Troubleshooting section for common issues

### Should-Have (Post-MVP)

1. **Dashboard Auto-Refresh** - Dashboard polls `.2L/events.jsonl` and updates live
2. **Event Filtering** - Dashboard can filter by phase, agent, time range
3. **MCP Auto-Setup Scripts** - Scripts to install and configure common MCPs
4. **Event Validation** - Verify event format matches schema on emission

### Could-Have (Future)

1. **Event Analytics** - Aggregate stats (avg iteration time, phase durations, failure rates)
2. **WebSocket Event Stream** - Real-time push instead of polling
3. **Multi-Project Dashboard** - View events from multiple 2L projects
4. **Event Replay** - Replay past orchestrations for debugging

---

## User Flows

### Flow 1: Setting up 2L on new machine

**Steps:**
1. User clones 2L config repository
2. User symlinks to `~/.claude/`
3. User runs `/2l-check-mcps` (new command)
4. System checks for each MCP availability
5. System reports status with setup instructions for missing ones
6. User follows setup links/instructions
7. User re-runs `/2l-check-mcps` to verify
8. System shows all green checkmarks ✅

**Edge cases:**
- No MCPs connected: Show friendly "optional but recommended" message
- Partial MCP setup: Show which features won't work without each MCP
- `gh` CLI not installed: Show installation link and auth instructions

**Error handling:**
- MCP check fails gracefully (doesn't crash)
- Shows clear error messages with resolution steps

### Flow 2: Monitoring orchestration with dashboard

**Steps:**
1. User runs `/2l-mvp "requirements"`
2. Orchestrator emits `plan_start` event
3. Dashboard shows "Plan Started"
4. Orchestrator enters exploration phase, emits `phase_change` event
5. Dashboard shows "Phase: Exploration"
6. Explorer-1 emits `agent_start` event
7. Dashboard shows "Explorer-1 active"
8. Explorer-1 completes work, emits `agent_complete` event
9. Dashboard shows "Explorer-1 complete ✅"
10. [Pattern continues through all phases]
11. Orchestrator emits `iteration_complete` event
12. Dashboard shows "Iteration 1 Complete 🎉"

**Edge cases:**
- Dashboard accessed during orchestration: Shows current state from events
- Dashboard accessed after completion: Shows full timeline
- No events file: Dashboard shows "No orchestration running"

**Error handling:**
- Malformed event JSON: Skip that line, continue parsing
- Dashboard refresh fails: Show last known state

### Flow 3: GitHub integration on first plan

**Steps:**
1. User runs `/2l-mvp "build a todo app"`
2. Orchestrator initializes git (if needed)
3. Orchestrator checks for `gh` CLI: `gh --version`
4. Orchestrator checks auth: `gh auth status`
5. Orchestrator creates repo: `gh repo create project-name`
6. Orchestrator sets remote origin
7. Orchestrator completes iteration
8. Orchestrator commits with tag
9. Orchestrator pushes to GitHub: `git push origin main`
10. Orchestrator pushes tag: `git push origin 2l-plan-1-iter-1`
11. User sees: "✅ Pushed to GitHub: https://github.com/user/project"

**Edge cases:**
- `gh` not installed: Skip GitHub, continue with local git only
- `gh` not authenticated: Show "Run: gh auth login"
- Repo already exists: Use existing repo
- Push fails: Log warning, don't fail orchestration

**Error handling:**
- Network issues: Gracefully degrade, work locally
- Permission issues: Show clear error with resolution steps

---

## Data Model Overview

**Key entities:**

1. **Event**
   - Fields: timestamp (ISO 8601), event_type (string), phase (string), agent_id (string), data (string)
   - Storage: `.2L/events.jsonl` (newline-delimited JSON)
   - Schema: `{"timestamp":"2025-10-08T14:37:00Z","event_type":"phase_change","phase":"exploration","agent_id":"orchestrator","data":"Starting exploration phase"}`

2. **MCP Status**
   - Fields: mcp_name (string), status (connected|missing|error), error_message (optional string)
   - Storage: Runtime only, not persisted
   - Example: `{"mcp_name":"playwright","status":"connected"}`

3. **GitHub Repo Config**
   - Fields: plan_id (string), repo_url (string), created_at (timestamp)
   - Storage: `.2L/config.yaml` under each plan entry
   - Example: `github_repo: "https://github.com/user/project-name"`

---

## Technical Requirements

**Must support:**
- Event emission from bash scripts (orchestrator) and agent markdown instructions
- JSONL format for event streaming (append-only, easy to parse)
- `gh` CLI for GitHub operations (not GitHub MCP)
- Graceful degradation when MCPs unavailable
- Works on Linux (primary) and macOS (secondary)

**Constraints:**
- Events must be lightweight (no massive data dumps)
- Event logging must not block orchestration
- MCP checks must be fast (<1 second total)
- Dashboard must work with static file reading (no server required)

**Preferences:**
- Use existing `2l-event-logger.sh` library
- Keep event format simple and JSON-parseable
- Clear separation: orchestrator events vs agent events
- Documentation in markdown (maintain current style)

---

## Success Criteria

**The MVP is successful when:**

1. **Events flow correctly**
   - Metric: `.2L/events.jsonl` contains orchestrator and agent events
   - Target: Every phase transition logged, every agent start/complete logged

2. **Dashboard shows data**
   - Metric: Open dashboard HTML, see event timeline
   - Target: All events visible, phases clear, agents tracked

3. **MCP verification works**
   - Metric: Run MCP check command on new machine
   - Target: Reports accurate status for all MCPs with setup instructions

4. **GitHub integration verified**
   - Metric: Run `/2l-mvp` → check GitHub repo created and pushed
   - Target: Repo created, commits pushed, tags pushed, all using `gh` CLI

5. **README is accurate**
   - Metric: Read README, verify against actual implementation
   - Target: Event system documented, MCP requirements clear, `gh` CLI documented, no mention of GitHub MCP

---

## Out of Scope

**Explicitly not included in MVP:**
- Real-time WebSocket streaming (use polling for now)
- Event analytics and aggregation (just raw events)
- MCP auto-installation scripts (manual setup with clear docs)
- Multi-project dashboard support (single project only)
- Event replay functionality
- Historical event database

**Why:** Focus on core observability and documentation fixes. Advanced features can come later once foundation is solid.

---

## Assumptions

1. `~/.claude/lib/2l-event-logger.sh` already exists and works
2. Agents are executed with access to the `log_2l_event` bash function
3. Dashboard HTML template exists in lib or will be created
4. Users have bash/zsh shell environments
5. Git is already installed on target machines

---

## Open Questions

1. Should we create a new `/2l-check-mcps` command or integrate into `/2l-status`?
2. Do we want the dashboard to show historical events across multiple plans or just current plan?
3. Should event emission be completely silent or show brief confirmations?
4. Do we need to update the `.gitignore` to handle `events.jsonl` (should it be committed or not)?

---

## Implementation Notes

### File Changes Required

**New files:**
- `.2L/plan-2/vision.md` (this file) ✅
- `.2L/plan-2/master-plan.yaml` (after planning)
- Possibly: `commands/2l-check-mcps.md` (new command)

**Files to update:**
- `README.md` - Architecture, setup, GitHub integration docs
- `agents/2l-builder.md` - Add event emission section
- `agents/2l-explorer.md` - Add event emission section
- `agents/2l-planner.md` - Add event emission section
- `agents/2l-integrator.md` - Add event emission section
- `agents/2l-iplanner.md` - Add event emission section
- `agents/2l-ivalidator.md` - Add event emission section
- `agents/2l-validator.md` - Add event emission section
- `agents/2l-healer.md` - Add event emission section
- `agents/2l-master-explorer.md` - Add event emission section
- `commands/2l-mvp.md` - Document orchestrator event emission points
- `lib/2l-event-logger.sh` - Possibly add validation or helper functions

**Files to test:**
- All agent execution (verify events emitted)
- Orchestrator execution (verify phase events)
- Dashboard rendering (verify events displayed)
- GitHub integration (verify `gh` CLI usage)

### Testing Strategy

1. **Event System Testing**
   - Run a simple `/2l-mvp` execution
   - Check `.2L/events.jsonl` exists and contains events
   - Verify all expected event types present
   - Verify event JSON is valid

2. **Dashboard Testing**
   - Open dashboard after orchestration
   - Verify events displayed in timeline
   - Verify phases shown correctly
   - Verify agent status tracked

3. **MCP Check Testing**
   - Run on machine with no MCPs → shows all missing
   - Run on machine with some MCPs → shows mixed status
   - Run on fully configured machine → shows all connected

4. **GitHub Integration Testing**
   - Run `/2l-mvp` on new project
   - Verify `gh repo create` called correctly
   - Verify commits pushed
   - Verify tags pushed
   - Verify works when `gh` not installed (graceful degradation)

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute
- [ ] 2L will improve itself! 🎯

---

**Vision Status:** VISIONED
**Ready for:** Master Planning
