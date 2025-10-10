# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
Fix broken 2L observability by redesigning the event system, adding MCP verification tools, validating GitHub CLI integration, and updating documentation to reflect current architecture.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 6 must-have features
- **User stories/acceptance criteria:** 35 distinct acceptance criteria across 6 features
- **Estimated total work:** 8-12 hours

**Feature breakdown:**
1. Event System Redesign (8 sub-criteria)
2. Update Agent Templates (4 sub-criteria)
3. Update Orchestrator Documentation (5 sub-criteria)
4. MCP Connection Verification (5 sub-criteria)
5. GitHub CLI Verification (6 sub-criteria)
6. README Updates (7 sub-criteria)

### Complexity Rating
**Overall Complexity: MEDIUM**

**Rationale:**
- **Documentation-heavy:** 3 of 6 features are purely documentation updates (agent templates, orchestrator docs, README)
- **One new command:** Only `/2l-check-mcps` is net-new functionality requiring implementation
- **Validation work:** GitHub CLI verification is testing existing functionality, not building new features
- **System-wide coordination:** Changes touch 10 agent files, orchestrator, and README but follow existing patterns
- **Low technical risk:** No complex algorithms, database changes, or external API integrations beyond existing `gh` CLI

---

## User Journey Analysis

### Journey 1: New Developer Setting Up 2L

**Current pain points (from vision):**
- Unclear which MCPs are needed vs optional
- No verification step to confirm setup success
- Missing setup instructions in README
- `gh` CLI integration not documented

**Proposed user flow:**
```
1. Developer clones 2L config → ~/.claude/
2. Reads README (now updated with clear MCP requirements)
3. Runs `/2l-check-mcps` (new command)
   → Sees: Playwright ✅ | Chrome DevTools ⚠️ Missing | Supabase ✅ | Screenshot ⚠️ Missing
   → Gets: Setup links for missing MCPs
4. Installs missing MCPs following provided links
5. Re-runs `/2l-check-mcps`
   → Sees: All green ✅✅✅✅
6. Installs `gh` CLI if not present (guided by README)
7. Runs `gh auth login`
8. Ready to use 2L with confidence
```

**UX improvements:**
- **Discoverability:** Clear command to verify setup (`/2l-check-mcps`)
- **Self-service:** Developer gets immediate feedback and remediation steps
- **Confidence:** Green checkmarks confirm readiness
- **Documentation:** README provides complete setup guide

**Integration with existing workflow:**
- Command follows existing `/2l-*` naming pattern
- Uses same tools as other commands (Bash, Read)
- Non-blocking: System works without MCPs (graceful degradation)

---

### Journey 2: Developer Monitoring Orchestration

**Current pain points (from vision):**
- Dashboard shows no data (events not emitted)
- Can't see orchestration progress in real-time
- No visibility into which agents are running

**Proposed user flow:**
```
1. Developer runs `/2l-mvp "requirements"`
2. Orchestrator emits plan_start event → .2L/events.jsonl
3. Developer opens dashboard: file://$(pwd)/.2L/dashboard/index.html
   → Dashboard polls events.jsonl every 2 seconds
   → Shows: "Plan Started | Phase: Initialization"
4. Orchestrator enters exploration phase
   → Emits phase_change event
   → Dashboard updates: "Phase: Exploration"
5. Each explorer spawns
   → Emits agent_start event
   → Dashboard shows: "Explorer-1 active (running for 12s)"
6. Explorers complete
   → Emit agent_complete events
   → Dashboard shows: "Explorer-1 complete ✅"
7. Pattern continues through all phases
8. Iteration completes
   → Dashboard shows: "Iteration 1 Complete 🎉"
   → Timeline shows all events with timestamps
```

**UX improvements:**
- **Real-time visibility:** See what's happening as it happens
- **Progress tracking:** Know which phase/agent is active
- **Historical view:** Full event timeline after completion
- **Debugging aid:** Event log shows exact sequence and timing

**Integration with existing workflow:**
- Dashboard uses existing `.2L/dashboard/index.html` template
- Event logger library already exists (`~/.claude/lib/2l-event-logger.sh`)
- Orchestrator already has dashboard initialization logic (lines 192-235 of `/2l-mvp`)
- Polling approach requires no server (static file reading)

**Critical integration point:**
- **Event contract:** Dashboard expects specific event format:
  ```json
  {
    "timestamp": "2025-10-08T14:37:00Z",
    "event_type": "phase_change",
    "phase": "exploration",
    "agent_id": "orchestrator",
    "data": "Starting exploration phase"
  }
  ```
- All agents must emit this exact format for dashboard to parse correctly

---

### Journey 3: Developer Running First Plan with GitHub Integration

**Current pain points (from vision):**
- Unclear if GitHub integration works after switching from GitHub MCP to `gh` CLI
- No documentation of the GitHub workflow
- Uncertainty about what gets created/pushed

**Proposed user flow:**
```
1. Developer runs `/2l-mvp "build a todo app"`
2. Orchestrator checks for `gh` CLI: `gh --version`
   → If missing: Shows friendly message "Install gh: https://cli.github.com"
   → If present: Continues
3. Orchestrator checks auth: `gh auth status`
   → If not authenticated: Shows "Run: gh auth login"
   → If authenticated: Continues
4. Orchestrator creates repo: `gh repo create project-name`
   → Uses plan directory name as repo name
   → Public/private based on default settings
5. Orchestrator sets remote: `git remote add origin ...`
6. After iteration completes:
   → Orchestrator commits with message
   → Orchestrator creates tag: `2l-plan-1-iter-1`
   → Orchestrator pushes: `git push origin main`
   → Orchestrator pushes tag: `git push origin 2l-plan-1-iter-1`
7. Developer sees: "✅ Pushed to GitHub: https://github.com/user/project-name"
```

**UX improvements:**
- **Automatic backup:** Work is automatically saved to GitHub
- **Clear feedback:** Developer knows exactly what happened
- **Graceful degradation:** If `gh` not available, continues with local git only
- **Documentation:** README explains the GitHub workflow

**Integration with existing workflow:**
- GitHub setup happens in MASTER MODE (line 248-260 of `/2l-mvp`)
- Already calls `setup_github_repo(plan_id, PLAN_DIR)` function
- Commit/tag/push happens after validation passes
- Uses existing git infrastructure

**Edge case handling:**
- No `gh` CLI: System continues without GitHub (local git only)
- Not authenticated: Clear error message with resolution steps
- Network failure: Log warning but don't fail orchestration
- Repo exists: Use existing repo instead of creating

---

## Integration Point Analysis

### Integration 1: Event System → Dashboard Communication

**Data flow:**
```
Orchestrator/Agents → log_2l_event() → .2L/events.jsonl → Dashboard (polling) → User sees events
```

**Contract requirements:**
- **Format:** JSONL (newline-delimited JSON)
- **Schema:** `{timestamp, event_type, phase, agent_id, data}`
- **Event types:**
  - `plan_start`, `iteration_start`, `phase_change`
  - `agent_start`, `agent_complete`
  - `validation_result`, `iteration_complete`
  - `cost_update`

**Integration complexity: MEDIUM**

**Why medium:**
- 10 agent files need event emission instructions added
- Orchestrator needs event calls at 6+ points in workflow
- Dashboard already has parsing logic (working)
- Event logger library already exists (working)

**Critical success factors:**
1. **Consistency:** All agents emit same format
2. **Placement:** Events at correct workflow points
3. **Testing:** Verify events appear in dashboard
4. **Documentation:** Clear examples in agent markdown files

**Potential issues:**
- Agent forgets to emit events → Dashboard shows gaps
- Wrong event format → Dashboard can't parse (but handles gracefully)
- File permissions → Event logging fails silently (by design)

---

### Integration 2: MCP Verification → Setup Documentation

**Data flow:**
```
User runs /2l-check-mcps → Command checks MCP availability → Returns status + setup links → User follows links → Re-verifies
```

**Required MCPs (from vision):**
- Playwright (browser automation)
- Chrome DevTools (debugging)
- Supabase (database, local)
- Screenshot (visual capture)

**Integration complexity: LOW**

**Why low:**
- Single new command file
- Uses standard Bash tools (no new dependencies)
- Checks are simple: "Is MCP available?" yes/no
- Non-blocking: System works without MCPs

**Implementation approach:**
```bash
# Pseudo-code for /2l-check-mcps
check_mcp_availability() {
  # Check if MCP is configured in Claude config
  # Return: connected | missing | error
}

for mcp in playwright chrome-devtools supabase screenshot; do
  status=$(check_mcp_availability $mcp)
  if [ "$status" = "connected" ]; then
    echo "✅ $mcp: Connected"
  else
    echo "⚠️  $mcp: Missing"
    echo "   Setup: [link to MCP docs]"
  fi
done
```

**Integration with README:**
- README documents which MCPs are optional vs required
- README provides setup links for each MCP
- Command output references README sections

---

### Integration 3: GitHub CLI → Orchestrator Workflow

**Data flow:**
```
/2l-mvp starts → Checks gh CLI → Creates repo → Sets remote → After iteration → Commits → Pushes with tags
```

**Integration points in orchestrator:**
1. **Line 248-260:** GitHub Integration section (MASTER MODE)
2. **setup_github_repo() function:** Creates repo, sets remote
3. **Post-validation:** Commit and push logic
4. **Error handling:** Graceful degradation if `gh` unavailable

**Integration complexity: LOW**

**Why low:**
- Existing orchestrator already calls `setup_github_repo()`
- `gh` CLI is well-documented and stable
- Integration is optional (graceful degradation)
- No API keys or OAuth flows (uses `gh auth`)

**Verification requirements:**
1. Test `gh --version` detection
2. Test `gh auth status` check
3. Test `gh repo create` with plan name
4. Test push with tags
5. Test error cases (no gh, not authed, network fail)

**Documentation needs:**
- README section: "GitHub Integration"
- Explain why `gh` CLI (not GitHub MCP)
- Setup instructions: Install `gh`, run `gh auth login`
- What gets pushed: commits, tags, branch structure

---

### Integration 4: Agent Templates → Event Emission

**Data flow:**
```
Agent reads markdown file → Follows "Event Emission" section → Calls log_2l_event → Event logged
```

**Affected files (10 agents):**
- 2l-builder.md
- 2l-explorer.md
- 2l-planner.md
- 2l-integrator.md
- 2l-iplanner.md
- 2l-ivalidator.md
- 2l-validator.md
- 2l-healer.md
- 2l-master-explorer.md
- 2l-dashboard-builder.md

**Integration complexity: LOW**

**Why low:**
- Same pattern repeated 10 times
- Simple addition to existing markdown files
- No code changes (just documentation)
- Agents already have structured markdown format

**Template for event emission section:**
```markdown
## Event Emission

Emit events at two key points in your workflow:

### 1. Agent Start Event
**When:** After reading all inputs, before starting work
**Event type:** `agent_start`
**Example:**
```bash
log_2l_event "agent_start" "Builder-1 starting work on ${task_description}" "${current_phase}" "builder-1"
```

### 2. Agent Complete Event
**When:** After completing work, before writing final report
**Event type:** `agent_complete`
**Example:**
```bash
log_2l_event "agent_complete" "Builder-1 completed successfully" "${current_phase}" "builder-1"
```
```

**Validation:**
- After adding sections, run a test iteration
- Check `.2L/events.jsonl` for agent events
- Verify dashboard shows agent activity

---

### Integration 5: Documentation Updates → Developer Onboarding

**Files affected:**
- README.md (main documentation)
- /2l-mvp.md (orchestrator documentation)

**Documentation integration points:**

**README.md sections to add/update:**
1. **Event System Architecture**
   - How events flow (orchestrator → agents → events.jsonl → dashboard)
   - Event format and types
   - Why this pattern (observability, debugging)

2. **MCP Requirements**
   - Which MCPs are optional vs required
   - What features need which MCPs
   - Setup instructions for each MCP
   - How to verify with `/2l-check-mcps`

3. **GitHub Integration**
   - Why `gh` CLI (not GitHub MCP)
   - Setup: Install, authenticate
   - What gets created/pushed
   - Repo naming convention
   - Tag format: `2l-plan-{N}-iter-{M}`

4. **Setup Verification**
   - New section: "Verify Your Setup"
   - Run `/2l-check-mcps`
   - Run `gh auth status`
   - Run test plan to verify events

5. **Troubleshooting**
   - Dashboard shows no events → Check event logging enabled
   - MCP not connected → Follow setup links
   - GitHub push fails → Check `gh auth`

**Integration complexity: LOW**

**Why low:**
- Straightforward documentation writing
- No code changes
- Can be written incrementally
- Easy to validate (just read and verify)

---

## Feature Integration Map

### How the 6 features integrate with each other:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPER EXPERIENCE LAYER                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  README Updates  │───────▶│  Setup Journey   │◀───────│  /2l-check-mcps  │
│   (Feature 6)    │        │  (User reads     │        │   (Feature 4)    │
└──────────────────┘        │   docs, runs     │        └──────────────────┘
                            │   verification)  │
                            └──────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ORCHESTRATION RUNTIME LAYER                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  Event System    │───────▶│  Orchestrator    │───────▶│  GitHub CLI      │
│  (Feature 1)     │        │  Documentation   │        │  Verification    │
│                  │        │  (Feature 3)     │        │  (Feature 5)     │
│  - Orchestrator  │        │                  │        │                  │
│    emits events  │        │  - Documents     │        │  - Repo creation │
│  - Agents emit   │        │    where events  │        │  - Auto-push     │
│    events        │        │    are emitted   │        │  - Tagging       │
│                  │        │                  │        │                  │
└──────────────────┘        └──────────────────┘        └──────────────────┘
        │                           │
        │                           │
        ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│  Agent Templates │        │  .2L/events.jsonl│
│  (Feature 2)     │        │                  │
│                  │        │  Event storage   │
│  - Instructions  │───────▶│  (JSONL format)  │
│    for when to   │        │                  │
│    emit events   │        └──────────────────┘
│                  │                  │
└──────────────────┘                  │
                                      ▼
                            ┌──────────────────┐
                            │  Dashboard       │
                            │  (Polling UI)    │
                            │                  │
                            │  - Shows events  │
                            │  - Live updates  │
                            │  - Timeline view │
                            └──────────────────┘
```

**Integration narrative:**

1. **Setup phase:** Developer reads README (6), runs `/2l-check-mcps` (4), verifies setup
2. **Runtime phase:** Orchestrator emits events (1) following docs (3), pushes to GitHub (5)
3. **Agent phase:** Agents emit events (1) following templates (2)
4. **Observation phase:** Dashboard polls events.jsonl and displays real-time progress
5. **Iteration phase:** All features work together to provide observable, verifiable workflow

**Critical integration dependencies:**

- Feature 1 (Event System) is **foundation** for dashboard visibility
- Feature 2 (Agent Templates) **depends on** Feature 1 (needs event format defined)
- Feature 3 (Orchestrator Docs) **documents** Feature 1 implementation
- Feature 4 (MCP Check) **independent** but documented in Feature 6
- Feature 5 (GitHub Verification) **independent** but documented in Feature 6
- Feature 6 (README) **integrates** all features into coherent onboarding

---

## Iteration Breakdown Recommendation

### Recommendation: **TWO ITERATIONS**

**Rationale:**
- 6 features naturally split into 2 groups based on **user value delivery**
- Iteration 1 focuses on **observability** (immediate value during development)
- Iteration 2 focuses on **setup experience** (value for new users and maintenance)

---

### Iteration 1: Core Observability (Event System + Dashboard)

**Vision:** Make orchestration visible and debuggable

**Scope:**
1. **Event System Redesign** (Feature 1)
   - Implement event emission in orchestrator at all phase transitions
   - Add event logging to key orchestrator points
   - Validate event format matches dashboard expectations

2. **Update Agent Templates** (Feature 2)
   - Add "Event Emission" section to all 10 agent markdown files
   - Provide clear examples and placement guidance
   - Consistent pattern across all agents

3. **Update Orchestrator Documentation** (Feature 3)
   - Document all event emission points in `/2l-mvp.md`
   - Add examples of event payloads
   - Explain phase transition events

**Why first:**
- **Highest pain point:** "Dashboard shows no data" is critical blocker
- **Immediate value:** Developers can see orchestration progress right away
- **Foundation for iteration 2:** Once events work, we can validate other features
- **Self-validating:** Can test by running orchestration and checking dashboard

**Success criteria:**
- Run `/2l-mvp` → Open dashboard → See events flowing
- All 10 agents emit start/complete events
- Orchestrator emits phase transitions
- Dashboard timeline shows complete orchestration history

**Estimated duration:** 4-6 hours

**Risk level:** LOW
- Event logger library already exists
- Dashboard template already exists
- Just connecting existing pieces

**User-facing value:**
> "After iteration 1, developers can finally see what 2L is doing during orchestration. Real-time visibility into phases, agents, and progress. No more black box."

---

### Iteration 2: Setup Experience + Verification

**Vision:** Make 2L setup clear, verifiable, and well-documented

**Scope:**
1. **MCP Connection Verification** (Feature 4)
   - Create `/2l-check-mcps` command
   - Check for Playwright, Chrome DevTools, Supabase, Screenshot
   - Provide setup links for missing MCPs
   - Clear ✅/⚠️ status output

2. **GitHub CLI Verification** (Feature 5)
   - Test `setup_github_repo()` function
   - Verify `gh` CLI detection and auth checking
   - Test repo creation from plan name
   - Verify push and tag operations
   - Document error handling for edge cases

3. **README Updates** (Feature 6)
   - Event system architecture section
   - MCP requirements clarification (optional vs required)
   - GitHub integration documentation (`gh` CLI, not GitHub MCP)
   - Setup verification steps
   - Troubleshooting section

**Why second:**
- **Builds on iteration 1:** Can use working dashboard to verify setup
- **Onboarding focus:** Helps new users and documents for maintainers
- **Lower urgency:** Existing users already have setup working
- **Validation heavy:** Can test MCP check and GitHub integration thoroughly

**Dependencies from iteration 1:**
- Requires working event system to demonstrate in README
- Dashboard must work to include in setup verification steps
- Event format must be finalized to document

**Success criteria:**
- New developer can clone 2L and verify setup with `/2l-check-mcps`
- GitHub integration works reliably (tested on multiple scenarios)
- README accurately reflects all architecture decisions
- Troubleshooting section covers common issues

**Estimated duration:** 4-6 hours

**Risk level:** LOW
- `/2l-check-mcps` is simple command (Bash + status checks)
- GitHub integration already partially working (just needs verification)
- Documentation writing is straightforward

**User-facing value:**
> "After iteration 2, new developers can set up 2L with confidence. Clear verification steps, comprehensive documentation, and automatic GitHub integration that just works."

---

## Minimal Viable Dashboard (MVP vs Full-Featured)

### MVP Dashboard (Already exists!)

The dashboard template at `~/.claude/lib/2l-dashboard-template.html` **already implements MVP features**:

**What it has:**
- Event log display (last 50 events)
- Real-time polling (2-second intervals)
- Metrics bar (elapsed time, total events, active agents)
- Active agents list with duration tracking
- Event timeline with timestamps
- Event type color coding
- MCP status display
- Responsive design

**What it needs:**
- **Just events!** The dashboard is ready, but no events are being emitted
- Template substitution: `{PROJECT_NAME}`, `{TIMESTAMP}`, `{EVENTS_PATH}`
- Creation via dashboard-builder agent (already exists: `~/.claude/agents/2l-dashboard-builder.md`)

### MVP vs Full-Featured Comparison

| Feature | MVP (Current Template) | Full-Featured (Post-MVP) |
|---------|----------------------|---------------------------|
| Event display | ✅ Last 50 events | Filter by type, phase, agent |
| Auto-refresh | ✅ 2-second polling | WebSocket real-time push |
| Active agents | ✅ Basic list | Visual timeline, dependency graph |
| Metrics | ✅ Basic counts | Analytics: avg times, failure rates |
| MCP status | ✅ Hardcoded list | Live MCP health checks |
| Project scope | ✅ Single project | Multi-project dashboard |
| Event history | ❌ No persistence | Event database, replay capability |

**Recommendation: Stick with MVP**

**Why:**
- MVP dashboard is **already built** and functional
- Polls static file (no server needed)
- Lightweight and fast
- Meets 90% of observability needs
- Can add features later if needed

**Post-MVP enhancements (Should-Have from vision):**
- Event filtering by phase/agent/time
- WebSocket streaming (eliminate polling)
- Event analytics and aggregation
- Multi-project support

---

## Command Integration Strategy

### New Command: `/2l-check-mcps`

**Integration with existing command ecosystem:**

**Existing commands:**
- `/2l-mvp` - Main orchestrator
- `/2l-vision` - Create vision
- `/2l-plan` - Create master plan
- `/2l-status` - Show current state
- `/2l-continue` - Resume work
- `/2l-task` - Run single task
- (11 more navigation/management commands)

**Where `/2l-check-mcps` fits:**
- **Category:** Setup/verification command
- **Used:** During initial setup and troubleshooting
- **Frequency:** Low (once per machine setup)
- **Dependencies:** None (standalone)

**Integration points:**

1. **Referenced in README:**
   ```markdown
   ## Setup Verification

   After configuring MCPs, verify your setup:
   ```bash
   /2l-check-mcps
   ```
   ```

2. **Referenced in `/2l-status`:**
   - Could add MCP status section to status output
   - "Run `/2l-check-mcps` to verify MCP connectivity"

3. **Mentioned in error messages:**
   - If orchestrator tries to use MCP that's unavailable
   - "MCP not available. Run `/2l-check-mcps` to diagnose"

**Command output format (mockup):**
```
=== 2L MCP Status Check ===

Checking MCP connectivity...

✅ Playwright - Connected
   Browser automation for testing and scraping

✅ Chrome DevTools - Connected
   Debugging and performance profiling

⚠️  Supabase Local - Not Connected
   Local database for development
   Setup: https://github.com/supabase/mcp-server-supabase

⚠️  Screenshot - Not Connected
   Visual capture for documentation
   Setup: Install via Claude Desktop settings

=== Summary ===
Connected: 2/4
Missing: 2/4

Note: MCPs are optional. 2L works without them, but some features may be limited.
For full functionality, install missing MCPs and re-run this check.
```

**Implementation approach:**
- Single command file: `~/.claude/commands/2l-check-mcps.md`
- Uses Bash tool to check MCP availability
- Returns formatted status with setup links
- Non-destructive (read-only checks)

---

## Dashboard Access Pattern Analysis

### Current Access Pattern (From vision)

**Access flow:**
```
1. Developer runs `/2l-mvp`
2. Orchestrator initializes (lines 192-235 of /2l-mvp.md)
3. If dashboard doesn't exist:
   → Creates .2L/dashboard/ directory
   → Spawns 2l-dashboard-builder agent (if available)
   → Dashboard builder reads template
   → Substitutes {PROJECT_NAME}, {TIMESTAMP}, {EVENTS_PATH}
   → Writes .2L/dashboard/index.html
4. Orchestrator prints: "Open dashboard: file://$(pwd)/.2L/dashboard/index.html"
5. Developer opens in browser
6. Dashboard polls .2L/events.jsonl every 2 seconds
7. Events appear in real-time
```

### UX Implications

**Strengths:**
- **Zero configuration:** Dashboard auto-created on first run
- **No server required:** Static HTML file
- **Local access:** file:// URL works immediately
- **Cross-platform:** Works on Linux and macOS

**Weaknesses:**
- **Manual open:** Developer must copy/paste URL
- **No auto-launch:** Doesn't open automatically in browser
- **File refresh:** Browser doesn't auto-navigate to local file://
- **Cross-origin issues:** Some browsers restrict file:// access to other local files

**Proposed improvements (Post-MVP):**

1. **New command: `/2l-dashboard`**
   - Opens dashboard in default browser
   - Uses `xdg-open` (Linux) or `open` (macOS)
   - Falls back to printing URL if command fails

2. **Auto-open option:**
   - Add config flag: `auto_open_dashboard: true`
   - Opens dashboard automatically when orchestration starts
   - Disabled by default (some users prefer manual control)

3. **Desktop notification:**
   - When iteration completes
   - Click notification → opens dashboard
   - Requires desktop notification setup

**Recommendation for iteration 1:**
- Keep current pattern (manual open via URL)
- Add note to README about browser compatibility
- Consider `/2l-dashboard` command in post-MVP work

---

## Documentation Quality Assessment

### Critical Documentation (Must-Have in Iteration 2)

**README.md sections:**

1. **Event System Architecture** (CRITICAL)
   - **Why critical:** Core to understanding how 2L works
   - **Content:** Event flow diagram, event types, format specification
   - **Audience:** Developers using 2L, contributors debugging issues

2. **MCP Requirements** (CRITICAL)
   - **Why critical:** Setup blocker without this info
   - **Content:** Which MCPs, what they enable, how to install
   - **Audience:** New users setting up 2L

3. **GitHub Integration** (CRITICAL)
   - **Why critical:** Confusion about GitHub MCP vs `gh` CLI
   - **Content:** Why `gh`, setup steps, what gets pushed
   - **Audience:** Users wanting automatic GitHub backup

4. **Setup Verification** (CRITICAL)
   - **Why critical:** No way to know if setup succeeded
   - **Content:** `/2l-check-mcps` usage, `gh auth status`, test run
   - **Audience:** New users confirming setup

5. **Troubleshooting** (CRITICAL)
   - **Why critical:** First place users look when issues occur
   - **Content:** Dashboard no events, MCP issues, GitHub push fails
   - **Audience:** Users encountering problems

### Nice-to-Have Documentation (Post-MVP)

**Extended sections:**

1. **Event Analytics**
   - How to analyze events.jsonl for insights
   - Common patterns and what they mean

2. **Custom Dashboard Modifications**
   - How to customize dashboard template
   - Adding custom metrics or views

3. **MCP Development Guide**
   - How to create custom MCPs for 2L
   - Integration patterns

4. **Architecture Decision Records**
   - Why certain choices were made
   - Historical context for maintainers

**Recommendation:**
- Focus on critical documentation in iteration 2
- Nice-to-have can be added incrementally as questions arise
- README should be **actionable** over comprehensive

---

## Recommendations for Master Plan

### 1. Two-Iteration Approach is Optimal

**Why:**
- Clear separation of concerns: Observability (iter 1) vs Setup (iter 2)
- Each iteration delivers standalone user value
- Natural dependency: Iter 2 builds on working events from iter 1
- Manageable scope: 4-6 hours per iteration

**Alternative considered:** Single iteration (8-12 hours)
- **Why rejected:** Too much scope, harder to validate incrementally
- **Risk:** If event system takes longer, setup features delayed

### 2. Start with Iteration 1 (Observability First)

**Why:**
- Highest user pain point: "Dashboard shows no data"
- Immediate value for all users
- Self-validating: Can see events flowing in dashboard
- Foundation for iteration 2 documentation

**Success criteria for iteration 1:**
```bash
# Run this test after iteration 1:
/2l-mvp "test project"
# Open dashboard
# See: plan_start, phase_change, agent_start, agent_complete events
# Verify: All 10 agents emit events
# Confirm: Dashboard timeline shows complete history
```

### 3. Iteration 2 Focuses on Onboarding

**Why:**
- New users benefit most from setup verification
- Existing users already have working setups
- Documentation is easier to write with working system
- Can validate GitHub integration thoroughly

**Success criteria for iteration 2:**
```bash
# New developer experience test:
1. Clone 2L config
2. Read README setup section
3. Run /2l-check-mcps → See missing MCPs
4. Install MCPs following links
5. Run /2l-check-mcps → All green
6. Install gh, run gh auth login
7. Run /2l-mvp "test" → Repo created, pushed
8. Check README → Covers all features
```

### 4. Keep Dashboard as MVP

**Why:**
- Existing template is functional and well-designed
- Meets 90% of observability needs
- Zero-dependency (static HTML)
- Can enhance later without breaking changes

**Don't build:**
- WebSocket streaming (polling is sufficient)
- Event analytics (can add later)
- Multi-project support (YAGNI for now)

### 5. Defer New `/2l-dashboard` Command to Post-MVP

**Why:**
- Not mentioned in vision document
- Manual URL open is acceptable for MVP
- Can add later if user feedback requests it
- Low priority compared to core features

### 6. Testing Strategy

**Iteration 1 validation:**
- Run orchestration, check events.jsonl exists
- Open dashboard, verify events displayed
- Check all event types present
- Verify agent start/complete pairs

**Iteration 2 validation:**
- Run `/2l-check-mcps` on fresh machine
- Test `gh` CLI integration (create, push, tag)
- Review README completeness
- Walk through new user setup flow

---

## Integration Considerations

### Cross-Feature Dependencies

**Feature dependency graph:**
```
Feature 1 (Event System)
  ↓ (provides event format)
Feature 2 (Agent Templates) - documents how to emit
Feature 3 (Orchestrator Docs) - documents where to emit
  ↓ (working events enable)
Feature 6 (README) - documents event architecture

Feature 4 (MCP Check) - independent
  ↓ (verified setup enables)
Feature 5 (GitHub Verification) - independent
  ↓ (both documented in)
Feature 6 (README) - integrates all
```

**Critical path:**
1. Event System must work first (blocks dashboard)
2. Agent Templates + Orchestrator Docs can happen in parallel
3. README waits for all features to document them

**No blocking dependencies:**
- MCP Check is standalone (can develop anytime)
- GitHub Verification is standalone (can test anytime)

### Integration Challenges

**Challenge 1: Event Format Consistency**
- **Issue:** 10 agents must emit identical format
- **Solution:** Provide exact examples in each agent template
- **Validation:** Parse all events, check schema compliance

**Challenge 2: Dashboard Template Substitution**
- **Issue:** {EVENTS_PATH} must point to correct file
- **Solution:** Dashboard builder agent handles substitution
- **Validation:** Open dashboard, check polling URL in console

**Challenge 3: MCP Availability Detection**
- **Issue:** How to programmatically check if MCP is connected?
- **Solution:** Check Claude config files or attempt MCP call
- **Validation:** Test on machine with varying MCP setups

**Challenge 4: GitHub CLI Edge Cases**
- **Issue:** Many failure modes (no gh, not authed, network fail)
- **Solution:** Graceful degradation with clear error messages
- **Validation:** Test each edge case manually

---

## Risk Assessment

### Technical Risks: LOW

**No high-risk items:**
- Event system uses existing library (proven)
- Dashboard uses existing template (proven)
- MCP check is simple status query
- GitHub integration already partially working

**Medium risks:**
- **Event emission placement:** Could put events in wrong workflow points
  - **Mitigation:** Document clearly in orchestrator, test thoroughly

- **Dashboard browser compatibility:** file:// access restrictions
  - **Mitigation:** Note in README, test on Chrome/Firefox

**Low risks:**
- MCP check command fails gracefully by design
- GitHub integration has graceful degradation
- Documentation can be updated anytime

### User Experience Risks: LOW

**No major UX risks:**
- Dashboard is read-only (can't break workflow)
- MCP check is read-only (can't break setup)
- GitHub integration is optional (can skip)

**Minor UX concerns:**
- **Dashboard URL copy/paste:** Slightly awkward
  - **Mitigation:** Consider `/2l-dashboard` command in post-MVP

- **Event overload:** Too many events in log
  - **Mitigation:** Dashboard already limits to 50 events, newest first

### Project Risks: VERY LOW

**Why very low:**
- All features are enhancements (not critical)
- 2L works without these features (they improve experience)
- No database changes, no breaking changes
- Can roll back by not using new commands

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- **Event logging:** Bash library (`~/.claude/lib/2l-event-logger.sh`)
- **Dashboard:** Static HTML + JavaScript (template-based)
- **Orchestration:** Bash scripts + YAML config
- **Version control:** Git + GitHub CLI
- **Agent system:** Markdown-based agent definitions

**Patterns observed:**
- **Event format:** JSONL (newline-delimited JSON)
- **Command pattern:** `/2l-*` naming convention
- **Agent spawning:** Task tool for parallel execution
- **Configuration:** YAML for structured data
- **Documentation:** Markdown for everything

**Opportunities:**
- Event system is well-designed (just needs wiring)
- Dashboard template is production-quality (just needs events)
- GitHub integration foundation exists (just needs verification)

**Constraints:**
- Must maintain backward compatibility
- Event logging must be optional (graceful degradation)
- Dashboard must work without server
- All commands must follow existing patterns

### Recommendations

**For Event System:**
- ✅ Use existing `log_2l_event` function (don't reinvent)
- ✅ Keep JSONL format (append-only, easy to parse)
- ✅ Emit minimal data (performance over verbosity)
- ❌ Don't add event database (YAGNI)
- ❌ Don't add event validation on emission (trust the format)

**For Dashboard:**
- ✅ Use existing template (it's excellent)
- ✅ Keep 2-second polling (balance real-time vs load)
- ✅ Limit to 50 events (performance)
- ❌ Don't add WebSocket (complexity not justified)
- ❌ Don't add server (static file is perfect)

**For MCP Check:**
- ✅ Keep it simple (read-only status checks)
- ✅ Fail gracefully (no errors if MCP unavailable)
- ✅ Provide setup links (actionable guidance)
- ❌ Don't auto-install MCPs (user control)
- ❌ Don't persist MCP state (check on demand)

**For GitHub Integration:**
- ✅ Use `gh` CLI (as decided, not GitHub MCP)
- ✅ Graceful degradation (work locally if no gh)
- ✅ Clear error messages (guide user to fix)
- ❌ Don't add git hooks (complexity)
- ❌ Don't add custom auth (use gh auth)

---

## Notes & Observations

### Key Insights

1. **The system is 90% ready**
   - Event logger exists, dashboard exists, orchestrator has hooks
   - Just need to connect the dots
   - This is integration work, not greenfield development

2. **Documentation is the hidden workload**
   - 3 of 6 features are pure documentation
   - README updates will take 2-3 hours alone
   - But this is valuable: Good docs prevent support burden

3. **User experience is about verification**
   - Users want to **know** things work, not just **trust** they work
   - `/2l-check-mcps` provides verification
   - Dashboard provides visibility
   - GitHub integration provides backup confidence

4. **Graceful degradation is the pattern**
   - Event logging optional (works without)
   - MCPs optional (works without)
   - GitHub optional (works without)
   - This makes the system resilient

5. **The dashboard is underutilized**
   - Excellent template already exists
   - Just needs events to come alive
   - Could become central to 2L experience

### Strategic Observations

**This plan is about observability, not features**
- Not adding new development capabilities
- Adding visibility into existing capabilities
- Improving developer experience, not end-user experience

**The work is low-risk, high-value**
- No complex algorithms or integrations
- Mostly wiring and documentation
- But huge impact on developer confidence

**Iteration 1 has compounding value**
- Once events work, all future development is more observable
- Debugging becomes easier
- Contributors can see what's happening
- Foundation for future analytics/monitoring

**Setup verification closes the loop**
- Developers know when setup is complete
- Reduces "did I do it right?" anxiety
- Self-service troubleshooting

---

## Final Recommendations

### For Master Planner

1. **Approve two-iteration approach**
   - Iteration 1: Event System (4-6 hours)
   - Iteration 2: Setup + Docs (4-6 hours)
   - Total: 8-12 hours (matches vision estimate)

2. **Prioritize iteration 1 for immediate value**
   - Fixes critical pain point (dashboard no data)
   - Enables observability for all future work
   - Self-validating (can see events)

3. **Iteration 2 can be deferred if needed**
   - Setup verification is nice-to-have
   - Existing users already have working setups
   - Documentation can be written anytime

4. **Consider this a "refinement" plan, not "feature" plan**
   - Low technical risk
   - High UX impact
   - Foundation for future observability work

5. **Post-MVP enhancements are truly optional**
   - Event analytics: Wait for user demand
   - WebSocket streaming: Polling is sufficient
   - Multi-project dashboard: YAGNI
   - Focus on shipping MVP, iterate based on usage

---

*Exploration completed: 2025-10-08T15:30:00Z*
*This report informs master planning decisions for plan-2*
